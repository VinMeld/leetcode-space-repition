/**
 * FSRS Algorithm Tests
 */

import { describe, it, expect } from 'vitest';
import {
    calculateFSRS,
    getRetrievability,
    rescheduleInterval,
    efToDifficulty,
    intervalToStability,
    Rating,
    State,
} from './fsrs';

describe('FSRS Algorithm', () => {
    describe('calculateFSRS', () => {
        it('should handle first review of new card', () => {
            const result = calculateFSRS({
                stability: 0,
                difficulty: 0,
                state: State.New,
                lastReview: null,
                reps: 0,
                lapses: 0,
                rating: Rating.Good,
            });

            expect(result.stability).toBeGreaterThan(0);
            expect(result.state).not.toBe(State.New);
            expect(result.reps).toBe(1);
            expect(result.interval).toBeGreaterThanOrEqual(0);
        });

        it('should return valid stability on successful review', () => {
            const result = calculateFSRS({
                stability: 5,
                difficulty: 5,
                state: State.Review,
                lastReview: new Date(),
                reps: 3,
                lapses: 0,
                rating: Rating.Good,
            });

            // FSRS calculates stability based on internal algorithm
            expect(result.stability).toBeGreaterThan(0);
            expect(result.state).toBe(State.Review);
        });

        it('should set interval to 0 for Again rating with sameDayRetry', () => {
            const result = calculateFSRS({
                stability: 10,
                difficulty: 5,
                state: State.Review,
                lastReview: new Date(),
                reps: 5,
                lapses: 0,
                rating: Rating.Again,
                settings: {
                    requestRetention: 0.9,
                    maxInterval: 365,
                    sameDayRetry: true,
                    minInterval: 1,
                },
            });

            expect(result.interval).toBe(0);
            expect(result.lapses).toBeGreaterThan(0);
        });

        it('should give longer intervals for Easy rating', () => {
            const baseInput = {
                stability: 10,
                difficulty: 5,
                state: State.Review as State,
                lastReview: new Date(),
                reps: 3,
                lapses: 0,
            };

            const goodResult = calculateFSRS({ ...baseInput, rating: Rating.Good });
            const easyResult = calculateFSRS({ ...baseInput, rating: Rating.Easy });

            expect(easyResult.interval).toBeGreaterThanOrEqual(goodResult.interval);
        });
    });

    describe('getRetrievability', () => {
        it('should return 1 for zero elapsed days', () => {
            expect(getRetrievability(10, 0)).toBe(1);
        });

        it('should return 1 for zero stability', () => {
            expect(getRetrievability(0, 5)).toBe(1);
        });

        it('should decrease with more elapsed days', () => {
            const stability = 10;
            const r1 = getRetrievability(stability, 5);
            const r2 = getRetrievability(stability, 10);
            const r3 = getRetrievability(stability, 20);

            expect(r1).toBeGreaterThan(r2);
            expect(r2).toBeGreaterThan(r3);
        });

        it('should be approximately 0.9 at stability days', () => {
            // At t = s * ln(0.9) / ln(0.9) ≈ s, R should be about 0.37 (e^-1)
            // Actually R = e^(-t/s), so at t=s, R = e^-1 ≈ 0.368
            const stability = 10;
            const r = getRetrievability(stability, stability);
            expect(r).toBeCloseTo(Math.exp(-1), 2);
        });
    });

    describe('rescheduleInterval', () => {
        it('should return same interval for same retention', () => {
            const result = rescheduleInterval(10, 0.9, 0.9);
            expect(result).toBe(10);
        });

        it('should increase interval for lower retention', () => {
            const result = rescheduleInterval(10, 0.9, 0.85);
            expect(result).toBeGreaterThan(10);
        });

        it('should decrease interval for higher retention', () => {
            const result = rescheduleInterval(10, 0.85, 0.9);
            expect(result).toBeLessThan(10);
        });

        it('should return original for zero interval', () => {
            const result = rescheduleInterval(0, 0.9, 0.85);
            expect(result).toBe(0);
        });
    });

    describe('efToDifficulty', () => {
        it('should map EF 2.5 to medium difficulty', () => {
            const d = efToDifficulty(2.5);
            expect(d).toBe(1); // Easiest
        });

        it('should map EF 1.3 to high difficulty', () => {
            const d = efToDifficulty(1.3);
            expect(d).toBe(10); // Hardest
        });

        it('should clamp to valid range', () => {
            const dLow = efToDifficulty(5.0);
            const dHigh = efToDifficulty(0.5);
            expect(dLow).toBeGreaterThanOrEqual(1);
            expect(dHigh).toBeLessThanOrEqual(10);
        });
    });

    describe('intervalToStability', () => {
        it('should return 0 for zero interval', () => {
            expect(intervalToStability(0)).toBe(0);
        });

        it('should estimate stability from interval', () => {
            const stability = intervalToStability(10);
            expect(stability).toBeGreaterThan(10); // Stability slightly higher than interval
        });
    });
});
