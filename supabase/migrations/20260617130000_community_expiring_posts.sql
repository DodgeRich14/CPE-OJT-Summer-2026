alter table public.community_posts
add column if not exists expires_at timestamptz not null default (now() + interval '7 days');

alter table public.community_post_comments
add column if not exists expires_at timestamptz not null default (now() + interval '7 days');

create index if not exists community_posts_expires_at_idx on public.community_posts(expires_at);
create index if not exists community_post_comments_expires_at_idx on public.community_post_comments(expires_at);

update public.community_posts
set expires_at = created_at + interval '7 days'
where expires_at is null;

update public.community_post_comments
set expires_at = created_at + interval '7 days'
where expires_at is null;

notify pgrst, 'reload schema';
