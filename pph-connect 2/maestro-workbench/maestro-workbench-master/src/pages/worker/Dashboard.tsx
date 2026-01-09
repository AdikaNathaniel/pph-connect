import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, BarChart, LogOut, BookOpen, Mail, Briefcase, CircleDollarSign, ClipboardList, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { getKeySymbol } from '@/lib/keyboard-utils';
import { supabase } from '@/integrations/supabase/client';
import { Project, ProjectAssignment } from '@/types';
import type { Database } from '@/integrations/supabase/types';
import { toast } from "sonner";
import VersionTracker from '@/components/VersionTracker';
import { TrainingModal } from '@/components/worker';
import ProjectVisibilityPanel from '@/components/worker/ProjectVisibilityPanel';
import WorkerQualitySummary from '@/components/worker/WorkerQualitySummary';
import { configureWorkerLogger, installWorkerLogger, logWorkerEvent } from '@/lib/workerLogger';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { selectNextProject, SelectedProjectDetails } from '@/lib/projectSelection';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';
import { calculateWorkerBalance } from '@/services/balanceService';
import { calculateWorkerQualityScore } from '@/services/qualityService';
import { getUnlockProgress, type UnlockProgress } from '@/services/taskUnlockService';
import { checkWorkerAchievements } from '@/services/achievementTrackingService';

type TrainingModuleRow = Database['public']['Tables']['training_modules']['Row'];

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: formatDateInput(start),
    end: formatDateInput(end),
  };
};

const formatCurrencyValue = (amount: number, currency: string | null) => {
  if (!Number.isFinite(amount)) {
    return '—';
  }
  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  }
  return amount.toLocaleString();
};

const formatDifficultyLabel = (value: string | null | undefined) => {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

type SummaryCardId = 'projects' | 'earnings' | 'tasks' | 'quality';

type SummaryCardConfig = {
  id: SummaryCardId;
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  sublabel?: string;
  loading?: boolean;
  testId: string;
  valueTestId: string;
};

type QuickActionId = 'assignments' | 'training' | 'messages' | 'earnings';

type QuickActionConfig = {
  id: QuickActionId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  testId: string;
};

// Utility function to get the correct modifier key symbol based on OS
const getModifierKey = () => {
  if (typeof window === 'undefined') return '⌘'; // Default to Cmd for SSR
  return navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl';
};

// Utility function to render keyboard shortcut
const renderKeyboardShortcut = () => {
  const modifierKey = getModifierKey();
  return (
    <div className="ml-2 text-xs text-muted-foreground flex items-center">
      <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">{modifierKey}</kbd>
      <span className="mx-1">+</span>
      <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Enter</kbd>
    </div>
  );
};

const releaseTaskReservation = async (taskId: string) => {
  const { data, error } = await supabase
    .rpc('release_task_by_id', { p_task_id: taskId });
  
  if (error) throw error;
  if (!data) {
    throw new Error('Task not found or already released');
  }
};

const WorkerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useMessageNotifications();
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectState, setActiveProjectState] = useState<Project | null>(null);
  const [availableCount, setAvailableCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [trainingModule, setTrainingModule] = useState<TrainingModuleRow | null>(null);
  const [trainingCompletionId, setTrainingCompletionId] = useState<string | null>(null);
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [unlockProgress, setUnlockProgress] = useState<UnlockProgress | null>(null);
  const [pendingTasksCount, setPendingTasksCount] = useState<number>(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState<{ amount: number; currency: string | null }>({
    amount: 0,
    currency: null,
  });
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [selectionDetails, setSelectionDetails] = useState<SelectedProjectDetails | null>(null);
  const [projectTaskCounts, setProjectTaskCounts] = useState<Record<string, number>>({});
  const projectPanelRef = useRef<HTMLDivElement | null>(null);
  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const platform =
      (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
      navigator.platform ??
      navigator.userAgent;
    return /mac|iphone|ipod|ipad/i.test(platform);
  }, []);
  const launchShortcuts = useMemo<ShortcutCombo[]>(() => {
    if (isMac) {
      return [
        {
          keys: ['Shift', 'Enter'],
          matcher: (event: KeyboardEvent) =>
            event.key === 'Enter' &&
            event.shiftKey &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey,
        },
        {
          keys: ['Cmd', 'Enter'],
          matcher: (event: KeyboardEvent) =>
            event.key === 'Enter' && event.metaKey && !event.ctrlKey && !event.altKey,
        },
      ];
    }
    return [
      {
        keys: ['Ctrl', 'Enter'],
        matcher: (event: KeyboardEvent) =>
          event.key === 'Enter' && event.ctrlKey && !event.metaKey && !event.altKey,
      },
    ];
  }, [isMac]);
  const launchDisplayShortcuts = isMac ? launchShortcuts.slice(0, 1) : launchShortcuts;
  const renderKeyboardShortcut = () => (
    <div className="ml-2 text-xs text-muted-foreground flex items-center gap-2">
      {launchDisplayShortcuts.length > 1 ? (
        <KbdGroup>
          {launchDisplayShortcuts.map(({ keys }) => (
            <Kbd key={keys.join('+')}>
              {keys.map((keyLabel, keyIndex) => (
                <React.Fragment key={keyLabel}>
                  {keyIndex > 0 && ' + '}
                  {getKeySymbol(keyLabel)}
                </React.Fragment>
              ))}
            </Kbd>
          ))}
        </KbdGroup>
      ) : (
        <Kbd>
          {launchDisplayShortcuts[0].keys.map((keyLabel, keyIndex) => (
            <React.Fragment key={keyLabel}>
              {keyIndex > 0 && ' + '}
              {getKeySymbol(keyLabel)}
            </React.Fragment>
          ))}
        </Kbd>
      )}
    </div>
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

      let pendingCount = 0;
      let selection: SelectedProjectDetails | null = null;

      if (projectIds.length > 0) {
        const { data: myTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('status')
          .eq('assigned_to', user.id)
          .in('project_id', projectIds);

        if (tasksError) {
          console.warn('Dashboard fetch: failed to load worker tasks', tasksError);
          logWorkerEvent('warn', 'Failed to load worker tasks on dashboard', 'dashboard_fetch', {
            workerId: user.id,
            supabaseError: tasksError,
          });
        } else {
          const taskList = myTasks ?? [];
          pendingCount = taskList.filter(task => task.status !== 'completed').length;
        }

        selection = await selectNextProject({
          supabase,
          workerId: user.id,
          assignments: assignmentsData || [],
          projects: (projectsData || []) as Project[],
        });
      }

      // Calculate available task count per project
      const taskCounts: Record<string, number> = {};
      for (const project of (projectsData || [])) {
        const { data: countData, error: countError } = await supabase
          .rpc('count_claimable_questions', { p_project_id: project.id });

        if (countError) {
          console.warn('Dashboard fetch: failed to count claimable questions', project.id, countError);
          logWorkerEvent('warn', 'Failed to count claimable questions on dashboard', 'dashboard_fetch_count', {
            workerId: user.id,
            projectId: project.id,
            supabaseError: countError,
          });
          taskCounts[project.id] = 0;
        } else {
          taskCounts[project.id] = Number(countData ?? 0);
        }
      }

      setAssignments(assignmentsData || []);
      setProjects((projectsData || []) as Project[]);
      setPendingTasksCount(pendingCount);
      setActiveProjectState(selection?.project || null);
      setAvailableCount(selection?.availableCount || 0);
      setTrainingModule(selection?.trainingModule || null);
      setTrainingCompletionId(selection?.trainingCompletionId || null);
      setSelectionDetails(selection);
      setProjectTaskCounts(taskCounts);
    } catch (error) {
      console.error('Error fetching worker data:', error);
      logWorkerEvent('error', 'Error fetching worker dashboard data', 'dashboard_fetch', {
        workerId: user?.id,
        error: error instanceof Error ? error.message : 'unknown error',
      }, error instanceof Error ? error.stack : undefined);
      toast.error('Failed to load your assignments');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshMonthlyEarnings = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    setEarningsLoading(true);
    try {
      const { start, end } = getCurrentMonthRange();
      const summary = await calculateWorkerBalance(user.id, start, end);
      setMonthlyEarnings({
        amount: summary.total,
        currency: summary.currency,
      });
    } catch (error) {
      console.warn('WorkerDashboard: failed to load monthly earnings', error);
      setMonthlyEarnings({
        amount: 0,
        currency: null,
      });
    } finally {
      setEarningsLoading(false);
    }
  }, [user?.id]);

  const notifyAchievementUnlocks = useCallback((achievementNames: string[]) => {
    achievementNames.forEach((name) => {
      toast.success(`Achievement unlocked: ${name}`, {
        description: 'Check your achievements panel for the new badge.',
      });
    });
  }, []);

  const refreshQualityScore = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    setQualityLoading(true);
    try {
      const result = await calculateWorkerQualityScore(user.id, null);
      setQualityScore(result?.compositeScore ?? null);
      const newlyEarned = await checkWorkerAchievements(user.id);
      if (newlyEarned.length) {
        notifyAchievementUnlocks(newlyEarned);
      }
    } catch (error) {
      console.warn('WorkerDashboard: failed to load quality score', error);
      setQualityScore(null);
    } finally {
      setQualityLoading(false);
    }
  }, [notifyAchievementUnlocks, user?.id]);

  const handleScrollToAssignments = useCallback(() => {
    if (projectPanelRef.current) {
      projectPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    if (user) {
      installWorkerLogger();
      configureWorkerLogger({ workerId: user.id });
      fetchWorkerData();
    }
  }, [user, fetchWorkerData]);

  useEffect(() => {
    refreshMonthlyEarnings();
  }, [refreshMonthlyEarnings]);

useEffect(() => {
  refreshQualityScore();
}, [refreshQualityScore]);

useEffect(() => {
  if (!user?.id) return;
  getUnlockProgress(user.id)
    .then((progress) => setUnlockProgress(progress))
    .catch((unlockError) => {
      console.warn('WorkerDashboard: failed to load unlock progress', unlockError);
      setUnlockProgress(null);
    });
}, [user?.id]);

  const handleLaunchWorkbench = useCallback(() => {
    navigate('/w/workbench');
  }, [navigate]);

  const hasNextTask = availableCount > 0;
  const unlockedLevelLabel =
    unlockProgress?.unlockedLevels?.length
      ? unlockProgress.unlockedLevels.map((level) => formatDifficultyLabel(level)).join(', ')
      : 'Beginner';
  const nextUnlockLevelLabel = unlockProgress?.nextLevel ? formatDifficultyLabel(unlockProgress.nextLevel) : null;
  const remainingTasksLabel =
    unlockProgress?.nextLevel && unlockProgress.remainingTasks != null
      ? unlockProgress.remainingTasks > 0
        ? `${unlockProgress.remainingTasks} more tasks`
        : 'Task requirement met'
      : null;
  const completionPercent = unlockProgress?.completionPercent ?? 0;
  const requirementItems = useMemo(() => {
    if (!unlockProgress?.nextLevel) {
      return [];
    }
    const { requirements } = unlockProgress;
    return [
      {
        id: 'tasks',
        label: 'Tasks',
        met: !unlockProgress.remainingTasks || unlockProgress.remainingTasks <= 0,
        detail:
          unlockProgress.remainingTasks != null && unlockProgress.remainingTasks > 0
            ? `${unlockProgress.remainingTasks} remaining`
            : 'Requirement met',
      },
      {
        id: 'quality',
        label: 'Quality score',
        met:
          requirements.requiredQualityScore == null ||
          (requirements.qualityScore ?? 0) >= requirements.requiredQualityScore,
        detail:
          requirements.requiredQualityScore == null
            ? 'No minimum'
            : `${Math.round(requirements.qualityScore ?? 0)} / ${requirements.requiredQualityScore}%`,
      },
      {
        id: 'training',
        label: 'Training gate',
        met: !requirements.trainingGateRequired || requirements.trainingGatePassed,
        detail: requirements.trainingGateRequired
          ? requirements.trainingGatePassed
            ? 'Completed'
            : 'Incomplete'
          : 'Not required',
      },
      {
        id: 'assessment',
        label: 'Domain assessment',
        met: !requirements.domainAssessmentRequired || requirements.domainAssessmentPassed,
        detail: requirements.domainAssessmentRequired
          ? requirements.domainAssessmentPassed
            ? 'Passed'
            : 'Pending'
          : 'Not required',
      },
    ];
  }, [unlockProgress]);

  // Add Ctrl+Enter hotkey for Launch Tasks button
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (hasNextTask) {
          handleLaunchWorkbench();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNextTask, handleLaunchWorkbench]);

  const hasTraining = useMemo(() => Boolean(trainingModule), [trainingModule]);
  const isTrainingRequired = useMemo(() => Boolean(selectionDetails?.trainingRequired), [selectionDetails?.trainingRequired]);
  const isTrainingCompleted = useMemo(() => Boolean(selectionDetails?.trainingCompleted), [selectionDetails?.trainingCompleted]);
  const requiresTrainingCompletion = hasTraining && isTrainingRequired && !isTrainingCompleted;
  const summaryCards = useMemo<SummaryCardConfig[]>(() => {
    const earningsValue = earningsLoading
      ? 'Syncing…'
      : formatCurrencyValue(monthlyEarnings.amount, monthlyEarnings.currency);
    const qualityValue =
      qualityLoading || qualityScore == null
        ? (qualityLoading ? 'Syncing…' : '—')
        : qualityScore.toFixed(1);
    return [
      {
        id: 'projects',
        testId: 'worker-dashboard-card-projects',
        valueTestId: 'worker-dashboard-card-projects-value',
        label: 'Current projects',
        value: assignments.length.toString(),
        sublabel: assignments.length === 1 ? 'Active project' : 'Active projects',
        icon: Briefcase,
      },
      {
        id: 'earnings',
        testId: 'worker-dashboard-card-earnings',
        valueTestId: 'worker-dashboard-card-earnings-value',
        label: "This month's earnings",
        value: earningsValue,
        sublabel: monthlyEarnings.currency ?? undefined,
        icon: CircleDollarSign,
        loading: earningsLoading,
      },
      {
        id: 'tasks',
        testId: 'worker-dashboard-card-tasks',
        valueTestId: 'worker-dashboard-card-tasks-value',
        label: 'Pending tasks',
        value: pendingTasksCount.toString(),
        sublabel: 'Across assigned projects',
        icon: ClipboardList,
      },
      {
        id: 'quality',
        testId: 'worker-dashboard-card-quality',
        valueTestId: 'worker-dashboard-card-quality-value',
        label: 'Quality score',
        value: qualityValue,
        sublabel: qualityLoading ? 'Refreshing' : 'Composite score',
        icon: Sparkles,
        loading: qualityLoading,
      },
    ];
  }, [
    assignments.length,
    earningsLoading,
    monthlyEarnings.amount,
    monthlyEarnings.currency,
    pendingTasksCount,
    qualityLoading,
    qualityScore,
  ]);
  const quickActions = useMemo<QuickActionConfig[]>(() => [
    {
      id: 'assignments',
      testId: 'worker-dashboard-quick-action-assignments',
      label: 'View assignments',
      description: 'See your active projects',
      icon: ClipboardList,
      onClick: handleScrollToAssignments,
    },
    {
      id: 'training',
      testId: 'worker-dashboard-quick-action-training',
      label: 'View training',
      description: hasTraining ? 'Open assigned modules' : 'No required training',
      icon: BookOpen,
      onClick: () => setTrainingModalOpen(true),
      disabled: !hasTraining,
    },
    {
      id: 'messages',
      testId: 'worker-dashboard-quick-action-messages',
      label: 'Message manager',
      description: 'Open your inbox',
      icon: Mail,
      onClick: () => navigate('/w/messages/inbox'),
    },
    {
      id: 'earnings',
      testId: 'worker-dashboard-quick-action-earnings',
      label: 'View earnings',
      description: 'Jump to analytics',
      icon: CircleDollarSign,
      onClick: () => navigate('/w/analytics'),
    },
  ], [handleScrollToAssignments, hasTraining, navigate]);

  return (
    <TooltipProvider>
      <div className="bg-background">
        <div className="flex flex-col h-screen overflow-hidden mx-auto max-w-[1568px] border-x">
          {/* Subtle Header */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
            <div className="flex h-12 items-center justify-between px-6">
              {/* Left: Maestro */}
              <div className="font-semibold text-sm">PPH Maestro</div>
              
              {/* Center: Empty for now, as no active task for dashboard */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Worker Dashboard</span>
              </div>
              
              {/* Right: Empty for now */}{" "}
              {/* You could add a Profile/Settings link here if needed */}
              <div></div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto px-6 py-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
              </div>
            ) : (!assignments || assignments.length === 0) ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">No assignments available</h3>
                    <p className="text-muted-foreground">
                      You haven't been assigned to any projects yet.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : !activeProjectState ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <h3 className="text-xl font-semibold mb-2">All tasks completed</h3>
                  <p className="text-muted-foreground mb-4">
                    You've completed all available tasks in your assigned projects.
                  </p>
                  <div className="mt-6 space-y-3 max-w-md mx-auto">
                    <p className="text-sm font-medium text-left">Your assigned projects:</p>
                    {projects.map(project => (
                      <div key={project.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            project.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                          }`}></span>
                          <span className="text-sm">{project.name}</span>
                        </div>
                        <Badge variant="secondary">
                          {projectTaskCounts[project.id] ?? 0} available
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-6">
                    Contact your manager if you need additional assignments.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-3xl font-bold">Worker Dashboard</h1>
                    <p className="text-muted-foreground">Welcome back, {user?.full_name}</p>
                  </div>
                  {hasTraining && (
                    <div className="flex items-center gap-2">
                      <Badge variant={isTrainingCompleted ? 'default' : 'outline'}>
                        {isTrainingCompleted ? 'Training Complete' : 'Training Required'}
                      </Badge>
                      <Button
                        variant={requiresTrainingCompletion ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTrainingModalOpen(true)}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Training
                      </Button>
                    </div>
                  )}
                </div>

                {/* Summary metrics */}
                <div
                  className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
                  data-testid="worker-dashboard-summary-grid"
                >
                  {summaryCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <Card key={card.id} data-testid={card.testId}>
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs uppercase text-muted-foreground tracking-wide">
                                {card.label}
                              </p>
                              <p
                                className="text-2xl font-bold mt-1"
                                data-testid={card.valueTestId}
                              >
                                {card.value}
                              </p>
                              {card.sublabel && (
                                <p className="text-xs text-muted-foreground mt-1">{card.sublabel}</p>
                              )}
                            </div>
                            <Icon className="h-8 w-8 text-muted-foreground/70" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                </div>

                <div className="rounded-lg border p-5" data-testid="worker-dashboard-quick-actions">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold">Quick actions</h2>
                    <p className="text-sm text-muted-foreground">
                      Jump directly into the workflows you use most.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.id}
                          type="button"
                          data-testid={action.testId}
                          onClick={action.onClick}
                          disabled={action.disabled}
                          className="flex items-start justify-between rounded-lg border px-4 py-3 text-left transition hover:bg-muted disabled:opacity-50"
                        >
                          <div>
                            <p className="text-sm font-medium">{action.label}</p>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Card data-testid="worker-unlock-progress">
                  <CardContent className="space-y-4 py-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">Difficulty unlock progress</h2>
                        <p className="text-sm text-muted-foreground">
                          Unlock higher-paying tasks by keeping quality high and completing training.
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize" data-testid="worker-unlock-progress-badge">
                        {unlockedLevelLabel}
                      </Badge>
                    </div>
                    <div className="rounded-md border border-border/60 p-4">
                      {!unlockProgress ? (
                        <p className="text-sm text-muted-foreground">Syncing unlock progress…</p>
                      ) : nextUnlockLevelLabel ? (
                        <>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>
                              Next unlock:{' '}
                              <span className="font-medium text-foreground">{nextUnlockLevelLabel}</span>
                            </span>
                            <span>{remainingTasksLabel ?? 'Keep your quality score high'}</span>
                          </div>
                          <div
                            className="mt-3 h-2 rounded-full bg-muted"
                            data-testid="worker-unlock-progress-bar"
                            aria-label="Progress toward next difficulty"
                          >
                            <div
                              className="h-2 rounded-full bg-primary transition-all"
                              style={{ width: `${completionPercent}%` }}
                            />
                          </div>
                          {requirementItems.length ? (
                            <ul
                              className="mt-4 space-y-2 text-sm"
                              data-testid="worker-unlock-requirements"
                            >
                              {requirementItems.map((item) => (
                                <li
                                  key={item.id}
                                  className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium text-foreground">{item.label}</span>
                                    <span className="text-xs text-muted-foreground">{item.detail}</span>
                                  </div>
                                  <Badge variant={item.met ? 'secondary' : 'outline'} className="text-xs">
                                    {item.met ? 'Ready' : 'Pending'}
                                  </Badge>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          You already unlocked every difficulty. Great job!
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {user?.id ? (
                  <>
                    <WorkerQualitySummary workerId={user.id} onScoreUpdate={setQualityScore} />
                    <div ref={projectPanelRef}>
                      <ProjectVisibilityPanel workerId={user.id} />
                    </div>
                  </>
                ) : null}
                
                {/* Launch Section */}
                <Card>
                  <CardContent className="p-12 text-center">
                    {requiresTrainingCompletion ? (
                      <div className="space-y-4">
                        <Alert variant="default" className="mx-auto max-w-xl text-left">
                          <AlertTitle className="flex items-center gap-2 text-base">
                            <AlertCircle className="h-4 w-4" />
                            Complete required training
                          </AlertTitle>
                          <AlertDescription className="mt-1 text-sm text-muted-foreground">
                            Please complete the training module before launching tasks for this project.
                          </AlertDescription>
                        </Alert>
                        <div className="flex justify-center">
                          <Button size="lg" onClick={() => setTrainingModalOpen(true)}>
                            <BookOpen className="h-4 w-4 mr-2" />
                            Review Training
                          </Button>
                        </div>
                      </div>
                    ) : hasNextTask ? (
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Ready for next question?</h3>
                        <p className="text-muted-foreground mb-6">
                          You have {availableCount} questions available
                        </p>
                        <div className="flex justify-center items-center">
                          <Button onClick={handleLaunchWorkbench} size="lg">
                            Launch Tasks
                          </Button>
                          <Button
                            variant="outline"
                            size="lg"
                            className="ml-2"
                            onClick={async () => {
                              if (!selectionDetails?.project) {
                                toast.info('No project selected');
                                return;
                              }

                              console.log('Release & Refresh button clicked');
                              
                              const { data: tasks, error } = await supabase
                                .from('tasks')
                                .select('id, question_id, status, assigned_to, assigned_at')
                                .eq('assigned_to', user?.id)
                                .eq('project_id', selectionDetails.project.id)
                                .eq('status', 'assigned')
                                .limit(1);

                              if (error) {
                                console.error('Failed to check reservations', error);
                                toast.error('Failed to check reservations');
                                return;
                              }

                              console.log('Found tasks to release:', tasks);

                              if (!tasks?.length) {
                                console.log('No active reservations found');
                                toast.info('No active reservations to release');
                                return;
                              }

                              try {
                                console.log('Releasing task:', tasks[0].id);
                                await releaseTaskReservation(tasks[0].id);
                                console.log('Task released successfully from dashboard');
                                toast.success('Reservation released');
                                await fetchWorkerData();
                              } catch (releaseError) {
                                console.error('Failed to release reservation from dashboard', releaseError);
                                logWorkerEvent('error', 'Failed to release reservation from dashboard', 'release_reservation', {
                                  taskId: tasks[0].id,
                                  error: releaseError instanceof Error ? releaseError.message : String(releaseError)
                                });
                                toast.error('Failed to release reservation');
                              }
                            }}
                          >
                            Release & Refresh
                          </Button>
                          {renderKeyboardShortcut()}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-xl font-semibold mb-2">No questions available</h3>
                        <p className="text-muted-foreground">
                          All tasks in your assigned projects are currently completed or in progress.
                          Check back soon for new tasks.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </main>

          {/* Footer */}
          <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
            <div className="flex h-12 items-center justify-between px-6">
              {/* Left: Analytics & Messages */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/w/analytics')}
                >
                  <BarChart className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/w/messages/inbox')}
                  className="relative"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Messages
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </div>

              {/* Center: Empty for dashboard */}
              <div></div>

              {/* Right: Logout & Version */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
                <div className="ml-2">
                  <VersionTracker />
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {trainingModule && activeProjectState && user && selectionDetails && (
        <TrainingModal
          training={trainingModule}
          projectId={activeProjectState.id}
          workerId={user.id}
          isRequired={Boolean(selectionDetails.trainingRequired)}
          open={trainingModalOpen}
          onOpenChange={setTrainingModalOpen}
          onComplete={fetchWorkerData}
          isCompleted={Boolean(selectionDetails.trainingCompleted)}
        />
      )}
    </TooltipProvider>
  );
};

export default WorkerDashboard;
