import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type TicketCategory = 'technical' | 'payment' | 'other';
type TicketPriority = 'low' | 'medium' | 'high';
type TicketStatus = 'open' | 'in_progress' | 'resolved';

type SupportTicket = {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  status: TicketStatus;
  description: string;
  reference: string;
};

const SAMPLE_TICKETS: SupportTicket[] = [
  {
    id: 'ticket-001',
    subject: 'Payment hold for September invoice',
    category: 'payment',
    priority: 'high',
    createdAt: '2025-11-15T10:00:00Z',
    updatedAt: '2025-11-18T08:00:00Z',
    status: 'in_progress',
    description: 'Invoice INV-2025-09 shows a compliance hold but no details.',
    reference: '#INV-2025-09'
  },
  {
    id: 'ticket-002',
    subject: 'Audio upload stuck at 99%',
    category: 'technical',
    priority: 'medium',
    createdAt: '2025-11-20T12:10:00Z',
    updatedAt: '2025-11-20T12:45:00Z',
    status: 'open',
    description: 'Attempted on Chrome and Firefox, same error message.',
    reference: '#TASK-221'
  },
  {
    id: 'ticket-003',
    subject: 'Update registered payout method',
    category: 'other',
    priority: 'low',
    createdAt: '2025-11-10T09:00:00Z',
    updatedAt: '2025-11-12T09:15:00Z',
    status: 'resolved',
    description: 'Need to switch accounts before next payout cycle.',
    reference: '#PAY-100'
  }
];

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: 'technical', label: 'Technical' },
  { value: 'payment', label: 'Payment' },
  { value: 'other', label: 'Other' }
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
];

const STATUS_OPTIONS: { value: TicketStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' }
];

const priorityBadgeVariant: Record<TicketPriority, 'outline' | 'secondary' | 'default'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default'
};

const statusLabel: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved'
};

export const WorkerSupportTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>(SAMPLE_TICKETS);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('technical');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [description, setDescription] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TicketPriority>('all');

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
      return matchesStatus && matchesPriority;
    });
  }, [tickets, statusFilter, priorityFilter]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error('Subject and description are required');
      return;
    }

    const newTicket: SupportTicket = {
      id: `ticket-${crypto.randomUUID().slice(0, 6)}`,
      subject,
      category,
      priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'open',
      description,
      reference: '#AUTO-GEN'
    };

    setTickets((current) => [newTicket, ...current]);
    setSubject('');
    setDescription('');
    setCategory('technical');
    setPriority('medium');
    toast.success('Support ticket submitted');
  };

  return (
    <div className="min-h-screen bg-background" data-testid="support-tickets-page">
      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Support</p>
          <h1 className="text-3xl font-bold">Submit a support ticket</h1>
          <p className="text-sm text-muted-foreground">
            Provide detail so the support team can resolve issues quickly. You can track status below.
          </p>
        </div>

        <Card data-testid="support-ticket-form">
          <CardHeader>
            <CardTitle>Create a ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="ticket-subject">Subject</Label>
                <Input
                  id="ticket-subject"
                  placeholder="Example: Payment hold for September invoice"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(value: TicketCategory) => setCategory(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(value: TicketPriority) => setPriority(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket-description">Description</Label>
                <Textarea
                  id="ticket-description"
                  placeholder="Describe the issue, include error messages or order IDs."
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit">Submit ticket</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card data-testid="support-ticket-list">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>My tickets</CardTitle>
              <div className="flex flex-wrap gap-3">
                <div className="space-y-1 text-xs text-muted-foreground">
                  <Label>Status</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value: 'all' | TicketStatus) => setStatusFilter(value)}
                  >
                    <SelectTrigger data-testid="support-ticket-status-filter" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <Label>Priority</Label>
                  <Select
                    value={priorityFilter}
                    onValueChange={(value: 'all' | TicketPriority) => setPriorityFilter(value)}
                  >
                    <SelectTrigger data-testid="support-ticket-priority-filter" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priorities</SelectItem>
                      {PRIORITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tickets match your filters.</p>
            ) : (
              filteredTickets.map((ticket) => (
                <div key={ticket.id} className="rounded-lg border px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">{ticket.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={priorityBadgeVariant[ticket.priority]}>
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} priority
                      </Badge>
                      <Badge variant={ticket.status === 'resolved' ? 'outline' : 'secondary'}>
                        {statusLabel[ticket.status]}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Created {new Date(ticket.createdAt).toLocaleString()} • Updated{' '}
                    {new Date(ticket.updatedAt).toLocaleString()} • Reference {ticket.reference}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkerSupportTicketsPage;
