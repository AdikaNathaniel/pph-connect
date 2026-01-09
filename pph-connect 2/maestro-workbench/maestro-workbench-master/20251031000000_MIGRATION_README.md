# Schema Migration: Add Missing Components

**Migration Date:** 2025-10-31
**Migration ID:** 20251031000000

## Overview

This migration adds missing schema components to align your database with the reference schema. It adds support for:

1. **Audio Asset Management** - Complete pipeline for managing audio files from Google Drive
2. **Review Workflow** - Multi-stage review process with dedicated reviewers
3. **Quality Control** - QC stage after review for final validation
4. **Import Tracking** - Better visibility into asset import progress
5. **Role-Based Workflows** - Workers can have different permissions (transcribe/review/QC)

## What's Added

### New Tables (7)

| Table | Purpose |
|-------|---------|
| `audio_assets` | Stores audio files, tracks transfer from Google Drive to Supabase storage |
| `audio_asset_events` | Logs all events during audio asset processing (ingestion, transfer, errors) |
| `review_tasks` | Manages assignment of transcribed answers to reviewers |
| `review_submissions` | Stores review results, ratings, feedback, and highlight tags |
| `qc_records` | Quality control records after review stage |
| `final_answers` | Finalized deliverable answers ready for export |
| `question_asset_status` | Central tracking table for complete question lifecycle |

### New Columns (15)

#### task_templates
- `review_enabled` - Flag to enable review stage for this template
- `review_stage_config` - JSON configuration for review stage

#### projects
- `import_expected_assets` - Total number of assets to import
- `import_ready_assets` - Number of assets successfully imported
- `import_failed_assets` - Number of assets that failed to import
- `import_started_at` - When import process began
- `import_last_updated` - Last update to import status

#### project_assignments
- `can_transcribe` - Worker can do transcription tasks
- `can_review` - Worker can do review tasks
- `can_qc` - Worker can do QC tasks
- `priority_transcribe` - Priority for transcription work (default: 50)
- `priority_review` - Priority for review work (default: 10)
- `priority_qc` - Priority for QC work (default: 90)

#### questions
- `audio_asset_id` - Reference to associated audio file
- `supabase_audio_path` - Path to audio file in Supabase storage

### Updated Constraints

#### task_templates.modality
Added `'chatbot-eval'` to allowed modality types.

#### projects.status
Added `'importing'` and `'ready'` to allowed status values.

### Indexes (33)

All new tables have appropriate indexes on:
- Primary keys (automatic)
- Foreign keys (for efficient joins)
- Status columns (for filtering)
- Commonly queried columns (project_id, worker/reviewer IDs, etc.)

## Files Included

1. **20251031000000_add_missing_schema_components.sql** - Main migration script
2. **20251031000000_add_missing_schema_components_ROLLBACK.sql** - Rollback script
3. **20251031000000_add_missing_schema_components_VALIDATE.sql** - Validation script
4. **20251031000000_MIGRATION_README.md** - This documentation file

## How to Apply

### Option 1: Using Supabase CLI (Recommended)

```bash
# Make sure you're in the project root
cd C:\Users\hp\Documents\productive-playhouse\maestro_versions\1\Maestro-Workbench-main

# Apply the migration
supabase db push

# Or if you want to apply a specific migration
supabase migration up
```

### Option 2: Using psql

```bash
# Connect to your database
psql "your-connection-string-here"

# Run the migration
\i supabase/migrations/20251031000000_add_missing_schema_components.sql
```

### Option 3: Via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file: `20251031000000_add_missing_schema_components.sql`
4. Copy and paste the entire contents
5. Click **Run**

## How to Validate

After applying the migration, run the validation script:

```bash
# Using psql
psql "your-connection-string-here" -f supabase/migrations/20251031000000_add_missing_schema_components_VALIDATE.sql

# Or in psql interactive session
\i supabase/migrations/20251031000000_add_missing_schema_components_VALIDATE.sql
```

The validation script will check:
- ✓ All 7 new tables exist
- ✓ All 15 new columns were added
- ✓ CHECK constraints were updated correctly
- ✓ All foreign keys are in place
- ✓ All indexes were created
- ✓ Table structures match expected schemas

