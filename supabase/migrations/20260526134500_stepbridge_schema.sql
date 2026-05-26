create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'Applicant' check (role in ('Applicant', 'Employer', 'Admin')),
  status text not null default 'Active' check (status in ('Active', 'Pending', 'Suspended')),
  full_name text not null default '',
  username text,
  email text not null unique,
  first_name text,
  last_name text,
  avatar_url text,
  job_title text,
  location text,
  portfolio_url text,
  linkedin_url text,
  about text,
  resume_url text,
  resume_metadata jsonb not null default '{}'::jsonb,
  skills text[] not null default '{}'::text[],
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'Admin', false);
$$;

create table if not exists public.employers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  company_name text not null,
  company_email text,
  industry text,
  company_size text,
  website_url text,
  location text,
  description text,
  verification_status text not null default 'Pending' check (verification_status in ('Pending', 'Approved', 'Rejected')),
  approval_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mentors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  job_title text,
  company text,
  specialty text,
  bio text,
  rating numeric(3,2) default 0,
  student_count integer not null default 0,
  verification_status text not null default 'Pending' check (verification_status in ('Pending', 'Verified', 'Rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  tag text,
  label text,
  title text not null,
  body text not null,
  link_label text,
  link_target text,
  target_page text,
  target_category text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid references public.employers(id) on delete set null,
  posted_by_profile_id uuid references public.profiles(id) on delete set null,
  title text not null,
  company_name text not null,
  category text not null default 'Job' check (category in ('Job', 'Internship', 'Volunteer')),
  location text,
  work_type text,
  salary_min integer,
  salary_max integer,
  salary_currency text not null default 'PHP',
  salary_interval text not null default 'monthly' check (salary_interval in ('hourly', 'daily', 'weekly', 'monthly', 'yearly', 'fixed')),
  description text not null default '',
  responsibilities text[] not null default '{}'::text[],
  required_skills text[] not null default '{}'::text[],
  nice_to_have_skills text[] not null default '{}'::text[],
  benefits text[] not null default '{}'::text[],
  application_url text,
  status text not null default 'Open' check (status in ('Open', 'Closed', 'Draft', 'Archived')),
  review_status text not null default 'Approved' check (review_status in ('Pending', 'Approved', 'Rejected')),
  source_platform text not null default 'Manual',
  source_type text not null default 'manual' check (source_type in ('manual', 'employer_posted', 'scraped', 'imported')),
  source_url text,
  source_job_id text,
  normalized_hash text,
  raw_payload jsonb not null default '{}'::jsonb,
  posted_at timestamptz not null default now(),
  scraped_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_source_platform_source_job_id_key unique (source_platform, source_job_id)
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'Applied' check (status in ('Applied', 'Reviewed', 'Shortlisted', 'Interview', 'Offer', 'Rejected', 'Withdrawn')),
  match_score integer not null default 0 check (match_score between 0 and 100),
  matched_skills text[] not null default '{}'::text[],
  skill_gaps text[] not null default '{}'::text[],
  cover_message text,
  status_timeline jsonb not null default '[]'::jsonb,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_job_id_applicant_id_key unique (job_id, applicant_id)
);

create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_jobs_applicant_id_job_id_key unique (applicant_id, job_id)
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid references public.mentors(id) on delete set null,
  title text not null,
  description text not null default '',
  difficulty text,
  duration_weeks integer,
  price numeric(10,2),
  skills_taught text[] not null default '{}'::text[],
  delivery_mode text,
  status text not null default 'Draft' check (status in ('Draft', 'Review', 'Published', 'Archived')),
  start_date date,
  seats_total integer,
  seats_remaining integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  status text not null default 'In Progress' check (status in ('In Progress', 'Completed', 'Dropped')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_enrollments_course_id_applicant_id_key unique (course_id, applicant_id)
);

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  provider text not null,
  track text,
  price_label text,
  description text not null default '',
  skills text[] not null default '{}'::text[],
  practice_url text,
  official_url text,
  relevance_score integer check (relevance_score between 0 and 100),
  approval_status text not null default 'Approved' check (approval_status in ('Pending', 'Approved', 'Rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certification_progress (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references public.certifications(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  readiness_percent integer not null default 0 check (readiness_percent between 0 and 100),
  status text not null default 'Preparing' check (status in ('Preparing', 'Ready', 'Completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certification_progress_certification_id_applicant_id_key unique (certification_id, applicant_id)
);

create table if not exists public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references public.profiles(id) on delete cascade,
  phase_label text not null,
  title text not null,
  summary text,
  skills text[] not null default '{}'::text[],
  actions text[] not null default '{}'::text[],
  sort_order integer not null default 0,
  status text not null default 'Planned' check (status in ('Planned', 'Active', 'Complete')),
  target_month text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.volunteer_activities (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  organization_name text not null,
  role_title text not null,
  status text not null default 'Active' check (status in ('Active', 'Inactive', 'Completed')),
  started_at date,
  ended_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  source_platform text not null,
  keywords text[] not null default '{}'::text[],
  location text,
  status text not null default 'Queued' check (status in ('Queued', 'Running', 'Completed', 'Failed')),
  jobs_found integer not null default 0,
  jobs_inserted integer not null default 0,
  jobs_updated integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  requested_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action_type text not null,
  target_table text not null,
  target_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists jobs_status_review_posted_idx on public.jobs (status, review_status, posted_at desc);
create index if not exists jobs_company_name_idx on public.jobs (company_name);
create index if not exists jobs_source_url_idx on public.jobs (source_url);
create index if not exists jobs_normalized_hash_idx on public.jobs (normalized_hash);
create index if not exists jobs_required_skills_gin_idx on public.jobs using gin (required_skills);
create index if not exists profiles_skills_gin_idx on public.profiles using gin (skills);
create index if not exists applications_applicant_status_idx on public.applications (applicant_id, status);
create index if not exists scrape_runs_status_started_at_idx on public.scrape_runs (status, started_at desc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_employers_updated_at on public.employers;
create trigger set_employers_updated_at
before update on public.employers
for each row
execute function public.set_updated_at();

drop trigger if exists set_mentors_updated_at on public.mentors;
create trigger set_mentors_updated_at
before update on public.mentors
for each row
execute function public.set_updated_at();

drop trigger if exists set_announcements_updated_at on public.announcements;
create trigger set_announcements_updated_at
before update on public.announcements
for each row
execute function public.set_updated_at();

drop trigger if exists set_jobs_updated_at on public.jobs;
create trigger set_jobs_updated_at
before update on public.jobs
for each row
execute function public.set_updated_at();

drop trigger if exists set_applications_updated_at on public.applications;
create trigger set_applications_updated_at
before update on public.applications
for each row
execute function public.set_updated_at();

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
before update on public.courses
for each row
execute function public.set_updated_at();

drop trigger if exists set_course_enrollments_updated_at on public.course_enrollments;
create trigger set_course_enrollments_updated_at
before update on public.course_enrollments
for each row
execute function public.set_updated_at();

drop trigger if exists set_certifications_updated_at on public.certifications;
create trigger set_certifications_updated_at
before update on public.certifications
for each row
execute function public.set_updated_at();

drop trigger if exists set_certification_progress_updated_at on public.certification_progress;
create trigger set_certification_progress_updated_at
before update on public.certification_progress
for each row
execute function public.set_updated_at();

drop trigger if exists set_roadmap_items_updated_at on public.roadmap_items;
create trigger set_roadmap_items_updated_at
before update on public.roadmap_items
for each row
execute function public.set_updated_at();

drop trigger if exists set_volunteer_activities_updated_at on public.volunteer_activities;
create trigger set_volunteer_activities_updated_at
before update on public.volunteer_activities
for each row
execute function public.set_updated_at();

drop trigger if exists set_scrape_runs_updated_at on public.scrape_runs;
create trigger set_scrape_runs_updated_at
before update on public.scrape_runs
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'Applicant');

  insert into public.profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    username,
    role
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    case
      when coalesce(new.raw_user_meta_data ->> 'full_name', '') <> '' then
        '@' || regexp_replace(lower(new.raw_user_meta_data ->> 'full_name'), '\s+', '.', 'g')
      else
        '@' || regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '\s+', '.', 'g')
    end,
    case
      when requested_role in ('Applicant', 'Employer', 'Admin') then requested_role
      else 'Applicant'
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    username = excluded.username,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.employers enable row level security;
alter table public.mentors enable row level security;
alter table public.announcements enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.courses enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.certifications enable row level security;
alter table public.certification_progress enable row level security;
alter table public.roadmap_items enable row level security;
alter table public.volunteer_activities enable row level security;
alter table public.scrape_runs enable row level security;
alter table public.admin_actions enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.is_admin());

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id or public.is_admin());

create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

create policy "employers_select_own_or_admin"
on public.employers
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "employers_insert_own_or_admin"
on public.employers
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

create policy "employers_update_own_or_admin"
on public.employers
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "mentors_select_public_verified_or_admin"
on public.mentors
for select
using (verification_status = 'Verified' or public.is_admin() or user_id = auth.uid());

create policy "mentors_manage_self_or_admin"
on public.mentors
for all
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "announcements_select_active"
on public.announcements
for select
using (is_active = true or public.is_admin());

create policy "announcements_manage_admin"
on public.announcements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "jobs_select_public_feed"
on public.jobs
for select
using (review_status = 'Approved' and status = 'Open');

create policy "jobs_select_owner_or_admin"
on public.jobs
for select
to authenticated
using (
  public.is_admin()
  or posted_by_profile_id = auth.uid()
  or exists (
    select 1
    from public.employers e
    where e.id = employer_id
      and e.user_id = auth.uid()
  )
  or (review_status = 'Approved' and status = 'Open')
);

create policy "jobs_insert_owner_or_admin"
on public.jobs
for insert
to authenticated
with check (
  public.is_admin()
  or posted_by_profile_id = auth.uid()
  or exists (
    select 1
    from public.employers e
    where e.id = employer_id
      and e.user_id = auth.uid()
  )
);

create policy "jobs_update_owner_or_admin"
on public.jobs
for update
to authenticated
using (
  public.is_admin()
  or posted_by_profile_id = auth.uid()
  or exists (
    select 1
    from public.employers e
    where e.id = employer_id
      and e.user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or posted_by_profile_id = auth.uid()
  or exists (
    select 1
    from public.employers e
    where e.id = employer_id
      and e.user_id = auth.uid()
  )
);

create policy "applications_select_related_users"
on public.applications
for select
to authenticated
using (
  applicant_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.jobs j
    join public.employers e on e.id = j.employer_id
    where j.id = job_id
      and e.user_id = auth.uid()
  )
);

create policy "applications_insert_own"
on public.applications
for insert
to authenticated
with check (applicant_id = auth.uid() or public.is_admin());

create policy "applications_update_related_users"
on public.applications
for update
to authenticated
using (
  applicant_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.jobs j
    join public.employers e on e.id = j.employer_id
    where j.id = job_id
      and e.user_id = auth.uid()
  )
)
with check (
  applicant_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.jobs j
    join public.employers e on e.id = j.employer_id
    where j.id = job_id
      and e.user_id = auth.uid()
  )
);

