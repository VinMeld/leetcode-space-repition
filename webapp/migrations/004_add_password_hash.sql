-- Add password_hash to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
