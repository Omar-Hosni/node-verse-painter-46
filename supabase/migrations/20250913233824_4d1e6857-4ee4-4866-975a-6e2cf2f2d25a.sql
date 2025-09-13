-- Fix security issues first
ALTER FUNCTION get_user_id_by_email(text) SET search_path = public;

-- Update all projects from the old Supabase user ID to the new Clerk user ID
UPDATE projects 
SET user_id = 'user_32fHyvqwBfhbRFO0a8ASLMB7PoJ'
WHERE user_id = 'bd8abff8-5b3a-4821-8b3b-679796fb7287';

-- Update user_credits table to use the new Clerk user ID
UPDATE user_credits 
SET user_id = 'user_32fHyvqwBfhbRFO0a8ASLMB7PoJ'
WHERE email = 'omarhosny.barcelona@gmail.com' AND user_id = 'bd8abff8-5b3a-4821-8b3b-679796fb7287';