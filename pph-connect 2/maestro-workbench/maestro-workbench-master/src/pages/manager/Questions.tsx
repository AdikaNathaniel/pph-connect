import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Project, TaskTemplate } from '@/types';
import { toast } from "sonner";
import { formatDateTimeET } from '@/lib/dateUtils';

interface Question {
  id: string;
  question_id: string;
  row_index: number;
  data: Record<string, unknown>;
  completed_replications: number;
  required_replications: number;
  is_answered: boolean;
  created_at: string;
}

interface Answer {
  answer_id: string;
  worker: {
    full_name: string;
    email: string;
  };
  answer_data: Record<string, unknown>;
  start_time: string;
  completion_time: string;
  aht_seconds: number;
}

type PasteEventDetails = {
  pastedLength?: number;
  timestamp?: string;
} | null;

interface PasteEventRecord {
  id: string;
  task_id: string;
  worker_id: string;
  field_id: string | null;
  field_name: string | null;
  details: PasteEventDetails;
  created_at: string;
  worker?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface EnrichedPasteEvent {
  id: string;
  taskId: string;
  questionId: string;
  workerId: string;
  workerName: string;
  workerEmail?: string | null;
  fieldId: string | null;
  fieldName: string | null;
  pastedLength?: number;
  createdAt: string;
}

const Questions = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [template, setTemplate] = useState<TaskTemplate | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer[]>>({});
  const [loading, setLoading] = useState(true);
  const [pasteEvents, setPasteEvents] = useState<Record<string, EnrichedPasteEvent[]>>({});

  const fetchProjectData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch template
      const { data: templateData, error: templateError } = await supabase
        .from('task_templates')
        .select('*')
        .eq('id', projectData.template_id)
        .single();

      if (templateError) throw templateError;
      setTemplate(templateData);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('project_id', projectId)
        .order('row_index');

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      const questionLookup = (questionsData || []).reduce<Record<string, Question>>((acc, question) => {
        acc[question.id] = question;
        return acc;
      }, {});

      // Fetch answers for all questions
      const questionIds = (questionsData || []).map(q => q.id);
      if (questionIds.length > 0) {
        const { data: answersData, error: answersError } = await supabase
          .from('answers')
          .select(`
            answer_id,
            question_id,
            answer_data,
            start_time,
            completion_time,
            aht_seconds,
            worker:profiles!answers_worker_id_fkey (
              full_name,
              email
            )
          `)
          .in('question_id', questionIds)
          .order('completion_time', { ascending: false });

        if (answersError) throw answersError;

        // Group answers by question_id
        const answersByQuestion: Record<string, Answer[]> = {};
        (answersData || []).forEach(answer => {
          if (!answersByQuestion[answer.question_id]) {
            answersByQuestion[answer.question_id] = [];
          }
          answersByQuestion[answer.question_id].push({
            answer_id: answer.answer_id,
            worker: answer.worker,
            answer_data: answer.answer_data,
            start_time: answer.start_time,
            completion_time: answer.completion_time,
            aht_seconds: answer.aht_seconds
          });
        });
        setAnswers(answersByQuestion);
      }

      const { data: pasteEventData, error: pasteEventsError } = await supabase
        .from('task_answer_events')
        .select(`
          id,
          task_id,
          worker_id,
          field_id,
          field_name,
          details,
          created_at,
          worker:profiles!task_answer_events_worker_id_fkey (
            full_name,
            email
          )
        `)
        .eq('project_id', projectId)
        .eq('event_type', 'paste')
        .order('created_at', { ascending: false });

