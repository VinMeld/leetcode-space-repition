/**
 * FSRS (Free Spaced Repetition Scheduler) Algorithm Implementation
 *
 * Wrapper around ts-fsrs library for spaced repetition scheduling.
 * FSRS is more accurate than SM-2, using memory stability and difficulty
 * to optimize review intervals.
 */

import {
    createEmptyCard,
    fsrs,
    generatorParameters,
    Rating,
    State,
    type Card,
    type FSRSParameters,
    type RecordLog,
} from 'ts-fsrs';

export { Rating, State };

export interface FSRSSettings {
    requestRetention: number;  // Target recall probability (0.7-0.97)
    maxInterval: number;       // Maximum interval in days (default 365)
    sameDayRetry: boolean;     // Show again today if failed
    minInterval: number;       // Minimum interval in days
}

export const defaultFSRSSettings: FSRSSettings = {
    requestRetention: 0.9,
    maxInterval: 365,
    sameDayRetry: true,
    minInterval: 1,
};

export interface FSRSInput {
    stability: number;
    difficulty: number;
    state: State;
    lastReview: Date | null;
    reps: number;
    lapses: number;
    rating: Rating;
    settings?: FSRSSettings;
}

export interface FSRSResult {
    stability: number;
    difficulty: number;
    state: State;
    interval: number;
    nextReviewDate: Date;
    reps: number;
    lapses: number;
}

/**
 * Create FSRS parameters from settings
 */
function createParams(settings: FSRSSettings): FSRSParameters {
    return generatorParameters({
        request_retention: settings.requestRetention,
        maximum_interval: settings.maxInterval,
    });
}

/**
 * Convert our input to ts-fsrs Card format
 */
function toCard(input: FSRSInput): Card {
    if (input.state === State.New) {
        return createEmptyCard();
    }

    return {
        due: input.lastReview ? new Date(input.lastReview) : new Date(),
        stability: input.stability,
        difficulty: input.difficulty,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: input.reps,
        lapses: input.lapses,
        state: input.state,
        last_review: input.lastReview || undefined,
        learning_steps: 0,
    };
}

/**
 * Calculate the next review parameters using FSRS algorithm
 *
 * Rating values:
 * 1 - Again (complete failure)
 * 2 - Hard (recalled with difficulty)
 * 3 - Good (recalled correctly)
 * 4 - Easy (recalled effortlessly)
 */
export function calculateFSRS(input: FSRSInput): FSRSResult {
    const settings = input.settings || defaultFSRSSettings;
    const params = createParams(settings);
    const f = fsrs(params);

    const card = toCard(input);
    const now = new Date();

    const result: RecordLog = f.repeat(card, now);
    // Access the scheduled card for the given rating
    const scheduled = (result as unknown as Record<Rating, { card: Card }>)[input.rating];

    let interval = scheduled.card.scheduled_days;

    // Apply same-day retry for Again rating
    if (settings.sameDayRetry && input.rating === Rating.Again) {
        interval = 0;
    }

    // Ensure minimum interval
    if (interval > 0) {
        interval = Math.max(interval, settings.minInterval);
    }

    const nextReviewDate = new Date(now);
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    return {
        stability: scheduled.card.stability,
        difficulty: scheduled.card.difficulty,
        state: scheduled.card.state,
        interval,
        nextReviewDate,
        reps: scheduled.card.reps,
        lapses: scheduled.card.lapses,
    };
}

/**
 * Calculate retrievability (probability of recall) for a card
 *
 * @param stability - Memory stability in days
 * @param elapsedDays - Days since last review
 * @returns Probability of recall (0-1)
 */
export function getRetrievability(stability: number, elapsedDays: number): number {
    if (stability <= 0 || elapsedDays <= 0) {
        return 1;
    }
    // FSRS formula: R = exp(-t/s) where t is elapsed days and s is stability
    return Math.exp(-elapsedDays / stability);
}

/**
 * Calculate interval from stability and target retention
 *
 * @param stability - Memory stability in days
 * @param requestRetention - Target recall probability (e.g., 0.9)
 * @returns Optimal interval in days
 */
export function intervalFromStability(stability: number, requestRetention: number): number {
    if (stability <= 0 || requestRetention <= 0 || requestRetention >= 1) {
        return 1;
    }
    // Derived from R = exp(-t/s): t = -s * ln(R)
    return Math.round(stability * Math.log(requestRetention) / Math.log(0.9) * (-1) * Math.log(0.9) / Math.log(requestRetention));
    // Simplified: t = s * ln(0.9) / ln(R) when R < 1
}

/**
 * Reschedule interval based on new target retention
 *
 * @param currentInterval - Current interval in days
 * @param currentRetention - Current target retention (e.g., 0.9)
 * @param newRetention - New target retention (e.g., 0.85)
 * @returns New interval in days
 */
export function rescheduleInterval(
    currentInterval: number,
    currentRetention: number,
    newRetention: number
): number {
    if (currentInterval <= 0) return currentInterval;

    // Formula: new_interval = current_interval * log(new_R) / log(current_R)
    const ratio = Math.log(newRetention) / Math.log(currentRetention);
    return Math.max(1, Math.round(currentInterval * ratio));
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

/**
 * Convert SM-2 ease factor to FSRS difficulty estimate
 * SM-2 EF ranges from 1.3 to 2.5+
 * FSRS difficulty ranges from 1 to 10
 */
export function efToDifficulty(easinessFactor: number): number {
    // EF 2.5 -> D 5 (medium)
    // EF 1.3 -> D 10 (very hard)
    // Linear mapping: D = 10 - (EF - 1.3) * (9 / 1.2)
    const d = 10 - ((easinessFactor - 1.3) * 7.5);
    return Math.max(1, Math.min(10, Math.round(d * 10) / 10));
}

/**
 * Estimate initial stability from SM-2 interval
 */
export function intervalToStability(interval: number): number {
    // For a well-learned card at 90% retention:
    // interval ≈ stability * 0.9 (approximate)
    // So stability ≈ interval / 0.9
    if (interval <= 0) return 0;
    return Math.round(interval / 0.9 * 10) / 10;
}
