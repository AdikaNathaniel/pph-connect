# PPH Connect: 3-Week Sprint Plan
## Aggressive Development Timeline (15 Days / 120 Hours)

**Sprint Goal:** Launch functional PPH Connect workforce management platform with core Phase 1 features

**Team Size:** 1 full-time developer (or 2 developers splitting work)
**Daily Target:** 8 billable hours
**Total Effort:** 120 hours over 15 working days

---

## Week 1: Foundation & Core Worker Management
**Goal:** Runnable application with worker CRUD functionality

---

### **DAY 1 - Monday: Database Schema & Application Bootstrap**
**Billable Hours:** 8 hours
**Focus:** Resolve database conflicts and create application foundation

#### Morning (4 hours)
**Task 1.1: Resolve Projects Table Name Collision** (2 hours)
- **Description:** The current schema has a conflict - both Maestro and PPH Connect use a `projects` table with incompatible schemas. Maestro's `projects` table is for annotation tasks (has fields like `google_sheet_url`, `template_id`), while PPH Connect needs a workforce-focused projects table (with `project_code`, `expert_tier`, `department_id`).
- **Action Items:**
  - Create new migration file: `20251201000000_rename_pph_projects.sql`
  - Rename existing PPH `projects` table → `workforce_projects`
  - Update all foreign key references in `project_teams` and `worker_assignments` tables
  - Update RLS policies to reference `workforce_projects`
  - Test migration runs without errors on local Supabase
- **Deliverable:** Migration file that cleanly separates Maestro and PPH Connect project tables
- **Success Criteria:** Migration runs cleanly, both table schemas coexist without conflicts

**Task 1.2: Verify Complete Database Schema** (2 hours)
- **Description:** Audit all Phase 1 tables exist in the Supabase database and have correct structure, indexes, and security policies.
- **Action Items:**
  - Open Supabase dashboard → Table Editor
  - Verify existence of: `workers`, `worker_accounts`, `teams`, `workforce_projects`, `project_teams`, `worker_assignments`, `departments`
  - Check each table has proper indexes (email, status, foreign keys)
  - Verify RLS policies exist and match security requirements (admin-only access for Phase 1)
  - Run `supabase gen types typescript` to generate TypeScript types
  - Review generated types file for correctness
- **Deliverable:** `src/types/supabase.ts` with complete database types
- **Success Criteria:** All 7 core tables exist, indexed, secured, and typed

#### Afternoon (4 hours)
**Task 1.3: Bootstrap PPH Connect Application** (4 hours)
- **Description:** Create a new standalone Vite + React + TypeScript application separate from Maestro, but configured to connect to the same Supabase database.
- **Action Items:**
  - Create `/pph-connect` directory at root level (sibling to maestro-workbench)
  - Initialize with `npm create vite@latest pph-connect -- --template react-ts`
  - Copy `package.json` dependencies from Maestro (React 18.3.1, TypeScript 5.8.3, Supabase 2.58.0, TanStack Table, React Hook Form, Zod, date-fns, etc.)
  - Run `npm install` to install all dependencies
  - Create `vite.config.ts` with path alias (`@/` → `./src/`)
  - Create `tsconfig.json` with strict mode enabled
  - Initialize Tailwind CSS: `npx tailwindcss init -p`
  - Configure `tailwind.config.js` (same as Maestro for consistency)
  - Create `index.html` entry point with "PPH Connect" title
  - Create `src/main.tsx` (React mount point)
  - Create `src/App.tsx` (root component with basic "PPH Connect" heading)
  - Create `src/index.css` with Tailwind directives
  - Create `.env.example` and `.env` with Supabase credentials (same as Maestro)
  - Run `npm run dev` and verify app loads on http://localhost:5173
- **Deliverable:** Runnable blank application that displays "PPH Connect" heading
- **Success Criteria:** `npm run dev` works, page loads without errors, hot reload works

**End of Day 1 Checkpoint:**
- ✅ Database schema conflicts resolved
- ✅ All Phase 1 tables verified and typed
- ✅ Standalone PPH Connect app runs successfully
- ✅ Ready for feature development

---

### **DAY 2 - Tuesday: Supabase Integration & Authentication**
**Billable Hours:** 8 hours
**Focus:** Secure authentication and reusable UI components

#### Morning (4 hours)
**Task 2.1: Copy Shadcn UI Components from Maestro** (2 hours)
- **Description:** Maestro already has a complete set of Shadcn UI components built on Radix UI primitives. Copy these components to PPH Connect for consistency and speed, rather than rebuilding from scratch.
- **Action Items:**
  - Navigate to `/maestro-workbench/maestro-workbench-master/src/components/ui/`
  - Copy entire `ui/` folder → `/pph-connect/src/components/ui/`
  - Components to include: Button, Card, Input, Label, Table, Dialog, Select, Badge, Tabs, Form, Alert, Checkbox, RadioGroup, Textarea, Separator, Dropdown, Command, Popover, Calendar, Tooltip
  - Check `package.json` for Radix UI dependencies (e.g., `@radix-ui/react-dialog`, `@radix-ui/react-select`)
  - Install any missing Radix UI packages: `npm install @radix-ui/react-*`
  - Install utility dependencies: `npm install class-variance-authority clsx tailwind-merge`
  - Create `src/lib/utils.ts` with `cn()` helper function (for merging Tailwind classes)
  - Test a few components render correctly (Button, Card) in `App.tsx`
- **Deliverable:** Complete Shadcn UI component library available in PPH Connect
- **Success Criteria:** All components imported without errors, Button renders with proper styling

**Task 2.2: Set Up Supabase Client Connection** (2 hours)
- **Description:** Configure typed Supabase client to connect to the shared database (same instance as Maestro uses).
- **Action Items:**
  - Create `src/lib/supabase/client.ts`
  - Import `createClient` from `@supabase/supabase-js`
  - Import generated database types: `import type { Database } from '@/types/supabase'`
  - Create typed client: `createClient<Database>(supabaseUrl, supabaseAnonKey)`
  - Add environment variable validation (throw error if missing)
  - Test connection by fetching departments: `await supabase.from('departments').select('*')`
  - Log results to console to verify connection works
  - Handle errors gracefully (connection timeout, invalid credentials)
- **Deliverable:** Working Supabase client with TypeScript types
- **Success Criteria:** Can fetch data from database, types are auto-completed in IDE

