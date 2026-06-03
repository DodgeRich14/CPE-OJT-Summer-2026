create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'Applicant Premium',
  status text not null default 'free' check (status in ('free', 'active', 'expired', 'cancelled', 'past_due')),
  started_at timestamptz default now(),
  renewal_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscriptions_renewal_date_idx on public.subscriptions(renewal_date);

alter table public.subscriptions enable row level security;

drop policy if exists "Users can view their own subscription" on public.subscriptions;
create policy "Users can view their own subscription"
on public.subscriptions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own subscription" on public.subscriptions;
create policy "Users can insert their own subscription"
on public.subscriptions
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own subscription" on public.subscriptions;
create policy "Users can update their own subscription"
on public.subscriptions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
