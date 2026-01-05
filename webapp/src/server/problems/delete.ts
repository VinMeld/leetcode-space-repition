import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../helpers/db';

const deleteSchema = z.object({
    problemId: z.number().int().positive(),
});

export async function deleteProblem(req: Request, res: Response) {
    try {
        const validation = deleteSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                error: 'Invalid input',
                details: validation.error.errors
            });
        }

        const { problemId } = validation.data;

        // Delete the problem (reviews will be cascade deleted)
        const result = await db
            .deleteFrom('problems')
            .where('id', '=', problemId)
            .executeTakeFirst();

        if (result.numDeletedRows === BigInt(0)) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting problem:', error);
        res.status(500).json({ error: 'Failed to delete problem' });
    }
}

export async function deleteAllProblems(req: Request, res: Response) {
    try {
        const user = req.user as { id: number } | undefined;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await db
            .deleteFrom('problems')
            .where('user_id', '=', user.id)
            .execute();

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting all problems:', error);
        res.status(500).json({ error: 'Failed to delete all problems' });
    }
}
