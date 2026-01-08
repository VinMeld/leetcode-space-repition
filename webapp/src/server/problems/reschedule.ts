import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../helpers/db';
import { rescheduleInterval } from '../../lib/fsrs';

const rescheduleSchema = z.object({
    settings: z.object({
        requestRetention: z.number().min(0.7).max(0.97),
        maxInterval: z.number().min(1),
    }),
    // Optional: previous retention for accurate rescheduling
    previousRetention: z.number().min(0.7).max(0.97).optional(),
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

        const { settings, previousRetention } = validation.data;
        const oldRetention = previousRetention ?? 0.9; // Default to 90% if not specified

        // Get all problems for the user
        const problems = await db
            .selectFrom('problems')
            .select(['id', 'stability', 'interval', 'next_review_date'])
            .where('user_id', '=', user.id)
            .execute();

        let updatedCount = 0;

        for (const problem of problems) {
            // Only reschedule if we have an interval > 0
            if (problem.interval > 0) {
                // Calculate new interval based on retention change
                let newInterval = rescheduleInterval(
                    problem.interval,
                    oldRetention,
                    settings.requestRetention
                );

                // Clamp to max interval
                newInterval = Math.min(newInterval, settings.maxInterval);

                // Calculate new next review date based on interval change
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
