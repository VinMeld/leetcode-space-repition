import type { Request, Response } from 'express';
import { db } from '../../helpers/db';
import { isDueToday } from '../../lib/sm2';

export async function listProblems(_req: Request, res: Response) {
    try {
        const problems = await db
            .selectFrom('problems')
            .selectAll()
            .orderBy('next_review_date', 'asc')
            .execute();

        // Add isDueToday flag to each problem
        const problemsWithDueFlag = problems.map(problem => ({
            ...problem,
            isDueToday: isDueToday(problem.next_review_date),
        }));

        // Return plain JSON for CLI compatibility
        res.json(problemsWithDueFlag);
    } catch (error) {
        console.error('Error listing problems:', error);
        res.status(500).json({ error: 'Failed to fetch problems' });
    }
}
