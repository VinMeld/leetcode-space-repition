import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../helpers/db';
import { calculateFSRS, Rating, State, type FSRSSettings } from '../../lib/fsrs';

const reviewSchema = z.object({
    problemId: z.number().int().positive(),
    rating: z.number().int().min(1).max(4), // FSRS ratings: 1=Again, 2=Hard, 3=Good, 4=Easy
    settings: z.object({
        requestRetention: z.number().min(0.7).max(0.97),
        maxInterval: z.number().min(1),
        sameDayRetry: z.boolean(),
        minInterval: z.number().min(1),
    }).optional(),
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

        const { problemId, rating, settings } = validation.data;

        // Get current problem state
        const problem = await db
            .selectFrom('problems')
            .select(['id', 'stability', 'fsrs_difficulty', 'fsrs_state', 'reps', 'lapses', 'last_reviewed_at'])
            .where('id', '=', problemId)
            .executeTakeFirst();

        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        // Convert rating number to FSRS Rating enum
        const fsrsRating = rating as Rating;

        // Build FSRS settings
        const fsrsSettings: FSRSSettings | undefined = settings ? {
            requestRetention: settings.requestRetention,
            maxInterval: settings.maxInterval,
            sameDayRetry: settings.sameDayRetry,
            minInterval: settings.minInterval,
        } : undefined;

        // Calculate new FSRS values
        const fsrsResult = calculateFSRS({
            stability: problem.stability,
            difficulty: problem.fsrs_difficulty,
            state: problem.fsrs_state as State,
            lastReview: problem.last_reviewed_at,
            reps: problem.reps,
            lapses: problem.lapses,
            rating: fsrsRating,
            settings: fsrsSettings,
        });

        // Update problem with new values
        await db
            .updateTable('problems')
            .set({
                stability: fsrsResult.stability,
                fsrs_difficulty: fsrsResult.difficulty,
                fsrs_state: fsrsResult.state,
                interval: fsrsResult.interval,
                reps: fsrsResult.reps,
                lapses: fsrsResult.lapses,
                next_review_date: fsrsResult.nextReviewDate,
                last_reviewed_at: new Date(),
            })
            .where('id', '=', problemId)
            .execute();

        // Record the review (store rating instead of old quality)
        await db
            .insertInto('reviews')
            .values({
                problem_id: problemId,
                quality: rating, // Using rating value (1-4)
                reviewed_at: new Date(),
            })
            .execute();

        res.json({
            success: true,
            nextReview: {
                interval: fsrsResult.interval,
                nextReviewDate: fsrsResult.nextReviewDate,
                stability: fsrsResult.stability,
                difficulty: fsrsResult.difficulty,
                state: fsrsResult.state,
            }
        });
    } catch (error) {
        console.error('Error recording review:', error);
        res.status(500).json({ error: 'Failed to record review' });
    }
}
