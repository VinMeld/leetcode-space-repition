import type { Request, Response } from 'express';
import { db } from '../helpers/db';
import { sql } from 'kysely';
import superjson from 'superjson';

export async function getStats(_req: Request, res: Response) {
    try {
        // Get total problems count
        const totalProblemsResult = await db
            .selectFrom('problems')
            .select(sql<number>`count(*)::int`.as('count'))
            .executeTakeFirst();
        const totalProblems = totalProblemsResult?.count || 0;

        // Get total reviews count
        const totalReviewsResult = await db
            .selectFrom('reviews')
            .select(sql<number>`count(*)::int`.as('count'))
            .executeTakeFirst();
        const totalReviews = totalReviewsResult?.count || 0;

        // Get problems due today
        const problemsDueTodayResult = await db
            .selectFrom('problems')
            .select(sql<number>`count(*)::int`.as('count'))
            .where('next_review_date', '<=', new Date())
            .executeTakeFirst();
        const problemsDueToday = problemsDueTodayResult?.count || 0;

        // Calculate streak (consecutive days with reviews)
        const streakDays = await calculateStreak();

        // Get reviews by date for heatmap (last 365 days)
        const reviewsByDate = await getReviewsByDate();

        // Get problems by difficulty
        const problemsByDifficulty = await db
            .selectFrom('problems')
            .select(['difficulty', sql<number>`count(*)::int`.as('count')])
            .groupBy('difficulty')
            .execute();

        const difficultyBreakdown = {
            easy: problemsByDifficulty.find(p => p.difficulty === 'easy')?.count || 0,
            medium: problemsByDifficulty.find(p => p.difficulty === 'medium')?.count || 0,
            hard: problemsByDifficulty.find(p => p.difficulty === 'hard')?.count || 0,
        };

        const stats = {
            totalProblems,
            totalReviews,
            problemsDueToday,
            streakDays,
            reviewsByDate,
            problemsByDifficulty: difficultyBreakdown,
        };

        const serialized = superjson.stringify(stats);
        res.setHeader('Content-Type', 'application/json');
        res.send(serialized);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
}

async function calculateStreak(): Promise<number> {
    // Get distinct review dates, ordered by most recent
    const reviewDates = await db
        .selectFrom('reviews')
        .select(sql<string>`DISTINCT DATE(reviewed_at)`.as('review_date'))
        .orderBy(sql`DATE(reviewed_at)`, 'desc')
        .limit(365)
        .execute();

    if (reviewDates.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < reviewDates.length; i++) {
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);

        const reviewDate = new Date(reviewDates[i].review_date);
        reviewDate.setHours(0, 0, 0, 0);

        if (expectedDate.getTime() === reviewDate.getTime()) {
            streak++;
        } else if (i === 0 && streak === 0) {
            // If today has no review, check if yesterday starts a streak
            expectedDate.setDate(expectedDate.getDate() - 1);
            if (expectedDate.getTime() === reviewDate.getTime()) {
                streak++;
            } else {
                break;
            }
        } else {
            break;
        }
    }

    return streak;
}

async function getReviewsByDate(): Promise<Record<string, number>> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const reviews = await db
        .selectFrom('reviews')
        .select([
            sql<string>`DATE(reviewed_at)`.as('date'),
            sql<number>`count(*)::int`.as('count'),
        ])
        .where('reviewed_at', '>=', oneYearAgo)
        .groupBy(sql`DATE(reviewed_at)`)
        .execute();

    const result: Record<string, number> = {};
    reviews.forEach(r => {
        result[r.date] = r.count;
    });

    return result;
}
