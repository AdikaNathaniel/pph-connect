import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AssessmentCreator from '@/components/assessments/AssessmentCreator';
import { submitManualGrade } from '@/services/assessmentService';

const sampleAssessments = [
  {
    id: 'assess-1',
    name: 'Audio QA Fundamentals',
    category: 'audio',
    passingScore: 85,
    assignedProjects: 3,
  },
  {
    id: 'assess-2',
    name: 'Content Moderation v2',
    category: 'policy',
    passingScore: 90,
    assignedProjects: 5,
  },
];

const manualGradingQueue = [
  {
    id: 'queue-1',
    attemptId: 'attempt-1',
    workerId: 'worker-1',
    workerName: 'Alexis Chen',
    assessmentName: 'Audio QA Fundamentals',
    questionType: 'short_answer',
    submittedAt: '5m ago',
    prompt: 'Summarize the escalation policy for offensive content.',
    passingScore: 85,
  },
  {
    id: 'queue-2',
    attemptId: 'attempt-2',
    workerId: 'worker-2',
    workerName: 'Jordan Patel',
    assessmentName: 'Content Moderation v2',
    questionType: 'task',
    submittedAt: '12m ago',
    prompt: 'Review 3 sample tickets and flag policy violations.',
    passingScore: 90,
  },
];

export const AssessmentsPage: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [activeReview, setActiveReview] = useState<(typeof manualGradingQueue)[number] | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [scoreInput, setScoreInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');

  const assessments = useMemo(() => sampleAssessments, []);

  const loadAssessments = useCallback(() => {
    // Placeholder fetch routine – would call Supabase in next iteration
    return assessments;
  }, [assessments]);

  const handleCreatorSave = useCallback(() => {
    setIsCreateOpen(false);
    loadAssessments();
  }, [loadAssessments]);

  const openReview = useCallback((item: (typeof manualGradingQueue)[number]) => {
    setActiveReview(item);
    setScoreInput('');
    setFeedbackInput('');
    setReviewDialogOpen(true);
  }, []);

  const closeReview = useCallback(() => {
    setActiveReview(null);
    setReviewDialogOpen(false);
  }, []);

  const handleDialogChange = useCallback((open: boolean) => {
    if (!open) {
      closeReview();
    } else {
      setReviewDialogOpen(true);
    }
  }, [closeReview]);

  const handleSubmitGrade = useCallback(async () => {
    if (!activeReview) return;
    const score = Number(scoreInput);
    if (Number.isNaN(score)) {
      toast.error('Enter a valid score between 0 and 100');
      return;
    }

    const passed = score >= (activeReview.passingScore ?? 0);
    try {
      await submitManualGrade({
        recordId: activeReview.attemptId,
        workerId: activeReview.workerId,
        score,
        passed,
        feedback: feedbackInput,
        reviewerId: null,
      });
      toast.success('Grade submitted');
      closeReview();
    } catch (error) {
      console.error('AssessmentsPage: failed to submit manual grade', error);
      toast.error('Unable to submit grade right now.');
    }
  }, [activeReview, scoreInput, feedbackInput, closeReview]);

  const scoreValue = Number(scoreInput);
  const submitDisabled =
    !scoreInput ||
    Number.isNaN(scoreValue) ||
    scoreValue < 0 ||
    scoreValue > 100 ||
    !activeReview;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between" data-testid="assessments-page-title">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Assessments</h1>
          <p className="text-sm text-muted-foreground">Manage skill verifications and review results.</p>
        </div>
        <div className="flex gap-2" data-testid="assessments-page-actions">
          <Button variant="outline" onClick={() => setIsAssignOpen(true)}>
            Assign assessment
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>Create assessment</Button>
        </div>
      </div>

      <Card data-testid="assessments-page-list">
        <CardHeader>
          <CardTitle>All assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Passing Score</TableHead>
                <TableHead>Assigned Projects</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.map((assessment) => (
                <TableRow key={assessment.id}>
                  <TableCell className="font-medium">{assessment.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{assessment.category}</Badge>
                  </TableCell>
                  <TableCell>{assessment.passingScore}%</TableCell>
                  <TableCell>{assessment.assignedProjects}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="assessments-page-create">
          <CardHeader>
            <CardTitle>Create assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Launch new readiness checks with categories and passing scores.</p>
            <Button onClick={() => setIsCreateOpen(true)}>New assessment</Button>
          </CardContent>
        </Card>

        <Card data-testid="assessments-page-assign">
          <CardHeader>
            <CardTitle>Assign assessments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Pair existing assessments with workers or project tiers.</p>
            <Button variant="outline" onClick={() => setIsAssignOpen(true)}>
              Assign now
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="assessments-page-results">
        <CardHeader>
          <CardTitle>Recent results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Result dashboards will appear here once assessments gather data.</p>
        </CardContent>
      </Card>

      <Card data-testid="assessments-page-review">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Grading queue</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pending submissions that require manual grading.
            </p>
          </div>
          <Badge variant="secondary">{manualGradingQueue.length}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {manualGradingQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">All caught up! Nothing needs review.</p>
          ) : (
            manualGradingQueue.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{item.workerName}</p>
                    <p className="text-xs text-muted-foreground">{item.assessmentName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {item.questionType === 'short_answer' ? 'Short answer' : 'Task-based'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{item.submittedAt}</span>
                    <Button size="sm" variant="outline" onClick={() => openReview(item)}>
                      Review
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.prompt}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Dialog open={reviewDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent data-testid="manual-grading-modal">
          <DialogHeader>
            <DialogTitle>Manual grading</DialogTitle>
          </DialogHeader>
          {activeReview ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{activeReview.workerName}</p>
                <p className="text-xs text-muted-foreground">{activeReview.assessmentName}</p>
                <Badge variant="outline">
                  {activeReview.questionType === 'short_answer' ? 'Short answer' : 'Task-based'}
                </Badge>
              </div>

              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Prompt</p>
                <p className="text-sm text-foreground">{activeReview.prompt}</p>
              </div>

              <div className="space-y-2 rounded-lg border border-border/60 p-3" aria-label="Rubric">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Rubric</p>
                <ul className="list-disc pl-4 text-sm text-muted-foreground">
                  <li>Accuracy of policy references</li>
                  <li>Clarity of explanation</li>
                  <li>Actionable next steps</li>
                </ul>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="manual-score-input">Score (%)</label>
                  <Input
                    id="manual-score-input"
                    type="number"
                    min={0}
                    max={100}
                    value={scoreInput}
                    onChange={(event) => setScoreInput(event.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium" htmlFor="manual-feedback-input">Feedback</label>
                  <Textarea
                    id="manual-feedback-input"
                    placeholder="Share actionable feedback for the worker"
                    value={feedbackInput}
                    onChange={(event) => setFeedbackInput(event.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeReview}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitGrade} disabled={submitDisabled}>
                  Submit grade
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a submission to review.</p>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>New assessment</DialogTitle>
          </DialogHeader>
          <AssessmentCreator onSave={handleCreatorSave} />
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign assessment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Integrate this workflow with assignment APIs in the next iteration.</p>
            <Button onClick={() => setIsAssignOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssessmentsPage;
