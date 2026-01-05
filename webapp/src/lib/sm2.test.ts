import { describe, it, expect } from 'vitest';
import { calculateSM2, isDueToday } from './sm2';

describe('SM-2 Algorithm', () => {
    describe('calculateSM2', () => {
        it('should reset on quality 0 (complete blackout)', () => {
            const result = calculateSM2({
                quality: 0,
                easinessFactor: 2.5,
                interval: 10,
                repetitions: 5,
            });

            expect(result.interval).toBe(0);
            expect(result.repetitions).toBe(0);
        });

        it('should reset on quality 1 (wrong answer)', () => {
            const result = calculateSM2({
                quality: 1,
                easinessFactor: 2.5,
                interval: 10,
                repetitions: 5,
            });

            expect(result.interval).toBe(0);
            expect(result.repetitions).toBe(0);
        });

        it('should reset on quality 2 (hard)', () => {
            const result = calculateSM2({
                quality: 2,
                easinessFactor: 2.5,
                interval: 10,
                repetitions: 5,
            });

            expect(result.interval).toBe(0);
            expect(result.repetitions).toBe(0);
        });

        it('should set interval to 1 on first successful review', () => {
            const result = calculateSM2({
                quality: 4,
                easinessFactor: 2.5,
                interval: 0,
                repetitions: 0,
            });

            expect(result.interval).toBe(1);
            expect(result.repetitions).toBe(1);
        });

        it('should set interval to 6 on second successful review', () => {
            const result = calculateSM2({
                quality: 4,
                easinessFactor: 2.5,
                interval: 1,
                repetitions: 1,
            });

            expect(result.interval).toBe(6);
            expect(result.repetitions).toBe(2);
        });

        it('should multiply interval by EF on subsequent reviews', () => {
            const result = calculateSM2({
                quality: 4,
                easinessFactor: 2.5,
                interval: 6,
                repetitions: 2,
            });

            expect(result.interval).toBe(15); // 6 * 2.5 = 15
            expect(result.repetitions).toBe(3);
        });

        it('should increase EF for quality 5', () => {
            const result = calculateSM2({
                quality: 5,
                easinessFactor: 2.5,
                interval: 6,
                repetitions: 2,
            });

            expect(result.easinessFactor).toBeGreaterThan(2.5);
        });

        it('should decrease EF for quality 3', () => {
            const result = calculateSM2({
                quality: 3,
                easinessFactor: 2.5,
                interval: 6,
                repetitions: 2,
            });

            expect(result.easinessFactor).toBeLessThan(2.5);
        });

        it('should maintain minimum EF of 1.3', () => {
            // Use quality 3 with low EF to test minimum
            const result = calculateSM2({
                quality: 3,
                easinessFactor: 1.3,
                interval: 6,
                repetitions: 2,
            });

            expect(result.easinessFactor).toBeGreaterThanOrEqual(1.3);
        });

        it('should set nextReviewDate correctly', () => {
            const result = calculateSM2({
                quality: 4,
                easinessFactor: 2.5,
                interval: 0,
                repetitions: 0,
            });
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Should be approximately 1 day from now
            expect(result.nextReviewDate.getDate()).toBe(tomorrow.getDate());
        });
    });

    describe('isDueToday', () => {
        it('should return true for dates in the past', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            expect(isDueToday(yesterday)).toBe(true);
        });

        it('should return true for today', () => {
            const today = new Date();

            expect(isDueToday(today)).toBe(true);
        });

        it('should return false for future dates', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(23, 59, 59);

            expect(isDueToday(tomorrow)).toBe(false);
        });
    });
});
