# PPH Connect & Maestro Workbench - Comprehensive Development Roadmap
**Master TODO List - All Phases**
*Last Updated: November 2025*

---

## Table of Contents

1. [Architecture & Foundation](#architecture--foundation)
2. [Phase 1: Core Workforce Management](#phase-1-core-workforce-management-pph-connect)
3. [Phase 2: Stats, Messaging & Automation](#phase-2-stats-messaging--automation)
4. [Phase 3: Marketplace & Worker Autonomy](#phase-3-marketplace--worker-autonomy)
5. [Phase 4: Full Lifecycle Automation](#phase-4-full-lifecycle-automation)
6. [Maestro Workbench Enhancements](#maestro-workbench-enhancements)
7. [Feature Extraction: Messaging to PPH Connect](#feature-extraction-messaging-to-pph-connect)
8. [Quality Assurance & Testing](#quality-assurance--testing)
9. [DevOps & Infrastructure](#devops--infrastructure)

---

## Priority Legend

- 🔴 **P0**: Critical - Blocks other work or core functionality
- 🟠 **P1**: High - Important for launch/phase completion
- 🟡 **P2**: Medium - Valuable enhancement
- 🟢 **P3**: Low - Nice to have
- 🔵 **P4**: Future - Long-term enhancement

**Status Icons:**
- ✅ Completed
- 🔨 In Progress
- ⏳ Planned
- 💡 Ideation
- 🚫 Blocked

---

## Architecture & Foundation

### Database Schema & Migrations

#### PPH Connect Core Schema

- [x] 🔴 **Create `departments` table**
  - [x] Define schema with columns: id, department_name, department_code, is_active, timestamps
  - [x] Add unique constraint on department_code
  - [x] Create indexes: idx_departments_code, idx_departments_active
  - [x] Write Supabase migration file
  - [x] Test migration rollback
  - [x] Add RLS policies (admin-only write, all read)

- [x] 🔴 **Create `teams` table**
  - [x] Define schema: id, department_id, team_name, locale_primary, locale_secondary, locale_region, is_active, timestamps
  - [x] Add foreign key to departments
  - [x] Create indexes: idx_teams_department, idx_teams_locale, idx_teams_active
  - [x] Write migration file
  - [x] Add RLS policies
  - [x] Validate locale field constraints (ISO codes)

- [x] 🔴 **Create `workers` table**
  - [x] Define full schema per spec (22 columns)
  - [x] Add self-referential FK for supervisor_id
  - [x] Create ENUM types: engagement_model, worker_status
  - [x] Add unique constraints: hr_id, email_personal, email_pph
  - [x] Create indexes: idx_workers_hr_id, idx_workers_status, idx_workers_supervisor, idx_workers_email
  - [x] Write migration with proper constraints
  - [x] Add RLS policies (admin write, all authenticated read)
  - [x] Add CHECK constraints (prevent self-supervision, valid status transitions)

- [x] 🔴 **Create `worker_accounts` table**
  - [x] Define schema: id, worker_id, worker_account_email, worker_account_id, platform_type, status, is_current, activated_at, deactivated_at, deactivation_reason, timestamps, audit fields
  - [x] Create ENUM: platform_type ('DataCompute', 'Maestro', 'Other')
  - [x] Add unique constraint: (worker_id, platform_type) WHERE is_current = true
  - [x] Create indexes: idx_worker_accounts_worker, idx_worker_accounts_current (partial)
  - [x] Write migration
  - [x] Add RLS policies
  - [x] Test constraint enforcement

- [x] 🔴 **Create `projects` table**
  - [x] Define schema: id, department_id, project_code, project_name, expert_tier, status, start_date, end_date, timestamps, audit fields
  - [x] Create ENUM: project_status, expert_tier
  - [x] Add unique constraint on project_code
  - [x] Create indexes: idx_projects_department, idx_projects_code, idx_projects_status
  - [x] Write migration
  - [x] Add RLS policies

- [x] 🔴 **Create `project_teams` junction table**
  - [x] Define schema: id, project_id, team_id, created_at, created_by
  - [x] Add foreign keys with CASCADE delete
  - [x] Add unique constraint: (project_id, team_id)
  - [x] Create indexes: idx_project_teams_project, idx_project_teams_team
  - [x] Write migration
  - [x] Add RLS policies

- [x] 🔴 **Create `worker_assignments` table**
  - [x] Define schema: id, worker_id, project_id, assigned_at, assigned_by, removed_at, removed_by
  - [x] Add foreign keys
  - [x] Create indexes: idx_worker_assignments_worker, idx_worker_assignments_project, idx_worker_assignments_active (partial WHERE removed_at IS NULL)
  - [x] Write migration
  - [x] Add RLS policies
  - [x] Test soft-delete pattern

#### Phase 2 Schema Extensions

- [x] 🟠 **Create `work_stats` table**
  - [x] Define schema: id, worker_id, worker_account_id, project_id, work_date, units_completed, hours_worked, earnings, created_at, created_by
  - [x] Add foreign keys to workers, worker_accounts, projects
  - [x] Create indexes: idx_work_stats_worker, idx_work_stats_project, idx_work_stats_date, idx_work_stats_account
  - [x] Add unique constraint: (worker_account_id, project_id, work_date)
  - [x] Write migration

- [x] 🟠 **Create `rates_payable` table (rate cards)**
  - [x] Define schema: id, locale, expert_tier, country, rate_per_unit, rate_per_hour, currency, effective_from, effective_to, created_at, created_by
  - [x] Add validation: effective_to > effective_from OR effective_to IS NULL
  - [x] Create indexes: idx_rates_locale_tier_country, idx_rates_effective_dates
  - [x] Write migration

- [x] 🟠 **Create `locale_mappings` table**
  - [x] Define schema: id, client_locale_code, standard_iso_code, locale_name, created_at
  - [x] Add unique constraint on client_locale_code
  - [x] Write migration for ETL standardization

- [x] 🟠 **Create `training_materials` table**
  - [x] Define schema: id, project_id, title, description, type (video/document/link), url, created_at, created_by
  - [x] Add foreign key to projects
  - [x] Create index: idx_training_materials_project
  - [x] Write migration

- [x] 🟠 **Create `training_gates` table**
  - [x] Define schema: id, worker_id, project_id, gate_name, status (passed/failed/pending), score, attempt_count, passed_at, created_at, updated_at
  - [x] Add foreign keys
  - [x] Create indexes: idx_training_gates_worker, idx_training_gates_project
  - [x] Add unique constraint: (worker_id, project_id, gate_name)
  - [x] Write migration

- [x] 🟠 **Create `worker_training_access` table**
  - [x] Define schema: id, worker_id, training_material_id, granted_at, completed_at
  - [x] Add foreign keys
  - [x] Create indexes
  - [x] Write migration

#### Phase 3 Schema Extensions (Marketplace)

- [x] 🟡 **Create `project_listings` table**
  - [x] Define schema: id, project_id, is_active, capacity_max, capacity_current, required_skills, required_locales, required_tier, description, created_at, updated_at
  - [x] Add foreign key to projects
  - [x] Create indexes: idx_project_listings_active, idx_project_listings_project
  - [x] Write migration

- [x] 🟡 **Create `worker_applications` table**
  - [x] Define schema: id, worker_id, project_listing_id, status (pending/approved/rejected), applied_at, reviewed_at, reviewed_by, notes, created_at, updated_at
  - [x] Add ENUM: application_status
  - [x] Add foreign keys
  - [x] Create indexes: idx_worker_applications_worker, idx_worker_applications_listing, idx_worker_applications_status
  - [x] Write migration

- [x] 🟡 **Create `worker_skills` table**
  - [x] Define schema: id, worker_id, skill_name, skill_category (STEM/legal/creative/etc), proficiency_level, verified, verified_at, verified_by, created_at
  - [x] Create ENUM: skill_category, proficiency_level
  - [x] Add indexes: idx_worker_skills_worker, idx_worker_skills_category
  - [x] Write migration

- [x] 🟡 **Create `skill_assessments` table**
  - [x] Define schema: id, worker_id, skill_name, assessment_type, score, passed, taken_at, expires_at, created_at
  - [x] Add foreign keys
  - [x] Create indexes: idx_skill_assessments_worker, idx_skill_assessments_skill
  - [x] Write migration

#### Phase 4 Schema Extensions (Full Automation)

- [x] 🔵 **Create `applications` table (external contractor applications)**
  - [x] Define schema: id, applicant_email, applicant_name, status, application_data (JSON), submitted_at, reviewed_at, reviewed_by
  - [x] Create ENUM: application_status
  - [x] Create indexes
  - [x] Write migration

- [x] 🔵 **Create `skill_verifications` table (AI assessment results)**
  - [x] Define schema: id, worker_id, skill_name, verification_type (ai_interview/assessment/manual), verification_data (JSON), confidence_score, verified_at
  - [x] Add indexes
  - [x] Write migration

- [x] 🔵 **Create `performance_reviews` table**
  - [x] Define schema: id, worker_id, review_period_start, review_period_end, overall_score, quality_score, speed_score, reliability_score, review_data (JSON), created_at, created_by
  - [x] Add indexes: idx_performance_reviews_worker, idx_performance_reviews_period
  - [x] Write migration

- [x] 🔵 **Create `capacity_forecasts` table**
  - [x] Define schema: id, project_id, forecast_date, predicted_demand, predicted_capacity, confidence_score, forecast_data (JSON), created_at
  - [x] Add indexes
  - [x] Write migration

- [x] 🔵 **Create `quality_metrics` table**
  - [x] Define schema: id, worker_id, project_id, metric_type, metric_value, rolling_avg_7d, rolling_avg_30d, percentile_rank, measured_at, created_at
  - [x] Create ENUM: metric_type (accuracy/speed/consistency/etc)
  - [x] Add indexes: idx_quality_metrics_worker, idx_quality_metrics_project, idx_quality_metrics_type
  - [x] Add composite index: (worker_id, project_id, metric_type, measured_at)
  - [x] Write migration

- [x] 🔵 **Create `performance_thresholds` table**
  - [x] Define schema: id, project_id, metric_type, threshold_min, threshold_max, grace_period_days, action_on_violation (warn/remove/etc), created_at, created_by
  - [x] Add foreign key to projects
  - [x] Create indexes
  - [x] Write migration

- [x] 🔵 **Create `auto_removals` table (audit trail)**
  - [x] Define schema: id, worker_id, project_id, removal_reason, metrics_snapshot (JSON), removed_at, can_appeal, appeal_status, created_at
  - [x] Add indexes
  - [x] Write migration

#### Messaging Schema (Extract from Maestro)

- [x] 🟠 **Review existing Maestro messaging schema**
  - [x] Analyze `messages` table structure
  - [x] Analyze `message_threads` table
  - [x] Analyze `message_attachments` table
  - [x] Analyze `groups` and `group_members` tables
  - [x] Analyze `group_read_status` table
  - [x] Document schema for migration to PPH Connect

- [x] 🟠 **Adapt messaging schema for PPH Connect**
  - [x] Modify to work with `workers` table (instead of `profiles`)
  - [x] Add department/team-level messaging support
  - [x] Add broadcast messaging capabilities
  - [x] Ensure RLS policies align with PPH Connect roles
  - [x] Write migration files for PPH Connect

### TypeScript Type Definitions

- [x] 🔴 **Generate TypeScript types from Supabase schema**
  - [x] Set up `supabase gen types` command
  - [x] Configure output path: `src/types/database.ts`
  - [x] Add to CI/CD pipeline for auto-generation on schema changes
  - [x] Document type usage patterns

- [x] 🔴 **Create custom TypeScript types**
  - [x] Define `Worker` interface with computed fields
  - [x] Define `Project` interface with relationships
  - [x] Define filter types: `FilterOperator`, `FilterValue`, `FilterState`
  - [x] Define form types for all CRUD operations
  - [x] Define API response types: `ApiResponse<T>`, `PaginatedResponse<T>`
  - [x] Create `types/index.ts` barrel file

- [x] 🟠 **Create Phase 2 types**
  - [x] Define `WorkStats`, `RateCard`, `Invoice` interfaces
  - [x] Define messaging types (adapt from Maestro)
  - [x] Define training gate types
  - [x] Define qualification types

- [x] 🟡 **Create Phase 3 types**
  - [x] Define `ProjectListing`, `WorkerApplication` interfaces
  - [x] Define `Skill`, `Assessment` interfaces
  - [x] Define marketplace filter types

---

## Phase 1: Core Workforce Management (PPH Connect)

### Authentication & Authorization

- [x] 🔴 **Set up Supabase Auth**
  - [x] Configure email/password provider
  - [x] Set up email templates (confirm signup, reset password)
  - [x] Configure redirect URLs
  - [x] Test signup flow
  - [x] Test login flow
  - [x] Test password reset flow

- [x] 🔴 **Implement AuthContext**
  - [x] Create `contexts/AuthContext.tsx`
  - [x] Implement hooks: `useAuth()`, `useUser()`, `useSession()`
  - [x] Handle session persistence
  - [x] Handle session refresh
  - [x] Add loading states
  - [x] Add error handling

- [x] 🔴 **Create ProtectedRoute component**
  - [x] Implement route guard logic
  - [x] Add redirect to /login when unauthenticated
  - [x] Add loading spinner during auth check
  - [x] Test with authenticated and unauthenticated states

- [x] 🔴 **Build Login Page**
  - [x] Create `pages/LoginPage.tsx`
  - [x] Design login form UI (Shadcn components)
  - [x] Implement form validation (Zod + React Hook Form)
  - [x] Connect to Supabase Auth
  - [x] Add error display (invalid credentials, network errors)
  - [x] Add "Forgot Password" link
  - [x] Add auto-redirect if already logged in
  - [x] Test login flow end-to-end

- [x] 🟠 **Implement admin-only RLS enforcement**
  - [x] Update RLS policies to check for admin email
  - [x] Test write operations (should fail for non-admin)
  - [x] Test read operations (should succeed for authenticated)
  - [x] Add UI indicators for admin vs. non-admin users

- [x] 🟡 **Prepare for Phase 2 RBAC**
  - [x] Document role-based policy structure
  - [x] Plan migration from hardcoded email to role metadata
  - [x] Define role hierarchy: super_admin > admin > manager > team_lead > worker

### Layout & Navigation

- [x] 🔴 **Create MainLayout component**
  - [x] Design sidebar navigation
  - [x] Implement responsive sidebar (collapse on mobile)
  - [x] Create header with user info and logout
  - [x] Add breadcrumb navigation
  - [x] Style with Shadcn + Tailwind
  - [x] Test on desktop, tablet, mobile

- [x] 🔴 **Build Sidebar navigation**
  - [x] Add links: Dashboard, Workers, Projects, Teams, Departments
  - [x] Implement active link highlighting
  - [x] Add icons (from Lucide)
  - [x] Add collapsible sections (if needed)
  - [x] Test navigation between all pages

- [x] 🔴 **Create Header component**
  - [x] Display current user email
  - [x] Add logout button with confirmation
  - [x] Add role badge (admin/manager/etc) for future
  - [x] Add notifications icon (Phase 2)
  - [x] Style consistently

### Dashboard Page

- [x] 🔴 **Create Dashboard page structure**
  - [x] Design layout: summary cards + alerts + quick actions
  - [x] Create responsive grid layout
  - [x] Add page title and description

- [x] 🔴 **Build Summary Cards**
  - [x] Create `SummaryCard` reusable component
  - [x] Fetch counts from Supabase:
    - [x] Total Active Workers
    - [x] Total Active Projects
    - [x] Total Teams
    - [x] Pending Workers
  - [x] Add links to filtered views
  - [x] Add loading skeletons
  - [x] Add error states
  - [x] Style cards with Shadcn Card component

- [x] 🔴 **Build BGC Expiration Alerts Card**
  - [x] Query workers with BGC expiring within 30 days
  - [x] Query workers with expired BGC
  - [x] Display list with: worker name, HR ID, expiration date
  - [x] Add "View" links to worker detail pages
  - [x] Show empty state if none
  - [x] Style with warning colors (yellow/red)
  - [x] Add refresh button

- [x] 🔴 **Create Quick Actions section**
  - [x] Add "Add Worker" button (navigates to /workers with modal open)
  - [x] Add "Add Project" button
  - [x] Add "Bulk Upload Workers" button
  - [x] Style as prominent CTAs
  - [x] Test navigation flows

### Workers Management

#### Workers List Page

- [x] 🔴 **Create WorkersPage component**
  - [x] Set up page layout
  - [x] Add page title with worker count
  - [x] Create top actions bar

- [x] 🔴 **Build Top Actions Bar**
  - [x] Add "Bulk Upload" button (secondary)
  - [x] Add "Add Worker" button (primary)
  - [x] Position buttons correctly
  - [x] Add click handlers (open modals)

- [x] 🔴 **Implement Global Search**
  - [x] Create search input component
  - [x] Add debouncing (300ms)
  - [x] Search across: full_name, hr_id, email_personal, email_pph
  - [x] Use Supabase `.or()` filter
  - [x] Show loading state during search
  - [x] Clear search functionality

- [x] 🔴 **Build Workers Data Table**
  - [x] Set up TanStack Table
  - [x] Define columns:
    - [x] Checkbox (bulk selection)
    - [x] HR ID (sortable, clickable)
    - [x] Name (sortable, clickable)
    - [x] Status (badge, sortable, filterable)
    - [x] Current Email (computed from worker_accounts)
    - [x] Country (sortable, filterable)
    - [x] Locale (sortable, filterable)
    - [x] Hire Date (sortable)
    - [x] BGC Status (icon indicator)
    - [x] Actions (dropdown)
  - [x] Implement column sorting
  - [x] Implement client-side filtering (<500 rows)
  - [x] Implement server-side filtering (500+ rows)
  - [x] Add pagination controls
  - [x] Add rows-per-page selector (10, 20, 50, 100)
  - [x] Show "Showing X to Y of Z results" indicator
  - [x] Add loading skeleton
  - [x] Add empty state

- [x] 🔴 **Implement Bulk Selection**
  - [x] Add "Select all" checkbox in header
  - [x] Add individual row checkboxes
  - [x] Show "X rows selected" indicator
  - [x] Create bulk actions dropdown:
    - [x] Update Status (modal with status selector)
    - [x] Assign to Project (modal with project multi-select)
    - [x] Export Selected (CSV download)
    - [x] Delete Selected (confirmation dialog)
  - [x] Handle bulk operations with loading states
  - [x] Show success/error toasts

- [x] 🔴 **Implement Status Badges**
  - [x] Create `StatusBadge` component
  - [x] Color coding:
    - [x] Pending: yellow
    - [x] Active: green
    - [x] Inactive: gray
    - [x] Terminated: red
  - [x] Style with Shadcn Badge component

- [x] 🔴 **Implement BGC Status Icons**
-  - [x] Create `BGCStatusIcon` component
-  - [x] Logic:
    - Valid: green checkmark ✓
    - Expiring Soon (<30 days): yellow warning ⚠️
    - Expired: red alert ⚠️
  - [x] Add tooltips with expiration date or "Expires in X days"
  - [x] Style with appropriate colors

- [x] 🔴 **Build Actions Dropdown**
  - [x] Use Shadcn DropdownMenu
  - [x] Actions:
    - [x] View Details (navigate to detail page)
    - [x] Edit Worker (open edit modal)
    - [x] Manage Accounts (navigate to accounts tab)
    - [x] Assign to Project (open assignment modal)
  - [x] Add icons to menu items
  - [x] Test all actions

#### Enterprise Filtering System

- [x] 🔴 **Create FilterBar component**
  - [x] Add "Add Filter" button
  - [x] Display active filter chips
  - [x] Add "Clear All Filters" button
  - [x] Show filter count badge

- [x] 🔴 **Build FieldSelectorModal**
  - [x] Create modal component (Shadcn Dialog)
  - [x] Add search bar for fields
  - [x] List all filterable fields for Workers table
  - [x] Make fields clickable
  - [x] Open type-specific filter modal on click

- [x] 🔴 **Build TextFilter component (categorical fields)**
  - [x] Create modal with field name as title
  - [x] Add mode selector dropdown (Include/Exclude/Equal to/Not equal to)
  - [x] Add search bar
  - [x] Implement comma-separated paste support
  - [x] Display value checkboxes with counts
  - [x] Add "Select all" link
  - [x] Show "X of Y selected" indicator
  - [x] Add Apply button
  - [x] Handle null/empty values

- [x] 🔴 **Build DateFilter component**
  - [x] Create modal with operator dropdown
  - [x] Operators: Between, Equal to, Not equal to, Before, After
  - [x] Build quick presets panel:
    - [x] Today, Yesterday, Last 7 days, This week, Last week
    - [x] This month, Last month, This quarter, Last quarter
    - [x] This year, Last year, Custom
  - [x] Implement date range inputs
  - [x] Build calendar picker (Shadcn Calendar)
  - [x] Handle range selection
  - [x] Add Apply button
  - [x] Format dates for display

- [x] 🟠 **Build NumberFilter component (Phase 2)**
  - [x] Create modal with operator dropdown
  - [x] Operators: =, !=, >, <, >=, <=, Between, Not between
  - [x] Add number input(s)
  - [x] Validate numeric entry
  - [x] Add Apply button

- [x] 🔴 **Create ActiveFilterChip component**
  - [x] Display field name and value summary
  - [x] Make chip clickable (reopens filter modal with values)
  - [x] Add X button to remove filter
  - [x] Style with colored border/background

- [x] 🔴 **Implement Filter State Management**
  - [x] Create `useFilterState` hook
  - [x] Define filter state types
  - [x] Handle add/edit/remove filter operations
  - [x] Convert filter state to Supabase query
  - [x] Optional: Encode filters in URL query params

- [x] 🔴 **Integrate Filters with Data Table**
  - [x] Apply filters on table data
  - [x] Show loading state during filtering
  - [x] Update result count
  - [x] Show empty state if no results
  - [x] Combine filters with search (AND logic)

#### Worker Forms & Modals

- [x] 🔴 **Create WorkerForm component**
  - [x] Design form layout (2-3 columns)
  - [x] Fields:
    - [x] HR ID (text, required, unique validation)
    - [x] Full Name (text, required)
    - [x] Engagement Model (select, required)
    - [x] Worker Role (text, optional)
    - [x] Email Personal (email, required, unique)
    - [x] Email PPH (email, optional, unique)
    - [x] Country Residence (select with ISO codes)
    - [x] Locale Primary (select with ISO codes)
    - [x] Locale All (multi-select)
    - [x] Hire Date (date picker, required)
    - [x] RTW Date/Time (datetime picker, optional)
    - [x] Supervisor (searchable select of other workers)
    - [x] Termination Date (date picker, optional)
    - [x] BGC Expiration Date (date picker, optional)
    - [x] Status (select, required)
  - [x] Implement with React Hook Form + Zod validation
  - [x] Add real-time validation on blur
  - [x] Add async validation for unique fields (debounced)
  - [x] Add error display (inline + summary)
  - [x] Add submit button with loading state
  - [x] Handle create and update modes

- [x] 🔴 **Create "Add Worker" modal**
  - [x] Use Shadcn Dialog
  - [x] Embed WorkerForm
  - [x] Handle form submission
  - [x] Add audit fields: created_by, created_at
  - [x] Show success toast
  - [x] Close modal and refresh table
  - [x] Handle errors with error toast

- [x] 🔴 **Create "Edit Worker" modal**
  - [x] Use Shadcn Dialog
  - [x] Load worker data into form
  - [x] Handle form submission
  - [x] Update audit fields: updated_by, updated_at
  - [x] Show success toast
  - [x] Refresh data
  - [x] Handle errors

#### CSV Bulk Upload

- [x] 🔴 **Create BulkUploadModal component**
  - [x] Design multi-step modal (Step 1-5)
  - [x] Use Shadcn Dialog for modal
  - [x] Create step navigation/indicator

- [x] 🔴 **Step 1: Download Template**
  - [x] Create CSV template generator function
  - [x] Include required columns with headers
  - [x] Add one example row
  - [x] Add "Download CSV Template" button
  - [x] Test template download

- [x] 🔴 **Step 2: File Upload**
  - [x] Create drag-and-drop zone
  - [x] Add click-to-browse functionality
  - [x] Accept only .csv files
  - [x] Show selected filename
  - [x] Add validation for file type

- [x] 🔴 **Step 3: Client-Side Validation**
  - [x] Integrate papaparse library
  - [x] Parse CSV file
  - [x] Validate schema (correct columns, no extras)
  - [x] Validate each row:
    - [x] Required fields not empty
    - [x] Email format valid
    - [x] Engagement model is valid enum
    - [x] Status is valid enum
    - [x] Country is 2-letter ISO code
    - [x] Date format is YYYY-MM-DD
    - [x] HR ID doesn't exist (query Supabase)
    - [x] Email doesn't exist (query Supabase)
  - [x] Collect all errors

- [x] 🔴 **Step 4: Validation Results Display**
  - [x] Show error summary if errors found:
    - [x] "X rows have errors"
    - [x] "Y rows are valid"
    - [x] Error details table (Row #, Field, Error Message)
    - [x] "Download Error Report" button (CSV)
    - [x] "Fix and Re-upload" button
  - [x] Show success card if all valid:
    - [x] "✓ All X rows validated successfully"
    - [x] Preview table (first 5 rows)
    - [x] "...and Y more rows" text
    - [x] "Confirm Import" button

- [x] 🔴 **Step 5: Import Execution**
  - [x] Show progress indicator during import
  - [x] Batch insert to Supabase (batches of 10-20)
  - [x] Handle partial failures gracefully
  - [x] Show completion summary:
    - [x] Success: "✓ Successfully imported X of Y workers"
    - [x] Partial: "⚠️ Imported X of Y workers. Z rows failed."
    - [x] Failure: "✗ Import failed. No workers were added."
  - [x] Option to download failed rows CSV
  - [x] "Done" button to close and refresh

- [x] 🔴 **Handle Edge Cases**
  - [x] Empty CSV
  - [x] Wrong file type
  - [x] Corrupted CSV
  - [x] Too many rows (>500 limit)
  - [x] Add appropriate error messages

#### Worker Detail Page

- [x] 🔴 **Create WorkerDetail page structure**
  - [x] Set up route: `/workers/:id`
  - [x] Fetch worker data with relationships
  - [x] Build header section
  - [x] Build profile section
  - [x] Create tabbed sections (Accounts, Projects, Activity)

- [x] 🔴 **Build Header Section**
  - [x] Breadcrumb: Workers > [Worker Name]
  - [x] Display worker name as title
  - [x] Show status badge
  - [x] Show BGC warning badge (if applicable)
  - [x] Quick actions:
    - [x] "Edit Worker" button
    - [x] "Deactivate/Reactivate" button (conditional)
    - [x] More actions dropdown (Terminate, Change Supervisor)

- [x] 🔴 **Build Profile Section**
  - [x] Create card layout (4 columns)
  - [x] Display all worker fields in read-only format
  - [x] Make supervisor name a link to their detail page
  - [x] Compute and display "Current Worker Email" from worker_accounts
  - [x] Show platform badge for current email
  - [x] Add inline edit capability (optional)
  - [x] Format dates nicely
  - [x] Show empty state for optional fields

- [x] 🔴 **Build "Accounts" Tab**
  - [x] Create section title: "Platform Accounts"
  - [x] Add "Add Account" button
  - [x] Build data table:
    - [x] Columns: Platform, Account Email, Account ID, Status, Is Current (badge), Activated Date, Deactivated Date, Actions
    - [x] Show ALL accounts (current + historical)
    - [x] Actions dropdown:
      - [x] View Details
      - [x] Replace Account (if is_current=true)
      - [x] View History (deactivation reason, who, when)
  - [x] Show empty state if no accounts
  - [x] Test full account history display

- [x] 🔴 **Build Account Replacement Workflow**
  - [x] Create "Replace Account" modal
  - [x] Form fields:
    - [x] New Account Email (required, validated)
    - [x] New Account ID (required)
    - [x] Reason for replacement (optional text)
  - [x] Confirm button
  - [x] System logic (transaction):
    - [x] Set old account: is_current=false, deactivated_at=now(), deactivation_reason, status='replaced'
    - [x] Create new account: is_current=true, activated_at=now(), status='active'
  - [x] Show success toast
  - [x] Refresh accounts table

- [x] 🔴 **Build "Projects" Tab**
  - [x] Section title: "Project Assignments"
  - [x] Add "Assign to Project" button
  - [x] Build data table:
    - [x] Columns: Project Code (link), Project Name, Department, Status, Assigned Date, Assigned By (name), Actions
    - [x] Show only CURRENT assignments (removed_at IS NULL)
    - [x] Actions: Remove from Project
  - [x] Add "View Assignment History" link
    - [x] Opens modal with full history
    - [x] Columns: Project, Assigned Date, Assigned By, Removed Date, Removed By
  - [x] Show empty state

- [x] 🔴 **Create "Assign to Project" Modal**
  - [x] Multi-select dropdown of active projects
  - [x] Filter by department
  - [x] Show only projects not already assigned
  - [x] Confirm button
  - [x] Create worker_assignments records
  - [x] Set assigned_by=current_user
  - [x] Show success toast
  - [x] Refresh projects table

- [x] 🔴 **Create "Remove from Project" Action**
  - [x] Confirmation dialog: "Remove [Worker] from [Project]?"
  - [x] Optional: Reason for removal (text field)
  - [x] Confirm button
  - [x] Set removed_at=now(), removed_by=current_user
  - [x] Do NOT delete record
  - [x] Show success toast
  - [x] Refresh projects table

- [x] 🟡 **Build "Activity" Tab (Phase 2 placeholder)**
  - [x] Show placeholder text
  - [x] Plan for future: audit log, training completions, status changes, notes

### Projects Management

#### Projects List Page

- [x] 🔴 **Create ProjectsPage component**
  - [x] Page layout with title and count
  - [x] Top actions bar with "Add Project" button
  - [x] Search bar: "Search by project code or name..."
  - [x] Filter dropdowns: Department, Status, Team, Expert Tier

- [x] 🔴 **Build Projects Data Table**
  - [x] Define columns:
    - [x] Project Code (clickable)
    - [x] Name (clickable)
    - [x] Department (link)
    - [x] Teams (pill list)
    - [x] Status (badge)
    - [x] Expert Tier
    - [x] Start Date
    - [x] End Date
    - [x] Worker Count (badge)
    - [x] Actions (dropdown)
  - [x] Implement sorting
  - [x] Implement filtering (Department, Status, Team multi-select)
  - [x] Add pagination
  - [x] Actions: View Details, Edit, Archive

- [x] 🔴 **Create ProjectForm component**
  - [x] Fields:
    - [x] Project Code (text, required, unique)
    - [x] Project Name (text, required)
    - [x] Department (select, required)
    - [x] Expert Tier (select, required)
    - [x] Status (select, required)
    - [x] Start Date (date picker, optional)
    - [x] End Date (date picker, optional)
  - [x] Validation with Zod
  - [x] Handle create and update modes

- [x] 🔴 **Create "Add Project" modal**
  - [x] Embed ProjectForm
  - [x] Handle submission
  - [x] Add audit fields
  - [x] Show success toast
  - [x] Refresh table

#### Project Detail Page

- [x] 🔴 **Create ProjectDetail page**
  - [x] Route: `/projects/:id`
  - [x] Header section: breadcrumb, title, status badge
  - [x] Quick actions: Edit Project, Assign Workers, Assign Teams
  - [x] Info section (card): all project fields

- [x] 🔴 **Build "Teams" Tab**
  - [x] Section title: "Assigned Teams"
  - [x] "Assign Teams" button
  - [x] Data table:
    - [x] Columns: Team Name (link), Primary Locale, Secondary Locale, Region, Assigned Date, Actions
    - [x] Actions: Remove Team
  - [x] Show teams via project_teams
  - [x] Empty state

- [x] 🔴 **Create "Assign Teams" Modal**
  - [x] Multi-select teams from same department
  - [x] Filter by locale
  - [x] Create project_teams records
  - [x] Show success toast
  - [x] Refresh teams table

- [x] 🔴 **Build "Workers" Tab**
  - [x] Section title: "Assigned Workers"
  - [x] "Assign Workers" button
  - [x] Data table:
    - [x] Columns: HR ID, Name (link), Current Email, Status, Assigned Date, Assigned By, Actions
    - [x] Actions: Remove Worker (sets removed_at)
  - [x] Show current assignments only
  - [x] "View Assignment History" link

- [x] 🔴 **Create "Assign Workers" Modal**
  - [x] Multi-select workers
  - [x] Filters: Status (active by default), Team, Locale
  - [x] Show only workers not currently assigned
  - [x] Batch create worker_assignments
  - [x] Show success toast
  - [x] Refresh workers table

### Teams & Departments Management

#### Teams Management

- [x] 🔴 **Create TeamsPage**
  - [x] Top actions: "Add Team" button
  - [x] Search bar
  - [x] Filters: Department, Is Active
  - [x] Data table:
    - [x] Columns: Team Name (clickable), Department, Primary Locale, Secondary Locale, Region, Active Status (toggle), Actions
    - [x] Sortable columns
    - [x] Actions: View Details, Edit, Deactivate/Activate

- [x] 🔴 **Create TeamForm**
  - [x] Fields:
    - [x] Team Name (text, required)
    - [x] Department (select, required)
    - [x] Locale Primary (select, required, ISO codes)
    - [x] Locale Secondary (select, optional, ISO codes)
    - [x] Locale Region (select, optional, e.g., US, MX, KR)
    - [x] Is Active (checkbox)
  - [x] Validation with Zod
  - [x] Handle create/update

- [x] 🔴 **Create TeamDetail page**
  - [x] Header: Team Name, breadcrumb, Edit button
  - [x] Info card: all team fields with Active Status toggle
  - [x] Related Projects section:
    - [x] List projects using this team
    - [x] Columns: Project Code (link), Name, Status
    - [x] Empty state
  - [x] Related Workers section:
    - [x] Complex query: workers assigned to projects with this team
    - [x] Show unique workers (no duplicates)
    - [x] Empty state

#### Departments Management

- [x] 🔴 **Create DepartmentsPage**
  - [x] Top actions: "Add Department" button
  - [x] Data table:
    - [x] Columns: Department Name (clickable), Code, Teams Count, Projects Count, Active Status (toggle), Actions
    - [x] Actions: Edit, View Teams, View Projects, Deactivate/Activate

- [x] 🔴 **Create DepartmentForm modal**
  - [x] Fields:
    - [x] Department Name (text, required)
    - [x] Department Code (text, required, unique, immutable after creation)
    - [x] Is Active (checkbox)
  - [x] Validation
  - [x] Handle create/update
  - [x] Show immutability message for code on edit

### Validation & Error Handling

- [x] 🔴 **Create Zod validation schemas**
  - [x] `workerSchema` for worker forms
  - [x] `projectSchema` for project forms
  - [x] `teamSchema` for team forms
  - [x] `departmentSchema` for department forms
  - [x] `accountSchema` for worker account forms
  - [x] Export all from `lib/validations/`

- [x] 🔴 **Implement form error display**
  - [x] Inline errors below fields (red text)
  - [x] Error icon in fields
  - [x] Summary error toast on submit failure
  - [x] Field highlighting (red border)

- [x] 🔴 **Add global error handling**
  - [x] Error boundary at app level
  - [x] Error boundary at page level
  - [x] Catch network errors
  - [x] Catch Supabase errors
  - [x] User-friendly error messages (no technical jargon)
  - [x] Console.error for debugging

- [x] 🔴 **Implement success/error toasts**
  - [x] Integrate toast library (Shadcn Toast)
  - [x] Create toast utility functions
  - [x] Use throughout app for feedback

### Utility Functions & Helpers

- [x] 🔴 **Create BGC expiration logic**
  - [x] `lib/utils/bgc.ts`
  - [x] `getBGCStatus(expirationDate)` returns 'valid' | 'expiring' | 'expired'
  - [x] `getDaysUntilExpiration(expirationDate)` returns number
  - [x] `formatBGCWarning(expirationDate)` returns tooltip text

- [x] 🔴 **Create date formatting helpers**
  - [x] `lib/utils/date.ts`
  - [x] `formatDate(date, format)` using date-fns
  - [x] `formatRelativeDate(date)` (e.g., "2 days ago")
  - [x] `isDateInRange(date, start, end)`

- [x] 🔴 **Create CSV helpers**
  - [x] `lib/utils/csv.ts`
  - [x] `generateCSVTemplate(columns)` returns CSV string
  - [x] `parseCSV(file)` returns parsed data
  - [x] `exportToCSV(data, filename)` triggers download

- [x] 🔴 **Create general helpers**
  - [x] `lib/utils/helpers.ts`
  - [x] `cn()` class name utility (from Shadcn)
  - [x] `debounce(fn, delay)` function
  - [x] `formatCurrency(amount, currency)`
  - [x] `truncate(text, length)`

### Supabase Helpers

- [x] 🔴 **Create Supabase client**
  - [x] `lib/supabase/client.ts`
  - [x] Initialize with env vars
  - [x] Export `supabase` instance

- [x] 🔴 **Create auth helpers**
  - [x] `lib/supabase/auth.ts`
  - [x] `signIn(email, password)`
  - [x] `signOut()`
  - [x] `resetPassword(email)`
  - [x] `getCurrentUser()`
  - [x] `getSession()`

- [x] 🔴 **Create data fetching hooks**
  - [x] `hooks/useWorkers.tsx` with React Query
  - [x] `hooks/useProjects.tsx`
  - [x] `hooks/useTeams.tsx`
  - [x] `hooks/useDepartments.tsx`
  - [x] Handle loading, error, success states
  - [x] Implement caching strategies

### Performance Optimization

- [x] 🔴 **Implement pagination**
  - [x] Client-side for <500 rows
  - [x] Server-side for 500+ rows
  - [x] Test with large datasets

- [x] 🔴 **Add React.memo for list items**
  - [x] Wrap table row components
  - [x] Test re-render optimization

- [x] 🔴 **Implement lazy loading**
  - [x] Use React.lazy for route components
  - [x] Add Suspense with loading fallback

- [x] 🔴 **Optimize Supabase queries**
  - [x] Use `.select()` to limit returned columns
  - [x] Use indexes for all query patterns
  - [x] Test query performance

---

## Phase 2: Stats, Messaging & Automation

### Work Stats Import & Processing

#### Stats Import Infrastructure

- [x] 🟠 **Create StatsPage component**
  - [x] Page layout with title
  - [x] "Import Stats" button
  - [x] Stats history table
  - [x] Filters: Date range, Project, Worker

- [x] 🟠 **Build Stats Import Modal**
  - [x] Similar to worker bulk upload
  - [x] Steps: Template download, File upload, Validation, Import
  - [x] CSV columns: worker_account_email, project_code, work_date, units_completed, hours_worked

- [x] 🟠 **Implement Stats Validation**
  - [x] Validate worker_account exists
  - [x] Validate project exists
  - [x] Validate date format
  - [x] Validate numeric values (units, hours > 0)
  - [x] Check for duplicate entries (account + project + date)

- [x] 🟠 **Build Stats ETL Pipeline**
  - [x] Parse CSV data
  - [x] Look up worker_id from worker_account_email
  - [x] Look up project_id from project_code
  - [x] Map client locale codes to standard ISO codes (locale_mappings table)
  - [x] Calculate earnings using rates_payable lookup
  - [x] Batch insert to work_stats table

- [x] 🟠 **Create Stats Dashboard**
  - [x] Summary cards:
    - [x] Total earnings this period
    - [x] Total units completed
    - [x] Total hours worked
    - [x] Active workers
  - [x] Charts:
    - [x] Earnings over time (line chart)
    - [x] Units by project (bar chart)
    - [x] Top earners (leaderboard)

#### Rate Cards Management

- [x] 🟠 **Create RateCardsPage**
  - [x] Data table of rates_payable
  - [x] Columns: Locale, Expert Tier, Country, Rate per Unit, Rate per Hour, Currency, Effective From, Effective To, Actions
  - [x] Add/Edit/Deactivate actions

- [x] 🟠 **Create RateCardForm**
  - [x] Fields: locale, expert_tier, country, rate_per_unit, rate_per_hour, currency, effective_from, effective_to
  - [x] Validation: effective_to > effective_from
  - [x] Handle create/update

- [x] 🟠 **Build Rate Lookup Service**
  - [x] `services/rateService.ts`
  - [x] `getRateForWorker(workerId, projectId, date)` returns applicable rate
  - [x] Handle effective date ranges
  - [x] Fallback logic if no exact match

#### Balance Aggregation

- [x] 🟠 **Create Balance Calculation Service**
  - [x] `services/balanceService.ts`
  - [x] `calculateWorkerBalance(workerId, startDate, endDate)` returns total earnings
  - [x] `getBalanceBreakdown(workerId, startDate, endDate)` returns earnings by project
  - [x] Aggregate SUM(earnings) from work_stats

- [x] 🟠 **Add Balance Display to Worker Detail**
  - [x] New tab: "Earnings"
  - [x] Summary card: Total balance, This month, This quarter
  - [x] Breakdown table: By project, by date
  - [x] Charts: Earnings over time

### Messaging System (Extract from Maestro)

#### Schema Migration

- [x] 🟠 **Extract messaging schema from Maestro**
  - [x] Copy migration files for messaging tables
  - [x] Adapt to use `workers` table instead of `profiles`
  - [x] Update foreign keys
  - [x] Update RLS policies for PPH Connect roles
  - [x] Test schema in PPH Connect Supabase instance

#### Components Migration

- [x] 🟠 **Extract messaging components from Maestro**
  - [x] Copy `/src/pages/messages/*` folder
  - [x] Copy `/src/components/messages/*` folder
  - [x] Copy `/src/components/messaging/*` (rich text editor)
  - [x] Copy `/src/hooks/useMessageNotifications.tsx`

- [x] 🟠 **Adapt components for PPH Connect**
  - [x] Update import paths
  - [x] Replace `profiles` references with `workers`
  - [x] Update role checks (admin/manager/worker instead of root/admin/manager/worker)
  - [x] Test all messaging pages

#### Edge Functions Migration

- [x] 🟠 **Extract Supabase Edge Functions**
  - [x] Copy `/supabase/functions/send-message/*`
  - [x] Copy `/supabase/functions/validate-message-permissions/*`
  - [x] Adapt for PPH Connect database schema
  - [ ] Deploy to PPH Connect Supabase project
  - [x] Test message sending

#### Messaging Features Testing

- [x] 🟠 **Test Direct Messaging**
  - [x] Send message worker → manager
  - [x] Send message manager → worker
  - [x] Reply to thread
  - [x] View thread history
  - [x] Mark as read

- [x] 🟠 **Test Group Conversations**
  - [x] Create group
  - [x] Add/remove members
  - [x] Send group message
  - [x] View group info
  - [x] Leave group
  - [x] Track read status

- [x] 🟠 **Test Broadcast Messaging**
  - [x] Send broadcast to department
  - [x] Send broadcast to team
  - [x] Send broadcast to all workers
  - [x] Verify delivery

- [x] 🟠 **Test Attachments**
  - [x] Upload file to message
  - [x] Download attachment
  - [x] Verify storage bucket permissions

- [x] 🟠 **Test Notifications**
  - [x] Unread count badge
  - [x] Real-time notification on new message
  - [x] Notification clearing on read

### Training Materials & Gates

#### Training Infrastructure

- [x] 🟠 **Create TrainingPage (admin/manager view)**
  - [x] List all training materials
  - [x] Upload/link training content
  - [x] Assign materials to projects
  - [x] Track worker access

- [x] 🟠 **Create TrainingMaterialForm**
  - [x] Fields:
    - [x] Project (select)
    - [x] Title (text, required)
    - [x] Description (textarea)
    - [x] Type (select: video, document, link)
    - [x] URL (text, required)
  - [x] Validation
  - [x] Upload to storage bucket (if file)

- [x] 🟠 **Build Training Gates System**
  - [x] Create gate definition interface
  - [x] Link gates to projects (required for assignment)
  - [x] Manager can mark gate as passed/failed for worker
  - [x] Store gate history (attempts, scores)

- [x] 🟠 **Add Training to Worker Detail**
  - [x] New tab: "Training"
  - [x] List assigned training materials
  - [x] Show completion status
  - [x] List gate pass/fail status
  - [x] Allow re-taking failed gates

- [x] 🟠 **Implement Gate Blocking**
  - [x] When assigning worker to project, check required gates
  - [x] Block assignment if gates not passed
  - [x] Show warning with list of required gates
  - [x] Provide link to training materials

### Automated Quality Control (Foundation)

#### Quality Metrics Collection

- [x] 🟠 **Create QualityMetricsService**
  - [x] `services/qualityService.ts`
  - [x] `calculateWorkerQualityScore(workerId, projectId)` returns composite score
  - [x] `getGoldStandardAccuracy(workerId, projectId)` returns pass rate
  - [x] `getInterAnnotatorAgreement(taskId)` returns consensus score
  - [x] `updateWorkerTrustRating(workerId)` based on recent performance

- [x] 🟠 **Implement Gold Standard Task Embedding**
  - [x] Add `is_gold_standard` boolean to `questions` table in Maestro
  - [x] Store `correct_answer` for gold standard questions
  - [x] Randomly insert gold standards into worker task queues
  - [x] Calculate accuracy automatically on submission
  - [x] Update worker quality score in real-time

- [x] 🟠 **Build Quality Dashboard (Manager)**
  - [x] Page: `/quality`
  - [x] Real-time metrics:
    - [x] Overall project quality score
    - [x] Gold standard pass rate
    - [x] Inter-annotator agreement
    - [x] Per-worker trust ratings
    - [x] Quality trends over time
  - [x] Charts:
    - [x] Quality over time (line chart)
    - [x] Worker performance distribution (histogram)
    - [x] Project quality comparison (bar chart)

- [x] 🟠 **Build Worker Self-Service Quality View**
  - [x] Add to worker dashboard
  - [x] Personal quality scorecard:
    - [x] Overall quality score
    - [x] Gold standard accuracy
    - [x] Percentile rank (anonymized peer comparison)
    - [x] Recent performance trend
    - [x] Areas for improvement

#### Performance-Based Access

- [x] 🟠 **Create Performance Access Algorithm**
  - [x] `services/accessService.ts`
  - [x] `getAvailableProjects(workerId)` returns projects based on:
    - [x] Worker quality score > project threshold
    - [x] Required qualifications passed
    - [x] Training gates completed
    - [x] No recent quality violations
  - [x] Filter out projects where worker is below quality threshold

- [x] 🟠 **Implement Dynamic Project Visibility**
  - [x] Workers see only projects they qualify for
  - [x] Show "locked" projects with requirements to unlock
  - [x] Display clear criteria for access

- [x] 🟠 **Build Quality Violation Warnings**
  - [x] Trigger warnings when quality score drops below threshold
  - [x] Send message to worker with:
    - [x] Current score
    - [x] Threshold requirement
    - [x] Recommended actions (training, review guidelines)
    - [x] Timeline to improve
  - [x] Log warnings for audit trail

#### Automated Interventions (Basic)

- [x] 🟠 **Implement Low-Quality Task Reassignment**
  - [x] When task quality score < threshold:
    - [x] Mark task as "needs review"
    - [x] Reassign to higher-trust worker
    - [x] Notify original worker (with feedback)
    - [x] Log reassignment event
  - [x] Track reassignment metrics

- [x] 🟠 **Create Quality Alert System**
  - [x] Real-time alerts for managers when:
    - [x] Worker quality drops significantly
    - [x] Gold standard fail rate spikes
    - [x] Project overall quality declining
  - [x] Dashboard notifications
  - [x] Email alerts (optional)

### Qualification & Assessment System

#### Assessment Creation

- [x] 🟠 **Create AssessmentsPage (admin view)**
  - [x] List all assessments
  - [x] Create new assessments
  - [x] Assign assessments to workers or projects
  - [x] View results

- [x] 🟠 **Build Assessment Creator**
  - [x] Define assessment metadata: name, category (modality/domain), passing score
  - [x] Add questions:
    - [x] Multiple choice
    - [x] True/False
    - [x] Short answer (manual grading)
    - [x] Task-based (practical evaluation)
  - [x] Store in `skill_assessments` table

- [x] 🟠 **Implement Assessment Taking Flow**
  - [x] Worker navigates to assessments
  - [x] Start assessment
  - [x] Answer questions
  - [x] Submit for grading
  - [x] Show results (pass/fail, score)

- [x] 🟠 **Auto-Grading Logic**
  - [x] Grade multiple choice automatically
  - [x] Calculate final score
  - [x] Compare against passing threshold
  - [x] Update worker qualification status
  - [x] Notify worker of results

- [x] 🟠 **Manual Grading Interface**
  - [x] Manager review queue for short answer/task-based
  - [x] Grading rubric display
  - [x] Score input
  - [x] Feedback textarea
  - [x] Submit grade

#### Qualification Management

- [x] 🟠 **Link Qualifications to Projects**
  - [x] Add `required_qualifications` field to projects (JSON array)
  - [x] Display required qualifications on project detail
  - [x] Check qualifications before allowing assignment

- [x] 🟠 **Display Worker Qualifications**
  - [x] Worker detail page → Qualifications tab
  - [x] List all passed qualifications with scores
  - [x] List available qualifications to take
  - [x] Show expiration dates (if re-qualification required)

- [x] 🟠 **Implement Re-Qualification Logic**
  - [x] Set expiration periods for qualifications (e.g., 6 months)
  - [x] Trigger re-qualification reminders
  - [x] Block project access if qualification expired

### RBAC (Role-Based Access Control)

#### Role System Implementation

- [x] 🟠 **Define role hierarchy**
  - [x] Roles: super_admin, admin, manager, team_lead, worker
  - [x] Store in Supabase Auth user metadata

- [x] 🟠 **Create User Management Page**
  - [x] Admin-only page: `/users`
  - [x] List all users
  - [x] Assign roles
  - [x] Activate/deactivate users

- [x] 🟠 **Update RLS Policies**
  - [x] Replace hardcoded email checks with role checks
  - [x] Policies for each role:
    - [x] super_admin: full access
    - [x] admin: manage workers, projects, teams (no admin management)
    - [x] manager: manage assigned workers and projects (read-only departments/teams)
    - [x] team_lead: view everything, edit assignments for their team only
    - [x] worker: self-service view (own profile, assignments, balances - read-only)

- [x] 🟠 **Implement Role-Aware UI**
  - [x] Hide/show features based on role
  - [x] Disable actions for insufficient permissions
  - [x] Show role badge in header
  - [x] Add permission checks before API calls

#### Worker Self-Service Portal

- [x] 🟠 **Create Worker Dashboard**
  - [x] Separate route: `/worker/dashboard`
  - [x] Summary cards:
    - [x] Current projects
    - [x] This month's earnings
    - [x] Pending tasks
    - [x] Quality score
  - [x] Quick actions:
    - [x] View assignments
    - [x] View training
    - [x] Send message to manager
    - [x] View earnings

- [x] 🟠 **Build Worker Profile View**
  - [x] Route: `/worker/profile`
  - [x] Display worker info (read-only)
  - [x] Contact information
  - [x] Current email and platform accounts
  - [x] Earnings summary

- [x] 🟠 **Create Worker Assignments View**
  - [x] Route: `/worker/assignments`
  - [x] List current project assignments
  - [x] Show project details, start date
  - [x] Link to Maestro workbench for task completion

- [x] 🟠 **Build Worker Training View**
  - [x] Route: `/worker/training`
  - [x] List assigned training materials
  - [x] Show completion status
  - [x] List gate requirements
  - [x] Link to take assessments

- [x] 🟠 **Create Worker Earnings View**
  - [x] Route: `/worker/earnings`
  - [x] Total balance
  - [x] Breakdown by project
  - [x] Earnings history table
  - [x] Charts (earnings over time)

### Invoice Generation

#### Invoice Data Model

- [x] 🟡 **Create invoices table**
  - [x] Schema: id, worker_id, period_start, period_end, total_amount, status (draft/submitted/approved/paid), created_at, approved_at, approved_by

- [x] 🟡 **Create invoice_line_items table**
  - [x] Schema: id, invoice_id, project_id, worker_account_id, units, hours, rate, amount, created_at

- [x] 🟡 **Create invoice_adjustments table**
  - [x] Schema: id, invoice_id, adjustment_type (bonus/deduction), amount, reason, created_at, created_by

#### Invoice Generation Logic

- [x] 🟡 **Create InvoiceService**
  - [x] `services/invoiceService.ts`
  - [x] `generateInvoicePreview(workerId, startDate, endDate)` returns invoice data
  - [x] Aggregate work_stats for period
  - [x] Group by project
  - [x] Calculate totals
  - [x] Apply adjustments

- [x] 🟡 **Build Invoice Preview Page**
  - [x] Route: `/invoices/:id/preview`
  - [x] Display invoice header: worker, period, total
  - [x] Line items table: project, units, hours, rate, amount
  - [x] Adjustments section: bonuses, deductions with reasons
  - [x] Total calculation
  - [x] Actions: Approve, Edit, Download PDF

- [x] 🟡 **Implement Invoice PDF Generation**
  - [x] Use library (e.g., jsPDF, react-pdf)
  - [x] Design invoice template
  - [x] Populate with invoice data
  - [x] Generate downloadable PDF

- [x] 🟡 **Create Invoice Management Page**
  - [x] Route: `/invoices`
  - [x] List all invoices
  - [x] Filters: Worker, Status, Date range
  - [x] Actions: View, Approve, Download
  - [x] Status badges

- [x] 🟡 **Build Invoice Approval Workflow**
  - [x] Manager reviews invoice
  - [x] Approve button
  - [x] Update status to approved
  - [x] Set approved_at, approved_by
  - [x] Notify worker
  - [x] Lock invoice (no further edits)

- [x] 🟡 **Add Invoice Tab to Worker Detail**
  - [x] List all invoices for worker
  - [x] Show status
  - [x] Download links

---

## Phase 3: Marketplace & Worker Autonomy

### Project Marketplace

#### Marketplace Infrastructure

- [x] 🟡 **Create project_listings table** (if not done)
  - [x] Schema defined in Architecture section

- [x] 🟡 **Create ProjectListingsPage (admin/manager)**
  - [x] Create listings for projects
  - [x] Set capacity limits
  - [x] Define requirements (skills, locales, tier)
  - [x] Activate/deactivate listings

- [x] 🟡 **Build Project Listing Form**
  - [x] Fields:
    - [x] Project (select)
    - [x] Is Active (checkbox)
    - [x] Max Capacity (number)
    - [x] Required Skills (multi-select)
    - [x] Required Locales (multi-select)
    - [x] Required Tier (select)
    - [x] Description (textarea)
  - [x] Validation

#### Worker Marketplace Experience

- [x] 🟡 **Create AvailableProjectsPage (worker view)**
  - [x] Route: `/worker/projects/available`
  - [x] Browse active project listings
  - [x] Display project cards with:
    - [x] Project name and code
    - [x] Description
    - [x] Required skills, locales, tier
    - [x] Capacity (X of Y spots filled)
    - [x] Estimated compensation
    - [x] "Apply" button
  - [x] Filters: Skills, Locale, Tier
  - [x] Search

- [x] 🟡 **Implement Automated Eligibility Checking**
  - [x] When worker views project, check:
    - [x] Worker tier >= required tier
    - [x] Worker locales overlap with required locales
    - [x] Worker skills match required skills
    - [x] Training gates passed
    - [x] Quality score meets threshold
  - [x] Show "Apply" button if eligible, "Not Eligible" badge otherwise
  - [x] Display specific requirements not met

- [x] 🟡 **Build Application Flow**
  - [x] Worker clicks "Apply"
  - [x] Confirmation modal: "Apply to [Project]?"
  - [x] Optional: Cover message (textarea)
  - [x] Submit application
  - [x] Create record in worker_applications
  - [x] Notify manager

- [x] 🟡 **Create MyApplicationsPage (worker view)**
  - [x] Route: `/worker/applications`
  - [x] List all applications
  - [x] Statuses: Pending, Approved, Rejected
  - [x] Show application date
  - [x] Show review notes (if any)

#### Application Review (Manager)

- [x] 🟡 **Create ProjectApplicationsPage (manager view)**
  - [x] Route: `/manager/projects/:id/applications`
  - [x] List applications for project
  - [x] Display worker info:
    - [x] Name, HR ID
    - [x] Quality score, tier
    - [x] Skills, locales
    - [x] Cover message
  - [x] Actions: Approve, Reject

- [x] 🟡 **Implement Application Approval**
  - [x] Manager clicks "Approve"
  - [x] Create worker_assignment record
  - [x] Update application status to "approved"
  - [x] Notify worker
  - [x] Decrement available capacity

- [x] 🟡 **Implement Application Rejection**
  - [x] Manager clicks "Reject"
  - [x] Optional: Rejection reason (textarea)
  - [x] Update application status to "rejected"
  - [x] Store notes
  - [x] Notify worker

### AI-Powered Interview System

#### Interview Infrastructure

- [x] 🟡 **Research AI interview platforms**
  - [x] Evaluate: OpenAI GPT-4, Anthropic Claude, custom fine-tuned models
  - [x] Assess: cost, latency, quality, multilingual support
  - [x] Select platform

- [x] 🟡 **Design interview question bank**
  - [x] Categorize by domain: STEM, legal, creative, medical, etc.
  - [x] Create adaptive question trees (follow-up based on answers)
  - [x] Define evaluation criteria per domain

- [x] 🟡 **Build AI Interview Service**
  - [x] `services/aiInterviewService.ts`
  - [x] `startInterview(workerId, domain)` initializes session
  - [x] `askQuestion(sessionId, context)` generates next question
  - [x] `evaluateAnswer(sessionId, answer)` scores response
  - [x] `generateInterviewReport(sessionId)` produces transcript + score

- [x] 🟡 **Create Interview UI (Worker)**
  - [x] Route: `/worker/interview/:domain`
  - [x] Chat-like interface
  - [x] Display AI interviewer questions
  - [x] Worker types/speaks answers
  - [x] Real-time conversation
  - [x] Progress indicator
  - [x] Submit when complete

- [x] 🟡 **Implement Speech-to-Text (Optional)**
  - [x] Integrate speech recognition API
  - [x] Allow workers to speak answers
  - [x] Transcribe to text
  - [x] Improves accessibility and UX

- [x] 🟡 **Store Interview Data**
  - [x] Create `ai_interviews` table:
    - [x] id, worker_id, domain, questions_asked (JSON), answers_given (JSON), transcript, score, confidence, conducted_at
  - [x] Save full transcript
  - [x] Save evaluation score
  - [x] Link to skill_verifications

- [x] 🟡 **Build Interview Review Interface (Manager)**
  - [x] Route: `/manager/interviews/:id`
  - [x] Display full transcript
  - [x] Show AI-generated score and confidence
  - [x] Manager can override score
  - [x] Approve/reject interview results
  - [x] Add notes

- [x] 🟡 **Integrate Interview Results with Worker Profile**
  - [x] Display interview scores on worker detail
  - [x] Link to transcript
  - [x] Use scores for expertise verification
  - [x] Factor into tier assignments

### Progressive Task Unlocking & Gamification

#### Task Difficulty Tiers

- [x] 🟡 **Define task difficulty levels**
  - [x] Levels: Beginner, Intermediate, Advanced, Expert
  - [x] Link to expert_tier (tier0, tier1, tier2)
  - [x] Add `difficulty_level` field to Maestro `task_templates`

- [x] 🟡 **Implement Progressive Unlocking Logic**
  - [x] New workers start with Beginner tasks
  - [x] Unlock criteria:
    - [x] Completion count thresholds (e.g., 50 Beginner tasks)
    - [x] Quality score minimums (e.g., >90% accuracy)
    - [x] Training gate completion
    - [x] Domain assessments passed
  - [x] Algorithm checks criteria before showing higher difficulty tasks

- [x] 🟡 **Build Task Unlocking Service**
  - [x] `services/taskUnlockService.ts`
  - [x] `getUnlockedDifficulties(workerId)` returns array of unlocked levels
  - [x] `checkUnlockCriteria(workerId, difficulty)` returns boolean + missing requirements
  - [x] `unlockDifficulty(workerId, difficulty)` when criteria met

- [x] 🟡 **Display Unlock Progress**
  - [x] Worker dashboard shows:
    - [x] Current unlocked difficulties
    - [x] Progress toward next unlock (e.g., "Complete 20 more tasks to unlock Intermediate")
    - [x] Visual progress bar

#### Gamification Elements

- [x] 🟡 **Design Achievement System**
  - [x] Define achievements:
    - [x] "First 10 Tasks"
    - [x] "100 Tasks Completed"
    - [x] "Quality Master" (100% accuracy streak)
    - [x] "Speed Demon" (top 10% completion speed)
    - [x] "Domain Expert" (pass advanced assessment)
  - [x] Create `achievements` table: id, name, description, criteria, icon
  - [x] Create `worker_achievements` table: id, worker_id, achievement_id, earned_at

- [x] 🟡 **Implement Achievement Tracking**
  - [x] Monitor worker actions (task completion, quality scores, etc.)
  - [x] Check achievement criteria after each action
  - [x] Award achievements when earned
  - [x] Notify worker (toast, message)

- [x] 🟡 **Build Achievements Display**
  - [x] Worker profile → Achievements tab
  - [x] Display earned achievements with icons
  - [x] Show locked achievements (grayed out)
  - [x] Progress toward locked achievements

- [x] 🟡 **Create Leaderboards (Optional)**
  - [x] Route: `/worker/leaderboard`
  - [x] Rankings:
    - [x] Top earners (this month)
    - [x] Highest quality scores
    - [x] Most tasks completed
    - [x] Fastest average completion time
  - [x] Anonymized (show rank position, not full list)
  - [x] Opt-in participation

- [x] 🟡 **Implement Skill Trees (Advanced)**
  - [x] Visual representation of skill progression
  - [x] Nodes: skills, assessments, achievements
  - [x] Paths to unlock advanced skills
  - [x] Interactive UI (click nodes to see requirements)

### Community & Knowledge Sharing

#### Forum/Discussion Board

- [x] 🟡 **Design community forum structure**
  - [x] Categories: General, Project-specific, Training, Feedback
  - [x] Threads and replies
  - [x] Voting/upvoting helpful posts

- [x] 🟡 **Create forum tables**
  - [x] `forum_categories`: id, name, description
  - [x] `forum_threads`: id, category_id, title, author_id, created_at, pinned, locked
  - [x] `forum_posts`: id, thread_id, author_id, content, created_at, edited_at, upvotes
  - [x] `forum_votes`: id, post_id, voter_id, vote_type (upvote/downvote)

- [x] 🟡 **Build Forum UI**
  - [x] Route: `/community`
  - [x] List categories
  - [x] Click category → view threads
  - [x] Click thread → view posts and reply
  - [x] Create new thread button
  - [x] Markdown support for posts

- [x] 🟡 **Implement Moderation**
  - [x] Assign moderator role to trusted workers
  - [x] Moderator actions:
    - [x] Pin/unpin threads
    - [x] Lock/unlock threads
    - [x] Delete inappropriate posts
    - [x] Ban users (escalate to admin)
  - [x] Report button for users to flag content

- [x] 🟡 **Add Notifications for Forum Activity**
  - [x] Notify when:
    - [x] Reply to your thread
    - [x] Mention in post
    - [x] Upvotes on your post
  - [x] Preferences: email, in-app, or none

#### Knowledge Base / FAQ

- [x] 🟡 **Create knowledge base structure**
  - [x] Categories: Getting Started, Best Practices, Troubleshooting, Policies
  - [x] Articles with rich text content

- [x] 🟡 **Build KB tables**
  - [x] `kb_categories`: id, name, description
  - [x] `kb_articles`: id, category_id, title, content, author_id, created_at, updated_at, views

- [x] 🟡 **Create KB UI**
  - [x] Route: `/help`
  - [x] Search bar
  - [x] Browse categories
  - [x] View article
  - [x] Related articles suggestions
  - [x] "Was this helpful?" feedback

- [x] 🟡 **Implement Article Creation (Admin/Manager)**
  - [x] Rich text editor
  - [x] Upload images/videos
  - [x] Publish/draft status
  - [x] Version history

### Comprehensive Support System

#### Multi-Channel Support

- [x] 🟡 **Build Self-Service Support**
  - [x] FAQ section (KB articles)
  - [x] Video tutorials (embed YouTube/Vimeo)
  - [x] Troubleshooting guides
  - [x] Search functionality

- [x] 🟡 **Create Ticket System**
  - [x] Route: `/support/tickets`
  - [x] Worker can create support ticket
  - [x] Form: Subject, Category (technical/payment/other), Priority, Description
  - [x] Submit ticket
  - [x] Track status (open/in_progress/resolved)

- [x] 🟡 **Build Ticket Management (Support Team)**
  - [x] Route: `/manager/tickets`
  - [x] List all tickets
  - [x] Filters: Status, Priority, Category
  - [x] Assign to support agent
  - [x] Reply to ticket (threaded conversation)
  - [x] Mark as resolved

- [x] 🟡 **Implement Live Chat (Optional)**
  - [x] Integrate chat widget (e.g., Intercom, Crisp)
  - [x] 24/7 availability (use chatbot for off-hours)
  - [x] Escalate to human agent when needed

#### Anonymous Reporting Channel

- [x] 🟡 **Create Anonymous Hotline**
  - [x] Route: `/report`
  - [x] Form: Report type (harassment, unfair treatment, system issue, other), Description
  - [x] Submit anonymously (no user ID logged)
  - [x] Generate unique ticket ID for follow-up

- [x] 🟡 **Build Hotline Management (Admin)**
  - [x] Route: `/admin/reports`
  - [x] View all anonymous reports
  - [x] Investigate and respond
  - [x] Track resolution
  - [x] Audit trail (without compromising anonymity)

- [x] 🟡 **Add Support Resources to All Pages**
  - [x] Footer links: Help Center, Contact Support, Report Issue
  - [x] Floating help button (always visible)

---

## Phase 4: Full Lifecycle Automation

### External Application Portal

#### Public Application Form

- [x] 🔵 **Create public application page**
  - [x] Route: `/apply` (public, no auth required)
  - [x] Form fields:
    - [x] Full Name
    - [x] Email
    - [x] Country of Residence
    - [x] Primary Language/Locale
    - [x] All Languages (multi-select)
    - [x] Educational Background (select: Bachelor's, Master's, PhD, Other)
    - [x] Domains of Expertise (multi-select: STEM, Legal, Creative, Medical, etc.)
    - [x] Resume/CV upload
    - [x] Cover letter (textarea)
    - [x] How did you hear about us? (select)
  - [x] reCAPTCHA to prevent spam
  - [x] Submit application

- [x] 🔵 **Store application data**
  - [x] Create record in `applications` table
  - [x] Store application_data as JSON
  - [x] Status: pending
  - [x] Notify admin of new application

#### Application Review Workflow

- [x] 🔵 **Create ApplicationsPage (admin view)**
  - [x] Route: `/admin/applications`
  - [x] List all applications
  - [x] Filters: Status, Domain, Date submitted
  - [x] Actions: Review, Reject

- [x] 🔵 **Build Application Review Interface**
  - [x] Display applicant details
  - [x] View resume/CV
  - [x] Read cover letter
  - [x] Actions:
    - [x] Schedule AI interview
    - [x] Request additional info
    - [x] Reject with reason
    - [x] Approve and convert to worker

- [x] 🔵 **Implement Application Approval**
  - [x] Admin clicks "Approve"
  - [x] Create worker record
  - [x] Set status to pending
  - [x] Trigger onboarding workflow:
    - [x] Send welcome email
    - [x] Provide login credentials
    - [x] Assign initial training
  - [x] Update application status to approved

#### Background Check Integration

- [x] 🔵 **Research BGC providers**
  - [x] Evaluate: Checkr, Sterling, HireRight
  - [x] API integration capabilities
  - [x] Cost, turnaround time

- [x] 🔵 **Integrate BGC API**
  - [x] Trigger BGC on worker creation
  - [x] Store BGC order ID
  - [x] Poll for results or receive webhook
  - [x] Update worker profile with expiration date

- [x] 🔵 **Automate BGC Expiration Monitoring**
  - [x] Scheduled job (daily) to check expiring BGCs
  - [x] Send reminders 60 days, 30 days, 7 days before expiration
  - [x] Automatically initiate new BGC if needed
  - [x] Suspend worker if BGC expires without renewal

### Advanced AI & ML Systems

#### ML-Powered Quality Control

- [x] 🔵 **Build Anomaly Detection Model**
  - [x] Collect training data: task completions, quality labels
  - [x] Features:
    - [x] Time to complete
    - [x] Answer length
    - [x] Similarity to other answers
    - [x] Worker historical patterns
  - [x] Train model to classify: normal vs. anomalous
  - [x] Deploy model as API endpoint

- [x] 🔵 **Integrate Anomaly Detection**
  - [x] Call model on task submission
  - [x] Score: 0-1 (anomaly probability)
  - [x] If score > threshold:
    - [x] Flag for review
    - [x] Do not count toward worker metrics
    - [x] Trigger investigation

- [x] 🔵 **Build Predictive Quality Model**
  - [x] Features: worker history, task type, complexity, time of day
  - [x] Target: predicted quality score
  - [x] Train regression model
  - [x] Use predictions to:
    - [x] Proactively route low-confidence tasks to expert review
    - [x] Adjust task assignments
    - [x] Trigger warnings

- [x] 🔵 **Implement Automated Error Pattern Analysis**
  - [x] Cluster errors by type
  - [x] Identify per-worker error patterns
  - [x] Generate reports:
    - [x] "Worker X frequently misses Y"
    - [x] "Task type Z has high error rate"
  - [x] Recommend personalized training

#### Worker-Task Matching Optimization

- [x] 🔵 **Build Matching Score Model**
  - [x] Features:
    - [x] Worker expertise in task domain
    - [x] Historical performance on similar tasks
    - [x] Current workload
    - [x] Availability
    - [x] Learning curve (new domains)
  - [x] Target: probability of high-quality completion
  - [x] Train model on historical data

- [x] 🔵 **Implement ML-Powered Assignment**
  - [x] When task enters queue:
    - [x] Score all eligible workers
    - [x] Rank by predicted quality
    - [x] Apply business rules (fairness, load balancing)
    - [x] Assign to top-ranked available worker
  - [x] Log assignment decisions for analysis

- [x] 🔵 **Build Load Balancing Algorithm**
  - [x] Track real-time worker capacity
  - [x] Distribute tasks evenly among qualified workers
  - [x] Prevent monopolization by top performers
  - [x] Ensure fair access to work

#### Predictive Analytics

- [x] 🔵 **Build Project Completion Forecasting**
  - [x] Input: project metrics (total tasks, completion rate, worker performance)
  - [x] Model: time series forecasting (ARIMA, Prophet, or ML)
  - [x] Output: predicted completion date with confidence interval
  - [x] Update forecast daily

- [x] 🔵 **Create Capacity Planning Model**
  - [x] Forecast demand: upcoming projects, task volume
  - [x] Forecast supply: available workers, capacity
  - [x] Predict gaps (demand > supply)
  - [x] Recommend proactive recruitment or task throttling

- [x] 🔵 **Build Quality Trend Analysis**
  - [x] Time series model for quality metrics
  - [x] Predict future quality based on trends
  - [x] Alert if declining trajectory
  - [x] Recommend interventions

### Autonomous Performance Management

#### Automated Tier Advancement/Demotion

- [x] 🔵 **Define Tier Criteria**
  - [x] Tier0 → Tier1:
    - [x] 500+ tasks completed
    - [x] 95%+ quality score (90-day average)
    - [x] Pass Tier1 assessments
    - [x] No quality violations in 90 days
  - [x] Tier1 → Tier2:
    - [x] 1000+ tasks completed
    - [x] 98%+ quality score
    - [x] Pass Tier2 assessments
    - [x] Domain expert interview
  - [x] Demotion criteria:
    - [x] Quality score below threshold for 30 days
    - [x] Multiple quality violations

- [x] 🔵 **Build Tier Evaluation Service**
  - [x] Scheduled job (weekly) to evaluate all workers
  - [x] Check criteria for advancement
  - [x] Check criteria for demotion
  - [x] Generate promotion/demotion recommendations
  - [x] Notify manager for review

- [x] 🔵 **Implement Automated Tier Changes**
  - [x] Manager reviews recommendations
  - [x] Approve/reject
  - [x] If approved:
    - [x] Update worker tier
    - [x] Adjust rate card
    - [x] Notify worker
    - [x] Update project access

#### Automated Worker Removal from Projects

- [x] 🔵 **Define Performance Thresholds**
  - [x] Per project, set thresholds:
    - [x] Minimum accuracy (e.g., 90%)
    - [x] Maximum rejection rate (e.g., 5%)
    - [x] Minimum inter-annotator agreement (e.g., 80%)
  - [x] Grace periods: 7 days for new workers, 14 days for ramping

- [x] 🔵 **Build Performance Monitoring Service**
  - [x] Scheduled job (daily) to check all worker-project pairs
  - [x] Calculate rolling averages (7-day, 30-day)
  - [x] Compare against thresholds
  - [x] Classify into zones:
    - [x] Green: above threshold
    - [x] Yellow: near threshold (warning)
    - [x] Orange: below threshold <2 weeks
    - [x] Red: below threshold 2+ weeks

- [x] 🔵 **Implement Progressive Action Framework**
  - [x] **Green Zone**: No action
  - [x] **Yellow Zone**:
    - [x] Send warning notification to worker
    - [x] Recommend training resources
    - [x] Manager notified (FYI)
  - [x] **Orange Zone**:
    - [x] Escalated warning
    - [x] Trigger manager review
    - [x] Pause assignment of new tasks (existing tasks continue)
  - [x] **Red Zone**:
    - [x] Automatic removal from project
    - [x] Set removed_at, removed_by (system)
    - [x] Create record in auto_removals
    - [x] Notify worker with:
      - [x] Reason (specific metrics)
      - [x] Snapshot of performance
      - [x] Appeal process info
      - [x] Reassignment options (training, easier projects)
    - [x] Notify manager

- [x] 🔵 **Build Appeals Process**
  - [x] Worker can appeal removal
  - [x] Route: `/worker/appeals` (worker) and `/m/appeals` (manager review)
  - [x] Submit appeal with explanation
  - [x] Manager reviews:
    - [x] View metrics snapshot
    - [x] Worker's appeal
    - [x] Can reinstate or deny
  - [x] Log decision

- [x] 🔵 **Create Removal Audit Dashboard**
  - [x] Route: `/admin/auto-removals`
  - [x] List all automated removals
  - [x] Metrics: removal rate, appeal rate, reinstatement rate
  - [x] Identify trends (systemic issues vs. individual performance)

### Full Lifecycle Automation

#### Automated Onboarding

- [x] 🔵 **Build Onboarding Workflow Engine**
  - [x] Define onboarding steps:
    1. Welcome email
    2. Login credentials
    3. Complete profile
    4. Review platform guidelines
    5. Take orientation quiz
    6. Assigned initial training
    7. Complete beginner assessments
    8. Unlock first project
  - [x] Track completion of each step
  - [x] Automated triggers for next step

- [x] 🔵 **Create Onboarding Checklist (Worker View)**
  - [x] Route: `/worker/onboarding`
  - [x] Display checklist with progress
  - [x] Links to complete each step
  - [x] Celebration when complete

- [x] 🔵 **Implement Automated Training Assignment**
  - [x] Based on worker's domain selections, assign relevant training
  - [x] Send notifications
  - [x] Track completion

- [x] 🔵 **Define Offboarding Triggers**
  - [x] Voluntary termination (worker leaves)
  - [x] Involuntary termination (poor performance, policy violation)
  - [x] End of contract (fixed-term engagement)

- [x] 🔵 **Build Offboarding Workflow**
  - [x] Steps:
    1. Remove from all active projects
    2. Revoke platform access
    3. Generate final invoice
    4. Process final payment
    5. Collect feedback (exit survey)
    6. Archive worker data (compliance retention)
    7. Mark rehire eligibility status

- [x] 🔵 **Create Exit Survey**
  - [x] Questions:
    - [x] Reason for leaving
    - [x] Overall experience (1-5)
    - [x] What we could improve
    - [x] Would you recommend to others?
  - [x] Optional feedback

- [x] 🔵 **Implement Rehire Eligibility Tracking**
  - [x] Add `rehire_eligible` boolean to workers table
  - [x] Set based on termination reason:
    - [x] Voluntary: eligible
    - [x] Poor performance: not eligible for 6 months
    - [x] Policy violation: not eligible
  - [x] Future applications check eligibility

---

## Maestro Workbench Enhancements

### Quality Control Integration

- [x] 🟠 **Add gold_standard fields to questions table**
  - [x] `is_gold_standard` boolean
  - [x] `correct_answer` JSON (structure depends on modality)
  - [x] Migration

- [x] 🟠 **Implement gold standard checking in workbench**
  - [x] On answer submission, check if question is gold standard
  - [x] Compare worker answer to correct_answer
  - [x] Calculate accuracy
  - [x] Update worker quality metrics
  - [x] Do NOT reveal to worker that it was gold standard

- [x] 🟠 **Build Gold Standard Creator (Manager)**
  - [x] Route: `/m/projects/:id/gold-standards`
  - [x] Select existing questions to mark as gold standard
  - [x] Or create new gold standard questions
  - [x] Define correct answer
  - [x] Set distribution % (e.g., 10% of tasks are gold standards)

- [x] 🟠 **Implement Real-Time Quality Feedback**
  - [x] After task completion, show quality score (if available)
  - [x] Provide feedback on errors (if gold standard failed)
  - [x] Link to training resources

### Advanced Modality Support

- [x] 🟡 **Expand modality plugins**
  - [x] `text`: Rich text annotation, entity recognition, sentiment analysis
  - [x] `image`: Bounding boxes, polygons, keypoints, semantic segmentation
  - [x] `video`: Frame-by-frame annotation, object tracking, action recognition
  - [x] `multimodal`: Combined text + image, image + audio, etc.

- [x] 🟡 **Build Modality Template Library**
  - [x] Pre-configured templates for common tasks:
    - [x] Image classification
    - [x] Object detection
    - [x] Named entity recognition (NER)
    - [x] Machine translation evaluation
    - [x] Chatbot conversation rating
  - [x] One-click project setup

- [x] 🟡 **Implement Custom Modality Creator**
  - [x] Admin can define new modalities
  - [x] Configure input types, annotation tools, validation rules
  - [x] Save as reusable template

### Worker Analytics Enhancements

- [x] 🟡 **Build Advanced Worker Analytics**
  - [x] Route: `/w/analytics`
  - [x] Charts:
    - [x] Tasks completed over time
    - [x] Quality score trend
    - [x] Earnings over time
    - [x] Time per task (speed analysis)
  - [x] Benchmarking: Compare to peer average (anonymized)
  - [x] Insights: "Your quality is in top 10%", "You're 20% faster than average"

- [x] 🟡 **Implement Personal Goals**
  - [x] Worker sets goals:
    - [x] "Complete 100 tasks this week"
    - [x] "Achieve 95% accuracy"
    - [x] "Earn $500 this month"
  - [x] Track progress
  - [x] Celebrate when achieved

### Manager Analytics Dashboard

- [x] 🟡 **Build Comprehensive Manager Dashboard**
  - [x] Route: `/m/analytics`
  - [x] Summary cards:
    - [x] Active projects count
    - [x] Active workers count
    - [x] Tasks completed today/this week
    - [x] Average quality score
  - [x] Charts:
    - [x] Project progress (multiple projects comparison)
    - [x] Worker performance distribution
    - [x] Quality trends over time
    - [x] Task completion velocity
  - [x] Alerts:
    - [x] Projects behind schedule
    - [x] Workers with declining quality
    - [x] High rejection rates

- [x] 🟡 **Implement Custom Reports**
  - [x] Route: `/m/reports`
  - [x] Report builder:
    - [x] Select metrics (tasks, quality, earnings, etc.)
    - [x] Filter by date range, project, worker
    - [x] Group by: project, worker, day/week/month
    - [x] Visualize: table, chart
  - [x] Export: CSV, PDF
  - [x] Save report templates for reuse

---

## Feature Extraction: Messaging to PPH Connect

### Architecture Planning

- [x] 🟠 **Analyze Maestro messaging dependencies**
  - [x] Identify which code is messaging-specific
  - [x] Identify shared utilities (can be reused)
  - [x] Identify Maestro-specific code (needs adaptation)

- [x] 🟠 **Design PPH Connect messaging architecture**
  - [x] Decide: standalone service vs. integrated module
  - [x] Define API contracts between PPH Connect and messaging
  - [x] Plan data flow (messaging uses workers table)

### Code Migration

- [x] 🟠 **Create shared messaging library** (if applicable)
  - [x] Extract components to `/packages/messaging` (monorepo)
  - [x] Or: npm package `@pph/messaging`
  - [x] Both Maestro and PPH Connect consume the library

- [x] 🟠 **Migrate messaging components to PPH Connect**
  - [x] Copy component files
  - [x] Update import paths
  - [x] Replace `profiles` with `workers`
  - [x] Test components in PPH Connect

- [x] 🟠 **Sync future messaging updates**
  - [x] Document which codebase is source of truth
  - [x] Create process for syncing changes
  - [x] Consider CI/CD automation for syncing

### Testing

- [x] 🟠 **Test messaging in PPH Connect**
  - [x] All features tested (listed in Phase 2)
  - [x] Cross-user messaging (admin ↔ manager ↔ worker)
  - [x] Edge cases (offline, large attachments, etc.)

- [x] 🟠 **Test messaging in Maestro**
  - [x] Ensure no regression after extraction
  - [x] Verify backward compatibility

---

## Quality Assurance & Testing

### Unit Testing

- [x] 🟡 **Set up testing framework**
  - [x] Choose: Jest, Vitest
  - [x] Configure for TypeScript
  - [x] Set up test utilities (render, mock Supabase)

- [x] 🟡 **Write unit tests for utilities**
  - [x] Test BGC expiration logic
  - [x] Test date formatting
  - [x] Test CSV parsing/generation
  - [x] Test validation schemas (Zod)

- [x] 🟡 **Write unit tests for services**
  - [x] Test quality service calculations
  - [x] Test rate lookup logic
  - [x] Test balance aggregation
  - [x] Test access control algorithms

### Integration Testing

- [x] 🟡 **Set up integration test environment**
  - [x] Create test Supabase instance
  - [x] Seed with test data
  - [x] Configure env vars for test

- [x] 🟡 **Write integration tests for API**
  - [x] Test worker CRUD operations
  - [x] Test project CRUD
  - [x] Test assignment workflows
  - [x] Test messaging flows
  - [x] Test authentication flows

### End-to-End Testing

- [x] 🟡 **Set up E2E framework**
  - [x] Choose: Playwright, Cypress
  - [x] Configure base URL, viewports
- [x] Write test helpers (login, navigate)

- [x] 🟡 **Write E2E tests for critical flows**
  - [x] User login
  - [x] Add worker
  - [x] Bulk upload workers
  - [x] Assign worker to project
  - [x] Worker self-service (view assignments, earnings)
  - [x] Send message
  - [x] Create project listing
  - [x] Apply to project
  - [x] Approve application

- [x] 🟡 **Run E2E tests in CI/CD**
  - [x] GitHub Actions workflow
  - [x] Run on every PR
  - [x] Block merge if tests fail

### Manual QA

- [x] 🟡 **Create QA test plan**
  - [x] Document all user flows
  - [x] Define test cases with expected results
  - [x] Assign test cases to QA team

- [x] 🟡 **Perform exploratory testing**
  - [x] Test edge cases not covered by automated tests
  - [x] Test browser compatibility (Chrome, Firefox, Safari, Edge)
  - [x] Test mobile responsiveness
  - [x] Test accessibility (screen readers, keyboard navigation)

- [x] 🟡 **User Acceptance Testing (UAT)**
  - [x] Invite real users (admins, managers, workers)
  - [x] Provide UAT environment
  - [x] Collect feedback
  - [x] Prioritize bug fixes and improvements

### Performance Testing

- [x] 🟡 **Test with large datasets**
  - [x] Seed database with 1000 workers, 100 projects
  - [x] Measure page load times
  - [x] Measure query performance
  - [x] Identify bottlenecks

- [x] 🟡 **Optimize slow queries**
  - [x] Add indexes
  - [x] Refactor complex queries
  - [x] Implement caching

- [ ] 🟡 **Load testing (if applicable)** _(blocked — requires Supabase staging credentials for execution)_
  - [x] Simulate 100+ concurrent users _(k6 script prepared; waiting on staging access)_
  - [x] Use tools: k6, Apache JMeter _(k6 scenario committed; JMeter optional)_
  - [ ] Measure response times, error rates _(blocked until Supabase endpoint accessible)_

### Security Testing

- [x] 🟡 **Review RLS policies**
  - [x] Test that non-admin cannot write
  - [x] Test that unauthenticated cannot read
  - [x] Test role-based access (Phase 2)

- [x] 🟡 **Test for common vulnerabilities**
  - [x] SQL injection (Supabase protects, but verify)
  - [x] XSS (sanitize user inputs)
  - [x] CSRF (Supabase Auth handles)
  - [x] Insecure direct object references (verify RLS)

- [x] 🟡 **Audit authentication flows**
  - [x] Test password reset security
  - [x] Test session expiration
  - [x] Test logout

---

## DevOps & Infrastructure

### Environment Setup

- [ ] 🔴 **Create Supabase project (Production)**
  - [ ] Set up project
  - [ ] Configure environment variables
  - [ ] Apply database migrations
  - [ ] Set up RLS policies
  - [ ] Deploy Edge Functions

- [ ] 🔴 **Create Supabase project (Staging)**
  - [ ] Separate project for staging
  - [ ] Mirrors production setup
  - [ ] Used for QA before production deploy

- [ ] 🟡 **Create Supabase project (Development)**
  - [ ] Local Supabase instance (optional)
  - [ ] Or shared dev project
  - [ ] Used by developers during development

### Deployment

- [x] 🔴 **Set up AWS Amplify hosting**
  - [x] Connect GitHub repository to Amplify
  - [x] Configure build settings (amplify.yml or detect automatically)
  - [x] Set environment variables (Vite prefix: VITE_)
  - [x] Configure custom domain (optional)
  - [x] Enable HTTPS (automatic with Amplify)

- [x] 🔴 **Configure Amplify build settings**
  - [x] Build command: `npm run build`
  - [x] Output directory: `dist`
  - [x] Node version: Latest LTS
  - [x] Set Supabase environment variables

- [ ] 🔴 **Deploy frontend to Amplify**
  - [ ] Initial deployment (triggered automatically on setup)
  - [ ] Test production URL
  - [ ] Verify environment variables loaded correctly
  - [ ] Test routing (SPA fallback to index.html)

- [x] 🟡 **Set up CI/CD pipeline (built-in)**
  - [x] Configure branch deployments:
    - [x] main → production
    - [x] develop → staging (preview environment)
    - [x] feature/* → preview branches (optional)
  - [x] Enable automatic deployments on push
  - [x] Configure build notifications (email/Slack)
  - [x] Set up preview environments for PRs (optional)

### Monitoring & Logging

- [x] 🟡 **Set up error tracking**
  - [x] Integrate Sentry (or similar)
  - [x] Capture frontend errors
  - [x] Capture backend errors (Edge Functions)
  - [x] Set up alerts for critical errors

- [x] 🟡 **Set up analytics**
  - [x] Integrate Google Analytics or Plausible
  - [x] Track page views
  - [x] Track user events (button clicks, form submissions)
  - [x] Respect user privacy (GDPR compliance)

- [x] 🟡 **Set up application monitoring**
  - [x] Monitor Supabase usage (API calls, storage, etc.)
  - [x] Set up alerts for quota limits
  - [x] Monitor Amplify hosting metrics (build times, bandwidth, costs)

- [x] 🟡 **Set up database monitoring**
  - [x] Monitor query performance (Supabase dashboard)
  - [x] Set up alerts for slow queries
  - [x] Track database size growth

### Backup & Disaster Recovery

- [x] 🟡 **Configure automated backups**
  - [x] Supabase automatic backups (verify enabled/documented)
  - [x] Frequency: daily
  - [x] Retention: 30 days

- [ ] 🟡 **Test backup restoration** _(blocked — requires Supabase credentials)_
  - [ ] Download backup
  - [ ] Restore to test instance
  - [ ] Verify data integrity

- [x] 🟡 **Document disaster recovery plan**
  - [x] Steps to restore from backup
  - [x] Contact information for team
  - [x] Escalation procedures

---

## Summary & Next Steps

### Phase 1 Completion Criteria

- [x] All 7 core tables created and tested
- [x] Authentication working
- [x] Workers CRUD fully functional
- [x] Worker detail page with tabs complete
- [x] CSV bulk upload working
- [x] BGC warnings display correctly
- [x] Projects and Teams management functional
- [x] Enterprise filtering on Workers table
- [ ] Deployed to production and accessible

### Phase 2 Completion Criteria

- [x] Stats import and processing working
- [x] Messaging system extracted and integrated
- [x] Training materials and gates functional
- [x] Quality metrics displayed in dashboards
- [x] Performance-based access implemented
- [x] Qualification system working
- [x] RBAC implemented
- [x] Worker self-service portal functional
- [x] Invoice generation working

### Phase 3 Completion Criteria

- [ ] Project marketplace live
- [ ] Worker applications working
- [ ] AI interview system functional
- [ ] Progressive task unlocking implemented
- [ ] Community forum active
- [ ] Support system with multiple channels
- [ ] Gamification features live

### Phase 4 Completion Criteria

- [ ] External application portal live
- [ ] ML quality control models deployed
- [ ] Predictive analytics functional
- [ ] Automated tier advancement working
- [ ] Automated worker removal system live
- [ ] Full lifecycle automation (onboarding → offboarding)

---

## Ongoing Maintenance

- [ ] 🟢 **Monthly dependency updates**
- [ ] 🟢 **Security patches (as needed)**
- [ ] 🟢 **Performance optimization based on metrics**
- [ ] 🟢 **User feedback review and prioritization**
- [ ] 🟢 **Documentation updates**
- [ ] 🟢 **Database optimization (indexes, queries)**

---

**Total Estimated Tasks: 500+**
**Estimated Timeline:**
- Phase 1: 8-12 weeks
- Phase 2: 12-16 weeks
- Phase 3: 16-20 weeks
- Phase 4: 20-24 weeks

**Note:** This is a living document. Tasks will be refined, reprioritized, and updated as development progresses and requirements evolve.
