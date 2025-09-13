-- Enable RLS on canvas_shapes table (fixing security warning)
ALTER TABLE canvas_shapes ENABLE ROW LEVEL SECURITY;

-- Create policies for canvas_shapes
CREATE POLICY "Users can manage their own canvas shapes"
ON canvas_shapes
FOR ALL
USING (project_id IN (
    SELECT id::text FROM projects WHERE user_id = auth.uid()
));

-- Since we're using Clerk auth, we need to modify our approach
-- Create a function to get the user ID from the user_credits table using email
-- This will help bridge Clerk auth with our database

CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT user_id FROM user_credits WHERE email = user_email LIMIT 1;
$$;