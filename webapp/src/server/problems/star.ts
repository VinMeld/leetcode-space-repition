import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../helpers/db';

const toggleStarSchema = z.object({
    problemId: z.number().int().positive(),
});

export async function toggleStar(req: Request, res: Response) {
    try {
        const user = req.user as { id: number } | undefined;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const validation = toggleStarSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid input',
                details: validation.error.errors
            });
        }

        const { problemId } = validation.data;

        // Get current starred state
        const problem = await db
            .selectFrom('problems')
            .select(['id', 'is_starred'])
            .where('id', '=', problemId)
            .where('user_id', '=', user.id)
            .executeTakeFirst();

        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        // Toggle the starred state
        const newStarredState = !problem.is_starred;

        await db
            .updateTable('problems')
            .set({ is_starred: newStarredState })
            .where('id', '=', problemId)
            .where('user_id', '=', user.id)
            .execute();

        res.json({
            success: true,
            is_starred: newStarredState
        });
    } catch (error) {
        console.error('Error toggling star:', error);
        res.status(500).json({ error: 'Failed to toggle star' });
    }
}
