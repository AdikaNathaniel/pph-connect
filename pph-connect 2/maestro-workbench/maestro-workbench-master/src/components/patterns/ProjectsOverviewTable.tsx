import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Settings2, Search, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from '@/integrations/supabase/client'
import { toast } from "sonner"
import { columns, ProjectOverview } from './projects-overview-columns'
import ProjectEditModal from '@/components/ProjectEditModal'
import ProjectPreviewModal from '@/components/ProjectPreviewModal'
import { Project } from '@/types'

interface ProjectsOverviewTableProps {
  projects?: Project[];
  onRefresh?: () => void;
  onEdit?: (project: Project) => void;
}

export function ProjectsOverviewTable({ projects: externalProjects, onRefresh, onEdit }: ProjectsOverviewTableProps = {}) {
  const [data, setData] = useState<ProjectOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    plugin: false, // Hide plugin column by default
  })
  const [rowSelection, setRowSelection] = useState({})
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; projectId: string | null }>({
    open: false,
    projectId: null
  })
  const [editModal, setEditModal] = useState<{ open: boolean; project: Project | null }>({
    open: false,
    project: null
  })
  const [previewModal, setPreviewModal] = useState<{ open: boolean; project: Project | null }>({
    open: false,
    project: null
  })
  const [projects, setProjects] = useState<Project[]>([])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  // Fetch data once on mount or use external projects
  useEffect(() => {
    if (externalProjects) {
      buildOverviewData(externalProjects);
    } else {
      fetchData();
    }
  }, [externalProjects])

  // Set up event listeners once on mount
  useEffect(() => {
    const handleEdit = async (e: Event) => {
      const projectId = (e as CustomEvent).detail
      // Fetch fresh project data when editing
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      
      if (!error && project) {
        if (onEdit) {
          onEdit(project as Project)
        } else {
          setEditModal({ open: true, project: project as Project })
        }
      }
    }

    const handlePreview = async (e: Event) => {
      const projectId = (e as CustomEvent).detail
      // Fetch fresh project data when previewing
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      
      if (!error && project) {
        setPreviewModal({ open: true, project: project as Project })
      }
    }

    const handleDelete = (e: Event) => {
      const projectId = (e as CustomEvent).detail
      setDeleteDialog({ open: true, projectId })
    }

    const handleUpdateStatus = async (e: Event) => {
      const { id, status } = (e as CustomEvent).detail
      await updateProjectStatus(id, status)
    }

    window.addEventListener('edit-project', handleEdit)
    window.addEventListener('preview-project', handlePreview)
    window.addEventListener('delete-project', handleDelete)
    window.addEventListener('update-project-status', handleUpdateStatus)

    return () => {
      window.removeEventListener('edit-project', handleEdit)
      window.removeEventListener('preview-project', handlePreview)
      window.removeEventListener('delete-project', handleDelete)
      window.removeEventListener('update-project-status', handleUpdateStatus)
    }
  }, [])

  const buildOverviewData = async (projectsData: Project[]) => {
    try {
      setLoading(true);
      setProjects(projectsData);

      // Fetch templates to get plugin names
      const { data: templatesData, error: templatesError } = await supabase
        .from('task_templates')
        .select('id, name, modality');

      if (templatesError) throw templatesError;

      const templatesMap = new Map(
        templatesData?.map(t => [t.id, { name: t.name, modality: t.modality }]) || []
      );

      // Fetch questions data for counts
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, project_id, is_answered, completed_replications, required_replications');

      if (questionsError) throw questionsError;

      // Build overview data
      const overview: ProjectOverview[] = projectsData.map(project => {
        const template = templatesMap.get(project.template_id);
        const projectQuestions = questionsData?.filter(q => q.project_id === project.id) || [];
        
        // Active questions are those that need more answers
        const activeQuestions = projectQuestions.filter(q => 
          !q.is_answered && q.completed_replications < q.required_replications
        ).length;

        return {
          id: project.id,
          name: project.name,
          plugin: template?.name || 'Unknown',
          pluginModality: template?.modality || 'spreadsheet',
          totalQuestions: projectQuestions.length,
          activeQuestions,
          status: project.status as 'active' | 'paused' | 'completed',
          language: project.language || 'Unknown',
          locale: project.locale || 'Unknown',
          created_at: project.created_at,
          due_date: project.due_date,
          completed_tasks: project.completed_tasks || 0,
          total_tasks: project.total_tasks || projectQuestions.length
        };
      });

      setData(overview);
    } catch (error) {
      console.error('Error building projects overview:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch active projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      await buildOverviewData(projectsData || []);
    } catch (error) {
      console.error('Error fetching projects overview:', error);
      toast.error('Failed to load projects');
      setLoading(false);
    }
  };

  const updateProjectStatus = async (projectId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', projectId)

      if (error) throw error

      toast.success(`Project ${status === 'paused' ? 'paused' : 'marked complete'} successfully`)
      if (onRefresh) {
        onRefresh()
      } else {
        fetchData()
      }
    } catch (error) {
      console.error('Error updating project status:', error)
      toast.error('Failed to update project status')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.projectId) return

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', deleteDialog.projectId)

      if (error) throw error

      toast.success('Project deleted successfully')
      setDeleteDialog({ open: false, projectId: null })
      if (onRefresh) {
        onRefresh()
      } else {
        fetchData()
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error('Failed to delete project')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
          <CardDescription>Loading projects...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-1">
          {/* Filters */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-sm">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter projects..."
                    value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                      table.getColumn("name")?.setFilterValue(event.target.value)
                    }
                    className="pl-8"
                  />
                </div>
              </div>
              <Select
                value={(table.getColumn("status")?.getFilterValue() as string) ?? "all"}
                onValueChange={(value) =>
                  table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={(table.getColumn("language")?.getFilterValue() as string) ?? "all"}
                onValueChange={(value) =>
                  table.getColumn("language")?.setFilterValue(value === "all" ? undefined : value)
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  {Array.from(new Set(data.map(p => p.language).filter(Boolean))).map((lang) => (
                    <SelectItem key={lang} value={lang!}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={(table.getColumn("locale")?.getFilterValue() as string) ?? "all"}
                onValueChange={(value) =>
                  table.getColumn("locale")?.setFilterValue(value === "all" ? undefined : value)
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Locale" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locales</SelectItem>
                  {Array.from(new Set(data.map(p => p.locale).filter(Boolean))).map((locale) => (
                    <SelectItem key={locale} value={locale!}>{locale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Settings2 className="mr-2 h-4 w-4" />
                    Customize Columns
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter(
                    (column) =>
                      typeof column.accessorFn !== "undefined" && column.getCanHide()
                  )
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
            <Button asChild>
              <Link to="/m/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} className="h-10 bg-muted/50">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No active projects found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <select
                  className="h-8 w-[70px] rounded-md border border-input bg-background px-2 text-sm"
                  value={table.getState().pagination.pageSize}
                  onChange={(e) => {
                    table.setPageSize(Number(e.target.value))
                  }}
                >
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <option key={pageSize} value={pageSize}>
                      {pageSize}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  Last
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, projectId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              and all associated data including questions, tasks, and assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Modal */}
      <ProjectEditModal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, project: null })}
        project={editModal.project}
        onSaved={onRefresh || fetchData}
      />

      {/* Preview Modal */}
      <ProjectPreviewModal
        isOpen={previewModal.open}
        onClose={() => setPreviewModal({ open: false, project: null })}
        project={previewModal.project}
      />
    </>
  )
}

