import { describe, it, expect } from 'vitest';
import { calculateSM2 } from '../sm2';

describe('SM-2 Algorithm', () => {
    it('should schedule for next day on failure (quality < 3) by default', () => {
        const result = calculateSM2({
            quality: 2,
            easinessFactor: 2.5,
            interval: 10,
            repetitions: 5,
        });

        expect(result.interval).toBe(1);
        expect(result.repetitions).toBe(0);
        expect(result.easinessFactor).toBe(2.5);
    });

    it('should schedule for same day on failure if sameDayRetry is true', () => {
        const result = calculateSM2({
            quality: 2,
            easinessFactor: 2.5,
            interval: 10,
            repetitions: 5,
            sameDayRetry: true,
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
            sameDayRetry: false,
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
            sameDayRetry: true,
        });

        // Should calculate normal SM-2 interval
        expect(result.interval).toBeGreaterThan(10);
        expect(result.repetitions).toBe(6);
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
