import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../helpers/db';
import type { Difficulty } from '../../helpers/schema';

const createProblemSchema = z.object({
    title: z.string().min(1).max(255),
    leetcodeUrl: z.string().url(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    notes: z.string().optional(),
    // Optional SM-2 parameters for import
    easinessFactor: z.number().optional(),
    interval: z.number().optional(),
    repetitions: z.number().optional(),
    nextReviewDate: z.string().datetime().optional(), // Expect ISO string
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

        const { title, leetcodeUrl, difficulty, notes, easinessFactor, interval, repetitions, nextReviewDate } = validation.data;

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

        const result = await db
            .insertInto('problems')
            .values({
                user_id: user.id,
                order_num: nextOrderNum,
                title,
                leetcode_url: leetcodeUrl,
                difficulty: difficulty as Difficulty,
                notes: notes || null,
                easiness_factor: easinessFactor ?? 2.5,
                interval: interval ?? 0,
                repetitions: repetitions ?? 0,
                next_review_date: nextReviewDate ? new Date(nextReviewDate) : new Date(),
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
