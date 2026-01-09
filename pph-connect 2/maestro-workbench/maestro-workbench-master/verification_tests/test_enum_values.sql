-- Test enum values
-- This file can be used to verify the user_role enum contains all expected values

-- Query 1: Get all enum values
SELECT
  unnest(enum_range(NULL::user_role)) as role_value
ORDER BY role_value;

-- Query 2: Expected result should include:
-- Expected output:
-- admin
-- manager
-- root
-- team_lead
-- worker
