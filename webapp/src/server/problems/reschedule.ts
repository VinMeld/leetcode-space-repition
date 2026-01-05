import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../helpers/db';

const rescheduleSchema = z.object({
    settings: z.object({
        easyMultiplier: z.number(),
        mediumMultiplier: z.number(),
        hardMultiplier: z.number(),
        sameDayRetry: z.boolean(),
        wrongAnswerPenalty: z.number(),
        minInterval: z.number(),
    }),
});

export async function rescheduleProblems(req: Request, res: Response) {
    try {
        const user = req.user as { id: number } | undefined;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const validation = rescheduleSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid input',
                details: validation.error.errors
            });
        }

        const { settings } = validation.data;

        // Get all problems for the user
        const problems = await db
            .selectFrom('problems')
            .select(['id', 'easiness_factor', 'interval', 'repetitions', 'difficulty', 'last_reviewed_at', 'next_review_date'])
            .where('user_id', '=', user.id)
            .execute();

        let updatedCount = 0;

        for (const problem of problems) {
            // Only reschedule if we have a last review date to base it on
            // If never reviewed, it stays as is (or we could apply multiplier to initial interval?)
            // Usually initial interval is 0, so multiplier doesn't matter.
            // If interval > 0, we can adjust it.

            if (problem.interval > 0) {
                let multiplier = 1.0;
                if (problem.difficulty) {
                    switch (problem.difficulty) {
                        case 'easy': multiplier = settings.easyMultiplier; break;
                        case 'medium': multiplier = settings.mediumMultiplier; break;
                        case 'hard': multiplier = settings.hardMultiplier; break;
                    }
                }

                // We don't want to re-run the whole SM-2 algorithm because we don't have a new quality rating.
                // We just want to adjust the *current* interval based on the new multiplier.
                // But wait, the multiplier is applied *during* the calculation of the *next* interval.
                // If we just change the multiplier, the *current* interval (which was calculated in the past)
                // is technically "fixed".
                // However, the user wants "Easy 0.5x" to take effect *now*.
                // This implies we should scale the *current* interval.
                // New Interval = Old Interval * Multiplier?
                // Or rather, we should assume the current interval *should have been* calculated with this multiplier.
                // If we assume the previous calculation was: Interval = Base * OldMultiplier (which was 1.0)
                // Then NewInterval = Interval * NewMultiplier.

                // Let's go with: NewInterval = CurrentInterval * Multiplier.
                // But we must be careful not to apply it repeatedly if they click the button multiple times.
                // Ah, this is tricky. If they click "Reschedule" twice, do we multiply by 0.5 twice?
                // Ideally, we would recalculate from scratch, but we don't have the full history easily accessible/replayable here efficiently.

                // Alternative: The user just changed the setting.
                // We can assume the *current* interval in DB is the "base" (or previously multiplied) value.
                // If we just multiply it, we risk compounding.
                // BUT, the user is explicitly asking to "Reschedule".
                // Maybe we should only do this if we track "Base Interval" vs "Actual Interval"? We don't.

                // Let's stick to a simpler approach:
                // The "Reschedule" button is a "One-off adjustment" tool.
                // We warn the user: "This will scale all your current intervals by the current multipliers."
                // So if they set Easy to 0.5x, we multiply all Easy intervals by 0.5.
                // If they later set it to 2.0x, they can hit it again to double them.
                // This gives them control.

                // Wait, if I set Easy to 0.5x, I expect the interval to be halved.
                // If I leave it at 0.5x and review again, the *next* interval will be calculated with 0.5x.
                // So this "Reschedule" is just for *existing* intervals.

                // Yes, let's do: NewInterval = CurrentInterval * Multiplier.
                // And ensure it respects minInterval.

                let newInterval = Math.round(problem.interval * multiplier);
                newInterval = Math.max(newInterval, settings.minInterval);

                // Recalculate Next Review Date
                // NextReview = LastReviewed + NewInterval
                // If LastReviewed is null (never reviewed), we can't really reschedule based on history.
                // But if interval > 0, it must have been reviewed or imported.
                // If imported without last review date, we might have an issue.
                // In our import logic, we set NextReviewDate but not LastReviewedAt (it was null in struct).
                // Let's check import logic. We set NextReviewDate directly.
                // If LastReviewedAt is null, we can't calculate from it.
                // We could calculate from *Now*? No, that resets progress.
                // We could calculate from *NextReviewDate*?
                // OldNext = Last + OldInterval
                // NewNext = Last + NewInterval
                // So NewNext = OldNext - OldInterval + NewInterval?
                // NewNext = OldNext + (NewInterval - OldInterval)
                // This works even if we don't have LastReviewedAt, assuming NextReviewDate is valid.

                const oldNextReview = new Date(problem.next_review_date);
                const diffDays = newInterval - problem.interval;

                const newNextReview = new Date(oldNextReview);
                newNextReview.setDate(newNextReview.getDate() + diffDays);

                await db
                    .updateTable('problems')
                    .set({
                        interval: newInterval,
                        next_review_date: newNextReview
                    })
                    .where('id', '=', problem.id)
                    .execute();

                updatedCount++;
            }
        }

        res.json({ success: true, updatedCount });
    } catch (error) {
        console.error('Error rescheduling problems:', error);
        res.status(500).json({ error: 'Failed to reschedule problems' });
    }
}