#### Afternoon (4 hours)
**Task 2.3: Implement Authentication Flow** (4 hours)
- **Description:** Build complete authentication system using Supabase Auth, including login page, auth context for global state, and protected routes to secure admin pages.
- **Action Items:**
  - **AuthContext (1.5 hours):**
    - Create `src/contexts/AuthContext.tsx`
    - Implement React context for auth state (user, session, loading)
    - Use `supabase.auth.getSession()` to get initial session
    - Use `supabase.auth.onAuthStateChange()` to listen for auth changes
    - Provide `signIn(email, password)` and `signOut()` functions
    - Create `useAuth()` hook for consuming context
  - **Login Page (1.5 hours):**
    - Create `src/pages/Login.tsx`
    - Build form with email and password inputs
    - Style with Shadcn Button, Input, Card components
    - Handle form submission with error display
    - Show loading state during sign-in
    - Redirect to dashboard on success
  - **Protected Routes (1 hour):**
    - Install React Router: `npm install react-router-dom`
    - Create `src/components/ProtectedRoute.tsx`
    - Check `useAuth()` - if no user, redirect to `/login`
    - Show loading spinner while checking auth state
    - Update `App.tsx` to use `BrowserRouter` with routes: `/login`, `/dashboard` (protected)
    - Create placeholder `src/pages/Dashboard.tsx` (displays "Welcome, [email]")
  - **Test auth flow:**
    - Visit http://localhost:5173/ → should redirect to /login
    - Log in with admin credentials (create test user in Supabase dashboard if needed)
    - Should redirect to /dashboard and display email
    - Refresh page → should stay logged in (session persistence)
    - Sign out → should redirect to /login
- **Deliverable:** Complete authentication system with login page and protected routes
- **Success Criteria:** Can log in, stay logged in after refresh, access protected pages, log out successfully

**End of Day 2 Checkpoint:**
- ✅ Shadcn UI components available
- ✅ Supabase connection working
- ✅ Authentication fully functional
- ✅ Protected routes enforced
- ✅ Can log in as admin and access dashboard

---

### **DAY 3 - Wednesday: Worker List Page**
**Billable Hours:** 8 hours
**Focus:** Build main worker list with table, search, and basic filters

#### Morning (4 hours)
**Task 3.1: Set Up TanStack Table with Worker Data** (4 hours)
- **Description:** Build the primary worker list page using TanStack Table (React Table v8), which provides powerful table features like sorting, filtering, and pagination. This is the most-used page in the application.
- **Action Items:**
  - Install TanStack Table: `npm install @tanstack/react-table`
  - Create `src/pages/workers/WorkerList.tsx`
  - **Data Fetching (1 hour):**
    - Use `useQuery` from TanStack Query to fetch workers
    - Query: `supabase.from('workers').select('*, departments(name), profiles!supervisor_id(full_name)').eq('is_deleted', false)`
    - Handle loading state (skeleton rows)
    - Handle error state (error message with retry button)
  - **Table Setup (2 hours):**
    - Define column configuration with `columnHelper`:
      - Full Name (first_name + last_name concatenated)
      - Email (email_personal)
      - Status (badge with color: active=green, pending=yellow, terminated=red)
      - Department (departments.name via join)
      - Supervisor (profiles.full_name via join)
      - BGC Expiration (formatted date with warning icon if <30 days)
      - Hire Date (formatted date)
      - Actions (view button)
    - Set up `useReactTable()` hook with data and columns
    - Enable sorting on all columns (click header to sort)
    - Enable pagination (50 rows per page)
  - **Render Table (1 hour):**
    - Use Shadcn Table components for styling
    - Map over `table.getRowModel().rows` to render rows
    - Add pagination controls at bottom (Previous/Next buttons, page numbers)
    - Add row click handler to navigate to worker detail page
    - Style with hover effect on rows
- **Deliverable:** Functional worker list page with sorting and pagination
- **Success Criteria:** Table displays all workers, can sort by any column, pagination works, clicking row navigates to detail page (placeholder for now)

#### Afternoon (4 hours)
**Task 3.2: Add Search and Basic Filters** (4 hours)
- **Description:** Add search bar and status filter to help admins quickly find workers. For Phase 1, implement client-side filtering (works for up to 500 workers).
- **Action Items:**
  - **Search Bar (2 hours):**
    - Add Shadcn Input component above table
    - Debounce search input (300ms delay) to avoid filtering on every keystroke
    - Filter workers by: full name (case-insensitive), email (case-insensitive)
    - Use TanStack Table's `setGlobalFilter()` or custom filter function
    - Show "X results" count below search bar
    - Add clear button (X icon) to reset search
  - **Status Filter (1 hour):**
    - Add Shadcn Select component next to search bar
    - Options: All, Active, Pending, Terminated, Inactive
    - Filter table rows based on selected status
    - Use TanStack Table's column filters
    - Default to "Active" (most common use case)
  - **Department Filter (1 hour):**
    - Fetch departments: `supabase.from('departments').select('*')`
    - Add Shadcn Select dropdown for departments
    - Options: All Departments, [list of departments]
    - Filter table rows by selected department
    - Combine with status filter (AND logic)
  - **Filter State Management:**
    - Use URL query params to persist filters (e.g., `?status=active&search=john`)
    - When user refreshes page, filters remain applied
- **Deliverable:** Worker list with search and filters
- **Success Criteria:** Can search by name/email, filter by status and department, filters persist on page refresh, filtering is fast (<300ms)

**End of Day 3 Checkpoint:**
- ✅ Worker list page displays all workers in table
- ✅ Table has sorting and pagination
- ✅ Search by name/email works
- ✅ Filter by status and department works
- ✅ Filters combine correctly (AND logic)

---

### **DAY 4 - Thursday: Worker Create & Edit Forms**
**Billable Hours:** 8 hours
**Focus:** CRUD operations for workers

