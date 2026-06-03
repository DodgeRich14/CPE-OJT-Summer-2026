alter table public.jobs
drop constraint if exists jobs_source_type_check;

alter table public.jobs
add constraint jobs_source_type_check
check (source_type in ('manual', 'employer_posted', 'scraped', 'imported', 'federated'));

update public.jobs
set
  source_type = 'federated',
  updated_at = now()
where source_type in ('scraped', 'imported')
  and source_platform <> 'Manual';

update public.jobs
set
  status = 'Closed',
  updated_at = now()
where source_type = 'federated'
  and (
    title ilike '%view similar jobs with this employer%'
    or title ilike '%view similar jobs%'
    or description ilike '%view similar jobs with this employer%'
  );

update public.jobs
set
  status = 'Closed',
  updated_at = now()
where source_type = 'federated'
  and status = 'Open'
  and expires_at is not null
  and expires_at < now();
