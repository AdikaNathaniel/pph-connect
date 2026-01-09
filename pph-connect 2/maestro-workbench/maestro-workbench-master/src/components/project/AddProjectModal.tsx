import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import ProjectForm from '@/components/project/ProjectForm';
import type { ProjectFormValues } from '@/types/app';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

export interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type DepartmentOption = {
  id: string;
  name: string;
  code?: string | null;
};

const DEFAULT_TIER_OPTIONS: Array<'tier_1' | 'tier_2' | 'tier_3' | 'specialist'> = [
  'tier_1',
  'tier_2',
  'tier_3',
  'specialist'
];

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ open, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([]);

  const loadDepartments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, department_name, department_code')
        .order('department_name', { ascending: true });

      if (error) {
        throw error;
      }

      setDepartmentOptions(
        (data ?? []).map((record) => ({
          id: record.id,
          name: record.department_name,
          code: record.department_code
        }))
      );
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Unable to load departments right now.';
      showErrorToast('Failed to load departments', { description: message });
      setDepartmentOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadDepartments().catch((error) => {
        console.error('Failed to load departments', error);
      });
    }
  }, [open, loadDepartments]);

  const initialValues = useMemo<ProjectFormValues | undefined>(() => {
    if (departmentOptions.length === 0) {
      return undefined;
    }

    return {
      code: '',
      name: '',
      status: 'planned',
      departmentId: departmentOptions[0]?.id ?? null,
      expertTier: DEFAULT_TIER_OPTIONS[0],
      startDate: null,
      endDate: null,
      description: '',
      assignTeamIds: []
    };
  }, [departmentOptions]);

  const handleSubmit = async (values: ProjectFormValues) => {
    setIsSubmitting(true);
    const userId = user?.id ?? null;
    const timestamp = new Date().toISOString();

    try {
      const payload = {
        project_code: values.code,
        project_name: values.name,
        status: values.status,
        department_id: values.departmentId,
        expert_tier: values.expertTier,
        start_date: values.startDate,
        end_date: values.endDate,
        description: values.description ?? null,
        created_at: timestamp,
        updated_at: timestamp,
        created_by: userId,
        updated_by: userId
      };

      const { data: projectRecord, error: insertError } = await supabase
        .from('projects')
        .insert(payload)
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      if (values.assignTeamIds?.length > 0) {
        if (!projectRecord?.id) {
          throw new Error('Unable to determine project id for team assignment');
        }
        const teamPayloads = values.assignTeamIds.map((teamId) => ({
          project_id: projectRecord.id,
          team_id: teamId,
          created_at: timestamp,
          created_by: userId
        }));

        const { error: teamInsertError } = await supabase.from('project_teams').insert(teamPayloads);
        if (teamInsertError) {
          throw teamInsertError;
        }
      }

      showSuccessToast('Project created', {
        description: `${values.name} has been added successfully.`
      });

      onSuccess?.();
      onClose();
    } catch (insertIssue) {
      const message =
        insertIssue instanceof Error ? insertIssue.message : 'Unexpected error occurred';
      showErrorToast('Unable to create project', {
        description: message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (isLoading && departmentOptions.length === 0) {
      return (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading departments…
        </div>
      );
    }

    if (departmentOptions.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No departments available. Create a department first before adding a project.
        </p>
      );
    }

    return (
      <ProjectForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={onClose}
        initialValues={initialValues}
        departmentOptions={departmentOptions}
        tierOptions={DEFAULT_TIER_OPTIONS}
        statusOptions={['planned', 'active', 'paused', 'completed', 'archived']}
        isSubmitting={isSubmitting || isLoading}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Project</DialogTitle>
          <DialogDescription>
            Create a new project definition, set the department ownership, and configure timing details.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
        <DialogFooter>
          <p className="text-xs text-muted-foreground">
            Audit fields (`created_by`, `updated_by`) will capture your user ID automatically.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddProjectModal;
