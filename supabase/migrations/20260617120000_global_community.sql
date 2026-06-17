create or replace function public.has_active_subscription(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions
    where subscriptions.user_id = has_active_subscription.user_id
      and subscriptions.status = 'active'
  );
$$;

create table if not exists public.community_servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  invite_url text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.community_servers
add column if not exists invite_url text;

create table if not exists public.community_server_members (
  server_id uuid not null references public.community_servers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (server_id, user_id)
);

create table if not exists public.community_channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.community_servers(id) on delete cascade,
  name text not null,
  topic text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_channel_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.community_channels(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null default 'SkillBridge User',
  author_role text not null default 'Applicant',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.community_servers(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null default 'SkillBridge User',
  author_role text not null default 'Applicant',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.community_post_reactions (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'heart' check (reaction in ('heart')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null default 'SkillBridge User',
  author_role text not null default 'Applicant',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists community_server_members_user_id_idx on public.community_server_members(user_id);
create index if not exists community_channels_server_id_idx on public.community_channels(server_id);
create index if not exists community_channel_messages_channel_id_created_at_idx on public.community_channel_messages(channel_id, created_at);
create index if not exists community_posts_server_id_created_at_idx on public.community_posts(server_id, created_at desc);
create index if not exists community_post_reactions_user_id_idx on public.community_post_reactions(user_id);
create index if not exists community_post_comments_post_id_created_at_idx on public.community_post_comments(post_id, created_at);

alter table public.community_servers enable row level security;
alter table public.community_server_members enable row level security;
alter table public.community_channels enable row level security;
alter table public.community_channel_messages enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_post_reactions enable row level security;
alter table public.community_post_comments enable row level security;

drop policy if exists "community_servers_select_subscribed" on public.community_servers;
create policy "community_servers_select_subscribed"
on public.community_servers
for select
using (public.has_active_subscription() or public.is_admin());

drop policy if exists "community_servers_insert_subscribed" on public.community_servers;
create policy "community_servers_insert_subscribed"
on public.community_servers
for insert
with check ((public.has_active_subscription() or public.is_admin()) and auth.uid() = owner_id);

drop policy if exists "community_server_members_select_subscribed" on public.community_server_members;
create policy "community_server_members_select_subscribed"
on public.community_server_members
for select
using (public.has_active_subscription() or public.is_admin());

drop policy if exists "community_server_members_insert_own_subscribed" on public.community_server_members;
create policy "community_server_members_insert_own_subscribed"
on public.community_server_members
for insert
with check ((public.has_active_subscription() or public.is_admin()) and auth.uid() = user_id);

drop policy if exists "community_channels_select_subscribed" on public.community_channels;
create policy "community_channels_select_subscribed"
on public.community_channels
for select
using (public.has_active_subscription() or public.is_admin());

drop policy if exists "community_channels_insert_subscribed" on public.community_channels;
create policy "community_channels_insert_subscribed"
on public.community_channels
for insert
with check ((public.has_active_subscription() or public.is_admin()) and auth.uid() = created_by);

drop policy if exists "community_messages_select_subscribed" on public.community_channel_messages;
create policy "community_messages_select_subscribed"
on public.community_channel_messages
for select
using (public.has_active_subscription() or public.is_admin());

drop policy if exists "community_messages_insert_subscribed" on public.community_channel_messages;
create policy "community_messages_insert_subscribed"
on public.community_channel_messages
for insert
with check ((public.has_active_subscription() or public.is_admin()) and auth.uid() = author_id);

drop policy if exists "community_posts_select_subscribed" on public.community_posts;
create policy "community_posts_select_subscribed"
on public.community_posts
for select
using (public.has_active_subscription() or public.is_admin());

drop policy if exists "community_posts_insert_subscribed" on public.community_posts;
create policy "community_posts_insert_subscribed"
on public.community_posts
for insert
with check ((public.has_active_subscription() or public.is_admin()) and auth.uid() = author_id);

drop policy if exists "community_reactions_select_subscribed" on public.community_post_reactions;
create policy "community_reactions_select_subscribed"
on public.community_post_reactions
for select
using (public.has_active_subscription() or public.is_admin());

drop policy if exists "community_reactions_insert_own_subscribed" on public.community_post_reactions;
create policy "community_reactions_insert_own_subscribed"
on public.community_post_reactions
for insert
with check ((public.has_active_subscription() or public.is_admin()) and auth.uid() = user_id);

drop policy if exists "community_reactions_delete_own_subscribed" on public.community_post_reactions;
create policy "community_reactions_delete_own_subscribed"
on public.community_post_reactions
for delete
using ((public.has_active_subscription() or public.is_admin()) and auth.uid() = user_id);

drop policy if exists "community_comments_select_subscribed" on public.community_post_comments;
create policy "community_comments_select_subscribed"
on public.community_post_comments
for select
using (public.has_active_subscription() or public.is_admin());

drop policy if exists "community_comments_insert_subscribed" on public.community_post_comments;
create policy "community_comments_insert_subscribed"
on public.community_post_comments
for insert
with check ((public.has_active_subscription() or public.is_admin()) and auth.uid() = author_id);

insert into public.community_servers (id, name, description, invite_url)
values
  ('11111111-1111-4111-8111-111111111111', 'Frontend Guild', 'React, UI reviews, portfolio polish, and interview prep.', 'https://discord.gg/frontend'),
  ('22222222-2222-4222-8222-222222222222', 'OJT Opportunities', 'Shared internships, OJT leads, referral notes, and application reminders.', 'https://discord.gg/ojt'),
  ('33333333-3333-4333-8333-333333333333', 'Career Wins', 'Celebrate accepted applications, certifications, callbacks, and shipped projects.', 'https://discord.gg/careerwins')
on conflict (id) do nothing;

insert into public.community_channels (id, server_id, name, topic)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'frontend-lounge', 'General frontend conversations and portfolio review swaps.'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 'code-review', 'Share snippets, repos, and UI questions for peer feedback.'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '22222222-2222-4222-8222-222222222222', 'openings', 'Post active internships, OJT listings, and referral leads.'),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '33333333-3333-4333-8333-333333333333', 'wins', 'Share progress, callbacks, offers, and course completions.')
on conflict (id) do nothing;

insert into public.community_posts (id, server_id, author_name, author_role, body)
values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', '11111111-1111-4111-8111-111111111111', 'Lena Torres', 'Mentor', 'Portfolio tip: lead each project with the problem you solved before listing the tech stack.'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', '22222222-2222-4222-8222-222222222222', 'Marco Santos', 'Student', 'I made a tracker template for applications and interview dates. Happy to share the format here.'),
  ('ffffffff-ffff-4fff-8fff-fffffffffff1', '33333333-3333-4333-8333-333333333333', 'Nina Cruz', 'Applicant', 'Small win: got shortlisted after revising my resume summary from the profile feedback.')
on conflict (id) do nothing;

notify pgrst, 'reload schema';
