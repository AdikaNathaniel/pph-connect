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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Pencil, Power } from 'lucide-react';

export type TeamRow = {
  id: string;
  team_name: string;
  department_id?: string | null;
  department_name?: string | null;
  department_code?: string | null;
  primary_locale?: string | null;
  secondary_locale?: string | null;
  region?: string | null;
  is_active: boolean;
};

type TeamTableState = {
  rows: TeamRow[];
};

const mockTeams: TeamRow[] = [
  {
    id: 'team-data',
    team_name: 'Data Labeling',
    department_id: 'dept-ai',
    department_name: 'AI Services',
    department_code: 'AI',
    primary_locale: 'en-US',
    secondary_locale: 'es-MX',
    region: 'North America',
    is_active: true
  },
  {
    id: 'team-quality',
    team_name: 'Quality Assurance',
    department_id: 'dept-ops',
    department_name: 'Operations',
    department_code: 'OPS',
    primary_locale: 'en-GB',
    secondary_locale: null,
    region: 'EMEA',
    is_active: true
  },
  {
    id: 'team-support',
    team_name: 'Support Ops',
    department_id: 'dept-ops',
    department_name: 'Operations',
    department_code: 'OPS',
    primary_locale: 'fil-PH',
    secondary_locale: null,
    region: 'APAC',
    is_active: false
  }
];

export const TeamsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [teams, setTeams] = useState<TeamTableState>({ rows: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('active');
  const [isAddModalOpen, setAddModalOpen] = useState(false);

  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      setTeams({ rows: mockTeams });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams().catch((error) => {
      console.error('Failed to fetch teams', error);
      setIsLoading(false);
    });
  }, [fetchTeams]);

  const departmentOptions = useMemo(
    () => [
      { value: 'all', label: 'All departments' },
      { value: 'dept-ai', label: 'AI Services' },
      { value: 'dept-ops', label: 'Operations' }
    ],
    []
  );

  const filteredTeams = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return teams.rows.filter((team) => {
      if (departmentFilter !== 'all' && team.department_id !== departmentFilter) {
        return false;
      }

      if (activeFilter === 'active' && !team.is_active) {
        return false;
      }

      if (activeFilter === 'inactive' && team.is_active) {
        return false;
      }

      if (query.length === 0) {
        return true;
      }

      const departmentLabel = team.department_name
        ? `${team.department_name}${team.department_code ? ` (${team.department_code})` : ''}`
        : '';

      return (
        team.team_name.toLowerCase().includes(query) ||
        team.primary_locale?.toLowerCase().includes(query) ||
        team.secondary_locale?.toLowerCase().includes(query) ||
        departmentLabel.toLowerCase().includes(query)
      );
    });
  }, [teams.rows, searchTerm, departmentFilter, activeFilter]);

  return (
    <div className="space-y-6" data-testid="teams-page">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight" data-testid="teams-page-title">
            Teams
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage staffing teams, monitor their geographic coverage, and adjust availability as projects evolve.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2" data-testid="teams-page-actions">
          <Button variant="outline">Export CSV</Button>
          <Button onClick={() => setAddModalOpen(true)}>
            + Add Team
          </Button>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by team name, locale, or department..."
            className="md:max-w-sm"
            data-testid="teams-page-search"
          />
          <div className="flex flex-wrap items-center gap-2" data-testid="teams-page-filters">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[200px]" data-testid="teams-filter-department">
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
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-[160px]" data-testid="teams-filter-active">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border border-border/60" data-testid="teams-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Primary Locale</TableHead>
                <TableHead>Secondary Locale</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Active Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    No teams match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeams.map((team) => {
                  const departmentLabel = team.department_name
                    ? `${team.department_name}${team.department_code ? ` (${team.department_code})` : ''}`
                    : 'Unassigned';

                  return (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium text-foreground">
                        <span className="text-primary underline-offset-4 hover:underline cursor-pointer">
                          {team.team_name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{departmentLabel}</Badge>
                      </TableCell>
                      <TableCell>{team.primary_locale ?? '—'}</TableCell>
                      <TableCell>{team.secondary_locale ?? '—'}</TableCell>
                      <TableCell>{team.region ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={team.is_active}
                            onCheckedChange={() => {
                              setTeams((current) => ({
                                rows: current.rows.map((row) =>
                                  row.id === team.id ? { ...row, is_active: !row.is_active } : row
                                )
                              }));
                            }}
                            data-testid="teams-table-active-toggle"
                            aria-label={`Toggle active status for ${team.team_name}`}
                          />
                          <span className="text-sm text-muted-foreground">
                            {team.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Team actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Team
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Power className="mr-2 h-4 w-4" />
                              {team.is_active ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Placeholder modal wiring */}
      {isAddModalOpen ? (
        <div className="hidden" aria-hidden="true">
          {/* AddTeamModal will mount here in a future task */}
          <button type="button" onClick={() => setAddModalOpen(false)}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default TeamsPage;
