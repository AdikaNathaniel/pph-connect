# Supabase Quick Reference - PPH Connect

## 🚀 Common Commands

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

### Create New Migration (⚠️ Do this in Maestro!)
```bash
cd maestro-workbench/maestro-workbench-master
supabase migration new pph_connect_feature_name
# Edit the generated .sql file
supabase db push
```

### Apply Migrations
```bash
cd maestro-workbench/maestro-workbench-master
supabase db push
```

### Reset Local Database (⚠️ DANGEROUS - Drops all data!)
```bash
cd maestro-workbench/maestro-workbench-master
supabase db reset
```

---

## 📁 Important Paths

| What | Path |
|------|------|
| **Migrations** | `maestro-workbench/maestro-workbench-master/supabase/migrations/` |
| **Types** | `pph-connect/src/types/supabase.ts` |
| **Client** | `pph-connect/src/lib/supabase/client.ts` |
| **Queries** | `pph-connect/src/lib/supabase/queries.ts` |
| **Config** | `pph-connect/supabase/config.toml` |
| **Environment** | `pph-connect/.env` |

---

## 🔑 Environment Variables

**Location:** `pph-connect/.env`

```env
VITE_SUPABASE_URL=https://nrocepvrheipthrqzwex.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Get from: Supabase Dashboard → Settings → API

---

## 📊 Key Tables

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `workers` | Core worker identity | → departments, → profiles (supervisor) |
| `worker_accounts` | Platform accounts | → workers |
| `teams` | Language-based teams | → departments, → workers (leader) |
| `workforce_projects` | Work projects | → departments |
| `project_teams` | Junction: projects ↔ teams | → workforce_projects, → teams |
| `worker_assignments` | Junction: workers ↔ projects | → workers, → workforce_projects |
| `departments` | Organizational departments | (root level) |
| `message_audience_targets` | Broadcast targeting | → departments, → workers |
| `message_broadcasts` | Broadcast campaigns | → workers (run_by) |
| `profiles` | System users (Maestro) | → departments |
| `kb_categories` | Knowledge base categories | (root level) |
| `kb_articles` | Knowledge base articles | → kb_categories, → workers (author) |

---

## 🔍 Helpful SQL Queries

### Count Workers by Status
```sql
SELECT status, COUNT(*) as count
FROM workers
WHERE is_deleted = false
GROUP BY status
ORDER BY count DESC;
```

### Find Workers with Expiring BGC (<30 days)
```sql
SELECT
  first_name,
  last_name,
  bgc_expiration_date,
  (bgc_expiration_date - CURRENT_DATE) as days_remaining
FROM workers
WHERE bgc_expiration_date < CURRENT_DATE + INTERVAL '30 days'
AND bgc_expiration_date >= CURRENT_DATE
AND is_deleted = false
ORDER BY bgc_expiration_date;
```

### Find Expired BGC
```sql
SELECT first_name, last_name, bgc_expiration_date
FROM workers
WHERE bgc_expiration_date < CURRENT_DATE
AND is_deleted = false
ORDER BY bgc_expiration_date;
```

### List Active Project Assignments
```sql
SELECT
  w.first_name || ' ' || w.last_name as worker_name,
  wp.project_name,
  wa.assigned_at,
  (CURRENT_DATE - wa.assigned_at::date) as days_assigned
FROM worker_assignments wa
JOIN workers w ON wa.worker_id = w.id
JOIN workforce_projects wp ON wa.project_id = wp.id
WHERE wa.removed_at IS NULL
ORDER BY wa.assigned_at DESC;
```

### Workers by Department
```sql
SELECT
  d.name as department,
  COUNT(w.id) as worker_count
FROM departments d
LEFT JOIN workers w ON w.department_id = d.id AND w.is_deleted = false
GROUP BY d.id, d.name
ORDER BY worker_count DESC;
```

### Account Replacement History for Worker
```sql
SELECT
  wa.platform,
  wa.account_username,
  wa.status,
  wa.activated_at,
  wa.deactivated_at,
  wa.deactivation_reason
