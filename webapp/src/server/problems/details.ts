import type { Request, Response } from 'express';
import { db } from '../../helpers/db';

export async function getProblemDetails(req: Request, res: Response) {
    try {
        const user = req.user as { id: number } | undefined;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const problemId = parseInt(req.params.id);
        if (isNaN(problemId)) {
            return res.status(400).json({ error: 'Invalid problem ID' });
        }

        // Get problem details
        const problem = await db
            .selectFrom('problems')
            .selectAll()
            .where('id', '=', problemId)
            .where('user_id', '=', user.id)
            .executeTakeFirst();

        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        // Get review history
        const reviews = await db
            .selectFrom('reviews')
            .selectAll()
            .where('problem_id', '=', problemId)
            .orderBy('reviewed_at', 'desc')
            .execute();

        // Calculate derived stats
        const lapses = reviews.filter(r => r.quality < 3).length;
        const totalQuality = reviews.reduce((sum, r) => sum + r.quality, 0);
        const averageQuality = reviews.length > 0 ? totalQuality / reviews.length : 0;
        const firstReview = reviews.length > 0 ? reviews[reviews.length - 1].reviewed_at : null;
        const latestReview = reviews.length > 0 ? reviews[0].reviewed_at : null;

        res.json({
            problem,
            reviews,
            stats: {
                lapses,
                averageQuality,
                firstReview,
                latestReview,
                totalReviews: reviews.length,
            }
        });
    } catch (error) {
        console.error('Error fetching problem details:', error);
        res.status(500).json({ error: 'Failed to fetch problem details' });
    }
}
