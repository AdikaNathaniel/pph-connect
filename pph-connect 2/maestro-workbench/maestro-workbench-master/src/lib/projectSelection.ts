import type { SupabaseClient } from '@supabase/supabase-js';
import type { Project, ProjectAssignment } from '@/types';
import type { Database } from '@/integrations/supabase/types';

export type TrainingModuleRow = Database['public']['Tables']['training_modules']['Row'];
export type QuestionRow = Database['public']['Tables']['questions']['Row'];

export interface ProjectSelectionResult {
  project: Project;
  availableCount: number;
  trainingModule: TrainingModuleRow | null;
  trainingCompletionId: string | null;
  trainingRequired: boolean;
  trainingCompleted: boolean;
  gateRequired: boolean;
  gatesPassed: boolean;
}

export interface ProjectSelectionContext {
  supabase: SupabaseClient;
  workerId: string;
  assignments: ProjectAssignment[];
  projects: Project[];
  timezone?: string;
}

export interface SelectedProjectDetails extends ProjectSelectionResult {
  reason?: 'available' | 'training_required';
}

const DEFAULT_PROJECT_LIMIT = 20;

const hasAvailableCapacity = (row: QuestionRow) => {
  const completed = row.completed_replications ?? 0;
  const required = row.required_replications ?? 0;
  return completed < required;
};

const sortAssignmentsByPriority = (assignments: ProjectAssignment[]) =>
  [...assignments].sort((a, b) => a.priority - b.priority);

const normalizeBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return false;
};

export async function selectNextProject(
  context: ProjectSelectionContext
): Promise<SelectedProjectDetails | null> {
  const { supabase, workerId } = context;
  const assignments = context.assignments ?? [];
  const projects = context.projects ?? [];

  if (assignments.length === 0 || projects.length === 0) {
    return null;
  }

  const prioritizedAssignments = sortAssignmentsByPriority(assignments).slice(0, DEFAULT_PROJECT_LIMIT);

  for (const assignment of prioritizedAssignments) {
    const project = projects.find((p) => p.id === assignment.project_id);
    if (!project) {
      continue;
    }

    if (project.status !== 'active') {
      continue;
    }

    const { data: availability, error: availabilityError } = await supabase
      .rpc('count_claimable_questions', { p_project_id: project.id });

    if (availabilityError) {
      console.warn('selectNextProject: failed to load availability for project', project.id, availabilityError);
      continue;
    }

    const availableCount = (availability as number) ?? 0;

    let hasActiveReservation = false;
    if (availableCount === 0) {
      const { data: reservationCount, error: reservationError } = await supabase
        .rpc('count_active_reservations_for_worker', {
          p_project_id: project.id,
          p_worker_id: workerId,
        });

      if (!reservationError) {
        hasActiveReservation = (reservationCount as number ?? 0) > 0;
      }
    }

    let trainingModule: TrainingModuleRow | null = null;
    let trainingCompletionId: string | null = null;
    let trainingRequired = normalizeBoolean(project.training_required);
    let trainingCompleted = !trainingRequired;
    let gateRequired = normalizeBoolean(project.requires_training_gate);
    let gatesPassed = !gateRequired;

    if (project.training_module_id) {
      const { data: moduleData, error: moduleError } = await supabase
        .from('training_modules')
        .select('*')
        .eq('id', project.training_module_id)
        .maybeSingle();

      if (moduleError) {
        console.warn('selectNextProject: failed to load training module', project.training_module_id, moduleError);
        trainingRequired = false;
      } else if (moduleData) {
        trainingModule = moduleData;

        if (trainingRequired) {
          const { data: completionData, error: completionError } = await supabase
            .from('worker_training_completions')
            .select('id')
            .eq('worker_id', workerId)
            .eq('project_id', project.id)
            .eq('training_module_id', moduleData.id)
            .maybeSingle();

          if (completionError) {
            console.warn('selectNextProject: failed to verify training completion', completionError);
            trainingCompleted = false;
          } else if (completionData?.id) {
            trainingCompletionId = completionData.id;
            trainingCompleted = true;
          } else {
            trainingCompleted = false;
          }
        }
      } else {
        // No module data found; do not gate tasks on missing training content
        trainingRequired = false;
        trainingCompleted = true;
      }
    } else {
      // No training module configured
      trainingRequired = false;
      trainingCompleted = true;
    }

    if (gateRequired) {
      const { data: gateData, error: gateError } = await supabase
        .from('training_gates')
        .select('status')
        .eq('worker_id', workerId)
        .eq('project_id', project.id);

      if (gateError) {
        console.warn('selectNextProject: failed to load training gates', gateError);
        gatesPassed = false;
      } else if (!gateData || gateData.length === 0) {
        gatesPassed = false;
      } else {
        gatesPassed = gateData.every((gate) => gate.status === 'passed');
      }
    }

    if ((availableCount > 0 || hasActiveReservation) && gatesPassed) {
      return {
        project,
        availableCount,
        trainingModule,
        trainingCompletionId,
        trainingRequired,
        trainingCompleted,
        gateRequired,
        gatesPassed,
        reason:
          trainingRequired && !trainingCompleted
            ? 'training_required'
            : gateRequired && !gatesPassed
              ? 'training_required'
              : 'available',
      };
    }

    // No available tasks, continue to next assignment regardless of training status
  }

  return null;
}
