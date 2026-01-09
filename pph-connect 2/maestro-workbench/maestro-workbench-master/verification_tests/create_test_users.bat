@echo off
REM Test User Creation Script for Messaging System
REM This script creates test users with different roles to test the messaging system

SET BASE_URL=https://nrocepvrheipthrqzwex.supabase.co
SET ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb2NlcHZyaGVpcHRocnF6d2V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTE5NzksImV4cCI6MjA3NzIyNzk3OX0.m7ZqA3BqBxNPU2UKSyrjKvf7VFW0Q38rWIrXUPBqQ6g

echo ==========================================
echo Creating Test Users for Messaging System
echo ==========================================
echo.

echo 1. Creating ROOT user...
curl -X POST "%BASE_URL%/functions/v1/create-root-user" ^
  -H "apikey: %ANON_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"root@test.com\",\"password\":\"RootPass123!\",\"role\":\"root\"}"
echo.
echo.

echo 2. Creating ADMIN user...
curl -X POST "%BASE_URL%/functions/v1/create-root-user" ^
  -H "apikey: %ANON_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@test.com\",\"password\":\"AdminPass123!\",\"role\":\"admin\"}"
echo.
echo.

echo 3. Creating MANAGER user...
curl -X POST "%BASE_URL%/functions/v1/create-root-user" ^
  -H "apikey: %ANON_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"manager@test.com\",\"password\":\"ManagerPass123!\",\"role\":\"manager\"}"
echo.
echo.

echo 4. Creating TEAM LEAD user...
curl -X POST "%BASE_URL%/functions/v1/create-root-user" ^
  -H "apikey: %ANON_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"teamlead@test.com\",\"password\":\"TeamLeadPass123!\",\"role\":\"team_lead\"}"
echo.
echo.

echo 5. Creating WORKER 1...
curl -X POST "%BASE_URL%/functions/v1/create-root-user" ^
  -H "apikey: %ANON_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"worker1@test.com\",\"password\":\"Worker1Pass123!\",\"role\":\"worker\"}"
echo.
echo.

echo 6. Creating WORKER 2...
curl -X POST "%BASE_URL%/functions/v1/create-root-user" ^
  -H "apikey: %ANON_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"worker2@test.com\",\"password\":\"Worker2Pass123!\",\"role\":\"worker\"}"
echo.
echo.

echo ==========================================
echo Test Users Created!
echo ==========================================
echo.
echo Login credentials:
echo   Root:      root@test.com / RootPass123!
echo   Admin:     admin@test.com / AdminPass123!
echo   Manager:   manager@test.com / ManagerPass123!
echo   Team Lead: teamlead@test.com / TeamLeadPass123!
echo   Worker 1:  worker1@test.com / Worker1Pass123!
echo   Worker 2:  worker2@test.com / Worker2Pass123!
echo.
echo Next steps:
echo 1. Open http://localhost:8080 in your browser
echo 2. Login with any of the accounts above
echo 3. Navigate to Messages to test the messaging system
echo.
pause
