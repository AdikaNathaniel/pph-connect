import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ManagerLayout from '@/components/layout/ManagerLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarDays, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

interface InvoiceRow {
  id: string;
  worker_id: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export const InvoiceManagementPage: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('id, worker_id, period_start, period_end, total_amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('InvoiceManagementPage: failed to load invoices', error);
      toast.error('Unable to load invoices');
      setInvoices([]);
    } else {
      setInvoices((data ?? []) as InvoiceRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInvoices().catch((error) => console.warn('InvoiceManagementPage: unexpected error', error));
  }, [fetchInvoices]);

  const filteredInvoices = useMemo(() => {
    if (!search) return invoices;
    return invoices.filter((invoice) => invoice.worker_id.toLowerCase().includes(search.toLowerCase()) || invoice.id.toLowerCase().includes(search.toLowerCase()));
  }, [invoices, search]);

  const summary = useMemo(() => {
    const total = invoices.reduce((acc, invoice) => acc + Number(invoice.total_amount ?? 0), 0);
    const draftCount = invoices.filter((invoice) => invoice.status === 'draft').length;
    const approvedCount = invoices.filter((invoice) => invoice.status === 'approved').length;
    return { total, draftCount, approvedCount };
  }, [invoices]);

  const statusVariant = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return 'default';
      case 'submitted':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleApprove = useCallback(async (invoiceId: string) => {
    setApprovingId(invoiceId);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', invoiceId);

      if (error) {
        throw error;
      }

      toast.success('Invoice approved');
      await fetchInvoices();
    } catch (approveError) {
      console.error('InvoiceManagementPage: failed to approve invoice', approveError);
      toast.error('Unable to approve invoice');
    } finally {
      setApprovingId(null);
    }
  }, [fetchInvoices]);

  return (
    <ManagerLayout pageTitle="Invoices">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between" data-testid="invoice-management-header">
          <div>
            <p className="text-sm text-muted-foreground">Billing & payouts</p>
            <h1 className="text-2xl font-bold">Invoice Management</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchInvoices} disabled={loading}>
              <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        <Card data-testid="invoice-management-summary">
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total billed</p>
              <p className="text-2xl font-bold">{summary.total.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Approved invoices</p>
              <p className="text-2xl font-bold">{summary.approvedCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Draft invoices</p>
              <p className="text-2xl font-bold">{summary.draftCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="invoice-management-filters">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="Search invoices or worker ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button variant="outline" size="sm" disabled>
              <Calendar Days className="h-4 w-4 mr-2" /> Date range
            </Button>
            <Button variant="outline" size="sm" disabled>
              Status filter
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="invoice-management-table">
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading invoices…</p>
            ) : filteredInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices found.</p>
            ) : (
              <div className="space-y-2">
                    {filteredInvoices.map((invoice) => (
                      <div key={invoice.id} className="rounded-lg border px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">Invoice #{invoice.id}</p>
                          <p className="text-xs text-muted-foreground">Worker {invoice.worker_id}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-semibold">{Number(invoice.total_amount ?? 0).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{invoice.period_start} → {invoice.period_end}</p>
                          </div>
                          <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid="invoice-management-approve-button"
                            disabled={invoice.status === 'approved' || approvingId === invoice.id}
                            onClick={() => handleApprove(invoice.id)}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
          </CardContent>
        </Card>
      </div>
    </ManagerLayout>
  );
};

export default InvoiceManagementPage;
