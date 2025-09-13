-- Change user_id column types from UUID to TEXT to support Clerk user IDs

-- Update projects table
ALTER TABLE projects 
ALTER COLUMN user_id TYPE TEXT;

-- Update user_credits table  
ALTER TABLE user_credits 
ALTER COLUMN user_id TYPE TEXT;

-- Update user_subscriptions table
ALTER TABLE user_subscriptions 
ALTER COLUMN user_id TYPE TEXT;

-- Update payment_transactions table
ALTER TABLE payment_transactions 
ALTER COLUMN user_id TYPE TEXT;

-- Now update the actual user_id values
UPDATE projects 
SET user_id = 'user_32fHyvqwBfhbRFO0a8ASLMB7PoJ'
WHERE user_id = 'bd8abff8-5b3a-4821-8b3b-679796fb7287';

UPDATE user_credits 
SET user_id = 'user_32fHyvqwBfhbRFO0a8ASLMB7PoJ'
WHERE email = 'omarhosny.barcelona@gmail.com';