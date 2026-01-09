import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle, MoreHorizontal, Pencil, BookOpen, Award, RotateCcw, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/status/StatusBadge';
import { BGCStatusIcon } from '@/components/status/BGCStatusIcon';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ReplaceAccountModal } from '@/components/worker/ReplaceAccountModal';
import { RemoveAssignmentModal } from '@/components/worker/RemoveAssignmentModal';
import { AssignToProjectModal } from '@/components/worker/AssignToProjectModal';
import { calculateWorkerBalance, getBalanceBreakdown } from '@/services/balanceService';
import type { BalanceBreakdownItem } from '@/services/balanceService';
import { listAvailableQualifications, listExpiringQualifications, listWorkerQualifications } from '@/services/qualificationService';
import type { QualificationDefinition, WorkerQualification } from '@/services/qualificationService';

const WORKER_DETAIL_SELECT = `
  id,
  hr_id,
  full_name,
  engagement_model,
  worker_role,
  status,
  email_personal,
  email_pph,
  country_residence,
  locale_primary,
  locale_all,
  hire_date,
  rtw_datetime,
  termination_date,
  bgc_expiration_date,
  created_at,
  created_by,
  updated_at,
  updated_by,
  supervisor: supervisor_id (
    id,
    full_name,
    hr_id
  ),
  worker_accounts (
    worker_id,
    id,
    worker_account_email,
    worker_account_id,
    platform_type,
    status,
    is_current,
    activated_at,
    deactivated_at,
    deactivation_reason
  ),
  worker_assignments (
    id,
    project_id,
    assigned_at,
    assigned_by,
    removed_at,
    removed_by,
    project: projects (
      id,
      project_code,
      project_name,
      status,
      department: departments (
        id,
        department_name,
        department_code
      )
    )
  )
`;

type WorkerAccountRecord = {
  worker_id: string;
  id: string;
  worker_account_email: string;
  worker_account_id: string;
  platform_type: string;
  status: string;
  is_current: boolean;
  activated_at: string;
  deactivated_at?: string | null;
  deactivation_reason?: string | null;
};

type WorkerAssignmentRecord = {
  id: string;
  project_id: string;
  assigned_at: string;
  assigned_by?: string | null;
  removed_at?: string | null;
  removed_by?: string | null;
  project: {
    id: string;
    project_code: string;
    project_name: string;
    status: string;
    department?: {
      id: string;
      department_name: string;
      department_code: string;
    } | null;
  } | null;
};

type WorkerDetailRecord = {
  id: string;
  hr_id: string;
  full_name: string;
  engagement_model: string;
  worker_role?: string | null;
  status: string;
  email_personal: string;
  email_pph?: string | null;
  country_residence: string;
  locale_primary: string;
  locale_all: string[];
  hire_date: string;
  rtw_datetime?: string | null;
  termination_date?: string | null;
  bgc_expiration_date?: string | null;
  created_at: string;
  created_by?: string | null;
  updated_at: string;
  updated_by?: string | null;
  supervisor?: {
    id: string;
    full_name: string;
    hr_id: string;
  } | null;
  worker_accounts: WorkerAccountRecord[];
  worker_assignments: WorkerAssignmentRecord[];
};

type ProfileItem = {
  key: string;
  label: string;
  value: React.ReactNode | string | null;
  editKey?: string;
};

type InlineEditableField = {
  key: string;
  label: string;
  field: keyof WorkerDetailRecord;
  type: 'text' | 'email' | 'date';
  description: string;
  getInitialValue: (worker: WorkerDetailRecord) => string;
  transformValue?: (value: string) => string | null;
  required?: boolean;
};

type EarningsSummaryState = {
  total: number;
  month: number;
  quarter: number;
  currency: string | null;
};

type WorkerTrainingMaterialRow = {
  id: string;
  title: string;
  projectName: string;
  status: string;
  completedAt: string | null;
  score: number | null;
};

type WorkerTrainingGateRow = {
  id: string;
  gate_name: string;
  status: string;
  attempt_count: number;
  score: number | null;
  projectName: string;
};

const formatEnumLabel = (value?: string | null) =>
  value
    ? value
        .toString()
        .split('_')
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ')
    : null;

const formatDate = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Invalid date';
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parsed);
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Invalid date';
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsed);
};

const toISODate = (date: Date) => date.toISOString().slice(0, 10);

const formatCurrencyDisplay = (value: number, currency: string | null) => {
  if (!currency) {
    return value.toLocaleString();
  }
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return value.toLocaleString();
  }
};

const trainingGateStatusVariant = (status: string) => {
  switch (status) {
    case 'passed':
      return 'success';
    case 'failed':
      return 'destructive';
    case 'in_progress':
      return 'secondary';
    default:
      return 'outline';
  }
};

const defaultTrainingState: {
  materials: WorkerTrainingMaterialRow[];
  gates: WorkerTrainingGateRow[];
} = {
  materials: [],
  gates: []
};

