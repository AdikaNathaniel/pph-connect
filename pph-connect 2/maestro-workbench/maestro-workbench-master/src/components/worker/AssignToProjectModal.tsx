import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, PlusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type ProjectRecord = {
  id: string;
  project_code: string;
  project_name: string;
  status: string;
  department?: {
    id: string;
    department_name: string;
    department_code: string;
  } | null;
};

export interface AssignToProjectModalProps {
  workerId: string | null;
  existingProjectIds: string[];
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AssignToProjectModal: React.FC<AssignToProjectModalProps> = ({
  workerId,
  existingProjectIds,
  open,
  onClose,
  onSuccess
}) => {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (open) {
      setIsLoading(true);
      supabase.auth
        .getUser()
        .then(({ data }) => {
          if (isMounted) {
            setCurrentUserId(data.user?.id ?? null);
          }
        })
        .catch(() => {
          if (isMounted) {
            setCurrentUserId(null);
          }
        });

      supabase
        .from('projects')
        .select(
          `
          id,
          project_code,
          project_name,
          status,
          department:departments (
            id,
            department_name,
            department_code
          )
        `
        )
        .eq('status', 'active')
        .order('project_name', { ascending: true })
        .then(({ data, error }) => {
          if (!isMounted) {
            return;
          }
          if (error) {
            showErrorToast('Unable to load projects', {
              description: error.message
            });
            setProjects([]);
            setIsLoading(false);
            return;
          }
          setProjects((data as ProjectRecord[]) ?? []);
          setIsLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setProjects([]);
      setSelectedProjectIds([]);
      setDepartmentFilter('all');
      setIsLoading(false);
      setIsSubmitting(false);
    }
  }, [open]);

  const availableProjects = useMemo(
    () => projects.filter((project) => !existingProjectIds.includes(project.id)),
    [projects, existingProjectIds]
  );

  const departments = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    availableProjects.forEach((project) => {
      if (project.department?.id) {
        const label = project.department.department_code
          ? `${project.department.department_name} (${project.department.department_code})`
          : project.department.department_name;
        map.set(project.department.id, { id: project.department.id, label });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [availableProjects]);

  const filteredProjects = useMemo(() => {
    if (departmentFilter === 'all') {
      return availableProjects;
    }
    return availableProjects.filter((project) => project.department?.id === departmentFilter);
  }, [availableProjects, departmentFilter]);

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds((previous) =>
      previous.includes(projectId)
        ? previous.filter((id) => id !== projectId)
        : [...previous, projectId]
    );
  };

  const handleSubmit = async () => {
    if (!workerId) {
      showErrorToast('Unable to assign projects', {
        description: 'Missing worker context. Please reload and try again.'
      });
      return;
    }

    if (selectedProjectIds.length === 0) {
      showInfoToast('Select at least one project', {
        description: 'Use the list to pick projects before confirming.'
      });
      return;
    }

    if (!currentUserId) {
      showErrorToast('Unable to assign projects', {
        description: 'Could not identify the current user. Please try again later.'
      });
      return;
    }

    setIsSubmitting(true);
    const now = new Date().toISOString();

    try {
      const assignments = selectedProjectIds.map((projectId) => ({
        worker_id: workerId,
        project_id: projectId,
        assigned_at: now,
        assigned_by: currentUserId
      }));

      const { error: insertError } = await supabase
        .from('worker_assignments')
        .insert(assignments);

      if (insertError) {
        throw insertError;
      }

      showSuccessToast('Worker assigned to projects', {
        description:
          selectedProjectIds.length === 1
            ? 'The worker now has access to the selected project.'
            : 'The worker now has access to the selected projects.'
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      showErrorToast('Unable to complete assignment', {
        description: error instanceof Error ? error.message : 'Unexpected error occurred.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign worker to projects</DialogTitle>
          <DialogDescription>
            Pick one or more active projects. The worker will gain access immediately after confirmation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assign-projects-search">Search projects</Label>
            <Command>
              <CommandInput placeholder="Search by project name or code…" id="assign-projects-search" />
              <CommandList>
                <CommandEmpty>No projects found.</CommandEmpty>
                <CommandGroup heading="Active Projects">
                  <ScrollArea className="max-h-64">
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading projects…
                      </div>
                    ) : filteredProjects.length > 0 ? (
                      filteredProjects.map((project) => {
                        const isSelected = selectedProjectIds.includes(project.id);
                        const departmentLabel = project.department
                          ? project.department.department_code
                            ? `${project.department.department_name} (${project.department.department_code})`
                            : project.department.department_name
                          : 'No department';
                        return (
                          <CommandItem
                            key={project.id}
                            data-testid="assign-projects-project-option"
                            onSelect={() => toggleProjectSelection(project.id)}
                            className="flex items-center justify-between gap-3 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {project.project_name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {project.project_code} • {departmentLabel}
                              </p>
                            </div>
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleProjectSelection(project.id)} />
                          </CommandItem>
                        );
                      })
                    ) : (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        All active projects are already assigned.
                      </div>
                    )}
                  </ScrollArea>
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          <div className="space-y-2">
            <Label>Filter by department</Label>
            <Select
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
            >
              <SelectTrigger data-testid="assign-projects-department-filter">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-testid="assign-projects-submit"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Assigning…
              </span>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Assign selected
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignToProjectModal;
