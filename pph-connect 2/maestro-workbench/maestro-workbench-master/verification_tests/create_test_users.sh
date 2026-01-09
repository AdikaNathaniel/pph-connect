#!/bin/bash

# Test User Creation Script for Messaging System
# This script creates test users with different roles to test the messaging system

BASE_URL="https://nrocepvrheipthrqzwex.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb2NlcHZyaGVpcHRocnF6d2V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTE5NzksImV4cCI6MjA3NzIyNzk3OX0.m7ZqA3BqBxNPU2UKSyrjKvf7VFW0Q38rWIrXUPBqQ6g"

echo "=========================================="
echo "Creating Test Users for Messaging System"
echo "=========================================="
echo ""

# Function to create a user using create-root-user (no auth required)
create_user() {
  local email=$1
  local password=$2
  local role=$3

  echo "Creating user: $email ($role)..."

  response=$(curl -s -X POST \
    "${BASE_URL}/functions/v1/create-root-user" \
    -H "apikey: ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\",\"role\":\"${role}\"}")

  echo "Response: $response"
  echo ""
}

# Create test users with different roles

echo "1. Creating ROOT user..."
create_user "root@test.com" "RootPass123!" "root"

echo "2. Creating ADMIN user..."
create_user "admin@test.com" "AdminPass123!" "admin"

echo "3. Creating MANAGER user..."
create_user "manager@test.com" "ManagerPass123!" "manager"

echo "4. Creating TEAM LEAD user..."
create_user "teamlead@test.com" "TeamLeadPass123!" "team_lead"

echo "5. Creating WORKER 1..."
create_user "worker1@test.com" "Worker1Pass123!" "worker"

echo "6. Creating WORKER 2..."
create_user "worker2@test.com" "Worker2Pass123!" "worker"

echo "=========================================="
echo "Test Users Created!"
echo "=========================================="
echo ""
echo "Login credentials:"
echo "  Root:      root@test.com / RootPass123!"
echo "  Admin:     admin@test.com / AdminPass123!"
echo "  Manager:   manager@test.com / ManagerPass123!"
echo "  Team Lead: teamlead@test.com / TeamLeadPass123!"
echo "  Worker 1:  worker1@test.com / Worker1Pass123!"
echo "  Worker 2:  worker2@test.com / Worker2Pass123!"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:8080 in your browser"
echo "2. Login with any of the accounts above"
echo "3. Navigate to Messages to test the messaging system"
echo ""
