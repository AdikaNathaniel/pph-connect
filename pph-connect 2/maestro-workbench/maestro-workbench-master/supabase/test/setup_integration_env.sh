#!/usr/bin/env bash
set -euo pipefail

# Bootstraps a local Supabase stack for integration testing.
# Requires: supabase CLI, docker, and an .env.integration file at repo root.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env.integration"
CONFIG_FILE="${REPO_ROOT}/supabase/config.toml"
SEED_SQL="${REPO_ROOT}/supabase/test/seed_integration_data.sql"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is required. Install via https://supabase.com/docs/reference/cli" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo ".env.integration not found. Copy .env.integration.example and fill in credentials." >&2
  exit 1
fi

echo "Starting local Supabase stack for integration tests..."
supabase start --config "${CONFIG_FILE}" --debug

echo "Resetting database with latest migrations..."
supabase db reset --local --debug --env-file "${ENV_FILE}"

echo "Replaying migrations to ensure schema parity..."
supabase migration up --local --env-file "${ENV_FILE}"

if [[ -f "${SEED_SQL}" ]]; then
  echo "Loading seed integration data..."
  supabase db query "${SEED_SQL}" --local --env-file "${ENV_FILE}"
fi

echo "Integration database ready. Connection details saved to ${ENV_FILE}."
