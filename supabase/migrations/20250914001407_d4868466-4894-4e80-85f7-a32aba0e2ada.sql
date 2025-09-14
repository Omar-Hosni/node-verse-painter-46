-- Drop ALL RLS policies that depend on user_id columns before changing column types

-- Drop policies on projects table
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Drop policies on user_credits table
DROP POLICY IF EXISTS "Users can view their own credits" ON user_credits;
DROP POLICY IF EXISTS "Insert credits for authenticated users" ON user_credits;
DROP POLICY IF EXISTS "Users can update their own credits" ON user_credits;

-- Drop policies on user_subscriptions table
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Service can manage subscriptions" ON user_subscriptions;

-- Drop policies on payment_transactions table
DROP POLICY IF EXISTS "Users can view their own transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Service can manage transactions" ON payment_transactions;

-- Drop policies on canvas_shapes table
DROP POLICY IF EXISTS "Users can manage their own canvas shapes" ON canvas_shapes;