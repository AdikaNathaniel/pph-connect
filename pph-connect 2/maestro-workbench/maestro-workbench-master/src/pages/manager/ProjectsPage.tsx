import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle } from 'lucide-react';
import ProjectsTable, { type ProjectRow, type ProjectsTableFilters } from './ProjectsTable';
import AddProjectModal from '@/components/project/AddProjectModal';

type FilterOption = {
  value: string;
  label: string;
};

type ProjectsTableData = {
  rows: ProjectRow[];
  total: number;
};

export const ProjectsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [projects, setProjects] = useState<ProjectsTableData>({ rows: [], total: 0 });
  const [activeFilters, setActiveFilters] = useState<ProjectsTableFilters>({
    departmentIds: [],
    statuses: [],
    teamIds: [],
    expertTiers: []
  });
  const [isAddModalOpen, setAddModalOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      // Placeholder loading logic; replace with Supabase query once API is ready.
      await new Promise((resolve) => setTimeout(resolve, 150));
      const mockRows: ProjectRow[] = [
        {
          id: 'atlas',
          project_code: 'ATL-001',
          project_name: 'Project Atlas',
          department_id: 'dept-ai',
          department_name: 'AI Services',
          department_code: 'AI',
          teams: [
            { id: 'team-data', name: 'Data Labeling' },
            { id: 'team-qa', name: 'Quality Assurance' }
          ],
          status: 'active',
          status_label: 'Active',
          expert_tier: 'Tier 1',
          start_date: '2024-01-01',
          end_date: null,
          worker_count: 42
        },
        {
          id: 'beacon',
          project_code: 'BCN-204',
          project_name: 'Project Beacon',
          department_id: 'dept-ops',
          department_name: 'Operations',
          department_code: 'OPS',
          teams: [{ id: 'team-support', name: 'Support Ops' }],
          status: 'paused',
          status_label: 'Paused',
          expert_tier: 'Tier 2',
          start_date: '2023-08-15',
          end_date: '2024-06-30',
          worker_count: 18
        }
      ];
      setProjects({ rows: mockRows, total: mockRows.length });
      setProjectCount(mockRows.length);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchProjects().catch(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [fetchProjects]);

  useEffect(() => {
    setActiveFilters({
      departmentIds: departmentFilter === 'all' ? [] : [departmentFilter],
      statuses: statusFilter === 'all' ? [] : [statusFilter],
      teamIds: teamFilter === 'all' ? [] : [teamFilter],
      expertTiers: tierFilter === 'all' ? [] : [tierFilter]
    });
  }, [departmentFilter, statusFilter, teamFilter, tierFilter]);

  const departmentOptions = useMemo<FilterOption[]>(
    () => [
      { value: 'all', label: 'All departments' },
      { value: 'dept-ai', label: 'AI Services' },
      { value: 'dept-ops', label: 'Operations' }
    ],
    []
  );

  const statusOptions = useMemo<FilterOption[]>(
    () => [
      { value: 'all', label: 'All statuses' },
      { value: 'active', label: 'Active' },
      { value: 'paused', label: 'Paused' },
      { value: 'archived', label: 'Archived' }
    ],
    []
  );

  const teamOptions = useMemo<FilterOption[]>(
    () => [
      { value: 'all', label: 'All teams' },
      { value: 'team-data', label: 'Data Labeling' },
      { value: 'team-qa', label: 'Quality Assurance' },
      { value: 'team-support', label: 'Support Ops' }
    ],
    []
  );

  const tierOptions = useMemo<FilterOption[]>(
    () => [
      { value: 'all', label: 'All tiers' },
      { value: 'Tier 1', label: 'Tier 1' },
      { value: 'Tier 2', label: 'Tier 2' },
      { value: 'Tier 3', label: 'Tier 3' }
    ],
    []
  );
  const tableFilters = useMemo<ProjectsTableFilters>(() => activeFilters, [activeFilters]);

  return (
    <div className="space-y-6" data-testid="projects-page">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight" data-testid="projects-page-title">
              Projects
            </h1>
            {projectCount !== null ? (
              <Badge variant="outline">{projectCount} total</Badge>
            ) : null}
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Monitor project health, manage staffing coverage, and launch new engagements from a single view.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2" data-testid="projects-page-actions">
          <Button variant="outline">Export CSV</Button>
          <Button onClick={() => setAddModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Input
            type="search"
            placeholder="Search by project code or name..."
            className="md:max-w-sm"
            data-testid="projects-page-search"
          />
          <div className="flex flex-wrap items-center gap-2" data-testid="projects-page-filters">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]" data-testid="projects-filter-department">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]" data-testid="projects-filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-[160px]" data-testid="projects-filter-team">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                {teamOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-[160px]" data-testid="projects-filter-tier">
                <SelectValue placeholder="Expert tier" />
              </SelectTrigger>
              <SelectContent>
                {tierOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ProjectsTable
          data={projects.rows}
          totalCount={projects.total}
          isLoading={isLoading}
          filters={tableFilters}
        />
      </section>
      <AddProjectModal
        open={isAddModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={fetchProjects}
      />
    </div>
  );
};

export default ProjectsPage;
