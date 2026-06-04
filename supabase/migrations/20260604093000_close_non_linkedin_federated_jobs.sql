update public.jobs
set
  status = 'Closed',
  updated_at = now()
where source_type = 'federated'
  and status = 'Open'
  and source_platform <> 'LinkedIn';
