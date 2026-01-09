import React, { useMemo, useState } from 'react';
import ManagerLayout from '@/components/layout/ManagerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { approveApplication } from '@/services/applicationApprovalService';
import { requestAdditionalInfo, scheduleAiInterview } from '@/services/applicationReviewActions';
import { toast } from 'sonner';

type ApplicationStatus = 'pending' | 'reviewing' | 'rejected';

type AdminApplicationRow = {
  id: string;
  ticketId: string;
  fullName: string;
  email: string;
  country: string;
  domains: string[];
  status: ApplicationStatus;
  submittedAt: string;
};

const SAMPLE_APPLICATIONS: AdminApplicationRow[] = [
  {
    id: 'app-001',
    ticketId: 'APP-5FD21BC3',
    fullName: 'Rosa Jimenez',
    email: 'rosa@example.com',
    country: 'Philippines',
    domains: ['Creative', 'Operations'],
    status: 'pending',
    submittedAt: '2025-11-19T10:15:00Z',
  },
  {
    id: 'app-002',
    ticketId: 'APP-A7C31DE0',
    fullName: 'Henry Ajayi',
    email: 'henry@example.com',
    country: 'Nigeria',
    domains: ['STEM'],
    status: 'reviewing',
    submittedAt: '2025-11-18T08:05:00Z',
  },
  {
    id: 'app-003',
    ticketId: 'APP-92AB0E11',
    fullName: 'Lena Petrov',
    email: 'lena@example.com',
    country: 'Serbia',
    domains: ['Legal', 'Creative'],
    status: 'rejected',
    submittedAt: '2025-11-12T12:30:00Z',
  },
];

const statusOptions: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'rejected', label: 'Rejected' },
];

const domainOptions = ['STEM', 'Legal', 'Creative', 'Medical', 'Finance', 'Operations', 'Other'];
const dateOptions = ['any', '24h', '7d', '30d'];

const statusBadgeVariant: Record<ApplicationStatus, 'default' | 'secondary' | 'outline'> = {
  pending: 'default',
  reviewing: 'secondary',
  rejected: 'outline',
};

export const AdminApplicationsPage: React.FC = () => {
  const [applications] = useState<AdminApplicationRow[]>(SAMPLE_APPLICATIONS);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('any');
  const [activeApplicationId, setActiveApplicationId] = useState<string>(SAMPLE_APPLICATIONS[0]?.id ?? '');

  const filteredApplications = useMemo(() => {
    return applications.filter((application) => {
      const matchesStatus = statusFilter === 'all' || application.status === statusFilter;
      const matchesDomain = domainFilter === 'all' || application.domains.includes(domainFilter);
      return matchesStatus && matchesDomain;
    });
  }, [applications, statusFilter, domainFilter]);

  const [isApproving, setIsApproving] = useState(false);
  const activeApplication = applications.find((application) => application.id === activeApplicationId) ?? null;

  return (
    <ManagerLayout pageTitle="Applications">
      <div className="space-y-4" data-testid="admin-applications-page">
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={(value: ApplicationStatus | 'all') => setStatusFilter(value)}>
              <SelectTrigger className="w-40" data-testid="admin-applications-status-filter">
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

            <Select value={domainFilter} onValueChange={(value) => setDomainFilter(value)}>
              <SelectTrigger className="w-40" data-testid="admin-applications-domain-filter">
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All domains</SelectItem>
                {domainOptions.map((domain) => (
                  <SelectItem key={domain} value={domain}>
                    {domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40" data-testid="admin-applications-date-filter">
                <SelectValue placeholder="Date submitted" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any time</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3" data-testid="admin-applications-table">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Domains</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        No applications match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredApplications.map((application) => (
                      <TableRow
                        key={application.id}
                        className={`cursor-pointer ${activeApplicationId === application.id ? 'bg-muted/50' : ''}`}
                        onClick={() => setActiveApplicationId(application.id)}
                      >
                        <TableCell>
                          <p className="font-semibold">{application.ticketId}</p>
                          <p className="text-xs text-muted-foreground">{application.email}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground">{application.fullName}</p>
                          <p className="text-xs text-muted-foreground">{application.country}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {application.domains.map((domain) => (
                              <Badge key={domain} variant="outline">
                                {domain}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant[application.status]}>
                            {application.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(application.submittedAt).toLocaleString()}</TableCell>
                        <TableCell className="text-right" data-testid="admin-applications-actions">
                          <div className="flex flex-wrap gap-2 justify-end">
                            <Button variant="outline" size="sm">
                              Review
                            </Button>
                            <Button variant="ghost" size="sm">
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="admin-application-review-panel">
          <CardHeader>
            <CardTitle>Application details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!activeApplication ? (
              <p className="text-sm text-muted-foreground">Select an application to review.</p>
            ) : (
              <>
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeApplication.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeApplication.email} • {activeApplication.country}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeApplication.domains.map((domain) => (
                      <Badge key={domain} variant="outline">
                        {domain}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Resume / CV</p>
                  <Button variant="link" className="px-0" data-testid="admin-application-resume-link">
                    View resume.pdf
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Cover letter</p>
                  <div
                    className="rounded-md border bg-muted/40 p-3 text-sm text-foreground"
                    data-testid="admin-application-cover-letter"
                  >
                    Thank you for considering my application. I have five years of experience leading annotation teams and
                    would love to support PPH Connect.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      if (!activeApplication) return;
                      try {
                        await scheduleAiInterview(activeApplication.id);
                        toast.success('AI interview scheduled.');
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : 'Failed to schedule AI interview'
                        );
                      }
                    }}
                  >
                    Schedule AI interview
                  </Button>
                  <Button variant="outline" size="sm">
                    Request info
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!activeApplication) return;
                      try {
                        await requestAdditionalInfo(activeApplication.id);
                        toast.success('Information request sent to applicant.');
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : 'Failed to request additional info'
                        );
                      }
                    }}
                  >
                    Request info
                  </Button>
                  <RejectButton applicationId={activeApplication.id} />
                  <Button
                    size="sm"
                    data-testid="admin-application-approve-button"
                    disabled={isApproving}
                    onClick={async () => {
                      if (!activeApplication) return;
                      setIsApproving(true);
                      try {
                        await approveApplication({
                          applicationId: activeApplication.id,
                          applicant: {
                            fullName: activeApplication.fullName,
                            email: activeApplication.email,
                            country: activeApplication.country,
                          },
                        });
                        toast.success('Applicant approved and worker record created.');
                      } catch (error) {
                        const message =
                          error instanceof Error ? error.message : 'Failed to approve application';
                        toast.error(message);
                      } finally {
                        setIsApproving(false);
                      }
                    }}
                  >
                    {isApproving ? 'Approving…' : 'Approve'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ManagerLayout>
  );
};

export default AdminApplicationsPage;

const RejectButton: React.FC<{ applicationId: string }> = ({ applicationId }) => {
  const [isRejecting, setIsRejecting] = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState('');

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await rejectWithReason(applicationId, reason.trim() || null);
      toast.success('Application rejected.');
      setReason('');
      setShowReason(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject application');
    } finally {
      setIsRejecting(false);
    }
  };

  if (!showReason) {
    return (
      <Button variant="outline" size="sm" onClick={() => setShowReason(true)}>
        Reject with reason
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-sm">
      <Textarea
        rows={2}
        placeholder="Provide an optional rejection reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowReason(false)}>
          Cancel
        </Button>
        <Button variant="destructive" size="sm" onClick={handleReject} disabled={isRejecting}>
          {isRejecting ? 'Rejecting…' : 'Reject'}
        </Button>
      </div>
    </div>
  );
};
