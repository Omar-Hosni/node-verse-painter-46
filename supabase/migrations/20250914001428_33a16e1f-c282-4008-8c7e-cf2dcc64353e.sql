-- Now change the column types and update user IDs
ALTER TABLE projects ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE user_credits ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE user_subscriptions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE payment_transactions ALTER COLUMN user_id TYPE TEXT;

-- Update the actual user_id values for omarhosny.barcelona@gmail.com
UPDATE projects 
SET user_id = 'user_32fHyvqwBfhbRFO0a8ASLMB7PoJ'
WHERE user_id = 'bd8abff8-5b3a-4821-8b3b-679796fb7287';

UPDATE user_credits 
SET user_id = 'user_32fHyvqwBfhbRFO0a8ASLMB7PoJ'
WHERE email = 'omarhosny.barcelona@gmail.com';

-- For now, disable RLS since we're using Clerk auth which handles security differently
-- The application-level code will ensure proper access control
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_shapes DISABLE ROW LEVEL SECURITY;