import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Home, Info, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from '@/integrations/supabase/client';
import { Task, Project, ProjectAssignment, ReviewTask, TaskTemplate, ColumnConfig } from '@/types';
import { toast } from "sonner";
import TaskForm from '@/components/TaskForm';
import AudioShortformReviewForm from '@/components/AudioShortformReviewForm';
import ChatbotEvalForm from '@/components/ChatbotEvalForm';
import NoTasks from './NoTasks';
import WorkbenchInfo from '@/components/WorkbenchInfo';
import { useIsMobile } from '@/hooks/use-mobile';
import VersionTracker from '@/components/VersionTracker';
import { submitAnswer, type SubmitAnswerResult } from '@/lib/answers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { selectNextProject, SelectedProjectDetails } from '@/lib/projectSelection';
import { configureWorkerLogger, installWorkerLogger, logWorkerEvent } from '@/lib/workerLogger';
import { checkWorkerAchievements } from '@/services/achievementTrackingService';
import QualityFeedbackCard from '@/components/workbench/QualityFeedbackCard';

const DEFAULT_REVIEW_CONFIG = {
  ratingMax: 5,
  highlightTags: ['Accuracy', 'Punctuation', 'Guidelines', 'Label'],
  feedbackEnabled: true,
  internalNotesEnabled: true,
};

