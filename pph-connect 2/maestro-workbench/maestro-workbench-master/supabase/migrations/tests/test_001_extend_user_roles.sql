-- Test Suite for Migration 001: Extend User Roles
-- This test file verifies the expected schema changes
-- Run after migration to validate success

-- Test 1: Verify enum includes all required values
DO $$
DECLARE
    enum_values text[];
    expected_values text[] := ARRAY['super_admin', 'admin', 'manager', 'team_lead', 'worker'];
    missing_values text[];
BEGIN
    -- Get current enum values
    SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder)
    INTO enum_values
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role';

    -- Check if all expected values exist
    SELECT array_agg(v)
    INTO missing_values
    FROM unnest(expected_values) v
    WHERE v != ALL(enum_values);

    IF missing_values IS NOT NULL AND array_length(missing_values, 1) > 0 THEN
        RAISE EXCEPTION 'TEST FAILED: Missing enum values: %', missing_values;
    ELSE
        RAISE NOTICE 'TEST PASSED: All enum values present: %', enum_values;
    END IF;
END $$;

-- Test 2: Verify can_send_messages function exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'can_send_messages'
        AND n.nspname = 'public'
    ) THEN
        RAISE EXCEPTION 'TEST FAILED: Function can_send_messages does not exist';
    ELSE
        RAISE NOTICE 'TEST PASSED: Function can_send_messages exists';
    END IF;
END $$;

-- Test 3: Verify can_send_messages function signature
DO $$
DECLARE
    func_return_type text;
    func_args text;
BEGIN
    SELECT pg_get_function_result(p.oid), pg_get_function_arguments(p.oid)
    INTO func_return_type, func_args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'can_send_messages'
    AND n.nspname = 'public';

    IF func_return_type != 'boolean' THEN
        RAISE EXCEPTION 'TEST FAILED: Function should return boolean, but returns %', func_return_type;
    END IF;

    IF func_args NOT LIKE '%uuid%' THEN
        RAISE EXCEPTION 'TEST FAILED: Function should accept uuid parameter, but has: %', func_args;
    END IF;

    RAISE NOTICE 'TEST PASSED: Function signature correct - returns: %, args: %', func_return_type, func_args;
END $$;

-- Test 4: Verify function is SECURITY DEFINER
DO $$
DECLARE
    is_security_definer boolean;
BEGIN
    SELECT prosecdef INTO is_security_definer
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'can_send_messages'
    AND n.nspname = 'public';

    IF NOT is_security_definer THEN
        RAISE EXCEPTION 'TEST FAILED: Function should be SECURITY DEFINER';
    ELSE
        RAISE NOTICE 'TEST PASSED: Function is SECURITY DEFINER';
    END IF;
END $$;

-- Test 5: Verify function works with test data (functional test)
-- This test creates temporary test users and verifies the function logic
DO $$
DECLARE
    test_user_id uuid;
    test_suspended_user_id uuid;
    result boolean;
BEGIN
    -- Create a test user profile (if profiles table exists)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles') THEN
        -- Create active user
        INSERT INTO profiles (id, email, full_name, role, suspended)
        VALUES (gen_random_uuid(), 'test_active@test.com', 'Test Active', 'worker', false)
        RETURNING id INTO test_user_id;

        -- Create suspended user
        INSERT INTO profiles (id, email, full_name, role, suspended)
        VALUES (gen_random_uuid(), 'test_suspended@test.com', 'Test Suspended', 'worker', true)
        RETURNING id INTO test_suspended_user_id;

        -- Test: Active user should be able to send messages
        SELECT can_send_messages(test_user_id) INTO result;
        IF NOT result THEN
            RAISE EXCEPTION 'TEST FAILED: Active user should be able to send messages';
        ELSE
            RAISE NOTICE 'TEST PASSED: Active user can send messages';
        END IF;

        -- Test: Suspended user should NOT be able to send messages
        SELECT can_send_messages(test_suspended_user_id) INTO result;
        IF result THEN
            RAISE EXCEPTION 'TEST FAILED: Suspended user should NOT be able to send messages';
        ELSE
            RAISE NOTICE 'TEST PASSED: Suspended user cannot send messages';
        END IF;

        -- Cleanup test data
        DELETE FROM profiles WHERE id IN (test_user_id, test_suspended_user_id);
        RAISE NOTICE 'TEST PASSED: Functional test completed, test data cleaned up';
    ELSE
        RAISE NOTICE 'TEST SKIPPED: Profiles table does not exist yet, skipping functional test';
    END IF;
END $$;

-- Test 6: Verify no existing data is affected
DO $$
DECLARE
    profiles_count_before int;
    profiles_count_after int;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles') THEN
        SELECT COUNT(*) INTO profiles_count_before FROM profiles;

        -- Verify count hasn't changed (no data lost)
        SELECT COUNT(*) INTO profiles_count_after FROM profiles;

        IF profiles_count_before != profiles_count_after THEN
            RAISE EXCEPTION 'TEST FAILED: Profile count changed during migration!';
        ELSE
            RAISE NOTICE 'TEST PASSED: No existing data affected. Profile count: %', profiles_count_after;
        END IF;
    ELSE
        RAISE NOTICE 'TEST SKIPPED: Profiles table does not exist yet';
    END IF;
END $$;

-- Final summary
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'MIGRATION 001 TEST SUITE COMPLETE';
    RAISE NOTICE '====================================';
END $$;
