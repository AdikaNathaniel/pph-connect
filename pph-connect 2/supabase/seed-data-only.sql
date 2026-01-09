-- ============================================================================
-- PPH Connect Database Seed Script (Data Only - No Auth Users)
-- ============================================================================
-- Purpose: Populate database with sample data (departments, teams, workers, projects)
-- Note: Auth users and profiles should be created separately via Supabase Dashboard
-- Created: 2026-01-08
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
-- 2. TEAMS (will use dummy profile IDs for team_lead_id - update manually later)
-- ============================================================================
INSERT INTO public.teams (id, team_name, language_code, language_name, department_id, is_active, created_at)
VALUES
  ('t1111111-1111-1111-1111-111111111111', 'English Speech Team', 'en-US', 'English (US)', '11111111-1111-1111-1111-111111111111', true, NOW()),
  ('t2222222-2222-2222-2222-222222222222', 'Spanish Speech Team', 'es-ES', 'Spanish (Spain)', '11111111-1111-1111-1111-111111111111', true, NOW()),
  ('t3333333-3333-3333-3333-333333333333', 'French NLP Team', 'fr-FR', 'French', '44444444-4444-4444-4444-444444444444', true, NOW()),
  ('t4444444-4444-4444-4444-444444444444', 'Mandarin CV Team', 'zh-CN', 'Mandarin Chinese', '33333333-3333-3333-3333-333333333333', true, NOW()),
  ('t5555555-5555-5555-5555-555555555555', 'German Audio Team', 'de-DE', 'German', '11111111-1111-1111-1111-111111111111', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. WORKERS
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
-- VERIFICATION QUERIES
-- ============================================================================
SELECT
  'Departments' as table_name, COUNT(*) as record_count FROM public.departments
UNION ALL
SELECT 'Teams', COUNT(*) FROM public.teams
UNION ALL
SELECT 'Workers', COUNT(*) FROM public.workers;

-- Show sample data
SELECT
  w.first_name || ' ' || w.last_name as worker_name,
  w.status,
  d.department_name,
  w.country
FROM public.workers w
LEFT JOIN public.departments d ON w.department_id = d.id
WHERE w.is_deleted = false
ORDER BY w.created_at
LIMIT 10;
