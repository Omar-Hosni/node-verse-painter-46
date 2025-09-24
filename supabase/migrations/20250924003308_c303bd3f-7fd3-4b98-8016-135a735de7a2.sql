-- REVERT SECURITY CHANGES: Disable RLS and remove all policies
-- This reverts all the security fixes applied earlier

-- Disable RLS on all tables
ALTER TABLE public.user_credits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;  
ALTER TABLE public.payment_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_shapes DISABLE ROW LEVEL SECURITY;

-- Drop all RLS policies that were created
DROP POLICY IF EXISTS "Users can view their own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;
DROP POLICY IF EXISTS "System can insert user credits" ON public.user_credits;

DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "System can update payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "System can insert payment transactions" ON public.payment_transactions;

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "System can insert user subscriptions" ON public.user_subscriptions;

DROP POLICY IF EXISTS "Users can view shapes from their projects" ON public.canvas_shapes;
DROP POLICY IF EXISTS "Users can update shapes in their projects" ON public.canvas_shapes;
DROP POLICY IF EXISTS "Users can delete shapes from their projects" ON public.canvas_shapes;
DROP POLICY IF EXISTS "Users can insert shapes to their projects" ON public.canvas_shapes;