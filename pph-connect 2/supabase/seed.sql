-- ============================================================================
-- PPH Connect Complete Database Seed Script
-- ============================================================================
-- Purpose: Populate database with complete sample data
-- Admin User ID: 76cf385a-e840-4130-be9c-f508a5df9ea2
-- Created: 2026-01-08
-- Updated: 2026-01-08 (Fixed all schema issues)
-- ============================================================================

-- ============================================================================
-- 1. DEPARTMENTS (Insert FIRST - before any FK references)
-- ============================================================================
-- First, ensure Default Department exists (get or create with any ID)
DO $$
DECLARE
  default_dept_id UUID;
BEGIN
  -- Try to find existing Default Department
  SELECT id INTO default_dept_id FROM public.departments WHERE department_name = 'Default Department' LIMIT 1;

  -- If not found, create it with our specified ID
  IF default_dept_id IS NULL THEN
    INSERT INTO public.departments (id, department_name, department_code, description, is_active, created_at, updated_at)
    VALUES ('66666666-6666-6666-6666-666666666666', 'Default Department', 'DEFAULT', 'Default department for new users', true, NOW(), NOW());
    default_dept_id := '66666666-6666-6666-6666-666666666666';
  END IF;

  -- Store the ID for later use
  CREATE TEMP TABLE IF NOT EXISTS temp_dept_id (id UUID);
  DELETE FROM temp_dept_id;
  INSERT INTO temp_dept_id VALUES (default_dept_id);
END $$;

