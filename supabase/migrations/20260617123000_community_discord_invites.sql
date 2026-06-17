alter table public.community_servers
add column if not exists invite_url text;

notify pgrst, 'reload schema';
