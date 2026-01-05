import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import type { SM2Settings } from '../lib/settings';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Types
export interface Problem {
    id: number;
    title: string;
    leetcode_url: string;
    difficulty: 'easy' | 'medium' | 'hard';
    notes?: string;
    easiness_factor: number;
    interval: number;
    repetitions: number;
    next_review_date: string;
    last_reviewed_at?: string;
    created_at: string;
    isDueToday: boolean;
}

export interface CreateProblemData {
    title: string;
    leetcodeUrl: string;
    difficulty: 'easy' | 'medium' | 'hard';
    notes?: string;
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

// Hooks
export function useProblems() {
    const { token } = useAuth();
    const queryClient = useQueryClient();

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    });

    const problems = useQuery({
        queryKey: ['problems'],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/problems`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch problems');
            return res.json() as Promise<Problem[]>;
        },
        enabled: !!token,
    });

    const createProblem = useMutation({
        mutationFn: async (newProblem: CreateProblemData) => {
            const res = await fetch(`${API_URL}/problems`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(newProblem),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create problem');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['problems'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
        },
    });

    const reviewProblem = useMutation({
        mutationFn: async ({ problemId, quality, settings }: { problemId: number; quality: number; settings?: SM2Settings }) => {
            const res = await fetch(`${API_URL}/problems/review`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ problemId, quality, settings }),
            });
            if (!res.ok) throw new Error('Failed to review problem');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['problems'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
        },
    });

    const deleteProblem = useMutation({
        mutationFn: async (problemId: number) => {
            const res = await fetch(`${API_URL}/problems/delete`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ problemId }),
            });
            if (!res.ok) throw new Error('Failed to delete problem');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['problems'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
        },
    });

    return { problems, createProblem, reviewProblem, deleteProblem };
}

export function useStats() {
    const { token } = useAuth();

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    });

    return useQuery({
        queryKey: ['stats'],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/stats`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json() as Promise<Stats>;
        },
        enabled: !!token,
    });
}