-- Now insert/update other departments
INSERT INTO public.departments (id, department_name, department_code, description, is_active, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Speech & Audio', 'SPEECH', 'Speech recognition and audio annotation projects', true, NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'MLDO (Machine Learning Data Ops)', 'MLDO', 'Machine learning data operations and model training', true, NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Computer Vision', 'CV', 'Image and video annotation projects', true, NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444444', 'NLP (Natural Language Processing)', 'NLP', 'Text annotation and language processing', true, NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555555', 'Quality Assurance', 'QA', 'Quality control and verification team', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  department_name = EXCLUDED.department_name,
  department_code = EXCLUDED.department_code,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================================================
-- 2. UPDATE ADMIN PROFILE (AFTER departments exist)
-- ============================================================================
-- Upsert admin profile with default department (using the actual ID from temp table)
DO $$
DECLARE
  default_dept_id UUID;
  admin_email TEXT;
BEGIN
  -- Get the Default Department ID
  SELECT id INTO default_dept_id FROM temp_dept_id LIMIT 1;

  -- Get admin email from auth.users if it exists
  SELECT email INTO admin_email FROM auth.users WHERE id = '76cf385a-e840-4130-be9c-f508a5df9ea2';

  -- If no email found, use a default
  IF admin_email IS NULL THEN
    admin_email := 'admin@pph.com';
  END IF;

  -- Upsert the admin profile
  INSERT INTO public.profiles (id, email, full_name, role, department_id, created_at, updated_at)
  VALUES ('76cf385a-e840-4130-be9c-f508a5df9ea2', admin_email, 'Admin User', 'admin', default_dept_id, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    role = EXCLUDED.role,
    department_id = default_dept_id,
    updated_at = NOW();
END $$;

-- ============================================================================
-- 3. TEAMS
-- ============================================================================
INSERT INTO public.teams (id, team_name, department_id, locale_primary, is_active, created_at, updated_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'English Speech Team', '11111111-1111-1111-1111-111111111111', 'en', true, NOW(), NOW()),
  ('a2222222-2222-2222-2222-222222222222', 'Spanish Speech Team', '11111111-1111-1111-1111-111111111111', 'es', true, NOW(), NOW()),
  ('a3333333-3333-3333-3333-333333333333', 'French NLP Team', '44444444-4444-4444-4444-444444444444', 'fr', true, NOW(), NOW()),
  ('a4444444-4444-4444-4444-444444444444', 'Mandarin CV Team', '33333333-3333-3333-3333-333333333333', 'zh', true, NOW(), NOW()),
  ('a5555555-5555-5555-5555-555555555555', 'German Audio Team', '11111111-1111-1111-1111-111111111111', 'de', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  team_name = EXCLUDED.team_name,
  department_id = EXCLUDED.department_id,
  locale_primary = EXCLUDED.locale_primary,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================================================
-- 4. WORKERS
-- ============================================================================
INSERT INTO public.workers (id, hr_id, full_name, engagement_model, email_personal, email_pph, country_residence, locale_primary, locale_all, hire_date, bgc_expiration_date, rtw_datetime, status, department_id, created_at, updated_at)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'HR001', 'John Doe', 'core', 'john.doe@gmail.com', 'john.doe@pph.com', 'United States', 'en', ARRAY['en'], '2024-01-15', '2025-12-31', '2024-01-15 09:00:00', 'active', '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
  ('b2222222-2222-2222-2222-222222222222', 'HR002', 'Jane Smith', 'core', 'jane.smith@gmail.com', 'jane.smith@pph.com', 'United States', 'en', ARRAY['en'], '2024-02-20', '2025-11-30', '2024-02-20 09:00:00', 'active', '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
  ('b3333333-3333-3333-3333-333333333333', 'HR003', 'Carlos Garcia', 'upwork', 'carlos.garcia@gmail.com', 'carlos.garcia@pph.com', 'Spain', 'es', ARRAY['es','en'], '2024-03-10', '2026-03-10', '2024-03-10 09:00:00', 'active', '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
  ('b4444444-4444-4444-4444-444444444444', 'HR004', 'Priya Patel', 'core', 'priya.patel@gmail.com', 'priya.patel@pph.com', 'India', 'en', ARRAY['en','hi'], '2024-01-25', '2026-01-25', '2024-01-25 09:00:00', 'active', '22222222-2222-2222-2222-222222222222', NOW(), NOW()),
  ('b5555555-5555-5555-5555-555555555555', 'HR005', 'Ahmed Hassan', 'external', 'ahmed.hassan@gmail.com', 'ahmed.hassan@pph.com', 'Egypt', 'ar', ARRAY['ar','en'], '2024-04-05', '2025-10-15', '2024-04-05 09:00:00', 'active', '22222222-2222-2222-2222-222222222222', NOW(), NOW()),
  ('b6666666-6666-6666-6666-666666666666', 'HR006', 'Li Wei', 'core', 'li.wei@gmail.com', 'li.wei@pph.com', 'China', 'zh', ARRAY['zh','en'], '2024-02-14', '2026-02-14', '2024-02-14 09:00:00', 'active', '33333333-3333-3333-3333-333333333333', NOW(), NOW()),
  ('b7777777-7777-7777-7777-777777777777', 'HR007', 'Sophie Mueller', 'upwork', 'sophie.mueller@gmail.com', 'sophie.mueller@pph.com', 'Germany', 'de', ARRAY['de','en'], '2024-05-20', '2025-09-30', '2024-05-20 09:00:00', 'active', '33333333-3333-3333-3333-333333333333', NOW(), NOW()),
  ('b8888888-8888-8888-8888-888888888888', 'HR008', 'Maria Silva', 'external', 'maria.silva@gmail.com', 'maria.silva@pph.com', 'Brazil', 'pt', ARRAY['pt'], '2025-01-05', NULL, NULL, 'pending', '44444444-4444-4444-4444-444444444444', NOW(), NOW()),
  ('b9999999-9999-9999-9999-999999999999', 'HR009', 'Yuki Tanaka', 'core', 'yuki.tanaka@gmail.com', 'yuki.tanaka@pph.com', 'Japan', 'ja', ARRAY['ja','en'], '2024-12-15', '2026-06-15', '2024-12-15 09:00:00', 'active', '33333333-3333-3333-3333-333333333333', NOW(), NOW()),
  ('b0000000-1010-1010-1010-101010101010', 'HR010', 'Anna Kowalski', 'core', 'anna.kowalski@gmail.com', 'anna.kowalski@pph.com', 'Poland', 'pl', ARRAY['pl','en'], '2023-11-10', '2025-11-10', '2023-11-10 09:00:00', 'active', '11111111-1111-1111-1111-111111111111', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email_personal = EXCLUDED.email_personal,
  email_pph = EXCLUDED.email_pph,
  status = EXCLUDED.status,
  department_id = EXCLUDED.department_id,
  hire_date = EXCLUDED.hire_date,
  bgc_expiration_date = EXCLUDED.bgc_expiration_date,
  rtw_datetime = EXCLUDED.rtw_datetime,
  country_residence = EXCLUDED.country_residence,
  locale_primary = EXCLUDED.locale_primary,
  locale_all = EXCLUDED.locale_all,
  updated_at = NOW();

-- ============================================================================
-- 5. WORKER ACCOUNTS
-- ============================================================================
INSERT INTO public.worker_accounts (id, worker_id, platform_type, worker_account_id, worker_account_email, status, is_current, activated_at, created_at, updated_at, created_by)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'Maestro', 'john.doe', 'john.doe@pph.com', 'active', true, NOW(), NOW(), NOW(), NULL),
  ('c1111112-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'DataCompute', 'jdoe_dc', 'john.doe@pph.com', 'replaced', false, NOW(), NOW(), NOW(), NULL),
  ('c2222221-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'Maestro', 'jane.smith', 'jane.smith@pph.com', 'active', true, NOW(), NOW(), NOW(), NULL),
  ('c2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'DataCompute', 'jsmith_dc', 'jane.smith@pph.com', 'inactive', false, NOW(), NOW(), NOW(), NULL),
  ('c3333331-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333', 'Maestro', 'carlos.garcia', 'carlos.garcia@pph.com', 'active', true, NOW(), NOW(), NOW(), NULL),
  ('c4444441-4444-4444-4444-444444444444', 'b4444444-4444-4444-4444-444444444444', 'Maestro', 'priya.patel', 'priya.patel@pph.com', 'active', true, NOW(), NOW(), NOW(), NULL),
  ('c4444442-4444-4444-4444-444444444444', 'b4444444-4444-4444-4444-444444444444', 'Other', 'priya.patel.scale', 'priya.patel@pph.com', 'replaced', false, NOW(), NOW(), NOW(), NULL),
  ('c5555551-5555-5555-5555-555555555555', 'b5555555-5555-5555-5555-555555555555', 'Maestro', 'ahmed.hassan', 'ahmed.hassan@pph.com', 'active', true, NOW(), NOW(), NOW(), NULL),
  ('c6666661-6666-6666-6666-666666666666', 'b6666666-6666-6666-6666-666666666666', 'Maestro', 'li.wei', 'li.wei@pph.com', 'active', true, NOW(), NOW(), NOW(), NULL),
  ('c7777771-7777-7777-7777-777777777777', 'b7777777-7777-7777-7777-777777777777', 'Maestro', 'sophie.mueller', 'sophie.mueller@pph.com', 'active', true, NOW(), NOW(), NOW(), NULL),
  ('c8888881-8888-8888-8888-888888888888', 'b8888888-8888-8888-8888-888888888888', 'Maestro', 'maria.silva', 'maria.silva@pph.com', 'inactive', false, NOW(), NOW(), NOW(), NULL),
  ('c9999991-9999-9999-9999-999999999999', 'b9999999-9999-9999-9999-999999999999', 'Maestro', 'yuki.tanaka', 'yuki.tanaka@pph.com', 'active', true, NOW(), NOW(), NOW(), NULL),
  ('c0000001-1010-1010-1010-101010101010', 'b0000000-1010-1010-1010-101010101010', 'Maestro', 'anna.kowalski', 'anna.kowalski@pph.com', 'active', true, NOW(), NOW(), NOW(), NULL)
ON CONFLICT (id) DO UPDATE SET
  platform_type = EXCLUDED.platform_type,
  worker_account_id = EXCLUDED.worker_account_id,
  worker_account_email = EXCLUDED.worker_account_email,
  status = EXCLUDED.status,
  is_current = EXCLUDED.is_current,
  updated_at = NOW();

-- ============================================================================
-- 6. WORKFORCE PROJECTS
-- ============================================================================
INSERT INTO public.workforce_projects (id, project_name, project_code, department_id, expert_tier, status, start_date, end_date, created_by, created_at, updated_at)
VALUES
  ('d1111111-1111-1111-1111-111111111111', 'Voice Assistant Training - English', 'VA-ENG-2024', '11111111-1111-1111-1111-111111111111', 'tier1', 'active', '2024-01-15', '2025-06-30', NULL, NOW(), NOW()),
  ('d2222222-2222-2222-2222-222222222222', 'Medical Image Annotation', 'MED-IMG-2024', '33333333-3333-3333-3333-333333333333', 'tier2', 'active', '2024-03-01', '2025-12-31', NULL, NOW(), NOW()),
  ('d3333333-3333-3333-3333-333333333333', 'Spanish Audio Transcription', 'AUD-SPA-2024', '11111111-1111-1111-1111-111111111111', 'tier1', 'active', '2024-02-10', '2025-08-15', NULL, NOW(), NOW()),
  ('d4444444-4444-4444-4444-444444444444', 'Sentiment Analysis Dataset', 'NLP-SENT-2024', '44444444-4444-4444-4444-444444444444', 'tier1', 'active', '2024-04-01', '2025-10-30', NULL, NOW(), NOW()),
  ('d5555555-5555-5555-5555-555555555555', 'Autonomous Driving Labels', 'CV-AUTO-2024', '33333333-3333-3333-3333-333333333333', 'tier0', 'paused', '2025-02-01', '2026-01-31', NULL, NOW(), NOW()),
  ('d6666666-6666-6666-6666-666666666666', 'Chatbot Training Data', 'NLP-CHAT-2023', '44444444-4444-4444-4444-444444444444', 'tier1', 'completed', '2023-06-01', '2024-02-28', NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  project_name = EXCLUDED.project_name,
  project_code = EXCLUDED.project_code,
  department_id = EXCLUDED.department_id,
  expert_tier = EXCLUDED.expert_tier,
  status = EXCLUDED.status,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  updated_at = NOW();

-- ============================================================================
-- 7. PROJECT TEAMS
-- ============================================================================
INSERT INTO public.project_teams (id, project_id, team_id, created_by, created_at)
VALUES
  ('e1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', NULL, NOW()),
  ('e2222222-2222-2222-2222-222222222222', 'd3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', NULL, NOW()),
  ('e3333333-3333-3333-3333-333333333333', 'd2222222-2222-2222-2222-222222222222', 'a4444444-4444-4444-4444-444444444444', NULL, NOW()),
  ('e4444444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444', 'a3333333-3333-3333-3333-333333333333', NULL, NOW()),
  ('e5555555-5555-5555-5555-555555555555', 'd1111111-1111-1111-1111-111111111111', 'a5555555-5555-5555-5555-555555555555', NULL, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. WORKER ASSIGNMENTS
-- ============================================================================
INSERT INTO public.worker_assignments (id, worker_id, project_id, assigned_at, assigned_by)
VALUES
  ('f1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '2024-01-20', NULL),
  ('f2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', '2024-02-25', NULL),
  ('f3333333-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333', 'd3333333-3333-3333-3333-333333333333', '2024-03-15', NULL),
  ('f4444444-4444-4444-4444-444444444444', 'b4444444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444', '2024-04-05', NULL),
  ('f5555555-5555-5555-5555-555555555555', 'b5555555-5555-5555-5555-555555555555', 'd4444444-4444-4444-4444-444444444444', '2024-04-10', NULL),
  ('f6666666-6666-6666-6666-666666666666', 'b6666666-6666-6666-6666-666666666666', 'd2222222-2222-2222-2222-222222222222', '2024-03-10', NULL),
  ('f7777777-7777-7777-7777-777777777777', 'b7777777-7777-7777-7777-777777777777', 'd2222222-2222-2222-2222-222222222222', '2024-05-25', NULL),
  ('f9999999-9999-9999-9999-999999999999', 'b9999999-9999-9999-9999-999999999999', 'd2222222-2222-2222-2222-222222222222', '2024-12-20', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. TASK TEMPLATES (for projects references)
-- ============================================================================
-- Creating task template entries that projects can reference

INSERT INTO public.task_templates (
  id,
  name,
  google_sheet_url,
  created_by,
  created_at,
  updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Voice Assistant Training Template', 'https://docs.google.com/spreadsheets/d/template-va', '76cf385a-e840-4130-be9c-f508a5df9ea2', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'Medical Image Annotation Template', 'https://docs.google.com/spreadsheets/d/template-med', '76cf385a-e840-4130-be9c-f508a5df9ea2', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Audio Transcription Template', 'https://docs.google.com/spreadsheets/d/template-aud', '76cf385a-e840-4130-be9c-f508a5df9ea2', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', 'NLP Dataset Template', 'https://docs.google.com/spreadsheets/d/template-nlp', '76cf385a-e840-4130-be9c-f508a5df9ea2', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  google_sheet_url = EXCLUDED.google_sheet_url,
  created_by = EXCLUDED.created_by,
  updated_at = NOW();

-- ============================================================================
-- 10. PROJECTS (for work_stats references)
-- ============================================================================
-- Note: This is different from workforce_projects
-- Creating project entries that work_stats can reference
-- Using task template IDs created above and admin user for created_by

INSERT INTO public.projects (
  id,
  name,
  template_id,
  google_sheet_url,
  created_by,
  created_at,
  updated_at
)
VALUES
  ('d1111111-1111-1111-1111-111111111111', 'Voice Assistant Training - English', '00000000-0000-0000-0000-000000000001', 'https://docs.google.com/spreadsheets/d/sample-va-eng', '76cf385a-e840-4130-be9c-f508a5df9ea2', NOW(), NOW()),
  ('d2222222-2222-2222-2222-222222222222', 'Medical Image Annotation', '00000000-0000-0000-0000-000000000002', 'https://docs.google.com/spreadsheets/d/sample-med-img', '76cf385a-e840-4130-be9c-f508a5df9ea2', NOW(), NOW()),
  ('d3333333-3333-3333-3333-333333333333', 'Spanish Audio Transcription', '00000000-0000-0000-0000-000000000003', 'https://docs.google.com/spreadsheets/d/sample-spa-aud', '76cf385a-e840-4130-be9c-f508a5df9ea2', NOW(), NOW()),
  ('d4444444-4444-4444-4444-444444444444', 'Sentiment Analysis Dataset', '00000000-0000-0000-0000-000000000004', 'https://docs.google.com/spreadsheets/d/sample-nlp-sent', '76cf385a-e840-4130-be9c-f508a5df9ea2', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  template_id = EXCLUDED.template_id,
  google_sheet_url = EXCLUDED.google_sheet_url,
  created_by = EXCLUDED.created_by,
  updated_at = NOW();

-- ============================================================================
-- 11. WORK STATS
-- ============================================================================
INSERT INTO public.work_stats (id, worker_id, worker_account_id, project_id, work_date, units_completed, hours_worked, earnings, created_at, created_by)
VALUES
  -- John Doe stats (assigned to VA-ENG-2024) - created_by = worker_id (self-created)
  ('91111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '7 days', 145, 38, 950.00, NOW(), 'b1111111-1111-1111-1111-111111111111'),
  ('91111112-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '14 days', 138, 40, 1000.00, NOW(), 'b1111111-1111-1111-1111-111111111111'),
  ('91111113-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '21 days', 142, 39, 975.00, NOW(), 'b1111111-1111-1111-1111-111111111111'),

  -- Jane Smith stats (assigned to VA-ENG-2024) - created_by = worker_id (self-created)
  ('92222221-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'c2222221-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '7 days', 180, 40, 1000.00, NOW(), 'b2222222-2222-2222-2222-222222222222'),
  ('92222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'c2222221-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '14 days', 175, 40, 1000.00, NOW(), 'b2222222-2222-2222-2222-222222222222'),

  -- Carlos Garcia stats (assigned to AUD-SPA-2024) - created_by = worker_id (self-created)
  ('93333331-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333', 'c3333331-3333-3333-3333-333333333333', 'd3333333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '7 days', 125, 35, 875.00, NOW(), 'b3333333-3333-3333-3333-333333333333'),
  ('93333332-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333', 'c3333331-3333-3333-3333-333333333333', 'd3333333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '14 days', 130, 36, 900.00, NOW(), 'b3333333-3333-3333-3333-333333333333'),

  -- Priya Patel stats (assigned to NLP-SENT-2024) - created_by = worker_id (self-created)
  ('94444441-4444-4444-4444-444444444444', 'b4444444-4444-4444-4444-444444444444', 'c4444441-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444', CURRENT_DATE - INTERVAL '7 days', 165, 40, 1000.00, NOW(), 'b4444444-4444-4444-4444-444444444444'),

  -- Li Wei stats (assigned to MED-IMG-2024) - created_by = worker_id (self-created)
  ('96666661-6666-6666-6666-666666666666', 'b6666666-6666-6666-6666-666666666666', 'c6666661-6666-6666-6666-666666666666', 'd2222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '7 days', 95, 38, 950.00, NOW(), 'b6666666-6666-6666-6666-666666666666'),
  ('96666662-6666-6666-6666-666666666666', 'b6666666-6666-6666-6666-666666666666', 'c6666661-6666-6666-6666-666666666666', 'd2222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '14 days', 92, 38, 950.00, NOW(), 'b6666666-6666-6666-6666-666666666666'),

  -- Sophie Mueller stats (assigned to MED-IMG-2024) - created_by = worker_id (self-created)
  ('97777771-7777-7777-7777-777777777777', 'b7777777-7777-7777-7777-777777777777', 'c7777771-7777-7777-7777-777777777777', 'd2222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '7 days', 88, 30, 750.00, NOW(), 'b7777777-7777-7777-7777-777777777777')
ON CONFLICT (id) DO UPDATE SET
  units_completed = EXCLUDED.units_completed,
  hours_worked = EXCLUDED.hours_worked,
  earnings = EXCLUDED.earnings;

-- ============================================================================
-- 12. RATES PAYABLE (Rate Cards)
-- ============================================================================
-- Rate cards for different locale + tier + country combinations
-- expert_tier values: tier0, tier1, tier2
-- Rates are per unit or per hour depending on project type
INSERT INTO public.rates_payable (id, locale, expert_tier, country, rate_per_unit, rate_per_hour, currency, effective_from, effective_to, created_at, created_by)
VALUES
  -- English (US) Rate Cards - All tiers
  ('e1111111-1111-1111-1111-111111111111', 'en', 'tier0', 'United States', 0.15, 18.00, 'USD', '2024-01-01', NULL, NOW(), 'b1111111-1111-1111-1111-111111111111'),
  ('e1111112-1111-1111-1111-111111111111', 'en', 'tier1', 'United States', 0.20, 25.00, 'USD', '2024-01-01', NULL, NOW(), 'b1111111-1111-1111-1111-111111111111'),
  ('e1111113-1111-1111-1111-111111111111', 'en', 'tier2', 'United States', 0.30, 35.00, 'USD', '2024-01-01', NULL, NOW(), 'b1111111-1111-1111-1111-111111111111'),

  -- Spanish (Spain) Rate Cards - All tiers
  ('e2222221-2222-2222-2222-222222222222', 'es', 'tier0', 'Spain', 0.12, 15.00, 'EUR', '2024-01-01', NULL, NOW(), 'b3333333-3333-3333-3333-333333333333'),
  ('e2222222-2222-2222-2222-222222222222', 'es', 'tier1', 'Spain', 0.18, 22.00, 'EUR', '2024-01-01', NULL, NOW(), 'b3333333-3333-3333-3333-333333333333'),
  ('e2222223-2222-2222-2222-222222222222', 'es', 'tier2', 'Spain', 0.25, 30.00, 'EUR', '2024-01-01', NULL, NOW(), 'b3333333-3333-3333-3333-333333333333'),

  -- German (Germany) Rate Cards - All tiers
  ('e3333331-3333-3333-3333-333333333333', 'de', 'tier0', 'Germany', 0.14, 17.00, 'EUR', '2024-01-01', NULL, NOW(), 'b7777777-7777-7777-7777-777777777777'),
  ('e3333332-3333-3333-3333-333333333333', 'de', 'tier1', 'Germany', 0.20, 24.00, 'EUR', '2024-01-01', NULL, NOW(), 'b7777777-7777-7777-7777-777777777777'),
  ('e3333333-3333-3333-3333-333333333333', 'de', 'tier2', 'Germany', 0.28, 32.00, 'EUR', '2024-01-01', NULL, NOW(), 'b7777777-7777-7777-7777-777777777777'),

  -- Chinese (China) Rate Cards - All tiers
  ('e4444441-4444-4444-4444-444444444444', 'zh', 'tier0', 'China', 0.10, 12.00, 'USD', '2024-01-01', NULL, NOW(), 'b6666666-6666-6666-6666-666666666666'),
  ('e4444442-4444-4444-4444-444444444444', 'zh', 'tier1', 'China', 0.15, 18.00, 'USD', '2024-01-01', NULL, NOW(), 'b6666666-6666-6666-6666-666666666666'),
  ('e4444443-4444-4444-4444-444444444444', 'zh', 'tier2', 'China', 0.22, 25.00, 'USD', '2024-01-01', NULL, NOW(), 'b6666666-6666-6666-6666-666666666666'),

  -- Hindi (India) Rate Cards - All tiers
  ('e5555551-5555-5555-5555-555555555555', 'hi', 'tier0', 'India', 0.08, 10.00, 'USD', '2024-01-01', NULL, NOW(), 'b4444444-4444-4444-4444-444444444444'),
  ('e5555552-5555-5555-5555-555555555555', 'hi', 'tier1', 'India', 0.12, 15.00, 'USD', '2024-01-01', NULL, NOW(), 'b4444444-4444-4444-4444-444444444444'),
  ('e5555553-5555-5555-5555-555555555555', 'hi', 'tier2', 'India', 0.18, 22.00, 'USD', '2024-01-01', NULL, NOW(), 'b4444444-4444-4444-4444-444444444444'),

  -- French (France) Rate Cards - All tiers
  ('e6666661-6666-6666-6666-666666666666', 'fr', 'tier0', 'France', 0.13, 16.00, 'EUR', '2024-01-01', NULL, NOW(), 'b1111111-1111-1111-1111-111111111111'),
  ('e6666662-6666-6666-6666-666666666666', 'fr', 'tier1', 'France', 0.19, 23.00, 'EUR', '2024-01-01', NULL, NOW(), 'b1111111-1111-1111-1111-111111111111'),
  ('e6666663-6666-6666-6666-666666666666', 'fr', 'tier2', 'France', 0.27, 31.00, 'EUR', '2024-01-01', NULL, NOW(), 'b1111111-1111-1111-1111-111111111111'),

  -- Japanese (Japan) Rate Cards - All tiers
  ('e7777771-7777-7777-7777-777777777777', 'ja', 'tier0', 'Japan', 0.16, 20.00, 'USD', '2024-01-01', NULL, NOW(), 'b9999999-9999-9999-9999-999999999999'),
  ('e7777772-7777-7777-7777-777777777777', 'ja', 'tier1', 'Japan', 0.22, 28.00, 'USD', '2024-01-01', NULL, NOW(), 'b9999999-9999-9999-9999-999999999999'),
  ('e7777773-7777-7777-7777-777777777777', 'ja', 'tier2', 'Japan', 0.32, 38.00, 'USD', '2024-01-01', NULL, NOW(), 'b9999999-9999-9999-9999-999999999999'),

  -- Arabic (Egypt) Rate Cards - All tiers
  ('e8888881-8888-8888-8888-888888888888', 'ar', 'tier0', 'Egypt', 0.09, 11.00, 'USD', '2024-01-01', NULL, NOW(), 'b5555555-5555-5555-5555-555555555555'),
  ('e8888882-8888-8888-8888-888888888888', 'ar', 'tier1', 'Egypt', 0.14, 17.00, 'USD', '2024-01-01', NULL, NOW(), 'b5555555-5555-5555-5555-555555555555'),
  ('e8888883-8888-8888-8888-888888888888', 'ar', 'tier2', 'Egypt', 0.20, 24.00, 'USD', '2024-01-01', NULL, NOW(), 'b5555555-5555-5555-5555-555555555555'),

  -- Portuguese (Brazil) Rate Cards - All tiers
  ('e9999991-9999-9999-9999-999999999999', 'pt', 'tier0', 'Brazil', 0.10, 12.00, 'USD', '2024-01-01', NULL, NOW(), 'b8888888-8888-8888-8888-888888888888'),
  ('e9999992-9999-9999-9999-999999999999', 'pt', 'tier1', 'Brazil', 0.15, 18.00, 'USD', '2024-01-01', NULL, NOW(), 'b8888888-8888-8888-8888-888888888888'),
  ('e9999993-9999-9999-9999-999999999999', 'pt', 'tier2', 'Brazil', 0.22, 25.00, 'USD', '2024-01-01', NULL, NOW(), 'b8888888-8888-8888-8888-888888888888'),

  -- Polish (Poland) Rate Cards - All tiers
  ('ea000001-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pl', 'tier0', 'Poland', 0.11, 13.00, 'EUR', '2024-01-01', NULL, NOW(), 'b0000000-1010-1010-1010-101010101010'),
  ('ea000002-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pl', 'tier1', 'Poland', 0.16, 20.00, 'EUR', '2024-01-01', NULL, NOW(), 'b0000000-1010-1010-1010-101010101010'),
  ('ea000003-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'pl', 'tier2', 'Poland', 0.24, 28.00, 'EUR', '2024-01-01', NULL, NOW(), 'b0000000-1010-1010-1010-101010101010'),

  -- Historical rate (expired) - English US tier1 from 2023
  ('eb000001-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'en', 'tier1', 'United States', 0.18, 22.00, 'USD', '2023-01-01', '2023-12-31', NOW(), 'b1111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE SET
  rate_per_unit = EXCLUDED.rate_per_unit,
  rate_per_hour = EXCLUDED.rate_per_hour,
  effective_from = EXCLUDED.effective_from,
  effective_to = EXCLUDED.effective_to;

-- ============================================================================
-- 13. LOCALE MAPPINGS
-- ============================================================================
-- Maps client-specific locale codes to standardized ISO codes for ETL
-- Includes common variations and non-standard codes that may appear in CSV imports
INSERT INTO public.locale_mappings (id, client_locale_code, standard_iso_code, locale_name, created_at)
VALUES
  -- Standard ISO codes (direct mappings)
  ('f1111111-1111-1111-1111-111111111111', 'en', 'en', 'English', NOW()),
  ('f1111112-1111-1111-1111-111111111111', 'es', 'es', 'Spanish', NOW()),
  ('f1111113-1111-1111-1111-111111111111', 'fr', 'fr', 'French', NOW()),
  ('f1111114-1111-1111-1111-111111111111', 'de', 'de', 'German', NOW()),
  ('f1111115-1111-1111-1111-111111111111', 'it', 'it', 'Italian', NOW()),
  ('f1111116-1111-1111-1111-111111111111', 'pt', 'pt', 'Portuguese', NOW()),
  ('f1111117-1111-1111-1111-111111111111', 'nl', 'nl', 'Dutch', NOW()),
  ('f1111118-1111-1111-1111-111111111111', 'pl', 'pl', 'Polish', NOW()),
  ('f1111119-1111-1111-1111-111111111111', 'ru', 'ru', 'Russian', NOW()),
  ('f111111a-1111-1111-1111-111111111111', 'ja', 'ja', 'Japanese', NOW()),
  ('f111111b-1111-1111-1111-111111111111', 'ko', 'ko', 'Korean', NOW()),
  ('f111111c-1111-1111-1111-111111111111', 'zh', 'zh', 'Chinese', NOW()),
  ('f111111d-1111-1111-1111-111111111111', 'ar', 'ar', 'Arabic', NOW()),
  ('f111111e-1111-1111-1111-111111111111', 'hi', 'hi', 'Hindi', NOW()),
  ('f111111f-1111-1111-1111-111111111111', 'th', 'th', 'Thai', NOW()),
  ('f1111120-1111-1111-1111-111111111111', 'vi', 'vi', 'Vietnamese', NOW()),
  ('f1111121-1111-1111-1111-111111111111', 'id', 'id', 'Indonesian', NOW()),
  ('f1111122-1111-1111-1111-111111111111', 'ms', 'ms', 'Malay', NOW()),
  ('f1111123-1111-1111-1111-111111111111', 'tr', 'tr', 'Turkish', NOW()),
  ('f1111124-1111-1111-1111-111111111111', 'he', 'he', 'Hebrew', NOW()),
  ('f1111125-1111-1111-1111-111111111111', 'sv', 'sv', 'Swedish', NOW()),
  ('f1111126-1111-1111-1111-111111111111', 'da', 'da', 'Danish', NOW()),
  ('f1111127-1111-1111-1111-111111111111', 'no', 'no', 'Norwegian', NOW()),
  ('f1111128-1111-1111-1111-111111111111', 'fi', 'fi', 'Finnish', NOW()),
  ('f1111129-1111-1111-1111-111111111111', 'cs', 'cs', 'Czech', NOW()),
  ('f111112a-1111-1111-1111-111111111111', 'hu', 'hu', 'Hungarian', NOW()),
  ('f111112b-1111-1111-1111-111111111111', 'ro', 'ro', 'Romanian', NOW()),
  ('f111112c-1111-1111-1111-111111111111', 'uk', 'uk', 'Ukrainian', NOW()),
  ('f111112d-1111-1111-1111-111111111111', 'el', 'el', 'Greek', NOW()),
  ('f111112e-1111-1111-1111-111111111111', 'bg', 'bg', 'Bulgarian', NOW()),

  -- Regional variants (BCP 47 format)
  ('f2222221-2222-2222-2222-222222222222', 'en-US', 'en', 'English (United States)', NOW()),
  ('f2222222-2222-2222-2222-222222222222', 'en-GB', 'en', 'English (United Kingdom)', NOW()),
  ('f2222223-2222-2222-2222-222222222222', 'en-AU', 'en', 'English (Australia)', NOW()),
  ('f2222224-2222-2222-2222-222222222222', 'en-CA', 'en', 'English (Canada)', NOW()),
  ('f2222225-2222-2222-2222-222222222222', 'en-IN', 'en', 'English (India)', NOW()),
  ('f2222226-2222-2222-2222-222222222222', 'es-ES', 'es', 'Spanish (Spain)', NOW()),
  ('f2222227-2222-2222-2222-222222222222', 'es-MX', 'es', 'Spanish (Mexico)', NOW()),
  ('f2222228-2222-2222-2222-222222222222', 'es-AR', 'es', 'Spanish (Argentina)', NOW()),
  ('f2222229-2222-2222-2222-222222222222', 'es-CO', 'es', 'Spanish (Colombia)', NOW()),
  ('f222222a-2222-2222-2222-222222222222', 'pt-BR', 'pt', 'Portuguese (Brazil)', NOW()),
  ('f222222b-2222-2222-2222-222222222222', 'pt-PT', 'pt', 'Portuguese (Portugal)', NOW()),
  ('f222222c-2222-2222-2222-222222222222', 'fr-FR', 'fr', 'French (France)', NOW()),
  ('f222222d-2222-2222-2222-222222222222', 'fr-CA', 'fr', 'French (Canada)', NOW()),
  ('f222222e-2222-2222-2222-222222222222', 'de-DE', 'de', 'German (Germany)', NOW()),
  ('f222222f-2222-2222-2222-222222222222', 'de-AT', 'de', 'German (Austria)', NOW()),
  ('f2222230-2222-2222-2222-222222222222', 'de-CH', 'de', 'German (Switzerland)', NOW()),
  ('f2222231-2222-2222-2222-222222222222', 'zh-CN', 'zh', 'Chinese (Simplified)', NOW()),
  ('f2222232-2222-2222-2222-222222222222', 'zh-TW', 'zh', 'Chinese (Traditional)', NOW()),
  ('f2222233-2222-2222-2222-222222222222', 'zh-HK', 'zh', 'Chinese (Hong Kong)', NOW()),
  ('f2222234-2222-2222-2222-222222222222', 'ar-SA', 'ar', 'Arabic (Saudi Arabia)', NOW()),
  ('f2222235-2222-2222-2222-222222222222', 'ar-EG', 'ar', 'Arabic (Egypt)', NOW()),

  -- Common non-standard variations (ETL normalization)
  ('f3333331-3333-3333-3333-333333333333', 'english', 'en', 'English (full name)', NOW()),
  ('f3333332-3333-3333-3333-333333333333', 'spanish', 'es', 'Spanish (full name)', NOW()),
  ('f3333333-3333-3333-3333-333333333333', 'french', 'fr', 'French (full name)', NOW()),
  ('f3333334-3333-3333-3333-333333333333', 'german', 'de', 'German (full name)', NOW()),
  ('f3333335-3333-3333-3333-333333333333', 'chinese', 'zh', 'Chinese (full name)', NOW()),
  ('f3333336-3333-3333-3333-333333333333', 'japanese', 'ja', 'Japanese (full name)', NOW()),
  ('f3333337-3333-3333-3333-333333333333', 'korean', 'ko', 'Korean (full name)', NOW()),
  ('f3333338-3333-3333-3333-333333333333', 'arabic', 'ar', 'Arabic (full name)', NOW()),
  ('f3333339-3333-3333-3333-333333333333', 'hindi', 'hi', 'Hindi (full name)', NOW()),
  ('f333333a-3333-3333-3333-333333333333', 'portuguese', 'pt', 'Portuguese (full name)', NOW()),
  ('f333333b-3333-3333-3333-333333333333', 'russian', 'ru', 'Russian (full name)', NOW()),
  ('f333333c-3333-3333-3333-333333333333', 'italian', 'it', 'Italian (full name)', NOW()),
  ('f333333d-3333-3333-3333-333333333333', 'dutch', 'nl', 'Dutch (full name)', NOW()),
  ('f333333e-3333-3333-3333-333333333333', 'polish', 'pl', 'Polish (full name)', NOW()),
  ('f333333f-3333-3333-3333-333333333333', 'turkish', 'tr', 'Turkish (full name)', NOW()),

  -- Legacy/alternate codes
  ('f4444441-4444-4444-4444-444444444444', 'eng', 'en', 'English (ISO 639-2)', NOW()),
  ('f4444442-4444-4444-4444-444444444444', 'spa', 'es', 'Spanish (ISO 639-2)', NOW()),
  ('f4444443-4444-4444-4444-444444444444', 'fra', 'fr', 'French (ISO 639-2)', NOW()),
  ('f4444444-4444-4444-4444-444444444444', 'deu', 'de', 'German (ISO 639-2)', NOW()),
  ('f4444445-4444-4444-4444-444444444444', 'zho', 'zh', 'Chinese (ISO 639-2)', NOW()),
  ('f4444446-4444-4444-4444-444444444444', 'jpn', 'ja', 'Japanese (ISO 639-2)', NOW()),
  ('f4444447-4444-4444-4444-444444444444', 'kor', 'ko', 'Korean (ISO 639-2)', NOW()),
  ('f4444448-4444-4444-4444-444444444444', 'ara', 'ar', 'Arabic (ISO 639-2)', NOW()),
  ('f4444449-4444-4444-4444-444444444444', 'hin', 'hi', 'Hindi (ISO 639-2)', NOW()),
  ('f444444a-4444-4444-4444-444444444444', 'por', 'pt', 'Portuguese (ISO 639-2)', NOW()),
  ('f444444b-4444-4444-4444-444444444444', 'rus', 'ru', 'Russian (ISO 639-2)', NOW()),
  ('f444444c-4444-4444-4444-444444444444', 'ita', 'it', 'Italian (ISO 639-2)', NOW())
ON CONFLICT (client_locale_code) DO UPDATE SET
  standard_iso_code = EXCLUDED.standard_iso_code,
  locale_name = EXCLUDED.locale_name;

-- ============================================================================
-- 14. VERIFICATION QUERIES
-- ============================================================================
-- Display summary of seeded data
DO $$
DECLARE
  dept_count INT;
  profile_count INT;
  team_count INT;
  worker_count INT;
  account_count INT;
  project_count INT;
  pt_count INT;
  assignment_count INT;
  stats_count INT;
  rates_count INT;
  locale_count INT;
BEGIN
  SELECT COUNT(*) INTO dept_count FROM public.departments;
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  SELECT COUNT(*) INTO team_count FROM public.teams;
  SELECT COUNT(*) INTO worker_count FROM public.workers;
  SELECT COUNT(*) INTO account_count FROM public.worker_accounts;
  SELECT COUNT(*) INTO project_count FROM public.workforce_projects;
  SELECT COUNT(*) INTO pt_count FROM public.project_teams;
  SELECT COUNT(*) INTO assignment_count FROM public.worker_assignments WHERE removed_at IS NULL;
  SELECT COUNT(*) INTO stats_count FROM public.work_stats;
  SELECT COUNT(*) INTO rates_count FROM public.rates_payable;
  SELECT COUNT(*) INTO locale_count FROM public.locale_mappings;

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'SEED DATA SUMMARY';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Departments:           % records', dept_count;
  RAISE NOTICE 'Profiles:              % records', profile_count;
  RAISE NOTICE 'Teams:                 % records', team_count;
  RAISE NOTICE 'Workers:               % records', worker_count;
  RAISE NOTICE 'Worker Accounts:       % records', account_count;
  RAISE NOTICE 'Workforce Projects:    % records', project_count;
  RAISE NOTICE 'Project Teams:         % records', pt_count;
  RAISE NOTICE 'Worker Assignments:    % records (active)', assignment_count;
  RAISE NOTICE 'Work Stats:            % records', stats_count;
  RAISE NOTICE 'Rates Payable:         % records', rates_count;
  RAISE NOTICE 'Locale Mappings:       % records', locale_count;
  RAISE NOTICE '============================================================================';
END $$;

-- Show sample worker data with relationships
SELECT
  w.full_name as worker_name,
  w.status,
  w.email_pph,
  d.department_name,
  COUNT(DISTINCT wa.id) FILTER (WHERE wa.removed_at IS NULL) as active_projects,
  COUNT(DISTINCT wac.id) as total_accounts,
  w.bgc_expiration_date,
  CASE
    WHEN w.bgc_expiration_date IS NULL THEN 'No BGC'
    WHEN w.bgc_expiration_date < CURRENT_DATE THEN 'EXPIRED'
    WHEN w.bgc_expiration_date < CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
    ELSE 'Valid'
  END as bgc_status
FROM public.workers w
LEFT JOIN public.departments d ON w.department_id = d.id
LEFT JOIN public.worker_assignments wa ON w.id = wa.worker_id
LEFT JOIN public.worker_accounts wac ON w.id = wac.worker_id
GROUP BY w.id, w.full_name, w.status, w.email_pph, d.department_name, w.bgc_expiration_date, w.created_at
ORDER BY w.created_at
LIMIT 10;

-- ============================================================================
-- SEED SCRIPT COMPLETE
-- ============================================================================
-- Run verification queries above to confirm successful seeding
-- Admin user: 76cf385a-e840-4130-be9c-f508a5df9ea2
-- ============================================================================
