create table if not exists public.community_comment_reactions (
  comment_id uuid not null references public.community_post_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'heart' check (reaction in ('heart')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists community_comment_reactions_user_id_idx on public.community_comment_reactions(user_id);

alter table public.community_comment_reactions enable row level security;

drop policy if exists "community_comment_reactions_select_subscribed" on public.community_comment_reactions;
create policy "community_comment_reactions_select_subscribed"
on public.community_comment_reactions
for select
using (public.has_active_subscription() or public.is_admin());

drop policy if exists "community_comment_reactions_insert_own_subscribed" on public.community_comment_reactions;
create policy "community_comment_reactions_insert_own_subscribed"
on public.community_comment_reactions
for insert
with check ((public.has_active_subscription() or public.is_admin()) and auth.uid() = user_id);

drop policy if exists "community_comment_reactions_delete_own_subscribed" on public.community_comment_reactions;
create policy "community_comment_reactions_delete_own_subscribed"
on public.community_comment_reactions
for delete
using ((public.has_active_subscription() or public.is_admin()) and auth.uid() = user_id);

notify pgrst, 'reload schema';
