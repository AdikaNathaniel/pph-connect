#!/bin/bash
# Script to check what's in the database

echo "=== Checking Supabase Migration Status ==="
echo ""
echo "Migration files in migrations directory:"
ls -la ../supabase/migrations/*.sql | tail -10
echo ""
echo "=== Migration List from Supabase ==="
supabase migration list
