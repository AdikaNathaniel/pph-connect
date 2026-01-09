import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { gradeAssessmentResponses } from '@/services/assessmentGradingService';
import { listAssessmentDefinitions, AssessmentDefinition, recordAssessmentResult } from '@/services/assessmentService';

interface QuestionShape {
  id: string;
  prompt: string;
  type: string;
  options: string[];
  correctIndex: number | null;
  instructions?: string;
}

const parseQuestions = (definition: AssessmentDefinition): QuestionShape[] => {
  const raw = definition.metadata?.questions;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((question) => ({
    id: question.id ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
    prompt: question.prompt ?? 'Untitled question',
    type: question.type ?? 'multiple_choice',
    options: question.options ?? [],
    correctIndex: typeof question.correctIndex === 'number' ? question.correctIndex : null,
    instructions: question.instructions ?? '',
  }));
};

export const WorkerAssessmentsPage: React.FC = () => {
  const { user } = useAuth();
  const workerId = user?.id ?? null;
  const [assessments, setAssessments] = useState<AssessmentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAssessment, setActiveAssessment] = useState<AssessmentDefinition | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await listAssessmentDefinitions();
      setAssessments(data);
      setLoading(false);
    };
    load();
  }, []);

  const questions = useMemo(() => (activeAssessment ? parseQuestions(activeAssessment) : []), [activeAssessment]);

  const handleStart = (assessment: AssessmentDefinition) => {
    setActiveAssessment(assessment);
    setCurrentQuestionIndex(0);
    setResponses({});
    setResult(null);
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    setCurrentQuestionIndex((index) => Math.min(index + 1, questions.length - 1));
  };

  const handlePrevious = () => {
    setCurrentQuestionIndex((index) => Math.max(index - 1, 0));
  };

  const handleSubmit = async () => {
    if (!activeAssessment) return;
    if (questions.length === 0) {
      toast.error('Assessment does not contain any questions yet.');
      return;
    }

    setIsSubmitting(true);
    try {
      const gradeResult = gradeAssessmentResponses({
        passingScore: activeAssessment.passingScore ?? 0,
        questions: questions.map((question) => ({
          id: question.id,
          prompt: question.prompt,
          type: question.type,
          options: question.options,
          correctIndex: question.correctIndex,
        })),
        responses,
      });

      if (workerId) {
        await recordAssessmentResult({
          workerId,
          assessmentId: activeAssessment.id,
          assessmentName: activeAssessment.name,
          assessmentType: activeAssessment.category,
          score: gradeResult.score,
          passed: gradeResult.passed,
          responses,
          breakdown: gradeResult.breakdown,
        });
      } else {
        console.warn('WorkerAssessmentsPage: unable to persist result without worker id');
      }

      setResult({ score: gradeResult.score, passed: gradeResult.passed });

      if (gradeResult.passed) {
        toast.success('Assessment passed. Qualifications will update soon.');
      } else {
        toast.error('Assessment submitted. A manager will review remaining items.');
      }
    } catch (error) {
      console.error('WorkerAssessmentsPage: failed to submit assessment', error);
      toast.error('Unable to submit assessment right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
        <p className="text-sm text-muted-foreground">Complete assessments to unlock new projects.</p>
      </div>

      <Card data-testid="worker-assessments-list">
        <CardHeader>
          <CardTitle>Available assessments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-2">
              {[0, 1].map((index) => (
                <div key={`assessment-skeleton-${index}`} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : assessments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assessments available at this time.</p>
          ) : (
            assessments.map((assessment) => (
              <div key={assessment.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{assessment.name}</p>
                  <p className="text-xs text-muted-foreground">Passing score {assessment.passingScore}%</p>
                </div>
                <Button size="sm" onClick={() => handleStart(assessment)}>
                  Start
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card data-testid="worker-assessment-runner">
        <CardHeader>
          <CardTitle>{activeAssessment ? activeAssessment.name : 'Select an assessment to begin'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeAssessment && currentQuestion ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <Badge variant="outline">{currentQuestion.type.replace('_', ' ')}</Badge>
              </div>
              <p className="text-base font-medium text-foreground">{currentQuestion.prompt}</p>
              {currentQuestion.instructions ? (
                <p className="text-sm text-muted-foreground">{currentQuestion.instructions}</p>
              ) : null}

              {currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false' ? (
                <RadioGroup
                  value={responses[currentQuestion.id] ?? ''}
                  onValueChange={(value) => handleResponseChange(currentQuestion.id, value)}
                  className="space-y-2"
                >
                  {(currentQuestion.options ?? []).map((option) => (
                    <div key={`${currentQuestion.id}-${option}`} className="flex items-center gap-2 rounded-md border px-3 py-2">
                      <RadioGroupItem value={option} id={`${currentQuestion.id}-${option}`} />
                      <Label htmlFor={`${currentQuestion.id}-${option}`}>{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <Textarea
                  value={responses[currentQuestion.id] ?? ''}
                  onChange={(event) => handleResponseChange(currentQuestion.id, event.target.value)}
                  placeholder="Type your answer"
                />
              )}

              <div className="flex justify-between">
                <Button variant="outline" size="sm" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
                  Previous
                </Button>
                {currentQuestionIndex < questions.length - 1 ? (
                  <Button variant="outline" size="sm" onClick={handleNext}>
                    Next
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting…' : 'Submit'}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Choose an assessment to begin answering questions.</p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="worker-assessment-results">
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div>
                <p className="text-sm font-semibold">Score {result.score}%</p>
                <p className="text-xs text-muted-foreground">Passing score {activeAssessment?.passingScore ?? '--'}%</p>
              </div>
              <Badge variant={result.passed ? 'default' : 'destructive'}>
                {result.passed ? 'Passed' : 'Review required'}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Results will appear after you submit an assessment.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkerAssessmentsPage;
