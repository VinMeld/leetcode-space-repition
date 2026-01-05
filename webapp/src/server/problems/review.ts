import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../helpers/db';
import { calculateSM2 } from '../../lib/sm2';

const reviewSchema = z.object({
    problemId: z.number().int().positive(),
    quality: z.number().int().min(0).max(5),
    sameDayRetry: z.boolean().optional(),
});

export async function reviewProblem(req: Request, res: Response) {
    try {
        const validation = reviewSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid input',
                details: validation.error.errors
            });
        }

        const { problemId, quality, sameDayRetry } = validation.data;

        // Get current problem state
        const problem = await db
            .selectFrom('problems')
            .select(['id', 'easiness_factor', 'interval', 'repetitions'])
            .where('id', '=', problemId)
            .executeTakeFirst();

        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        // Calculate new SM-2 values
        const sm2Result = calculateSM2({
            quality,
            easinessFactor: Number(problem.easiness_factor),
            interval: problem.interval,
            repetitions: problem.repetitions,
            sameDayRetry,
        });

        // Update problem with new values
        await db
            .updateTable('problems')
            .set({
                easiness_factor: sm2Result.easinessFactor,
                interval: sm2Result.interval,
                repetitions: sm2Result.repetitions,
                next_review_date: sm2Result.nextReviewDate,
                last_reviewed_at: new Date(),
            })
            .where('id', '=', problemId)
            .execute();

        // Record the review
        await db
            .insertInto('reviews')
            .values({
                problem_id: problemId,
                quality,
                reviewed_at: new Date(),
            })
            .execute();

        res.json({
            success: true,
            nextReview: {
                interval: sm2Result.interval,
                nextReviewDate: sm2Result.nextReviewDate,
                easinessFactor: sm2Result.easinessFactor,
            }
        });
    } catch (error) {
        console.error('Error recording review:', error);
        res.status(500).json({ error: 'Failed to record review' });
    }
}
