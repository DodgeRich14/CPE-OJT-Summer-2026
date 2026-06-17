drop policy if exists "community_servers_update_owner" on public.community_servers;
create policy "community_servers_update_owner"
on public.community_servers
for update
using ((public.has_active_subscription() or public.is_admin()) and auth.uid() = owner_id)
with check ((public.has_active_subscription() or public.is_admin()) and auth.uid() = owner_id);

drop policy if exists "community_channels_update_creator" on public.community_channels;
create policy "community_channels_update_creator"
on public.community_channels
for update
using ((public.has_active_subscription() or public.is_admin()) and auth.uid() = created_by)
with check ((public.has_active_subscription() or public.is_admin()) and auth.uid() = created_by);

drop policy if exists "community_posts_update_author" on public.community_posts;
create policy "community_posts_update_author"
on public.community_posts
for update
using ((public.has_active_subscription() or public.is_admin()) and auth.uid() = author_id)
with check ((public.has_active_subscription() or public.is_admin()) and auth.uid() = author_id);

drop policy if exists "community_comments_update_author" on public.community_post_comments;
create policy "community_comments_update_author"
on public.community_post_comments
for update
using ((public.has_active_subscription() or public.is_admin()) and auth.uid() = author_id)
with check ((public.has_active_subscription() or public.is_admin()) and auth.uid() = author_id);

notify pgrst, 'reload schema';
