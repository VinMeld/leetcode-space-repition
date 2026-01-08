import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../helpers/db';
import type { Difficulty } from '../../helpers/schema';
import { State, efToDifficulty, intervalToStability } from '../../lib/fsrs';

const createProblemSchema = z.object({
    title: z.string().min(1).max(255),
    leetcodeUrl: z.string().url(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    notes: z.string().optional(),
    // Optional FSRS parameters for import (or migration from SM-2/Anki)
    stability: z.number().optional(),
    fsrsDifficulty: z.number().optional(),
    fsrsState: z.number().optional(),
    interval: z.number().optional(),
    reps: z.number().optional(),
    lapses: z.number().optional(),
    nextReviewDate: z.string().datetime().optional(), // Expect ISO string
    // Legacy SM-2 fields for Anki import compatibility
    easinessFactor: z.number().optional(),
    repetitions: z.number().optional(),
});

export async function createProblem(req: Request, res: Response) {
    try {
        const user = req.user as { id: number } | undefined;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const validation = createProblemSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid input',
                details: validation.error.errors
            });
        }

        const {
            title,
            leetcodeUrl,
            difficulty,
            notes,
            stability,
            fsrsDifficulty,
            fsrsState,
            interval,
            reps,
            lapses,
            nextReviewDate,
            // Legacy fields
            easinessFactor,
            repetitions,
        } = validation.data;

        // Check for existing problem
        const existing = await db
            .selectFrom('problems')
            .select('id')
            .where('user_id', '=', user.id)
            .where('leetcode_url', '=', leetcodeUrl)
            .executeTakeFirst();

        if (existing) {
            return res.status(409).json({
                error: 'Problem already exists',
                problemId: existing.id
            });
        }

        // Calculate next order_num for this user
        const maxOrderResult = await db
            .selectFrom('problems')
            .select(db.fn.max('order_num').as('max_order'))
            .where('user_id', '=', user.id)
            .executeTakeFirst();

        const nextOrderNum = (maxOrderResult?.max_order ?? 0) + 1;

        // Handle migration from SM-2/Anki if only legacy fields provided
        let finalStability = stability ?? 0;
        let finalDifficulty = fsrsDifficulty ?? 5;
        let finalState = fsrsState ?? State.New;
        const finalInterval = interval ?? 0;
        let finalReps = reps ?? 0;
        const finalLapses = lapses ?? 0;

        if (easinessFactor !== undefined && stability === undefined) {
            // Convert SM-2 ease factor to FSRS difficulty
            finalDifficulty = efToDifficulty(easinessFactor);
        }
        if (interval !== undefined && stability === undefined) {
            // Estimate stability from interval
            finalStability = intervalToStability(interval);
        }
        if (repetitions !== undefined && reps === undefined) {
            finalReps = repetitions;
            if (repetitions > 0) {
                finalState = State.Review;
            }
        }

        const result = await db
            .insertInto('problems')
            .values({
                user_id: user.id,
                order_num: nextOrderNum,
                title,
                leetcode_url: leetcodeUrl,
                difficulty: difficulty as Difficulty,
                notes: notes || null,
                stability: finalStability,
                fsrs_difficulty: finalDifficulty,
                fsrs_state: finalState,
                interval: finalInterval,
                reps: finalReps,
                lapses: finalLapses,
                next_review_date: nextReviewDate ? new Date(nextReviewDate) : new Date(),
                // Keep legacy fields for backwards compatibility
                easiness_factor: easinessFactor ?? null,
                repetitions: repetitions ?? null,
            })
            .returning(['id', 'title', 'order_num', 'created_at'])
            .executeTakeFirst();

        res.status(201).json({
            success: true,
            problem: result
        });
    } catch (error) {
        console.error('Error creating problem:', error);
        res.status(500).json({ error: 'Failed to create problem' });
    }
}
