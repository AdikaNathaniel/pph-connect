# Projects & Teams Status

This note captures how project and team management operates in Maestro Workbench.

## Projects Page

- Route `/m/projects` renders `ProjectsPage`, which loads data with `supabase.from('projects').select('id, project_code, project_name, status, required_qualifications, teams:project_teams(id, team_id, team:teams(id, team_name))')`.
- Table actions let managers view details, adjust visibility via `ProjectVisibilityPanel`, and assign workers using `AssignToProjectModal`.
- Filters (status, tier, department) are driven by local state and `useProjects` hook to keep Supabase queries lean.

## Teams Page

- Route `/m/teams` renders `TeamsPage`, querying `supabase.from('teams').select('id, team_name, department:departments(*), leads:team_leads(*), members:worker_assignments(id, worker:workers(full_name, status))')`.
- Inline actions open `TeamDetail` for membership edits, and CSV exports reuse the data set so rosters can be shared outside the app.
- Both pages share a `useTeams` hook that caches department/locale filters and dedupes Supabase calls.

## Detail Views

- `ProjectDetail` shows staffing, required qualifications, marketplaces listings, and training readiness. It hydrates `worker_assignments`, `project_listings`, `required_qualifications`, and `training_gates` to give managers a single control panel.
- `TeamDetail` displays supervisors, roster, open seats, and background-check badges for each member; it joins `worker_assignments`, `workers`, and `projects` to summarize current workload.

## Modals & Actions

- `AssignToProjectModal` lets managers bulk-assign available workers: it lists `workers` filtered by locale/tier and writes to `worker_assignments` on confirmation.
- `ProjectVisibilityPanel` toggles marketplace exposure by updating `project_listings` rows and storing audit metadata.
- Removals use `RemoveAssignmentModal`, which updates `worker_assignments.removed_at` and logs events for the offboarding workflow.

These features satisfy “Projects and Teams management functional” by covering list views, detail pages, and the modals that manage membership/visibility.
