import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAvailableProjects, type ProjectAccessResult } from '@/services/accessService';
import { triggerQualityWarning } from '@/services/qualityWarningService';

export interface ProjectVisibilityPanelProps {
  workerId?: string | null;
}

export const ProjectVisibilityPanel: React.FC<ProjectVisibilityPanelProps> = ({ workerId }) => {
  const [projects, setProjects] = useState<ProjectAccessResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const warnedProjectsRef = useRef<Set<string>>(new Set());

  const refreshProjects = useCallback(async () => {
    if (!workerId) {
      setProjects([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const results = await getAvailableProjects(workerId);
      setProjects(results);
    } catch (err) {
      console.warn('ProjectVisibilityPanel: failed to load projects', err);
      setError('Unable to load project visibility right now.');
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const { availableProjects, lockedProjects } = useMemo(() => {
    const available = projects.filter((project) => project.allowed);
    const locked = projects.filter((project) => !project.allowed);
    return { availableProjects: available, lockedProjects: locked };
  }, [projects]);

  useEffect(() => {
    if (!workerId || lockedProjects.length === 0) {
      return;
    }

    const qualityLocked = lockedProjects.filter((project) =>
      (project.reasons ?? []).includes('quality_threshold')
    );

    if (qualityLocked.length === 0) {
      return;
    }

    qualityLocked.forEach(async (project) => {
      if (warnedProjectsRef.current.has(project.projectId)) {
        return;
      }
      warnedProjectsRef.current.add(project.projectId);
      try {
        await triggerQualityWarning({
          workerId,
          projectId: project.projectId,
          projectName: project.projectName,
          currentScore: project.qualityScore ?? null,
          threshold: project.qualityThreshold ?? null,
        });
      } catch (warningError) {
        console.warn('ProjectVisibilityPanel: warning trigger failed', warningError);
      }
    });
  }, [lockedProjects, workerId]);

  const renderLockedReasons = (reasons: string[]) => {
    if (!reasons.length) {
      return <span className="text-xs text-muted-foreground">Awaiting manager approval</span>;
    }

    return (
      <ul className="list-disc pl-4 text-xs text-muted-foreground">
        {reasons.map((reason) => (
          <li key={reason}>
            {(() => {
              switch (reason) {
                case 'quality_threshold':
                  return 'Meet the quality score threshold';
                case 'training_incomplete':
                  return 'Complete required training gate';
                case 'missing_skills':
                  return 'Add or verify required skills';
                case 'qualification_expired':
                  return 'Renew qualification to regain access';
                case 'missing_qualifications':
                  return 'Complete required qualifications';
                case 'recent_violation':
                  return 'Resolve recent quality violation';
                default:
                  return reason;
              }
            })()}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Card data-testid="worker-visibility-panel">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">Project visibility</CardTitle>
          <p className="text-sm text-muted-foreground">
            See which projects you can join and what is still locked.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshProjects} disabled={isLoading || !workerId}>
          {isLoading ? 'Syncing…' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {!workerId ? (
          <p className="text-sm text-muted-foreground">Sign in to view available projects.</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <section data-testid="worker-visibility-available" className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Available projects</h3>
                <Badge variant="secondary">{availableProjects.length}</Badge>
              </div>
              {availableProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active projects meet your current qualifications.
                </p>
              ) : (
                <ul className="space-y-2">
                  {availableProjects.map((project) => (
                    <li
                      key={project.listingId}
                      className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{project.projectName}</span>
                        <Badge variant="outline">Eligible</Badge>
                      </div>
                      {project.requiredSkills?.length ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          Skills match: {project.requiredSkills.join(', ')}
                        </p>
                      ) : null}
                      {project.requiredQualifications?.length ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          Qualifications required: {project.requiredQualifications.join(', ')}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section data-testid="worker-visibility-locked" className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Locked projects</h3>
                <Badge variant="outline">{lockedProjects.length}</Badge>
              </div>
              {lockedProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Great work—no projects are locked right now.
                </p>
              ) : (
                <ul className="space-y-2">
                  {lockedProjects.map((project) => (
                    <li
                      key={project.listingId}
                      className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{project.projectName}</span>
                        <Badge variant="destructive">Locked</Badge>
                      </div>
                      {project.requiredQualifications?.length ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Required qualifications: {project.requiredQualifications.join(', ')}
                        </p>
                      ) : null}
                      {renderLockedReasons(project.reasons)}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectVisibilityPanel;
