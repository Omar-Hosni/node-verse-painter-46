-- Migration to update user IDs from Supabase auth to Clerk auth for omarhosny.barcelona@gmail.com

-- First, let's see what the current Clerk user ID should be
-- We'll update the projects table to use the new Clerk user ID for the specific email

-- Update projects table for the user (using the Supabase user ID we found)
UPDATE projects 
SET user_id = (
    SELECT user_id 
    FROM user_credits 
    WHERE email = 'omarhosny.barcelona@gmail.com'
)
WHERE user_id = 'bd8abff8-5b3a-4821-8b3b-679796fb7287';

-- The user_credits table already has the correct mapping, so we don't need to update it
-- The RLS policies will now work correctly with the Clerk user ID