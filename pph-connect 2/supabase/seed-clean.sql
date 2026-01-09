-- ============================================================================
-- PPH Connect Database Seed Script (Clean Version)
-- ============================================================================
-- Purpose: Populate database with sample data for development and testing
-- Created: 2026-01-08
-- Usage: Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. DEPARTMENTS
-- ============================================================================
INSERT INTO public.departments (id, department_name, department_code, description, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Speech & Audio', 'SPEECH', 'Speech recognition and audio annotation projects', true),
  ('22222222-2222-2222-2222-222222222222', 'MLDO (Machine Learning Data Ops)', 'MLDO', 'Machine learning data operations and model training', true),
  ('33333333-3333-3333-3333-333333333333', 'Computer Vision', 'CV', 'Image and video annotation projects', true),
  ('44444444-4444-4444-4444-444444444444', 'NLP (Natural Language Processing)', 'NLP', 'Text annotation and language processing', true),
  ('55555555-5555-5555-5555-555555555555', 'Quality Assurance', 'QA', 'Quality control and verification team', true),
  ('66666666-6666-6666-6666-666666666666', 'Default Department', 'DEFAULT', 'Default department for new users', true)
ON CONFLICT (department_name) DO UPDATE SET
  department_code = EXCLUDED.department_code,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- 2. ADMIN USERS (Profiles)
-- ============================================================================
INSERT INTO public.profiles (id, email, full_name, role, department_id, created_at, updated_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@pph.com', 'Admin User', 'admin', '66666666-6666-6666-6666-666666666666', NOW(), NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'manager.speech@pph.com', 'Sarah Johnson', 'manager', '11111111-1111-1111-1111-111111111111', NOW(), NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'manager.mldo@pph.com', 'Michael Chen', 'manager', '22222222-2222-2222-2222-222222222222', NOW(), NOW()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'manager.cv@pph.com', 'Emily Rodriguez', 'manager', '33333333-3333-3333-3333-333333333333', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  department_id = EXCLUDED.department_id,
  updated_at = NOW();

-- ============================================================================
-- 3. TEAMS
-- ============================================================================
INSERT INTO public.teams (id, team_name, language_code, language_name, department_id, team_lead_id, is_active, created_at)
VALUES
  ('t1111111-1111-1111-1111-111111111111', 'English Speech Team', 'en-US', 'English (US)', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true, NOW()),
  ('t2222222-2222-2222-2222-222222222222', 'Spanish Speech Team', 'es-ES', 'Spanish (Spain)', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true, NOW()),
  ('t3333333-3333-3333-3333-333333333333', 'French NLP Team', 'fr-FR', 'French', '44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true, NOW()),
  ('t4444444-4444-4444-4444-444444444444', 'Mandarin CV Team', 'zh-CN', 'Mandarin Chinese', '33333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd', true, NOW()),
  ('t5555555-5555-5555-5555-555555555555', 'German Audio Team', 'de-DE', 'German', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. WORKERS
-- ============================================================================
INSERT INTO public.workers (id, first_name, last_name, email_personal, email_pph, status, department_id, hire_date, bgc_expiration_date, country, city, timezone, phone_number, is_deleted, created_at, updated_at)
VALUES
  ('w1111111-1111-1111-1111-111111111111', 'John', 'Doe', 'john.doe@gmail.com', 'john.doe@pph.com', 'active', '11111111-1111-1111-1111-111111111111', '2024-01-15', '2025-12-31', 'United States', 'New York', 'America/New_York', '+1-555-0101', false, NOW(), NOW()),
  ('w2222222-2222-2222-2222-222222222222', 'Jane', 'Smith', 'jane.smith@gmail.com', 'jane.smith@pph.com', 'active', '11111111-1111-1111-1111-111111111111', '2024-02-20', '2025-11-30', 'United States', 'Los Angeles', 'America/Los_Angeles', '+1-555-0102', false, NOW(), NOW()),
  ('w3333333-3333-3333-3333-333333333333', 'Carlos', 'Garcia', 'carlos.garcia@gmail.com', 'carlos.garcia@pph.com', 'active', '11111111-1111-1111-1111-111111111111', '2024-03-10', '2026-03-10', 'Spain', 'Madrid', 'Europe/Madrid', '+34-555-0103', false, NOW(), NOW()),
  ('w4444444-4444-4444-4444-444444444444', 'Priya', 'Patel', 'priya.patel@gmail.com', 'priya.patel@pph.com', 'active', '22222222-2222-2222-2222-222222222222', '2024-01-25', '2026-01-25', 'India', 'Bangalore', 'Asia/Kolkata', '+91-555-0104', false, NOW(), NOW()),
  ('w5555555-5555-5555-5555-555555555555', 'Ahmed', 'Hassan', 'ahmed.hassan@gmail.com', 'ahmed.hassan@pph.com', 'active', '22222222-2222-2222-2222-222222222222', '2024-04-05', '2025-10-15', 'Egypt', 'Cairo', 'Africa/Cairo', '+20-555-0105', false, NOW(), NOW()),
  ('w6666666-6666-6666-6666-666666666666', 'Li', 'Wei', 'li.wei@gmail.com', 'li.wei@pph.com', 'active', '33333333-3333-3333-3333-333333333333', '2024-02-14', '2026-02-14', 'China', 'Beijing', 'Asia/Shanghai', '+86-555-0106', false, NOW(), NOW()),
  ('w7777777-7777-7777-7777-777777777777', 'Sophie', 'Mueller', 'sophie.mueller@gmail.com', 'sophie.mueller@pph.com', 'active', '33333333-3333-3333-3333-333333333333', '2024-05-20', '2025-09-30', 'Germany', 'Berlin', 'Europe/Berlin', '+49-555-0107', false, NOW(), NOW()),
  ('w8888888-8888-8888-8888-888888888888', 'Maria', 'Silva', 'maria.silva@gmail.com', 'maria.silva@pph.com', 'pending', '44444444-4444-4444-4444-444444444444', '2025-01-05', NULL, 'Brazil', 'São Paulo', 'America/Sao_Paulo', '+55-555-0108', false, NOW(), NOW()),
  ('w9999999-9999-9999-9999-999999999999', 'Yuki', 'Tanaka', 'yuki.tanaka@gmail.com', 'yuki.tanaka@pph.com', 'training', '33333333-3333-3333-3333-333333333333', '2024-12-15', '2026-06-15', 'Japan', 'Tokyo', 'Asia/Tokyo', '+81-555-0109', false, NOW(), NOW()),
  ('w1010101-1010-1010-1010-101010101010', 'Anna', 'Kowalski', 'anna.kowalski@gmail.com', 'anna.kowalski@pph.com', 'on_leave', '11111111-1111-1111-1111-111111111111', '2023-11-10', '2025-11-10', 'Poland', 'Warsaw', 'Europe/Warsaw', '+48-555-0110', false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. WORKER ACCOUNTS
-- ============================================================================
INSERT INTO public.worker_accounts (id, worker_id, platform, account_username, account_email, status, created_at, updated_at, created_by, notes)
VALUES
  ('wa111111-1111-1111-1111-111111111111', 'w1111111-1111-1111-1111-111111111111', 'maestro', 'john.doe', 'john.doe@pph.com', 'active', NOW(), NOW(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Primary Maestro account'),
  ('wa111112-1111-1111-1111-111111111111', 'w1111111-1111-1111-1111-111111111111', 'data_compute', 'jdoe_dc', 'john.doe@pph.com', 'active', NOW(), NOW(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'DataCompute account'),
  ('wa222221-2222-2222-2222-222222222222', 'w2222222-2222-2222-2222-222222222222', 'maestro', 'jane.smith', 'jane.smith@pph.com', 'active', NOW(), NOW(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Primary account'),
  ('wa222222-2222-2222-2222-222222222222', 'w2222222-2222-2222-2222-222222222222', 'data_compute', 'jsmith_dc', 'jane.smith@pph.com', 'active', NOW(), NOW(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'DC account'),
  ('wa333331-3333-3333-3333-333333333333', 'w3333333-3333-3333-3333-333333333333', 'maestro', 'carlos.garcia', 'carlos.garcia@pph.com', 'active', NOW(), NOW(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Primary account'),
  ('wa444441-4444-4444-4444-444444444444', 'w4444444-4444-4444-4444-444444444444', 'maestro', 'priya.patel', 'priya.patel@pph.com', 'active', NOW(), NOW(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Main Maestro'),
  ('wa444442-4444-4444-4444-444444444444', 'w4444444-4444-4444-4444-444444444444', 'scale_ai', 'priya.patel.scale', 'priya.patel@pph.com', 'active', NOW(), NOW(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Scale AI account'),
  ('wa888881-8888-8888-8888-888888888888', 'w8888888-8888-8888-8888-888888888888', 'maestro', 'maria.silva', 'maria.silva@pph.com', 'pending', NOW(), NOW(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Awaiting approval')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. WORKFORCE PROJECTS
-- ============================================================================
INSERT INTO public.workforce_projects (id, project_name, project_code, client_name, description, status, start_date, end_date, estimated_hours, budget, department_id, created_by, created_at)
VALUES
  ('p1111111-1111-1111-1111-111111111111', 'Voice Assistant Training - English', 'VA-ENG-2024', 'TechCorp AI', 'Train voice assistant model with English speech data', 'active', '2024-01-15', '2025-06-30', 5000, 125000.00, '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW()),
  ('p2222222-2222-2222-2222-222222222222', 'Medical Image Annotation', 'MED-IMG-2024', 'HealthTech Solutions', 'Annotate medical images for ML model training', 'active', '2024-03-01', '2025-12-31', 8000, 240000.00, '33333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NOW()),
  ('p3333333-3333-3333-3333-333333333333', 'Spanish Audio Transcription', 'AUD-SPA-2024', 'MediaStream Inc', 'Transcribe and annotate Spanish audio content', 'active', '2024-02-10', '2025-08-15', 3500, 87500.00, '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW()),
  ('p4444444-4444-4444-4444-444444444444', 'Sentiment Analysis Dataset', 'NLP-SENT-2024', 'SocialMetrics AI', 'Create sentiment analysis training dataset', 'active', '2024-04-01', '2025-10-30', 4200, 105000.00, '44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NOW()),
  ('p5555555-5555-5555-5555-555555555555', 'Autonomous Driving Labels', 'CV-AUTO-2024', 'AutoDrive Systems', 'Label objects in autonomous driving footage', 'planning', '2025-02-01', '2026-01-31', 12000, 360000.00, '33333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NOW()),
  ('p6666666-6666-6666-6666-666666666666', 'Chatbot Training Data', 'NLP-CHAT-2023', 'ConvoAI', 'Historical chatbot training project', 'completed', '2023-06-01', '2024-02-28', 6000, 150000.00, '44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. PROJECT TEAMS
-- ============================================================================
INSERT INTO public.project_teams (id, project_id, team_id, role_description, assigned_at, created_by)
VALUES
  ('pt11111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111111', 'Primary annotation team', NOW(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('pt22222-2222-2222-2222-222222222222', 'p3333333-3333-3333-3333-333333333333', 't2222222-2222-2222-2222-222222222222', 'Spanish transcription team', NOW(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('pt33333-3333-3333-3333-333333333333', 'p2222222-2222-2222-2222-222222222222', 't4444444-4444-4444-4444-444444444444', 'Image annotation team', NOW(), 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('pt44444-4444-4444-4444-444444444444', 'p4444444-4444-4444-4444-444444444444', 't3333333-3333-3333-3333-333333333333', 'NLP annotation team', NOW(), 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('pt55555-5555-5555-5555-555555555555', 'p1111111-1111-1111-1111-111111111111', 't5555555-5555-5555-5555-555555555555', 'German voice team', NOW(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. WORKER ASSIGNMENTS
-- ============================================================================
INSERT INTO public.worker_assignments (id, worker_id, project_id, assigned_at, assigned_by, status, role_on_project, estimated_hours_allocated)
VALUES
  ('wass1111-1111-1111-1111-111111111111', 'w1111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', '2024-01-20', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'active', 'Annotator', 160),
  ('wass2222-2222-2222-2222-222222222222', 'w2222222-2222-2222-2222-222222222222', 'p1111111-1111-1111-1111-111111111111', '2024-02-25', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'active', 'Senior Annotator', 200),
  ('wass3333-3333-3333-3333-333333333333', 'w3333333-3333-3333-3333-333333333333', 'p3333333-3333-3333-3333-333333333333', '2024-03-15', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'active', 'Lead Transcriber', 180),
  ('wass4444-4444-4444-4444-444444444444', 'w4444444-4444-4444-4444-444444444444', 'p4444444-4444-4444-4444-444444444444', '2024-04-05', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'active', 'NLP Annotator', 160),
  ('wass6666-6666-6666-6666-666666666666', 'w6666666-6666-6666-6666-666666666666', 'p2222222-2222-2222-2222-222222222222', '2024-03-10', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'active', 'Image Annotator', 200),
  ('wass7777-7777-7777-7777-777777777777', 'w7777777-7777-7777-7777-777777777777', 'p2222222-2222-2222-2222-222222222222', '2024-05-25', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'active', 'QA Reviewer', 120),
  ('wass9999-9999-9999-9999-999999999999', 'w9999999-9999-9999-9999-999999999999', 'p2222222-2222-2222-2222-222222222222', '2024-12-20', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'training', 'Trainee Annotator', 40)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. WORK STATS
-- ============================================================================
INSERT INTO public.work_stats (id, worker_id, project_id, stat_date, tasks_completed, tasks_attempted, accuracy_score, hours_worked, created_at)
VALUES
  ('ws111111-1111-1111-1111-111111111111', 'w1111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '7 days', 145, 150, 96.5, 38, NOW()),
  ('ws111112-1111-1111-1111-111111111111', 'w1111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '14 days', 138, 145, 95.2, 40, NOW()),
  ('ws222221-2222-2222-2222-222222222222', 'w2222222-2222-2222-2222-222222222222', 'p1111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '7 days', 180, 185, 98.3, 40, NOW()),
  ('ws333331-3333-3333-3333-333333333333', 'w3333333-3333-3333-3333-333333333333', 'p3333333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '7 days', 125, 132, 94.7, 35, NOW()),
  ('ws666661-6666-6666-6666-666666666666', 'w6666666-6666-6666-6666-666666666666', 'p2222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '7 days', 95, 100, 97.0, 38, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
SELECT
  'Departments' as table_name, COUNT(*) as record_count FROM public.departments
UNION ALL
SELECT 'Profiles', COUNT(*) FROM public.profiles
UNION ALL
SELECT 'Teams', COUNT(*) FROM public.teams
UNION ALL
SELECT 'Workers', COUNT(*) FROM public.workers
UNION ALL
SELECT 'Worker Accounts', COUNT(*) FROM public.worker_accounts
UNION ALL
SELECT 'Workforce Projects', COUNT(*) FROM public.workforce_projects
UNION ALL
SELECT 'Project Teams', COUNT(*) FROM public.project_teams
UNION ALL
SELECT 'Worker Assignments', COUNT(*) FROM public.worker_assignments
UNION ALL
SELECT 'Work Stats', COUNT(*) FROM public.work_stats;
