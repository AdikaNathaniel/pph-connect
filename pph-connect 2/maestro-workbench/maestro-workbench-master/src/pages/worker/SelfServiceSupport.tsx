import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { knowledgeBaseArticles } from '@/lib/knowledgeBase/structure';

const tutorialVideos = [
  {
    id: 'vid-onboarding',
    title: 'Platform walkthrough',
    description: '5-minute overview covering navigation and task submission tips.',
    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  },
  {
    id: 'vid-quality',
    title: 'Quality checklist',
    description: 'How to keep rejection rates under 2% with pre-flight checks.',
    url: 'https://www.youtube.com/embed/9bZkp7q19f0'
  },
  {
    id: 'vid-payments',
    title: 'Payments & invoices',
    description: 'Understanding payment cycles, holds, and dispute resolution.',
    url: 'https://www.youtube.com/embed/oHg5SJYRHA0'
  }
];

const troubleshootingGuides = [
  {
    id: 'guide-audio',
    title: 'Audio uploads stuck at 99%',
    steps: [
      'Pause any other uploads or downloads using bandwidth.',
      'Refresh the page and reselect the original audio file.',
      'If the waveform never appears, capture console logs for support.'
    ]
  },
  {
    id: 'guide-login',
    title: 'MFA / login failures',
    steps: [
      'Remove stale devices within Duo Security.',
      'Clear browser site data for *.pphconnect.com.',
      'If you still see an error, submit a ticket with a screenshot.'
    ]
  },
  {
    id: 'guide-payments',
    title: 'Payment hold pending review',
    steps: [
      'Confirm there are no compliance flags on your worker profile.',
      'Upload proof of completion for the flagged tasks.',
      'Escalate via support ticket after 48 hours if the hold remains.'
    ]
  }
];

export const WorkerSelfServiceSupportPage: React.FC = () => {
  const [query, setQuery] = useState('');

  const filteredFaqs = useMemo(() => {
    if (!query.trim()) return knowledgeBaseArticles.slice(0, 6);
    const normalized = query.toLowerCase();
    return knowledgeBaseArticles
      .filter((article) => {
        return (
          article.title.toLowerCase().includes(normalized) ||
          article.summary.toLowerCase().includes(normalized) ||
          article.tags.some((tag) => tag.toLowerCase().includes(normalized))
        );
      })
      .slice(0, 6);
  }, [query]);

  return (
    <div className="min-h-screen bg-background" data-testid="support-page">
      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Support</p>
            <h1 className="text-3xl font-bold">Self-service help center</h1>
            <p className="text-sm text-muted-foreground">
              Search FAQs, watch walkthroughs, or follow troubleshooting guides before opening a ticket.
            </p>
          </div>
          <Input
            data-testid="support-search-input"
            placeholder="Search FAQs, e.g. payments, audio, login"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="max-w-md"
          />
        </div>

        <Card data-testid="support-faq-section">
          <CardHeader>
            <CardTitle>Quick answers</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {filteredFaqs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No FAQs match your search. Try a different keyword.</p>
            ) : (
              filteredFaqs.map((article) => (
                <div key={article.id} className="rounded-lg border px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{article.title}</p>
                      <p className="text-xs text-muted-foreground">{article.summary}</p>
                    </div>
                    <Badge variant="outline">{article.tags[0] ?? 'FAQ'}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Last updated {new Date(article.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card data-testid="support-videos-section">
          <CardHeader>
            <CardTitle>Video tutorials</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {tutorialVideos.map((video) => (
              <div key={video.id} data-testid="support-video-card" className="rounded-lg border p-3">
                <div className="aspect-video overflow-hidden rounded-md bg-black">
                  <iframe
                    title={video.title}
                    src={video.url}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">{video.title}</p>
                <p className="text-xs text-muted-foreground">{video.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card data-testid="support-troubleshooting-section">
          <CardHeader>
            <CardTitle>Troubleshooting guides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {troubleshootingGuides.map((guide) => (
              <div key={guide.id} className="rounded-lg border px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{guide.title}</p>
                  <Button variant="ghost" size="sm" className="gap-2 text-xs">
                    <PlayCircle className="h-4 w-4" />
                    Follow steps
                  </Button>
                </div>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                  {guide.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkerSelfServiceSupportPage;
