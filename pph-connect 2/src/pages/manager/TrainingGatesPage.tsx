import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  RefreshCcw,
  Plus,
  Search,
  Shield,
  Users,
  Award
} from 'lucide-react';
import TrainingGateForm from '@/components/training/TrainingGateForm';

type WorkerOption = { id: string; label: string };
type ProjectOption = { id: string; label: string };

type TrainingGateRecord = {
  id: string;
  gate_name: string;
  status: string;
  worker_id: string;
  project_id: string;
  score: number | null;
  attempt_count: number;
  passed_at: string | null;
  created_at: string;
  updated_at: string;
  worker?: {
    full_name: string | null;
    worker_role?: string | null;
  } | null;
  project?: {
    name: string | null;
  } | null;
};

const statusVariant = (status: string) => {
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

const TrainingGatesPage: React.FC = () => {
  const [gates, setGates] = useState<TrainingGateRecord[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingGateId, setUpdatingGateId] = useState<string | null>(null);

  const fetchWorkersAndProjects = useCallback(async () => {
    const [{ data: workerData }, { data: projectData }] = await Promise.all([
      supabase
        .from('workers')
        .select('id, full_name, hr_id, worker_role')
        .order('full_name'),
      supabase
        .from('projects')
        .select('id, name, project_code')
        .order('name')
    ]);

    setWorkers(
      (workerData || []).map((worker) => ({
        id: worker.id,
        label: worker.full_name ?? worker.id
      }))
    );

    setProjects(
      (projectData || []).map((project) => ({
        id: project.id,
        label: project.name ?? project.id
      }))
    );
  }, []);

  const fetchGates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('training_gates')
        .select(`
          id,
          gate_name,
          status,
          worker_id,
          project_id,
          score,
          attempt_count,
          passed_at,
          created_at,
          updated_at,
          worker:workers!training_gates_worker_id_fkey(full_name, worker_role),
          project:projects!training_gates_project_id_fkey(name)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setGates(data || []);
    } catch (error) {
      console.error('Error loading training gates:', error);
      toast.error('Failed to load training gates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkersAndProjects().catch(console.error);
    fetchGates().catch(console.error);
  }, [fetchWorkersAndProjects, fetchGates]);

  const filteredGates = useMemo(() => {
    if (!search.trim()) {
      return gates;
    }
    const query = search.toLowerCase();
    return gates.filter((gate) => {
      const workerName = gate.worker?.full_name?.toLowerCase() ?? '';
      const projectName = gate.project?.name?.toLowerCase() ?? '';
      return (
        workerName.includes(query) ||
        projectName.includes(query) ||
        gate.gate_name.toLowerCase().includes(query) ||
        gate.status.toLowerCase().includes(query)
      );
    });
  }, [gates, search]);

  const handleStatusChange = async (gate: TrainingGateRecord, nextStatus: string) => {
    setUpdatingGateId(gate.id);
    try {
      const updates: Partial<TrainingGateRecord> = {
        status: nextStatus,
        attempt_count: gate.attempt_count + 1,
        updated_at: new Date().toISOString()
      };

      if (nextStatus === 'passed') {
        updates.passed_at = new Date().toISOString() as any;
      } else if (nextStatus === 'failed') {
        updates.passed_at = null;
      }

      const { error } = await supabase
        .from('training_gates')
        .update(updates)
        .eq('id', gate.id);

      if (error) throw error;
      toast.success(`Gate marked as ${nextStatus}`);
      fetchGates().catch(console.error);
    } catch (error) {
      console.error('Failed to update gate status:', error);
      toast.error('Unable to update gate status');
    } finally {
      setUpdatingGateId(null);
    }
  };

  const summary = useMemo(() => {
    const total = gates.length;
    const passed = gates.filter((gate) => gate.status === 'passed').length;
    const failed = gates.filter((gate) => gate.status === 'failed').length;
    const inProgress = gates.filter((gate) => gate.status === 'in_progress').length;
    return { total, passed, failed, inProgress };
  }, [gates]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training Gates</h1>
          <p className="text-muted-foreground">
            Define gates and track worker progress for each project
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchGates()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gates</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.passed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.inProgress}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Gate List</TabsTrigger>
          <TabsTrigger value="create">Create Gate</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle>Gate Definitions & Status</CardTitle>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search by worker, project, or gate..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-20 text-center text-muted-foreground">Loading gates…</div>
              ) : filteredGates.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">
                  No training gates found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gate</TableHead>
                      <TableHead>Worker</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGates.map((gate) => (
                      <TableRow key={gate.id}>
                        <TableCell className="font-medium">{gate.gate_name}</TableCell>
                        <TableCell>{gate.worker?.full_name ?? 'Unknown'}</TableCell>
                        <TableCell>{gate.project?.name ?? 'Unassigned'}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(gate.status)} className="capitalize">
                            {gate.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{gate.attempt_count}</TableCell>
                        <TableCell>{gate.score ?? '—'}</TableCell>
                        <TableCell className="space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingGateId === gate.id}
                            onClick={() => handleStatusChange(gate, 'passed')}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Pass
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingGateId === gate.id}
                            onClick={() => handleStatusChange(gate, 'failed')}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Fail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Create Training Gate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrainingGateForm
                workers={workers}
                projects={projects}
                onSuccess={() => fetchGates()}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainingGatesPage;