export const WorkerDetail: React.FC = () => {
  const { id: workerId } = useParams<{ id: string }>();
  const [worker, setWorker] = useState<WorkerDetailRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReplaceModalOpen, setReplaceModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<WorkerAccountRecord | null>(null);
  const [isRemoveModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<WorkerAssignmentRecord | null>(null);
  const [isAssignModalOpen, setAssignModalOpen] = useState(false);
  const [inlineEditTarget, setInlineEditTarget] = useState<InlineEditableField | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');
  const [isInlineEditSaving, setIsInlineEditSaving] = useState<boolean>(false);
  const [earningsSummary, setEarningsSummary] = useState<EarningsSummaryState>({
    total: 0,
    month: 0,
    quarter: 0,
    currency: null
  });
  const [earningsBreakdown, setEarningsBreakdown] = useState<BalanceBreakdownItem[]>([]);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);
  const [workerTrainingMaterials, setWorkerTrainingMaterials] = useState<WorkerTrainingMaterialRow[]>([]);
  const [workerTrainingGates, setWorkerTrainingGates] = useState<WorkerTrainingGateRow[]>([]);
  const [workerInvoices, setWorkerInvoices] = useState<Array<{
    id: string;
    total_amount: number;
    status: string;
    period_start: string;
    period_end: string;
  }>>([]);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);
  const [workerInterviews, setWorkerInterviews] = useState<
    Array<{
      id: string;
      domain: string;
      score: number;
      confidence: number;
      conducted_at: string;
    }>
  >([]);
  const [isInterviewsLoading, setIsInterviewsLoading] = useState(false);
  const [workerQualifications, setWorkerQualifications] = useState<WorkerQualification[]>([]);
  const [availableQualifications, setAvailableQualifications] = useState<QualificationDefinition[]>([]);
  const [expiringQualifications, setExpiringQualifications] = useState<WorkerQualification[]>([]);
  const [isQualificationsLoading, setIsQualificationsLoading] = useState(false);
  const [qualificationError, setQualificationError] = useState<string | null>(null);
  const [isTrainingLoading, setIsTrainingLoading] = useState(false);
  const [gateActionId, setGateActionId] = useState<string | null>(null);
  const activeAssignments = useMemo(
    () => (worker ? worker.worker_assignments.filter((assignment) => !assignment.removed_at) : []),
    [worker]
  );
  const pendingQualifications = useMemo(() => {
    if (!availableQualifications.length) {
      return [];
    }
    const completedNames = new Set(
      workerQualifications.map((qualification) => qualification.name.toLowerCase())
    );
    return availableQualifications.filter(
      (qualification) => !completedNames.has(qualification.name.toLowerCase())
    );
  }, [availableQualifications, workerQualifications]);

  const interviewTierRecommendation = useMemo(() => {
    if (!workerInterviews.length) {
      return null;
    }
    const topScore = Math.max(...workerInterviews.map((interview) => Number(interview.score) || 0));
    if (topScore >= 4.5) {
      return 'Interview performance qualifies this worker for Tier 2 consideration.';
    }
    if (topScore >= 4.0) {
      return 'Consistent interview scores meet Tier 1 thresholds.';
    }
    return null;
  }, [workerInterviews]);

  const fetchWorker = useCallback(async () => {
    if (!workerId) {
      setError('Missing worker identifier.');
      setWorker(null);
      setIsLoading(false);
      fetchTrainingData(null).catch((unexpected) => console.error('Training data reset error:', unexpected));
      fetchInvoices(null).catch((invoiceError) => console.error('Invoice reset error:', invoiceError));
      fetchInterviews(null).catch((interviewError) => console.error('Interview reset error:', interviewError));
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('workers')
      .select(WORKER_DETAIL_SELECT)
      .eq('id', workerId)
      .maybeSingle();

    if (queryError) {
      setError(queryError.message ?? 'Unable to load worker right now.');
      setWorker(null);
      fetchTrainingData(null).catch((trainingError) => console.error('Training data reset error:', trainingError));
      fetchInvoices(null).catch((invoiceError) => console.error('Invoice reset error:', invoiceError));
      fetchInterviews(null).catch((interviewError) => console.error('Interview reset error:', interviewError));
    } else if (!data) {
      setError('Worker not found or access restricted.');
      setWorker(null);
      fetchTrainingData(null).catch((trainingError) => console.error('Training data reset error:', trainingError));
      fetchInvoices(null).catch((invoiceError) => console.error('Invoice reset error:', invoiceError));
      fetchInterviews(null).catch((interviewError) => console.error('Interview reset error:', interviewError));
    } else {
      const workerRecord = data as unknown as WorkerDetailRecord;
      setWorker(workerRecord);
      fetchTrainingData(workerRecord).catch((trainingError) => {
        console.error('Training fetch error:', trainingError);
      });
      fetchInvoices(workerRecord.id).catch((invoiceError) => {
        console.error('Invoice fetch error:', invoiceError);
      });
      fetchInterviews(workerRecord.id).catch((interviewError) => {
        console.error('Interview fetch error:', interviewError);
      });
    }
    setIsLoading(false);
  }, [workerId, fetchTrainingData, fetchInvoices, fetchInterviews]);

  const fetchQualifications = useCallback(
    async (workerIdValue: string | undefined | null) => {
      if (!workerIdValue) {
        setWorkerQualifications([]);
        setAvailableQualifications([]);
        setExpiringQualifications([]);
        return;
      }

      setIsQualificationsLoading(true);
      setQualificationError(null);
      try {
        const [completed, available, expiring] = await Promise.all([
          listWorkerQualifications(workerIdValue),
          listAvailableQualifications(),
          listExpiringQualifications(workerIdValue, 30),
        ]);
        setWorkerQualifications(completed);
        setAvailableQualifications(available);
        setExpiringQualifications(expiring);
      } catch (qualificationException) {
        console.error('WorkerDetail: failed to load qualifications', qualificationException);
        setQualificationError('Unable to load qualifications right now.');
        toast.error('Unable to load qualifications');
      } finally {
        setIsQualificationsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchWorker().catch((unexpected) => {
      const message =
        unexpected instanceof Error ? unexpected.message : 'Unexpected error while fetching worker.';
      setError(message);
      setWorker(null);
      setIsLoading(false);
    });
  }, [fetchWorker]);

  useEffect(() => {
    fetchQualifications(worker?.id ?? null).catch((qualificationError) => {
      console.error('WorkerDetail: qualifications load error', qualificationError);
    });
  }, [worker?.id, fetchQualifications]);

  useEffect(() => {
    if (!workerId) {
      setEarningsSummary({ total: 0, month: 0, quarter: 0, currency: null });
      setEarningsBreakdown([]);
      return;
    }

    let active = true;
    const fetchEarnings = async () => {
      setIsLoadingEarnings(true);
      try {
        const today = new Date();
        const endIso = toISODate(today);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startQuarterMonth = Math.floor(today.getMonth() / 3) * 3;
        const startOfQuarter = new Date(today.getFullYear(), startQuarterMonth, 1);

        const [totalAllTime, totalMonth, totalQuarter, breakdown] = await Promise.all([
          calculateWorkerBalance(workerId, '1970-01-01', endIso),
          calculateWorkerBalance(workerId, toISODate(startOfMonth), endIso),
          calculateWorkerBalance(workerId, toISODate(startOfQuarter), endIso),
          getBalanceBreakdown(workerId, toISODate(startOfQuarter), endIso)
        ]);

        if (!active) {
          return;
        }

        setEarningsSummary({
          total: totalAllTime.total,
          month: totalMonth.total,
          quarter: totalQuarter.total,
          currency: totalAllTime.currency ?? totalMonth.currency ?? totalQuarter.currency ?? null
        });
        setEarningsBreakdown(breakdown.breakdown);
      } catch (unexpected) {
        if (active) {
          const message =
            unexpected instanceof Error
              ? unexpected.message
              : 'Unable to load earnings summary right now.';
          toast.error(message);
          setEarningsSummary({ total: 0, month: 0, quarter: 0, currency: null });
          setEarningsBreakdown([]);
        }
      } finally {
        if (active) {
          setIsLoadingEarnings(false);
        }
      }
    };

    void fetchEarnings();

    return () => {
      active = false;
    };
  }, [workerId, toast]);

  const currentAccount = useMemo(
    () => worker?.worker_accounts?.find((account) => account.is_current) ?? null,
    [worker]
  );

  const statusActionLabel = worker?.status === 'active' ? 'Deactivate' : 'Reactivate';

  const handleEdit = () => {
    if (!worker) {
      return;
    }
    toast.info('Edit worker coming soon', {
      description: `The edit workflow for ${worker.full_name} is in development.`
    });
  };

  const handleToggleStatus = () => {
    if (!worker) {
      return;
    }
    toast.info(`${statusActionLabel} worker`, {
      description: `Status changes for ${worker.full_name} will be available soon.`
    });
  };

  const handleMoreAction = (action: string) => {
    if (!worker) {
      return;
    }
    toast.info(`${action} (coming soon)`, {
      description: `This action for ${worker.full_name} is planned for a future release.`
    });
  };

  const currentWorkerEmail =
    currentAccount?.worker_account_email ??
    worker?.email_pph ??
    worker?.email_personal ??
    null;

  const currentEmailPlatform = currentAccount
    ? currentAccount.platform_type
    : worker?.email_pph
      ? 'PPH'
      : 'Personal';

  const earningsCards = useMemo(
    () => [
      {
        id: 'total',
        label: 'Total balance',
        value: formatCurrencyDisplay(earningsSummary.total, earningsSummary.currency)
      },
      {
        id: 'month',
        label: 'This month',
        value: formatCurrencyDisplay(earningsSummary.month, earningsSummary.currency)
      },
      {
        id: 'quarter',
        label: 'This quarter',
        value: formatCurrencyDisplay(earningsSummary.quarter, earningsSummary.currency)
      }
    ],
    [earningsSummary]
  );

  const openReplaceModal = (account: WorkerAccountRecord) => {
    setSelectedAccount(account);
    setReplaceModalOpen(true);
  };

  const handleCloseReplaceModal = () => {
    setReplaceModalOpen(false);
    setSelectedAccount(null);
  };

  const handleReplaceSuccess = () => {
    handleCloseReplaceModal();
    fetchWorker();
  };

  const activeAssignments = useMemo(
    () => (worker ? worker.worker_assignments.filter((assignment) => !assignment.removed_at) : []),
    [worker]
  );

  const openRemoveModal = (assignment: WorkerAssignmentRecord) => {
    setSelectedAssignment(assignment);
    setRemoveModalOpen(true);
  };

  const handleCloseRemoveModal = () => {
    setRemoveModalOpen(false);
    setSelectedAssignment(null);
  };

  const handleRemoveSuccess = () => {
    handleCloseRemoveModal();
    fetchWorker();
  };

  const handleOpenAssignModal = () => setAssignModalOpen(true);

  const handleCloseAssignModal = () => setAssignModalOpen(false);

  const handleAssignSuccess = () => {
    handleCloseAssignModal();
    fetchWorker();
  };

  const handleResetGate = useCallback(
    async (gateId: string) => {
      if (!worker) {
        return;
      }
      const gateRecord = workerTrainingGates.find((gate) => gate.id === gateId);
      setGateActionId(gateId);
      try {
        const nextAttempts = (gateRecord?.attempt_count ?? 0) + 1;
        const { error } = await supabase
          .from('training_gates')
          .update({
            status: 'in_progress',
            attempt_count: nextAttempts,
            passed_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', gateId);
        if (error) throw error;
        toast.success('Gate reset for retake');
        fetchTrainingData(worker).catch((trainingError) => console.error('Training refresh error:', trainingError));
      } catch (error) {
        console.error('Failed to reset gate:', error);
        toast.error('Unable to reset gate');
      } finally {
        setGateActionId(null);
      }
    },
    [worker, workerTrainingGates, fetchTrainingData]
  );

  const editableProfileFields = useMemo<InlineEditableField[]>(
    () => [
      {
        key: 'personal-email',
        label: 'Personal Email',
        field: 'email_personal',
        type: 'email',
        description: "Update the worker's personal contact email address.",
        required: true,
        getInitialValue: (record) => record.email_personal ?? '',
        transformValue: (value) => value.trim()
      },
      {
        key: 'pph-email',
        label: 'PPH Email',
        field: 'email_pph',
        type: 'email',
        description: "Update the worker's PPH email address used for Maestro communications.",
        required: false,
        getInitialValue: (record) => record.email_pph ?? '',
        transformValue: (value) => {
          const trimmed = value.trim();
          return trimmed.length === 0 ? null : trimmed;
        }
      },
      {
        key: 'worker-role',
        label: 'Worker Role',
        field: 'worker_role',
        type: 'text',
        description: "Set the worker's role label as it appears in dashboards.",
        required: false,
        getInitialValue: (record) => record.worker_role ?? '',
        transformValue: (value) => {
          const trimmed = value.trim();
          return trimmed.length === 0 ? null : trimmed;
        }
      },
      {
        key: 'country',
        label: 'Country of Residence',
        field: 'country_residence',
        type: 'text',
        description: "Update the worker's primary country of residence.",
        required: true,
        getInitialValue: (record) => record.country_residence ?? '',
        transformValue: (value) => value.trim()
      }
    ],
    []
  );

  const openInlineEdit = useCallback(
    (key: string) => {
      if (!worker) {
        return;
      }
      const target = editableProfileFields.find((field) => field.key === key);
      if (!target) {
        return;
      }
      setInlineEditTarget(target);
      setInlineEditValue(target.getInitialValue(worker));
      setIsInlineEditSaving(false);
    },
    [editableProfileFields, worker]
  );

  const handleCloseInlineEdit = useCallback(() => {
    setInlineEditTarget(null);
    setInlineEditValue('');
    setIsInlineEditSaving(false);
  }, []);

  const handleInlineEditSubmit = useCallback(async () => {
    if (!inlineEditTarget || !workerId) {
      return;
    }

    const transformed =
      inlineEditTarget.transformValue?.(inlineEditValue) ?? inlineEditValue.trim();
    if (inlineEditTarget.required && (!transformed || transformed.length === 0)) {
      toast.error(`${inlineEditTarget.label} is required.`, {
        description: 'Please provide a value before saving.'
      });
      return;
    }

    setIsInlineEditSaving(true);

    try {
      const updates: Record<string, string | null> = {
        [inlineEditTarget.field]: transformed ?? null
      };

      const { error: updateError } = await supabase
        .from('workers')
        .update(updates)
        .eq('id', workerId);

      if (updateError) {
        throw updateError;
      }

      toast.success('Worker profile updated', {
        description: `${inlineEditTarget.label} was updated successfully.`
      });

      handleCloseInlineEdit();
      await fetchWorker();
    } catch (updateIssue) {
      const message =
        updateIssue instanceof Error
          ? updateIssue.message
          : 'Unable to save inline edit right now.';
      toast.error('Inline edit failed', {
        description: message
      });
    } finally {
      setIsInlineEditSaving(false);
    }
  }, [fetchWorker, handleCloseInlineEdit, inlineEditTarget, inlineEditValue, workerId]);

  const profileItems = useMemo<ProfileItem[]>(() => {
    if (!worker) {
      return [];
    }

    const additionalLocales = worker.locale_all.filter(
      (locale) => locale && locale !== worker.locale_primary
    );
    const supervisorLink =
      worker.supervisor && worker.supervisor.id ? (
        <Link
          to={`/m/workers/${worker.supervisor.id}`}
          className="text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
        >
          {worker.supervisor.full_name}
        </Link>
      ) : null;

    return [
      {
        key: 'current-email',
        label: 'Current Worker Email',
        value: currentWorkerEmail ? (
          <div className="flex flex-wrap items-center gap-2">
            <span>{currentWorkerEmail}</span>
            <Badge variant="outline" className="capitalize">
              {formatEnumLabel(currentEmailPlatform)}
            </Badge>
          </div>
        ) : null
      },
      {
        key: 'personal-email',
        label: 'Personal Email',
        value: worker.email_personal,
        editKey: 'personal-email'
      },
      {
        key: 'pph-email',
        label: 'PPH Email',
        value: worker.email_pph,
        editKey: 'pph-email'
      },
      {
        key: 'worker-role',
        label: 'Worker Role',
        value: worker.worker_role,
        editKey: 'worker-role'
      },
      {
        key: 'engagement-model',
        label: 'Engagement Model',
        value: formatEnumLabel(worker.engagement_model)
      },
      {
        key: 'supervisor',
        label: 'Supervisor',
        value: supervisorLink
      },
      {
        key: 'country',
        label: 'Country of Residence',
        value: worker.country_residence,
        editKey: 'country'
      },
      {
        key: 'primary-locale',
        label: 'Primary Locale',
        value: worker.locale_primary
      },
      {
        key: 'additional-locales',
        label: 'Additional Locales',
        value:
          additionalLocales.length > 0
            ? additionalLocales.join(', ')
            : null
      },
      {
        key: 'hire-date',
        label: 'Hire Date',
        value: formatDate(worker.hire_date)
      },
      {
        key: 'rtw',
        label: 'Ready-to-Work Date',
        value: formatDateTime(worker.rtw_datetime)
      },
      {
        key: 'bgc-expiration',
        label: 'BGC Expiration',
        value: formatDate(worker.bgc_expiration_date)
      },
      {
        key: 'termination-date',
        label: 'Termination Date',
        value: formatDate(worker.termination_date)
      },
      {
        key: 'created-at',
        label: 'Created At',
        value: formatDateTime(worker.created_at)
      },
      {
        key: 'updated-at',
        label: 'Last Updated',
        value: formatDateTime(worker.updated_at)
      }
    ];
  }, [currentEmailPlatform, currentWorkerEmail, worker]);

  return (
    <div data-testid="worker-detail-page" className="min-h-full">
      <div className="container mx-auto py-6">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 rounded-md border border-border/60 bg-muted/20 p-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading worker profile…</span>
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <p className="mt-2 text-xs text-destructive/80">
              Try refreshing the page or return to the Workers list to pick another record.
            </p>
          </div>
        ) : worker ? (
          <div className="space-y-6">
            <header className="flex flex-col gap-4 border-b border-border/60 pb-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <nav
                  aria-label="Breadcrumb"
                  data-testid="worker-detail-breadcrumb"
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Link
                    to="/m/workers"
                    className="font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    Workers
                  </Link>
                  <span aria-hidden="true" className="text-muted-foreground/60">
                    /
                  </span>
                  <span className="font-medium text-foreground">{worker.full_name}</span>
                </nav>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1
                      className="text-3xl font-semibold tracking-tight"
                      data-testid="worker-detail-title"
                    >
                      {worker.full_name}
                    </h1>
                    <span data-testid="worker-detail-status">
                      <StatusBadge status={worker.status} />
                    </span>
                    <BGCStatusIcon expirationDate={worker.bgc_expiration_date ?? null} />
                  </div>
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
                    data-testid="worker-detail-metadata"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span>HR ID {worker.hr_id}</span>
                      <span aria-hidden="true">•</span>
                      <span>{worker.engagement_model.toUpperCase()}</span>
                      <span aria-hidden="true">•</span>
                      <span>{worker.country_residence}</span>
                      <span aria-hidden="true">•</span>
                      <span>
                        {activeAssignments.length} active assignment{activeAssignments.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/80">
                      The header metadata should summarize assignment count, location, and engagement context.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2" data-testid="worker-detail-actions">
                <Button
                  variant="outline"
                  onClick={handleToggleStatus}
                  data-testid="worker-detail-toggle-status"
                >
                  {statusActionLabel}
                </Button>
                <Button onClick={handleEdit} data-testid="worker-detail-edit">
                  Edit Worker
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild data-testid="worker-detail-more-actions">
                    <Button variant="outline" size="icon" aria-label="More worker actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleMoreAction('Terminate worker')}>
                      Terminate worker
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMoreAction('Change supervisor')}>
                      Change supervisor
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMoreAction('Reset credentials')}>
                      Reset credentials
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            <section data-testid="worker-detail-profile" className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Profile overview</h2>
                <p className="text-sm text-muted-foreground">
                  Core employment metadata, contact details, and compliance checkpoints.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {profileItems.map((item) => (
                  <Card key={item.key} className="border-border/60">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {item.label}
                        </p>
                        {item.editKey ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            aria-label={`Edit ${item.label}`}
                            onClick={() => openInlineEdit(item.editKey!)}
                            data-testid={`worker-detail-inline-edit-${item.editKey}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                      <div className="mt-2 text-sm font-medium text-foreground">
                        {item.value ?? <span className="text-muted-foreground">Not set</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section data-testid="worker-detail-tabs" className="space-y-4">
              <Tabs defaultValue="accounts" className="w-full">
                <TabsList className="flex w-full flex-wrap gap-2 border-b border-border/60 bg-transparent p-0">
                  <TabsTrigger value="accounts" className="rounded-t-md border border-border/60 px-4 py-2 text-sm">
                    Accounts
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="rounded-t-md border border-border/60 px-4 py-2 text-sm">
                    Projects
                  </TabsTrigger>
                  <TabsTrigger value="training" className="rounded-t-md border border-border/60 px-4 py-2 text-sm">
                    Training
                  </TabsTrigger>
                  <TabsTrigger value="qualifications" className="rounded-t-md border border-border/60 px-4 py-2 text-sm">
                    Qualifications
                  </TabsTrigger>
                  <TabsTrigger value="earnings" className="rounded-t-md border border-border/60 px-4 py-2 text-sm">
                    Earnings
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="rounded-t-md border border-border/60 px-4 py-2 text-sm">
                    Activity
                  </TabsTrigger>
                  <TabsTrigger
                    value="invoices"
                    data-testid="worker-detail-tab-invoices"
                    className="rounded-t-md border border-border/60 px-4 py-2 text-sm"
                  >
                    Invoices
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="accounts">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Platform Accounts</h3>
                      <p className="text-sm text-muted-foreground">
                        Review linked platform credentials and manage replacements or history.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      data-testid="worker-accounts-add"
                      onClick={() =>
                        toast.info('Add account coming soon', {
                          description: 'Bulk and manual account provisioning flows will land here.'
                        })
                      }
                    >
                      Add Account
                    </Button>
                  </div>
                  <div className="mt-4 rounded-md border border-dashed border-border/60 bg-muted/10 p-6 text-sm text-muted-foreground">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Platform</TableHead>
                          <TableHead>Account Email</TableHead>
                          <TableHead>Account ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Current</TableHead>
                          <TableHead>Activated</TableHead>
                          <TableHead>Deactivated</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {worker.worker_accounts.length > 0 ? (
                          worker.worker_accounts.map((account) => (
                            <TableRow key={account.id} data-testid="worker-account-row">
                              <TableCell className="font-medium">
                                {formatEnumLabel(account.platform_type) ?? 'Unknown'}
                              </TableCell>
                              <TableCell>{account.worker_account_email}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {account.worker_account_id}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {formatEnumLabel(account.status) ?? 'Unknown'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {account.is_current ? (
                                  <Badge variant="default">Current</Badge>
                                ) : (
                                  <Badge variant="outline">Historic</Badge>
                                )}
                              </TableCell>
                              <TableCell>{formatDateTime(account.activated_at) ?? '—'}</TableCell>
                              <TableCell>{formatDateTime(account.deactivated_at) ?? '—'}</TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      Manage
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Account actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        toast.info('View details coming soon', {
                                          description: `Detailed account profile for ${account.worker_account_email}.`
                                        });
                                      }}
                                    >
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={!account.is_current}
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        if (!account.is_current) {
                                          toast.info('Only current accounts can be replaced.');
                                          return;
                                        }
                                        openReplaceModal(account);
                                      }}
                                    >
                                      Replace Account
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        toast.info('View history coming soon', {
                                          description: 'Deactivation trail and credential changes will appear here.'
                                        });
                                      }}
                                    >
                                      View History
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow data-testid="worker-accounts-empty">
                            <TableCell
                              colSpan={8}
                              className="py-6 text-center text-sm text-muted-foreground"
                            >
                              No platform accounts have been linked yet. Use &ldquo;Add Account&rdquo; to connect the
                              first credential.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
                <TabsContent value="training">
                  <div className="space-y-6">
                    <Card data-testid="worker-training-materials" className="border-border/60">
                      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            Training Materials
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Modules linked to the worker&apos;s active projects and their completion status.
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {isTrainingLoading ? (
                          <div className="flex items-center justify-center py-10 text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading training materials…
                          </div>
                        ) : workerTrainingMaterials.length === 0 ? (
                          <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-muted-foreground">
                            No project-linked training materials detected for this worker.
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Material</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Completed</TableHead>
                                <TableHead>Score</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {workerTrainingMaterials.map((material) => (
                                <TableRow key={`${material.id}-${material.projectName}`}>
                                  <TableCell className="font-medium">{material.title}</TableCell>
                                  <TableCell>{material.projectName}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        material.status === 'passed'
                                          ? 'success'
                                          : material.status === 'failed'
                                            ? 'destructive'
                                            : 'outline'
                                      }
                                      className="capitalize"
                                    >
                                      {material.status.replace('_', ' ')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{material.completedAt ? formatDateTime(material.completedAt) : '—'}</TableCell>
                                  <TableCell>{material.score ?? '—'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>

                    <Card data-testid="worker-training-gates" className="border-border/60">
                      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            Training Gates
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Gate progress for project onboarding requirements.
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {isTrainingLoading ? (
                          <div className="flex items-center justify-center py-10 text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading gate progress…
                          </div>
                        ) : workerTrainingGates.length === 0 ? (
                          <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-muted-foreground">
                            No training gates assigned to this worker.
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Gate</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Attempts</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {workerTrainingGates.map((gate) => (
                                <TableRow key={gate.id}>
                                  <TableCell className="font-medium">{gate.gate_name}</TableCell>
                                  <TableCell>{gate.projectName}</TableCell>
                                  <TableCell>
                                    <Badge variant={trainingGateStatusVariant(gate.status)} className="capitalize">
                                      {gate.status.replace('_', ' ')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{gate.attempt_count}</TableCell>
                                  <TableCell>{gate.score ?? '—'}</TableCell>
                                  <TableCell>
                                    {gate.status === 'failed' ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleResetGate(gate.id)}
                                        disabled={gateActionId === gate.id}
                                      >
                                        <RotateCcw className="mr-1 h-4 w-4" />
                                        Allow Retake
                                      </Button>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="qualifications">
                  <div className="space-y-6" data-testid="worker-detail-qualifications">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Qualifications Overview</h3>
                      <p className="text-sm text-muted-foreground">
                        Review completed assessments and discover which qualifications unlock higher tier work.
                      </p>
                    </div>

                    <Card data-testid="worker-detail-qualifications-completed" className="border-border/60">
                      <CardHeader>
                        <CardTitle>Completed qualifications</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Scores, submission dates, and expiration windows for each assessment.
                        </p>
                      </CardHeader>
                      <CardContent>
                        {isQualificationsLoading ? (
                          <div className="flex items-center justify-center py-10 text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading qualifications…
                          </div>
                        ) : qualificationError ? (
                          <p className="text-sm text-destructive">{qualificationError}</p>
                        ) : workerQualifications.length === 0 ? (
                          <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-muted-foreground">
                            No qualifications recorded yet. Encourage the worker to take their first assessment.
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Qualification</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Taken</TableHead>
                                <TableHead>Expires</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {workerQualifications.map((qualification) => (
                                <TableRow key={qualification.id}>
                                  <TableCell className="font-medium">{qualification.name}</TableCell>
                                  <TableCell>{qualification.score != null ? `${qualification.score}%` : '—'}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={qualification.passed ? 'success' : 'outline'}
                                      className="capitalize"
                                    >
                                      {qualification.passed ? 'Passed' : 'In review'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{qualification.takenAt ? formatDate(qualification.takenAt) : '—'}</TableCell>
                                  <TableCell>
                                    {qualification.expiresAt ? formatDate(qualification.expiresAt) : 'No expiration'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>

                    <Card data-testid="worker-detail-qualifications-renewal" className="border-border/60">
                      <CardHeader>
                        <CardTitle>Renewal Required</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Expiring soon qualifications that need re-validation to maintain access.
                        </p>
                      </CardHeader>
                      <CardContent>
                        {isQualificationsLoading ? (
                          <div className="flex items-center justify-center py-8 text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Checking expiration windows…
                          </div>
                        ) : expiringQualifications.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No expiring qualifications within the next 30 days.</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Qualification</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {expiringQualifications.map((qualification) => (
                                <TableRow key={`expiring-${qualification.id}`}>
                                  <TableCell className="font-medium">{qualification.name}</TableCell>
                                  <TableCell>{qualification.expiresAt ? formatDate(qualification.expiresAt) : '—'}</TableCell>
                                  <TableCell>
                                    <Badge variant="destructive">Expiring soon</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>

                    <Card data-testid="worker-detail-qualifications-available" className="border-border/60">
                      <CardHeader>
                        <CardTitle>Available qualifications</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Training or assessments the worker can pursue next to unlock more work.
                        </p>
                      </CardHeader>
                      <CardContent>
                        {isQualificationsLoading ? (
                          <div className="flex items-center justify-center py-10 text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Syncing available qualifications…
                          </div>
                        ) : pendingQualifications.length === 0 ? (
                          <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-muted-foreground">
                            All published qualifications are currently complete.
                          </div>
                        ) : (
                          <ul className="space-y-3">
                            {pendingQualifications.map((qualification) => (
                              <li
                                key={qualification.id}
                                className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-foreground">{qualification.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Category: {qualification.category || 'general'}
                                    </p>
                                  </div>
                                  <Badge variant="outline">Pass {qualification.passingScore}%</Badge>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="projects">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Project Assignments</h3>
                      <p className="text-sm text-muted-foreground">
                        Track current allocations, see timelines, and manage project participation.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid="worker-projects-history"
                        onClick={() =>
                          toast.info('Assignment history coming soon', {
                            description: 'Full project timeline will live here once implemented.'
                          })
                        }
                      >
                        View History
                      </Button>
                      <Button
                        size="sm"
                        data-testid="worker-projects-assign"
                        onClick={handleOpenAssignModal}
                      >
                        Assign to Project
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 rounded-md border border-dashed border-border/60 bg-muted/10 p-6 text-sm text-muted-foreground">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Project Code</TableHead>
                          <TableHead>Project Name</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assigned Date</TableHead>
                          <TableHead>Assigned By</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeAssignments.length > 0 ? (
                          activeAssignments.map((assignment) => {
                            const project = assignment.project;
                            const department = project?.department;
                            const departmentLabel = department
                              ? `${department.department_name}${department.department_code ? ` (${department.department_code})` : ''}`
                              : '—';

                            return (
                              <TableRow key={assignment.id} data-testid="worker-project-row">
                                <TableCell className="font-medium">
                                  {project?.id ? (
                                    <Link
                                      to={`/m/projects/${project.id}`}
                                      className="text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
                                    >
                                      {project.project_code}
                                    </Link>
                                  ) : (
                                    project?.project_code ?? '—'
                                  )}
                                </TableCell>
                                <TableCell>{project?.project_name ?? '—'}</TableCell>
                                <TableCell>{departmentLabel}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {formatEnumLabel(project?.status) ?? 'Unknown'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{formatDate(assignment.assigned_at) ?? '—'}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {assignment.assigned_by ?? '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        Manage
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuLabel>Project actions</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        data-testid="worker-projects-remove"
                                        onSelect={(event) => {
                                          event.preventDefault();
                                          openRemoveModal(assignment);
                                        }}
                                      >
                                        Remove from Project
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onSelect={(event) => {
                                          event.preventDefault();
                                          toast.info('Assignment history coming soon', {
                                            description: 'Historical assignment events will be surfaced here.'
                                          });
                                        }}
                                      >
                                        View Assignment History
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow data-testid="worker-projects-empty">
                            <TableCell
                              colSpan={7}
                              className="py-6 text-center text-sm text-muted-foreground"
                            >
                              This worker is not currently assigned to any projects. Use &ldquo;Assign to Project&rdquo;
                              to connect them to an active initiative.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="earnings">
                  {isLoadingEarnings ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div
                        className="grid gap-4 md:grid-cols-3"
                        data-testid="worker-earnings-summary"
                      >
                        {earningsCards.map((card) => (
                          <Card key={card.id} className="border-border/60">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {card.label}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xl font-semibold text-foreground">{card.value}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle>Earnings breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table data-testid="worker-earnings-breakdown">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Project</TableHead>
                                <TableHead className="text-right">Earnings</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {earningsBreakdown.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={2} className="py-6 text-center text-sm text-muted-foreground">
                                    No earnings recorded for the selected period.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                earningsBreakdown.map((row) => (
                                  <TableRow key={row.projectId ?? 'unassigned'}>
                                    <TableCell>{row.projectId ?? 'Unassigned project'}</TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrencyDisplay(row.earnings, row.currency ?? earningsSummary.currency)}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>

                      <Card data-testid="worker-earnings-chart">
                        <CardHeader>
                          <CardTitle>Earnings over time</CardTitle>
                        </CardHeader>
                        <CardContent className="rounded-md border border-dashed border-border/60 bg-muted/10 p-6 text-sm text-muted-foreground">
                          Visualization coming soon. This space will highlight how earnings trend across months and quarters.
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="invoices">
                  <div className="rounded-md border border-border/60 p-4 space-y-4" data-testid="worker-detail-invoices">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Invoices</h3>
                        <p className="text-sm text-muted-foreground">
                          Recent invoices tied to this worker&apos;s payouts.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchInvoices(worker?.id ?? null)}
                        disabled={isInvoicesLoading}
                      >
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>

                    {isInvoicesLoading ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        Loading invoices…
                      </div>
                    ) : workerInvoices.length === 0 ? (
                      <div className="rounded-md border border-dashed border-border/60 p-6 text-sm text-muted-foreground text-center">
                        No invoices have been generated for this worker yet.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {workerInvoices.map((invoice) => (
                            <TableRow key={invoice.id} data-testid="worker-detail-invoice-row">
                              <TableCell className="font-medium">{invoice.id}</TableCell>
                              <TableCell>
                                {invoice.period_start} → {invoice.period_end}
                              </TableCell>
                              <TableCell>
                                <Badge variant={statusVariant(invoice.status)} className="capitalize">
                                  {invoice.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {Number(invoice.total_amount ?? 0).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="activity">
                  <div className="rounded-md border border-dashed border-border/60 bg-muted/10 p-6 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Activity timeline coming soon.</p>
                    <p className="mt-2">
                      Future enhancements will surface onboarding checkpoints, compliance updates, and recent account actions.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </section>

            <section data-testid="worker-interviews-panel" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">AI Interviews</h3>
                  <p className="text-sm text-muted-foreground">
                    Track recent interview scores and open detailed transcripts.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchInterviews(worker?.id ?? null)}
                  disabled={isInterviewsLoading}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
              <Card>
                <CardContent className="space-y-4 p-4">
                  {isInterviewsLoading ? (
                    <p className="text-sm text-muted-foreground text-center">Loading interviews…</p>
                  ) : workerInterviews.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                      No interviews recorded for this worker yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {workerInterviews.map((interview) => (
                        <div
                          key={interview.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 p-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-foreground capitalize">{interview.domain}</p>
                            <p className="text-xs text-muted-foreground">
                              Conducted {new Date(interview.conducted_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Score</span>{' '}
                              <span className="font-semibold">{interview.score.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Confidence</span>{' '}
                              <span className="font-semibold">{interview.confidence.toFixed(2)}%</span>
                            </div>
                            <Button asChild variant="secondary" size="sm">
                              <Link to={`/manager/interviews/${interview.id}`}>View transcript</Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {interviewTierRecommendation ? (
                    <div className="rounded-md border border-dashed border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-900">
                      {interviewTierRecommendation}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </section>

            <ReplaceAccountModal
              account={selectedAccount}
              open={isReplaceModalOpen}
              onClose={handleCloseReplaceModal}
              onSuccess={handleReplaceSuccess}
            />
            <RemoveAssignmentModal
              assignment={selectedAssignment}
              open={isRemoveModalOpen}
              onClose={handleCloseRemoveModal}
              onSuccess={handleRemoveSuccess}
            />
            <AssignToProjectModal
              workerId={workerId ?? null}
              existingProjectIds={activeAssignments
                .map((assignment) => assignment.project_id)
                .filter((projectId): projectId is string => Boolean(projectId))}
              open={isAssignModalOpen}
              onClose={handleCloseAssignModal}
              onSuccess={handleAssignSuccess}
            />
            <Dialog
              data-testid="worker-detail-inline-edit-dialog"
              open={Boolean(inlineEditTarget)}
              onOpenChange={(open) => {
                if (!open) {
                  handleCloseInlineEdit();
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Edit {inlineEditTarget?.label ?? 'profile field'}
                  </DialogTitle>
                  <DialogDescription>
                    {inlineEditTarget?.description ??
                      'Update this profile value to keep worker records accurate.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="worker-inline-edit-value">
                      {inlineEditTarget?.label ?? 'Value'}
                    </Label>
                    <Input
                      id="worker-inline-edit-value"
                      type={
                        inlineEditTarget?.type === 'email'
                          ? 'email'
                          : inlineEditTarget?.type === 'date'
                            ? 'date'
                            : 'text'
                      }
                      value={inlineEditValue}
                      onChange={(event) => setInlineEditValue(event.target.value)}
                      disabled={isInlineEditSaving}
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseInlineEdit}
                    disabled={isInlineEditSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleInlineEditSubmit}
                    disabled={isInlineEditSaving || !inlineEditTarget}
                  >
                    {isInlineEditSaving ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </span>
                    ) : (
                      'Save changes'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default WorkerDetail;
  const fetchTrainingData = useCallback(
    async (record: WorkerDetailRecord | null) => {
      if (!record?.id) {
        setWorkerTrainingMaterials(defaultTrainingState.materials);
        setWorkerTrainingGates(defaultTrainingState.gates);
        return;
      }

      setIsTrainingLoading(true);
      try {
        const activeProjectIds = record.worker_assignments
          .filter((assignment) => !assignment.removed_at && assignment.project?.id)
          .map((assignment) => assignment.project?.id as string);
        const uniqueProjectIds = Array.from(new Set(activeProjectIds));

        let projectDetails: Array<{ id: string; name: string | null; training_module_id: string | null }> = [];
        if (uniqueProjectIds.length > 0) {
          const { data, error } = await supabase
            .from('projects')
            .select('id, name, training_module_id')
            .in('id', uniqueProjectIds);
          if (error) throw error;
          projectDetails = data || [];
        }

        const trainingModuleIds = Array.from(
          new Set(projectDetails.map((project) => project.training_module_id).filter((moduleId): moduleId is string => Boolean(moduleId)))
        );

        let modulesById = new Map<string, { title: string | null }>();
        if (trainingModuleIds.length > 0) {
          const { data: modulesData, error: modulesError } = await supabase
            .from('training_modules')
            .select('id, title')
            .in('id', trainingModuleIds);
          if (modulesError) throw modulesError;
          modulesById = new Map((modulesData || []).map((module) => [module.id, { title: module.title ?? 'Training module' }]));
        }

        const { data: completionsData, error: completionsError } = await supabase
          .from('worker_training_completions')
          .select('training_module_id, status, completed_at, score')
          .eq('worker_id', record.id);
        if (completionsError) throw completionsError;

        const completionMap = new Map(
          (completionsData || []).map((completion) => [
            completion.training_module_id,
            {
              status: completion.status ?? (completion.completed_at ? 'passed' : 'in_progress'),
              completedAt: completion.completed_at ?? null,
              score: completion.score ?? null
            }
          ])
        );

        const materialRows: WorkerTrainingMaterialRow[] = projectDetails
          .filter((project) => Boolean(project.training_module_id))
          .map((project) => {
            const moduleMeta = project.training_module_id ? modulesById.get(project.training_module_id) : null;
            const completion = project.training_module_id ? completionMap.get(project.training_module_id) : undefined;
            return {
              id: project.training_module_id as string,
              title: moduleMeta?.title ?? 'Training module',
              projectName: project.name ?? 'Project',
              status: completion?.status ?? 'pending',
              completedAt: completion?.completedAt ?? null,
              score: completion?.score ?? null
            };
          });

        const { data: gateData, error: gateError } = await supabase
          .from('training_gates')
          .select('id, gate_name, status, attempt_count, score, project:projects(id, name)')
          .eq('worker_id', record.id);
        if (gateError) throw gateError;

        const gateRows: WorkerTrainingGateRow[] = (gateData || []).map((gate) => ({
          id: gate.id,
          gate_name: gate.gate_name,
          status: gate.status,
          attempt_count: gate.attempt_count ?? 0,
          score: gate.score ?? null,
          projectName: gate.project?.name ?? 'Unassigned'
        }));

        setWorkerTrainingMaterials(materialRows);
        setWorkerTrainingGates(gateRows);
      } catch (error) {
        console.error('Error loading training data:', error);
        toast.error('Unable to load training progress');
        setWorkerTrainingMaterials(defaultTrainingState.materials);
        setWorkerTrainingGates(defaultTrainingState.gates);
      } finally {
        setIsTrainingLoading(false);
      }
    },
    []
  );

  const fetchInvoices = useCallback(async (workerIdValue: string | null) => {
    if (!workerIdValue) {
      setWorkerInvoices([]);
      return;
    }

    setIsInvoicesLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, total_amount, status, period_start, period_end')
        .eq('worker_id', workerIdValue)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) {
        throw error;
      }
      setWorkerInvoices((data ?? []) as Array<{
        id: string;
        total_amount: number;
        status: string;
        period_start: string;
        period_end: string;
      }>);
    } catch (invoiceError) {
      console.error('WorkerDetail: failed to load invoices', invoiceError);
      toast.error('Unable to load invoices');
      setWorkerInvoices([]);
    } finally {
      setIsInvoicesLoading(false);
    }
  }, []);

  const fetchInterviews = useCallback(async (workerIdValue: string | null) => {
    if (!workerIdValue) {
      setWorkerInterviews([]);
      return;
    }
    setIsInterviewsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_interviews')
        .select('id, domain, score, confidence, conducted_at')
        .eq('worker_id', workerIdValue)
        .order('conducted_at', { ascending: false })
        .limit(5);
      if (error) {
        throw error;
      }
      setWorkerInterviews(data ?? []);
    } catch (interviewError) {
      console.error('WorkerDetail: failed to load interviews', interviewError);
      toast.error('Unable to load AI interviews');
      setWorkerInterviews([]);
    } finally {
      setIsInterviewsLoading(false);
    }
  }, []);
