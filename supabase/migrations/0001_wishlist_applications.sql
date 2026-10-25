-- ============================================================================
-- RedfoxGPU — wishlist applications
-- Migration 0001
--
-- Run this in the Supabase SQL editor (or with `supabase db push`) before
-- starting the application. The endpoint inserts with the service-role key,
-- which bypasses RLS; every other role is denied access by design.
--
-- This file is idempotent and also upgrades tables created by earlier
-- revisions: obsolete columns are removed and new columns are added before
-- the CHECK constraints are rebuilt.
-- ============================================================================

-- gen_random_uuid() is available on PostgreSQL 13+; pgcrypto is included for
-- older Supabase projects.
create extension if not exists pgcrypto;

create table if not exists public.wishlist_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  user_type text not null,
  user_type_other text,
  gpu_workloads text[] not null default '{}',
  gpu_workload_other text,
  vram_requirement text not null,
  vram_requirement_other text,
  usage_frequency text not null,
  usage_frequency_other text,
  used_gpu_cloud boolean not null,
  providers_used text[] not null default '{}',
  providers_other text,
  previous_service_problems text[] not null default '{}',
  previous_service_problems_other text,
  adoption_barriers text[] not null default '{}',
  adoption_barriers_other text,
  current_compute_solution text not null,
  current_compute_solution_other text,
  etb_payment_preference text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade path from an earlier revision. The two removed survey questions are
-- no longer collected, and the memory / frequency questions gained a required
-- free-text option for "Custom" and "Other".
alter table public.wishlist_applications
  add column if not exists vram_requirement_other text,
  add column if not exists usage_frequency_other text,
  drop column if exists monthly_compute_budget,
  drop column if exists early_access_intent;

comment on table public.wishlist_applications is
  'Completed RedfoxGPU wishlist applications. One row per email address; duplicate registrations are rejected.';
comment on column public.wishlist_applications.gpu_workloads is
  'Array of workload enum values. The survey allows multiple workloads per application.';
comment on column public.wishlist_applications.providers_used is
  'Only populated when used_gpu_cloud is true.';
comment on column public.wishlist_applications.adoption_barriers is
  'Only populated when used_gpu_cloud is false.';