FROM worker_accounts wa
WHERE wa.worker_id = '[WORKER_ID]'
ORDER BY wa.activated_at DESC;
```

### Messages Sent to Department
```sql
SELECT
  m.subject,
  m.created_at,
  w.first_name || ' ' || w.last_name as sent_by
FROM message_broadcasts mb
JOIN messages m ON mb.message_id = m.id
JOIN workers w ON m.sender_id = w.id
JOIN message_audience_targets mat ON mb.id = mat.broadcast_id
WHERE mat.department_id = '[DEPARTMENT_ID]'
AND mat.target_type = 'department'
ORDER BY m.created_at DESC;
```

### Team Members
```sql
SELECT
  w.first_name || ' ' || w.last_name as worker_name,
  w.email_personal,
  w.status
FROM workers w
JOIN teams t ON w.department_id = t.department_id
WHERE t.id = '[TEAM_ID]'
AND w.is_deleted = false
ORDER BY w.first_name, w.last_name;
```

---

## 🛠️ Common Tasks

### Add New Migration (PPH Connect Feature)

1. **Navigate to Maestro:**
   ```bash
   cd maestro-workbench/maestro-workbench-master
   ```

2. **Create migration:**
   ```bash
   supabase migration new pph_connect_add_feature_name
   ```

3. **Edit generated file** and add:
   ```sql
   -- PPH Connect Extension: [Feature Name]
   -- Purpose: [What this does]
   -- Dependencies: [Tables needed]
   -- Author: [Your Name]
   -- Date: [YYYY-MM-DD]

   -- Your SQL here
   ```

4. **Apply to production:**
   ```bash
   supabase db push
   ```

5. **Update PPH Connect types:**
   ```bash
   cd ../../pph-connect
   supabase gen types typescript --linked > src/types/supabase.ts
   ```

6. **Commit:**
   ```bash
   cd ../../maestro-workbench/maestro-workbench-master
   git add supabase/migrations/*
   git commit -m "Add [feature name] for PPH Connect"
   git push
   ```

---

### Test Migration Locally Before Production

1. **Start local Supabase:**
   ```bash
   cd maestro-workbench/maestro-workbench-master
   supabase start
   ```

2. **Apply all migrations (fresh):**
   ```bash
   supabase db reset
   ```

3. **Test in local Studio:**
   - Open http://localhost:54323
   - Run queries, test inserts
   - Verify constraints work

4. **If good, apply to production:**
   ```bash
   supabase db push
   ```

---

### Check What Migrations Have Been Applied

**In Supabase SQL Editor:**
```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;
```

**Or via CLI:**
```bash
supabase migration list
```

---

### Manually Create Test Data

```sql
-- Create test department
INSERT INTO departments (id, name, description)
VALUES (gen_random_uuid(), 'Test Department', 'For testing')
RETURNING *;

-- Create test worker
INSERT INTO workers (
  id,
  first_name,
  last_name,
  email_personal,
  status,
  department_id,
  hire_date
)
VALUES (
  gen_random_uuid(),
  'Test',
  'Worker',
  'test.worker@example.com',
  'active',
  '[DEPARTMENT_ID from above]',
  CURRENT_DATE
)
RETURNING *;

-- Create test workforce project
INSERT INTO workforce_projects (
  id,
  department_id,
  project_code,
  project_name,
  status
)
VALUES (
  gen_random_uuid(),
  '[DEPARTMENT_ID]',
  'TEST001',
  'Test Project',
  'active'
)
RETURNING *;
```

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@/types/supabase'"

**Solution:**
```bash
cd pph-connect
supabase gen types typescript --linked > src/types/supabase.ts
```

---

### Error: "Missing Supabase environment variables"

**Solution:**
1. Check `.env` file exists
2. Verify it has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Restart dev server: `npm run dev`

---

### Error: "Failed to fetch: Could not connect to server"

**Solution:**
1. Check Supabase project is running (go to dashboard)
2. Verify environment variables are correct
3. Check network connection
4. Try: `supabase status`

---

### Types are outdated after schema change

**Solution:**
```bash
cd pph-connect
rm src/types/supabase.ts  # Delete old
supabase gen types typescript --linked > src/types/supabase.ts  # Regenerate
npm run dev  # Restart
```

---

### Can't connect to database from PPH Connect

**Solution:**
1. **Check link:**
   ```bash
   cd pph-connect
   supabase status
   ```

2. **If not linked:**
   ```bash
   supabase link --project-ref nrocepvrheipthrqzwex
   ```

3. **Test connection:**
   ```typescript
   import { supabase } from './lib/supabase/client'

   const { data, error } = await supabase.from('workers').select('count')
   console.log('Connection:', data ? '✅' : '❌', error)
   ```

---

### Migration failed with error

**Solution:**
1. **Read error message carefully**
2. **Check migration dependencies** (do referenced tables exist?)
3. **Test locally first:**
   ```bash
   supabase start
   supabase db reset
   ```
4. **Fix migration file**
5. **Try again:**
   ```bash
   supabase db push
   ```

---

### Need to rollback a migration

**Solution:**
1. **Create down migration:**
   ```bash
   cd maestro-workbench/maestro-workbench-master
   supabase migration new rollback_feature_name
   ```

2. **Write reverse SQL:**
   ```sql
   -- Rollback: [Original Migration Name]
   DROP TABLE IF EXISTS your_table CASCADE;
   -- OR
   ALTER TABLE your_table DROP COLUMN your_column;
   ```

3. **Apply:**
   ```bash
   supabase db push
   ```

**⚠️ WARNING:** Rollbacks can cause data loss. Backup first!

---

## 📚 Links

- [Supabase Dashboard](https://supabase.com/dashboard/project/nrocepvrheipthrqzwex)
- [Table Editor](https://supabase.com/dashboard/project/nrocepvrheipthrqzwex/editor)
- [SQL Editor](https://supabase.com/dashboard/project/nrocepvrheipthrqzwex/sql)
- [Database Logs](https://supabase.com/dashboard/project/nrocepvrheipthrqzwex/logs)
- [API Settings](https://supabase.com/dashboard/project/nrocepvrheipthrqzwex/settings/api)

---

## 📖 Documentation

- [Full Setup Guide](./SUPABASE-SETUP-GUIDE.md)
- [Project Analysis Report](./PROJECT-ANALYSIS-REPORT.md)
- [3-Week Sprint Plan](./3-WEEK-SPRINT-PLAN.md)

---

## ⚠️ Important Reminders

1. **ALL migrations go in Maestro's folder** (not PPH Connect's)
2. **Always run migrations from Maestro directory**
3. **Regenerate types in PPH Connect after schema changes**
4. **Test locally before pushing to production** (`supabase start`)
5. **Backup before major changes** (Supabase Dashboard → Database → Backups)
6. **Never modify existing migrations** (create new ones instead)
7. **Use descriptive names** with `pph_connect_` prefix
8. **Add documentation comments** to all migrations

---

## 🎯 Quick Checklist: Adding New Feature

- [ ] Navigate to Maestro: `cd maestro-workbench/maestro-workbench-master`
- [ ] Create migration: `supabase migration new pph_connect_feature`
- [ ] Write SQL with documentation comment
- [ ] Test locally: `supabase start` → `supabase db reset`
- [ ] Apply to prod: `supabase db push`
- [ ] Update types: `cd ../../pph-connect && supabase gen types typescript --linked > src/types/supabase.ts`
- [ ] Commit migration file
- [ ] Update frontend code to use new schema
- [ ] Test in PPH Connect UI

---

**Last Updated:** November 11, 2025
**Version:** 1.0