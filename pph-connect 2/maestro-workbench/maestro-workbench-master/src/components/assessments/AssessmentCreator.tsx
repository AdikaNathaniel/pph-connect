import React, { useCallback, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AssessmentDraft,
  AssessmentQuestionDraft,
  createAssessmentDefinition,
} from '@/services/assessmentService';

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'task';

export interface AssessmentCreatorProps {
  onSave?: (draft: AssessmentDraft) => void;
}

const categories = ['audio', 'policy', 'language', 'creative'];

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const defaultQuestion = (): AssessmentQuestionDraft => ({
  id: createId(),
  prompt: '',
  type: 'multiple_choice',
  options: ['', ''],
  correctIndex: 0,
  instructions: '',
});

export const AssessmentCreator: React.FC<AssessmentCreatorProps> = ({ onSave }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [passingScore, setPassingScore] = useState(85);
  const [questions, setQuestions] = useState<AssessmentQuestionDraft[]>([defaultQuestion()]);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddQuestion = useCallback(() => {
    setQuestions((previous) => [...previous, defaultQuestion()]);
  }, []);

  const handleQuestionChange = useCallback(
    (questionId: string, updater: (question: AssessmentQuestionDraft) => AssessmentQuestionDraft)
      => {
      setQuestions((previous) => previous.map((question) => {
        if (question.id !== questionId) return question;
        return updater(question);
      }));
    },
    []
  );

  const handleOptionChange = useCallback((questionId: string, optionIndex: number, value: string) => {
    handleQuestionChange(questionId, (question) => {
      const nextOptions = question.options.map((option, index) => (index === optionIndex ? value : option));
      return { ...question, options: nextOptions };
    });
  }, [handleQuestionChange]);

  const handleAddOption = useCallback((questionId: string) => {
    handleQuestionChange(questionId, (question) => ({
      ...question,
      options: [...question.options, ''],
    }));
  }, [handleQuestionChange]);

  const handleTypeChange = useCallback((questionId: string, type: QuestionType) => {
    handleQuestionChange(questionId, (question) => {
      let nextOptions = question.options;
      if (type === 'multiple_choice') {
        nextOptions = question.options.length ? question.options : ['', ''];
      } else if (type === 'true_false') {
        nextOptions = ['True', 'False'];
      } else {
        nextOptions = [];
      }
      return {
        ...question,
        type,
        options: nextOptions,
      };
    });
  }, [handleQuestionChange]);

  const handleSave = async () => {
    const draft: AssessmentDraft = {
      name,
      category,
      passingScore,
      questions,
    };

    if (!draft.name.trim()) {
      toast.error('Assessment name is required');
      return;
    }

    setIsSaving(true);
    try {
      await createAssessmentDefinition(draft);
      toast.success('Assessment draft saved');
      onSave?.(draft);
    } catch (error) {
      console.error('Failed to save assessment draft', error);
      toast.error('Failed to save assessment');
    } finally {
      setIsSaving(false);
    }
  };

  const previewJson = useMemo(() => (
    JSON.stringify({ name, category, passingScore, questionCount: questions.length }, null, 2)
  ), [name, category, passingScore, questions.length]);

  return (
    <div className="space-y-6">
      <Card data-testid="assessment-creator-metadata">
        <CardHeader>
          <CardTitle>Assessment metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="assessment-name">Name</label>
            <Input id="assessment-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="assessment-category">Category</label>
            <Input id="assessment-category" placeholder="e.g., audio" value={category} onChange={(event) => setCategory(event.target.value)} list="assessment-category-options" />
            <datalist id="assessment-category-options">
              {categories.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="assessment-passing-score">Passing score (%)</label>
            <Input id="assessment-passing-score" type="number" min={1} max={100} value={passingScore} onChange={(event) => setPassingScore(Number(event.target.value) || 0)} />
          </div>
        </CardContent>
      </Card>

      <Card data-testid="assessment-creator-questions">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Questions</CardTitle>
          <Button variant="outline" size="sm" onClick={handleAddQuestion}>Add question</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="space-y-3 rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Question {index + 1}</span>
                <Badge variant="outline">{question.type.replace('_', ' ')}</Badge>
              </div>
              <Input value={question.prompt} onChange={(event) => handleQuestionChange(question.id, (current) => ({ ...current, prompt: event.target.value }))} placeholder="Enter question prompt" />
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant={question.type === 'multiple_choice' ? 'default' : 'outline'} onClick={() => handleTypeChange(question.id, 'multiple_choice')}>
                    Multiple choice
                  </Button>
                  <Button size="sm" variant={question.type === 'true_false' ? 'default' : 'outline'} onClick={() => handleTypeChange(question.id, 'true_false')}>
                    True/False
                  </Button>
                  <Button size="sm" variant={question.type === 'short_answer' ? 'default' : 'outline'} onClick={() => handleTypeChange(question.id, 'short_answer')}>
                    Short answer
                  </Button>
                  <Button size="sm" variant={question.type === 'task' ? 'default' : 'outline'} onClick={() => handleTypeChange(question.id, 'task')}>
                    Task-based
                  </Button>
                </div>
              {question.type === 'multiple_choice' && (
                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <div key={`${question.id}-option-${optionIndex}`} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(event) => handleOptionChange(question.id, optionIndex, event.target.value)}
                        placeholder={`Option ${optionIndex + 1}`}
                      />
                      <Button
                        type="button"
                        variant={question.correctIndex === optionIndex ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleQuestionChange(question.id, (current) => ({ ...current, correctIndex: optionIndex }))}
                      >
                        Correct
                      </Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => handleAddOption(question.id)}>Add option</Button>
                </div>
              )}
              {question.type === 'task' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium" htmlFor={`task-instructions-${question.id}`}>
                    Task instructions
                  </label>
                  <Textarea
                    id={`task-instructions-${question.id}`}
                    value={question.instructions ?? ''}
                    onChange={(event) => handleQuestionChange(question.id, (current) => ({
                      ...current,
                      instructions: event.target.value,
                    }))}
                    placeholder="Describe the practical evaluation steps"
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card data-testid="assessment-creator-preview">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea readOnly value={previewJson} className="font-mono text-xs" rows={6} />
          <div className="mt-3 flex justify-end gap-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save draft'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssessmentCreator;
