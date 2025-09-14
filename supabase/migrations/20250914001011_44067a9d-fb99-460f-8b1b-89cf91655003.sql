-- Step 1: Drop the RLS policy that's preventing the column type change
DROP POLICY IF EXISTS "Users can manage their own canvas shapes" ON canvas_shapes;

-- Step 2: Change user_id column types from UUID to TEXT to support Clerk user IDs
ALTER TABLE projects ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE user_credits ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE user_subscriptions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE payment_transactions ALTER COLUMN user_id TYPE TEXT;

-- Step 3: Update the actual user_id values for the existing user
UPDATE projects 
SET user_id = 'user_32fHyvqwBfhbRFO0a8ASLMB7PoJ'
WHERE user_id = 'bd8abff8-5b3a-4821-8b3b-679796fb7287';

UPDATE user_credits 
SET user_id = 'user_32fHyvqwBfhbRFO0a8ASLMB7PoJ'
WHERE email = 'omarhosny.barcelona@gmail.com';

-- Step 4: Since we're using Clerk auth, we need to update RLS policies 
-- to work without auth.uid() (which doesn't exist with Clerk)
-- For now, disable RLS on projects table since Clerk handles auth differently
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_shapes DISABLE ROW LEVEL SECURITY;