create policy "saved_jobs_manage_own"
on public.saved_jobs
for all
to authenticated
using (applicant_id = auth.uid() or public.is_admin())
with check (applicant_id = auth.uid() or public.is_admin());

create policy "courses_select_published_or_admin"
on public.courses
for select
using (status = 'Published' or public.is_admin());

create policy "courses_manage_admin_or_mentor_owner"
on public.courses
for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.mentors m
    where m.id = mentor_id
      and m.user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.mentors m
    where m.id = mentor_id
      and m.user_id = auth.uid()
  )
);

create policy "course_enrollments_manage_related_users"
on public.course_enrollments
for all
to authenticated
using (
  applicant_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.courses c
    join public.mentors m on m.id = c.mentor_id
    where c.id = course_id
      and m.user_id = auth.uid()
  )
)
with check (
  applicant_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.courses c
    join public.mentors m on m.id = c.mentor_id
    where c.id = course_id
      and m.user_id = auth.uid()
  )
);

create policy "certifications_select_approved_or_admin"
on public.certifications
for select
using (approval_status = 'Approved' or public.is_admin());

create policy "certifications_manage_admin"
on public.certifications
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "certification_progress_manage_own_or_admin"
on public.certification_progress
for all
to authenticated
using (applicant_id = auth.uid() or public.is_admin())
with check (applicant_id = auth.uid() or public.is_admin());

create policy "roadmap_items_manage_own_or_admin"
on public.roadmap_items
for all
to authenticated
using (applicant_id = auth.uid() or public.is_admin())
with check (applicant_id = auth.uid() or public.is_admin());

create policy "volunteer_activities_manage_own_or_admin"
on public.volunteer_activities
for all
to authenticated
using (applicant_id = auth.uid() or public.is_admin())
with check (applicant_id = auth.uid() or public.is_admin());

create policy "scrape_runs_manage_admin"
on public.scrape_runs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_actions_manage_admin"
on public.admin_actions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
