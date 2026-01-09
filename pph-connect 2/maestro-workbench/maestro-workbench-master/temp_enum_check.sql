-- Query to check enum values
SELECT unnest(enum_range(NULL::user_role)) as role_value;