Look for **✓ PASS** indicators. If you see **✗ FAIL**, review the migration output for errors.

## How to Rollback

If you need to undo this migration:

⚠️ **WARNING:** Rolling back will **DELETE ALL DATA** in the new tables!

```bash
# Using psql
psql "your-connection-string-here" -f supabase/migrations/20251031000000_add_missing_schema_components_ROLLBACK.sql

# Or in psql interactive session
\i supabase/migrations/20251031000000_add_missing_schema_components_ROLLBACK.sql
```

The rollback script will:
1. Drop all 7 new tables (CASCADE)
2. Remove all 15 new columns
3. Restore original CHECK constraints
4. Remove all associated indexes

## New Workflow Capabilities

### Audio Asset Pipeline

```
Google Drive → audio_assets (queued) → transferring → ready → questions.audio_asset_id
                     ↓
            audio_asset_events (logs all steps)
```

### Question Lifecycle Tracking

```
questions → tasks → answers → review_tasks → review_submissions → qc_records → final_answers
                                    ↓
                        question_asset_status (tracks entire flow)
```

### Role-Based Assignments

Workers can now be assigned with specific permissions:
- **Transcribers**: `can_transcribe = true`
- **Reviewers**: `can_review = true`
- **QC Reviewers**: `can_qc = true`

Each role can have different priority settings to control work distribution.

### Import Status Tracking

Projects can now track asset import progress:
```sql
SELECT
    name,
    import_expected_assets,
    import_ready_assets,
    import_failed_assets,
    ROUND(100.0 * import_ready_assets / NULLIF(import_expected_assets, 0), 2) as import_progress_pct
FROM projects
WHERE status = 'importing';
```

## Database Impact

### Size Impact
- **New tables:** 7 (mostly empty initially)
- **New columns:** 15 (NULL allowed for most)
- **New indexes:** 33 (small initial size)
- **Estimated size increase:** < 1 MB for schema, minimal for empty tables

### Performance Impact
- All new indexes will improve query performance on new tables
- Foreign key constraints may add minimal overhead on INSERT/UPDATE/DELETE operations
- No impact on existing queries (new columns are nullable)

### Backward Compatibility
- ✅ Existing queries will continue to work
- ✅ Existing application code will not break
- ✅ New columns have default values or allow NULL
- ✅ New tables are independent (no required data migration)

## Next Steps

After applying this migration:

1. **Update Application Code** - Add support for new workflow stages (review, QC)
2. **Update RLS Policies** - Add Row Level Security policies for new tables
3. **Add Functions** - Create functions for workflow automation (claim review tasks, etc.)
4. **Add Triggers** - Create triggers to update `question_asset_status` automatically
5. **Update UI** - Add UI components for review and QC workflows
6. **Test Workflows** - Test complete flow: transcribe → review → QC → finalize

## Troubleshooting

### Migration Fails: "relation already exists"

Some tables may already exist. The migration uses `IF NOT EXISTS` clauses, so you can safely re-run it.

### Migration Fails: "column already exists"

Some columns may already exist. The migration uses `IF NOT EXISTS` clauses, so you can safely re-run it.

### Foreign Key Constraint Violation

If you have existing data that would violate new foreign keys, you may need to:
1. Clean up orphaned records
2. Add the missing referenced records
3. Set foreign key columns to NULL first

### Check Constraint Violation

If you have existing data with status values not in the new constraints, you may need to:
1. Update those records to use valid status values
2. Temporarily drop the constraint, update data, then re-add it

## Support

If you encounter issues:
1. Review the validation script output for specific errors
2. Check the Supabase logs for detailed error messages
3. Verify your database permissions (need CREATE, ALTER, DROP privileges)
4. Ensure you're running the migration on the correct database

## Schema Version

- **Before Migration:** 14 tables
- **After Migration:** 21 tables
- **New Columns:** 15
- **New Indexes:** 33
- **New Foreign Keys:** 20+

---

**Generated by:** Claude Code
**Documentation Date:** 2025-10-31
