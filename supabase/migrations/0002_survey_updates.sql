-- ============================================================================
-- RedfoxGPU — survey schema update
-- Migration 0002
--
-- Apply this to an existing project that already ran an earlier revision of
-- 0001. It is idempotent: the survey questions and free-text fields are
-- reconciled, then every coded-answer CHECK constraint is rebuilt.
--
-- Deleted questions:
--   * monthly compute budget
--   * early-access intent
--
-- Added / changed fields:
--   * gpu_workloads now accepts multiple workloads (up to all seven options)
--   * vram_requirement_other for the "Custom" memory-capacity choice
--   * usage_frequency_other for the "Other" frequency choice
--   * all Other / Custom free-text fields are required when selected
-- ============================================================================

alter table public.wishlist_applications
  add column if not exists vram_requirement_other text,
  add column if not exists usage_frequency_other text,
  drop column if exists monthly_compute_budget,
  drop column if exists early_access_intent;

comment on table public.wishlist_applications is
  'Completed RedfoxGPU wishlist applications. One row per email address; duplicate registrations are rejected.';
comment on column public.wishlist_applications.gpu_workloads is
  'Array of workload enum values. The survey allows multiple workloads per application.';

-- Drop every existing check constraint before rebuilding the rules.
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

drop index if exists public.wishlist_monthly_compute_budget_idx;
drop index if exists public.wishlist_early_access_intent_idx;

-- Re-apply the function and trigger with the RedfoxGPU name. The old trigger
-- is dropped first so the old function can be removed safely.
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
