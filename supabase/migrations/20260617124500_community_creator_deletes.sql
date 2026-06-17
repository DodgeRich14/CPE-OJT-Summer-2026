drop policy if exists "community_servers_delete_owner" on public.community_servers;
create policy "community_servers_delete_owner"
on public.community_servers
for delete
using ((public.has_active_subscription() or public.is_admin()) and auth.uid() = owner_id);

drop policy if exists "community_channels_delete_creator" on public.community_channels;
create policy "community_channels_delete_creator"
on public.community_channels
for delete
using ((public.has_active_subscription() or public.is_admin()) and auth.uid() = created_by);

drop policy if exists "community_posts_delete_author" on public.community_posts;
create policy "community_posts_delete_author"
on public.community_posts
for delete
using ((public.has_active_subscription() or public.is_admin()) and auth.uid() = author_id);

drop policy if exists "community_comments_delete_author" on public.community_post_comments;
create policy "community_comments_delete_author"
on public.community_post_comments
for delete
using ((public.has_active_subscription() or public.is_admin()) and auth.uid() = author_id);

notify pgrst, 'reload schema';
