import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { MoreHorizontal, Eye, Layers, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import DepartmentForm from '@/components/department/DepartmentForm';
import type { DepartmentFormValues } from '@/types/app';
import PageErrorBoundary from '@/components/errors/PageErrorBoundary';

export type DepartmentRow = {
  id: string;
  department_name: string;
  department_code: string;
  teams_count: number;
  projects_count: number;
  is_active: boolean;
};

type DepartmentsTableState = {
  rows: DepartmentRow[];
};

const mockDepartments: DepartmentRow[] = [
  {
    id: 'dept-ai',
    department_name: 'AI Services',
    department_code: 'AI',
    teams_count: 4,
    projects_count: 6,
    is_active: true
  },
  {
    id: 'dept-ops',
    department_name: 'Operations',
    department_code: 'OPS',
    teams_count: 5,
    projects_count: 3,
    is_active: true
  },
  {
    id: 'dept-training',
    department_name: 'Training & QA',
    department_code: 'TQA',
    teams_count: 2,
    projects_count: 1,
    is_active: false
  }
];

export const DepartmentsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<DepartmentsTableState>({ rows: [] });
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const handleCreateDepartment = useCallback(async (values: DepartmentFormValues) => {
    console.info('Department submitted', values);
    setAddModalOpen(false);
  }, []);

  const handleCancelDepartment = useCallback(() => {
    setAddModalOpen(false);
  }, []);

  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      setDepartments({ rows: mockDepartments });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments().catch((error) => {
      console.error('Failed to fetch departments', error);
      setIsLoading(false);
    });
  }, [fetchDepartments]);

  const tableRows = useMemo(() => departments.rows, [departments.rows]);

  return (
    <PageErrorBoundary>
    <div className="space-y-6" data-testid="departments-page">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight" data-testid="departments-page-title">
            Departments
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage organizational departments, monitor staffing coverage, and review project usage.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2" data-testid="departments-page-actions">
          <Button variant="outline">Export CSV</Button>
          <Button onClick={() => setAddModalOpen(true)}>
            + Add Department
          </Button>
        </div>
      </header>

      <section>
        <div className="rounded-md border border-border/60" data-testid="departments-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Teams Count</TableHead>
                <TableHead>Projects Count</TableHead>
                <TableHead>Active Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    Loading departments…
                  </TableCell>
                </TableRow>
              ) : tableRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No departments available. Use &ldquo;Add Department&rdquo; to create your first entry.
                  </TableCell>
                </TableRow>
              ) : (
                tableRows.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell className="font-medium">
                      <span className="text-primary underline-offset-4 hover:underline cursor-pointer">
                        {department.department_name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{department.department_code}</Badge>
                    </TableCell>
                    <TableCell>{department.teams_count}</TableCell>
                    <TableCell>{department.projects_count}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={department.is_active}
                          onCheckedChange={() => {
                            setDepartments((current) => ({
                              rows: current.rows.map((row) =>
                                row.id === department.id ? { ...row, is_active: !row.is_active } : row
                              )
                            }));
                          }}
                          data-testid="departments-table-active-toggle"
                          aria-label={`Toggle active status for ${department.department_name}`}
                        />
                        <span className="text-sm text-muted-foreground">
                          {department.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Department actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Department
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Layers className="mr-2 h-4 w-4" />
                            View Teams
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Projects
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            {department.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {isAddModalOpen ? (
        <Card>
          <CardContent className="py-6">
            <DepartmentForm
              mode="create"
              onSubmit={handleCreateDepartment}
              onCancel={handleCancelDepartment}
              isSubmitting={false}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
    </PageErrorBoundary>
  );
};

export default DepartmentsPage;
