create or replace function public.activate_my_subscription()
returns table (
  status text,
  plan text,
  renewal_date timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'You must be signed in to activate a subscription.';
  end if;

  update public.subscriptions
  set
    status = 'active',
    plan = 'Applicant Premium',
    started_at = now(),
    renewal_date = now() + interval '30 days',
    updated_at = now()
  where user_id = current_user_id;

  if not found then
    insert into public.subscriptions (user_id, status, plan, started_at, renewal_date, updated_at)
    values (
      current_user_id,
      'active',
      'Applicant Premium',
      now(),
      now() + interval '30 days',
      now()
    );
  end if;

  return query
  select subscriptions.status, subscriptions.plan, subscriptions.renewal_date
  from public.subscriptions
  where subscriptions.user_id = current_user_id
  order by subscriptions.renewal_date desc nulls last
  limit 1;
end;
$$;

revoke all on function public.activate_my_subscription() from public;
grant execute on function public.activate_my_subscription() to authenticated;
