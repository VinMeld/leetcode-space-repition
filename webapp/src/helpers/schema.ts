import type { Generated, Insertable, Selectable, Updateable } from 'kysely';

// Database schema types for Kysely

export interface Database {
    problems: ProblemsTable;
    reviews: ReviewsTable;
    api_keys: ApiKeysTable;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ProblemsTable {
    id: Generated<number>;
    title: string;
    leetcode_url: string;
    difficulty: Difficulty;
    notes: string | null;
    easiness_factor: number;
    interval: number;
    repetitions: number;
    next_review_date: Date;
    last_reviewed_at: Date | null;
    created_at: Generated<Date>;
}

export type Problem = Selectable<ProblemsTable>;
export type NewProblem = Insertable<ProblemsTable>;
export type ProblemUpdate = Updateable<ProblemsTable>;

export interface ReviewsTable {
    id: Generated<number>;
    problem_id: number;
    quality: number;
    reviewed_at: Date;
    created_at: Generated<Date>;
}

export type Review = Selectable<ReviewsTable>;
export type NewReview = Insertable<ReviewsTable>;

export interface ApiKeysTable {
    id: Generated<number>;
    key_hash: string;
    key_prefix: string;
    name: string | null;
    last_used_at: Date | null;
    created_at: Generated<Date>;
}

export type ApiKey = Selectable<ApiKeysTable>;
export type NewApiKey = Insertable<ApiKeysTable>;
