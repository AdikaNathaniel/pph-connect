import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface InterviewRecord {
  id: string;
  domain: string;
  transcript: string;
  score: number;
  confidence: number;
  conducted_at: string;
  review_status: string;
  review_notes?: string | null;
  worker?: {
    id: string;
    full_name?: string | null;
    hr_id?: string | null;
  } | null;
}

export const InterviewReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<InterviewRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overrideScore, setOverrideScore] = useState('');
  const [overrideConfidence, setOverrideConfidence] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Missing interview identifier.');
      setIsLoading(false);
      return;
    }
    const loadInterview = async () => {
      setIsLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from('ai_interviews')
        .select('id, domain, transcript, score, confidence, conducted_at, review_status, review_notes, worker:workers(id, full_name, hr_id)')
        .eq('id', id)
        .maybeSingle();
      if (queryError) {
        setError(queryError.message ?? 'Unable to load interview right now.');
        setRecord(null);
      } else if (!data) {
        setError('Interview not found.');
        setRecord(null);
      } else {
        const interview = data as unknown as InterviewRecord;
        setRecord(interview);
        setOverrideScore(String(interview.score ?? ''));
        setOverrideConfidence(String(interview.confidence ?? ''));
        setReviewNotes(interview.review_notes ?? '');
      }
      setIsLoading(false);
    };
    loadInterview().catch((loadError) => {
      console.error('InterviewReviewPage: unexpected load error', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unexpected error');
      setRecord(null);
      setIsLoading(false);
    });
  }, [id]);

  const handleUpdate = async (status: 'approved' | 'rejected') => {
    if (!record) return;
    setIsSaving(true);
    try {
      const parsedScore = Number(overrideScore);
      const parsedConfidence = Number(overrideConfidence);
      const payload = {
        score: Number.isFinite(parsedScore) ? parsedScore : record.score,
        confidence: Number.isFinite(parsedConfidence) ? parsedConfidence : record.confidence,
        review_status: status,
        review_notes: reviewNotes.trim().length ? reviewNotes.trim() : null,
        updated_at: new Date().toISOString(),
      };
      const { error: updateError } = await supabase
        .from('ai_interviews')
        .update(payload)
        .eq('id', record.id);
      if (updateError) {
        throw updateError;
      }
      toast.success(`Interview ${status === 'approved' ? 'approved' : 'rejected'}`);
      setRecord({
        ...record,
        score: payload.score,
        confidence: payload.confidence,
        review_status: status,
        review_notes: payload.review_notes ?? undefined,
      });
    } catch (updateIssue) {
      console.error('InterviewReviewPage: failed to update interview', updateIssue);
      toast.error('Unable to update interview');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading interview…
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Interview Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-destructive">{error ?? 'Interview not found.'}</p>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="manager-interview-review-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Manager · Interview Review</p>
          <h1 className="text-2xl font-bold text-foreground">Interview for {record.worker?.full_name ?? 'Worker'}</h1>
          <p className="text-sm text-muted-foreground">
            Conducted {new Date(record.conducted_at).toLocaleString()} • Domain {record.domain}
          </p>
        </div>
        <Badge variant={record.review_status === 'approved' ? 'default' : record.review_status === 'rejected' ? 'destructive' : 'outline'}>
          {record.review_status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score & Confidence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Score</label>
              <Input
                type="number"
                step="0.1"
                value={overrideScore}
                onChange={(event) => setOverrideScore(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confidence (%)</label>
              <Input
                type="number"
                step="0.1"
                value={overrideConfidence}
                onChange={(event) => setOverrideConfidence(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Manager notes</label>
            <Textarea
              rows={4}
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              placeholder="Add context for this interview result."
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => handleUpdate('approved')} disabled={isSaving}>
              Approve
            </Button>
            <Button variant="destructive" onClick={() => handleUpdate('rejected')} disabled={isSaving}>
              Reject
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                navigator.clipboard
                  .writeText(record.transcript)
                  .then(() => toast.success('Transcript copied to clipboard'))
                  .catch(() => toast.error('Unable to copy transcript'));
              }}
            >
              Copy transcript
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="interview-review-transcript">
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="whitespace-pre-wrap rounded-md border border-border/60 bg-muted/40 p-4 text-sm leading-relaxed">
            {record.transcript}
          </pre>
          {record.worker?.hr_id ? (
            <p className="text-sm text-muted-foreground">
              Worker ID:{' '}
              <Link className="underline" to={`/m/workers/${record.worker.id}`}>
                {record.worker.hr_id}
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default InterviewReviewPage;
