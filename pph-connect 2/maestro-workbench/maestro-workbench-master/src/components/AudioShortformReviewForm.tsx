import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AudioShortformPlayer } from './AudioShortformPlayer';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { getKeySymbol } from '@/lib/keyboard-utils';

interface ReviewFormProps {
  audioUrl: string;
  answerId: string;
  answerData: Record<string, any>;
  questionData: Record<string, any>;
  ratingMax: number;
  highlightTags: string[];
  allowFeedback: boolean;
  allowInternalNotes: boolean;
  submitting: boolean;
  onSubmit: (payload: {
    transcription: string;
    preamble: string;
    rating: number;
    highlightTags: string[];
    feedback?: string;
    internalNotes?: string;
  }) => void;
  onSkip?: () => void;
}

const ReviewStar: React.FC<{
  index: number;
  active: boolean;
  onClick: () => void;
}> = ({ index, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'h-10 w-10 rounded-full border flex items-center justify-center text-lg transition',
      active
        ? 'bg-amber-400 border-amber-500 text-white shadow'
        : 'bg-background hover:bg-muted'
    )}
    aria-label={`Set rating ${index}`}
  >
    ★
  </button>
);

const AudioShortformReviewForm: React.FC<ReviewFormProps> = ({
  audioUrl,
  answerId,
  answerData,
  questionData,
  ratingMax,
  highlightTags,
  allowFeedback,
  allowInternalNotes,
  submitting,
  onSubmit,
  onSkip,
}) => {
  const initialTranscription =
    (answerData?.transcription as string | undefined) ||
    (answerData?.main_transcription as string | undefined) ||
    '';
  const initialPreamble =
    (answerData?.preamble as string | undefined) ||
    (questionData?.preamble as string | undefined) ||
    '';

  const formRef = useRef<HTMLFormElement>(null);
  const [transcription, setTranscription] = useState(initialTranscription);
  const [preamble, setPreamble] = useState(initialPreamble);
  const [rating, setRating] = useState(Math.min(Math.max(1, ratingMax), ratingMax));
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const platform =
      (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
      navigator.platform ??
      navigator.userAgent;
    return /mac|iphone|ipod|ipad/i.test(platform);
  }, []);

  const submitShortcuts = useMemo(
    () =>
      isMac
        ? [
            {
              keys: ['Shift', 'Enter'],
              matcher: (event: KeyboardEvent) =>
                event.key === 'Enter' &&
                event.shiftKey &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey,
            },
            {
              keys: ['Cmd', 'Enter'],
              matcher: (event: KeyboardEvent) =>
                event.key === 'Enter' && event.metaKey && !event.ctrlKey && !event.altKey,
            },
          ]
        : [
            {
              keys: ['Ctrl', 'Enter'],
              matcher: (event: KeyboardEvent) =>
                event.key === 'Enter' && event.ctrlKey && !event.metaKey && !event.altKey,
            },
          ],
    [isMac]
  );

  const normalizedTags = useMemo(() => highlightTags ?? [], [highlightTags]);
  const submitDisplayShortcuts = useMemo(
    () => (isMac ? submitShortcuts.slice(0, 1) : submitShortcuts),
    [isMac, submitShortcuts]
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((value) => value !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!transcription.trim()) {
      return;
    }

    onSubmit({
      transcription: transcription.trim(),
      preamble: preamble.trim(),
      rating,
      highlightTags: selectedTags,
      feedback: allowFeedback ? feedback.trim() : undefined,
      internalNotes: allowInternalNotes ? internalNotes.trim() : undefined,
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const formElement = formRef.current;
      if (!formElement) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isBodyOrHtml =
        target === document.body || target === document.documentElement;
      if (target && !isBodyOrHtml && !formElement.contains(target)) {
        return;
      }

      if (submitShortcuts.some((shortcut) => shortcut.matcher(event))) {
        event.preventDefault();
        if (!submitting && transcription.trim()) {
          if (typeof formElement.requestSubmit === 'function') {
            formElement.requestSubmit();
          } else {
            formElement.dispatchEvent(
              new Event('submit', { cancelable: true, bubbles: true })
            );
          }
        }
        return;
      }

      const shiftOnly =
        event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;

      if (!shiftOnly) {
        return;
      }

      const codeMatch = /^Digit([1-9])$/.exec(event.code || '');
      const numpadMatch = /^Numpad([1-9])$/.exec(event.code || '');
      const shiftedSymbolMap: Record<string, number> = {
        '!': 1,
        '@': 2,
        '#': 3,
        '$': 4,
        '%': 5,
      };

      const symbolValue = shiftedSymbolMap[event.key] ?? null;
      let digitValue = codeMatch
        ? Number.parseInt(codeMatch[1], 10)
        : numpadMatch
        ? Number.parseInt(numpadMatch[1], 10)
        : symbolValue;

      if (!digitValue && /^[1-9]$/.test(event.key)) {
        digitValue = Number.parseInt(event.key, 10);
      }

      if (!digitValue || digitValue < 1) {
        return;
      }

      const maxHotkeyValue = Math.min(5, ratingMax);
      if (digitValue > maxHotkeyValue) {
        return;
      }

      event.preventDefault();
      setRating(digitValue);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [ratingMax, submitShortcuts, submitting, transcription]);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Review Transcript</h2>
                <p className="text-sm text-muted-foreground">
                  Answer ID: {answerId}
                </p>
              </div>
            </div>

            {audioUrl ? (
              <AudioShortformPlayer
                audioUrl={audioUrl}
                focusTargetSelector="#transcription"
              />
            ) : (
              <div className="p-4 bg-muted rounded-md text-sm text-muted-foreground">
                Audio preview unavailable for this task.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="preamble">Preamble</Label>
              <Textarea
                id="preamble"
                value={preamble}
                onChange={(event) => setPreamble(event.target.value)}
                placeholder="Optional intro or metadata before the main transcript"
                className="min-h-[80px]"
              />
            </div>

            <div>
              <Label htmlFor="transcription">Main Transcription *</Label>
              <Textarea
                id="transcription"
                data-transcription="true"
                value={transcription}
                onChange={(event) => setTranscription(event.target.value)}
                className="min-h-[160px]"
                placeholder="Edit the transcript to match the audio perfectly..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Make corrections directly in this field. Keep the style and casing consistent with project guidelines.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label>Rate this submission</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {Array.from({ length: ratingMax }, (_, index) => {
                const value = index + 1;
                return (
                  <ReviewStar
                    key={value}
                    index={value}
                    active={value <= rating}
                    onClick={() => setRating(value)}
                  />
                );
              })}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="uppercase text-[10px] text-slate-400">Shortcut</span>
              <Kbd>
                {getKeySymbol('Shift')} + {ratingMax >= 5
                  ? '1 through 5'
                  : Array.from({ length: Math.min(5, ratingMax) }, (_, idx) => idx + 1)
                      .map((value) => value.toString())
                      .join(', ')}
              </Kbd>
            </div>
          </div>

          {normalizedTags.length > 0 && (
            <div className="space-y-2">
              <Label>Highlight problematic areas</Label>
              <div className="flex flex-wrap gap-2">
                {normalizedTags.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <Badge
                      key={tag}
                      variant={active ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer select-none px-3 py-1',
                        active && 'bg-blue-600 hover:bg-blue-600 text-white'
                      )}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {allowFeedback && (
            <div>
              <Label htmlFor="feedback">Feedback to transcriber</Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Specific feedback the transcriber will see"
                className="min-h-[100px]"
              />
            </div>
          )}

          {allowInternalNotes && (
            <div>
              <Label htmlFor="internal-notes">Internal notes</Label>
              <Textarea
                id="internal-notes"
                value={internalNotes}
                onChange={(event) => setInternalNotes(event.target.value)}
                placeholder="Private notes visible only to managers/QC"
                className="min-h-[80px]"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        {onSkip && (
          <Button type="button" variant="outline" onClick={onSkip} disabled={submitting}>
            Skip Review
          </Button>
        )}
        <div className="ml-auto flex items-center gap-3">
          <Button type="submit" disabled={submitting || !transcription.trim()}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="uppercase text-[10px] text-slate-400">Shortcut</span>
            {submitDisplayShortcuts.length > 1 ? (
              <KbdGroup>
                {submitDisplayShortcuts.map(({ keys }) => (
                  <Kbd key={keys.join('+')}>
                    {keys.map((keyLabel, keyIndex) => (
                      <React.Fragment key={keyLabel}>
                        {keyIndex > 0 && ' + '}
                        {getKeySymbol(keyLabel)}
                      </React.Fragment>
                    ))}
                  </Kbd>
                ))}
              </KbdGroup>
            ) : (
              <Kbd>
                {submitDisplayShortcuts[0].keys.map((keyLabel, keyIndex) => (
                  <React.Fragment key={keyLabel}>
                    {keyIndex > 0 && ' + '}
                    {getKeySymbol(keyLabel)}
                  </React.Fragment>
                ))}
              </Kbd>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

export default AudioShortformReviewForm;
