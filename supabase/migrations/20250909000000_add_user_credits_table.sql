-- Create user_credits table
create table if not exists user_credits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  credits integer not null default 50,
  last_updated timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  unique(user_id)
);

-- Add indexes
create index if not exists user_credits_user_id_idx on user_credits (user_id);

-- Enable RLS
alter table user_credits enable row level security;

-- Create policies
create policy "Users can view their own credits"
  on user_credits for select
  using (auth.uid() = user_id);

create policy "Users can update their own credits"
  on user_credits for update
  using (auth.uid() = user_id);

create policy "Users can insert their own credits"
  on user_credits for insert
  with check (auth.uid() = user_id);

-- Grant permissions
grant usage on schema public to authenticated;
grant all on table user_credits to authenticated;