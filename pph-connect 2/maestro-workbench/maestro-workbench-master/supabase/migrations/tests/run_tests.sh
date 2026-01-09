#!/bin/bash

# Test Runner for Database Migrations
# This script runs migration tests against a Supabase database
# Usage: ./run_tests.sh <migration_number>
# Example: ./run_tests.sh 001

set -e  # Exit on error

MIGRATION_NUM="${1:-001}"
TEST_FILE="test_${MIGRATION_NUM}_*.sql"
MIGRATION_FILE="../20251029_${MIGRATION_NUM}_*.sql"

echo "=================================================="
echo "Migration Test Runner"
echo "=================================================="
echo "Migration: ${MIGRATION_NUM}"
echo "Date: $(date)"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "ERROR: Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if we're linked to a project
if [ ! -f "../.supabase/config.toml" ]; then
    echo "ERROR: Not linked to a Supabase project"
    echo "Run: supabase link --project-ref <your-project-ref>"
    exit 1
fi

echo "✓ Supabase CLI found"
echo "✓ Project linked"
echo ""

# Apply migration
echo "Step 1: Applying migration..."
echo "----------------------------------------"
supabase db push || {
    echo "ERROR: Failed to apply migration"
    exit 1
}
echo "✓ Migration applied successfully"
echo ""

# Run tests
echo "Step 2: Running tests..."
echo "----------------------------------------"
for test in $TEST_FILE; do
    if [ -f "$test" ]; then
        echo "Running test: $test"
        supabase db execute --file "$test" || {
            echo "ERROR: Test failed: $test"
            exit 1
        }
        echo ""
    else
        echo "ERROR: Test file not found: $test"
        exit 1
    fi
done

echo "=================================================="
echo "✓ All tests passed!"
echo "=================================================="
