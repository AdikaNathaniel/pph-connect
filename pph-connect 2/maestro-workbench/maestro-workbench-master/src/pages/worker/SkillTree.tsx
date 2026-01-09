import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { getSkillTreeConfig, getWorkerSkillTreeProgress, type SkillTreeDefinition, type SkillTreeNodeProgress } from '@/services/skillTreeService';

const categoryFilters = [
  { id: 'all', label: 'All nodes' },
  { id: 'foundations', label: 'Foundations' },
  { id: 'quality', label: 'Quality' },
  { id: 'domain', label: 'Domain' },
];

const statusColorMap: Record<SkillTreeNodeProgress['status'], string> = {
  completed: 'bg-emerald-50 border-emerald-300',
  available: 'bg-amber-50 border-amber-300',
  locked: 'bg-muted border-dashed border-border/60',
};

const statusBadgeVariant: Record<SkillTreeNodeProgress['status'], 'default' | 'secondary' | 'outline'> = {
  completed: 'default',
  available: 'secondary',
  locked: 'outline',
};

export const WorkerSkillTreePage: React.FC = () => {
  const { user } = useAuth();
  const [skillTree] = useState<SkillTreeDefinition>(() => getSkillTreeConfig());
  const [progress, setProgress] = useState<SkillTreeNodeProgress[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      setLoading(true);
      try {
        const result = await getWorkerSkillTreeProgress(user?.id ?? '');
        setProgress(result.nodes);
        if (!selectedNodeId && result.nodes.length) {
          setSelectedNodeId(result.nodes[0].id);
        }
      } catch (error) {
        console.error('WorkerSkillTreePage: failed to load progress', error);
        toast.error('Unable to load skill tree progress right now.');
        setProgress([]);
      } finally {
        setLoading(false);
      }
    };
    loadProgress().catch((error) => console.warn('WorkerSkillTreePage: unexpected error', error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const selectedNode = progress.find((node) => node.id === selectedNodeId) ?? progress[0] ?? null;

  const filteredNodes = useMemo(() => {
    if (activeCategory === 'all') {
      return progress;
    }
    return progress.filter((node) => node.category === activeCategory);
  }, [progress, activeCategory]);

  const renderNode = (node: SkillTreeNodeProgress) => (
    <button
      key={node.id}
      type="button"
      data-testid="skill-tree-node"
      onClick={() => setSelectedNodeId(node.id)}
      className={`flex flex-col rounded-xl border px-4 py-3 text-left transition hover:shadow-sm ${
        statusColorMap[node.status]
      } ${selectedNodeId === node.id ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{node.title}</p>
          <p className="text-xs uppercase text-muted-foreground tracking-wide">{node.type}</p>
        </div>
        <Badge variant={statusBadgeVariant[node.status]} className="capitalize text-xs">
          {node.status}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{node.description}</p>
      <div className="mt-3">
        <Progress value={node.completionPercent} aria-label={`${node.title} progress`} />
        <p className="mt-1 text-xs text-muted-foreground">{node.progressLabel}</p>
      </div>
    </button>
  );

  return (
    <div className="bg-background min-h-screen" data-testid="worker-skill-tree-page">
      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Growth roadmap</p>
            <h1 className="text-3xl font-bold">Skill Tree</h1>
            <p className="text-sm text-muted-foreground">
              Track how trainings, assessments, and achievements unlock advanced work.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSelectedNodeId(progress[0]?.id ?? null)} disabled={loading}>
            Reset Focus
          </Button>
        </div>

        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex flex-wrap gap-2">
            {categoryFilters.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="rounded-full border border-border/60 px-4 py-2 text-xs"
              >
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {categoryFilters.map((category) => (
            <TabsContent key={category.id} value={category.id} className="mt-4">
              <div className="grid gap-4 md:grid-cols-2" data-testid="skill-tree-graph">
                {(category.id === activeCategory ? filteredNodes : progress.filter((node) => category.id === 'all' || node.category === category.id)).map(
                  (node) => renderNode(node)
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <Card data-testid="skill-tree-details">
          <CardHeader>
            <CardTitle>Node details</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading node details…</p>
            ) : selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={statusBadgeVariant[selectedNode.status]} className="capitalize">
                    {selectedNode.status}
                  </Badge>
                  <p className="text-lg font-semibold text-foreground">{selectedNode.title}</p>
                </div>
                <p className="text-sm text-muted-foreground">{selectedNode.description}</p>
                <div>
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">Requirements</p>
                  <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                    {selectedNode.requirements.map((req) => (
                      <li key={req}>{req}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">Progress</p>
                  <p className="text-sm font-medium text-foreground">{selectedNode.progressLabel}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">Connections</p>
                  <p className="text-sm text-muted-foreground">
                    Unlocks:{' '}
                    {skillTree.edges
                      .filter((edge) => edge.from === selectedNode.id)
                      .map((edge) => progress.find((node) => node.id === edge.to)?.title ?? edge.to)
                      .join(', ') || 'No downstream nodes'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a node to view requirements.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkerSkillTreePage;