      if (pasteEventsError) {
        console.warn('Failed to load paste events:', pasteEventsError);
        setPasteEvents({});
      } else {
        const rawEvents = (pasteEventData || []) as PasteEventRecord[];

        if (rawEvents.length === 0) {
          setPasteEvents({});
        } else {
          const taskIds = Array.from(new Set(rawEvents.map(event => event.task_id)));

          let taskQuestionMap: Record<string, string> = {};
          if (taskIds.length > 0) {
            const { data: taskData, error: taskError } = await supabase
              .from('tasks')
              .select('id, question_id')
              .in('id', taskIds);

            if (taskError) {
              console.warn('Failed to load tasks for paste events:', taskError);
            } else {
              taskQuestionMap = (taskData || []).reduce((acc, task) => {
                if (task.question_id) {
                  acc[task.id] = task.question_id;
                }
                return acc;
              }, {} as Record<string, string>);
            }
          }

          const eventsByQuestion: Record<string, EnrichedPasteEvent[]> = {};

          rawEvents.forEach(event => {
            let questionIdForEvent = taskQuestionMap[event.task_id];

            if (!questionIdForEvent && questionLookup[event.task_id]) {
              questionIdForEvent = event.task_id;
            }

            if (!questionIdForEvent) {
              console.warn('Paste event could not be mapped to a question', event);
              return;
            }

            if (!eventsByQuestion[questionIdForEvent]) {
              eventsByQuestion[questionIdForEvent] = [];
            }

            const workerInfo = event.worker || null;
            const details = event.details || {};
            const pastedLength = typeof details?.pastedLength === 'number' ? details.pastedLength : undefined;

            eventsByQuestion[questionIdForEvent].push({
              id: event.id,
              taskId: event.task_id,
              questionId: questionIdForEvent,
              workerId: event.worker_id,
              workerName: workerInfo?.full_name || 'Unknown worker',
              workerEmail: workerInfo?.email,
              fieldId: event.field_id,
              fieldName: event.field_name,
              pastedLength,
              createdAt: event.created_at,
            });
          });

          setPasteEvents(eventsByQuestion);
        }
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
      toast.error("Failed to load project data");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    fetchProjectData();
  }, [projectId, fetchProjectData]);

  const copyAnswersAsJson = (questionId: string) => {
    const questionAnswers = answers[questionId] || [];
    const jsonString = JSON.stringify(questionAnswers, null, 2);
    
    navigator.clipboard.writeText(jsonString).then(() => {
      toast.success("Answers copied to clipboard as JSON");
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
  };

  const getFieldName = (columnId: string): string => {
    if (!template?.column_config) return columnId;
    const column = template.column_config.find(col => col.id === columnId);
    return column?.name || columnId;
  };

  const totalPasteEvents = useMemo(() => {
    return Object.values(pasteEvents).reduce((count, eventsForQuestion) => count + eventsForQuestion.length, 0);
  }, [pasteEvents]);

  const getProgressColor = (completed: number, required: number) => {
    if (completed >= required) return 'bg-green-500';
    if (completed > 0) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-2">Project not found</h2>
        <Button onClick={() => navigate('/m/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/m/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{questions.length}</div>
            <div className="text-sm text-muted-foreground">Total Questions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {questions.filter(q => q.is_answered).length}
            </div>
            <div className="text-sm text-muted-foreground">Answered</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {questions.length - questions.filter(q => q.is_answered).length}
            </div>
            <div className="text-sm text-muted-foreground">Active Questions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {totalPasteEvents}
            </div>
            <div className="text-sm text-muted-foreground">Paste Events</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {questions.map((question) => {
          const questionAnswers = answers[question.id] || [];
          const progressPercentage = (question.completed_replications / question.required_replications) * 100;
          const questionPasteEvents = pasteEvents[question.id] || [];

          return (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Question {question.row_index}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    ID: {question.question_id}
                  </p>
                </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={question.is_answered ? "default" : "secondary"}>
                      {question.is_answered ? "Answered" : "Pending"}
                    </Badge>
                    {questionAnswers.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyAnswersAsJson(question.id)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy JSON
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{question.completed_replications}/{question.required_replications}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getProgressColor(question.completed_replications, question.required_replications)}`}
                        style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Question Data */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(question.data || {}).map(([key, value]) => (
                      <div key={key} className="p-3 bg-muted rounded-md">
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {key}
                        </div>
                        <div className="text-sm">
                          {String(value || 'N/A')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Answers */}
                  {questionAnswers.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Answers ({questionAnswers.length})</h4>
                      <div className="space-y-2">
                        {questionAnswers.map((answer, index) => (
                          <div key={answer.answer_id} className="p-3 border rounded-md">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-medium text-sm">
                                  {answer.worker.full_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {answer.worker.email}
                                </div>
                                <div className="text-xs text-blue-600 font-mono mt-1">
                                  ID: {answer.answer_id}
                                </div>
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <div>AHT: {Math.floor(answer.aht_seconds / 60)}m {answer.aht_seconds % 60}s</div>
                                <div>{formatDateTimeET(answer.completion_time)}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {Object.entries(answer.answer_data || {}).map(([key, value]) => (
                                <div key={key} className="text-sm">
                                  <span className="font-medium">{getFieldName(key)}:</span> {String(value)}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {questionPasteEvents.length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Badge variant="outline">Paste Events ({questionPasteEvents.length})</Badge>
                      </h4>
                      <div className="space-y-2">
                        {questionPasteEvents.map((event) => (
                          <div key={event.id} className="p-3 border border-yellow-200 bg-yellow-50 rounded-md text-sm">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <div className="font-medium">
                                  {event.workerName}
                                </div>
                                {event.workerEmail && (
                                  <div className="text-xs text-muted-foreground">{event.workerEmail}</div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <span>Pasted into</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {event.fieldName || event.fieldId || 'Unknown field'}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(event.createdAt).toLocaleString()}
                              </div>
                            </div>
                            {typeof event.pastedLength === 'number' && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Length: {event.pastedLength} characters
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Questions;
