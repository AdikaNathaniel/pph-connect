import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessToast, showErrorToast, showInfoToast } from '@/lib/toast';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type TeamRecord = {
  id: string;
  team_name: string;
  locale_primary: string;
  locale_secondary?: string | null;
  locale_region?: string | null;
  department_id: string;
};

export interface AssignTeamsModalProps {
  projectId: string | null;
  departmentId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AssignTeamsModal: React.FC<AssignTeamsModalProps> = ({
  projectId,
  departmentId,
  open,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [localeFilter, setLocaleFilter] = useState<string>('all');

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      if (localeFilter !== 'all' && team.locale_primary !== localeFilter) {
        return false;
      }
      if (searchTerm.trim().length === 0) {
        return true;
      }
      const query = searchTerm.toLowerCase();
      return (
        team.team_name.toLowerCase().includes(query) ||
        team.locale_primary.toLowerCase().includes(query) ||
        (team.locale_secondary ?? '').toLowerCase().includes(query)
      );
    });
  }, [teams, searchTerm, localeFilter]);

  useEffect(() => {
    if (!open) {
      setTeams([]);
      setSelectedTeams([]);
      setSearchTerm('');
      setLocaleFilter('all');
      return;
    }

    const loadTeams = async () => {
      setIsLoading(true);
      try {
        const query = supabase
          .from('teams')
          .select('id, team_name, locale_primary, locale_secondary, locale_region, department_id')
          .eq('is_active', true)
          .order('team_name', { ascending: true });

        if (departmentId) {
          query.eq('department_id', departmentId);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        setTeams((data ?? []) as TeamRecord[]);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : 'Unable to load teams right now.';
        showErrorToast('Failed to load teams', { description: message });
        setTeams([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTeams().catch((unexpected) => {
      console.error('Failed to load teams', unexpected);
    });
  }, [open, departmentId]);

  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeams((current) =>
      current.includes(teamId)
        ? current.filter((id) => id !== teamId)
        : [...current, teamId]
    );
  };

  const handleSubmit = async () => {
    if (!projectId) {
      showErrorToast('Missing project context. Try reloading the page and opening the modal again.');
      return;
    }
    if (selectedTeams.length === 0) {
      showInfoToast('Select at least one team', {
        description: 'Use the list to pick teams before confirming.'
      });
      return;
    }

    const userId = user?.id ?? null;
    const timestamp = new Date().toISOString();

    setIsSubmitting(true);
    try {
      const payload = selectedTeams.map((teamId) => ({
        project_id: projectId,
        team_id: teamId,
        assigned_at: timestamp,
        assigned_by: userId
      }));

      const { error } = await supabase.from('project_teams').insert(payload);
      if (error) {
        throw error;
      }

      showSuccessToast('Teams assigned', {
        description:
          selectedTeams.length === 1
            ? 'The selected team now supports this project.'
            : 'Teams successfully assigned.'
      });

      onSuccess?.();
      onClose();
    } catch (insertError) {
      const message =
        insertError instanceof Error ? insertError.message : 'Unable to assign teams right now.';
      showErrorToast('Assignment failed', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const localeOptions = useMemo(() => {
    const distinct = new Set<string>();
    teams.forEach((team) => {
      if (team.locale_primary) {
        distinct.add(team.locale_primary);
      }
    });
    return Array.from(distinct).sort();
  }, [teams]);

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? onClose() : null)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Assign Teams</DialogTitle>
          <DialogDescription>
            Select active teams from the same department to support this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Filter by locale</label>
            <Select
              value={localeFilter}
              onValueChange={setLocaleFilter}
              data-testid="assign-teams-filter-locale"
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All locales" />
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
              placeholder="Search by name or locale…"
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading teams…
                </div>
              ) : filteredTeams.length === 0 ? (
                <CommandEmpty>No matching teams found.</CommandEmpty>
              ) : (
                <CommandGroup heading="Teams">
                  {filteredTeams.map((team) => (
                    <CommandItem
                      key={team.id}
                      onSelect={() => toggleTeamSelection(team.id)}
                      className="flex items-center justify-between gap-3"
                      data-testid="assign-teams-option"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{team.team_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {team.locale_primary}
                          {team.locale_secondary ? ` • ${team.locale_secondary}` : ''}
                          {team.locale_region ? ` • ${team.locale_region}` : ''}
                        </p>
                      </div>
                      <Checkbox
                        checked={selectedTeams.includes(team.id)}
                        onCheckedChange={() => toggleTeamSelection(team.id)}
                        aria-label={`Select ${team.team_name}`}
                      />
                    </CommandItem>
                  ))}
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
            disabled={isSubmitting || selectedTeams.length === 0}
            data-testid="assign-teams-submit"
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

export default AssignTeamsModal;
