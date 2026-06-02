create table if not exists public.certificate_submissions (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  provider text not null,
  issue_date_label text,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  proof_file_name text,
  proof_image_data_url text,
  uploaded_by_name text,
  uploaded_by_email text,
  uploaded_by_role text,
  uploaded_by_title text,
  uploaded_by_location text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_certificate_submissions_updated_at on public.certificate_submissions;
create trigger set_certificate_submissions_updated_at
before update on public.certificate_submissions
for each row
execute function public.set_updated_at();

alter table public.certificate_submissions enable row level security;

create policy "certificate_submissions_select_own_or_admin"
on public.certificate_submissions
for select
to authenticated
using (applicant_id = auth.uid() or public.is_admin());

create policy "certificate_submissions_insert_own_or_admin"
on public.certificate_submissions
for insert
to authenticated
with check (applicant_id = auth.uid() or public.is_admin());

create policy "certificate_submissions_update_admin"
on public.certificate_submissions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
