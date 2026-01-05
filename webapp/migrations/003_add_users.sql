-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'google', 'github', 'local'
    provider_id VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(provider, provider_id)
);

-- Add user_id to problems
ALTER TABLE problems ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_problems_user_id ON problems(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
