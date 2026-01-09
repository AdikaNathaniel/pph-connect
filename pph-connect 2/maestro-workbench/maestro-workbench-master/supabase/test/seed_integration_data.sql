-- Baseline fixtures for integration tests.
-- Safe to run repeatedly; uses ON CONFLICT to avoid duplicates.

insert into workers (
  id,
  hr_id,
  full_name,
  email_personal,
  email_pph,
  engagement_model,
  worker_status,
  created_at
) values (
  '00000000-0000-0000-0000-000000000111',
  'HR-INT-001',
  'Integration Worker One',
  'integration.one@example.com',
  'integration.one@pph.connect',
  'contractor',
  'active',
  now()
) on conflict (id) do nothing;

insert into projects (
  id,
  department_id,
  project_code,
  project_name,
  expert_tier,
  status,
  created_at
) values (
  '10000000-0000-0000-0000-000000000111',
  null,
  'INT-PROJ-001',
  'Integration Demo Project',
  'tier_1',
  'active',
  now()
) on conflict (id) do nothing;

insert into work_stats (
  worker_id,
  project_id,
  worker_account_id,
  work_date,
  units_completed,
  hours_worked,
  earnings,
  currency
) values (
  '00000000-0000-0000-0000-000000000111',
  '10000000-0000-0000-0000-000000000111',
  null,
  current_date - interval '1 day',
  125,
  6,
  75.50,
  'USD'
) on conflict do nothing;