-- ----------------------------------------------------------------------------
-- Value constraints (kept in sync with lib/survey/questions.ts — a unit test
-- asserts that these lists match the survey configuration exactly).
--
-- The DO block below drops existing check constraints first so this migration
-- can be re-run safely on an existing project.
-- ----------------------------------------------------------------------------
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.wishlist_applications'::regclass
      and contype = 'c'
  loop
    execute format('alter table public.wishlist_applications drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.wishlist_applications
  add constraint wishlist_full_name_length check (char_length(full_name) between 2 and 120),
  add constraint wishlist_email_length check (char_length(email) between 3 and 254),
  add constraint wishlist_email_format check (email ~* '^[^@[:space:]]+@[^@[:space:].]+(\.[^@[:space:].]+)+$'),
  add constraint wishlist_email_normalised check (email = lower(btrim(email))),
  add constraint wishlist_user_type_check check (user_type in ('individual_developer', 'ai_startup', 'established_company', 'researcher', 'university_student', 'university_institution', 'other')),
  add constraint wishlist_user_type_other_check check (
    (user_type = 'other' and user_type_other is not null and char_length(user_type_other) between 1 and 200)
    or (user_type <> 'other' and user_type_other is null)
  ) not valid,
  add constraint wishlist_gpu_workloads_check check (cardinality(gpu_workloads) between 1 and 7 and gpu_workloads <@ array['llm_inference', 'fine_tuning', 'training_from_scratch', 'image_generation', 'video_generation', 'computer_vision', 'other']::text[]),
  add constraint wishlist_gpu_workload_other_check check (
    (gpu_workloads @> array['other']::text[] and gpu_workload_other is not null and char_length(gpu_workload_other) between 1 and 200)
    or (not (gpu_workloads @> array['other']::text[]) and gpu_workload_other is null)
  ) not valid,
  add constraint wishlist_vram_requirement_check check (vram_requirement in ('lt_8gb', '8_16gb', '16_24gb', '24_48gb', '48_80gb', 'gt_80gb', 'unknown', 'custom')),
  add constraint wishlist_vram_requirement_other_check check (
    (vram_requirement = 'custom' and vram_requirement_other is not null and char_length(vram_requirement_other) between 1 and 200)
    or (vram_requirement <> 'custom' and vram_requirement_other is null)
  ) not valid,
  add constraint wishlist_usage_frequency_check check (usage_frequency in ('continuous', 'daily', 'several_times_week', 'several_times_month', 'other')),
  add constraint wishlist_usage_frequency_other_check check (
    (usage_frequency = 'other' and usage_frequency_other is not null and char_length(usage_frequency_other) between 1 and 200)
    or (usage_frequency <> 'other' and usage_frequency_other is null)
  ) not valid,
  add constraint wishlist_providers_used_check check (providers_used <@ array['vast_ai', 'runpod', 'aws', 'google_cloud', 'azure', 'lambda', 'coreweave', 'other']::text[]),
  add constraint wishlist_providers_other_check check (
    (providers_used @> array['other']::text[] and providers_other is not null and char_length(providers_other) between 1 and 200)
    or (not (providers_used @> array['other']::text[]) and providers_other is null)
  ) not valid,
  add constraint wishlist_previous_service_problems_check check (previous_service_problems <@ array['price', 'payment_method', 'gpu_availability', 'setup_complexity', 'reliability', 'performance', 'documentation', 'support', 'other']::text[]),
  add constraint wishlist_previous_service_problems_other_check check (
    (previous_service_problems @> array['other']::text[] and previous_service_problems_other is not null and char_length(previous_service_problems_other) between 1 and 200)
    or (not (previous_service_problems @> array['other']::text[]) and previous_service_problems_other is null)
  ) not valid,
  add constraint wishlist_adoption_barriers_check check (adoption_barriers <@ array['unaware', 'too_expensive', 'no_international_payment', 'no_payment_method', 'too_complicated', 'no_need_yet', 'security_concerns', 'other']::text[]),
  add constraint wishlist_adoption_barriers_other_check check (
    (adoption_barriers @> array['other']::text[] and adoption_barriers_other is not null and char_length(adoption_barriers_other) between 1 and 200)
    or (not (adoption_barriers @> array['other']::text[]) and adoption_barriers_other is null)
  ) not valid,
  add constraint wishlist_current_compute_solution_check check (current_compute_solution in ('own_computer', 'borrow_hardware', 'use_api', 'institution_hardware', 'rent_international', 'stop_project', 'other')),
  add constraint wishlist_current_compute_solution_other_check check (
    (current_compute_solution = 'other' and current_compute_solution_other is not null and char_length(current_compute_solution_other) between 1 and 200)
    or (current_compute_solution <> 'other' and current_compute_solution_other is null)
  ) not valid,
  add constraint wishlist_etb_payment_preference_check check (etb_payment_preference in ('yes', 'no', 'not_sure'));

-- The free-text checks above are NOT VALID so legacy rows that predate the
-- required-detail rule do not block the migration. PostgreSQL still enforces
-- them for every new insert and update.

-- Conditional branches must be internally consistent: exactly one branch is
-- populated, and it must be populated with at least one answer.
alter table public.wishlist_applications
  add constraint wishlist_branch_consistency_check check (
    (
      used_gpu_cloud is true
      and cardinality(providers_used) between 1 and 8
      and cardinality(previous_service_problems) between 1 and 9
      and cardinality(adoption_barriers) = 0
      and adoption_barriers_other is null
    )
    or (
      used_gpu_cloud is false
      and cardinality(adoption_barriers) between 1 and 8
      and cardinality(providers_used) = 0
      and cardinality(previous_service_problems) = 0
      and providers_other is null
      and previous_service_problems_other is null
    )
  );

-- ----------------------------------------------------------------------------
-- Indexes for administrative analysis
-- ----------------------------------------------------------------------------
create index if not exists wishlist_created_at_idx on public.wishlist_applications (created_at desc);

-- One application per email address. Email is normalised by the API and by the
-- `wishlist_email_normalised` check above, so a plain unique index is enough.
-- If this database already contains duplicates, stop with a clear message
-- rather than deleting applicant data silently.
do $$
declare
  duplicate_emails bigint;
begin
  select count(*) into duplicate_emails
  from (
    select email
    from public.wishlist_applications
    group by email
    having count(*) > 1
  ) duplicates;

  if duplicate_emails > 0 then
    raise exception
      'Cannot enforce one application per email: % duplicate email address(es) already exist. Resolve them, then re-run this migration.',
      duplicate_emails;
  end if;
end $$;

drop index if exists public.wishlist_email_idx;
create unique index if not exists wishlist_email_unique_idx
  on public.wishlist_applications (email);

drop index if exists public.wishlist_monthly_compute_budget_idx;
drop index if exists public.wishlist_early_access_intent_idx;

create index if not exists wishlist_user_type_idx on public.wishlist_applications (user_type);
create index if not exists wishlist_used_gpu_cloud_idx on public.wishlist_applications (used_gpu_cloud);
create index if not exists wishlist_vram_requirement_idx on public.wishlist_applications (vram_requirement);
create index if not exists wishlist_usage_frequency_idx on public.wishlist_applications (usage_frequency);
create index if not exists wishlist_gpu_workloads_gin_idx on public.wishlist_applications using gin (gpu_workloads);
create index if not exists wishlist_etb_payment_preference_idx on public.wishlist_applications (etb_payment_preference);

-- ----------------------------------------------------------------------------
-- updated_at maintenance
-- ----------------------------------------------------------------------------
create or replace function public.redfoxgpu_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wishlist_applications_touch_updated_at on public.wishlist_applications;
create trigger wishlist_applications_touch_updated_at
  before update on public.wishlist_applications
  for each row
  execute function public.redfoxgpu_touch_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- RLS is enabled and NO policies are created for anon or authenticated roles.
-- Default-deny therefore applies: the public frontend cannot read, insert,
-- update or delete anything, even if the anon key leaks. Anonymous inserts are
-- impossible by design — every write goes through the server route handler
-- using the service-role key.
--
-- The table owner and service_role can still read the data (service_role has
-- BYPASSRLS), which is what makes analysis from the Supabase dashboard or SQL
-- editor possible.
-- ----------------------------------------------------------------------------
alter table public.wishlist_applications enable row level security;

revoke all on table public.wishlist_applications from public;
revoke all on table public.wishlist_applications from anon;
revoke all on table public.wishlist_applications from authenticated;
grant all on table public.wishlist_applications to service_role;
