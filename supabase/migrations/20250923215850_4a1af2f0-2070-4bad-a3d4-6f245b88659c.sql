-- CRITICAL SECURITY FIX: Enable Row Level Security on all tables
-- This prevents unauthorized access to user data

-- Enable RLS on all public tables
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_shapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_credits table
CREATE POLICY "Users can view their own credits" 
ON public.user_credits 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own credits" 
ON public.user_credits 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "System can insert user credits" 
ON public.user_credits 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

-- Create RLS policies for user_subscriptions table
CREATE POLICY "Users can view their own subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own subscriptions" 
ON public.user_subscriptions 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "System can insert user subscriptions" 
ON public.user_subscriptions 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

-- Create RLS policies for payment_transactions table
CREATE POLICY "Users can view their own transactions" 
ON public.payment_transactions 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "System can insert payment transactions" 
ON public.payment_transactions 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "System can update payment transactions" 
ON public.payment_transactions 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid()::text);

-- Create RLS policies for canvas_shapes table
CREATE POLICY "Users can view shapes from their projects" 
ON public.canvas_shapes 
FOR SELECT 
TO authenticated
USING (
  project_id IN (
    SELECT id::text FROM public.projects WHERE user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can insert shapes to their projects" 
ON public.canvas_shapes 
FOR INSERT 
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT id::text FROM public.projects WHERE user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can update shapes in their projects" 
ON public.canvas_shapes 
FOR UPDATE 
TO authenticated
USING (
  project_id IN (
    SELECT id::text FROM public.projects WHERE user_id = auth.uid()::text
  )
);

CREATE POLICY "Users can delete shapes from their projects" 
ON public.canvas_shapes 
FOR DELETE 
TO authenticated
USING (
  project_id IN (
    SELECT id::text FROM public.projects WHERE user_id = auth.uid()::text
  )
);

-- Create RLS policies for projects table
CREATE POLICY "Users can view their own projects" 
ON public.projects 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create their own projects" 
ON public.projects 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own projects" 
ON public.projects 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own projects" 
ON public.projects 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid()::text);

-- Drop existing function and recreate with correct return type
DROP FUNCTION IF EXISTS public.get_user_id_by_email(text);

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT user_id FROM user_credits WHERE email = user_email LIMIT 1;
$function$;