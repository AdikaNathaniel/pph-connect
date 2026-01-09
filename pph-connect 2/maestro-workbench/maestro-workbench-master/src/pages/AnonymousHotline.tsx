import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const REPORT_TYPES = [
  { value: 'harassment', label: 'Harassment or discrimination' },
  { value: 'unfair_treatment', label: 'Unfair treatment or retaliation' },
  { value: 'system_issue', label: 'System or security issue' },
  { value: 'other', label: 'Other' },
];

export const AnonymousHotlinePage: React.FC = () => {
  const [reportType, setReportType] = useState<string>('harassment');
  const [description, setDescription] = useState('');
  const [evidenceLink, setEvidenceLink] = useState('');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!description.trim()) {
      return;
    }
    const newTicketId = `HOT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    setTicketId(newTicketId);
    setSubmitted(true);
    setDescription('');
    setEvidenceLink('');
  };

  return (
    <div className="min-h-screen bg-background" data-testid="hotline-page">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Anonymous hotline</p>
          <h1 className="text-3xl font-bold">Report an issue confidentially</h1>
          <p className="text-sm text-muted-foreground">
            This form does not collect your name or account. After submission we generate a ticket ID you can reference.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submit a report</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit} data-testid="hotline-form">
              <div className="space-y-2">
                <Label>Report type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hotline-description">Description</Label>
                <Textarea
                  id="hotline-description"
                  placeholder="Describe what happened. Do not include personally identifiable information."
                  rows={6}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Provide dates, locations, or ticket IDs if known. We will never ask for your name.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="evidence-link">Optional evidence link</Label>
                <Input
                  id="evidence-link"
                  placeholder="Link to screenshots or documents (optional)"
                  value={evidenceLink}
                  onChange={(event) => setEvidenceLink(event.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={!description.trim()}>
                  Submit anonymously
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ticket ID</CardTitle>
          </CardHeader>
          <CardContent data-testid="hotline-ticket-id">
            {submitted && ticketId ? (
              <div>
                <p className="font-semibold text-foreground">{ticketId}</p>
                <p className="text-sm text-muted-foreground">
                  Save this ID to check on the report. Support will reference this identifier if follow-up is required.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Submit the form to generate a unique ticket ID. No email or login is needed.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnonymousHotlinePage;
