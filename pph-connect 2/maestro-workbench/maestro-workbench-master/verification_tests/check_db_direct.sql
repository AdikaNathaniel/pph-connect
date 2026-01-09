-- Direct database queries to check what exists
-- Run with: docker exec supabase_db_nrocepvrheipthrqzwex psql -U postgres -d postgres -f /path/to/check_db_direct.sql

-- Check if any tables exist in public schema
SELECT
    'Tables in public schema:' as info,
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check enum types
SELECT
    'Enum types:' as info,
    typname as enum_name,
    enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname = 'user_role'
ORDER BY enumsortorder;

-- Check functions
SELECT
    'Functions:' as info,
    proname as function_name
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
AND proname LIKE '%message%' OR proname LIKE '%can_%'
ORDER BY proname;

-- Check migration history
SELECT
    'Migration history:' as info,
    version,
    inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version;
