import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BookOpen, CheckCircle2, Clock, ExternalLink, Layers, ListChecks, ShieldCheck, XCircle, RefreshCcw } from 'lucide-react';

type TrainingMaterialRecord = {
  id: string;
  training_material_id: string;
  granted_at: string;
  completed_at: string | null;
  training_material: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    url: string;
    project: {
      id: string;
      name: string;
      project_code: string | null;
      status: string | null;
    } | null;
  } | null;
};

type TrainingGateRecord = {
  id: string;
  project_id: string;
  gate_name: string;
  status: string;
  score: number | null;
  attempt_count: number;
  updated_at: string;
  passed_at: string | null;
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
};

const formatStatusBadge = (completed: boolean) => (
  <Badge variant={completed ? 'default' : 'secondary'}>{completed ? 'Completed' : 'Pending'}</Badge>
);

export const WorkerTrainingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<TrainingMaterialRecord[]>([]);
  const [gates, setGates] = useState<TrainingGateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTraining = useCallback(async () => {
    if (!user?.id) {
      setMaterials([]);
      setGates([]);
      return;
    }

    setLoading(true);
    try {
      const [{ data: accessData, error: accessError }, { data: gateData, error: gateError }] = await Promise.all([
        supabase
          .from('worker_training_access')
          .select(`
            id,
            training_material_id,
            granted_at,
            completed_at,
            training_material:training_materials (
              id,
              title,
              description,
              type,
              url,
              project:projects (
                id,
                name,
                project_code,
                status
              )
            )
          `)
          .eq('worker_id', user.id)
          .order('granted_at', { ascending: true }),
        supabase
          .from('training_gates')
          .select('id, project_id, gate_name, status, score, attempt_count, updated_at, passed_at')
          .eq('worker_id', user.id)
          .order('gate_name', { ascending: true })
      ]);

      if (accessError) throw accessError;
      if (gateError) throw gateError;

      setMaterials((accessData ?? []) as TrainingMaterialRecord[]);
      setGates((gateData ?? []) as TrainingGateRecord[]);
    } catch (error) {
      console.error('WorkerTrainingPage: failed to load training data', error);
      toast.error('Unable to load training');
      setMaterials([]);
      setGates([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTraining().catch((error) => {
      console.warn('WorkerTrainingPage: unexpected error', error);
    });
  }, [fetchTraining]);

  const completedCount = useMemo(
    () => materials.filter((record) => Boolean(record.completed_at)).length,
    [materials]
  );
  const pendingCount = useMemo(() => materials.length - completedCount, [materials, completedCount]);

  const handleRefreshTraining = useCallback(() => {
    fetchTraining().catch((error) => {
      console.warn('WorkerTrainingPage: refresh error', error);
    });
  }, [fetchTraining]);

  const handleOpenMaterial = useCallback((url?: string | null) => {
    if (!url) return;
    window.open(url, '_blank', 'noreferrer');
  }, []);

  return (
    <div className="bg-background min-h-screen" data-testid="worker-training-page">
      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between" data-testid="worker-training-header">
          <div>
            <p className="text-sm text-muted-foreground">Project readiness</p>
            <h1 className="text-3xl font-bold">Training & gates</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefreshTraining} disabled={loading}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => navigate('/w/assessments')}>
              Take assessment
            </Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Assigned materials</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-2xl font-bold">
              <Layers className="h-5 w-5 text-muted-foreground" />
              {materials.length}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-2xl font-bold">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              {completedCount}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-2xl font-bold">
              <Clock className="h-5 w-5 text-muted-foreground" />
              {pendingCount}
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground" data-testid="worker-training-loading">
              Checking your training assignments…
            </CardContent>
          </Card>
        ) : materials.length === 0 ? (
          <Card data-testid="worker-training-empty">
            <CardContent className="p-10 space-y-2 text-center">
              <BookOpen className="h-10 w-10 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-semibold">No training required</h2>
              <p className="text-sm text-muted-foreground">
                You don’t have any training tasks assigned right now. Your manager will notify you when new modules are available.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4" data-testid="worker-training-list">
            {materials.map((record) => (
              <Card key={record.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Training</p>
                      <p className="text-lg font-semibold">{record.training_material?.title ?? 'Training material'}</p>
                      <p className="text-sm text-muted-foreground">{record.training_material?.description ?? 'Keep skills current for this project.'}</p>
                    </div>
                    {formatStatusBadge(Boolean(record.completed_at))}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span>Granted {formatDate(record.granted_at)}</span>
                    <span>Type: {record.training_material?.type ?? 'resource'}</span>
                    {record.completed_at ? <span>Completed {formatDate(record.completed_at)}</span> : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {record.training_material?.project?.name ?? 'Project'} {record.training_material?.project?.project_code ? `(${record.training_material?.project?.project_code})` : ''}
                    </Badge>
                    <Badge variant="outline">Status: {record.training_material?.project?.status ?? 'unknown'}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleOpenMaterial(record.training_material?.url)}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open material
                    </Button>
                    {!record.completed_at ? (
                      <Button variant="outline" size="sm" onClick={() => navigate('/w/assessments')}>
                        Take assessment
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card data-testid="worker-training-gates">
          <CardHeader>
            <CardTitle>Gate requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No gate requirements found for your projects.</p>
            ) : (
              gates.map((gate) => (
                <div key={gate.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{gate.gate_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Attempts: {gate.attempt_count} • Last updated {formatDate(gate.updated_at)}
                    </p>
                  </div>
                  <Badge variant={gate.status === 'passed' ? 'default' : gate.status === 'failed' ? 'destructive' : 'secondary'}>
                    {gate.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkerTrainingPage;
