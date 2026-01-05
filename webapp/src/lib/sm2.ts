/**
 * SM-2 Spaced Repetition Algorithm Implementation
 * 
 * The SuperMemo 2 algorithm calculates optimal review intervals
 * based on the quality of recall (0-5 rating).
 */

export interface SM2Result {
    easinessFactor: number;
    interval: number;
    repetitions: number;
    nextReviewDate: Date;
}

export interface SM2Input {
    quality: number;  // 0-5 rating
    easinessFactor: number;  // Current EF (typically starts at 2.5)
    interval: number;  // Current interval in days
    repetitions: number;  // Number of successful repetitions
    sameDayRetry?: boolean; // Whether to retry today if quality < 3
}

/**
 * Calculate the next review parameters using SM-2 algorithm
 * 
 * Quality ratings:
 * 0 - Complete blackout
 * 1 - Incorrect response, but upon seeing correct answer, remembered
 * 2 - Incorrect response, but correct answer seemed easy to recall
 * 3 - Correct response with serious difficulty
 * 4 - Correct response after hesitation
 * 5 - Perfect response
 */
export function calculateSM2(input: SM2Input): SM2Result {
    const { quality, easinessFactor: currentEF, interval: currentInterval, repetitions: currentReps, sameDayRetry } = input;

    let newEF = currentEF;
    let newInterval: number;
    let newRepetitions: number;

    if (quality >= 3) {
        // Successful recall
        newRepetitions = currentReps + 1;

        // Calculate new interval
        if (newRepetitions === 1) {
            newInterval = 1;
        } else if (newRepetitions === 2) {
            newInterval = 6;
        } else {
            newInterval = Math.round(currentInterval * currentEF);
        }

        // Update easiness factor
        // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        const qFactor = 5 - quality;
        newEF = currentEF + (0.1 - qFactor * (0.08 + qFactor * 0.02));
    } else {
        // Failed recall - reset
        newRepetitions = 0;
        // If sameDayRetry is enabled and quality is low (< 3), set interval to 0 (due immediately)
        // Otherwise set to 1 day
        newInterval = (sameDayRetry && quality < 3) ? 0 : 1;
        // EF remains unchanged on failure
    }

    // Ensure EF never goes below 1.3
    newEF = Math.max(1.3, newEF);

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
        easinessFactor: Math.round(newEF * 100) / 100,  // Round to 2 decimal places
        interval: newInterval,
        repetitions: newRepetitions,
        nextReviewDate,
    };
}

/**
 * Check if a problem is due for review today
 */
export function isDueToday(nextReviewDate: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reviewDate = new Date(nextReviewDate);
    reviewDate.setHours(0, 0, 0, 0);

    return reviewDate <= today;
}
