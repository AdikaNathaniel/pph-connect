# **PPH Connect: Production Workforce Management Platform**

**Specification Document v1.0**  
*Last Updated: October 30, 2025*

---

## **The Opportunity**

PPH Connect replaces chaotic spreadsheet-based workforce tracking with a production-grade management platform supporting hundreds of annotation workers across multiple projects and languages. This internal tool provides immediate cost savings by eliminating Gmail licensing needs, creates a foundation for automated stats processing and invoicing, and establishes proper audit trails for compliance. The platform features proper database modeling, role-based security, and enterprise-grade UX designed to scale with organizational growth.

---

## **Platform Vision: End-to-End Crowdsourcing Ecosystem**

**Ultimate Goal:** PPH Connect will evolve from an internal workforce management tool into a comprehensive end-to-end crowdsourcing platform managing the complete contractor/contributor lifecycle from initial application through termination.

### **Long-Term Platform Components**

**Full Lifecycle Management:**

* **Recruitment & Onboarding:** Automated application processing, skill verification, and background checks

* **Active Work Period:** Project assignments, performance tracking, earnings management, training progression

* **Offboarding:** Graceful termination workflows, data retention, rehire eligibility tracking

**Internal Marketplace:**

* Active workers can browse available projects

* Workers apply to projects matching their skills and qualifications

* Automated matching based on:

  * Language/locale capabilities

  * Skill assessments and past performance

  * Training gate completion

  * Availability and capacity

* Project leads review applications and approve assignments

* Real-time project capacity and demand visibility

**Skill Verification & Quality Control:**

* AI-enabled interviews for domain knowledge verification

* Automated skill assessments for specialized tasks

* Continuous performance evaluation and tier advancement

* Adaptive training recommendations

* **Automated QA Engine:** Real-time metric aggregation, auto-grading, intelligent project matching, and automated removal of underperforming workers from projects based on objective performance thresholds

### **Reference Platform Models**

**Crowdgen (Generalist Task Model):**

* Open marketplace approach

* Wide variety of task types

* Flexible worker participation

* Self-service project selection

* Volume-focused operations

**Alignerr (Specialized Task Model):**

* Expert-level task focus

* Rigorous qualification processes

* AI-enabled domain expertise verification

* Higher compensation for specialized skills

* Quality-focused operations

**PPH Connect Differentiation:**

* Hybrid approach supporting both generalist and specialized workflows

* Tighter integration with client projects

* Internal-first design (not public marketplace)

* Advanced training and progression pathways

* Comprehensive audit trails and compliance features

### **Evolution Path**

**Current State (Phase 1):** Admin-managed workforce tracking. Manual worker assignments. Foundation for future automation.

**Phase 2:** Stats processing, messaging, basic worker self-service. Initial automation of repetitive tasks.

**Phase 3:** Project marketplace, worker applications, automated matching. Training gate integration. Performance-based tier advancement.

**Phase 4:** Full lifecycle automation, AI-enabled assessments, predictive capacity planning. Complete self-service ecosystem for qualified workers.

---

## **Executive Summary**

**Project:** PPH Connect \- Internal workforce management platform for annotation/data operations workers

**Current Status:** Core infrastructure complete. Database schema deployed to Supabase, authentication functional, CRM-style detail pages implemented. Primary focus: enterprise-grade data tables with advanced filtering, bulk operations, and professional data management UX.

**Technical Foundation:**

* **Frontend:** Vite \+ React 18, TypeScript (strict), Shadcn UI, TanStack Table, React Router v6

* **Backend:** Supabase (PostgreSQL \+ Auth \+ RLS)

* **Deployment:** AWS Amplify Hosting (CI/CD with GitHub, ~~approximately $5 to $15 per month cost)~~

* **Architecture:** Single-page application with proper data modeling, avoiding technical debt from day one

**Phase 1 Scope (Admin Only):**

* Worker lifecycle management (CRUD, status workflows, supervisor hierarchy)

* Platform account tracking with full chain of custody

* Background check (BGC) expiration monitoring with visual warnings

* CSV bulk upload with comprehensive validation

* Project management with team assignments and worker allocation

* Department and team organization with locale configuration

* Enterprise-grade data tables with advanced multi-field filtering

* Bulk operations (status updates, project assignments, exports)

* Full audit trails (created\_by/updated\_by tracking on all mutations)

* Admin-only access (RLS enforced at database level)

**Phase 2 Scope (Post-Launch):**

* Work stats CSV import and balance aggregation

* Invoice generation and previews

* Messaging system (worker ↔ manager communications)

* Training materials and gate tracking

* Worker self-service portal (view assignments, balances, training)

* Full RBAC (Admin/Manager/Team Lead/Worker roles)

* Rate cards and payable rates management

**Key Design Principles:**

* **Bulk-First Thinking:** Every operation designed for managing hundreds of workers, not singles.

* **CRM-Style UX:** Salesforce-inspired detail pages with contextual tabs for related entities.

* **Data-First Interface:** Enterprise-grade tables with sorting, filtering, pagination matching tools like Looker/Google Sheets.

* **Compliance by Design:** Immutable audit trails. Soft deletes. Full account history.

* **Cost Efficiency:** Static hosting (approximately $2 to $10 per month) versus server-based solutions (approximately $30 to $80 per month).

* **Quality-First Automation:** Architecture supports future automated QA engine with objective performance metrics, intelligent matching algorithms, and autonomous quality enforcement.

**Business Impact:**

* Immediate: Eliminate manual spreadsheet chaos. Enable systematic worker onboarding.

* Short term: Cost savings through built-in messaging (no Gmail licenses needed).

* Medium term: Automated stats processing and invoice generation.

* Long term: Scalable platform supporting 500+ workers across multiple departments.

* Ultimate: Fully autonomous quality-controlled marketplace with AI-driven performance management, automated worker-project matching, and zero-touch quality enforcement removing subpar performers automatically.

---

## **1\. Database Architecture**

### **1.1 Schema Overview**

Seven core tables with proper referential integrity, audit trails, and Row Level Security (RLS):

#### *Table: **departments***

**id** UUID **PRIMARY** **KEY**  
department\_name TEXT **NOT** **NULL**  
department\_code TEXT **UNIQUE** **NOT** **NULL**  
is\_active BOOLEAN **DEFAULT** **true**  
created\_at TIMESTAMP **WITH** TIME ZONE  
updated\_at TIMESTAMP **WITH** TIME ZONE

**Purpose:** Top-level organizational structure (e.g., “Speech”, “MLDO”, “Other”)

---

#### *Table: **teams***

**id** UUID **PRIMARY** **KEY**  
department\_id UUID **REFERENCES** departments(**id**)  
team\_name TEXT **NOT** **NULL**  
locale\_primary TEXT **NOT** **NULL** (ISO code: "en", "ja", "es")  
locale\_secondary TEXT (**for** bilingual teams: "ko")  
locale\_region TEXT (regional variants: "US", "MX", "KR")  
is\_active BOOLEAN **DEFAULT** **true**  
created\_at TIMESTAMP **WITH** TIME ZONE  
updated\_at TIMESTAMP **WITH** TIME ZONE

**Purpose:** Language-based teams within departments. Team naming convention:

* Monolingual: “English” (locale\_primary=“en”, locale\_secondary=null)

* Bilingual: “Japanese/Korean” (locale\_primary=“ja”, locale\_secondary=“ko”)

**Index:** idx\_teams\_department on department\_id

---

#### *Table: **workers***

