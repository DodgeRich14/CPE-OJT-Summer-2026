with traced_links as (
  select
    id,
    nullif(coalesce(
      raw_payload->>'application_url',
      raw_payload->>'apply_url',
      raw_payload->>'applyUrl',
      raw_payload->>'apply_link',
      raw_payload->>'applyLink',
      raw_payload->>'job_apply_link',
      raw_payload->>'job_google_link',
      raw_payload->>'job_link',
      raw_payload->'apply_links'->0->>'link',
      raw_payload->'apply_links'->0->>'apply_link',
      raw_payload->'apply_links'->0->>'url',
      raw_payload->'apply_options'->0->>'link',
      raw_payload->'apply_options'->0->>'apply_link',
      raw_payload->'apply_options'->0->>'url'
    ), '') as traced_application_url,
    nullif(coalesce(
      raw_payload->>'source_url',
      raw_payload->>'sourceUrl',
      raw_payload->>'source_link',
      raw_payload->>'sourceLink',
      raw_payload->>'sharing_link',
      raw_payload->>'share_link',
      raw_payload->>'link',
      case
        when lower(source_platform) like '%linkedin%' and source_job_id ~ '^[0-9]+$'
          then 'https://www.linkedin.com/jobs/view/' || source_job_id || '/'
        when lower(source_platform) like '%jobstreet%' and nullif(source_job_id, '') is not null
          then 'https://www.jobstreet.com.ph/job/' || source_job_id
        when lower(source_platform) like '%indeed%' and source_job_id ~ '^[A-Za-z0-9]+$'
          then 'https://www.indeed.com/viewjob?jk=' || source_job_id
        when lower(source_platform) like '%ziprecruiter%' and source_job_id ~ '^[A-Za-z0-9-]+$'
          then 'https://www.ziprecruiter.com/jobs/' || source_job_id
        else null
      end
    ), '') as traced_source_url
  from public.jobs
  where coalesce(application_url, source_url) is null
)
update public.jobs as jobs
set
  application_url = coalesce(jobs.application_url, traced_links.traced_application_url, traced_links.traced_source_url),
  source_url = coalesce(jobs.source_url, traced_links.traced_source_url, traced_links.traced_application_url),
  updated_at = now()
from traced_links
where jobs.id = traced_links.id
  and coalesce(traced_links.traced_application_url, traced_links.traced_source_url) is not null;
