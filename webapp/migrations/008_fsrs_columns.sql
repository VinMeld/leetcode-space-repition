-- Add FSRS (Free Spaced Repetition Scheduler) columns
-- This migration adds columns required for the FSRS algorithm
-- and deprecates the SM-2 specific columns (easiness_factor, repetitions)

-- Add FSRS columns with defaults
ALTER TABLE problems
    ADD COLUMN IF NOT EXISTS stability DECIMAL(8,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fsrs_difficulty DECIMAL(4,2) DEFAULT 5,
    ADD COLUMN IF NOT EXISTS fsrs_state INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reps INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lapses INTEGER DEFAULT 0;

-- Make SM-2 columns nullable for backwards compatibility
-- (existing rows keep their values, new rows get NULL)
ALTER TABLE problems
    ALTER COLUMN easiness_factor DROP NOT NULL,
    ALTER COLUMN repetitions DROP NOT NULL;

-- Set default values to NULL for new rows (FSRS doesn't use these)
ALTER TABLE problems
    ALTER COLUMN easiness_factor SET DEFAULT NULL,
    ALTER COLUMN repetitions SET DEFAULT NULL;

-- Initialize FSRS values from existing SM-2 data for existing rows
-- Convert easiness_factor to fsrs_difficulty: D = (2.5 - EF) / (2.5 - 1.3) * 9 + 1
-- Estimate stability from interval
UPDATE problems
SET
    stability = COALESCE(interval, 0) / -0.1 * LN(0.9),
    fsrs_difficulty = GREATEST(1, LEAST(10, (2.5 - COALESCE(easiness_factor, 2.5)) / 1.2 * 9 + 1)),
    fsrs_state = CASE WHEN COALESCE(repetitions, 0) > 0 THEN 2 ELSE 0 END,
    reps = COALESCE(repetitions, 0),
    lapses = 0
WHERE stability IS NULL OR stability = 0;

-- Create index on stability for efficient queries
CREATE INDEX IF NOT EXISTS idx_problems_stability ON problems(stability);
