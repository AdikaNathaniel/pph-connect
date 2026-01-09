import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { showSuccessToast, showErrorToast, showInfoToast } from '@/lib/toast';

type WorkerRecord = {
  id: string;
  hr_id: string;
  full_name: string;
  status: string;
  locale_primary?: string | null;
  teams?: Array<{ team_id: string }>;
  worker_accounts?: Array<{ worker_account_email: string; is_current: boolean }>;
};

type TeamLookup = {
  team_id: string;
};

export interface AssignWorkersModalProps {
  projectId: string | null;
  departmentId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AssignWorkersModal: React.FC<AssignWorkersModalProps> = ({
  projectId,
  departmentId,
  open,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [localeFilter, setLocaleFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedWorkerIds, setAssignedWorkerIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!open) {
      setWorkers([]);
      setSelectedWorkerIds([]);
      setSearchTerm('');
      setStatusFilter('active');
      setTeamFilter('all');
      setLocaleFilter('all');
      setAssignedWorkerIds(new Set());
      return;
    }

    const loadWorkers = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('workers')
          .select(
            `
              id,
              hr_id,
              full_name,
              status,
              locale_primary,
              worker_accounts (
                worker_account_email,
                is_current
              ),
              worker_teams:worker_team_assignments (
                team_id
              )
            `
          )
          .eq('status', 'active')
          .order('full_name', { ascending: true });

        if (error) {
          throw error;
        }

        setWorkers(
          (data ?? []).map((worker) => ({
            ...worker,
            teams: (worker.worker_teams as TeamLookup[] | null) ?? []
          })) as WorkerRecord[]
        );
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : 'Unable to load workers right now.';
        showErrorToast('Failed to load workers', { description: message });
        setWorkers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkers().catch((unexpected) => {
      console.error('Failed to load workers', unexpected);
    });
  }, [open]);

  useEffect(() => {
    if (!open || !projectId) {
      return;
    }

    const loadAssignedWorkers = async () => {
      try {
        const { data, error } = await supabase
          .from('worker_assignments')
          .select('worker_id')
          .eq('project_id', projectId)
          .is('removed_at', null);

        if (error) {
          throw error;
        }

        setAssignedWorkerIds(new Set((data ?? []).map((record) => record.worker_id)));
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : 'Unable to verify assigned workers.';
        showErrorToast('Failed to check current assignments', { description: message });
        setAssignedWorkerIds(new Set());
      }
    };

    loadAssignedWorkers().catch((unexpected) => {
      console.error('Failed to load assigned workers', unexpected);
    });
  }, [open, projectId]);

  const filteredWorkers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return workers.filter((worker) => {
      if (assignedWorkerIds.has(worker.id)) {
        return false;
      }

      if (statusFilter !== 'all' && worker.status !== statusFilter) {
        return false;
      }

      if (localeFilter !== 'all' && worker.locale_primary !== localeFilter) {
        return false;
      }

      if (teamFilter !== 'all') {
        const teamIds = worker.teams?.map((team) => team.team_id) ?? [];
        if (!teamIds.includes(teamFilter)) {
          return false;
        }
      }

      if (query.length === 0) {
        return true;
      }

      return (
        worker.full_name.toLowerCase().includes(query) ||
        worker.hr_id.toLowerCase().includes(query) ||
        (worker.worker_accounts?.find((account) => account.is_current)?.worker_account_email ?? '')
          .toLowerCase()
          .includes(query)
      );
    });
  }, [workers, searchTerm, statusFilter, teamFilter, localeFilter, assignedWorkerIds]);

  const toggleWorkerSelection = (workerId: string) => {
    if (assignedWorkerIds.has(workerId)) {
      return;
    }
    setSelectedWorkerIds((current) =>
      current.includes(workerId)
        ? current.filter((id) => id !== workerId)
        : [...current, workerId]
    );
  };

  const handleSubmit = async () => {
    if (!projectId) {
      showErrorToast('Missing project context. Refresh the page and try again.');
      return;
    }

    if (selectedWorkerIds.length === 0) {
      showInfoToast('Select at least one worker', {
        description: 'Use the list to choose workers before confirming.'
      });
      return;
    }

    const timestamp = new Date().toISOString();
    const userId = user?.id ?? null;

    setIsSubmitting(true);
    try {
      const payload = selectedWorkerIds.map((workerId) => ({
        project_id: projectId,
        worker_id: workerId,
        assigned_at: timestamp,
        assigned_by: userId
      }));

      const { error } = await supabase.from('worker_assignments').insert(payload);
      if (error) {
        throw error;
      }

      setAssignedWorkerIds((existing) => {
        const next = new Set(existing);
        selectedWorkerIds.forEach((id) => next.add(id));
        return next;
      });

      showSuccessToast('Workers assigned', {
        description:
          selectedWorkerIds.length === 1
            ? 'The worker is now assigned to this project.'
            : 'Workers assigned successfully.'
      });

      onSuccess?.();
      onClose();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Unable to assign workers right now.';
      showErrorToast('Assignment failed', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const localeOptions = useMemo(() => {
    const locales = new Set<string>();
    workers.forEach((worker) => {
      if (worker.locale_primary) {
        locales.add(worker.locale_primary);
      }
    });
    return Array.from(locales).sort();
  }, [workers]);

  const teamOptions = useMemo(() => {
    const teams = new Set<string>();
    workers.forEach((worker) => {
      (worker.teams ?? []).forEach((team) => teams.add(team.team_id));
    });
    return Array.from(teams).sort();
  }, [workers]);

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Workers</DialogTitle>
          <DialogDescription>
            Choose workers that meet the project&apos;s criteria. Status defaults to active workers only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
              data-testid="assign-workers-filter-status"
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={teamFilter}
              onValueChange={setTeamFilter}
              data-testid="assign-workers-filter-team"
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                    <SelectItem value="all">All teams</SelectItem>
                    {teamOptions.map((teamId) => (
                      <SelectItem key={teamId} value={teamId}>
                        {teamId}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>

            <Select
              value={localeFilter}
              onValueChange={setLocaleFilter}
              data-testid="assign-workers-filter-locale"
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by locale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locales</SelectItem>
                {localeOptions.map((locale) => (
                  <SelectItem key={locale} value={locale}>
                    {locale}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Command>
            <CommandInput
              placeholder="Search by name, HR ID, or email…"
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading workers…
                </div>
              ) : filteredWorkers.length === 0 ? (
                <CommandEmpty>No matching workers found.</CommandEmpty>
                  ) : (
                    <CommandGroup heading="Workers">
                      {filteredWorkers.map((worker) => {
                        const isAssigned = assignedWorkerIds.has(worker.id);
                        const currentEmail =
                          worker.worker_accounts?.find((account) => account.is_current)?.worker_account_email ??
                          worker.worker_accounts?.[0]?.worker_account_email ??
                          '—';
                        return (
                      <CommandItem
                        key={worker.id}
                        onSelect={() => toggleWorkerSelection(worker.id)}
                        className="flex items-center justify-between gap-3"
                        data-testid="assign-workers-option"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{worker.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {worker.hr_id} • {currentEmail}
                              </p>
                            </div>
                            <Checkbox
                              checked={selectedWorkerIds.includes(worker.id)}
                              onCheckedChange={() => toggleWorkerSelection(worker.id)}
                              aria-label={`Select ${worker.full_name}`}
                              data-testid="assign-workers-select-toggle"
                              disabled={isAssigned}
                            />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedWorkerIds.length === 0}
            data-testid="assign-workers-submit"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Assigning…
              </span>
            ) : (
              'Assign selected'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignWorkersModal;
