import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ManagerLayout from '@/components/layout/ManagerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { generateInvoicePreview, type InvoicePreview } from '@/services/invoiceService';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export const InvoicePreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPreview = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await generateInvoicePreview(id, '2025-01-01', '2025-01-31');
      setPreview(data);
    } catch (error) {
      console.error('InvoicePreviewPage: failed to load preview', error);
      toast.error('Unable to load invoice preview');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPreview().catch((error) => console.warn('InvoicePreviewPage: unexpected error', error));
  }, [loadPreview]);

  return (
    <ManagerLayout pageTitle="Invoice Preview">
      <div className="space-y-6">
        <div className="flex items-center gap-3" data-testid="invoice-preview-header">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">Invoice Preview</p>
            <h1 className="text-2xl font-bold">Invoice #{id}</h1>
          </div>
          {preview?.currency ? <Badge variant="outline">{preview.currency}</Badge> : null}
        </div>

        <Card data-testid="invoice-preview-summary">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading invoice summary…</p>
            ) : preview ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Worker</p>
                  <p className="text-base font-semibold">{preview.workerId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Period</p>
                  <p>{preview.periodStart} → {preview.periodEnd}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Total</p>
                  <p className="text-xl font-bold">{preview.totalAmount.toFixed(2)} {preview.currency ?? 'USD'}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No preview available.</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="invoice-preview-lines">
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading line items…</p>
            ) : preview && preview.lines.length > 0 ? (
              preview.lines.map((line, index) => (
                <div key={`${line.projectId}-${index}`} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{line.projectName ?? line.projectId ?? 'Project'}</p>
                    <p className="text-xs text-muted-foreground">
                      Units: {line.units} • Hours: {line.hours}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{line.amount.toFixed(2)}</p>
                    <Badge variant="outline">Rate {line.rate.toFixed(2)}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No line items.</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="invoice-preview-adjustments">
          <CardHeader>
            <CardTitle>Adjustments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading adjustments…</p>
            ) : preview && preview.adjustments.length > 0 ? (
              preview.adjustments.map((adjustment, index) => (
                <div key={`${adjustment.id ?? 'new'}-${index}`} className="flex items-center justify-between rounded-lg border px-4 py-2">
                  <div>
                    <p className="text-sm font-medium">{adjustment.reason ?? 'Adjustment'}</p>
                    <p className="text-xs text-muted-foreground">{adjustment.type}</p>
                  </div>
                  <p className="text-sm font-semibold">{adjustment.amount.toFixed(2)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No adjustments.</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="invoice-preview-actions">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button disabled={loading}>Approve Invoice</Button>
            <Button variant="outline" disabled={loading}>Download PDF</Button>
            <Button variant="outline" disabled={loading}>
              Edit
            </Button>
          </CardContent>
        </Card>
      </div>
    </ManagerLayout>
  );
};

export default InvoicePreviewPage;
