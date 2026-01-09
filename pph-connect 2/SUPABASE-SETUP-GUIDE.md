# Supabase Setup Guide: Shared Database Strategy
## PPH Connect + Maestro Workbench Integration

**Last Updated:** November 11, 2025
**Strategy:** Maestro owns all migrations, PPH Connect connects to shared database

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Phase 1: Backup & Assessment](#phase-1-backup--assessment)
5. [Phase 2: Consolidate Migrations](#phase-2-consolidate-migrations)
6. [Phase 3: Link PPH Connect](#phase-3-link-pph-connect)
7. [Phase 4: Apply Migrations](#phase-4-apply-migrations)
8. [Phase 5: Configure PPH Connect](#phase-5-configure-pph-connect)
9. [Phase 6: Testing](#phase-6-testing)
10. [Phase 7: Clean Up](#phase-7-clean-up)
11. [Phase 8: Documentation](#phase-8-documentation)
12. [Going Forward](#going-forward)
13. [Troubleshooting](#troubleshooting)
14. [Rollback Procedures](#rollback-procedures)

---

## Overview

### The Situation

**Current State:**
- **Maestro Workbench:** Production app with original annotation tables (profiles, projects, questions, answers, etc.)
- **PPH Connect:** New workforce management app that needs to extend Maestro's database
- **Shared Database:** Both apps use the same Supabase instance (Project ID: `nrocepvrheipthrqzwex`)

**The Problem:**
- PPH Connect has 11 migrations in its folder
- Maestro has 90 migrations in its folder (including 40+ workforce tables from November 2025)
- 5 migrations are duplicated between both projects
- 1 migration conflicts (KB tables with different schemas)
- PPH Connect's migrations depend on Maestro's tables (workers, departments)

**The Solution:**
- Consolidate all migrations into Maestro's folder
- Apply workforce management migrations from Maestro
- Link PPH Connect to the same database
- Both apps share tables seamlessly

---

## Architecture

### Database Ownership Model

```
┌─────────────────────────────────────────────────────────────┐
│                  SUPABASE DATABASE                          │
│              (Project: nrocepvrheipthrqzwex)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │ MAESTRO TABLES (Original - Already Applied)    │        │
│  │ • profiles (users with roles)                   │        │
│  │ • projects (annotation projects)                │        │
│  │ • questions, answers, tasks                     │        │
│  │ • task_templates                                │        │
│  │ • training_modules                              │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │ WORKFORCE TABLES (New - To Be Applied)         │        │
│  │ • workers, worker_accounts, teams               │        │
│  │ • workforce_projects (not annotation projects!) │        │
│  │ • project_teams, worker_assignments             │        │
│  │ • departments (organizational structure)        │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │ MESSAGING TABLES (Shared by Both)              │        │
│  │ • conversations, messages, message_recipients   │        │
│  │ • groups, group_members                         │        │
│  │ • message_audience_targets (PPH Connect ext)    │        │
│  │ • message_broadcasts (PPH Connect extension)    │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │ KNOWLEDGE BASE (Maestro's Full Version)        │        │
│  │ • kb_categories, kb_articles                    │        │
│  │ • With tags, status, helpful_count              │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          ▲                    ▲
                          │                    │
        ┌─────────────────┴────────┬───────────┴──────────────┐
        │                          │                           │
┌───────┴─────────┐    ┌───────────┴──────────┐   ┌──────────┴─────────┐
│ MAESTRO         │    │ MAESTRO SUPABASE     │   │ PPH CONNECT        │
│ WORKBENCH       │    │ MIGRATIONS FOLDER    │   │ (New App)          │
│ (Production)    │    │ (Source of Truth)    │   │                    │
│                 │    │                      │   │ • Connects to      │
│ • Uses original │◄───┤ • 90 total migrations│   │   same DB          │
│   tables        │    │ • Runs db push       │───┤ • Uses workforce   │
│ • Annotation    │    │ • Tracks applied     │   │   tables           │
│   workbench     │    │   migrations         │   │ • Extends          │
│                 │    │                      │   │   messaging        │
└─────────────────┘    └──────────────────────┘   └────────────────────┘
```

### Migration Ownership Strategy

**Maestro Owns:**
- ALL database migrations (90 files)
- Original annotation platform tables
- Workforce management tables (workers, teams, projects)
- Base messaging system
- Knowledge base (full version)

**PPH Connect Contributes:**
- 5 unique migrations (added to Maestro's folder):
  - Message audience targeting
  - Message broadcasts
  - Worker-messaging integration
  - Worker-department references
- Frontend application that uses shared tables
- No separate migration folder (archived)

---

## Prerequisites

### Required Tools

1. **Supabase CLI**
   ```bash
   npm install -g supabase
   ```
   Verify: `supabase --version` (should be v1.x or higher)

2. **Git** (for version control)
   ```bash
   git --version
   ```

3. **Node.js & npm** (already installed for the projects)
   ```bash
   node --version
   npm --version
   ```

### Required Access

1. **Supabase Dashboard Access**
   - URL: https://supabase.com/dashboard/project/nrocepvrheipthrqzwex
   - Need: Admin access to create backups and view tables

2. **Supabase Service Role Key**
   - Dashboard → Settings → API → Service Role key
   - Keep this secret! Don't commit to git

3. **Repository Access**
   - Read/write access to both maestro-workbench and pph-connect repos

### Environment Setup

**Recommended:**
- Open two terminal windows:
  1. For Maestro directory: `cd maestro-workbench/maestro-workbench-master`
  2. For PPH Connect directory: `cd pph-connect`
- Use VS Code or your preferred editor
- Have Supabase dashboard open in browser

---

## Phase 1: Backup & Assessment

### Step 1.1: Create Manual Backup

**Why:** Safety net in case something goes wrong

**Steps:**
1. Log into Supabase Dashboard: https://supabase.com/dashboard/project/nrocepvrheipthrqzwex
2. Navigate to: **Database** → **Backups**
3. Click **"Create Manual Backup"**
4. Name: `pre-pph-connect-migration-backup-2025-11-11`
5. Wait for backup to complete (~2-5 minutes)
6. **Optional but recommended:** Download SQL dump
   - Click **"Download"** next to the backup
   - Save to safe location: `C:\Users\hp\Documents\productive-playhouse\backups\`

**Verification:**
- ✅ Backup shows as "Completed" with green checkmark
- ✅ Backup size is reasonable (should be >10 MB)

---

### Step 1.2: Check Current Migration Status

**Why:** Understand what's already been applied to production

**Steps:**

1. Open Supabase SQL Editor (Dashboard → SQL Editor)

2. Run this query:
   ```sql
   SELECT version, name
   FROM supabase_migrations.schema_migrations
   ORDER BY version DESC
   LIMIT 20;
   ```

3. **Document the results:**
   - What's the most recent migration version (timestamp)?
   - Approximately how many migrations are applied? Run:
     ```sql
     SELECT COUNT(*) as total_migrations
     FROM supabase_migrations.schema_migrations;
     ```

4. **Check for workforce tables:**
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables
     WHERE table_schema = 'public'
     AND table_name = 'workers'
   ) as workers_table_exists;
   ```

**Expected Result:** `workers_table_exists = false` (they don't exist yet)

---

### Step 1.3: List Current Tables

**Why:** Baseline of what exists before we add new tables

**Steps:**

1. Run this query in SQL Editor:
   ```sql
   SELECT
     schemaname,
     tablename,
     tableowner
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY tablename;
   ```

2. **Document table count:**
   ```sql
   SELECT COUNT(*) as table_count
   FROM pg_tables
   WHERE schemaname = 'public';
   ```

3. **Save results** to a text file for reference:
   - Copy results
   - Save to: `tables_before_migration_2025-11-11.txt`

**Expected:** Should see Maestro's original tables:
- profiles
- projects (annotation projects)
- questions
- answers
- tasks
- task_templates
- training_modules
- project_assignments
- conversations
- messages
- etc.

**Should NOT see:**
- workers
- worker_accounts
- teams
- workforce_projects
- message_audience_targets
- message_broadcasts

---

### Step 1.4: Create Git Checkpoint

**Why:** Version control safety net

**Steps:**
```bash
cd C:\Users\hp\Documents\productive-playhouse\pph_connect\pph-connect
git status
git add -A
git commit -m "Checkpoint before Supabase migration consolidation"
git push origin main  # or your current branch
```

---

## Phase 2: Consolidate Migrations

### Step 2.1: Identify Unique PPH Connect Migrations

**These 5 migrations need to be copied to Maestro:**

1. `20251106024000_adapt_messaging_to_workers.sql`
   - Purpose: Adapts messaging tables to reference workers instead of profiles
   - Adds foreign keys from messaging tables to workers table

2. `20251106024500_create_message_audience_targets.sql`
   - Purpose: Enables broadcast message targeting (by department, team, project)
   - New table for tracking who broadcast messages are sent to

3. `20251106025000_add_message_broadcasts.sql`
   - Purpose: Adds broadcast message functionality
   - Tracks broadcast campaigns with status and statistics

4. `20251106026000_align_messaging_rls_with_workers.sql`
   - Purpose: Updates Row Level Security policies for messaging to work with workers
   - Ensures workers can only see their own messages

5. `20251120090000_add_worker_department_reference.sql`
   - Purpose: Adds department_id column to workers table
   - Links workers to organizational departments

**These migrations are UNIQUE to PPH Connect** (don't exist in Maestro)

---

### Step 2.2: Copy Migrations to Maestro

**Steps:**

1. **Create backup of Maestro's migrations folder:**
   ```bash
   cd maestro-workbench/maestro-workbench-master/supabase
   mkdir migrations_backup_2025-11-11
   cp migrations/* migrations_backup_2025-11-11/
   ```

2. **Copy the 5 unique migrations:**
   ```bash
   cd C:\Users\hp\Documents\productive-playhouse\pph_connect\pph-connect

   # Copy each unique migration
   cp supabase/migrations/20251106024000_adapt_messaging_to_workers.sql ^
      maestro-workbench/maestro-workbench-master/supabase/migrations/

   cp supabase/migrations/20251106024500_create_message_audience_targets.sql ^
      maestro-workbench/maestro-workbench-master/supabase/migrations/

   cp supabase/migrations/20251106025000_add_message_broadcasts.sql ^
      maestro-workbench/maestro-workbench-master/supabase/migrations/

   cp supabase/migrations/20251106026000_align_messaging_rls_with_workers.sql ^
      maestro-workbench/maestro-workbench-master/supabase/migrations/

   cp supabase/migrations/20251120090000_add_worker_department_reference.sql ^
      maestro-workbench/maestro-workbench-master/supabase/migrations/
   ```

3. **Verify files copied:**
   ```bash
   cd maestro-workbench/maestro-workbench-master/supabase/migrations
   ls -la | grep "20251106024000\|20251106024500\|20251106025000\|20251106026000\|20251120090000"
   ```

**Expected:** Should see all 5 files listed

---

### Step 2.3: Add Migration Comments

**Why:** Document which migrations came from PPH Connect for future reference

**Steps:**

For each of the 5 copied files, add a comment at the top:

**Example for `20251106024000_adapt_messaging_to_workers.sql`:**
```sql
-- PPH Connect Extension: Adapt Messaging to Workers
-- Source: PPH Connect project
-- Added: 2025-11-11
-- Purpose: Enables messaging system to reference workers table instead of profiles
-- Dependencies: Requires workers table to exist (20251106002000_create_workers_table.sql)

[... rest of file content ...]
```

Repeat for all 5 files with appropriate descriptions.

---

### Step 2.4: Remove Conflicting KB Migration

**Why:** Maestro has a better KB table schema (full version with tags, status, etc.)

**Steps:**

1. **Verify Maestro's KB migration exists:**
   ```bash
   cd maestro-workbench/maestro-workbench-master/supabase/migrations
   ls -la | grep "kb_tables"
   ```
   Should see: `20251120110000_create_kb_tables.sql`

2. **Delete PPH Connect's conflicting version:**
   ```bash
   cd C:\Users\hp\Documents\productive-playhouse\pph_connect\pph-connect
   rm supabase/migrations/20251120103000_create_kb_tables.sql
   ```

3. **Verify deletion:**
   ```bash
   ls supabase/migrations/ | grep "kb_tables"
   ```
   Should return nothing (file deleted)

---

### Step 2.5: Verify Maestro Migration Order

**Why:** Ensure migrations will run in correct order (dependencies respected)

**Steps:**

1. **List all Maestro migrations in chronological order:**
   ```bash
   cd maestro-workbench/maestro-workbench-master/supabase/migrations
   ls -1 | sort
   ```

2. **Check dependency order:**
   - Workers table created: `20251106002000_create_workers_table.sql`
   - Departments created: `20251106001000` or earlier
   - PPH Connect messaging adaptations: `20251106024000` onwards (AFTER workers table)

3. **Verify timestamps make sense:**
   - All workforce tables (workers, teams, accounts, projects) should be in November 2025
   - PPH Connect extensions should be AFTER workforce table creation
   - Latest migration should be from November 2025

**Expected:** Chronological order with no gaps, dependencies created before they're referenced

---

## Phase 3: Link PPH Connect to Supabase

### Step 3.1: Install/Verify Supabase CLI

**Steps:**

1. **Check if already installed:**
   ```bash
   supabase --version
   ```

2. **If not installed:**
   ```bash
   npm install -g supabase
   ```

3. **Verify installation:**
   ```bash
   supabase --version
   ```
   Should output: `1.x.x` or higher

---

### Step 3.2: Login to Supabase CLI

**Steps:**

1. **Login:**
   ```bash
   supabase login
   ```

2. **This will open browser for authentication**
   - Log in with your Supabase account credentials
   - Authorize CLI access

3. **Verify login:**
   ```bash
   supabase projects list
   ```
   Should show your project: `nrocepvrheipthrqzwex`

---

### Step 3.3: Link PPH Connect Project

**Steps:**

1. **Navigate to PPH Connect directory:**
   ```bash
   cd C:\Users\hp\Documents\productive-playhouse\pph_connect\pph-connect
   ```

2. **Link to Supabase project:**
   ```bash
   supabase link --project-ref nrocepvrheipthrqzwex
   ```

3. **Enter database password when prompted:**
   - This is the database password you set when creating the Supabase project
   - Get from Supabase Dashboard → Settings → Database → Database password
   - If you don't remember it, you can reset it in the dashboard

4. **Verify link successful:**
   ```bash
   supabase status
   ```
   Should show: `Linked project: nrocepvrheipthrqzwex`

---

### Step 3.4: Create PPH Connect Supabase Config

**Steps:**

1. **Check if config.toml exists:**
   ```bash
   ls supabase/config.toml
   ```

2. **If it doesn't exist, copy from Maestro:**
   ```bash
   cp maestro-workbench/maestro-workbench-master/supabase/config.toml supabase/config.toml
   ```

3. **Edit config.toml** (verify project_id is correct):
   ```toml
   project_id = "nrocepvrheipthrqzwex"
   ```

4. **Verify config:**
   ```bash
   cat supabase/config.toml
   ```

---

## Phase 4: Apply Migrations from Maestro

### ⚠️ CRITICAL STEP - READ CAREFULLY

**This is where the actual database changes happen!**

---

### Step 4.1: Navigate to Maestro Directory

```bash
cd C:\Users\hp\Documents\productive-playhouse\pph_connect\pph-connect\maestro-workbench\maestro-workbench-master
```

---

### Step 4.2: Verify Maestro is Linked

```bash
supabase status
```

**Expected output:**
```
Linked project: nrocepvrheipthrqzwex
Status: Active
```

If not linked:
```bash
supabase link --project-ref nrocepvrheipthrqzwex
```

---

### Step 4.3: Check Migration Diff (Dry Run)

**Why:** See what WILL be applied without actually applying it

```bash
supabase db diff --schema public
```

**Expected output:**
- Long SQL output showing tables to be created
- Should include: workers, worker_accounts, teams, workforce_projects, project_teams, worker_assignments
- Should include: message_audience_targets, message_broadcasts
- Should include: kb_categories, kb_articles (full version)

**Review carefully:**
- No DROP TABLE statements (we're only adding, not removing)
- All CREATE TABLE statements look correct
- Foreign key references make sense

---

### Step 4.4: Apply Migrations (THE BIG MOMENT)

**Before running:**
- ✅ Backup created? (Phase 1)
- ✅ Migrations consolidated? (Phase 2)
- ✅ Reviewed diff output? (Step 4.3)

**Run:**
```bash
supabase db push
```

**Watch output carefully:**

**Good signs:**
```
Applying migration 20251106002000_create_workers_table.sql...
Applying migration 20251106003000_create_worker_accounts_table.sql...
Applying migration 20251106024000_adapt_messaging_to_workers.sql...
...
Finished supabase db push.
```

**Bad signs (stop and investigate):**
```
ERROR: relation "workers" does not exist
ERROR: duplicate key value violates unique constraint
ERROR: could not open extension control file
```

If you see errors:
1. **DON'T PANIC** - The backup protects you
2. Copy the full error message
3. Check [Troubleshooting](#troubleshooting) section
4. If unsure, STOP and ask for help

---

### Step 4.5: Verify Success

**Steps:**

1. **Check migration count:**
   In Supabase SQL Editor:
   ```sql
   SELECT COUNT(*) as total_applied_migrations
   FROM supabase_migrations.schema_migrations;
   ```

   Compare to earlier count from Phase 1. Should have increased by ~45-50 migrations.

2. **Verify workforce tables exist:**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('workers', 'worker_accounts', 'teams', 'workforce_projects', 'project_teams', 'worker_assignments')
   ORDER BY table_name;
   ```

   Should return all 6 tables.

3. **Verify PPH Connect extensions exist:**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('message_audience_targets', 'message_broadcasts')
   ORDER BY table_name;
   ```

   Should return both tables.

4. **Check table count:**
   ```sql
   SELECT COUNT(*) as table_count
   FROM pg_tables
   WHERE schemaname = 'public';
   ```

   Compare to Phase 1. Should have increased by ~10-15 tables.

5. **Verify foreign keys work:**
   ```sql
   -- Check workers can reference departments
   SELECT
     tc.table_name,
     kcu.column_name,
     ccu.table_name AS foreign_table_name,
     ccu.column_name AS foreign_column_name
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY'
     AND tc.table_name = 'workers';
   ```

   Should show foreign keys to departments, profiles (supervisor_id).

**If all checks pass:** ✅ **SUCCESS! Migrations applied successfully!**

---

## Phase 5: Configure PPH Connect Connection

### Step 5.1: Create Environment File

**Steps:**

1. **Check if .env.example exists in PPH Connect:**
   ```bash
   cd C:\Users\hp\Documents\productive-playhouse\pph_connect\pph-connect
   ls .env.example
   ```

2. **If not, copy from Maestro:**
   ```bash
   cp maestro-workbench/maestro-workbench-master/.env.example .env.example
   ```

3. **Create .env file:**
   ```bash
   cp .env.example .env
   ```

4. **Edit .env with correct Supabase credentials:**

   Get from Supabase Dashboard → Settings → API:
   - Project URL: `https://nrocepvrheipthrqzwex.supabase.co`
   - Anon/Public key: Copy from dashboard

   ```env
   VITE_SUPABASE_URL=https://nrocepvrheipthrqzwex.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

5. **Verify .env in .gitignore:**
   ```bash
   grep ".env" .gitignore
   ```
   Should see `.env` listed (don't commit secrets to git!)

---

### Step 5.2: Generate TypeScript Types

**Why:** Get type-safe database access in PPH Connect

**Steps:**

1. **Generate types from linked database:**
   ```bash
   cd C:\Users\hp\Documents\productive-playhouse\pph_connect\pph-connect
   supabase gen types typescript --linked > src/types/supabase.ts
   ```

2. **Verify file created:**
   ```bash
   ls -lh src/types/supabase.ts
   ```
   Should be a large file (100+ KB) with TypeScript type definitions

3. **Open file and verify:**
   - Should have `Database` interface
   - Should have `Tables` type
   - Should include: workers, worker_accounts, teams, workforce_projects, etc.

**Example of what you'll see:**
```typescript
export interface Database {
  public: {
    Tables: {
      workers: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email_personal: string | null
          email_pph: string | null
          status: Database["public"]["Enums"]["worker_status"]
          department_id: string | null
          supervisor_id: string | null
          bgc_expiration_date: string | null
          hire_date: string | null
          created_at: string
          updated_at: string
          // ...
        }
        Insert: { /* ... */ }
        Update: { /* ... */ }
      }
      // ... all other tables
    }
  }
}
```

---

### Step 5.3: Create Supabase Client

**Steps:**

1. **Create directory structure:**
   ```bash
   mkdir -p src/lib/supabase
   ```

2. **Create client file:**

   Create `src/lib/supabase/client.ts`:
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   import type { Database } from '@/types/supabase'

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

   if (!supabaseUrl || !supabaseAnonKey) {
     throw new Error(
       'Missing Supabase environment variables. ' +
       'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env file.'
     )
   }

   export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
   ```

3. **Create utility functions file:**

   Create `src/lib/supabase/queries.ts`:
   ```typescript
   import { supabase } from './client'

   /**
    * Fetch all workers from the database
    */
   export async function fetchWorkers() {
     const { data, error } = await supabase
       .from('workers')
       .select('*, departments(name)')
       .eq('is_deleted', false)
       .order('created_at', { ascending: false })

     if (error) throw error
     return data
   }

   /**
    * Fetch all departments
    */
   export async function fetchDepartments() {
     const { data, error } = await supabase
       .from('departments')
       .select('*')
       .order('name')

     if (error) throw error
     return data
   }

   /**
    * Fetch all teams with department info
    */
   export async function fetchTeams() {
     const { data, error } = await supabase
       .from('teams')
       .select('*, departments(name)')
       .eq('is_active', true)
       .order('team_name')

     if (error) throw error
     return data
   }
   ```

---

### Step 5.4: Test Connection

**Create a test script:**

Create `src/lib/supabase/test-connection.ts`:
```typescript
import { supabase } from './client'

export async function testConnection() {
  console.log('🔍 Testing Supabase connection...')

  try {
    // Test 1: Check connection
    const { data: healthCheck, error: healthError } = await supabase
      .from('departments')
      .select('count')
      .limit(1)

    if (healthError) throw healthError
    console.log('✅ Connection successful!')

    // Test 2: Count departments
    const { count: deptCount } = await supabase
      .from('departments')
      .select('*', { count: 'exact', head: true })

    console.log(`✅ Departments table accessible: ${deptCount} departments`)

    // Test 3: Count workers
    const { count: workerCount } = await supabase
      .from('workers')
      .select('*', { count: 'exact', head: true })

    console.log(`✅ Workers table accessible: ${workerCount} workers`)

    // Test 4: Check foreign key relationship
    const { data: workersWithDept } = await supabase
      .from('workers')
      .select('id, first_name, last_name, departments(name)')
      .limit(5)

    console.log('✅ Foreign keys working! Sample workers with departments:')
    console.table(workersWithDept)

    return { success: true }
  } catch (error) {
    console.error('❌ Connection test failed:', error)
    return { success: false, error }
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testConnection()
}
```

**Run test:**
```bash
npm run dev
```

Then in browser console or create a test page that calls `testConnection()`.

**Expected output:**
```
🔍 Testing Supabase connection...
✅ Connection successful!
✅ Departments table accessible: 3 departments
✅ Workers table accessible: 0 workers
✅ Foreign keys working! Sample workers with departments:
```

---

## Phase 6: Testing & Validation

### Step 6.1: Test from Maestro (Optional)

**If Maestro is runnable locally:**

1. **Start Maestro dev server:**
   ```bash
   cd maestro-workbench/maestro-workbench-master
   npm install  # if not done already
   npm run dev
   ```

2. **Test basic functionality:**
   - Can you log in?
   - Can you view existing projects?
   - Can you see existing workers/data?
   - Any console errors?

3. **Expected result:**
   - ✅ Everything works as before
   - ✅ New tables don't break Maestro (it doesn't use them yet)
   - ✅ No errors related to database schema

**If Maestro isn't runnable locally:** Skip this step (production Maestro should be unaffected)

---

### Step 6.2: Test PPH Connect Connection

**Create test page:**

Create `src/pages/TestConnection.tsx`:
```typescript
import { useEffect, useState } from 'react'
import { testConnection } from '@/lib/supabase/test-connection'
import { fetchDepartments, fetchWorkers } from '@/lib/supabase/queries'

export default function TestConnection() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...')
  const [departments, setDepartments] = useState<any[]>([])
  const [workers, setWorkers] = useState<any[]>([])

  useEffect(() => {
    async function runTests() {
      // Test connection
      const result = await testConnection()
      setConnectionStatus(result.success ? '✅ Connected' : '❌ Failed')

      // Fetch departments
      try {
        const depts = await fetchDepartments()
        setDepartments(depts)
      } catch (error) {
        console.error('Failed to fetch departments:', error)
      }

      // Fetch workers
      try {
        const workers = await fetchWorkers()
        setWorkers(workers)
      } catch (error) {
        console.error('Failed to fetch workers:', error)
      }
    }

    runTests()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
        <p className="text-lg">{connectionStatus}</p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Departments ({departments.length})</h2>
        <ul className="list-disc pl-6">
          {departments.map(dept => (
            <li key={dept.id}>{dept.name}</li>
          ))}
        </ul>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Workers ({workers.length})</h2>
        {workers.length === 0 ? (
          <p className="text-gray-500">No workers yet. Create some in the dashboard!</p>
        ) : (
          <ul className="list-disc pl-6">
            {workers.slice(0, 10).map(worker => (
              <li key={worker.id}>
                {worker.first_name} {worker.last_name} - {worker.departments?.name || 'No department'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

**Add route:**

In `App.tsx` or your routing file:
```typescript
<Route path="/test-connection" element={<TestConnection />} />
```

**Visit:**
```
http://localhost:5173/test-connection
```

**Expected:**
- ✅ Connection Status: "✅ Connected"
- ✅ Departments list shows (if any exist)
- ✅ Workers list shows (likely empty initially)
- ✅ No console errors

---

### Step 6.3: Test Cross-App Shared Data

**Goal:** Verify both apps can read/write to the same database

**Test 1: Create Department in Supabase Dashboard**

1. Supabase Dashboard → Table Editor → `departments`
2. Click "Insert" → "Insert row"
3. Fill in:
   - name: "Test Department"
   - description: "Created for testing shared database"
4. Save

**Verify in PPH Connect:**
- Refresh http://localhost:5173/test-connection
- Should see "Test Department" in departments list

**Test 2: Create Worker in Supabase Dashboard**

1. Table Editor → `workers`
2. Insert row:
   - first_name: "Test"
   - last_name: "Worker"
   - email_personal: "test@example.com"
   - status: "pending"
   - department_id: (select from departments dropdown)
   - hire_date: today's date
3. Save

**Verify in PPH Connect:**
- Refresh test page
- Should see "Test Worker" in workers list
- Should show department name (foreign key working!)

**Test 3: Query from PPH Connect (if worker list page exists)**

- Navigate to worker list page
- Should see test worker
- Click to view details
- Verify all data displays correctly

---

### Step 6.4: Test Foreign Key Relationships

**In Supabase SQL Editor, run:**

```sql
-- Test workers → departments relationship
SELECT
  w.first_name,
  w.last_name,
  d.name as department_name
FROM workers w
LEFT JOIN departments d ON w.department_id = d.id
LIMIT 5;

-- Test worker_accounts → workers relationship
SELECT
  wa.account_username,
  wa.platform,
  w.first_name || ' ' || w.last_name as worker_name
FROM worker_accounts wa
JOIN workers w ON wa.worker_id = w.id
LIMIT 5;

-- Test message_audience_targets → departments relationship
SELECT
  mat.target_type,
  d.name as department_name
FROM message_audience_targets mat
LEFT JOIN departments d ON mat.department_id = d.id
LIMIT 5;
```

**Expected:** Queries run without errors (even if results are empty)

---

## Phase 7: Clean Up PPH Connect Migrations Folder

### Step 7.1: Archive Old Migrations

**Why:** Keep history but make it clear they're no longer used

**Steps:**

1. **Create archive folder:**
   ```bash
   cd C:\Users\hp\Documents\productive-playhouse\pph_connect\pph-connect
   mkdir -p supabase/migrations.archive
   ```

2. **Move all migration files to archive:**
   ```bash
   mv supabase/migrations/*.sql supabase/migrations.archive/
   ```

3. **Verify migrations folder is empty:**
   ```bash
   ls supabase/migrations/
   ```
   Should show no .sql files (empty or only .gitkeep)

4. **Create .gitkeep to preserve directory:**
   ```bash
   touch supabase/migrations/.gitkeep
   ```

---

### Step 7.2: Create README in Migrations Folder

**Create `supabase/migrations/README.md`:**

```markdown
# PPH Connect Database Migrations

## ⚠️ IMPORTANT: Migration Management Strategy

**All database migrations are managed in the Maestro Workbench repository.**

This folder is intentionally empty. PPH Connect connects to the same Supabase database as Maestro but does not maintain its own migrations.

## Migration Location

**Maestro Workbench Migrations Folder:**
```
maestro-workbench/maestro-workbench-master/supabase/migrations/
```

## How to Add New Migrations

1. **Navigate to Maestro directory:**
   ```bash
   cd maestro-workbench/maestro-workbench-master
   ```

2. **Create migration file** with timestamp:
   ```bash
   supabase migration new pph_connect_add_feature_name
   ```

3. **Write migration SQL** in the generated file

4. **Add comment** indicating it's for PPH Connect:
   ```sql
   -- PPH Connect Extension: [Feature Name]
   -- Purpose: [What this adds]
   -- Dependencies: [Any table dependencies]
   ```

5. **Apply migration:**
   ```bash
   supabase db push
   ```

6. **Update types in PPH Connect:**
   ```bash
   cd ../../pph-connect
   supabase gen types typescript --linked > src/types/supabase.ts
   ```

## Database Connection

PPH Connect connects to the same Supabase instance as Maestro:
- **Project ID:** nrocepvrheipthrqzwex
- **Shared Tables:** workers, departments, teams, projects, messaging, etc.
- **Environment:** See `.env.example` for required variables

## Archived Migrations

Original PPH Connect migrations (before consolidation) are archived in:
```
supabase/migrations.archive/
```

These are kept for historical reference but are no longer used. The unique migrations from this folder were copied to Maestro's migrations folder in November 2025.

## Troubleshooting

**If you need to regenerate types:**
```bash
supabase gen types typescript --linked > src/types/supabase.ts
```

**If connection fails:**
1. Verify `.env` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Check Supabase project is linked: `supabase status`
3. Verify you're logged in: `supabase projects list`

**For help:** Refer to `SUPABASE-SETUP-GUIDE.md` in project root
```

---

### Step 7.3: Update .gitignore

**Verify archived migrations are tracked:**

In `pph-connect/.gitignore`, ensure migrations.archive is NOT ignored:

```gitignore
# Supabase
.supabase/
supabase/.branches/
supabase/.temp/

# Keep archived migrations for history
# supabase/migrations.archive/  <-- DON'T ignore this
```

---

### Step 7.4: Commit Changes

```bash
cd C:\Users\hp\Documents\productive-playhouse\pph_connect\pph-connect
git add -A
git commit -m "Consolidate Supabase migrations into Maestro, archive PPH Connect migrations"
git push origin main
```

---

## Phase 8: Documentation Updates

### Step 8.1: Update PROJECT-ANALYSIS-REPORT.md

**Add section at the end:**

```markdown
## Supabase Migration Strategy (Updated November 2025)

### Decision: Maestro as Source of Truth

After thorough analysis, we consolidated all database migrations into Maestro Workbench's migrations folder.

**Rationale:**
- Maestro owns all foundation tables (workers, departments, profiles, projects)
- PPH Connect depends entirely on Maestro's tables
- Single source of truth prevents conflicts and duplication
- Simplifies migration management and deployment

**Implementation:**
- All 90 migrations now in: `maestro-workbench/maestro-workbench-master/supabase/migrations/`
- 5 unique PPH Connect migrations were added to Maestro (message targeting, broadcasts, worker-messaging integration)
- PPH Connect's migrations folder archived for historical reference
- Both apps connect to same Supabase instance (Project ID: nrocepvrheipthrqzwex)

**Going Forward:**
- All new migrations created in Maestro's folder
- Migrations run from Maestro: `cd maestro-workbench/maestro-workbench-master && supabase db push`
- Types regenerated in PPH Connect after schema changes: `supabase gen types typescript --linked > src/types/supabase.ts`

### Migration Ownership

| Component | Owner | Location |
|-----------|-------|----------|
| Database Schema | Maestro | maestro-workbench/.../supabase/migrations/ |
| Migration Execution | Maestro | Run `supabase db push` from Maestro |
| Type Generation | Per-Project | Each project regenerates types from shared schema |
| Connection Config | Per-Project | Each has .env with same Supabase credentials |
```

---

### Step 8.2: Update 3-WEEK-SPRINT-PLAN.md

**Update Day 1 tasks:**

Replace:
```markdown
**Task 1.1: Resolve Projects Table Name Collision** (2 hours)
- Create new migration file: `20251201000000_rename_pph_projects.sql`
- Rename existing PPH `projects` table → `workforce_projects`
```

With:
```markdown
**Task 1.1: Verify Database Schema** (2 hours)
- ✅ COMPLETED: Database migrations consolidated (November 2025)
- ✅ COMPLETED: All workforce tables applied to production
- Verify tables exist: workers, worker_accounts, teams, workforce_projects
- No migration creation needed - schema already deployed
```

Replace:
```markdown
**Task 1.2: Verify Complete Database Schema** (2 hours)
- Open Supabase dashboard → Table Editor
- Verify existence of: `workers`, `worker_accounts`, `teams`, `workforce_projects`...
```

With:
```markdown
**Task 1.2: Test Database Connection** (2 hours)
- Verify PPH Connect linked to Supabase (already done in setup)
- Generate TypeScript types: `supabase gen types typescript --linked`
- Test queries to workers, departments, teams tables
- Verify foreign key relationships working
```

---

### Step 8.3: Create Quick Reference Card

**Create `SUPABASE-QUICK-REFERENCE.md`:**

```markdown
# Supabase Quick Reference - PPH Connect

## Common Commands

### Generate Types (After Schema Changes)
```bash
cd pph-connect
supabase gen types typescript --linked > src/types/supabase.ts
```

### Check Connection Status
```bash
supabase status
```

### View Project Info
```bash
supabase projects list
```

### Create New Migration (in Maestro!)
```bash
cd maestro-workbench/maestro-workbench-master
supabase migration new pph_connect_feature_name
# Edit the generated .sql file
supabase db push
```

### Reset Local Database (CAREFUL!)
```bash
cd maestro-workbench/maestro-workbench-master
supabase db reset  # Drops all data!
```

## Environment Variables

**Location:** `pph-connect/.env`

```env
VITE_SUPABASE_URL=https://nrocepvrheipthrqzwex.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## Important Paths

- **Migrations:** `maestro-workbench/maestro-workbench-master/supabase/migrations/`
- **Types:** `pph-connect/src/types/supabase.ts`
- **Client:** `pph-connect/src/lib/supabase/client.ts`
- **Queries:** `pph-connect/src/lib/supabase/queries.ts`

## Key Tables

| Table | Purpose |
|-------|---------|
| `workers` | Core worker identity |
| `worker_accounts` | Platform accounts (DataCompute, Maestro, etc.) |
| `teams` | Language-based teams |
| `workforce_projects` | Work projects (not Maestro annotation projects!) |
| `project_teams` | Junction: projects ↔ teams |
| `worker_assignments` | Junction: workers ↔ projects |
| `departments` | Organizational departments |
| `message_audience_targets` | Broadcast targeting |
| `message_broadcasts` | Broadcast campaigns |

## Helpful Queries

### Count Workers by Status
```sql
SELECT status, COUNT(*)
FROM workers
WHERE is_deleted = false
GROUP BY status;
```

### Find Workers with Expiring BGC
```sql
SELECT first_name, last_name, bgc_expiration_date
FROM workers
WHERE bgc_expiration_date < NOW() + INTERVAL '30 days'
AND is_deleted = false
ORDER BY bgc_expiration_date;
```

### List Active Project Assignments
```sql
SELECT
  w.first_name || ' ' || w.last_name as worker_name,
  wp.project_name,
  wa.assigned_at
FROM worker_assignments wa
JOIN workers w ON wa.worker_id = w.id
JOIN workforce_projects wp ON wa.project_id = wp.id
WHERE wa.removed_at IS NULL
ORDER BY wa.assigned_at DESC;
```

## Troubleshooting

### "Cannot find module '@/types/supabase'"
```bash
supabase gen types typescript --linked > src/types/supabase.ts
```

### "Missing Supabase environment variables"
Check `.env` file exists and has correct variables.

### "Failed to fetch: Could not connect to server"
1. Check Supabase project is running (dashboard)
2. Verify environment variables are correct
3. Check network connection

### Types are outdated after schema change
```bash
cd pph-connect
supabase gen types typescript --linked > src/types/supabase.ts
```

## Links

- [Supabase Dashboard](https://supabase.com/dashboard/project/nrocepvrheipthrqzwex)
- [Full Setup Guide](./SUPABASE-SETUP-GUIDE.md)
- [Migration Strategy](./PROJECT-ANALYSIS-REPORT.md#supabase-migration-strategy)
```

---

## Going Forward

### Creating New Migrations

**ALWAYS create migrations in Maestro's folder:**

1. **Navigate to Maestro:**
   ```bash
   cd maestro-workbench/maestro-workbench-master
   ```

2. **Create migration:**
   ```bash
   supabase migration new pph_connect_add_feature_name
   ```

   This generates: `supabase/migrations/YYYYMMDDHHMMSS_pph_connect_add_feature_name.sql`

3. **Edit the file** with your schema changes

4. **Add documentation comment:**
   ```sql
   -- PPH Connect Extension: Add chat reactions feature
   -- Purpose: Allow workers to react to messages with emojis
   -- Dependencies: Requires messages table
   -- Author: [Your Name]
   -- Date: 2025-11-15

   CREATE TABLE public.message_reactions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
     worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
     reaction TEXT NOT NULL CHECK (reaction IN ('👍', '❤️', '😂', '🎉', '🤔')),
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE(message_id, worker_id, reaction)
   );

   CREATE INDEX idx_message_reactions_message ON public.message_reactions(message_id);
   CREATE INDEX idx_message_reactions_worker ON public.message_reactions(worker_id);

   ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

   -- RLS: Workers can see all reactions, but only create/delete their own
   CREATE POLICY "Workers can view reactions" ON public.message_reactions
     FOR SELECT
     TO authenticated
     USING (true);

   CREATE POLICY "Workers can create own reactions" ON public.message_reactions
     FOR INSERT
     TO authenticated
     WITH CHECK (worker_id IN (
       SELECT id FROM public.workers WHERE id = auth.uid()
     ));

   CREATE POLICY "Workers can delete own reactions" ON public.message_reactions
     FOR DELETE
     TO authenticated
     USING (worker_id IN (
       SELECT id FROM public.workers WHERE id = auth.uid()
     ));
   ```

5. **Apply migration:**
   ```bash
   supabase db push
   ```

6. **Update types in PPH Connect:**
   ```bash
   cd ../../pph-connect
   supabase gen types typescript --linked > src/types/supabase.ts
   ```

7. **Commit migration file:**
   ```bash
   cd ../../maestro-workbench/maestro-workbench-master
   git add supabase/migrations/YYYYMMDDHHMMSS_pph_connect_add_feature_name.sql
   git commit -m "Add message reactions table for PPH Connect"
   git push
   ```

---

### Testing Migrations Locally

**Use Supabase local development:**

1. **Start local Supabase:**
   ```bash
   cd maestro-workbench/maestro-workbench-master
   supabase start
   ```

2. **Apply migrations locally:**
   ```bash
   supabase db reset  # Fresh start with all migrations
   ```

3. **Test in local database:**
   - Local Studio: http://localhost:54323
   - Test queries, inserts, updates
   - Verify constraints and foreign keys work

4. **If all good, apply to production:**
   ```bash
   supabase db push
   ```

---

### Naming Conventions

**Migration file names:**
```
YYYYMMDDHHMMSS_pph_connect_action_object.sql

Examples:
20251115120000_pph_connect_add_message_reactions.sql
20251120140000_pph_connect_create_worker_skills_table.sql
20251125160000_pph_connect_add_project_status_column.sql
20251130180000_maestro_update_question_schema.sql (if for Maestro)
```

**Pattern:** `pph_connect_` prefix for PPH Connect migrations, `maestro_` for Maestro-specific

---

### Migration Checklist

Before pushing any migration:

- [ ] Migration has descriptive name with `pph_connect_` prefix
- [ ] File includes comment block (purpose, dependencies, author, date)
- [ ] All foreign keys reference existing tables
- [ ] Indexes added for performance (foreign keys, filter columns)
- [ ] RLS policies defined (security!)
- [ ] Constraints specified (NOT NULL, UNIQUE, CHECK)
- [ ] Tested in local Supabase (`supabase start` → `supabase db reset`)
- [ ] Types regenerated in PPH Connect after applying
- [ ] Migration file committed to git

---

## Troubleshooting

### Issue: "relation does not exist"

**Cause:** Trying to reference a table that hasn't been created yet

**Solution:**
1. Check migration timestamps - dependencies must come first
2. Verify referenced table exists in production:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'your_table';
   ```
3. If missing, create parent table first

---

### Issue: "duplicate key value violates unique constraint"

**Cause:** Migration tries to insert data that conflicts with existing data

**Solution:**
1. Use `ON CONFLICT DO NOTHING` for inserts:
   ```sql
   INSERT INTO departments (id, name)
   VALUES ('...', 'Test Department')
   ON CONFLICT (name) DO NOTHING;
   ```
2. Or check if exists first:
   ```sql
   INSERT INTO departments (id, name)
   SELECT '...', 'Test Department'
   WHERE NOT EXISTS (
     SELECT 1 FROM departments WHERE name = 'Test Department'
   );
   ```

---

### Issue: "permission denied for table"

**Cause:** RLS policy blocking access

**Solution:**
1. Check if RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public' AND tablename = 'your_table';
   ```
2. Review RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'your_table';
   ```
3. Ensure authenticated users have access:
   ```sql
   CREATE POLICY "Allow authenticated access" ON your_table
     FOR ALL
     TO authenticated
     USING (true)
     WITH CHECK (true);
   ```

---

### Issue: Types not updating in PPH Connect

**Cause:** Old cached types or generation failed

**Solution:**
```bash
cd pph-connect
rm src/types/supabase.ts  # Delete old types
supabase gen types typescript --linked > src/types/supabase.ts  # Regenerate
```

If still issues:
```bash
npm run type-check  # Check for TypeScript errors
```

---

### Issue: Migration applied but table not visible

**Cause:** Wrong schema or migration didn't actually run

**Solution:**
1. Check migration was applied:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations
   WHERE version = 'YYYYMMDDHHMMSS'  -- your migration timestamp
   ORDER BY version DESC;
   ```
2. Check table exists:
   ```sql
   SELECT * FROM pg_tables WHERE tablename = 'your_table';
   ```
3. If not applied, run again:
   ```bash
   supabase db push
   ```

---

### Issue: Can't connect PPH Connect to database

**Cause:** Environment variables or link issue

**Solution:**
1. Check `.env` file exists and has correct values
2. Verify project is linked:
   ```bash
   supabase status
   ```
3. If not linked:
   ```bash
   supabase link --project-ref nrocepvrheipthrqzwex
   ```
4. Test connection:
   ```typescript
   import { supabase } from './lib/supabase/client'
   const { data, error } = await supabase.from('workers').select('count')
   console.log(data, error)
   ```

---

### Issue: Maestro broke after migration

**Cause:** Migration modified table Maestro depends on

**Solution:**
1. **Don't panic** - backup exists
2. Identify what broke (check Maestro console errors)
3. Rollback:
   - Restore from backup (Phase 1)
   - OR write down migration to undo changes
4. Fix issue:
   - Modify migration to not break Maestro
   - Add new columns with `DEFAULT` values
   - Use `ALTER TABLE ADD COLUMN IF NOT EXISTS`
5. Re-apply corrected migration

---

## Rollback Procedures

### Scenario 1: Just Applied Migration, It Failed

**Immediate rollback:**

1. **Check error message carefully** - may just need syntax fix

2. **If migration applied but has issues:**
   ```bash
   # Get migration version
   supabase migrations list

   # Manually rollback (DANGEROUS - know what you're doing)
   # Create down migration with reverse operations
   supabase migration new rollback_previous_migration
   ```

3. **Write down migration** (reverse operations):
   ```sql
   -- Rollback: Remove message_reactions table
   DROP TABLE IF EXISTS public.message_reactions;
   ```

4. **Apply rollback:**
   ```bash
   supabase db push
   ```

---

### Scenario 2: Migration Applied Hours/Days Ago, Need to Undo

**Careful rollback:**

1. **Assess data loss:**
   - Will dropping table lose user data?
   - Is there a way to migrate data to new structure?

2. **Backup current data:**
   ```sql
   -- Export data from table
   SELECT * FROM your_table;  -- Copy results
   ```

3. **Create down migration:**
   ```bash
   supabase migration new rollback_feature_name
   ```

4. **Write careful rollback SQL:**
   ```sql
   -- Rollback: Feature Name
   -- WARNING: This will delete data in message_reactions table
   -- Data backup taken: [date/time]

   DROP TABLE IF EXISTS public.message_reactions CASCADE;

   -- If you added column, remove it:
   ALTER TABLE public.workers DROP COLUMN IF EXISTS new_column;
   ```

5. **Apply:**
   ```bash
   supabase db push
   ```

---

### Scenario 3: Total Disaster - Restore from Backup

**Nuclear option:**

1. **Supabase Dashboard → Database → Backups**

2. **Select backup** (pre-pph-connect-migration-backup-2025-11-11)

3. **Click "Restore"**

4. **Confirm** (THIS WILL REPLACE CURRENT DATABASE)

5. **Wait for restore** (5-15 minutes)

6. **Verify:**
   ```sql
   SELECT MAX(version) FROM supabase_migrations.schema_migrations;
   ```

7. **Re-apply migrations selectively:**
   - Identify which migrations need to be re-run
   - Fix problematic migration
   - Apply again

---

## Summary: Key Takeaways

### ✅ What We Accomplished

1. **Consolidated migrations** - All in Maestro's folder (single source of truth)
2. **Linked PPH Connect** - Both apps share same Supabase database
3. **Applied workforce migrations** - Workers, teams, projects tables now in production
4. **Resolved conflicts** - Duplicate migrations removed, KB tables use Maestro's schema
5. **Generated types** - PPH Connect has type-safe database access
6. **Tested connection** - Both apps can read/write shared tables
7. **Documented strategy** - Clear process for future migrations

### 🎯 Going Forward

- **All migrations created in Maestro folder**
- **Run migrations from Maestro**: `supabase db push`
- **Regenerate types in PPH Connect after schema changes**
- **Name migrations with `pph_connect_` prefix**
- **Test locally before pushing to production**
- **Document migrations with comments**
- **Never modify Maestro's existing migrations**

### 🔒 Safety Practices

- **Always backup before major changes**
- **Test migrations locally first** (`supabase start` → `supabase db reset`)
- **Review diff before pushing** (`supabase db diff`)
- **Use transactions for complex migrations**
- **Keep down migrations for critical changes**
- **Monitor Maestro after migrations** (ensure nothing breaks)

### 📚 Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Project Analysis Report](./PROJECT-ANALYSIS-REPORT.md)
- [3-Week Sprint Plan](./3-WEEK-SPRINT-PLAN.md)
- [Quick Reference](./SUPABASE-QUICK-REFERENCE.md)

---

## Support

**If you encounter issues:**
1. Check [Troubleshooting](#troubleshooting) section
2. Review [Supabase Dashboard Logs](https://supabase.com/dashboard/project/nrocepvrheipthrqzwex/logs)
3. Search [Supabase Discord](https://discord.supabase.com/)
4. Consult this guide
5. If stuck, create backup and ask for help (don't make it worse!)

---

**Document Version:** 1.0
**Last Updated:** November 11, 2025
**Author:** Claude (Anthropic)
**Status:** Active - Follow this guide for all Supabase operations