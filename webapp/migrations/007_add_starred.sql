-- Add is_starred column to problems table
ALTER TABLE problems ADD COLUMN is_starred BOOLEAN NOT NULL DEFAULT FALSE;
