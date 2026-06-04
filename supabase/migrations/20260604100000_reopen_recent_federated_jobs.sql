update public.jobs
set
  status = 'Open',
  updated_at = now()
where source_type = 'federated'
  and status = 'Closed'
  and review_status = 'Approved'
  and source_platform <> 'LinkedIn'
  and (expires_at is null or expires_at >= now())
  and coalesce(application_url, source_url) is not null
  and coalesce(scraped_at, posted_at) >= now() - interval '30 days'
  and title not ilike '%view similar jobs%'
  and description not ilike '%view similar jobs with this employer%';