const WorkerWorkbench = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isInitialized = useRef(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [reservationDurationSeconds, setReservationDurationSeconds] = useState<number>(0);
  const [projectAhtSeconds, setProjectAhtSeconds] = useState<number | null>(null);
  const [hasShownAhtWarning, setHasShownAhtWarning] = useState(false);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAutoStarting, setIsAutoStarting] = useState(false);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [activeProjectState, setActiveProjectState] = useState<Project | null>(null);
  const [availableCount, setAvailableCount] = useState<number>(0);
  const [taskStartTime, setTaskStartTime] = useState<Date | null>(null);
  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false);
  const [selectedSkipReason, setSelectedSkipReason] = useState('');
  const [isSubmittingSkip, setIsSubmittingSkip] = useState(false);
  const [selectionDetails, setSelectionDetails] = useState<SelectedProjectDetails | null>(null);
  const exitInProgressRef = useRef(false);
  const currentTaskIdRef = useRef<string | null>(null);
  const currentTaskProjectRef = useRef<string | null>(null);
  const currentReviewTaskIdRef = useRef<string | null>(null);
  const handleStartTaskRef = useRef<() => Promise<void>>(async () => {});
  const reviewAutoAttemptedRef = useRef(false);
  const [currentStage, setCurrentStage] = useState<'transcription' | 'review'>('transcription');
  const [currentReviewTask, setCurrentReviewTask] = useState<ReviewTask | null>(null);
  const [currentReviewProject, setCurrentReviewProject] = useState<Project | null>(null);
  const [reviewAudioUrl, setReviewAudioUrl] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewConfig, setReviewConfig] = useState(DEFAULT_REVIEW_CONFIG);
  const reviewTemplateCache = useRef<Record<string, typeof DEFAULT_REVIEW_CONFIG>>({});
  const [currentTaskTemplate, setCurrentTaskTemplate] = useState<TaskTemplate | null>(null);
  const [qualityFeedback, setQualityFeedback] = useState<{
    trustRating: number | null;
    goldAccuracy: number | null;
    goldMatch: boolean | null;
    projectName: string | null;
  } | null>(null);

  const reviewAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.can_review).sort((a, b) => a.priority_review - b.priority_review),
    [assignments]
  );
  const hasReviewAccess = reviewAssignments.length > 0;
  const transcriptionAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.can_transcribe).sort((a, b) => a.priority_transcribe - b.priority_transcribe),
    [assignments]
  );

  useEffect(() => {
    if (!hasReviewAccess && currentStage === 'review') {
      setCurrentStage('transcription');
      reviewAutoAttemptedRef.current = false;
    }

    if (!transcriptionAssignments.length && hasReviewAccess) {
      setCurrentStage('review');
    }
  }, [hasReviewAccess, currentStage, transcriptionAssignments.length]);

  const releaseTaskReservation = useCallback(
    async ({
      taskId,
      projectId,
      workerId,
      suppressStateReset = false,
    }: {
      taskId: string | null;
      projectId?: string | null;
      workerId: string | null;
      suppressStateReset?: boolean;
    }): Promise<boolean> => {
      if (!taskId || !workerId) {
        console.warn('releaseTaskReservation skipped - missing ids', { taskId, workerId });
        return false;
      }

      console.log('releaseTaskReservation invoked', { taskId, projectId, workerId, suppressStateReset });

      try {
        const { data, error } = await supabase
          .rpc('release_task_by_id', { p_task_id: taskId });

        if (error) throw error;

        if (data === false) {
          console.warn('Task not found or already released:', taskId);
        } else if (data === true) {
          console.log('Task released successfully:', taskId);
        }

        if (!suppressStateReset && currentTask && currentTask.id === taskId) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? { ...t, status: 'pending', assigned_to: undefined, assigned_at: undefined }
                : t
            )
          );

          setCurrentTask(null);
          setCurrentProject(null);
          setTaskStartTime(null);
          setIsSkipDialogOpen(false);
          setSelectedSkipReason('');
          setIsSubmittingSkip(false);
          setTimeRemaining(0);
          setReservationDurationSeconds(0);
          setProjectAhtSeconds(null);
          setHasShownAhtWarning(false);
          setIsAutoStarting(false);
        }

        if (currentTaskIdRef.current === taskId) {
          currentTaskIdRef.current = null;
        }

        if (currentTaskProjectRef.current && currentTaskProjectRef.current === projectId) {
          currentTaskProjectRef.current = null;
        }

        return data === true;
      } catch (error) {
        console.error('Error releasing task reservation:', error);
        logWorkerEvent(
          'error',
          'Failed to release task reservation',
          'release_task_reservation',
          {
            workerId,
            taskId,
            projectId,
            supabaseError: error,
          },
          error instanceof Error ? error.stack : undefined
        );
        toast.error('Failed to release task reservation');
        return false;
      }
    },
    [currentTask]
  );

  const releaseCurrentTask = useCallback(
    async (options?: { suppressStateReset?: boolean }): Promise<boolean> => {
      const workerId = user?.id ?? null;
      const taskId = currentTaskIdRef.current;
      const projectId = currentTaskProjectRef.current;

      if (!taskId || !workerId) {
        console.warn('releaseCurrentTask skipped - missing ids', { taskId, workerId });
        return false;
      }

      const released = await releaseTaskReservation({
        taskId,
        projectId,
        workerId,
        suppressStateReset: options?.suppressStateReset ?? false,
      });

      return released;
    },
    [user, releaseTaskReservation]
  );

  const fetchWorkerData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      configureWorkerLogger({ workerId: user.id });
      
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('project_assignments')
        .select('*')
        .eq('worker_id', user.id)
        .order('priority', { ascending: true });

      if (assignmentsError) throw assignmentsError;

      const projectIds = assignmentsData?.map(a => a.project_id) || [];
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds);

      if (projectsError) throw projectsError;

      const normalizedProjects = (projectsData || []).map(project => ({
        ...project,
        reservation_time_limit_minutes: project.reservation_time_limit_minutes ?? 60,
        average_handle_time_minutes: project.average_handle_time_minutes ?? null,
        enable_skip_button: Boolean(project.enable_skip_button),
        skip_reasons: Array.isArray(project.skip_reasons) ? project.skip_reasons : [],
      })) as Project[];

      let assignedTasks: Task[] = [];

      if (projectIds.length > 0) {
        const { data: myTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('assigned_to', user.id)
          .in('project_id', projectIds);

        if (!tasksError && myTasks) {
          assignedTasks = myTasks as Task[];
        }
      }

      let selectedProjectDetails: SelectedProjectDetails | null = null;

      if (projectIds.length > 0) {
        selectedProjectDetails = await selectNextProject({
          supabase,
          workerId: user.id,
          assignments: assignmentsData || [],
          projects: normalizedProjects,
        });
      }

      setAssignments(assignmentsData || []);
      setProjects(normalizedProjects);
      setTasks(assignedTasks);

      if (selectedProjectDetails) {
        setActiveProjectState(selectedProjectDetails.project);
        setAvailableCount(selectedProjectDetails.availableCount);
        setSelectionDetails(selectedProjectDetails);
      } else {
        setActiveProjectState(null);
        setAvailableCount(0);
        setSelectionDetails(null);
      }
    } catch (error) {
      console.error('Error fetching worker data:', error);
      toast.error('Failed to load your assignments');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleStartTask = useCallback(async () => {
    if (selectionDetails?.trainingRequired && !selectionDetails.trainingCompleted) {
      console.log('Training required and not completed. Not starting task.');
      toast.error('Training required — please complete the module first');
      setIsAutoStarting(false);
      return;
    }

    if (exitInProgressRef.current) {
      console.log('Exit in progress - suppressing task claim');
      setIsAutoStarting(false);
      return;
    }

    if (activeProjectState && user) {
      try {
        console.log(`Attempting to claim question for project ${activeProjectState.id}, worker ${user.id}`);
        const { data, error } = await supabase.functions.invoke('claim-next-question', {
          body: {
            projectId: activeProjectState.id,
            workerId: user.id,
          },
        });

        if (error) {
          console.error('Error claiming question:', error);
          logWorkerEvent('error', 'Failed to invoke claim-next-question RPC fallback', 'claim_next_question', {
            projectId: activeProjectState.id,
            workerId: user.id,
            supabaseError: error,
          });
          throw error;
        }

        console.log('Claim question response:', data);

        if (!data?.success || !data.task) {
          console.log('No questions available, redirecting to dashboard...');
          logWorkerEvent('info', 'No questions available for project, redirecting to dashboard', 'claim_next_question', {
            projectId: activeProjectState.id,
            workerId: user.id,
          });
          
          await fetchWorkerData();
          setIsAutoStarting(false);
          
          // Redirect to dashboard to check for next project or show proper No Tasks UI
          toast.info('Project completed!', {
            description: 'Checking for your next assignment...'
          });
          
          navigate('/w/dashboard');
          return;
        }

        // The Edge Function returns both task and question
        // Task has the actual task ID (UUID from tasks table)
        // Question has the question ID (UUID from questions table)
        console.log('Task claimed successfully:', {
          taskId: data.task.id,
          questionId: data.question.id,
          projectId: data.task.project_id
        });

        // Verify the task ID actually exists in the tasks table.
        // Some edge deployments have returned the question UUID instead of the task UUID.
        let effectiveTaskId = data.task.id;
        const { data: verifyTask, error: verifyError } = await supabase
          .from('tasks')
          .select('id, question_id, assigned_to')
          .eq('id', effectiveTaskId)
          .maybeSingle();

        if (verifyError) {
          console.error('Error verifying task ID returned from Edge Function', verifyError);
        }

        if (!verifyTask) {
          console.warn('Task ID returned from Edge Function not found. Attempting lookup by question/worker.', {
            edgeFunctionTaskId: effectiveTaskId,
            questionId: data.question.id,
            workerId: user.id,
          });

          const { data: actualTask, error: lookupError } = await supabase
            .from('tasks')
            .select('id, project_id, question_id, assigned_to')
            .eq('question_id', data.question.id)
            .eq('assigned_to', user.id)
            .eq('status', 'assigned')
            .order('assigned_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lookupError) {
            console.error('Failed to locate task by question/worker during verification', lookupError);
          }

          if (actualTask) {
            effectiveTaskId = actualTask.id;
            data.task.id = actualTask.id;
            data.task.project_id = actualTask.project_id ?? data.task.project_id;

            console.warn('Using corrected task ID from tasks table', {
              correctedTaskId: actualTask.id,
              questionId: actualTask.question_id,
            });
          } else {
            console.error('Unable to locate corresponding task row after claim.', {
              questionId: data.question.id,
              workerId: user.id,
            });
          }
        }
        
        setCurrentTask(data.task as Task);
        currentTaskIdRef.current = data.task.id as string;
        currentTaskProjectRef.current = data.task.project_id as string;
        setCurrentProject(activeProjectState);
        setTaskStartTime(new Date());
        
        // Fetch template to check if it's a chatbot eval task
        const { data: templateData, error: templateError } = await supabase
          .from('task_templates')
          .select('*')
          .eq('id', activeProjectState.template_id)
          .single();
        
        if (!templateError && templateData) {
          setCurrentTaskTemplate({
            ...templateData,
            column_config: Array.isArray(templateData.column_config) 
              ? templateData.column_config as unknown as ColumnConfig[] 
              : []
          } as TaskTemplate);
        }
        setSelectedSkipReason('');
        const reservationMinutes = Math.max(1, activeProjectState.reservation_time_limit_minutes || 60);
        const reservationSeconds = reservationMinutes * 60;
        setReservationDurationSeconds(reservationSeconds);
        const projectAhtMinutes = activeProjectState.average_handle_time_minutes;
        setProjectAhtSeconds(projectAhtMinutes && projectAhtMinutes > 0 ? projectAhtMinutes * 60 : null);
        setHasShownAhtWarning(false);
        setTimeRemaining(reservationSeconds);
        setIsAutoStarting(false);

        setTasks((prev) => [...prev, data.task as Task]);

        await fetchWorkerData();
      } catch (error) {
        console.error('Error starting task:', error);
        logWorkerEvent('error', 'handleStartTask threw unexpectedly', 'claim_next_question', {
          projectId: activeProjectState?.id,
          workerId: user.id,
          error: error instanceof Error ? error.message : 'unknown error',
        }, error instanceof Error ? error.stack : undefined);
        toast.error('Failed to start task');
        setIsAutoStarting(false);
      }
    }
  }, [activeProjectState, selectionDetails, user, fetchWorkerData]);

  useEffect(() => {
    if (!user) {
      return;
    }

    installWorkerLogger();
    configureWorkerLogger({ workerId: user.id });

    if (!isInitialized.current) {
      isInitialized.current = true;
      fetchWorkerData();
    }

    // Cleanup on component unmount - release any active task
    return () => {
      // Don't release if we're in the middle of an intentional exit
      // The exit handler will take care of it to avoid double-release
      if (exitInProgressRef.current) {
        console.log('Skipping unmount cleanup - exit already in progress');
        return;
      }
      
      const taskId = currentTaskIdRef.current;
      const workerId = user?.id;
      
      if (taskId && workerId) {
        console.log('Workbench unmounting unexpectedly - releasing task:', taskId);
        
        // Use the RPC function to release the task
        // This runs during unmount for unexpected navigation (browser back, etc.)
        supabase
          .rpc('release_task_by_id', { p_task_id: taskId })
          .then(({ data, error }) => {
            if (error) {
              console.error('Failed to release task on unmount:', error);
            } else if (data) {
              console.log('Task released successfully on unmount');
            } else {
              console.log('Task already released or not found on unmount');
            }
          })
          .catch((err) => {
            console.error('Error releasing task on unmount:', err);
          });
      }
    };
  }, [user, fetchWorkerData]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (exitInProgressRef.current) {
        console.log('Visibility change ignored during exit');
        return;
      }

      if (document.visibilityState === 'visible' && isInitialized.current && currentTask) {
        console.log('Tab became visible with active task - skipping refetch');
        return;
      }

      if (
        document.visibilityState === 'visible' &&
        isInitialized.current &&
        !currentTask &&
        !loading &&
        !exitInProgressRef.current
      ) {
        if (activeProjectState && availableCount > 0 && !isAutoStarting) {
          console.log('Tab became visible - auto-starting task');
          setIsAutoStarting(true);
          handleStartTask();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentTask, loading, activeProjectState, availableCount, isAutoStarting, handleStartTask]);

  useEffect(() => {
    if (
      !loading &&
      activeProjectState &&
      availableCount > 0 &&
      !currentTask &&
      !isAutoStarting &&
      !exitInProgressRef.current
    ) {
      setIsAutoStarting(true);
      handleStartTask();
    }
  }, [loading, activeProjectState, availableCount, currentTask, isAutoStarting, handleStartTask]);

  // Safety timeout to prevent stuck transitions
  useEffect(() => {
    if (!isTransitioning) return;
    
    const timeoutId = setTimeout(() => {
      console.warn('Transition timeout - forcing clear and redirect');
      logWorkerEvent('warn', 'Transition state stuck for >10s, forcing redirect', 'workbench_timeout', {
        workerId: user?.id,
      });
      setIsTransitioning(false);
      toast.warning('Taking longer than expected. Redirecting to dashboard...');
      navigate('/w/dashboard');
    }, 10000); // 10 second timeout
    
    return () => clearTimeout(timeoutId);
  }, [isTransitioning, navigate, user]);

  const getCurrentActiveProject = () => {
    if (!selectionDetails) return null;
    return {
      project: selectionDetails.project,
      availableTasks: tasks.filter((t) => t.project_id === selectionDetails?.project.id && t.status === 'pending'),
    };
  };

  // Get next available task from current active project
  const getNextTask = () => {
    const current = getCurrentActiveProject();
    return current?.availableTasks[0] || null;
  };

  const openSkipDialog = () => {
    if (!currentTask || !currentProject) {
      return;
    }

    if (!currentProject.enable_skip_button) {
      toast.info('Skipping is disabled for this project.');
      return;
    }

    const reasons = Array.isArray(currentProject.skip_reasons) ? currentProject.skip_reasons : [];
    if (reasons.length === 0) {
      toast.warning('No skip reasons are configured for this project.');
      return;
    }

    setSelectedSkipReason(prev => (prev && reasons.includes(prev) ? prev : reasons[0]));
    setIsSkipDialogOpen(true);
  };

  const handleConfirmSkip = async () => {
    if (!currentTask || !currentProject || !user) {
      return;
    }

    if (isSubmittingSkip) {
      return;
    }

    const reasons = Array.isArray(currentProject.skip_reasons) ? currentProject.skip_reasons : [];
    if (currentProject.enable_skip_button && reasons.length > 0 && !selectedSkipReason) {
      toast.error('Please select a reason before skipping.');
      return;
    }

    try {
      setIsSubmittingSkip(true);
      const completionTime = new Date();
      const effectiveStart = taskStartTime
        ? taskStartTime
        : currentTask.assigned_at
          ? new Date(currentTask.assigned_at)
          : new Date(completionTime.getTime());

      const submissionResult = await submitAnswer({
        task: currentTask,
        workerId: user.id,
        formData: selectedSkipReason ? { skip_reason: selectedSkipReason } : {},
        startTime: effectiveStart,
        completionTime,
        skipped: true,
        skipReason: selectedSkipReason || null,
      });

      setIsSkipDialogOpen(false);
      setSelectedSkipReason('');

      await handleCompleteTask({ skipped: true, skip_reason: selectedSkipReason }, submissionResult);
    } catch (error) {
      console.error('Error skipping task:', error);
      logWorkerEvent('error', 'submitAnswer threw during skip', 'skip_task', {
        workerId: user.id,
        taskId: currentTask.id,
        projectId: currentTask.project_id,
        error: error instanceof Error ? error.message : 'unknown error',
      }, error instanceof Error ? error.stack : undefined);
      toast.error(error instanceof Error ? error.message : 'Failed to skip task');
    } finally {
      setIsSubmittingSkip(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time expired, return task to queue
            releaseCurrentTask();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [timeRemaining, releaseCurrentTask]);

  useEffect(() => {
    if (!currentTask) return;
    if (!projectAhtSeconds || projectAhtSeconds <= 0) return;
    if (hasShownAhtWarning) return;
    if (reservationDurationSeconds <= 0 || timeRemaining <= 0) return;

    const elapsedSeconds = reservationDurationSeconds - timeRemaining;

    if (elapsedSeconds >= projectAhtSeconds) {
      const message = 'Your time spent on this task is higher than average. If you encounter any difficulties, please share feedback with your Manager. Please continue working but be mindful of time spent.';
      const id = toast.warning(message, {
        position: 'top-center',
        duration: 8000,
        action: {
          label: 'Dismiss',
          onClick: () => toast.dismiss(id)
        }
      });

      setHasShownAhtWarning(true);
    }
  }, [currentTask, projectAhtSeconds, reservationDurationSeconds, timeRemaining, hasShownAhtWarning]);

  // Release task only when the page is being unloaded (e.g., tab or window close)
  useEffect(() => {
    if (!currentTask || !user) return;

    let hasReleased = false;

    const releaseTask = () => {
      if (hasReleased) return;
      hasReleased = true;
      releaseCurrentTask();
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        console.log('Page unloading - releasing task');
        releaseTask();
      } else {
        console.log('Page entering bfcache - keeping task reserved');
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log('Before unload - releasing task');
      releaseTask();
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentTask, user, releaseCurrentTask]);

  const notifyAchievementUnlocks = useCallback((achievementNames: string[]) => {
    achievementNames.forEach((name) => {
      toast.success(`Achievement unlocked: ${name}`, {
        description: 'Great work! Keep going to unlock more badges.',
      });
    });
  }, []);

  const handleCompleteTask = async (_taskData?: Record<string, unknown>, submissionResult?: SubmitAnswerResult) => {
    // TaskForm already handles the answer submission to the answers table
    // We just need to refresh the data and get the next task
    const projectContext = currentProject;
    if (submissionResult) {
      if (
        submissionResult.trustRating != null ||
        submissionResult.goldAccuracy != null ||
        submissionResult.goldMatch != null
      ) {
        setQualityFeedback({
          trustRating: submissionResult.trustRating,
          goldAccuracy: submissionResult.goldAccuracy,
          goldMatch: submissionResult.goldMatch,
          projectName: projectContext?.name ?? null,
        });
      }
    }

    try {
      // Set transition state to prevent flicker
      setIsTransitioning(true);
      
      // Update local state
      setCompletedTasksCount(prev => {
        const newCount = prev + 1;
        console.log(`Updating completed count: ${prev} -> ${newCount}`);
        return newCount;
      });
      setActiveProjectState(prev => prev ? { ...prev, completed_tasks: (prev.completed_tasks || 0) + 1 } : prev);
      setCurrentTask(null);
      setCurrentProject(null);
      setCurrentTaskTemplate(null);
      setTaskStartTime(null);
      setIsSkipDialogOpen(false);
      setSelectedSkipReason('');
      setIsSubmittingSkip(false);
      setTimeRemaining(0);
      setReservationDurationSeconds(0);
      setProjectAhtSeconds(null);
      setHasShownAhtWarning(false);

      // Refresh worker data to get updated counts
      await fetchWorkerData();
      if (user?.id) {
        const newlyEarned = await checkWorkerAchievements(user.id);
        if (newlyEarned.length) {
          notifyAchievementUnlocks(newlyEarned);
        }
      }

      // Auto-claim next available task immediately
      await handleStartTask();
    } catch (error) {
      console.error('Error in handleCompleteTask:', error);
      logWorkerEvent('error', 'handleCompleteTask failed', 'complete_task', {
        workerId: user?.id,
        error: error instanceof Error ? error.message : 'unknown error',
      }, error instanceof Error ? error.stack : undefined);
      
      // On error, redirect to dashboard as safety measure
      toast.error('Something went wrong. Redirecting to dashboard...');
      navigate('/w/dashboard');
    } finally {
      // Always clear transition state
      setIsTransitioning(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

const hasNextTask = availableCount > 0;
const activeProject = activeProjectState;
const availableTasksCount = availableCount;

  if (loading || isAutoStarting) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {loading ? 'Loading workbench...' : 'Starting your next question...'}
          </p>
        </div>
      </div>
    );
  }

  // Show NoTasks component if no assignments or no active projects with tasks
  if (!assignments || assignments.length === 0 || !activeProject) {
    return <NoTasks />;
  }

  // Check if current task is chatbot-eval
  const isChatbotEvalTask = currentTaskTemplate?.modality === 'chatbot-eval' ||
    currentTaskTemplate?.modality_config?.chatbotEval?.enabled ||
    (currentTaskTemplate?.column_config?.some(col => 
      col.type === 'write' && (col.id.startsWith('test_') || col.id.startsWith('base_') || col.id.startsWith('sxs_'))
    ) ?? false);

  return (
    <TooltipProvider>
      <div className="bg-background min-h-screen flex flex-col" style={isChatbotEvalTask ? { backgroundColor: 'hsl(220deg 60% 97.06%)' } : undefined}>
        <div className={`flex flex-col flex-1 w-full ${!isChatbotEvalTask ? 'mx-auto max-w-[1568px] border-x' : ''}`}>
          {/* Subtle Header */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0 sticky top-0 z-10">
            <div className={!isChatbotEvalTask ? 'flex h-12 items-center justify-between px-6' : 'flex h-12 items-center justify-between px-6 mx-auto max-w-[1568px] w-full'}>
              {/* Left: Maestro */}
              <div className="font-semibold text-sm">PPH Maestro</div>
              
              {/* Center: Task Info */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{availableCount} {availableCount === 1 ? 'task' : 'tasks'} remaining</span>
                <span className="text-muted-foreground/50">|</span>
                {timeRemaining > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-medium">{formatTime(timeRemaining)}</span>
                  </div>
                )}
              </div>
              
              {/* Right: Instructions */}
              <div>
                {currentProject && (
                  <WorkbenchInfo project={currentProject} />
                )}
              </div>
            </div>
          </header>

          {/* Main Content - Full Focus */}
          <main className={`flex-1 px-6 py-6 ${isChatbotEvalTask ? 'mx-auto max-w-[1568px] w-full' : ''}`} style={!isChatbotEvalTask ? { backgroundColor: 'hsl(220deg 60% 97.06%)' } : undefined}>
            {hasReviewAccess && currentStage !== 'review' && (
              <div className="flex justify-end mb-6">
                <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
                  <Button
                    type="button"
                    variant={currentStage === 'transcription' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleStageSwitch('transcription')}
                  >
                    Transcription
                  </Button>
                  <Button
                    type="button"
                    variant={currentStage === 'review' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleStageSwitch('review')}
                    disabled={!hasReviewAccess}
                  >
                    Review
                  </Button>
                </div>
              </div>
            )}

            {qualityFeedback ? (
              <div className="mb-6">
                <QualityFeedbackCard
                  qualityScore={qualityFeedback.trustRating}
                  goldAccuracy={qualityFeedback.goldAccuracy}
                  goldMatch={qualityFeedback.goldMatch}
                  projectName={qualityFeedback.projectName ?? currentProject?.name ?? null}
                  trainingHref="/worker/training"
                  onDismiss={() => setQualityFeedback(null)}
                />
              </div>
            ) : null}

            {isTransitioning ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading next question...</p>
                </div>
              </div>
            ) : currentStage === 'review' ? (
              reviewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Claiming review task...</p>
                  </div>
                </div>
              ) : currentReviewTask && currentReviewProject ? (
                <AudioShortformReviewForm
                  audioUrl={reviewAudioUrl}
                  answerId={currentReviewTask.answer_id}
                  answerData={currentReviewTask.answer_data || {}}
                  questionData={currentReviewTask.question_data || {}}
                  ratingMax={reviewConfig.ratingMax}
                  highlightTags={reviewConfig.highlightTags}
                  allowFeedback={reviewConfig.feedbackEnabled}
                  allowInternalNotes={reviewConfig.internalNotesEnabled}
                  submitting={reviewSubmitting}
                  onSubmit={handleReviewSubmit}
                  onSkip={() => {
                    releaseCurrentReviewTask();
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">No review tasks available</h3>
                      <p className="text-muted-foreground mb-6">
                        Once transcribers submit work, review tasks will appear here.
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={handleStartTask} disabled={reviewAssignments.length === 0}>
                          {reviewAssignments.length === 0 ? 'No Review Projects' : 'Check Again'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            ) : currentTask && currentProject ? (
              // Check if this is a chatbot eval task
              // Either via modality type, modality_config flag, or by checking for test_/base_/sxs_ column prefixes
              (() => {
                const isChatbotEval = currentTaskTemplate?.modality === 'chatbot-eval' ||
                  currentTaskTemplate?.modality_config?.chatbotEval?.enabled ||
                  (currentTaskTemplate?.column_config?.some(col => 
                    col.type === 'write' && (col.id.startsWith('test_') || col.id.startsWith('base_') || col.id.startsWith('sxs_'))
                  ) ?? false);
                
                return isChatbotEval ? (
                  <ChatbotEvalForm
                    task={currentTask}
                    project={currentProject}
                    taskStartTime={taskStartTime}
                    onComplete={handleCompleteTask}
                    onSkip={openSkipDialog}
                  />
                ) : (
                  <TaskForm
                    task={currentTask}
                    project={currentProject}
                    taskStartTime={taskStartTime}
                    onComplete={handleCompleteTask}
                    onSkip={openSkipDialog}
                  />
                );
              })()
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">No questions available</h3>
                    <p className="text-muted-foreground mb-6">
                      {assignments.length === 0 
                        ? "You haven't been assigned to any projects yet."
                        : "All questions in your assigned projects are currently completed or assigned."
                      }
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button 
                        onClick={async () => {
                          // Set exit flag to prevent auto-claiming
                          exitInProgressRef.current = true;
                          
                          // If there's a current task, release it
                          if (currentTask) {
                            try {
                              await releaseCurrentTask({ suppressStateReset: true });
                              console.log('Task released before navigation from no-tasks screen');
                            } catch (error) {
                              console.error('Failed to release task from no-tasks screen:', error);
                            }
                          }
                          
                          navigate('/w/dashboard');
                        }} 
                        variant="outline"
                      >
                        Back to Dashboard
                      </Button>
                      <Button onClick={handleStartTask} disabled={availableCount === 0}>
                        Try Again
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </main>

          {/* Footer */}
          <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
            <div className={!isChatbotEvalTask ? 'flex h-12 items-center justify-between px-6' : 'flex h-12 items-center justify-between px-6 mx-auto max-w-[1568px] w-full'}>
              {/* Left: Dashboard */}
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={async () => {
                          if (currentTask) {
                            // Set exit flag to prevent auto-claiming
                            exitInProgressRef.current = true;

                            const taskId = currentTask.id;
                            const projectId = currentTask.project_id;
                            const workerId = user.id;
                            console.log('Dashboard button clicked - releasing task:', taskId);

                            let released = await releaseCurrentTask({ suppressStateReset: true });

                            if (!released) {
                              console.warn('Primary release failed, attempting fallback for task:', taskId);
                              const { data: fallbackData, error: fallbackError } = await supabase
                                .rpc('release_task_by_id', { p_task_id: taskId });

                              if (fallbackError) {
                                console.error('Fallback release failed:', fallbackError);
                                logWorkerEvent('error', 'Fallback release failed', 'workbench_navigation', {
                                  taskId,
                                  projectId,
                                  workerId,
                                  supabaseError: fallbackError,
                                });
                              } else {
                                released = fallbackData === true;
                              }
                            }

                            if (!released) {
                              console.warn('Release still unsuccessful, releasing all tasks for worker');
                              const { data: bulkRelease, error: bulkError } = await supabase
                                .rpc('release_worker_tasks');

                              if (bulkError) {
                                console.error('release_worker_tasks failed during dashboard navigation', bulkError);
                                logWorkerEvent('error', 'release_worker_tasks fallback failed', 'workbench_navigation', {
                                  taskId,
                                  projectId,
                                  workerId,
                                  supabaseError: bulkError,
                                });
                              } else {
                                console.log('release_worker_tasks released tasks:', bulkRelease);

                                const releasedCount = bulkRelease?.[0]?.released_count ?? 0;
                                if (releasedCount === 0 && projectId && workerId) {
                                  console.warn('release_worker_tasks released 0 tasks - attempting targeted release by project/worker');

                                  const { data: targetedTasks, error: targetedError } = await supabase
                                    .from('tasks')
                                    .select('id')
                                    .eq('assigned_to', workerId)
                                    .eq('project_id', projectId)
                                    .eq('status', 'assigned');

                                  if (targetedError) {
                                    console.error('Targeted task lookup failed:', targetedError);
                                  } else if (targetedTasks && targetedTasks.length > 0) {
                                    console.log('Releasing targeted tasks:', targetedTasks.map((t) => t.id));
                                    for (const targetedTask of targetedTasks) {
                                      await supabase.rpc('release_task_by_id', { p_task_id: targetedTask.id });
                                    }
                                  } else {
                                    console.warn('No targeted tasks found for release');
                                  }
                                }
                              }
                            } else {
                              console.log('Task released successfully before navigation');
                            }

                            // Small delay to ensure the release completes
                            await new Promise((resolve) => setTimeout(resolve, 150));

                            // Navigate after release attempt
                            navigate('/w/dashboard');
                          } else {
                            navigate('/w/dashboard');
                          }
                        }}
                      >
                        <Home className="h-4 w-4 mr-2" />
                        Dashboard
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>You will lose task reservation</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {/* Center: Skip Button */}
              <div>
                {currentTask && currentProject?.enable_skip_button && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={openSkipDialog}
                    disabled={isSubmittingSkip}
                  >
                    {isSubmittingSkip && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Skip
                  </Button>
                )}
              </div>
              
              {/* Right: Version */}
              <div>
                <VersionTracker />
              </div>
            </div>
          </footer>
        </div>
      </div>
      <Dialog
        open={isSkipDialogOpen}
        onOpenChange={(open) => {
          if (!isSubmittingSkip) {
            setIsSkipDialogOpen(open);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skip Task</DialogTitle>
            <DialogDescription>
              Select a reason for skipping. This action will be recorded as a completed submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {currentProject?.skip_reasons?.length ? (
              <RadioGroup
                value={selectedSkipReason}
                onValueChange={setSelectedSkipReason}
                className="space-y-3"
              >
                {currentProject.skip_reasons.map((reason, index) => {
                  const id = `skip-reason-${index}`;
                  return (
                    <div key={`${reason}-${index}`} className="flex items-center space-x-3 rounded-md border p-3">
                      <RadioGroupItem value={reason} id={id} />
                      <Label htmlFor={id} className="text-sm font-medium leading-none">
                        {reason}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            ) : (
              <p className="text-sm text-muted-foreground">No skip reasons are configured for this project.</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSkipDialogOpen(false)}
              disabled={isSubmittingSkip}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSkip}
              disabled={isSubmittingSkip || !selectedSkipReason}
            >
              {isSubmittingSkip && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Skip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};


export default WorkerWorkbench;
