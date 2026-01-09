import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  fetchGoldStandardQuestions,
  bulkUpdateGoldStandards,
  createGoldStandardQuestion,
  updateGoldDistributionTarget,
} from '@/services/goldStandardService';

interface Params {
  projectId?: string;
}

const parseJson = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    return parsed;
  } catch {
    return null;
  }
};

export const GoldStandardsPage: React.FC = () => {
  const { projectId } = useParams<Params>();
  const queryClient = useQueryClient();
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [distributionTarget, setDistributionTarget] = useState(10);
  const [answerTemplate, setAnswerTemplate] = useState('{"answer": ""}');
  const [formPrompt, setFormPrompt] = useState('');
  const [formIdentifier, setFormIdentifier] = useState('');
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('{"answer": ""}');

  const queryKey = ['gold-standards', projectId];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchGoldStandardQuestions(projectId ?? null),
    enabled: Boolean(projectId),
  });

  useEffect(() => {
    if (typeof data?.distributionTarget === 'number') {
      setDistributionTarget(data.distributionTarget);
    }
  }, [data?.distributionTarget]);

  const questions = data?.questions ?? [];
  const selectedCount = selectedQuestions.size;

  const toggleSelection = (questionId: string) => {
    setSelectedQuestions((previous) => {
      const next = new Set(previous);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedQuestions(new Set(questions.map((question) => question.id)));
  const clearSelection = () => setSelectedQuestions(new Set());

  const distributionMutation = useMutation({
    mutationFn: (value: number) => updateGoldDistributionTarget(projectId!, value),
    onSuccess: () => {
      toast.success('Gold standard distribution updated');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Failed to update distribution target'),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (isGold: boolean) => {
      if (!projectId) {
        throw new Error('Project id missing');
      }
      const selectedPayload = Array.from(selectedQuestions).map((id) => {
        const current = questions.find((question) => question.id === id);
        return {
          questionId: id,
          isGoldStandard: isGold,
          correctAnswer: isGold ? current?.correctAnswer ?? parseJson(answerTemplate) ?? {} : null,
        };
      });
      return bulkUpdateGoldStandards(projectId, selectedPayload);
    },
    onSuccess: (_, isGold) => {
      toast.success(isGold ? 'Marked questions as gold standards' : 'Removed gold standard flag');
      clearSelection();
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Failed to update selected questions'),
  });

  const createQuestionMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) {
        throw new Error('Project id missing');
      }
      const parsed = parseJson(formCorrectAnswer);
      if (!parsed) {
        toast.error('Correct answer must be valid JSON');
        return;
      }
      await createGoldStandardQuestion({
        projectId,
        prompt: formPrompt.trim(),
        questionIdentifier: formIdentifier.trim() || undefined,
        correctAnswer: parsed,
      });
    },
    onSuccess: () => {
      toast.success('Gold standard question created');
      setFormPrompt('');
      setFormIdentifier('');
      setFormCorrectAnswer('{"answer": ""}');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Failed to create gold standard question'),
  });

  const projectLink = useMemo(() => {
    if (!projectId) return null;
    return `/m/projects/${projectId}`;
  }, [projectId]);

  return (
    <div data-testid="manager-gold-standards" className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Gold Standards</h1>
          <Badge variant="secondary" className="gap-1">
            <Star className="h-3 w-3" />
            Quality controls
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Seed trusted questions to measure worker accuracy. Select existing prompts or create net-new
          gold standards without revealing them to workers.
        </p>
        {projectLink ? (
          <Link to={projectLink} className="text-sm text-primary hover:underline">
            ← Back to project overview
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card data-testid="gold-standard-distribution" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Distribution target</CardTitle>
            <CardDescription>
              Control the percentage of tasks that should be gold standards for this project.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Slider
                value={[distributionTarget]}
                min={0}
                max={25}
                step={0.5}
                onValueChange={([value]) => setDistributionTarget(value)}
                className="flex-1"
              />
              <div className="w-24">
                <Input
                  type="number"
                  min={0}
                  max={25}
                  step={0.5}
                  value={distributionTarget}
                  onChange={(event) => setDistributionTarget(Number(event.target.value))}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={() => distributionMutation.mutate(distributionTarget)}
                disabled={!projectId || distributionMutation.isPending}
              >
                {distributionMutation.isPending ? 'Saving…' : 'Save target'}
              </Button>
              <span className="text-xs text-muted-foreground">
                Recommended: 5–15% of all assignments.
              </span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="gold-standard-actions">
          <CardHeader>
            <CardTitle>Bulk actions</CardTitle>
            <CardDescription>
              Apply changes to selected questions. Use JSON to define/update the canonical answer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={5}
              value={answerTemplate}
              onChange={(event) => setAnswerTemplate(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={selectAll}
                disabled={!questions.length}
              >
                Select all
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                disabled={!selectedCount}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() => bulkUpdateMutation.mutate(true)}
                disabled={!selectedCount || bulkUpdateMutation.isPending}
              >
                {bulkUpdateMutation.isPending ? 'Updating…' : 'Mark as gold'}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => bulkUpdateMutation.mutate(false)}
                disabled={!selectedCount || bulkUpdateMutation.isPending}
              >
                Remove flag
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: {selectedCount} question{selectedCount === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="gold-standard-question-table">
        <CardHeader>
          <CardTitle>Project questions</CardTitle>
          <CardDescription>
            Toggle gold status and review the canonical answers attached to each prompt.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading project questions…
            </div>
          ) : questions.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No questions available yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Question ID</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Gold</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedQuestions.has(question.id)}
                        onCheckedChange={() => toggleSelection(question.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{question.questionIdentifier}</TableCell>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-2 text-sm">{question.prompt}</p>
                    </TableCell>
                    <TableCell>
                      {question.isGoldStandard ? (
                        <Badge variant="default">Gold</Badge>
                      ) : (
                        <Badge variant="secondary">Standard</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {question.updatedAt ? new Date(question.updatedAt).toLocaleString() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card data-testid="gold-standard-new-form">
        <CardHeader>
          <CardTitle>Create gold standard question</CardTitle>
          <CardDescription>
            Seed a new control question with a canonical answer. Workers will never see the tags.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Question identifier (optional)</label>
              <Input
                placeholder="E.g., QA-GS-001"
                value={formIdentifier}
                onChange={(event) => setFormIdentifier(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt</label>
              <Input
                placeholder="Describe the canonical prompt"
                value={formPrompt}
                onChange={(event) => setFormPrompt(event.target.value)}
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <label className="text-sm font-medium">Correct answer JSON</label>
            <Textarea
              rows={6}
              value={formCorrectAnswer}
              onChange={(event) => setFormCorrectAnswer(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Store the canonical structure workers must match. Supports arbitrary JSON payloads.
            </p>
          </div>
          <Button
            onClick={() => createQuestionMutation.mutate()}
            disabled={!projectId || !formPrompt.trim() || createQuestionMutation.isPending}
          >
            {createQuestionMutation.isPending ? 'Creating…' : 'Create gold standard'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoldStandardsPage;
