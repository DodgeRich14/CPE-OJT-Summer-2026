drop policy if exists "community_messages_update_author" on public.community_channel_messages;
create policy "community_messages_update_author"
on public.community_channel_messages
for update
using ((public.has_active_subscription() or public.is_admin()) and auth.uid() = author_id)
with check ((public.has_active_subscription() or public.is_admin()) and auth.uid() = author_id);

drop policy if exists "community_messages_delete_author" on public.community_channel_messages;
create policy "community_messages_delete_author"
on public.community_channel_messages
for delete
using ((public.has_active_subscription() or public.is_admin()) and auth.uid() = author_id);

notify pgrst, 'reload schema';
