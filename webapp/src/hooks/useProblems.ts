import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import superjson from 'superjson';

const API_BASE = '/api';

// Types
export interface Problem {
    id: number;
    title: string;
    leetcode_url: string;
    difficulty: 'easy' | 'medium' | 'hard';
    notes: string | null;
    easiness_factor: number;
    interval: number;
    repetitions: number;
    next_review_date: Date;
    last_reviewed_at: Date | null;
    created_at: Date;
    isDueToday: boolean;
}

export interface Stats {
    totalProblems: number;
    totalReviews: number;
    problemsDueToday: number;
    streakDays: number;
    reviewsByDate: Record<string, number>;
    problemsByDifficulty: {
        easy: number;
        medium: number;
        hard: number;
    };
}

export interface CreateProblemData {
    title: string;
    leetcodeUrl: string;
    difficulty: 'easy' | 'medium' | 'hard';
    notes?: string;
}

// Fetch helpers
async function fetchProblems(): Promise<Problem[]> {
    const res = await fetch(`${API_BASE}/problems`);
    if (!res.ok) throw new Error('Failed to fetch problems');
    const text = await res.text();
    return superjson.parse(text);
}

async function fetchStats(): Promise<Stats> {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    const text = await res.text();
    return superjson.parse(text);
}

async function createProblem(data: CreateProblemData): Promise<void> {
    const res = await fetch(`${API_BASE}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create problem');
}

async function reviewProblem(data: { problemId: number; quality: number }): Promise<void> {
    const res = await fetch(`${API_BASE}/problems/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to record review');
}

async function deleteProblem(problemId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/problems/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId }),
    });
    if (!res.ok) throw new Error('Failed to delete problem');
}

// Hooks
export function useProblems() {
    return useQuery({
        queryKey: ['problems'],
        queryFn: fetchProblems,
        staleTime: 30000,
    });
}

export function useStats() {
    return useQuery({
        queryKey: ['stats'],
        queryFn: fetchStats,
        staleTime: 30000,
    });
}

export function useCreateProblem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createProblem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['problems'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
        },
    });
}

export function useReviewProblem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: reviewProblem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['problems'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
        },
    });
}

export function useDeleteProblem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteProblem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['problems'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
        },
    });
}
