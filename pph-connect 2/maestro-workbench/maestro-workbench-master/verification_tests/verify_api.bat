@echo off
echo === MESSAGING SYSTEM VERIFICATION ===
echo.

set SUPABASE_URL=http://127.0.0.1:54321
set API_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz

echo 1. Checking departments table...
curl -s -X GET "%SUPABASE_URL%/rest/v1/departments?select=id&limit=0" -H "apikey: %API_KEY%" -H "Authorization: Bearer %API_KEY%" > nul 2>&1
if %errorlevel% equ 0 (
    echo    [OK] departments table exists
) else (
    echo    [FAIL] departments table not found
)

echo.
echo 2. Checking message_threads table...
curl -s -X GET "%SUPABASE_URL%/rest/v1/message_threads?select=id&limit=0" -H "apikey: %API_KEY%" -H "Authorization: Bearer %API_KEY%" > nul 2>&1
if %errorlevel% equ 0 (
    echo    [OK] message_threads table exists
) else (
    echo    [FAIL] message_threads table not found
)

echo.
echo 3. Checking messages table...
curl -s -X GET "%SUPABASE_URL%/rest/v1/messages?select=id&limit=0" -H "apikey: %API_KEY%" -H "Authorization: Bearer %API_KEY%" > nul 2>&1
if %errorlevel% equ 0 (
    echo    [OK] messages table exists
) else (
    echo    [FAIL] messages table not found
)

echo.
echo 4. Checking message_recipients table...
curl -s -X GET "%SUPABASE_URL%/rest/v1/message_recipients?select=id&limit=0" -H "apikey: %API_KEY%" -H "Authorization: Bearer %API_KEY%" > nul 2>&1
if %errorlevel% equ 0 (
    echo    [OK] message_recipients table exists
) else (
    echo    [FAIL] message_recipients table not found
)

echo.
echo 5. Checking message_groups table...
curl -s -X GET "%SUPABASE_URL%/rest/v1/message_groups?select=id&limit=0" -H "apikey: %API_KEY%" -H "Authorization: Bearer %API_KEY%" > nul 2>&1
if %errorlevel% equ 0 (
    echo    [OK] message_groups table exists
) else (
    echo    [FAIL] message_groups table not found
)

echo.
echo 6. Checking profiles columns (department_id, reports_to)...
curl -s -X GET "%SUPABASE_URL%/rest/v1/profiles?select=department_id,reports_to&limit=1" -H "apikey: %API_KEY%" -H "Authorization: Bearer %API_KEY%" > nul 2>&1
if %errorlevel% equ 0 (
    echo    [OK] profiles has new columns
) else (
    echo    [FAIL] profiles missing new columns
)

echo.
echo === VERIFICATION COMPLETE ===