**id** UUID **PRIMARY** **KEY**  
hr\_id TEXT **UNIQUE** **NOT** **NULL** (e.g., "HR-2025-001")  
full\_name TEXT **NOT** **NULL**  
engagement\_model ENUM('core', 'upwork', 'external', 'internal')  
worker\_role TEXT (job title)  
email\_personal TEXT **UNIQUE** **NOT** **NULL**  
email\_pph TEXT **UNIQUE** (company contractor email)  
country\_residence TEXT **NOT** **NULL** (ISO country code)  
locale\_primary TEXT **NOT** **NULL** (worker's primary language)  
locale\_all TEXT\[\] (array of all languages worker qualified for)  
hire\_date DATE NOT NULL  
rtw\_datetime TIMESTAMP (Ready To Work approval timestamp)  
supervisor\_id UUID REFERENCES workers(id) (self-referential)  
termination\_date DATE  
bgc\_expiration\_date DATE (background check expiration)  
status ENUM('pending', 'active', 'inactive', 'terminated') DEFAULT 'pending'  
created\_at TIMESTAMP WITH TIME ZONE  
created\_by UUID REFERENCES workers(id)  
updated\_at TIMESTAMP WITH TIME ZONE  
updated\_by UUID REFERENCES workers(id)

**Purpose:** Core worker identity. One record per human, never deleted (soft deletes via status).

**Business Rules:**

* Status transitions: pending→active (RTW approved), active↔inactive (suspension/reactivation), active→terminated (final)

* Supervisor hierarchy: Prevents circular references

* BGC warnings: Visual alerts if bgc\_expiration\_date within 30 days or expired

**Indexes:**

* idx\_workers\_hr\_id on hr\_id

* idx\_workers\_status on status

* idx\_workers\_supervisor on supervisor\_id

---

#### *Table: **worker\_accounts***

**id** UUID **PRIMARY** **KEY**  
worker\_id UUID **REFERENCES** workers(**id**) **ON** **DELETE** **CASCADE**  
worker\_account\_email TEXT **NOT** **NULL**  
worker\_account\_id TEXT **NOT** **NULL** (platform **identifier**)  
platform\_type ENUM('DataCompute', 'Maestro', 'Other')  
status ENUM('active', 'inactive', 'replaced')  
is\_current BOOLEAN **DEFAULT** **false**  
activated\_at TIMESTAMP **WITH** TIME ZONE **NOT** **NULL**  
deactivated\_at TIMESTAMP **WITH** TIME ZONE  
deactivation\_reason TEXT  
created\_at TIMESTAMP **WITH** TIME ZONE  
created\_by UUID **REFERENCES** workers(**id**)  
updated\_at TIMESTAMP **WITH** TIME ZONE  
updated\_by UUID **REFERENCES** workers(**id**)

**CONSTRAINT** unique\_current\_account **UNIQUE** (worker\_id, platform\_type) **WHERE** is\_current \= **true**

**Purpose:** Platform account chain of custody. Workers may have multiple accounts over time (malfunction/replacement), but only ONE current account per platform.

**Business Rules:**

* One-current-account enforcement: Database constraint prevents multiple is\_current=true for same worker+platform

* Account replacement workflow: When creating new current account, automatically set old account’s is\_current=false and deactivated\_at=now()

* Full history preserved: Never delete old accounts (compliance/audit trail)

**Computed Field (UI only, not stored):**

* email\_current\_worker: Query from worker\_accounts WHERE is\_current=true, displayed in worker list/detail views

**Indexes:**

* idx\_worker\_accounts\_worker on worker\_id

* idx\_worker\_accounts\_current partial index on (worker\_id, is\_current) WHERE is\_current=true

---

#### *Table: **projects***

**id** UUID **PRIMARY** **KEY**  
department\_id UUID **REFERENCES** departments(**id**)  
project\_code TEXT **UNIQUE** **NOT** **NULL** (e.g., "EN-ANN-001")  
project\_name TEXT **NOT** **NULL**  
expert\_tier ENUM('tier0', 'tier1', 'tier2') (**for** rate card lookup **in** Phase 2)  
status ENUM('active', 'paused', 'completed', 'cancelled') **DEFAULT** 'active'  
start\_date DATE  
end\_date DATE  
created\_at TIMESTAMP **WITH** TIME ZONE  
created\_by UUID **REFERENCES** workers(**id**)  
updated\_at TIMESTAMP **WITH** TIME ZONE  
updated\_by UUID **REFERENCES** workers(**id**)

**Purpose:** Work projects that workers get assigned to.

**Indexes:**

* idx\_projects\_department on department\_id

* idx\_projects\_code on project\_code

* idx\_projects\_status on status

---

#### *Table: **project\_teams** (junction table)*

**id** UUID **PRIMARY** **KEY**  
project\_id UUID **REFERENCES** projects(**id**) **ON** **DELETE** **CASCADE**  
team\_id UUID **REFERENCES** teams(**id**) **ON** **DELETE** **CASCADE**  
created\_at TIMESTAMP **WITH** TIME ZONE  
created\_by UUID **REFERENCES** workers(**id**)

**CONSTRAINT** unique\_project\_team **UNIQUE** (project\_id, team\_id)

**Purpose:** Many-to-many relationship. Projects can have multiple teams (e.g., both Japanese and Japanese/Korean teams can work on Japanese project).

**Business Rules:**

* Teams can be assigned to multiple active projects simultaneously

* No validation against team is\_active status (flexibility for Phase 1\)

**Indexes:**

* idx\_project\_teams\_project on project\_id

* idx\_project\_teams\_team on team\_id

---

#### *Table: **worker\_assignments***

**id** UUID **PRIMARY** **KEY**  
worker\_id UUID **REFERENCES** workers(**id**) **ON** **DELETE** **CASCADE**  
project\_id UUID **REFERENCES** projects(**id**) **ON** **DELETE** **CASCADE**  
assigned\_at TIMESTAMP **WITH** TIME ZONE **DEFAULT** now()  
assigned\_by UUID **NOT** **NULL** **REFERENCES** workers(**id**)  
removed\_at TIMESTAMP **WITH** TIME ZONE  
removed\_by UUID **REFERENCES** workers(**id**)

**Purpose:** Worker-to-project assignments with full audit trail.

**Business Rules:**

* **Never delete assignment records** \- to remove, set removed\_at timestamp and removed\_by user ID

* Stats flow to project’s team (dynamic team assignment based on active project)

* Any admin can remove any assignment (Phase 1 admin-only model)

**Indexes:**

* idx\_worker\_assignments\_worker on worker\_id

* idx\_worker\_assignments\_project on project\_id

* idx\_worker\_assignments\_active partial index on (worker\_id, project\_id) WHERE removed\_at IS NULL

---

### **1.2 ENUMs**

engagement\_model: 'core' | 'upwork' | 'external' | 'internal'  
worker\_status: 'pending' | 'active' | 'inactive' | 'terminated'  
platform\_type: 'DataCompute' | 'Maestro' | 'Other'  
account\_status: 'active' | 'inactive' | 'replaced'  
project\_status: 'active' | 'paused' | 'completed' | 'cancelled'  
expert\_tier: 'tier0' | 'tier1' | 'tier2'

---

### **1.3 Row Level Security (RLS)**

**Phase 1 \- Admin Only Model:**

All tables have identical RLS pattern:

*\-- Read policy: Any authenticated user can read*  
**CREATE** POLICY "Authenticated users can read \[table\]"  
  **ON** \[**table**\] **FOR** **SELECT**  
  **TO** **authenticated**  
  **USING** (**true**);

*\-- Write policy: Only admin can insert/update/delete*  
**CREATE** POLICY "Admin users can manage \[table\]"  
  **ON** \[**table**\] **FOR** **ALL**  
  **TO** **authenticated**  
  **USING** (auth.jwt() \-\>\> 'email' \= 'maxim.stockschlader@productiveplayhouse.com')  
  **WITH** **CHECK** (auth.jwt() \-\>\> 'email' \= 'maxim.stockschlader@productiveplayhouse.com');

**Admin Email Whitelist:** maxim.stockschlader@productiveplayhouse.com

**Phase 2 Enhancement:** Replace email hardcoding with role-based checks from user metadata.

---

## **2\. Authentication & Authorization**

### **2.1 Supabase Auth Configuration**

**Provider:** Email/Password (traditional login form)

**Environment Variables:**

VITE\_SUPABASE\_URL=https://cntkpxsjvnuubrbzzeqk.supabase.co  
VITE\_SUPABASE\_ANON\_KEY=\[anon\_key\]  
VITE\_SUPABASE\_SERVICE\_ROLE\_KEY=\[service\_role\_key\] (server-side only, never in client)

**Session Management:**

* Client-side session via Supabase Auth helpers

* AuthContext provider wraps app

* Protected routes via React Router \+ AuthContext check

### **2.2 Protected Routes Pattern**

*// Route structure*  
/login (public)  
/dashboard (**protected**)  
/workers (**protected**)  
  /workers/:id (**protected** \- worker detail)  
/projects (**protected**)  
  /projects/:id (**protected** \- project detail)  
/teams (**protected**)  
  /teams/:id (**protected** \- team detail)  
/departments (**protected**)

**ProtectedRoute Component:**

* Checks AuthContext for authenticated user

* Redirects to /login if not authenticated

* Wraps all dashboard routes

---

## **3\. User Interface Architecture**

### **3.1 CRM-Style Design Philosophy**

**Inspiration:** Salesforce-style record detail pages with contextual tabs for related data

**Key Principle:** Users should rarely navigate away from a record to see or edit related information. Everything contextually relevant should be visible on the detail page.

**Navigation Pattern:**

* List views (tables) for browsing/filtering

* Click any row → navigate to detail page (not modal)

* Detail pages show related entities in context via tabs

* Actions accessible without leaving page

* Breadcrumb navigation for hierarchy

---

### **3.2 Layout Structure**

#### *Main Layout (for authenticated users)*

**Sidebar Navigation (fixed left):**

* Dashboard

* Workers

* Projects

* Teams

* Departments

**Header (top bar):**

* User email display

* Logout button

**Main Content Area (scrollable):**

* Page-specific content

* Responsive: sidebar collapses to hamburger on mobile

---

### **3.3 Page Specifications**

#### *3.3.1 Dashboard Page (/dashboard)*

**Purpose:** High-level overview and quick access to critical information

**Layout:**

**Summary Cards (grid):**

* Total Active Workers (count, link to filtered workers list)

* Total Active Projects (count, link to projects list)

* Total Teams (count, link to teams list)

* Pending Workers (count, link to filtered workers list where status=pending)

**BGC Expiration Alerts Card:**

* Title: “Background Checks Expiring Soon”

* List of workers with BGC expiring within 30 days or already expired

* Each row: Worker name, HR ID, Expiration date, “View” link

* Empty state if none: “All background checks are current”

**Quick Actions Section:**

* “Add Worker” button → navigate to /workers with create form open

* “Add Project” button → navigate to /projects with create form open

* “Bulk Upload Workers” button → navigate to /workers with bulk upload modal open

---

#### *3.3.2 Workers List Page (/workers)*

**Purpose:** Browse, search, filter, and manage workforce

**Top Actions Bar:**

* **Left:** Page title “Workers” with count

* **Right:**

  * “Bulk Upload” button (secondary) → opens CSV upload modal

  * “Add Worker” button (primary) → opens create form

**Search & Filter Bar:**

* **Global Search:** Text input, placeholder “Search by name, HR ID, or email…”

* **Filters Button:** Opens advanced filter panel

* **Active Filter Chips:** Display active filters as removable pills

**Data Table (Enterprise-Grade \- TanStack Table):**

**Columns:**

* Checkbox (bulk selection)

* HR ID (sortable, clickable → detail page)

* Name (sortable, clickable → detail page)

* Status (badge with color coding, sortable, filterable)

  * pending: yellow

  * active: green

  * inactive: gray

  * terminated: red

* Current Email (computed from worker\_accounts, sortable)

* Country (sortable, filterable)

* Locale (sortable, filterable)

* Hire Date (sortable, filterable with date range)

* BGC Status (icon indicator, sortable, filterable)

  * Valid: green checkmark ✓

  * Expiring Soon (\<30 days): yellow warning ⚠️

  * Expired: red alert ⚠️

* Actions (dropdown)

  * View Details

  * Edit Worker

  * Manage Accounts

  * Assign to Project

**Table Features:**

* **Column Sorting:** Click header to sort ascending/descending, visual indicators

* **Advanced Filtering:** (See Section 3.4 \- Enterprise Filtering System)

* **Bulk Selection:**

  * Select all checkbox in header

  * Individual row checkboxes

  * “X rows selected” indicator appears when selections made

  * Bulk actions dropdown (visible when rows selected):

    * Update Status

    * Assign to Project

    * Export Selected (CSV)

    * Delete Selected (with confirmation)

* **Pagination:**

  * Rows per page selector: 10, 20, 50, 100

  * Page navigation: First, Previous, Next, Last

  * “Showing X to Y of Z results” indicator

* **Column Management:**

  * Column visibility toggle (show/hide columns)

  * Resizable columns (drag borders)

* **Performance:**

  * Client-side filtering/sorting for \<500 rows

  * Server-side for 500+ rows (Supabase query optimization)

**Empty State:** “No workers found. Add your first worker to get started.”

---

#### *3.3.3 Worker Detail Page (/workers/:id)*

**Layout:**

**Header Section:**

* **Breadcrumb:** Workers \> \[Worker Name\]

* **Title:** Worker Full Name

* **Status Badge:** Visual indicator (colored pill)

* **BGC Warning Badge:** (if applicable) Red “BGC Expired” or Yellow “BGC Expiring Soon”

* **Quick Actions:**

  * “Edit Worker” button (primary)

  * “Deactivate” / “Reactivate” button (conditional on status)

  * More actions dropdown (Terminate, Change Supervisor)

**Profile Section (card):** Display all worker fields in read-only format with inline edit capability:

* **Column 1:**

  * HR ID

  * Full Name

  * Engagement Model

  * Worker Role

* **Column 2:**

  * Email (Personal)

  * Email (PPH)

  * Current Worker Email (computed, displayed with platform badge)

  * Supervisor (name, link to supervisor’s detail page)

* **Column 3:**

  * Country of Residence

  * Primary Locale

  * All Locales (pill list)

* **Column 4:**

  * Hire Date

  * RTW Date/Time

  * Termination Date (if terminated)

  * BGC Expiration Date (with visual warning if soon/expired)

**Tabbed Sections:**

**Tab 1: Accounts**

* Section Title: “Platform Accounts”

* **Add Account** button (primary, top right)

* **Data Table:**

  * Columns: Platform, Account Email, Account ID, Status, Is Current (badge), Activated Date, Deactivated Date, Actions

  * Shows ALL accounts (current \+ historical) for full chain of custody

  * Actions dropdown per row:

    * View Details

    * Replace Account (if is\_current=true, triggers replacement workflow)

    * View History (show deactivation reason, who deactivated, when)

* **Empty State:** “No platform accounts. Add the first account to get started.”

**Account Replacement Workflow:**

* Click “Replace Account” on current account

* Modal opens: “Replace \[Platform\] Account”

* Form fields:

  * New Account Email (required)

  * New Account ID (required)

  * Reason for replacement (optional)

* Confirm button

* System logic:

  * Sets old account: is\_current=false, deactivated\_at=now(), deactivation\_reason=\[reason\], status=‘replaced’

  * Creates new account: is\_current=true, activated\_at=now(), status=‘active’

* Success toast: “Account replaced successfully”

* Table refreshes to show both old and new accounts

**Tab 2: Projects**

* Section Title: “Project Assignments”

* **Assign to Project** button (primary, top right)

* **Data Table:**

  * Columns: Project Code (link), Project Name, Department, Status, Assigned Date, Assigned By (name), Actions

  * Shows only CURRENT assignments (removed\_at IS NULL)

  * Actions: Remove from Project

* **View Assignment History** link (below table)

  * Shows modal with full history including removed assignments

  * Columns: Project, Assigned Date, Assigned By, Removed Date, Removed By

* **Empty State:** “Not assigned to any projects. Assign worker to projects to track their work.”

**Assign to Project Modal:**

* Multi-select dropdown of active projects (not already assigned)

* Filter projects by department

* Confirm button

* Creates worker\_assignments records with assigned\_by=current\_user

**Remove from Project Action:**

* Confirmation dialog: “Remove \[Worker\] from \[Project\]?”

* Optional: Reason for removal (text field)

* Confirm button

* Sets removed\_at=now(), removed\_by=current\_user

* Does NOT delete record (audit trail preserved)

**Tab 3: Activity** (Phase 2 \- placeholder for now)

* Audit log of all changes to worker record

* Future: Show training completions, status changes, notes

---

#### *3.3.4 Projects List Page (/projects)*

**Top Actions Bar:**

* **Left:** Page title “Projects” with count

* **Right:** “Add Project” button (primary)

**Search & Filter Bar:**

* Global search: “Search by project code or name…”

* Filters: Department, Status, Team, Expert Tier

* Active filter chips

**Data Table:**

* Columns: Project Code (clickable), Name (clickable), Department, Teams (pill list), Status (badge), Expert Tier, Start Date, End Date, Worker Count (badge), Actions

* Sortable columns: Code, Name, Status, Start Date, End Date

* Filterable: Department (dropdown), Status (multi-select), Team (multi-select)

* Actions dropdown: View Details, Edit, Archive

---

#### *3.3.5 Project Detail Page (/projects/:id)*

**Header Section:**

* Breadcrumb: Projects \> \[Project Code\]

* Title: Project Name

* Status Badge

* Quick Actions: “Edit Project”, “Assign Workers”, “Assign Teams”

**Info Section (card):**

* Project Code

* Name

* Department (link to department detail if exists)

* Expert Tier

* Status

* Start Date

* End Date

**Tabbed Sections:**

**Tab 1: Teams**

* Section Title: “Assigned Teams”

* **Assign Teams** button (top right)

* **Data Table:**

  * Columns: Team Name (link), Primary Locale, Secondary Locale, Region, Assigned Date, Actions

  * Actions: Remove Team

* Shows teams via project\_teams junction table

* Empty state: “No teams assigned. Assign teams to this project.”

**Assign Teams Modal:**

* Multi-select teams from same department

* Filter by locale

* Creates project\_teams records

**Tab 2: Workers**

* Section Title: “Assigned Workers”

* **Assign Workers** button (top right)

* **Data Table:**

  * Columns: HR ID, Name (link to worker detail), Current Email, Status, Assigned Date, Assigned By, Actions

  * Actions: Remove Worker (sets removed\_at)

* Shows current assignments only (removed\_at IS NULL)

* **View Assignment History** link

**Assign Workers Modal:**

* Multi-select workers

* Filter by: Status (active only by default), Team, Locale

* Shows only workers not currently assigned

* Batch create worker\_assignments records

---

#### *3.3.6 Teams List Page (/teams)*

**Top Actions Bar:**

* “Add Team” button (primary)

**Search & Filter Bar:**

* Search: “Search teams…”

* Filter by: Department, Is Active

**Data Table:**

* Columns: Team Name (clickable), Department, Primary Locale, Secondary Locale, Region, Active Status (toggle), Actions

* Sortable: Name, Department, Locale

* Actions: View Details, Edit, Deactivate/Activate

---

#### *3.3.7 Team Detail Page (/teams/:id)*

**Header:** Team Name, breadcrumb, Edit button

**Info Card:**

* Team Name

* Department (link)

* Locale Primary

* Locale Secondary (if applicable)

* Locale Region

* Active Status (toggle)

**Related Projects Section:**

* List of projects using this team (via project\_teams)

* Columns: Project Code (link), Name, Status

* Empty state: “No projects assigned to this team.”

**Related Workers Section:**

* List of workers currently on projects with this team

* Complex query: workers assigned to projects that have this team assigned

* Shows unique workers, not duplicate if on multiple projects

* Empty state: “No workers currently assigned to projects for this team.”

---

#### *3.3.8 Departments Page (/departments)*

**Simple CRUD Interface:**

**Top Actions Bar:**

* “Add Department” button (primary)

**Data Table:**

* Columns: Department Name (clickable), Code, Teams Count, Projects Count, Active Status (toggle), Actions

* Actions: Edit, View Teams, View Projects, Deactivate/Activate

**Create/Edit Department Modal:**

* Department Name (required)

* Department Code (required, unique, immutable after creation)

* Is Active (checkbox)

---

### **3.4 Enterprise Filtering System**

**Reference:** Google Sheets / Looker / Airtable style advanced filtering

**Architecture Overview:**

**1\. Filter Management Bar (Above Table)**

**Components:**

* **“Add Filter” button** (primary action)

* **Active filter chips** (displayed horizontally):

  * Format: \[Field\]: \[Value Summary\]

  * Examples:

    * Status: Active, Pending

    * Hire Date: Last 30 days

    * Country: US, CA, MX

  * Each chip has:

    * Click to edit (reopens filter modal with current values)

    * X button to remove filter instantly

  * Visual styling: Colored border/background when active

* **“Clear All Filters” button** (appears when 1+ filters active)

* **Filter count badge:** “3 filters active”

---

**2\. Add Filter Flow**

#### ***Step 1: Field Selector Modal***

**Modal Layout:**

* **Title:** “Add Filter” or “Select Field”

* **Search bar:** “Search all fields…” (filters the field list)

* **Field List** (scrollable):

  * For Workers table:

    * HR ID (text)

    * Name (text)

    * Status (categorical)

    * Engagement Model (categorical)

    * Country (categorical)

    * Locale Primary (categorical)

    * Locale All (categorical multi-value)

    * Hire Date (date)

    * RTW Date (date)

    * BGC Expiration Date (date)

    * Current Email (text)

  * Each field clickable

* **Close (X) button**

**Interaction:**

* User clicks field → modal closes → type-specific filter configuration modal opens

---

#### ***Step 2: Type-Specific Filter Configuration***

### **For Text/Categorical Fields (Status, Country, Engagement Model, Locale, etc.)**

**Modal Layout:**

**Header:**

* Field name as title (e.g., “Status”, “Country”)

* Settings icon (gear) \- for advanced options like custom sorting

* Close (X) button

**Mode Selector Dropdown:** Options:

* **Include** (default) \- show rows where field is IN selected values

* **Exclude** \- show rows where field is NOT IN selected values

* **Equal to** \- show rows where field exactly equals one value

* **Not equal to** \- show rows where field does not equal value

**Search Bar:**

* Placeholder: “Search…” or “Search values…”

* Clear button (X) when text entered

* **Critical Feature: Comma-separated paste support**

  * User pastes: pending, active, terminated

  * System detects commas, auto-selects “pending”, “active”, “terminated” from value list

  * Works even if user includes quotes or extra spaces

**Value List (scrollable):**

* Checkboxes for each unique value found in this column across all rows

* “Select all” link at top

* Show value counts next to each option (optional): Active (45)

* Handle null/empty values:

  * Display as \<empty\> or null

  * Checkbox to include/exclude nulls

* If \>100 unique values:

  * Virtual scrolling for performance

  * Search bar becomes more critical

**Footer:**

* **Count indicator:**

  * “X available” (total unique values)

  * OR “Y of X selected” (when selections made)

* **Apply button** (primary, enabled only when selection made)

**Interaction Flow:**

1. User opens filter for “Status”

2. Sees checkboxes: Pending, Active, Inactive, Terminated

3. Checks “Active” and “Pending”

4. Clicks “Apply”

5. Modal closes

6. Filter chip appears: Status: Active, Pending

7. Table refreshes showing only active \+ pending workers

**Paste Flow:**

1. User opens filter for “Country”

2. Clicks in search bar

3. Pastes: US, CA, MX, UK

4. System auto-checks: US, CA, MX, UK (if they exist in data)

5. Shows: “4 of 50 selected”

6. User clicks Apply

---

### **For Date Fields (Hire Date, BGC Expiration, RTW Date, etc.)**

**Modal Layout:**

**Header:** Same as text fields

**Operator Dropdown:** Options:

* **Between (fixed)** \- date range with quick presets (default)

* **Custom** \- opens full calendar picker

* **Equal to** \- specific single date

* **Not equal to** \- exclude specific date

* **Before** \- dates before specified date

* **After** \- dates after specified date

**Quick Presets Panel** (left sidebar, appears when “Between (fixed)” selected):

* Today

* Yesterday

* Last 7 days

* This week

* Last week

* This month

* Last month

* This quarter

* Last quarter

* This year

* Last year

* **Custom** (activates calendar picker)

**Date Range Inputs** (when “Between” operator):

* **Start Date** input (calendar icon, opens date picker on click)

* Dash separator \-

* **End Date** input (calendar icon, opens date picker on click)

**Calendar Picker** (when clicking date input or “Custom” preset):

* **Month/Year Navigation:** Arrow buttons, dropdown to jump to month/year

* **Calendar Grid:** Clickable dates

* **Range Selection Mode:**

  * Click start date (highlights)

  * Click end date (highlights, shows range between)

  * Visual indicator for selected range

* **Today Highlight:** Circle or underline for current date

* **Week Numbers** (optional)

**Footer:**

* **Apply button** (primary)

**Interaction Examples:**

**Example 1: Quick Preset**

1. User opens filter for “Hire Date”

2. Selects operator: “Between (fixed)”

3. Clicks preset: “Last 30 days”

4. Clicks Apply

5. Filter chip: Hire Date: Last 30 days

6. Table shows workers hired in last 30 days

**Example 2: Custom Range**

1. User opens filter for “BGC Expiration Date”

2. Selects operator: “Between”

3. Clicks “Start Date” input

4. Calendar opens, user clicks Nov 1, 2025

5. Clicks “End Date” input

6. Calendar opens, user clicks Dec 31, 2025

7. Date inputs show: 11/01/2025 \- 12/31/2025

8. Clicks Apply

9. Filter chip: BGC Expiration: Nov 1 \- Dec 31, 2025

10. Table shows workers with BGC expiring in that range

**Example 3: Before Operator**

1. User opens filter for “BGC Expiration Date”

2. Selects operator: “Before”

3. Single date input appears

4. User selects: Nov 30, 2025

5. Clicks Apply

6. Filter chip: BGC Expiration: Before Nov 30, 2025

7. Table shows workers with BGC expiring before that date (expired or expiring soon)

---

### **For Numeric Fields (Phase 2 \- Hours Worked, Balance, Units Completed, etc.)**

**Operators:**

* Equal to (=)

* Not equal to (\!=)

* Greater than (\>)

* Less than (\<)

* Greater than or equal (\>=)

* Less than or equal (\<=)

* Between (\>\< with two inputs)

* Not between

**Input:** Number input fields (validated for numeric entry only)

---

**3\. Filter State Management**

**Filter State Type:**

**type** FilterOperator \=   
  | 'in'   
  | 'not\_in'   
  | 'equal'   
  | 'not\_equal'   
  | 'between'   
  | 'not\_between'  
  | 'gt'   
  | 'lt'   
  | 'gte'   
  | 'lte'

**type** FilterValue \= {  
  id: string *// unique identifier for this filter*  
  field: string *// column name*  
  operator: FilterOperator  
  values: string\[\] | number\[\] | DateRange  
  mode?: 'include' | 'exclude' *// for categorical fields*  
  displayLabel: string *// for filter chip display*  
}

**type** DateRange \= {  
  start: Date  
  end: Date  
}

**type** FilterState \= FilterValue\[\]

**URL Query Params (optional but recommended):** Encode filter state in URL so filters persist across page refreshes and can be shared:

/workers?filters=status:in:active,pending|hire\_date:between:2025-01-01,2025-12-31

---

**4\. Filter Application & Performance**

**Application Behavior:**

* Filters apply on “Apply” button click (NOT instant/live filtering)

* Table shows loading skeleton during filtering

* Result count updates: “Showing 45 of 200 workers”

* Empty state if no results: “No workers match current filters. Try adjusting your filters.”

**Performance Strategy:**

**Client-Side Filtering** (\<500 rows):

* TanStack Table handles filtering in-browser

* Fast, no server roundtrips

* Filter state maintained in React state

**Server-Side Filtering** (500+ rows):

* Convert filter state to Supabase query

* Example conversion:

**let** query \= supabase.from('workers').select('\*')

filters.forEach(filter **\=\>** {  
  **switch**(filter.operator) {  
    **case** 'in':  
      query \= query.in(filter.field, filter.values)  
      **break**  
    **case** 'not\_in':  
      query \= query.not(filter.field, 'in', filter.values)  
      **break**  
    **case** 'between':  
      query \= query.gte(filter.field, filter.values.start)  
                   .lte(filter.field, filter.values.end)  
      **break**  
    **case** 'gt':  
      query \= query.gt(filter.field, filter.values\[0\])  
      **break**  
    *// etc for other operators*  
  }  
})

**const** { data, error } \= **await** query

**Debouncing:**

* Search bars in filter modals debounced (300ms) to avoid excessive filtering during typing

---

**5\. Filter Chip Editing**

**Interaction:**

* User clicks existing filter chip

* Reopens type-specific filter modal with current values pre-populated

* User modifies values

* Clicks Apply

* Filter chip updates with new values

* Table re-filters

**Remove Filter:**

* User clicks X on filter chip

* Confirmation (optional): “Remove Status filter?”

* Filter removed from state

* Table re-filters to show more results

**Clear All Filters:**

* User clicks “Clear All Filters” button

* All filter chips disappear instantly

* Table resets to show all rows

* “Clear All” button disappears

---

**6\. Filter \+ Search Interaction**

**Combined Behavior:**

* Filters and search are **additive** (AND logic)

* Example:

  * Filter: Status \= Active, Pending

  * Search: “john”

  * Result: Active OR Pending workers whose name/email/HR ID contains “john”

* Search bar remains visible and functional when filters active

* Search can further narrow filtered results

---

**7\. Bulk Operations \+ Filters**

**Use Case:**

* User filters: Status \= Pending, Country \= US

* Table shows 25 pending US workers

* User selects all 25 (or subset)

* User clicks bulk action: “Update Status to Active”

* Confirmation: “Update status for 25 selected workers?”

* System updates all selected workers

* Table refreshes, filter remains active (now shows 0 results if all changed to active)

---

**8\. Implementation Requirements**

**Component Structure:**

/components/features/tables/  
  FilterBar.tsx   
    \- "Add Filter" button  
    \- Active filter chips  
    \- "Clear All" button  
    
  FieldSelectorModal.tsx  
    \- Step 1: Select which field to filter  
    
  filters/  
    TextFilter.tsx   
      \- For categorical/text fields  
      \- Search, checkboxes, mode selector  
      
    DateFilter.tsx  
      \- For date fields  
      \- Presets, calendar, range inputs  
      
    NumberFilter.tsx  
      \- For numeric fields  
      \- Operator dropdown, number inputs  
    
  ActiveFilterChip.tsx  
    \- Removable chip component  
    \- Click to edit, X to remove

**TanStack Table Integration:**

*// In table component*  
**const** \[columnFilters, setColumnFilters\] \= useState\<ColumnFiltersState\>(\[\])

**const** table \= useReactTable({  
  data,  
  columns,  
  state: {  
    columnFilters,  
  },  
  onColumnFiltersChange: setColumnFilters,  
  getCoreRowModel: getCoreRowModel(),  
  getFilteredRowModel: getFilteredRowModel(), *// client-side*  
  *// OR use manual filtering for server-side*  
  manualFiltering: **true**,  
})

**Supabase Query Integration:**

* Build query dynamically based on filter state

* Ensure proper type casting (date strings to timestamps, etc.)

* Handle null values explicitly

* Return total count for “X of Y” display

---

### **3.5 CSV Bulk Upload System**

**Location:** Workers page → “Bulk Upload” button

**Modal Layout:**

**Header:**

* Title: “Bulk Upload Workers”

* Subtitle: “Upload a CSV file to add multiple workers at once”

* Close (X) button

**Step 1: Template Download**

* **“Download CSV Template” button** (secondary)

* Generates CSV with proper column headers:

* hr\_id,full\_name,engagement\_model,email\_personal,email\_pph,country\_residence,locale\_primary,hire\_date,status  
  HR-2025-001,John Doe,core,john@email.com,john@pph.com,US,en,2025-01-15,pending

* Template includes one example row with proper formatting

**Step 2: File Upload**

* **File input** (drag-and-drop zone OR click to browse)

* Accept: .csv files only

* Visual feedback when file hovering over drop zone

* Shows selected filename after upload

**Step 3: Validation (Client-Side)**

Immediately after file selected:

1. **Parse CSV** using papaparse library

2. **Validate schema:**

   * Check all required columns present

   * No extra unknown columns

3. **Validate each row:**

   * Required fields not empty

   * Email format valid (email\_personal, email\_pph)

   * Engagement model is valid enum value

   * Status is valid enum value

   * Country is 2-letter ISO code

   * Date format is correct (YYYY-MM-DD)

   * HR ID doesn’t already exist (query Supabase)

   * Email doesn’t already exist (query Supabase)

**Step 4: Validation Results Display**

**If errors found:**

* **Error Summary Card:**

  * “X rows have errors”

  * “Y rows are valid and ready to import”

* **Error Details Table:**

  * Columns: Row \#, Field, Error Message

  * Example rows:

    * Row 5, email\_personal, “Invalid email format”

    * Row 12, hr\_id, “HR ID already exists”

    * Row 18, engagement\_model, “Invalid value ‘contractor’ (must be: core, upwork, external, internal)”

* **Actions:**

  * “Download Error Report” button (CSV with error details)

  * “Fix and Re-upload” button (clears current file, returns to upload step)

**If all valid:**

* **Success Card:**

  * “✓ All X rows validated successfully”

  * **Preview Table:** Shows first 5 rows of validated data

  * Columns: HR ID, Name, Email, Status, Engagement Model

  * “…and Y more rows” text below table

* **Actions:**

  * “Cancel” button (closes modal)

  * “Confirm Import” button (primary, enabled)

**Step 5: Import Execution**

When “Confirm Import” clicked:

1. **Progress Indicator:**

   * Modal shows: “Importing workers…”

   * Progress bar: “Importing 1 of 50…”

   * Spinner animation

2. **Batch Insert to Supabase:**

   * Insert workers in batches of 10 to 20 (avoid timeouts)

   * Handle partial failures gracefully:

     * If row fails due to race condition (duplicate email created between validation and insert):

       * Log error

       * Continue with remaining rows

       * Report failures at end

3. **Completion:**

   * **Success:** “✓ Successfully imported 48 of 50 workers”

   * **Partial Success:** “⚠️ Imported 45 of 50 workers. 5 rows failed due to conflicts.”

     * Show failed rows in table

     * Option to download failed rows CSV

   * **Complete Failure:** “✗ Import failed. No workers were added.”

     * Show error message

4. **Actions:**

   * “Done” button → closes modal, refreshes worker list

**Edge Cases:**

* **Empty CSV:** “CSV file is empty. Please upload a file with at least one worker.”

* **Wrong file type:** “Invalid file type. Please upload a .csv file.”

* **Corrupted CSV:** “Unable to parse CSV. Please check file formatting.”

* **Too many rows:** “CSV contains 1000 rows. Maximum 500 rows per upload. Please split into multiple files.”

---

### **3.6 Form Validation Patterns**

**All forms use:**

* **React Hook Form** for form state management

* **Zod** for schema validation

* **Shadcn Form components** for UI consistency

**Validation Timing:**

* Real-time validation on blur

* Submit-time validation (comprehensive)

* Async validation for uniqueness checks (email, HR ID) debounced

**Example Zod Schema:**

**const** workerSchema \= z.object({  
  hr\_id: z.string().min(1, 'HR ID required'),  
  full\_name: z.string().min(2, 'Name must be at least 2 characters'),  
  email\_personal: z.string().email('Invalid email'),  
  email\_pph: z.string().email('Invalid email').optional().or(z.literal('')),  
  engagement\_model: z.enum(\['core', 'upwork', 'external', 'internal'\]),  
  country\_residence: z.string().length(2, 'Must be ISO country code'),  
  locale\_primary: z.string().min(2, 'Primary locale required'),  
  hire\_date: z.date(),  
  bgc\_expiration\_date: z.date().optional(),  
  status: z.enum(\['pending', 'active', 'inactive', 'terminated'\]),  
  supervisor\_id: z.string().uuid().optional(),  
})

**Error Display:**

* Inline errors below form fields (red text)

* Error icon in field (if supported by Shadcn)

* Summary error toast on submit failure

* Field highlighting (red border) when error

---

## **4\. Technical Implementation**

### **4.1 Technology Stack**

**Frontend:**

* **Framework:** Vite \+ React 18

* **Language:** TypeScript (strict mode)

* **Routing:** React Router v6

* **UI Components:** Shadcn UI (Radix UI primitives \+ Tailwind)

* **Styling:** Tailwind CSS (utility-first, core classes only)

* **Forms:** React Hook Form \+ Zod validation

* **Data Tables:** TanStack Table (React Table v8)

* **HTTP Client:** Supabase JavaScript client

* **CSV Parsing:** papaparse

* **Date Handling:** date-fns

**Backend:**

* **Database:** PostgreSQL (via Supabase)

* **Authentication:** Supabase Auth

* **API:** Supabase auto-generated REST API \+ Realtime subscriptions

* **Security:** Row Level Security (RLS) policies

**Development:**

* **IDE:** Cursor (AI-assisted development)

* **Version Control:** Git \+ GitHub

* **Environment Management:** .env files (Vite prefix: VITE\_)

**Deployment:**

* **Hosting:** AWS Amplify (integrated CI/CD, automatic builds from GitHub)

* **Build:** npm run build → dist/ folder

* **CI/CD:** Built-in with Amplify (automatic deployments on push to main, preview environments for branches)

---

### **4.2 Project Structure**

pph-connect/  
├── src/  
│   ├── App.tsx (main app component, router config)  
│   ├── main.tsx (entry point)  
│   ├── index.css (global styles, Tailwind imports)  
│   │  
│   ├── components/  
│   │   ├── ui/ (Shadcn components \- never modify)  
│   │   │   ├── button.tsx  
│   │   │   ├── table.tsx  
│   │   │   ├── dialog.tsx  
│   │   │   ├── form.tsx  
│   │   │   └── ... (other Shadcn components)  
│   │   │  
│   │   ├── layout/  
│   │   │   ├── Sidebar.tsx  
│   │   │   ├── Header.tsx  
│   │   │   ├── ProtectedRoute.tsx  
│   │   │   └── MainLayout.tsx  
│   │   │  
│   │   └── features/  
│   │       ├── workers/  
│   │       │   ├── WorkerList.tsx  
│   │       │   ├── WorkerDetail.tsx  
│   │       │   ├── WorkerForm.tsx  
│   │       │   ├── WorkerBulkUpload.tsx  
│   │       │   ├── WorkerAccountsTab.tsx  
│   │       │   ├── WorkerProjectsTab.tsx  
│   │       │   └── AccountReplacementModal.tsx  
│   │       │  
│   │       ├── projects/  
│   │       │   ├── ProjectList.tsx  
│   │       │   ├── ProjectDetail.tsx  
│   │       │   ├── ProjectForm.tsx  
│   │       │   ├── ProjectTeamsTab.tsx  
│   │       │   └── ProjectWorkersTab.tsx  
│   │       │  
│   │       ├── teams/  
│   │       │   ├── TeamList.tsx  
│   │       │   ├── TeamDetail.tsx  
│   │       │   └── TeamForm.tsx  
│   │       │  
│   │       ├── departments/  
│   │       │   ├── DepartmentList.tsx  
│   │       │   └── DepartmentForm.tsx  
│   │       │  
│   │       └── tables/  
│   │           ├── FilterBar.tsx  
│   │           ├── FieldSelectorModal.tsx  
│   │           ├── ActiveFilterChip.tsx  
│   │           └── filters/  
│   │               ├── TextFilter.tsx  
│   │               ├── DateFilter.tsx  
│   │               └── NumberFilter.tsx  
│   │  
│   ├── pages/  
│   │   ├── LoginPage.tsx  
│   │   ├── DashboardPage.tsx  
│   │   ├── WorkersPage.tsx  
│   │   ├── ProjectsPage.tsx  
│   │   ├── TeamsPage.tsx  
│   │   └── DepartmentsPage.tsx  
│   │  
│   ├── lib/  
│   │   ├── supabase/  
│   │   │   ├── client.ts (Supabase client initialization)  
│   │   │   └── auth.ts (auth helper functions)  
│   │   │  
│   │   ├── validations/  
│   │   │   ├── worker.ts (Zod schemas for worker forms)  
│   │   │   ├── project.ts  
│   │   │   └── team.ts  
│   │   │  
│   │   └── utils/  
│   │       ├── helpers.ts (general utility functions)  
│   │       ├── bgc.ts (BGC expiration logic)  
│   │       ├── date.ts (date formatting helpers)  
│   │       └── csv.ts (CSV parsing/generation helpers)  
│   │  
│   ├── hooks/  
│   │   ├── useAuth.tsx (auth state hook)  
│   │   ├── useWorkers.tsx (workers data fetching)  
│   │   ├── useProjects.tsx  
│   │   └── useFilterState.tsx (filter state management)  
│   │  
│   ├── contexts/  
│   │   └── AuthContext.tsx (authentication context provider)  
│   │  
│   └── types/  
│       ├── database.ts (generated from Supabase schema)  
│       ├── index.ts (custom TypeScript types)  
│       └── filters.ts (filter state types)  
│  
├── public/ (static assets)  
│  
├── scripts/  
│   └── setup-database.ts (automated schema creation script)  
│  
├── .env (environment variables \- not committed)  
├── .env.example (template for environment variables)  
├── vite.config.ts (Vite configuration)  
├── tsconfig.json (TypeScript configuration)  
├── tailwind.config.js (Tailwind configuration)  
├── package.json (dependencies)  
└── README.md (project documentation)

---

### **4.3 Code Quality Standards**

**TypeScript:**

* ✅ Strict mode enabled

* ✅ No any types (use unknown \+ type guards if necessary)

* ✅ Explicit return types on functions

* ✅ Interfaces for all data structures

* ✅ Enums for fixed value sets

**React:**

* ✅ Functional components only (no class components)

* ✅ Proper use of hooks (useState, useEffect, useMemo, useCallback)

* ✅ Component files \<200 lines (split if larger)

* ✅ Props interfaces defined above component

* ✅ React.memo for expensive list items

**Styling:**

* ✅ Tailwind utility classes only (no custom CSS)

* ✅ Consistent spacing scale (4, 8, 12, 16, 24, 32, 48px)

* ✅ Color palette from Shadcn/Tailwind defaults

* ✅ Responsive design (mobile-acceptable, desktop-optimized)

**Error Handling:**

* ✅ Try-catch on all async operations

* ✅ User-friendly error messages (no technical jargon in UI)

* ✅ Toast notifications for success/error feedback

* ✅ Console.error for debugging (not console.log in production)

* ✅ Error boundaries at page level

**Performance:**

* ✅ Debounce search inputs (300ms)

* ✅ Pagination/virtualization for large lists (\>100 rows)

* ✅ React.memo for list items

* ✅ useMemo for expensive calculations

* ✅ Lazy load routes with React.lazy \+ Suspense

**Naming Conventions:**

* ✅ camelCase: variables, functions

* ✅ PascalCase: components, types, interfaces

* ✅ SCREAMING\_SNAKE\_CASE: constants

* ✅ Descriptive names (no single letters except loop indices)

**Comments:**

* ✅ JSDoc for complex functions

* ✅ Inline comments for non-obvious business logic

* ✅ No redundant comments (code should be self-documenting)

---

### **4.4 Deployment Strategy**

**Build Process:**

npm run build
*\# Creates optimized production build in dist/*

**AWS Amplify Setup:**

1. Connect GitHub repository to AWS Amplify

2. Amplify auto-detects Vite configuration

3. Configure build settings:
   * Build command: npm run build
   * Output directory: dist
   * Node version: Latest LTS (18 or 20)

4. Set environment variables in Amplify console:
   * VITE_SUPABASE_URL
   * VITE_SUPABASE_ANON_KEY
   * (Other VITE_ prefixed variables)

5. Enable HTTPS (automatic with Amplify)

6. Configure custom domain (optional)

**Amplify Configuration (amplify.yml - optional):**

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

**Environment Variables:**

* Set in Amplify console (not in .env files for production)

* Vite inlines these at build time (VITE\_ prefix exposed to client)

* Never commit .env files to git

**Cost Estimate:**

* Build minutes: $0.01 per build minute (~5 min/build = $0.05 per deployment)

* Hosting: $0.15 per GB served

* **Typical cost: $5 to $15 per month** (depends on traffic and deployment frequency)

**Deployment Process:**

1. Push code to GitHub (main branch or feature branch)

2. Amplify automatically:
   * Detects push via webhook
   * Runs npm install
   * Runs npm run build
   * Deploys to hosting
   * Provides deployment URL

3. Test deployment URL

4. (Optional) Promote to production if using branch previews

**Branch-Based Deployments:**

* **main branch** → Production environment (custom domain)

* **develop branch** → Staging environment (staging subdomain)

* **feature branches** → Preview environments (unique URLs per PR)

**CI/CD Benefits:**

* Automatic deployments on every push (no manual steps)

* Preview environments for pull requests

* Instant rollback to previous deployments

* Build logs and deployment history

* No need for manual cache invalidation

---

## **5\. Business Logic & Rules**

### **5.1 Worker Status Workflow**

**Valid Transitions:**

pending → active (when RTW approved)  
active ↔ inactive (suspension / reactivation)  
active → terminated (final, irreversible)  
inactive → active (reactivation)

**Invalid Transitions:**

* terminated → any other status (terminated is permanent)

* pending → inactive (must go active first)

* pending → terminated (must go active first)

**UI Enforcement:**

* Status dropdown only shows valid next states

* Confirmation dialog for irreversible changes (terminate)

---

### **5.2 Background Check (BGC) Expiration Logic**

**Rules:**

* BGC Expiring Soon: bgc\_expiration\_date \- today \< 30 days AND \>= 0

* BGC Expired: bgc\_expiration\_date \< today

**Visual Indicators:**

* **Valid:** Green checkmark ✓

* **Expiring Soon:** Yellow warning ⚠️ with tooltip “Expires in X days”

* **Expired:** Red alert ⚠️ with tooltip “Expired X days ago”

**Dashboard Alert:**

* Card showing count of workers with expiring/expired BGC

* Click → filters workers list to show only those workers

---

### **5.3 Account Replacement Workflow**

**Trigger:** User clicks “Replace Account” on current worker account

**Process:**

1. Open confirmation dialog: “Replace \[Platform\] account for \[Worker Name\]?”

2. Form fields:

   * New Account Email (required, validated)

   * New Account ID (required)

   * Reason for Replacement (optional text)

3. On confirm:

   * **Old account:**

     * is\_current \= false

     * deactivated\_at \= now()

     * deactivation\_reason \= \[user input\]

     * status \= 'replaced'

   * **New account:**

     * is\_current \= true

     * activated\_at \= now()

     * status \= 'active'

4. Success toast: “Account replaced successfully”

5. Refresh accounts table showing both old and new

**Constraint Enforcement:** Database unique constraint ensures only one is\_current=true per worker+platform.

---

### **5.4 Worker Assignment Lifecycle**

**Assignment:**

* Manager assigns worker to project via UI

* Creates record in worker\_assignments:

  * assigned\_at \= now()

  * assigned\_by \= current\_user\_id

  * removed\_at \= NULL

**Removal:**

* Manager clicks “Remove Worker from Project”

* Updates existing record:

  * removed\_at \= now()

  * removed\_by \= current\_user\_id

* **Record is NOT deleted** (audit trail preserved)

**Queries:**

* **Current assignments:** WHERE removed\_at IS NULL

* **Full history:** SELECT \* FROM worker\_assignments WHERE worker\_id \= ?

---

### **5.5 Supervisor Hierarchy Validation**

**Rule:** Worker cannot be their own supervisor (no circular references)

**Validation:**

* Frontend: Supervisor dropdown excludes current worker

* Backend (future): Constraint check on insert/update

**Potential Enhancement (Phase 2):**

* Prevent deeper circular references (A supervises B, B supervises C, C supervises A)

* Requires recursive query validation

---

### **5.6 Audit Trail Requirements**

**All tables with mutable data include:**

* created\_at \- timestamp of record creation

* created\_by \- UUID of user who created record

* updated\_at \- timestamp of last update

* updated\_by \- UUID of user who last updated record

**Application Logic:**

* On INSERT: Set created\_at=now(), created\_by=current\_user\_id

* On UPDATE: Set updated\_at=now(), updated\_by=current\_user\_id

**Future Enhancement (Phase 2):**

* Activity log table capturing all changes

* Diff snapshots (old value → new value)

* UI: Activity tab on detail pages showing full change history

---

## **6\. Phase 2 Feature Roadmap**

### **6.1 Work Stats Import & Balance Aggregation**

**Purpose:** Track worker production and calculate earnings

**New Tables:**

* work\_stats \- daily stats per worker account per project

* rates\_payable \- rate cards (locale \+ tier \+ country → rate)

* locale\_mappings \- client locale codes → ISO standardization

**Features:**

* CSV import with ETL (similar to worker bulk upload)

* Stats validation against projects, accounts, dates

* Balance calculation: SUM(earnings) per worker per period

* Invoice preview generation (read-only in Phase 1\)

**UI:**

* Stats page with import button

* Worker detail page → Stats tab (view earnings history)

* Dashboard → Top earners widget

---

### **6.2 Messaging System**

**Purpose:** Internal communications between workers and managers (eliminate Gmail licensing)

**New Tables:**

* messages \- message content

* message\_threads \- conversation grouping

* message\_participants \- who’s in conversation

* message\_groups \- distribution lists (department, team)

**Features:**

* Inbox view (unread count, search, filters)

* Compose message (to individual or group)

* Thread view (conversation history)

* Notifications (in-app badge, email optional)

**UI:**

* Messages link in sidebar

* New message button (floating action button)

* Message detail page with reply functionality

---

### **6.3 Training Materials & Gates**

**Purpose:** Track training completion and gate pass/fail status from Maestro

**New Tables:**

* training\_materials \- documents, videos, links per project

* training\_gates \- pass/fail status per worker per gate

* worker\_training\_access \- which materials worker has access to

**Features:**

* Upload/link training materials to projects

* Worker detail → Training tab showing assigned materials

* Manager can update gate status (passed/failed)

* Gate blocking: Cannot assign to project until required gates passed

**UI:**

* Training page (admin uploads materials)

* Worker detail → Training tab (progress view)

* Project detail → Required Training section

---

### **6.4 Full RBAC (Role-Based Access Control)**

**Purpose:** Granular permissions for different user types

**Roles:**

* **Super Admin** \- Full access (you)

* **Admin** \- Manage workers, projects, teams (cannot manage admins)

* **Manager** \- Manage assigned workers and projects (read-only departments/teams)

* **Team Lead** \- View everything, edit assignments for their team only

* **Worker** \- Self-service view (own profile, assignments, balances \- read-only)

**Implementation:**

* Store roles in Supabase Auth user metadata

* Update RLS policies to check roles instead of hardcoded email

* Role-aware UI (hide/show features based on role)

* User management page (admins can assign roles)

**Worker Self-Service Portal:**

* Separate login area or conditional sidebar based on role

* View own worker profile

* View current assignments

* View balances and invoice history

* View training materials

* Send messages to manager

---

### **6.5 Invoice Generation & Adjustments**

**Purpose:** Generate formal invoices for worker payments

**New Tables:**

* invoices \- invoice header (worker, period, total)

* invoice\_line\_items \- breakdown by project/account

* invoice\_adjustments \- bonuses, deductions with reasons

**Features:**

* Generate invoice preview (sum stats \+ adjustments)

* Manager approves invoice

* Export invoice as PDF

* Track invoice status (draft, submitted, approved, paid)

**UI:**

* Invoices page (list all invoices)

* Worker detail → Invoices tab

* Invoice detail page (line items, adjustments, PDF download)

---

### **6.6 Phase 3: Project Marketplace & Worker Applications**

**Purpose:** Enable workers to discover and apply to available projects, shifting from top-down assignment to worker-driven participation

**New Tables:**

* project\_listings \- public project postings with requirements

* worker\_applications \- worker applications to projects

* worker\_skills \- verified skills and certifications

* skill\_assessments \- assessment results and scores

**Features:**

* Project listing creation with requirements (skills, locales, tiers)

* Worker dashboard showing available projects matching their profile

* Application workflow (apply, review, approve/reject)

* Automated eligibility checking (training gates, skill requirements)

* Application status tracking

* Project capacity management (max workers, current fills)

**UI:**

* Available Projects page (worker view \- browse, filter, apply)

* My Applications page (worker view \- track status)

* Project Applications page (manager view \- review, approve)

* Skill Profile page (worker view \- showcase verified skills)

---

### **6.7 Phase 4: Full Lifecycle Automation & AI Verification**

**Purpose:** Complete end-to-end crowdsourcing platform with automated recruitment, assessment, and lifecycle management

**New Tables:**

* applications \- external contractor applications

* skill\_verifications \- AI assessment results

* performance\_reviews \- automated performance scoring

* capacity\_forecasts \- predictive project demand

* quality\_metrics \- aggregated quality scores per worker per project

* performance\_thresholds \- project-specific minimum performance requirements

* auto\_removals \- audit trail of automated worker removals

**Features:**

* Public application portal for new contractors

* AI-enabled domain knowledge interviews

* Automated background check integration

* Skill verification through AI assessments

* Performance-based tier advancement

* Predictive capacity planning

* Automated project-worker matching recommendations

* Rehire eligibility tracking

**Advanced Capabilities:**

* Natural language job requirements parsing

* Automated worker-project compatibility scoring

* Real-time capacity dashboards

* Contractor performance analytics

* Training pathway recommendations

* Market rate analysis and dynamic pricing

---

### **6.8 Automated QA Engine & Performance Management**

**Purpose:** Continuously monitor worker quality, automatically optimize project assignments, and enforce performance standards without manual intervention

#### *Metric Aggregation & Scoring*

**Comprehensive Metrics Collection:**

* Task completion rate and speed

* Accuracy scores (client feedback, validation checks)

* Rejection and revision rates

* Consistency across time periods

* Adherence to guidelines

* Response time to assignments

* Training assessment scores

* Peer comparison rankings

**Automated Worker Grading:**

* Real-time calculation of composite quality scores per project

* Weighted scoring based on project-specific priorities (speed vs. accuracy)

* Rolling averages (7-day, 30-day, lifetime) for trend analysis

* Percentile ranking within project cohort

* Multi-dimensional scoring (quality, speed, reliability, communication)

#### *Intelligent Project Matching*

**Automated Assignment Optimization:**

* Continuous analysis of worker performance across all metrics

* Machine learning models predict worker success probability per project type

* Automatic recommendation of best-fit projects based on:

  * Historical performance patterns

  * Skill alignment scores

  * Capacity and availability

  * Learning curve projections

  * Complementary skill gaps in existing team

* Priority routing of high-performers to complex/high-value projects

* Developmental project suggestions for improving workers

**Dynamic Capacity Balancing:**

* Real-time project demand forecasting

* Automatic worker reallocation suggestions

* Load balancing across projects to prevent bottlenecks

* Surge capacity alerts and worker mobilization

#### *Performance-Based Enforcement*

**Automated Quality Thresholds:**

* Project-specific minimum performance standards (e.g., 95% accuracy, \<5% rejection rate)

* Grace periods for new workers (learning curve allowance)

* Escalating warnings before removal

**Automatic Worker Removal from Projects:**

* Triggered when performance falls below threshold for sustained period

* Configurable rules: “3 consecutive weeks below 90% accuracy → auto-remove”

* Soft removal (notify and offer retraining) vs. hard removal (immediate)

* Manager override capability (appeal process)

* Full audit trail: why removed, when, what metrics triggered decision

**Automated Notifications:**

* Early warning alerts to workers trending toward removal

* Suggested training or support resources

* Manager notifications of at-risk workers

* Post-removal communication with next steps

**Progressive Action Framework:**

1. **Green Zone (Above threshold):** Full project access, eligible for new assignments

2. **Yellow Zone (Near threshold):** Warning notification, training recommendations, performance improvement plan

3. **Orange Zone (Below threshold \<2 weeks):** Escalated warning, manager review triggered, assignment pause for new projects

4. **Red Zone (Below threshold 2+ weeks):** Automatic removal from project, reassignment to training/easier projects, or offboarding if persistent across projects

#### *Quality Control Dashboard*

**Manager View:**

* Real-time performance heatmap (all workers × all metrics)

* At-risk worker alerts

* Automated removal queue for review/approval

* Override controls for automated decisions

* Performance trend analysis

**Worker Self-Service View:**

* Personal performance scorecard

* Peer comparison (anonymized percentiles)

* Gap analysis (current vs. required for target projects)

* Training recommendations

* Performance history and trends

#### *Continuous Improvement Loop*

**System Learning:**

* Track correlation between worker attributes and project success

* Refine matching algorithms based on outcomes

* Identify leading indicators of performance decline

* Optimize threshold settings per project type

* A/B testing of intervention strategies

**Feedback Integration:**

* Client satisfaction scores feed into worker ratings

* Manager qualitative feedback weighted into composite scores

* Worker appeals tracked to refine automated decision accuracy

* False positive/negative analysis to improve thresholds

---

### **Platform Maturity: From Manual to Fully Autonomous**

**Phase 1 (Current):** Humans assign workers. Manual tracking. Spreadsheet chaos.

**Phase 2:** Humans assign workers. System tracks performance. Basic reporting.

**Phase 3:** Workers apply. Humans approve. System recommends matches.

**Phase 4:** System assigns workers automatically. Humans review and override. Automated quality enforcement.

**Ultimate State:** System manages full lifecycle. Humans set strategy and handle exceptions. Platform operates as autonomous quality-controlled marketplace.

**Reference Implementation Inspirations:**

* **From Crowdgen:** Self-service marketplace mechanics, flexible participation models

* **From Alignerr:** AI-enabled expertise verification, quality-first approach, specialized task workflows

* **QA Engine Innovation:** Automated performance management, intelligent matching, zero-tolerance quality enforcement

---

## **7\. Open Questions & Decisions Needed**

### **7.1 Advanced Filtering Scope**

**Question:** Should advanced filtering be implemented for ALL tables (Workers, Projects, Teams, Departments) or prioritize Workers only for Phase 1?

**Recommendation:** Workers table only for Phase 1\. Projects filtering can be simpler (basic dropdowns). Reduces dev time, focuses on most critical use case.

---

### **7.2 CSV Template Customization**

**Question:** Should CSV template support optional columns or strictly required columns only?

**Current Approach:** Strictly required columns to avoid confusion.

**Alternative:** Support optional columns (e.g., bgc\_expiration\_date, worker\_role) with clear documentation in template.

---

### **7.3 Bulk Operations Scope**

**Question:** Which bulk operations are highest priority?

* Update Status (critical)

* Assign to Project (critical)

* Update Supervisor (medium)

* Export Selected (medium)

* Delete Selected (low \- rarely needed due to soft deletes)

**Recommendation:** Focus on Status and Assign to Project for Phase 1\.

---

### **7.4 Real-Time Updates**

**Question:** Should table data update in real-time (via Supabase Realtime subscriptions) when other users make changes?

**Phase 1 Approach:** Manual refresh (user refreshes page to see changes).

**Phase 2 Enhancement:** Supabase Realtime for collaborative editing scenarios.

---

### **7.5 Mobile Responsiveness Level**

**Question:** How much mobile optimization is needed?

**Current Target:** Desktop-first, mobile-acceptable (can view and perform basic actions on tablet/phone, but optimized for desktop workflow).

**Future:** Dedicated mobile-optimized views if workers need mobile access.

---

## **8\. Success Metrics**

### **8.1 Phase 1 Completion Criteria**

**Must-Have (Phase 1 Complete):**

* ✅ All 7 tables created with proper constraints and RLS

* ✅ Admin can log in with email/password

* ✅ Worker CRUD operations fully functional

* ✅ Worker detail page with Accounts and Projects tabs

* ✅ CSV bulk upload with validation

* ✅ BGC expiration warnings display correctly

* ✅ Project and Team management functional

* ✅ Account replacement workflow working

* ✅ Enterprise-grade tables with advanced filtering on Workers

* ✅ No critical bugs (data loss, auth bypass, etc.)

**Nice-to-Have (Quick Enhancements):**

* Advanced filtering on Projects and Teams tables

* Dashboard with real summary data (not hardcoded)

* Bulk operations beyond status updates

* Column visibility toggles on tables

---

### **8.2 User Acceptance Criteria**

**Admin User Can:**

* Add 50 workers via CSV bulk upload in under 5 minutes

* Find specific worker via search or filters in under 30 seconds

* View full account history for compliance audit

* Assign 10 workers to a project in under 2 minutes (bulk action)

* See which workers have expiring BGC at a glance (dashboard alert)

* Replace malfunctioning worker account without data loss

**System Performance:**

* Worker list loads in under 2 seconds (100 workers)

* Filtering 100 workers takes under 1 second (client-side)

* CSV upload of 50 workers completes in under 30 seconds

* Page navigation feels instant (under 500ms)

---

### **8.3 Business Impact Metrics**

**Immediate (Initial Weeks):**

* Time to onboard new worker: \<5 minutes (vs 30+ minutes in spreadsheets)

* Active users: Admin \+ 2 to 3 managers

* Workers tracked: 50 to 100

**Short Term (First Quarter):**

* Gmail licensing cost savings: $X/month (by using built-in messaging)

* Time saved on manual data entry: X hours/week

* Workers tracked: 100 to 200

**Medium Term (Second Quarter Onward):**

* Stats import automated (replaces manual reconciliation)

* Invoice generation time reduced by Y%

* Workers tracked: 200 to 500

---

## **Appendix A: Environment Variables**

*\# .env.example*

*\# Supabase Configuration*  
VITE\_SUPABASE\_URL\=https://cntkpxsjvnuubrbzzeqk.supabase.co  
VITE\_SUPABASE\_ANON\_KEY\=your\_anon\_key\_here  
VITE\_SUPABASE\_SERVICE\_ROLE\_KEY\=your\_service\_role\_key\_here

*\# Application Configuration (optional)*  
VITE\_APP\_NAME\=PPH Connect  
VITE\_APP\_VERSION\=1.0.0  
VITE\_SUPPORT\_EMAIL\=[support@productiveplayhouse.com](mailto:support@productiveplayhouse.com) (suggested)

**Security Notes:**

* .env file must be added to .gitignore (never commit)

* Service role key should only be used server-side (not exposed in client bundle)

* Rotate keys if accidentally exposed

---

## **Appendix B: Common Supabase Queries**

### **B.1 Fetch Workers with Current Account**

**const** { data: workers, error } \= **await** supabase  
  .from('workers')  
  .select(\`  
    \*,  
    supervisor:workers\!supervisor\_id(id, full\_name),  
    current\_account:worker\_accounts\!inner(  
      worker\_account\_email,  
      platform\_type  
    )  
  \`)  
  .eq('worker\_accounts.is\_current', **true**)  
  .order('created\_at', { ascending: **false** })

---

### **B.2 Fetch Worker with All Relationships**

**const** { data: worker, error } \= **await** supabase  
  .from('workers')  
  .select(\`  
    \*,  
    supervisor:workers\!supervisor\_id(id, full\_name),  
    accounts:worker\_accounts(\*),  
    assignments:worker\_assignments(  
      \*,  
      project:projects(  
        id,  
        project\_code,  
        project\_name,  
        status  
      ),  
      assigned\_by\_user:workers\!assigned\_by(full\_name)  
    )  
  \`)  
  .eq('id', workerId)  
  .single()

---

### **B.3 Insert Worker with Audit Trail**

**const** { data, error } \= **await** supabase  
  .from('workers')  
  .insert({  
    hr\_id: 'HR-2025-001',  
    full\_name: 'John Doe',  
    email\_personal: 'john@example.com',  
    status: 'pending',  
    created\_by: currentUserId, *// from auth context*  
    created\_at: **new** Date().toISOString(),  
    *// ... other fields*  
  })  
  .select()  
  .single()

---

### **B.4 Apply Filters with Supabase Query**

**let** query \= supabase.from('workers').select('\*')

*// Example: Status filter (IN operator)*  
**if** (statusFilter) {  
  query \= query.in('status', statusFilter.values) *// \['active', 'pending'\]*  
}

*// Example: Date range filter (BETWEEN)*  
**if** (hireDateFilter) {  
  query \= query  
    .gte('hire\_date', hireDateFilter.values.start)  
    .lte('hire\_date', hireDateFilter.values.end)  
}

*// Example: Text search (ILIKE)*  
**if** (searchTerm) {  
  query \= query.or(  
    \`full\_name.ilike.%${searchTerm}%,\` \+  
    \`hr\_id.ilike.%${searchTerm}%,\` \+  
    \`email\_personal.ilike.%${searchTerm}%\`  
  )  
}

**const** { data, error } \= **await** query

---

## **Appendix C: Glossary**

**BGC:** Background Check \- verification process for worker eligibility

**CRM:** Customer Relationship Management \- design pattern for contextual data display

**CRUD:** Create, Read, Update, Delete \- basic data operations

**CSV:** Comma-Separated Values \- file format for bulk data import/export

**ETL:** Extract, Transform, Load \- data processing pipeline

**RBAC:** Role-Based Access Control \- permission system based on user roles

**RLS:** Row Level Security \- database-level access control

**RTW:** Ready To Work \- approval status indicating worker can begin assignments

**SPA:** Single Page Application \- web app that loads once and updates dynamically

**UUID:** Universally Unique Identifier \- 128-bit identifier for database records

---

## **Document Change Log**

| Version | Date | Author | Changes |
| :---- | :---- | :---- | :---- |
| 1.0 | Oct 30, 2025 | Maxim Stockschlader | Initial comprehensive specification |

---

**End of Specification Document**