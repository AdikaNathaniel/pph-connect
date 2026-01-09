import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Project } from '@/types';
import { toast } from "sonner";

interface Question {
  id: string;
  question_id: string;
  row_index: number;
  data: Record<string, any>;
  required_replications: number;
  completed_replications: number;
  is_answered: boolean;
  answers: Answer[];
}

interface Answer {
  id: string;
  answer_id: string;
  worker_id: string;
  answer_data: Record<string, any>;
  start_time: string;
  completion_time: string;
  aht_seconds: number;
  worker: {
    full_name: string;
    email: string;
  };
}

interface QuestionStatusModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

const QuestionStatusModal: React.FC<QuestionStatusModalProps> = ({ project, isOpen, onClose }) => {
  // Don't render if project is null
  if (!project) {
    return null;
  }
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  useEffect(() => {
    if (isOpen && project) {
      fetchQuestions();
    }
  }, [isOpen, project]);

  // Listen for answer submission events to refresh data
  useEffect(() => {
    const handleAnswerSubmitted = () => {
      if (isOpen && project) {
        fetchQuestions();
      }
    };

    window.addEventListener('answerSubmitted', handleAnswerSubmitted);
    return () => window.removeEventListener('answerSubmitted', handleAnswerSubmitted);
  }, [isOpen, project]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          answers (
            id,
            answer_id,
            worker_id,
            answer_data,
            start_time,
            completion_time,
            aht_seconds,
            worker:profiles!answers_worker_id_fkey (
              full_name,
              email
            )
          )
        `)
        .eq('project_id', project.id)
        .order('row_index');

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch question status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter(q =>
    q.question_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.row_index.toString().includes(searchTerm) ||
    Object.values(q.data).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const exportToCSV = () => {
    const headers = [
      'Question ID',
      'Row Index',
      'Required Replications',
      'Completed Replications',
      'Is Answered',
      'Answer Count',
      'Completion %'
    ];

    const rows = questions.map(q => [
      q.question_id,
      q.row_index,
      q.required_replications,
      q.completed_replications,
      q.is_answered ? 'Yes' : 'No',
      q.answers.length,
      q.required_replications > 0 ? Math.round((q.completed_replications / q.required_replications) * 100) : 0
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}_question_status.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getCompletionColor = (question: Question) => {
    if (question.is_answered) return 'bg-green-500';
    if (question.completed_replications > 0) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  const getCompletionPercentage = (question: Question) => {
    if (question.required_replications === 0) return 0;
    return Math.round((question.completed_replications / question.required_replications) * 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Question Status - {project.name}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search questions by ID, row, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <div className="text-2xl font-bold text-yellow-600">
                  {questions.filter(q => !q.is_answered && q.completed_replications > 0).length}
                </div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-600">
                  {questions.filter(q => q.completed_replications === 0).length}
                </div>
                <div className="text-sm text-muted-foreground">Not Started</div>
              </CardContent>
            </Card>
          </div>

          {/* Questions List */}
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">Loading questions...</div>
            ) : (
              <div className="divide-y">
                {filteredQuestions.map((question) => (
                  <div key={question.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Row {question.row_index}</Badge>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {question.question_id}
                          </code>
                          <Badge 
                            variant={question.is_answered ? "default" : "secondary"}
                            className={question.is_answered ? "bg-green-100 text-green-800" : ""}
                          >
                            {question.is_answered ? "Answered" : "In Progress"}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Progress:</span>
                            <div className="w-32">
                              <Progress 
                                value={getCompletionPercentage(question)} 
                                className="h-2"
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {question.completed_replications}/{question.required_replications}
                            </span>
                          </div>
                        </div>

                        {/* Sample data preview */}
                        <div className="text-sm text-muted-foreground">
                          {Object.entries(question.data)
                            .slice(0, 3)
                            .map(([key, value]) => (
                              <span key={key} className="mr-4">
                                <strong>{key}:</strong> {String(value).substring(0, 50)}
                                {String(value).length > 50 ? '...' : ''}
                              </span>
                            ))
                          }
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedQuestion(question)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Question Details Modal */}
        {selectedQuestion && (
          <Dialog open={!!selectedQuestion} onOpenChange={() => setSelectedQuestion(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>
                  Question Details - Row {selectedQuestion.row_index}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Question Data</h4>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      {Object.entries(selectedQuestion.data).map(([key, value]) => (
                        <div key={key} className="mb-1">
                          <strong>{key}:</strong> {String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Answers ({selectedQuestion.answers.length})</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const answersData = selectedQuestion.answers.map(answer => ({
                            answer_id: answer.answer_id,
                            worker: {
                              full_name: answer.worker.full_name,
                              email: answer.worker.email
                            },
                            answer_data: answer.answer_data,
                            start_time: answer.start_time,
                            completion_time: answer.completion_time,
                            aht_seconds: answer.aht_seconds
                          }));
                          
                          const jsonString = JSON.stringify(answersData, null, 2);
                          navigator.clipboard.writeText(jsonString);
                          toast({
                            title: "Copied!",
                            description: "Answers data copied to clipboard as JSON"
                          });
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Copy as JSON
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedQuestion.answers.map((answer) => (
                        <div key={answer.id} className="border rounded p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {answer.answer_id}
                              </code>
                            </div>
                            <Badge variant="outline">
                              {answer.aht_seconds}s
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            By: {answer.worker.full_name} ({answer.worker.email})
                          </div>
                          <div className="text-sm">
                            {Object.entries(answer.answer_data).map(([key, value]) => (
                              <div key={key} className="mb-1">
                                <strong>{key}:</strong> {String(value)}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuestionStatusModal;
