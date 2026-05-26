alter table public.profiles
add column if not exists resume_text text,
add column if not exists ai_profile jsonb not null default '{}'::jsonb,
add column if not exists last_resume_parsed_at timestamptz;

create table if not exists public.job_recommendations (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references public.profiles(id) on delete cascade,
  applicant_email text,
  job_id uuid not null references public.jobs(id) on delete cascade,
  match_score integer not null default 0 check (match_score between 0 and 100),
  matched_skills text[] not null default '{}'::text[],
  skill_gaps text[] not null default '{}'::text[],
  reason text not null default '',
  source_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_recommendations_applicant_email_job_id_key unique (applicant_email, job_id)
);

create index if not exists job_recommendations_applicant_email_idx on public.job_recommendations (applicant_email, created_at desc);

drop trigger if exists set_job_recommendations_updated_at on public.job_recommendations;
create trigger set_job_recommendations_updated_at
before update on public.job_recommendations
for each row
execute function public.set_updated_at();

alter table public.job_recommendations enable row level security;

create policy "job_recommendations_select_own_or_admin"
on public.job_recommendations
for select
to authenticated
using (applicant_id = auth.uid() or public.is_admin());

create policy "job_recommendations_manage_admin"
on public.job_recommendations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
