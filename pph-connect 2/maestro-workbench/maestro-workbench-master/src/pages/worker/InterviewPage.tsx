import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WorkerLayout from '@/components/layout/WorkerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  askQuestion,
  evaluateAnswer,
  generateInterviewReport,
  startInterview,
  type InterviewEvaluationResponse,
  type InterviewQuestionResponse,
} from '@/services/aiInterviewService';
import { saveInterviewResult } from '@/services/interviewStorageService';

interface ChatMessage {
  id: string;
  role: 'system' | 'assistant' | 'user';
  content: string;
  meta?: {
    questionId?: string;
    score?: number;
    feedback?: string;
  };
}

type SpeechRecognitionWithWebkit = SpeechRecognition & {
  stop: () => void;
  start: () => void;
};

type SpeechRecognitionConstructor =
  | (new () => SpeechRecognitionWithWebkit)
  | undefined;

export const InterviewPage: React.FC = () => {
  const { domain } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ asked: number; total: number }>({ asked: 0, total: 0 });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestionResponse | null>(null);
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reportId, setReportId] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const workerId = user?.id ?? null;

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      chatRef.current?.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: 'smooth',
      });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const appendMessage = useCallback((message: ChatMessage | ChatMessage[]) => {
    setMessages((previous) => [...previous, ...(Array.isArray(message) ? message : [message])]);
  }, []);

  const bootSession = useCallback(async () => {
    if (!workerId) {
      toast.error('Please sign in to access interviews.');
      navigate('/w/dashboard');
      return;
    }

    setIsLoading(true);
    try {
      const session = await startInterview(workerId, domain);
      setSessionId(session.sessionId);
      setProgress({ asked: 0, total: session.totalQuestions });
      appendMessage({
        id: 'intro',
        role: 'assistant',
        content: `Welcome to the ${session.domain} interview. I will ask a few questions to understand your experience.`,
      });
      const question = await askQuestion(session.sessionId);
      setCurrentQuestion(question);
      setProgress(question.progress);
      appendMessage({
        id: question.questionId,
        role: 'assistant',
        content: question.question,
      });
    } catch (error) {
      console.error('InterviewPage: failed to start interview', error);
      toast.error('Unable to start the interview. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [appendMessage, domain, navigate, workerId]);

  useEffect(() => {
    bootSession().catch((error) => console.warn('InterviewPage: unexpected boot error', error));
  }, [bootSession]);

  useEffect(() => {
    // window.SpeechRecognition detection plus window.webkitSpeechRecognition fallback
    const supportsNativeApi = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition);
    const supportsWebkitApi = typeof window !== 'undefined' && Boolean((window as any).webkitSpeechRecognition);
    const hasSpeechRecognitionApi = supportsNativeApi || supportsWebkitApi;

    type ExtendedWindow = Window &
      typeof globalThis & {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      };

    const extendedWindow = window as ExtendedWindow;
    const speechRecognitionGlobal = extendedWindow.SpeechRecognition;
    const webkitSpeechRecognitionGlobal = extendedWindow.webkitSpeechRecognition;
    const nativeRecognition = speechRecognitionGlobal ?? null;
    const webkitRecognition = webkitSpeechRecognitionGlobal ?? null;
    const SpeechRecognitionConstructor = nativeRecognition ?? webkitRecognition;

    if (SpeechRecognitionConstructor && hasSpeechRecognitionApi) {
      setSpeechSupported(Boolean(nativeRecognition || webkitRecognition));
      const recognition = new SpeechRecognitionConstructor();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        // transcribe speech input into text
        const transcribedText = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? '')
          .join(' ')
          .trim();
        if (transcribedText.length) {
          setAnswer((previous) => (previous ? `${previous} ${transcribedText}` : transcribedText));
        }
      };
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('InterviewPage: speech recognition error', event.error);
        toast.error('Speech recognition error. Please try again.');
        setIsListening(false);
      };
      recognition.onend = () => {
        setIsListening(false);
      };
      speechRecognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      speechRecognitionRef.current?.stop();
      speechRecognitionRef.current = null;
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!speechSupported || !speechRecognitionRef.current) {
      toast.error('Speech recognition not supported on this browser.');
      return;
    }
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.warn('InterviewPage: failed to start speech recognition', error);
        toast.error('Unable to start speech recognition.');
      }
    }
  }, [isListening, speechSupported]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!sessionId || !currentQuestion || !answer.trim()) {
      toast.error('Please provide an answer before submitting.');
      return;
    }
    setIsSubmitting(true);
    try {
      appendMessage({
        id: `${currentQuestion.questionId}-answer`,
        role: 'user',
        content: answer.trim(),
      });
      const evaluation: InterviewEvaluationResponse = await evaluateAnswer(sessionId, answer.trim());
      appendMessage({
        id: `${currentQuestion.questionId}-feedback`,
        role: 'assistant',
        content: `Thanks for your answer. Score: ${evaluation.score}/5.`,
        meta: {
          questionId: evaluation.questionId,
          score: evaluation.score,
          feedback: evaluation.feedback,
        },
      });
      setAnswer('');
      const nextQuestion = await askQuestion(sessionId);
      setCurrentQuestion(nextQuestion.completed ? null : nextQuestion);
      setProgress(nextQuestion.progress);
      if (nextQuestion.completed) {
        appendMessage({
          id: 'complete',
          role: 'assistant',
          content: 'Interview complete. Generating final report…',
        });
        const report = await generateInterviewReport(sessionId);
        setReportId(report.sessionId);
        try {
          await saveInterviewResult({
            workerId: workerId ?? '',
            domain: domain ?? report.domain,
            questions: report.answers.map((answer) => ({
              questionId: answer.questionId,
              question: answer.question,
            })),
            answers: report.answers.map((answer) => ({
              questionId: answer.questionId,
              answer: answer.answer,
              score: answer.score,
              feedback: answer.feedback,
            })),
            transcript: report.transcript,
            score: report.score,
            confidence: Math.min(100, Math.max(0, report.score * 20)),
            conductedAt: report.completedAt,
          });
        } catch (persistError) {
          console.warn('InterviewPage: failed to persist interview', persistError);
        }
        appendMessage({
          id: 'report',
          role: 'assistant',
          content: `Interview complete. Final score: ${report.score}/5.`,
          meta: {
            feedback: report.transcript,
            score: report.score,
          },
        });
      } else {
        appendMessage({
          id: nextQuestion.questionId,
          role: 'assistant',
          content: nextQuestion.question,
        });
      }
    } catch (error) {
      console.error('InterviewPage: failed to submit answer', error);
      toast.error('Unable to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [appendMessage, answer, currentQuestion, sessionId]);

  const progressLabel = useMemo(() => {
    if (!progress.total) return '0%';
    const percent = Math.min(100, Math.round((progress.asked / progress.total) * 100));
    return `${percent}%`;
  }, [progress]);

  return (
    <WorkerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2" data-testid="worker-interview-header">
          <p className="text-sm text-muted-foreground">Interviews</p>
          <h1 className="text-2xl font-bold">AI Interview</h1>
          <p className="text-sm text-muted-foreground">
            {domain ? `Domain: ${domain}` : 'Answer the questions to highlight your experience.'}
          </p>
        </div>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Conversation</CardTitle>
            <Badge variant="outline" data-testid="worker-interview-progress">
              {progress.asked} / {progress.total} · {progressLabel}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="h-[360px] overflow-y-auto rounded-md border border-border/60 p-4"
              data-testid="worker-interview-chat"
              ref={chatRef}
            >
              {messages.map((message) => (
                <div key={message.id} className="mb-4">
                  <p className="text-xs uppercase text-muted-foreground">
                    {message.role === 'assistant' ? 'AI Interviewer' : message.role === 'user' ? 'You' : 'System'}
                  </p>
                  <div className="rounded-md bg-muted/40 p-3 text-sm">
                    <p>{message.content}</p>
                    {message.meta?.score != null ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Score: {message.meta.score}/5 · {message.meta.feedback}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
              {isLoading ? (
                <p className="text-center text-sm text-muted-foreground">Preparing interview…</p>
              ) : null}
            </div>

            <div className="space-y-3" data-testid="worker-interview-composer">
              <Textarea
                placeholder="Type your answer here…"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                rows={4}
              />
              <div className="flex items-center gap-3">
                <Button onClick={handleSubmitAnswer} disabled={isSubmitting || !currentQuestion}>
                  {currentQuestion ? 'Send Answer' : 'Interview Complete'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!reportId}
                  onClick={async () => {
                    if (!sessionId) return;
                    const report = await generateInterviewReport(sessionId);
                    navigator.clipboard
                      .writeText(report.transcript)
                      .then(() => toast.success('Transcript copied to clipboard'))
                      .catch(() => toast.error('Unable to copy transcript'));
                  }}
                >
                  Copy Transcript
                </Button>
                {speechSupported ? (
                  <Button
                    type="button"
                    variant={isListening ? 'destructive' : 'outline'}
                    onClick={toggleListening}
                    data-testid="worker-interview-voice-toggle"
                  >
                    {isListening ? 'Stop Listening' : 'Speak Answer'}
                  </Button>
                ) : (
                  <Badge variant="secondary">Speech input unavailable</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </WorkerLayout>
  );
};

export default InterviewPage;
