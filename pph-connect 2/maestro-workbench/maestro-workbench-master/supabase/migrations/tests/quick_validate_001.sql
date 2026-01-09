-- Quick Validation Script for Migration 001
-- Run this for a quick check without full test suite
-- Usage: Copy and paste into Supabase Dashboard SQL Editor

\echo '=================================================='
\echo 'Quick Validation: Migration 001'
\echo '=================================================='

-- 1. Check enum values
\echo '\n1. Checking user_role enum values...'
SELECT enumlabel as role_value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;

-- 2. Check function exists
\echo '\n2. Checking can_send_messages function...'
SELECT
    p.proname as function_name,
    pg_get_function_result(p.oid) as returns,
    pg_get_function_arguments(p.oid) as arguments,
    CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
    CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE'
        WHEN 's' THEN 'STABLE'
        WHEN 'v' THEN 'VOLATILE'
    END as volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'can_send_messages'
AND n.nspname = 'public';

-- 3. Check profile count (data integrity)
\echo '\n3. Checking data integrity...'
SELECT
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN role = 'root' THEN 1 END) as root_users,
    COUNT(CASE WHEN role = 'manager' THEN 1 END) as managers,
    COUNT(CASE WHEN role = 'worker' THEN 1 END) as workers,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
    COUNT(CASE WHEN role = 'team_lead' THEN 1 END) as team_leads
FROM profiles;

-- 4. Test function with first active user (if exists)
\echo '\n4. Testing function with sample user...'
SELECT
    p.id as user_id,
    p.email,
    p.role,
    p.suspended,
    can_send_messages(p.id) as can_send
FROM profiles p
LIMIT 5;

\echo '\n=================================================='
\echo 'Validation Complete!'
\echo '=================================================='
\echo 'Expected results:'
\echo '  - Enum should have 5 values'
\echo '  - Function should exist with SECURITY DEFINER'
\echo '  - Profile counts should be unchanged'
\echo '  - Active users should have can_send = true'
\echo '  - Suspended users should have can_send = false'
\echo '=================================================='
