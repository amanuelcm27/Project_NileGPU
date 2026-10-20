-- ============================================================================
-- WaliaGPU — wishlist applications
-- Migration 0001
--
-- Run this in the Supabase SQL editor (or with `supabase db push`) before
-- starting the application. The endpoint inserts with the service-role key,
-- which bypasses RLS; every other role is denied access by design.
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
  usage_frequency text not null,
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
  monthly_compute_budget text not null,
  early_access_intent text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Defensive: keep re-runs working on projects created by an earlier revision of
-- this migration, where a column may be missing from the CREATE TABLE above.
alter table public.wishlist_applications
  add column if not exists current_compute_solution_other text;

comment on table public.wishlist_applications is
  'Completed WaliaGPU wishlist applications. One row per email address; duplicate registrations are rejected.';
comment on column public.wishlist_applications.gpu_workloads is
  'Array of workload enum values. The survey collects a single workload today, so the array holds one element.';
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
  add constraint wishlist_user_type_other_check check (user_type_other is null or (user_type = 'other' and char_length(user_type_other) between 1 and 200)),
  add constraint wishlist_gpu_workloads_check check (cardinality(gpu_workloads) between 1 and 3 and gpu_workloads <@ array['llm_inference', 'fine_tuning', 'training_from_scratch', 'image_generation', 'video_generation', 'computer_vision', 'other']::text[]),
  add constraint wishlist_gpu_workload_other_check check (gpu_workload_other is null or (gpu_workloads @> array['other']::text[] and char_length(gpu_workload_other) between 1 and 200)),
  add constraint wishlist_vram_requirement_check check (vram_requirement in ('lt_8gb', '8_16gb', '16_24gb', '24_48gb', '48_80gb', 'gt_80gb', 'unknown')),
  add constraint wishlist_usage_frequency_check check (usage_frequency in ('daily', 'several_times_week', 'several_times_month', 'continuous')),
  add constraint wishlist_providers_used_check check (providers_used <@ array['vast_ai', 'runpod', 'aws', 'google_cloud', 'azure', 'lambda', 'coreweave', 'other']::text[]),
  add constraint wishlist_providers_other_check check (providers_other is null or (providers_used @> array['other']::text[] and char_length(providers_other) between 1 and 200)),
  add constraint wishlist_previous_service_problems_check check (previous_service_problems <@ array['price', 'payment_method', 'gpu_availability', 'setup_complexity', 'reliability', 'performance', 'documentation', 'support', 'other']::text[]),
  add constraint wishlist_previous_service_problems_other_check check (previous_service_problems_other is null or (previous_service_problems @> array['other']::text[] and char_length(previous_service_problems_other) between 1 and 200)),
  add constraint wishlist_adoption_barriers_check check (adoption_barriers <@ array['unaware', 'too_expensive', 'no_international_payment', 'no_payment_method', 'too_complicated', 'no_need_yet', 'security_concerns', 'other']::text[]),
  add constraint wishlist_adoption_barriers_other_check check (adoption_barriers_other is null or (adoption_barriers @> array['other']::text[] and char_length(adoption_barriers_other) between 1 and 200)),
  add constraint wishlist_current_compute_solution_check check (current_compute_solution in ('own_computer', 'borrow_hardware', 'use_api', 'institution_hardware', 'rent_international', 'stop_project', 'other')),
  add constraint wishlist_current_compute_solution_other_check check (current_compute_solution_other is null or (current_compute_solution = 'other' and char_length(current_compute_solution_other) between 1 and 200)),
  add constraint wishlist_etb_payment_preference_check check (etb_payment_preference in ('yes', 'no', 'not_sure')),
  add constraint wishlist_monthly_compute_budget_check check (monthly_compute_budget in ('lt_500', '500_2000', '2000_5000', '5000_10000', '10000_50000', 'gt_50000')),
  add constraint wishlist_early_access_intent_check check (early_access_intent in ('definitely', 'maybe', 'no'));

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

create index if not exists wishlist_user_type_idx on public.wishlist_applications (user_type);
create index if not exists wishlist_used_gpu_cloud_idx on public.wishlist_applications (used_gpu_cloud);
create index if not exists wishlist_vram_requirement_idx on public.wishlist_applications (vram_requirement);
create index if not exists wishlist_usage_frequency_idx on public.wishlist_applications (usage_frequency);
create index if not exists wishlist_early_access_intent_idx on public.wishlist_applications (early_access_intent);
create index if not exists wishlist_monthly_compute_budget_idx on public.wishlist_applications (monthly_compute_budget);
create index if not exists wishlist_gpu_workloads_gin_idx on public.wishlist_applications using gin (gpu_workloads);
create index if not exists wishlist_etb_payment_preference_idx on public.wishlist_applications (etb_payment_preference);

-- ----------------------------------------------------------------------------
-- updated_at maintenance
-- ----------------------------------------------------------------------------
create or replace function public.waliagpu_touch_updated_at()
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
  execute function public.waliagpu_touch_updated_at();

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
