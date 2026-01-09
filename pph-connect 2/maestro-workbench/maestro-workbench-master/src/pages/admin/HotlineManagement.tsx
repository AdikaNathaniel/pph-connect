import React, { useMemo, useState } from 'react';
import ManagerLayout from '@/components/layout/ManagerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type HotlineCategory = 'harassment' | 'unfair_treatment' | 'system_issue' | 'other';
type HotlineStatus = 'new' | 'investigating' | 'resolved';

type HotlineReport = {
  id: string;
  ticketId: string;
  category: HotlineCategory;
  status: HotlineStatus;
  submittedAt: string;
  notes: string;
};

type AuditEvent = {
  id: string;
  reportId: string;
  actor: string;
  action: string;
  timestamp: string;
};

const SAMPLE_REPORTS: HotlineReport[] = [
  {
    id: 'hr-001',
    ticketId: 'HOT-4AC2F9B1',
    category: 'harassment',
    status: 'investigating',
    submittedAt: '2025-11-18T10:45:00Z',
    notes: 'Report references anonymous incidents on night shift.',
  },
  {
    id: 'hr-002',
    ticketId: 'HOT-8B72E1D0',
    category: 'system_issue',
    status: 'new',
    submittedAt: '2025-11-20T07:12:00Z',
    notes: 'Possible data exposure flagged via hotline.',
  },
  {
    id: 'hr-003',
    ticketId: 'HOT-11DF0A7C',
    category: 'other',
    status: 'resolved',
    submittedAt: '2025-11-12T13:00:00Z',
    notes: 'Resolved after compliance review.',
  },
];

const SAMPLE_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'audit-1',
    reportId: 'hr-001',
    actor: 'Compliance Bot',
    action: 'Ticket marked as investigating',
    timestamp: '2025-11-18T12:00:00Z',
  },
  {
    id: 'audit-2',
    reportId: 'hr-001',
    actor: 'Priya Chaudhary',
    action: 'Requested additional context via secure follow-up',
    timestamp: '2025-11-19T09:15:00Z',
  },
  {
    id: 'audit-3',
    reportId: 'hr-003',
    actor: 'Jordan Mills',
    action: 'Closed after verifying remediation steps',
    timestamp: '2025-11-13T08:00:00Z',
  },
];

const categoryOptions: { value: HotlineCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All categories' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'unfair_treatment', label: 'Unfair treatment' },
  { value: 'system_issue', label: 'System issue' },
  { value: 'other', label: 'Other' },
];

const statusOptions: { value: HotlineStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
];

const statusBadgeVariant: Record<HotlineStatus, 'default' | 'secondary' | 'outline'> = {
  new: 'default',
  investigating: 'secondary',
  resolved: 'outline',
};

export const AdminHotlineManagementPage: React.FC = () => {
  const [reports, setReports] = useState<HotlineReport[]>(SAMPLE_REPORTS);
  const [selectedReportId, setSelectedReportId] = useState<string>(SAMPLE_REPORTS[0]?.id ?? '');
  const [statusFilter, setStatusFilter] = useState<HotlineStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<HotlineCategory | 'all'>('all');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || report.category === categoryFilter;
      return matchesStatus && matchesCategory;
    });
  }, [reports, statusFilter, categoryFilter]);

  const activeReport = reports.find((report) => report.id === selectedReportId) ?? null;
  const auditTrail = activeReport
    ? SAMPLE_AUDIT_EVENTS.filter((event) => event.reportId === activeReport.id)
    : [];

  const handleStatusUpdate = (reportId: string, nextStatus: HotlineStatus) => {
    setReports((current) =>
      current.map((report) => (report.id === reportId ? { ...report, status: nextStatus } : report))
    );
  };

  const handleSaveResolution = () => {
    if (!activeReport || !resolutionNotes.trim()) {
      return;
    }
    handleStatusUpdate(activeReport.id, 'resolved');
    setResolutionNotes('');
  };

  return (
    <ManagerLayout pageTitle="Anonymous hotline reports">
      <div className="space-y-4" data-testid="hotline-management-page">
        <Card>
          <CardHeader>
            <CardTitle>Incoming reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Select value={statusFilter} onValueChange={(value: HotlineStatus | 'all') => setStatusFilter(value)}>
                <SelectTrigger className="w-40" data-testid="hotline-management-status-filter">
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
              <Select
                value={categoryFilter}
                onValueChange={(value: HotlineCategory | 'all') => setCategoryFilter(value)}
              >
                <SelectTrigger className="w-40" data-testid="hotline-management-category-filter">
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

            <div className="rounded-md border" data-testid="hotline-management-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        No reports match the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReports.map((report) => (
                      <TableRow
                        key={report.id}
                        className={`cursor-pointer ${selectedReportId === report.id ? 'bg-muted/50' : ''}`}
                        onClick={() => setSelectedReportId(report.id)}
                      >
                        <TableCell>
                          <div className="font-semibold">{report.ticketId}</div>
                          <div className="text-xs text-muted-foreground">Anonymized ID</div>
                        </TableCell>
                        <TableCell className="capitalize">{report.category.replace('_', ' ')}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant[report.status]}>
                            {report.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(report.submittedAt).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{report.notes}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Report details</CardTitle>
            </CardHeader>
            <CardContent data-testid="hotline-management-resolution-form">
              {!activeReport ? (
                <p className="text-sm text-muted-foreground">Select a report to view details.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket ID</p>
                    <p className="text-lg font-semibold text-foreground">{activeReport.ticketId}</p>
                    <p className="text-xs text-muted-foreground">
                      We never store reporter identities. Follow up only via secure references.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Select
                      value={activeReport.status}
                      onValueChange={(value: HotlineStatus) => handleStatusUpdate(activeReport.id, value)}
                    >
                      <SelectTrigger className="w-40">
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

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Resolution notes</p>
                    <Textarea
                      placeholder="Capture anonymized notes or escalation references. Avoid personal identifiers."
                      rows={4}
                      value={resolutionNotes}
                      onChange={(event) => setResolutionNotes(event.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button type="button" size="sm" onClick={handleSaveResolution} disabled={!resolutionNotes.trim()}>
                        Save resolution
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="hotline-management-audit-trail">
            <CardHeader>
              <CardTitle>Audit trail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {auditTrail.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
              ) : (
                auditTrail.map((event) => (
                  <div key={event.id} className="rounded-lg border px-3 py-2">
                    <p className="text-sm font-semibold">{event.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.actor} • {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ManagerLayout>
  );
};

export default AdminHotlineManagementPage;
