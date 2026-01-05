import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
function getHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

async function fetchProblems(): Promise<Problem[]> {
    const res = await fetch(`${API_BASE}/problems`, {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch problems');
    return res.json();
}

async function fetchStats(): Promise<Stats> {
    const res = await fetch(`${API_BASE}/stats`, {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
}

async function createProblem(data: CreateProblemData): Promise<void> {
    const res = await fetch(`${API_BASE}/problems`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create problem');
}

async function reviewProblem(data: { problemId: number; quality: number; sameDayRetry?: boolean }): Promise<void> {
    const res = await fetch(`${API_BASE}/problems/review`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to record review');
}

async function deleteProblem(problemId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/problems/delete`, {
        method: 'POST',
        headers: getHeaders(),
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
