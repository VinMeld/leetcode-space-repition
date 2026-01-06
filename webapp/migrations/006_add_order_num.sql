-- Add order_num column to problems for per-user sequential ordering
-- This allows users to reference problems by a simple number instead of global ID

-- Add the order_num column
ALTER TABLE problems ADD COLUMN IF NOT EXISTS order_num INTEGER;

-- Populate existing problems with sequential order numbers per user (based on created_at)
WITH numbered AS (
    SELECT id, user_id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
    FROM problems
)
UPDATE problems
SET order_num = numbered.rn
FROM numbered
WHERE problems.id = numbered.id;

-- Make order_num NOT NULL after populating existing rows
ALTER TABLE problems ALTER COLUMN order_num SET NOT NULL;

-- Add unique constraint per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_problems_user_order_num ON problems(user_id, order_num);