#### Morning (4 hours)
**Task 4.1: Build Worker Create Form** (4 hours)
- **Description:** Create comprehensive form to add new workers to the system, with validation and error handling.
- **Action Items:**
  - Install form libraries: `npm install react-hook-form zod @hookform/resolvers`
  - Create `src/pages/workers/WorkerCreate.tsx`
  - **Form Schema (1 hour):**
    - Create Zod schema with validation rules:
      - first_name: required, min 2 chars
      - last_name: required, min 2 chars
      - email_personal: required, valid email format
      - email_pph: optional, valid email format if provided
      - phone: optional
      - country_residence: required, dropdown with countries
      - locale_primary: required, dropdown (en-US, es-ES, etc.)
      - hire_date: required, date picker
      - department_id: required, dropdown from departments table
      - supervisor_id: optional, dropdown from workers table (hierarchical)
      - bgc_expiration_date: optional, date picker
      - status: default to 'pending'
  - **Form UI (2 hours):**
    - Use React Hook Form with Zod resolver
    - Use Shadcn Form components (FormField, FormLabel, FormControl, FormMessage)
    - Layout: Two-column grid for better space usage
    - Fetch departments and supervisors for dropdowns
    - Date pickers for hire_date and bgc_expiration_date
    - Submit button at bottom
  - **Submission Handler (1 hour):**
    - On submit, insert into `workers` table via Supabase
    - Show loading state on submit button ("Creating...")
    - On success: Show success toast, navigate to worker detail page
    - On error: Display error message (e.g., duplicate email)
    - Include `created_by` field (current admin's profile ID)
- **Deliverable:** Working create worker form with validation
- **Success Criteria:** Can create new worker, validation catches errors, success redirects to worker detail, data persists in database

#### Afternoon (4 hours)
**Task 4.2: Build Worker Edit Form** (2 hours)
- **Description:** Allow editing existing worker information, preserving audit trail.
- **Action Items:**
  - Create `src/pages/workers/WorkerEdit.tsx`
  - Fetch existing worker data by ID from URL param
  - Pre-populate form fields with existing data
  - Reuse same form schema and UI as create form (DRY principle)
  - On submit, use `supabase.from('workers').update()` instead of insert
  - Update `updated_by` and `updated_at` fields
  - Cannot edit: `id`, `created_at`, `created_by` (audit trail)
  - Show "Last updated by [name] on [date]" at top of form
- **Deliverable:** Edit form that updates worker data
- **Success Criteria:** Can edit worker fields, changes persist, audit fields preserved

**Task 4.3: Add Navigation to Create/Edit Forms** (2 hours)
- **Description:** Connect the worker list to create/edit forms with proper routing and navigation.
- **Action Items:**
  - Add "Create Worker" button in top-right of WorkerList page
  - Button navigates to `/workers/create`
  - Add edit icon button in each table row Actions column
  - Edit button navigates to `/workers/:id/edit`
  - Add routes in App.tsx: `/workers`, `/workers/create`, `/workers/:id/edit`
  - Add breadcrumbs: "Workers" > "Create Worker" or "Workers" > "[Worker Name]" > "Edit"
  - Add cancel button on forms that navigates back to list
- **Deliverable:** Complete navigation flow for worker CRUD
- **Success Criteria:** Can navigate from list → create/edit → back to list, breadcrumbs show correct path

**End of Day 4 Checkpoint:**
- ✅ Can create new workers via form
- ✅ Can edit existing workers
- ✅ Validation works on all fields
- ✅ Navigation between list/create/edit seamless
- ✅ Data persists correctly in database

---

### **DAY 5 - Friday: Worker Detail Page with Tabs**
**Billable Hours:** 8 hours
**Focus:** CRM-style detail page for comprehensive worker view

#### Morning (4 hours)
**Task 5.1: Build Worker Detail Page Layout** (4 hours)
- **Description:** Create a comprehensive worker detail page with tabs for different aspects of worker data (Profile, Accounts, Projects, Activity). This is the "single pane of glass" for all worker information.
- **Action Items:**
  - Create `src/pages/workers/WorkerDetail.tsx`
  - **Header Section (1 hour):**
    - Fetch worker by ID: `supabase.from('workers').select('*, departments(name), profiles!supervisor_id(full_name)').eq('id', workerId).single()`
    - Display large heading with worker name
    - Status badge (color-coded)
    - Action buttons: "Edit Worker", "Replace Account", "Assign to Project"
    - Back button to worker list
  - **Tabs Setup (1 hour):**
    - Use Shadcn Tabs component
    - Four tabs: Profile, Accounts, Projects, Activity
    - Use URL hash to persist active tab (e.g., `/workers/123#accounts`)
    - Default to Profile tab
  - **Profile Tab (2 hours):**
    - Display all worker information in a card layout
    - Sections:
      - **Personal Info:** Full name, email (personal & PPH), phone, country
      - **Employment Info:** Status, hire date, termination date (if terminated), locale
      - **Organizational:** Department, supervisor, teams (if any)
      - **Background Check:** BGC expiration date with visual alert if expired/expiring
      - **Audit Trail:** Created by, created at, updated by, updated at
    - Use Shadcn Card and Badge components for styling
    - Each field labeled clearly
    - Edit button at top-right of Profile tab (navigates to edit page)
- **Deliverable:** Worker detail page with header and Profile tab
- **Success Criteria:** Can view complete worker information, tabs navigation works, edit button functions

#### Afternoon (4 hours)
**Task 5.2: Accounts Tab - Platform Account Chain of Custody** (2 hours)
- **Description:** Display all platform accounts associated with the worker (DataCompute, Maestro, etc.) with full history including replaced accounts.
- **Action Items:**
  - Create `src/pages/workers/tabs/AccountsTab.tsx`
  - Fetch worker accounts: `supabase.from('worker_accounts').select('*').eq('worker_id', workerId).order('created_at', { ascending: false })`
  - Display accounts in a timeline/list format:
    - Platform name (badge)
    - Account username/email
    - Status badge (active=green, replaced=orange, terminated=red)
    - Date range: Activated → Deactivated (or "Present" if active)
    - Reason for deactivation (if applicable)
    - Notes (if any)
  - Visual indicator for "current" account (bold, different background color)
  - Show full chain of custody: all historical accounts visible
  - "Replace Account" button at top (opens modal - implement in Week 2)
  - Empty state: "No accounts yet. Click 'Add Account' to get started."
- **Deliverable:** Accounts tab showing full account history
- **Success Criteria:** Can view all accounts (current and historical), chain of custody clear, status colors correct

**Task 5.3: Projects Tab - Assignment History** (2 hours)
- **Description:** Display all projects the worker is or was assigned to, with assignment dates and status.
- **Action Items:**
  - Create `src/pages/workers/tabs/ProjectsTab.tsx`
  - Fetch worker assignments: `supabase.from('worker_assignments').select('*, workforce_projects(project_code, project_name, status)').eq('worker_id', workerId).order('assigned_at', { ascending: false })`
  - Display in table format:
    - Project Code
    - Project Name
    - Status (badge: active=green, removed=gray)
    - Assigned Date
    - Removed Date (if applicable)
    - Notes (if any)
  - Separate "Current Assignments" from "Past Assignments"
  - "Assign to Project" button at top (implement assignment flow in Week 2)
  - Empty state: "Not assigned to any projects yet."
- **Deliverable:** Projects tab showing assignment history
- **Success Criteria:** Can view current and past project assignments, dates and statuses clear

**End of Day 5 Checkpoint:**
- ✅ Worker detail page fully functional
- ✅ Profile tab shows complete worker info
- ✅ Accounts tab shows chain of custody
- ✅ Projects tab shows assignment history
- ✅ Navigation between tabs works
- ✅ **Week 1 Complete: Core worker management operational**

---

## Week 2: Projects, Assignments & Advanced Features
**Goal:** Full workforce orchestration with projects, teams, and advanced filtering

---

### **DAY 6 - Monday: Workforce Projects Management**
**Billable Hours:** 8 hours
**Focus:** CRUD operations for workforce projects

#### Morning (4 hours)
**Task 6.1: Projects List Page** (4 hours)
- **Description:** Build the main projects list page where admins can view all workforce projects (not annotation projects - those are in Maestro).
- **Action Items:**
  - Create `src/pages/projects/ProjectList.tsx`
  - **Data Fetching (1 hour):**
    - Query: `supabase.from('workforce_projects').select('*, departments(name)')`
    - Join with departments to show department name
    - Include count of assigned teams and workers (via joins or RPC)
  - **Table Setup (2 hours):**
    - Use TanStack Table (same setup as WorkerList)
    - Columns:
      - Project Code (unique identifier, sortable)
      - Project Name (sortable)
      - Department (sortable)
      - Expert Tier (badge: tier0/tier1/tier2)
      - Status (badge: active=green, paused=yellow, completed=gray, cancelled=red)
      - Teams Assigned (count)
      - Workers Assigned (count)
      - Actions (view, edit buttons)
    - Enable sorting on all columns
    - Pagination (25 per page)
  - **Filters (1 hour):**
    - Status filter dropdown (All, Active, Paused, Completed, Cancelled)
    - Department filter dropdown
    - Search by project code or name
  - **Navigation:**
    - "Create Project" button in top-right
    - Row click navigates to project detail page
- **Deliverable:** Projects list page with table and filters
- **Success Criteria:** Can view all projects, filter by status/department, search works, pagination works

#### Afternoon (4 hours)
**Task 6.2: Project Create & Edit Forms** (4 hours)
- **Description:** Forms to create new workforce projects and edit existing ones.
- **Action Items:**
  - Create `src/pages/projects/ProjectCreate.tsx` and `ProjectEdit.tsx`
  - **Form Schema (1 hour):**
    - Zod validation:
      - project_code: required, unique, alphanumeric, 3-20 chars
      - project_name: required, min 5 chars
      - department_id: required, dropdown from departments
      - expert_tier: required, radio buttons (tier0/tier1/tier2)
      - status: required, dropdown (active/paused/completed/cancelled)
      - start_date: optional, date picker
      - end_date: optional, date picker, must be after start_date
      - description: optional, textarea
  - **Form UI (2 hours):**
    - Use React Hook Form + Shadcn components
    - Two-column layout
    - Expert tier explanation tooltips (what each tier means)
    - Status cannot be set to "completed" if end_date is in future (validation rule)
  - **Submission (1 hour):**
    - Insert/update `workforce_projects` table
    - Include `created_by`/`updated_by` audit fields
    - On success: Navigate to project detail page
    - On error: Display validation errors
- **Deliverable:** Create and edit forms for projects
- **Success Criteria:** Can create projects, edit projects, validation works, data persists

**End of Day 6 Checkpoint:**
- ✅ Projects list page operational
- ✅ Can create new projects
- ✅ Can edit existing projects
- ✅ Filters and search work

---

### **DAY 7 - Tuesday: Teams & Departments Management**
**Billable Hours:** 8 hours
**Focus:** Organizational structure (teams and departments)

#### Morning (4 hours)
**Task 7.1: Teams Management CRUD** (4 hours)
- **Description:** Build complete teams management - language-based teams within departments.
- **Action Items:**
  - Create `src/pages/teams/TeamList.tsx`
  - **Teams List (2 hours):**
    - TanStack Table with columns:
      - Team Name
      - Department
      - Primary Locale (badge)
      - Secondary Locale (badge, if set)
      - Team Leader (link to worker detail)
      - Workers Count
      - Is Active (badge)
      - Actions (edit, deactivate)
    - Filter by department and is_active
    - Search by team name
    - "Create Team" button
  - **Create/Edit Forms (2 hours):**
    - Create `src/pages/teams/TeamCreate.tsx` and `TeamEdit.tsx`
    - Fields:
      - team_name: required
      - department_id: required, dropdown
      - locale_primary: required, dropdown (en-US, es-ES, ja-JP, etc.)
      - locale_secondary: optional, dropdown
      - locale_region: optional, text input
      - leader_id: optional, dropdown from workers in same department
      - is_active: checkbox, default true
    - Submit to `teams` table
- **Deliverable:** Complete teams management
- **Success Criteria:** Can list, create, edit teams, can assign team leader

#### Afternoon (4 hours)
**Task 7.2: Departments Management CRUD** (4 hours)
- **Description:** Simple departments management (fewer features than teams, since departments are top-level org units).
- **Action Items:**
  - Create `src/pages/departments/DepartmentList.tsx`
  - **Departments List (2 hours):**
    - Simple table with columns:
      - Name
      - Description
      - Teams Count
      - Workers Count
      - Created At
      - Actions (edit)
    - "Create Department" button
    - No complex filters needed (usually <20 departments)
  - **Create/Edit Forms (2 hours):**
    - Simple form with:
      - name: required, unique
      - description: optional, textarea
    - Submit to `departments` table
    - Warning if trying to delete department with teams/workers (don't allow deletion, only deactivation)
- **Deliverable:** Complete departments management
- **Success Criteria:** Can list, create, edit departments

**End of Day 7 Checkpoint:**
- ✅ Teams fully manageable
- ✅ Departments fully manageable
- ✅ Can assign team leaders
- ✅ Organizational structure complete

---

### **DAY 8 - Wednesday: Project-Team-Worker Assignments**
**Billable Hours:** 8 hours
**Focus:** Connecting projects, teams, and workers

#### Morning (4 hours)
**Task 8.1: Project Detail Page with Team Assignments** (4 hours)
- **Description:** Build project detail page with tabs, focusing on team assignment functionality.
- **Action Items:**
  - Create `src/pages/projects/ProjectDetail.tsx`
  - **Header Section (1 hour):**
    - Fetch project: `supabase.from('workforce_projects').select('*, departments(name)').eq('id', projectId).single()`
    - Display project code, name, status badge
    - Action buttons: "Edit Project", "Assign Teams", "Assign Workers"
  - **Tabs (Overview, Teams, Workers) (1 hour):**
    - Use Shadcn Tabs
    - Overview tab: Display all project info (code, name, department, tier, status, dates, description)
  - **Teams Tab (2 hours):**
    - Create `src/pages/projects/tabs/TeamsTab.tsx`
    - Fetch assigned teams: `supabase.from('project_teams').select('*, teams(team_name, locale_primary)').eq('project_id', projectId)`
    - Display assigned teams in cards:
      - Team name, locale, assigned date
      - "Remove" button (soft delete: removes from project_teams)
    - "Assign Teams" button opens modal:
      - Multi-select from available teams (not yet assigned to this project)
      - Filter by department (only show teams in project's department)
      - On submit: Insert into `project_teams` table
      - Success toast: "3 teams assigned to project"
- **Deliverable:** Project detail page with team assignment
- **Success Criteria:** Can view project details, assign multiple teams to project, remove teams from project

#### Afternoon (4 hours)
**Task 8.2: Worker Assignment to Projects** (4 hours)
- **Description:** Assign individual workers to projects, creating `worker_assignments` records.
- **Action Items:**
  - **Workers Tab in Project Detail (2 hours):**
    - Create `src/pages/projects/tabs/WorkersTab.tsx`
    - Fetch assigned workers: `supabase.from('worker_assignments').select('*, workers(full_name, email_personal, status)').eq('project_id', projectId).is('removed_at', null)`
    - Display in table:
      - Worker name (link to worker detail)
      - Email
      - Status
      - Assigned Date
      - Assigned By (admin name)
      - Actions: "Remove from Project"
    - Remove action: Sets `removed_at` and `removed_by` (soft delete, preserves history)
  - **Assign Workers Modal (2 hours):**
    - "Assign Workers" button opens modal
    - **Worker Selection:**
      - Search/filter workers by name, team, department
      - Multi-select checkbox list
      - Show only active workers not already assigned to this project
      - Batch selection: "Select all from [team name]"
    - On submit:
      - Insert multiple records into `worker_assignments`
      - Fields: worker_id, project_id, assigned_at, assigned_by, status='active'
      - Success toast: "12 workers assigned to project"
  - **Bulk Assignment from Worker Detail:**
    - Go back to Worker Detail page > Projects tab
    - Update "Assign to Project" button to open similar modal
    - Allows assigning one worker to multiple projects
- **Deliverable:** Complete worker-project assignment system
- **Success Criteria:** Can assign workers to projects (both from project page and worker page), can remove workers from projects, assignment history preserved

**End of Day 8 Checkpoint:**
- ✅ Projects have teams assigned
- ✅ Projects have workers assigned
- ✅ Can assign from both directions (project → workers, worker → projects)
- ✅ Assignment history fully tracked

---

### **DAY 9 - Thursday: Advanced Filtering System**
**Billable Hours:** 8 hours
**Focus:** Google Sheets-style multi-field filtering

#### Full Day (8 hours)
**Task 9.1: Build Advanced Filter System** (8 hours)
- **Description:** Implement a powerful filtering system inspired by Google Sheets, allowing admins to build complex multi-field filter queries with AND/OR logic. This is a high-value feature for managing 100+ workers.
- **Action Items:**
  - **Filter Builder Component (3 hours):**
    - Create `src/components/filters/FilterBuilder.tsx`
    - UI Structure:
      - "+ Add Filter" button
      - Each filter row has: [Field Dropdown] [Operator Dropdown] [Value Input] [Remove X]
      - Fields: Name, Email, Status, Department, Team, Project, BGC Expiration, Hire Date, Supervisor
      - Operators vary by field type:
        - Text fields: Contains, Equals, Starts with, Ends with
        - Status/Enum: Is, Is not, Is one of
        - Date: Before, After, Between, Within next [N] days
        - Number: Equals, Greater than, Less than
      - Value input adapts based on field (text input, dropdown, date picker, multi-select)
    - Logic operator toggle: "AND" / "OR" (all filters must match vs. any filter matches)
    - "Clear All Filters" button
  - **Filter State Management (2 hours):**
    - Store filter state in React state (array of filter objects)
    - Each filter: `{ field, operator, value }`
    - Apply filters to worker list in real-time
    - Client-side filtering for <500 workers (acceptable performance)
    - Debounce filter application (300ms delay after typing)
  - **Filter Application Logic (2 hours):**
    - Create filter functions for each field type
    - Text filters: case-insensitive substring matching
    - Date filters: Parse dates, compare timestamps
    - Multi-value filters: Check if value in array
    - Combine all filters with AND/OR logic
    - Display result count: "Showing 23 of 150 workers"
  - **Save Filter Presets (1 hour):**
    - "Save Filter" button → modal asking for preset name
    - Store preset in localStorage: `{ name, filters[] }`
    - "Load Filter" dropdown shows saved presets
    - Common presets to pre-populate:
      - "BGC Expiring Soon" (bgc_expiration_date within next 30 days)
      - "Active Workers" (status = active)
      - "Recently Hired" (hire_date within last 90 days)
      - "No Department" (department_id is null)
  - **Export Filtered Results:**
    - "Export to CSV" button (only exports visible filtered rows)
    - Use papaparse to convert to CSV
    - Trigger download with filename: `workers_filtered_[date].csv`
- **Deliverable:** Advanced filtering system with presets and export
- **Success Criteria:** Can build complex filters (e.g., "Status = Active AND Department = Annotation AND BGC expiring <30 days"), filters apply in <500ms, can save/load presets, can export filtered results

**End of Day 9 Checkpoint:**
- ✅ Advanced filtering operational
- ✅ Can combine multiple filters
- ✅ AND/OR logic works correctly
- ✅ Filter presets saveable and loadable
- ✅ CSV export works for filtered data

---

### **DAY 10 - Friday: Account Replacement & BGC Monitoring**
**Billable Hours:** 8 hours
**Focus:** Critical workforce operations features

#### Morning (4 hours)
**Task 10.1: Account Replacement Workflow** (4 hours)
- **Description:** Implement the critical account replacement workflow that maintains chain of custody when workers need new platform accounts (e.g., DataCompute account gets banned, need to create new one).
- **Action Items:**
  - Create `src/components/workers/ReplaceAccountModal.tsx`
  - **Modal UI (2 hours):**
    - Triggered from Worker Detail > Accounts tab > "Replace Account" button
    - Pass current active account as prop
    - Form fields:
      - Platform (display old platform, same for new)
      - Old Account (display only, grayed out): username, email
      - New Account Username (required)
      - New Account Email (required)
      - New Account Password (optional, encrypted field, never displayed after save)
      - Reason for Replacement (required, dropdown: Account Banned, Performance Issues, Security Concern, Worker Request, Other)
      - Notes (optional, textarea for additional context)
    - "Replace Account" button (red, emphasizes importance)
    - Warning message: "This will deactivate the old account and cannot be undone."
  - **Replacement Logic (2 hours):**
    - **Transaction (all-or-nothing):**
      1. Update old account: `status='replaced'`, `deactivated_at=NOW()`, `deactivation_reason=[reason]`, `is_current=false`
      2. Insert new account: All new values, `status='active'`, `activated_at=NOW()`, `is_current=true`
      3. Update worker's `updated_at` and `updated_by`
    - Use Supabase transaction or RPC function to ensure atomicity
    - On success: Close modal, refresh Accounts tab to show new account
    - On error: Rollback, show error message
  - **Chain of Custody Display:**
    - Accounts tab now shows full history: Old account (replaced) → New account (active)
    - Timeline view with dates and reasons
- **Deliverable:** Working account replacement workflow
- **Success Criteria:** Can replace account, old account marked replaced, new account marked active, chain of custody visible, no data loss

#### Afternoon (4 hours)
**Task 10.2: BGC Expiration Monitoring** (4 hours)
- **Description:** Build visual alerts and notifications for background check expirations, a critical compliance feature.
- **Action Items:**
  - **BGC Alert Widget (2 hours):**
    - Create `src/components/dashboard/BGCExpirationAlerts.tsx`
    - Query workers with expiring BGC:
      - Expired: `bgc_expiration_date < TODAY`
      - Expiring soon: `bgc_expiration_date BETWEEN TODAY AND TODAY+30`
    - Display in card on dashboard:
      - "⚠️ BGC Alerts" heading
      - Two sections: "Expired (3)" in red, "Expiring Soon (7)" in yellow
      - Each worker: Name, expiration date, days until expiration
      - Click worker name → navigate to worker detail
    - Sort by expiration date (soonest first)
  - **Visual Indicators in Worker List (1 hour):**
    - Add BGC status column/icon in worker list table
    - Red warning icon if expired
    - Yellow warning icon if expiring <30 days
    - Green checkmark if valid (>30 days)
    - Tooltip on hover: "Expires in 15 days" or "Expired 5 days ago"
  - **BGC Update Flow (1 hour):**
    - In Worker Detail > Profile tab, make BGC expiration date editable
    - "Update BGC" button next to date
    - Opens small modal with date picker
    - On save: Updates `bgc_expiration_date` field
    - Records update in activity log
  - **Filter Integration:**
    - Add filter preset: "BGC Issues" (expired or expiring soon)
    - Quick access from dashboard alert widget
- **Deliverable:** Complete BGC monitoring system
- **Success Criteria:** Can see BGC alerts on dashboard, visual indicators in worker list, can update BGC dates, filters work

**End of Day 10 Checkpoint:**
- ✅ Account replacement fully functional
- ✅ Chain of custody preserved
- ✅ BGC monitoring operational
- ✅ Dashboard shows BGC alerts
- ✅ **Week 2 Complete: Advanced features operational**

---

## Week 3: Power Features, Polish & Deployment
**Goal:** Production-ready application with CSV upload, dashboard, and messaging

---

### **DAY 11 - Monday: CSV Bulk Upload**
**Billable Hours:** 8 hours
**Focus:** Bulk worker onboarding via CSV

#### Full Day (8 hours)
**Task 11.1: CSV Bulk Upload with Validation** (8 hours)
- **Description:** Build comprehensive CSV upload system to bulk-import 50+ workers at once, with robust validation and error handling. This is critical for scaling (current manual entry is 10-15 min per worker).
- **Action Items:**
  - Install CSV parser: `npm install papaparse @types/papaparse`
  - Create `src/pages/workers/WorkerBulkUpload.tsx`
  - **Step 1: Upload & Parse (2 hours):**
    - Drag-and-drop zone or file picker (accept .csv only)
    - On file select: Parse with papaparse
    - Expected columns: first_name, last_name, email_personal, email_pph, phone, country_residence, locale_primary, hire_date, department_name, supervisor_email, bgc_expiration_date
    - Show parsing progress (if large file)
    - Detect headers automatically or allow user to map columns
  - **Step 2: Validation (3 hours):**
    - Validate each row against Zod schema (same as create form)
    - Validation rules:
      - Required fields present (first_name, last_name, email_personal, locale_primary, hire_date, department_name)
      - Email format valid
      - Date format valid (YYYY-MM-DD or MM/DD/YYYY)
      - Department name exists in database (lookup)
      - Supervisor email exists in workers table (lookup)
      - Duplicate email detection (within CSV and against existing DB)
      - Locale is valid (from predefined list)
    - Track errors per row: `{ row: 5, errors: ['Invalid email format', 'Department not found'] }`
  - **Step 3: Preview with Errors Highlighted (2 hours):**
    - Display parsed data in TanStack Table
    - Columns: Row #, First Name, Last Name, Email, Department, Status (Valid/Invalid), Errors
    - Invalid rows: Red background, error icon, error messages in tooltip
    - Valid rows: Green checkmark
    - Summary at top: "45 valid rows, 5 invalid rows"
    - Options:
      - "Import Valid Rows Only" (skip errors)
      - "Download Error Report" (CSV of invalid rows with error messages)
      - "Cancel & Fix CSV" (start over)
  - **Step 4: Bulk Insert (1 hour):**
    - On "Import Valid Rows" click:
      - Batch insert to `workers` table (use Supabase batch insert)
      - Show progress bar: "Importing 45 workers... 20/45"
      - Use transaction to ensure all-or-nothing
      - Set `created_by` to current admin
      - Set default `status='pending'`
    - On success:
      - Show success message: "45 workers imported successfully"
      - Offer to download summary report
      - Navigate to worker list (filter to recently created)
    - On partial failure:
      - Show which rows succeeded and which failed
      - Allow retry of failed rows
- **Deliverable:** Complete CSV bulk upload system
- **Success Criteria:** Can upload CSV with 50 workers, validation catches errors, can import valid rows, errors reported clearly, import completes in <30 seconds

**End of Day 11 Checkpoint:**
- ✅ CSV upload fully functional
- ✅ Validation catches all error types
- ✅ Can import 50+ workers in <5 minutes (vs. 10 hours manually)
- ✅ Error reporting clear and actionable

---

### **DAY 12 - Tuesday: Dashboard with Summary Cards**
**Billable Hours:** 8 hours
**Focus:** Main dashboard landing page

#### Full Day (8 hours)
**Task 12.1: Build Comprehensive Dashboard** (8 hours)
- **Description:** Create the main landing page admins see when logging in, providing at-a-glance workforce status and quick actions.
- **Action Items:**
  - Create `src/pages/Dashboard.tsx`
  - **Summary Cards (3 hours):**
    - Create `src/components/dashboard/SummaryCards.tsx`
    - Four large cards in a grid:
      1. **Total Workers Card:**
         - Count: `SELECT COUNT(*) FROM workers WHERE is_deleted=false`
         - Breakdown by status (Active: 120, Pending: 15, Terminated: 5)
         - Sparkline chart showing growth over last 30 days (optional, nice-to-have)
         - Click card → navigate to worker list
      2. **Active Projects Card:**
         - Count: `SELECT COUNT(*) FROM workforce_projects WHERE status='active'`
         - Breakdown by department
         - Average workers per project
         - Click card → navigate to project list (filter: active)
      3. **Teams Card:**
         - Count of active teams
         - Top 3 largest teams (by worker count)
         - Click card → navigate to teams list
      4. **BGC Alerts Card:**
         - Count of expired + expiring soon
         - Visual alert (red if >0 expired)
         - Click card → navigate to worker list (filter: BGC issues)
  - **BGC Expiration Alerts Widget (1 hour):**
    - Reuse component from Day 10
    - Display below summary cards
    - List of workers with expired/expiring BGC
    - Click worker → navigate to detail page
  - **Recent Activity Feed (2 hours):**
    - Create `src/components/dashboard/RecentActivity.tsx`
    - Query last 20 changes across workers, projects, assignments:
      - Worker created/updated
      - Project created
      - Worker assigned to project
      - Account replaced
    - Display as timeline:
      - Icon (plus for create, edit for update, arrow for assignment)
      - Text: "[Admin Name] created worker [Worker Name]"
      - Timestamp: "2 hours ago"
    - Click activity → navigate to relevant detail page
    - This requires activity log table or parsing `updated_at` with `updated_by` (simple approach: just show created/updated timestamps for now)
  - **Quick Actions (1 hour):**
    - Large buttons for common actions:
      - "➕ Add Worker" → /workers/create
      - "📤 Import CSV" → /workers/bulk-upload
      - "📊 Create Project" → /projects/create
      - "✉️ Send Message" → /messages/compose
    - Prominent placement below summary cards
  - **Layout & Styling (1 hour):**
    - Responsive grid layout
    - Summary cards: 2x2 grid on desktop, stack on mobile
    - Use Shadcn Card components
    - Visual hierarchy (most important info at top)
    - Loading skeletons while data fetches
- **Deliverable:** Complete dashboard with summary, alerts, activity feed, and quick actions
- **Success Criteria:** Dashboard loads in <2 seconds, all summary numbers accurate, quick actions work, responsive on tablet

**End of Day 12 Checkpoint:**
- ✅ Dashboard provides complete workforce overview
- ✅ Summary cards show key metrics
- ✅ BGC alerts prominently displayed
- ✅ Quick actions enable fast workflows
- ✅ Recent activity provides audit trail

---

### **DAY 13 - Wednesday: Messaging Integration & Navigation**
**Billable Hours:** 8 hours
**Focus:** Integrate messaging system and finalize app navigation

#### Morning (4 hours)
**Task 13.1: Integrate Messaging System from Maestro** (4 hours)
- **Description:** Copy and adapt the existing messaging UI from Maestro to work in PPH Connect, leveraging the already-adapted database tables.
- **Action Items:**
  - **Copy Messaging Pages (1 hour):**
    - Copy from `/maestro-workbench/maestro-workbench-master/src/pages/messages/`:
      - `Inbox.tsx` → `/pph-connect/src/pages/messages/Inbox.tsx`
      - `Compose.tsx`
      - `Thread.tsx`
      - `Broadcast.tsx`
      - `GroupConversation.tsx`
      - `GroupInfo.tsx`
    - Copy components from `/maestro-workbench/.../src/components/messages/`:
      - `CreateGroupDialog.tsx`
      - `RichTextEditor.tsx`
      - `ThreadList.tsx`
  - **Adapt for Workers (2 hours):**
    - Update queries to reference `workers` table instead of `profiles`:
      - Recipient selection: Fetch from `workers` table (active workers only)
      - Display worker full_name instead of profile name
      - Filter by department/team for broadcast targeting
    - Update types to use PPH Connect's generated Supabase types
    - Test inbox loads messages
    - Test compose creates message
    - Test thread displays conversation
  - **Broadcast Targeting (1 hour):**
    - In Broadcast.tsx, add audience selection:
      - All Workers
      - By Department (dropdown)
      - By Team (dropdown)
      - By Project (dropdown)
      - Custom (multi-select specific workers)
    - Creates `message_audience_targets` records for tracking
- **Deliverable:** Working messaging system in PPH Connect
- **Success Criteria:** Can send messages, receive messages, reply to threads, send broadcasts, group conversations work

#### Afternoon (4 hours)
**Task 13.2: Sidebar Navigation & Layout** (4 hours)
- **Description:** Build the main application layout with sidebar navigation, header, and consistent structure across all pages.
- **Action Items:**
  - Create `src/components/layout/Sidebar.tsx`
  - **Sidebar (2 hours):**
    - Fixed sidebar on left (250px width)
    - Navigation items with icons:
      - 📊 Dashboard (/)
      - 👥 Workers (/workers)
      - 📁 Projects (/projects)
      - 👨‍👩‍👧‍👦 Teams (/teams)
      - 🏢 Departments (/departments)
      - ✉️ Messages (/messages)
    - Active state highlighting (current page)
    - Collapse/expand button for mobile
    - User info at bottom: Avatar, name, role, sign out button
  - **Header (1 hour):**
    - Create `src/components/layout/Header.tsx`
    - Breadcrumbs showing current location (e.g., "Workers > John Doe > Edit")
    - Global search bar (searches workers and projects)
    - Notifications bell (message notifications count)
    - User menu dropdown (settings, sign out)
  - **Layout Component (1 hour):**
    - Create `src/components/layout/AppLayout.tsx`
    - Wraps all protected pages
    - Structure: `<Sidebar /> <div><Header /><main>{children}</main></div>`
    - Update App.tsx to wrap all routes in AppLayout
    - Ensure consistent spacing and responsive design
- **Deliverable:** Complete application layout with navigation
- **Success Criteria:** Sidebar navigation works, active states correct, header breadcrumbs update, layout responsive

**End of Day 13 Checkpoint:**
- ✅ Messaging fully integrated
- ✅ Can send/receive messages and broadcasts
- ✅ Sidebar navigation complete
- ✅ Application has consistent layout
- ✅ All pages use same header/sidebar

---

### **DAY 14 - Thursday: Testing, Bug Fixes & Error Handling**
**Billable Hours:** 8 hours
**Focus:** Comprehensive testing and quality assurance

#### Full Day (8 hours)
**Task 14.1: Comprehensive Manual Testing** (8 hours)
- **Description:** Systematically test every feature to find and fix bugs before deployment. This is critical QA time.
- **Action Items:**
  - **Authentication Testing (1 hour):**
    - Test login with valid credentials ✓
    - Test login with invalid credentials (should show error) ✓
    - Test logout (should redirect to login) ✓
    - Test protected routes when not logged in (should redirect) ✓
    - Test session persistence (refresh page, should stay logged in) ✓
    - Test token expiration handling (after 1 hour, should re-authenticate)
  - **Worker CRUD Testing (2 hours):**
    - Create 10 workers manually with various statuses ✓
    - Edit workers, verify changes persist ✓
    - Test validation errors (missing required fields) ✓
    - Test duplicate email detection ✓
    - Search workers by name and email ✓
    - Filter by status, department ✓
    - Test advanced filters (multiple conditions) ✓
    - Navigate to worker detail, verify all tabs load ✓
    - Replace account, verify chain of custody ✓
    - Update BGC date ✓
  - **CSV Upload Testing (1 hour):**
    - Create test CSV with 50 workers ✓
    - Upload and verify all parse correctly ✓
    - Create CSV with errors (invalid emails, missing fields) ✓
    - Verify errors highlighted in preview ✓
    - Import valid rows only ✓
    - Verify all 50 workers created in database ✓
  - **Project & Assignment Testing (2 hours):**
    - Create 5 projects with different statuses ✓
    - Assign 3 teams to a project ✓
    - Assign 10 workers to a project ✓
    - Remove workers from project ✓
    - From worker detail, assign worker to multiple projects ✓
    - Verify assignment history shows in both places (project and worker views) ✓
    - Test filters on project list ✓
  - **Messaging Testing (1 hour):**
    - Send message to individual worker ✓
    - Send broadcast to department ✓
    - Reply to thread ✓
    - Create group conversation ✓
    - Verify notifications appear ✓
  - **Dashboard Testing (1 hour):**
    - Verify all summary card numbers match reality ✓
    - Click each card, verify navigation ✓
    - Verify BGC alerts show correct workers ✓
    - Test quick actions ✓
  - **Bug Fixing (ongoing throughout day):**
    - Fix any bugs discovered during testing
    - Improve error messages to be user-friendly
    - Add loading states where missing
    - Fix responsive design issues on tablet/mobile
    - Handle edge cases (empty states, no data, large data sets)
- **Deliverable:** Fully tested application with bugs fixed
- **Success Criteria:** All test scenarios pass, no critical bugs, error handling graceful, edge cases handled

**End of Day 14 Checkpoint:**
- ✅ All features tested manually
- ✅ Bugs discovered and fixed
- ✅ Error handling improved
- ✅ Edge cases handled
- ✅ Application stable and ready for deployment

---

### **DAY 15 - Friday: Deployment & Final QA**
**Billable Hours:** 8 hours
**Focus:** Deploy to staging environment and final quality assurance

#### Morning (4 hours)
**Task 15.1: Deploy to AWS Amplify Staging** (4 hours)
- **Description:** Set up production deployment on AWS Amplify Hosting, following the DEPLOYMENT-UPDATE.md guide.
- **Action Items:**
  - **AWS Amplify Setup (2 hours):**
    - Log into AWS Console → Amplify Hosting
    - Click "New App" → "Host web app"
    - Connect GitHub repository (pph-connect)
    - Select branch: `main` (or `staging` if you have separate branch)
    - Configure build settings:
      - Build command: `npm run build`
      - Output directory: `dist`
      - Node version: 18
    - Add environment variables:
      - `VITE_SUPABASE_URL`
      - `VITE_SUPABASE_ANON_KEY`
      - (Copy from local .env)
    - Enable automatic deploys on git push
    - Click "Save and Deploy"
    - Wait for build to complete (~5 minutes)
  - **Custom Domain (Optional) (30 minutes):**
    - If you have domain: Add custom domain in Amplify settings
    - Configure DNS: Add CNAME record
    - Enable HTTPS (automatic via AWS Certificate Manager)
  - **Verify Deployment (1 hour):**
    - Visit Amplify-provided URL (e.g., https://main.d1a2b3c4d5e6f7.amplifyapp.com)
    - Test login (create admin user in production Supabase if not exists)
    - Smoke test: Navigate through main pages, verify no errors
    - Check browser console for errors
    - Test on multiple browsers (Chrome, Firefox, Safari)
  - **CI/CD Verification (30 minutes):**
    - Make small change to code (e.g., update dashboard heading)
    - Commit and push to GitHub
    - Verify Amplify automatically builds and deploys
    - Verify change appears on deployed site

#### Afternoon (4 hours)
**Task 15.2: Final QA on Staging Environment** (2 hours)
- **Description:** Test the deployed application in the staging environment to catch any production-specific issues.
- **Action Items:**
  - **Full Feature Testing on Staging:**
    - Repeat critical test scenarios from Day 14
    - Focus on: Login, create worker, CSV upload, assign to project, send message
    - Test with production Supabase data (or seed data)
    - Verify performance (page load times, filter speed)
    - Test on mobile devices (iPhone, Android)
  - **Identify Issues:**
    - Environment variable issues (wrong Supabase URL?)
    - CORS issues (should be none with Supabase)
    - Build/deployment issues (missing files, incorrect paths)
    - Performance issues (slow initial load due to bundle size?)
  - **Fix Issues:**
    - Fix any staging-specific bugs
    - Push fixes to GitHub
    - Verify auto-deploy picks up changes

**Task 15.3: Documentation & Handoff** (2 hours)
- **Description:** Update documentation with implementation notes and create user guide for admins.
- **Action Items:**
  - **Update PROJECT-ANALYSIS-REPORT.md:**
    - Add "Implementation Complete" section
    - Document any deviations from original spec
    - Note any technical debt or future improvements
  - **Create USER-GUIDE.md:**
    - Quick start: How to log in
    - How to add workers (manual and CSV)
    - How to create projects and assign workers
    - How to use advanced filters
    - How to replace accounts
    - How to send messages/broadcasts
    - Common workflows with screenshots
  - **Create DEPLOYMENT-NOTES.md:**
    - AWS Amplify setup steps
    - Environment variables required
    - How to roll back deployment
    - Monitoring and logs location
  - **Handoff Meeting Prep:**
    - Demo script with key features
    - Known limitations
    - Future Phase 2 roadmap reminder
    - Support plan (who fixes bugs? who adds features?)

**End of Day 15 Checkpoint:**
- ✅ Application deployed to staging
- ✅ CI/CD pipeline working
- ✅ Final QA passed on staging
- ✅ Documentation complete
- ✅ **3-WEEK SPRINT COMPLETE - PPH CONNECT PHASE 1 LAUNCHED! 🎉**

---

## Sprint Success Metrics

### Functional Requirements Met:
- ✅ Admin can log in securely
- ✅ Admin can add 50 workers via CSV in <5 minutes
- ✅ Admin can find any worker via advanced filters in <30 seconds
- ✅ Admin can view full worker account history (chain of custody)
- ✅ Admin can assign 10 workers to a project in <2 minutes
- ✅ Admin sees expiring BGCs on dashboard at a glance
- ✅ All CRUD operations work correctly (workers, projects, teams, departments)
- ✅ Messaging system operational

### Performance Requirements Met:
- ✅ Page load time <2 seconds
- ✅ Filter response time <500ms for 500 workers
- ✅ CSV upload validates 100 rows in <10 seconds
- ✅ No data loss during operations

### Quality Requirements Met:
- ✅ No XSS, SQL injection, or auth bypass vulnerabilities (Supabase RLS provides protection)
- ✅ Error messages helpful and user-friendly
- ✅ UI responsive on desktop and tablet
- ✅ Full audit trails (created_by, updated_by, timestamps)

---

## Post-Sprint: What's Next?

### Immediate (Week 4):
- User acceptance testing with real admins
- Bug fixes based on UAT feedback
- Performance optimization if needed
- Deploy to production

### Phase 2 (Months 2-4):
- Stats import (CSV import of work stats)
- Quality dashboard (real-time metrics)
- Invoice generation
- Worker self-service portal
- Enhanced training system

### Phase 3 (Months 5-7):
- Project marketplace
- Worker project selection
- AI interviews for hiring
- Expert verification

### Phase 4 (Months 8-10):
- ML-powered QA
- Predictive analytics
- Automated worker recommendations

---

## Resource Requirements

### Team:
- 1 Full-time Developer (120 hours over 15 days)
- OR 2 Developers (60 hours each, parallel work)

### Infrastructure:
- Supabase Pro: $25-50/month (shared with Maestro)
- AWS Amplify: $5-15/month
- Total: $30-65/month

### Success Factors:
- Focus: No scope creep, stick to Phase 1 features only
- Speed: Aggressive timeline requires daily progress and quick decisions
- Reuse: Leverage Maestro's Shadcn components and database infrastructure
- Quality: Daily testing prevents bug backlog

---

## Risk Mitigation

### If Behind Schedule:
- **Day 5:** Skip Activity tab, defer to Phase 2
- **Day 9:** Simplify advanced filters, skip presets initially
- **Day 11:** CSV upload validation can be less strict (manual cleanup acceptable for Phase 1)
- **Day 12:** Dashboard can have fewer widgets initially
- **Day 13:** Messaging can be deferred to Phase 2 (not critical for workforce management)

### If Blocked:
- **Database issues:** Maestro team can help (shared database)
- **Supabase questions:** Supabase Discord is very responsive
- **UI/UX questions:** Follow Maestro's patterns for consistency

---

**Sprint Plan Created:** November 11, 2025
**Sprint Start Date:** [To be determined]
**Expected Completion:** [Start date + 15 working days]
**Plan Version:** 1.0