import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import ManagerLayout from '@/components/layout/ManagerLayout';

type TicketCategory = 'technical' | 'payment' | 'other';
type TicketPriority = 'low' | 'medium' | 'high';
type TicketStatus = 'open' | 'in_progress' | 'resolved';

type TicketRow = {
  id: string;
  worker: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  reference: string;
};

type TicketMessage = {
  id: string;
  author: string;
  role: 'manager' | 'worker';
  content: string;
  createdAt: string;
};

const SAMPLE_TICKETS: TicketRow[] = [
  {
    id: 'ticket-001',
    worker: 'Alexa Gomez',
    subject: 'Payment hold for September invoice',
    category: 'payment',
    priority: 'high',
    status: 'in_progress',
    assignedTo: 'Jordan Mills',
    createdAt: '2025-11-15T10:00:00Z',
    updatedAt: '2025-11-18T08:00:00Z',
    reference: '#INV-2025-09'
  },
  {
    id: 'ticket-002',
    worker: 'Marcus Ocampo',
    subject: 'Audio upload stuck at 99%',
    category: 'technical',
    priority: 'medium',
    status: 'open',
    assignedTo: null,
    createdAt: '2025-11-20T12:10:00Z',
    updatedAt: '2025-11-20T12:45:00Z',
    reference: '#TASK-221'
  },
  {
    id: 'ticket-003',
    worker: 'Britt You',
    subject: 'Update registered payout method',
    category: 'other',
    priority: 'low',
    status: 'resolved',
    assignedTo: 'Priya Chaudhary',
    createdAt: '2025-11-10T09:00:00Z',
    updatedAt: '2025-11-12T09:15:00Z',
    reference: '#PAY-100'
  }
];

const SAMPLE_MESSAGES: Record<string, TicketMessage[]> = {
  'ticket-001': [
    {
      id: 'msg-1',
      author: 'Alexa Gomez',
      role: 'worker',
      content: 'This is blocking payout for my entire team, please advise.',
      createdAt: '2025-11-15T10:05:00Z'
    },
    {
      id: 'msg-2',
      author: 'Jordan Mills',
      role: 'manager',
      content: 'Investigating compliance hold, will update by end of day.',
      createdAt: '2025-11-18T08:01:00Z'
    }
  ],
  'ticket-002': [
    {
      id: 'msg-3',
      author: 'Marcus Ocampo',
      role: 'worker',
      content: 'Attached screenshot of console errors.',
      createdAt: '2025-11-20T12:13:00Z'
    }
  ],
  'ticket-003': [
    {
      id: 'msg-4',
      author: 'Priya Chaudhary',
      role: 'manager',
      content: 'Updated payment profile; expect confirmation within 24h.',
      createdAt: '2025-11-11T07:00:00Z'
    }
  ]
};

const categoryOptions: { value: TicketCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All categories' },
  { value: 'technical', label: 'Technical' },
  { value: 'payment', label: 'Payment' },
  { value: 'other', label: 'Other' }
];

const priorityOptions: { value: TicketPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'All priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
];

const statusOptions: { value: TicketStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' }
];

const supportAgents = ['Jordan Mills', 'Priya Chaudhary', 'Dev Team'];

const priorityBadgeVariant: Record<TicketPriority, 'outline' | 'secondary' | 'default'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default'
};

const statusBadgeVariant: Record<TicketStatus, 'outline' | 'secondary' | 'default'> = {
  open: 'default',
  in_progress: 'secondary',
  resolved: 'outline'
};

