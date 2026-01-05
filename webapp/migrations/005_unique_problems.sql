-- Add unique constraint to prevent duplicate problems for the same user
ALTER TABLE problems ADD CONSTRAINT unique_user_problem_url UNIQUE (user_id, leetcode_url);
