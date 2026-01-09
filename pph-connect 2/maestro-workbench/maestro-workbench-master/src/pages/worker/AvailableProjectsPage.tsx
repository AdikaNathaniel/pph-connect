import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import WorkerLayout from '@/components/layout/WorkerLayout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { checkRehireEligibility } from '@/services/rehireEligibilityService';

interface ListingCard {
  id: string;
  projectId: string;
  project_name: string | null;
  project_code: string | null;
  description: string | null;
  required_skills: string[];
  required_locales: string[];
  required_tier: string;
  capacity_max: number;
  capacity_current: number;
  is_active: boolean;
  projectOwnerId: string | null;
  requiresTrainingGate: boolean;
}

export const AvailableProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeListing, setActiveListing] = useState<ListingCard | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [coverMessage, setCoverMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appliedListingIds, setAppliedListingIds] = useState<Set<string>>(new Set());
  const [trainingStatusByProject, setTrainingStatusByProject] = useState<Record<string, boolean>>({});
  const [qualityThresholds, setQualityThresholds] = useState<Record<string, number>>({});
  const [qualityScoresByProject, setQualityScoresByProject] = useState<Record<string, number>>({});
  const [rehireStatus, setRehireStatus] = useState<{ eligible: boolean; reasonCode: string; eligibleAfter?: string | null } | null>(null);
  const workerId = user?.id ?? null;
  const workerName = user?.full_name ?? user?.email ?? 'Worker';

  const fetchListings = useCallback(async () => {
    setLoading(true);
        const { data, error } = await supabase
          .from('project_listings')
          .select('id, is_active, project_id, capacity_max, capacity_current, required_skills, required_locales, required_tier, description, projects:projects(name, project_code, created_by, requires_training_gate)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('AvailableProjectsPage: failed to load listings', error);
      toast.error('Unable to load available projects');
      setListings([]);
    } else {
          setListings(
            (data ?? []).map((listing) => ({
              id: listing.id,
              projectId: listing.project_id,
              project_name: listing.projects?.name ?? null,
              project_code: listing.projects?.project_code ?? null,
              description: listing.description,
              required_skills: listing.required_skills ?? [],
              required_locales: listing.required_locales ?? [],
              required_tier: listing.required_tier ?? 'tier0',
              capacity_max: listing.capacity_max ?? 0,
              capacity_current: listing.capacity_current ?? 0,
              is_active: listing.is_active,
              projectOwnerId: listing.projects?.created_by ?? null,
              requiresTrainingGate: Boolean(listing.projects?.requires_training_gate),
            }))
          );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchListings().catch((error) => console.warn('AvailableProjectsPage: unexpected error', error));
  }, [fetchListings]);

  const refreshRehireStatus = useCallback(async () => {
    if (!workerId) {
      setRehireStatus(null);
      return;
    }
    try {
      const status = await checkRehireEligibility(workerId);
      setRehireStatus(status);
    } catch (rehireError) {
      console.warn('AvailableProjectsPage: failed to load rehire status', rehireError);
      setRehireStatus(null);
    }
  }, [workerId]);

  useEffect(() => {
    refreshRehireStatus().catch((error) => console.warn('AvailableProjectsPage: unexpected rehire status error', error));
  }, [refreshRehireStatus]);

  const fetchTrainingStatus = useCallback(async () => {
    if (!workerId) {
      setTrainingStatusByProject({});
      return;
    }
    const { data, error } = await supabase
      .from('training_gates')
      .select('project_id, status')
      .eq('worker_id', workerId);

    if (error) {
      console.warn('AvailableProjectsPage: failed to load training status', error);
      setTrainingStatusByProject({});
      return;
    }

    const aggregates = (data ?? []).reduce<Record<string, { total: number; passed: number }>>((acc, row) => {
      if (!row.project_id) {
        return acc;
      }
      const normalizedStatus = (row.status ?? '').toLowerCase();
      const current = acc[row.project_id] ?? { total: 0, passed: 0 };
      current.total += 1;
      if (normalizedStatus === 'passed') {
        current.passed += 1;
      }
      acc[row.project_id] = current;
      return acc;
    }, {});

    const normalizedStatus = Object.entries(aggregates).reduce<Record<string, boolean>>((acc, [projectId, stats]) => {
      acc[projectId] = stats.total > 0 && stats.passed === stats.total;
      return acc;
    }, {});

    setTrainingStatusByProject(normalizedStatus);
  }, [workerId]);

  useEffect(() => {
    fetchTrainingStatus().catch((error) => console.warn('AvailableProjectsPage: unexpected training status error', error));
  }, [fetchTrainingStatus]);

  const fetchQualityData = useCallback(async () => {
    if (!workerId) {
      setQualityThresholds({});
      setQualityScoresByProject({});
      return;
    }

    const [{ data: thresholdData, error: thresholdError }, { data: metricData, error: metricError }] = await Promise.all([
      supabase
        .from('performance_thresholds')
        .select('project_id, threshold_min')
        .eq('metric_type', 'quality'),
      supabase
        .from('quality_metrics')
        .select('project_id, metric_value, measured_at')
        .eq('worker_id', workerId)
        .eq('metric_type', 'quality')
        .order('measured_at', { ascending: false }),
    ]);

    if (thresholdError) {
      console.warn('AvailableProjectsPage: failed to load quality thresholds', thresholdError);
    }

    if (metricError) {
      console.warn('AvailableProjectsPage: failed to load worker quality metrics', metricError);
    }

    const nextThresholds = (thresholdData ?? []).reduce<Record<string, number>>((acc, row) => {
      if (!row.project_id || row.threshold_min == null) {
        return acc;
      }
      acc[row.project_id] = Number(row.threshold_min);
      return acc;
    }, {});

    const nextScores: Record<string, number> = {};
    (metricData ?? []).forEach((row) => {
      if (!row.project_id || row.metric_value == null) {
        return;
      }
      if (nextScores[row.project_id] != null) {
        return;
      }
      nextScores[row.project_id] = Number(row.metric_value);
    });

    setQualityThresholds(nextThresholds);
    setQualityScoresByProject(nextScores);
  }, [workerId]);

  useEffect(() => {
    fetchQualityData().catch((error) => console.warn('AvailableProjectsPage: unexpected quality data error', error));
  }, [fetchQualityData]);

  const markListingApplied = useCallback((listingId: string) => {
    setAppliedListingIds((previous) => {
      const next = new Set(previous);
      next.add(listingId);
      return next;
    });
  }, []);

  const notifyManagers = useCallback(
    async (listing: ListingCard, message: string) => {
      if (!listing.projectOwnerId) {
        console.info('AvailableProjectsPage: no owner found for listing, skipping notification', listing.id);
        return;
      }
      const subject = `New application for ${listing.project_name ?? listing.project_code ?? 'a project'}`;
      const details = [
        `Worker ${workerName} requested access to ${listing.project_name ?? listing.project_code ?? listing.id}.`,
        `Listing ID: ${listing.id}`,
      ];
      const trimmedMessage = message.trim();
      if (trimmedMessage.length) {
        details.push('', 'Cover message:', trimmedMessage);
      }
      try {
        await supabase.functions.invoke('send-message', {
          body: {
            recipient_ids: [listing.projectOwnerId],
            subject,
            content: details.join('\n'),
          },
        });
      } catch (notificationError) {
        console.warn('AvailableProjectsPage: failed to notify managers', notificationError);
      }
    },
    [workerName]
  );

  const resetModalState = useCallback(() => {
    setIsDialogOpen(false);
    setActiveListing(null);
    setCoverMessage('');
  }, []);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) {
      return;
    }
    if (!nextOpen) {
      resetModalState();
      return;
    }
    setIsDialogOpen(true);
  };

  const handleApplyClick = (listing: ListingCard) => {
    if (!workerId) {
      toast.error('You must be signed in to apply for projects.');
      return;
    }
    if (rehireStatus?.eligible === false) {
      const reason =
        rehireStatus.reasonCode === 'performance_cooldown'
          ? `Your account is on a cooldown. You can reapply after ${rehireStatus.eligibleAfter ?? 'the waiting period'}.`
          : 'Your account is not currently eligible to apply for new projects.';
      toast.error(`Rehire eligibility: ${reason}`);
      return;
    }
    setActiveListing(listing);
    setCoverMessage('');
    setIsDialogOpen(true);
  };

  const handleConfirmApplication = async () => {
    if (!workerId || !activeListing) {
      toast.error('Unable to submit application right now.');
      return;
    }
    setIsSubmitting(true);
    const notePayload = coverMessage.trim();

    try {
      if (rehireStatus?.eligible === false) {
        const reason =
          rehireStatus.reasonCode === 'performance_cooldown'
            ? `Your account is on a cooldown. You can reapply after ${rehireStatus.eligibleAfter ?? 'the waiting period'}.`
            : 'Your account is not currently eligible to apply for new projects.';
        toast.error(`Rehire eligibility: ${reason}`);
        setIsSubmitting(false);
        return;
      }
      const latestStatus = await checkRehireEligibility(workerId);
      setRehireStatus(latestStatus);
      if (latestStatus.eligible === false) {
        const reason =
          latestStatus.reasonCode === 'performance_cooldown'
            ? `Your account is on a cooldown. You can reapply after ${latestStatus.eligibleAfter ?? 'the waiting period'}.`
            : 'Your account is not currently eligible to apply for new projects.';
        toast.error(`Rehire eligibility: ${reason}`);
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('worker_applications')
        .insert({
          worker_id: workerId,
          project_listing_id: activeListing.id,
          notes: notePayload ? notePayload : null,
        });

      if (error) {
        throw error;
      }

      markListingApplied(activeListing.id);
      toast.success(`Application submitted for ${activeListing.project_name ?? 'this project'}`);
      await notifyManagers(activeListing, coverMessage);
      resetModalState();
    } catch (applicationError) {
      console.error('AvailableProjectsPage: failed to submit application', applicationError);
      toast.error('Unable to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredListings = useMemo(() => {
    if (!search) return listings;
    return listings.filter((listing) => {
      const name = listing.project_name ?? '';
      const code = listing.project_code ?? '';
      return name.toLowerCase().includes(search.toLowerCase()) || code.toLowerCase().includes(search.toLowerCase());
    });
  }, [listings, search]);

  const workerTier = (user?.role ?? 'worker').includes('tier') ? user?.role ?? 'tier0' : 'tier0';
  const workerLocales = useMemo(() => {
    const locales = (user as { locale_all?: string[] })?.locale_all ?? [];
    return locales.map((locale) => locale.toLowerCase());
  }, [user]);
  const workerSkills = useMemo(() => {
    const skills = (user as { skills?: string[] })?.skills ?? [];
    return skills.map((skill) => skill.toLowerCase());
  }, [user]);

  const hasPassedTraining = (listing: ListingCard) => {
    if (!listing.requiresTrainingGate) {
      return true;
    }
    return Boolean(trainingStatusByProject[listing.projectId]);
  };

  const meetsQualityThreshold = (listing: ListingCard) => {
    const threshold = qualityThresholds[listing.projectId];
    if (threshold == null) {
      return true;
    }
    const score = qualityScoresByProject[listing.projectId];
    if (score == null) {
      return false;
    }
    return score >= threshold;
  };

  const isEligible = (listing: ListingCard) => {
    if (rehireStatus?.eligible === false) {
      return false;
    }
    const tierOk = workerTier >= listing.required_tier;
    const localesOk =
      listing.required_locales.length === 0 ||
      listing.required_locales.some((locale) => workerLocales.includes(locale.toLowerCase()));
    const skillsOk =
      listing.required_skills.length === 0 ||
      listing.required_skills.every((skill) => workerSkills.includes(skill.toLowerCase()));
    const trainingOk = hasPassedTraining(listing);
    const qualityOk = meetsQualityThreshold(listing);
    return tierOk && localesOk && skillsOk && trainingOk && qualityOk;
  };

  const rehireBlockedMessage = useMemo(() => {
    if (rehireStatus?.eligible !== false) {
      return null;
    }
    if (rehireStatus.reasonCode === 'performance_cooldown') {
      return `Due to a recent performance review, new applications are paused until ${
        rehireStatus.eligibleAfter ?? 'the cooldown window ends'
      }.`;
    }
    return 'Applications are disabled because your account is marked as not eligible for rehire.';
  }, [rehireStatus]);

  return (
    <WorkerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2" data-testid="available-projects-header">
          <p className="text-sm text-muted-foreground">Marketplace</p>
          <h1 className="text-2xl font-bold">Available Projects</h1>
          <p className="text-sm text-muted-foreground">
            Review open opportunities and request access to the projects that match your skills.
          </p>
        </div>

        <Card data-testid="available-projects-filters">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Search projects or codes"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button variant="outline" size="sm" disabled>
              Skills
            </Button>
            <Button variant="outline" size="sm" disabled>
              Locales
            </Button>
            <Button variant="outline" size="sm" disabled>
              Tier
            </Button>
          </CardContent>
        </Card>

        {rehireStatus?.eligible === false && rehireBlockedMessage ? (
          <Alert variant="destructive" data-testid="rehire-eligibility-alert">
            <AlertTitle>Applications temporarily locked</AlertTitle>
            <AlertDescription>{rehireBlockedMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div data-testid="available-projects-list" className="grid gap-4">
          {loading ? (
            <div className="rounded-md border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
              Loading projects…
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
              No available projects right now.
            </div>
          ) : (
            filteredListings.map((listing) => {
              const eligible = isEligible(listing);
              const listingApplied = appliedListingIds.has(listing.id);
              const trainingGateIncomplete = listing.requiresTrainingGate && !hasPassedTraining(listing);
              const threshold = qualityThresholds[listing.projectId] ?? null;
              const workerQualityScore = qualityScoresByProject[listing.projectId] ?? null;
              const qualityBelowThreshold =
                threshold != null && (workerQualityScore == null || workerQualityScore < threshold);
              return (
        <Card key={listing.id} data-testid="available-project-card" data-project-id={listing.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold">{listing.project_name ?? 'Project'}</p>
                      <p className="text-xs text-muted-foreground">{listing.project_code ?? listing.id}</p>
                    </div>
                    <Badge variant="outline">{listing.required_tier}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {listing.description ?? 'Project description coming soon.'}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Skills: {listing.required_skills.length ? listing.required_skills.join(', ') : '—'}</span>
                    <span>Locales: {listing.required_locales.length ? listing.required_locales.join(', ') : '—'}</span>
                    <span>
                      Capacity: {listing.capacity_current} / {listing.capacity_max}
                    </span>
                  </div>
                  {threshold != null ? (
                    <div className="text-xs text-muted-foreground">
                      Quality threshold: {threshold.toFixed(2)} • Your score:{' '}
                      {workerQualityScore != null ? workerQualityScore.toFixed(2) : 'No data yet'}
                    </div>
                  ) : null}
                  <div className="flex justify-between items-center">
                    <Button size="sm" onClick={() => navigate(`/worker/projects/${listing.id}`)}>
                      View details
                    </Button>
                    {eligible ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={listingApplied}
                        data-testid="available-project-apply"
                        onClick={() => handleApplyClick(listing)}
                      >
                        {listingApplied ? 'Applied' : 'Apply'}
                      </Button>
                    ) : (
                      <Badge variant="secondary">Not Eligible</Badge>
                    )}
                  </div>
                  {!eligible ? (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Not all requirements met. Check your skills, locales, tier, or gating requirements.</p>
                      {trainingGateIncomplete ? <p>Complete the required training gates to unlock this project.</p> : null}
                      {qualityBelowThreshold && threshold != null ? (
                        <p>
                          Your quality score must be at least {threshold.toFixed(2)}. Current:{' '}
                          {workerQualityScore != null ? workerQualityScore.toFixed(2) : 'No data yet'}.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )})
          )}
        </div>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent data-testid="apply-confirmation-modal">
          <DialogHeader>
            <DialogTitle>Apply to {activeListing?.project_name ?? 'this project'}?</DialogTitle>
            <DialogDescription>
              Confirm your request to join this project. Managers will review your profile and respond shortly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Tell the project team why you are a good fit or share context about your availability.
            </p>
            <div className="space-y-2">
              <Label htmlFor="cover-message">Cover message (optional)</Label>
              <Textarea
                id="cover-message"
                value={coverMessage}
                onChange={(event) => setCoverMessage(event.target.value)}
                placeholder="Highlight relevant experience, quality scores, or timing preferences"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetModalState} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              data-testid="apply-confirmation-submit"
              onClick={handleConfirmApplication}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting…' : 'Submit Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkerLayout>
  );
};

export default AvailableProjectsPage;