export const ManagerSupportTicketManagementPage: React.FC = () => {
  const [tickets, setTickets] = useState<TicketRow[]>(SAMPLE_TICKETS);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(SAMPLE_TICKETS[0]?.id ?? null);
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [replyDraft, setReplyDraft] = useState('');

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      return matchesCategory && matchesPriority && matchesStatus;
    });
  }, [tickets, categoryFilter, priorityFilter, statusFilter]);

  const activeTicket = tickets.find((ticket) => ticket.id === activeTicketId) ?? null;
  const activeMessages = activeTicket ? SAMPLE_MESSAGES[activeTicket.id] ?? [] : [];

  const handleAssign = (ticketId: string, assignee: string | null) => {
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, assignedTo: assignee, status: assignee ? 'in_progress' : ticket.status } : ticket
      )
    );
  };

  const handleStatusChange = (ticketId: string, nextStatus: TicketStatus) => {
    setTickets((current) =>
      current.map((ticket) => (ticket.id === ticketId ? { ...ticket, status: nextStatus } : ticket))
    );
  };

  const handleReply = () => {
    if (!replyDraft.trim() || !activeTicket) {
      return;
    }
    SAMPLE_MESSAGES[activeTicket.id] = [
      {
        id: `msg-${crypto.randomUUID().slice(0, 6)}`,
        author: 'Support Bot',
        role: 'manager',
        content: replyDraft,
        createdAt: new Date().toISOString()
      },
      ...(SAMPLE_MESSAGES[activeTicket.id] ?? [])
    ];
    setReplyDraft('');
  };

  return (
    <ManagerLayout pageTitle="Support tickets" breadcrumbs={[{ label: 'Support', href: '/manager/tickets' }]}>
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]" data-testid="manager-ticket-page">
        <Card>
          <CardHeader>
            <CardTitle>Ticket queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Select value={statusFilter} onValueChange={(value: TicketStatus | 'all') => setStatusFilter(value)}>
                <SelectTrigger data-testid="manager-ticket-status-filter" className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={(value: TicketPriority | 'all') => setPriorityFilter(value)}>
                <SelectTrigger data-testid="manager-ticket-priority-filter" className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={(value: TicketCategory | 'all') => setCategoryFilter(value)}>
                <SelectTrigger data-testid="manager-ticket-category-filter" className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border" data-testid="manager-ticket-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        No tickets match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        className={`cursor-pointer ${ticket.id === activeTicketId ? 'bg-muted/50' : ''}`}
                        onClick={() => setActiveTicketId(ticket.id)}
                      >
                        <TableCell>
                          <p className="font-medium">{ticket.subject}</p>
                          <p className="text-xs text-muted-foreground">{ticket.reference}</p>
                        </TableCell>
                        <TableCell>{ticket.worker}</TableCell>
                        <TableCell>
                          <Badge variant={priorityBadgeVariant[ticket.priority]}>
                            {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant[ticket.status]}>{ticket.status.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>{ticket.assignedTo ?? '—'}</TableCell>
                        <TableCell>{new Date(ticket.updatedAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="manager-ticket-reply-panel">
          <CardHeader>
            <CardTitle>Ticket details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!activeTicket ? (
              <p className="text-sm text-muted-foreground">Select a ticket to view the conversation.</p>
            ) : (
              <>
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeTicket.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    Worker: {activeTicket.worker} • Reference {activeTicket.reference}
                  </p>
                </div>

                <div className="grid gap-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Assigned agent</p>
                    <Select
                      value={activeTicket.assignedTo ?? 'unassigned'}
                      onValueChange={(value) => handleAssign(activeTicket.id, value === 'unassigned' ? null : value)}
                    >
                      <SelectTrigger data-testid="manager-ticket-assignee-select">
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {supportAgents.map((agent) => (
                          <SelectItem key={agent} value={agent}>
                            {agent}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Select
                      value={activeTicket.status}
                      onValueChange={(value: TicketStatus) => handleStatusChange(activeTicket.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions
                          .filter((option) => option.value !== 'all')
                          .map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Threaded conversation</p>
                    <div className="rounded-md border bg-muted/40 p-3 space-y-3 max-h-60 overflow-y-auto">
                      {activeMessages.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No replies yet.</p>
                      ) : (
                        activeMessages.map((message) => (
                          <div key={message.id} className="rounded bg-background px-3 py-2">
                            <p className="text-xs font-semibold text-foreground">
                              {message.author}{' '}
                              <span className="text-muted-foreground">
                                • {new Date(message.createdAt).toLocaleString()}
                              </span>
                            </p>
                            <p className="text-xs text-foreground">{message.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder="Write an internal note or reply visible to the worker."
                    value={replyDraft}
                    onChange={(event) => setReplyDraft(event.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setReplyDraft('')}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={handleReply}>
                      Send reply
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ManagerLayout>
  );
};

export default ManagerSupportTicketManagementPage;
