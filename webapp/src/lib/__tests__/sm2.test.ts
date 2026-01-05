import { describe, it, expect } from 'vitest';
import { calculateSM2 } from '../sm2';

describe('SM-2 Algorithm', () => {
    it('should schedule for next day on failure (quality < 3) by default', () => {
        const result = calculateSM2({
            quality: 2,
            easinessFactor: 2.5,
            interval: 10,
            repetitions: 5,
            // Default sameDayRetry is true now, so we expect 0
        });

        expect(result.interval).toBe(0);
        expect(result.repetitions).toBe(0);
        expect(result.easinessFactor).toBe(2.5);
    });

    it('should schedule for same day on failure if sameDayRetry is true', () => {
        const result = calculateSM2({
            quality: 2,
            easinessFactor: 2.5,
            interval: 10,
            repetitions: 5,
            settings: {
                sameDayRetry: true,
                easyMultiplier: 1,
                mediumMultiplier: 1,
                hardMultiplier: 1,
                wrongAnswerPenalty: 0.5,
                minInterval: 1
            }
        });

        expect(result.interval).toBe(0);
        expect(result.repetitions).toBe(0);
        expect(result.easinessFactor).toBe(2.5);
    });

    it('should schedule for next day on failure if sameDayRetry is false', () => {
        const result = calculateSM2({
            quality: 2,
            easinessFactor: 2.5,
            interval: 10,
            repetitions: 5,
            settings: {
                sameDayRetry: false,
                easyMultiplier: 1,
                mediumMultiplier: 1,
                hardMultiplier: 1,
                wrongAnswerPenalty: 0.5,
                minInterval: 1
            }
        });

        expect(result.interval).toBe(1);
        expect(result.repetitions).toBe(0);
        expect(result.easinessFactor).toBe(2.5);
    });

    it('should ignore sameDayRetry on success (quality >= 3)', () => {
        const result = calculateSM2({
            quality: 4,
            easinessFactor: 2.5,
            interval: 10,
            repetitions: 5,
            settings: {
                easyMultiplier: 1.0,
                mediumMultiplier: 1.0,
                hardMultiplier: 1.0,
                sameDayRetry: true,
                wrongAnswerPenalty: 0.5,
                minInterval: 1,
            },
        });

        // Should calculate normal SM-2 interval
        expect(result.interval).toBeGreaterThan(10);
        expect(result.repetitions).toBe(6);
    });

    it('should apply difficulty multipliers from settings', () => {
        const baseInput = {
            quality: 4,
            easinessFactor: 2.5,
            interval: 10,
            repetitions: 5,
        };

        const settings = {
            easyMultiplier: 0.5,
            mediumMultiplier: 1.0,
            hardMultiplier: 2.0,
            sameDayRetry: true,
            wrongAnswerPenalty: 0.5,
            minInterval: 1,
        };

        // Normal calculation: 10 * 2.5 = 25

        // Easy: 25 * 0.5 = 13 (rounded)
        const easyResult = calculateSM2({ ...baseInput, difficulty: 'easy', settings });
        expect(easyResult.interval).toBe(13);

        // Hard: 25 * 2.0 = 50
        const hardResult = calculateSM2({ ...baseInput, difficulty: 'hard', settings });
        expect(hardResult.interval).toBe(50);
    });

    it('should respect minimum interval from settings', () => {
        const result = calculateSM2({
            quality: 4,
            easinessFactor: 1.3,
            interval: 1,
            repetitions: 1,
            settings: {
                easyMultiplier: 1.0,
                mediumMultiplier: 1.0,
                hardMultiplier: 1.0,
                sameDayRetry: true,
                wrongAnswerPenalty: 0.5,
                minInterval: 5, // Enforce min interval of 5
            },
        });

        // Normal might be small, but should be at least 5
        expect(result.interval).toBeGreaterThanOrEqual(5);
    });
});

import { isDueToday } from '../sm2';

describe('isDueToday', () => {
    it('should return true if date is today', () => {
        const today = new Date();
        expect(isDueToday(today)).toBe(true);
    });

    it('should return true if date is in the past', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        expect(isDueToday(yesterday)).toBe(true);
    });

    it('should return false if date is tomorrow', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        expect(isDueToday(tomorrow)).toBe(false);
    });
});
