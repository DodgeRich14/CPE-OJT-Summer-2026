update public.jobs
set
  status = 'Open',
  updated_at = now()
where source_type = 'federated'
  and status = 'Closed'
  and review_status = 'Approved'
  and coalesce(application_url, source_url) is not null
  and (expires_at is null or expires_at >= now())
  and title not ilike '%view similar jobs%'
  and description not ilike '%view similar jobs with this employer%';
