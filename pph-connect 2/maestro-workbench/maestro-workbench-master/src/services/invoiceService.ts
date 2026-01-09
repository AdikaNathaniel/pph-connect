import { supabase } from '@/integrations/supabase/client';
import { calculateWorkerBalance } from '@/services/balanceService';
import { getWorkerRateForProject } from '@/services/rateService';
import PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';

export interface InvoicePreviewLine {
  projectId: string | null;
  projectName: string | null;
  units: number;
  hours: number;
  rate: number;
  amount: number;
}

export interface InvoicePreview {
  workerId: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  currency: string | null;
  lines: InvoicePreviewLine[];
  adjustments: Array<{ id?: string; type: 'bonus' | 'deduction'; amount: number; reason: string | null }>;
}

export interface InvoiceAdjustmentInput {
  type: 'bonus' | 'deduction';
  amount: number;
  reason?: string | null;
}

interface WorkStatRow {
  project_id: string | null;
  units_completed: number | null;
  hours_worked: number | null;
}

export function summarizeWorkStats(rows: Array<WorkStatRow>): Array<{ projectId: string | null; units: number; hours: number }> {
  const map = new Map<string | null, { projectId: string | null; units: number; hours: number }>();
  rows.forEach((row) => {
    const key = row.project_id ?? null;
    const current = map.get(key) ?? { projectId: key, units: 0, hours: 0 };
    current.units += Number(row.units_completed ?? 0);
    current.hours += Number(row.hours_worked ?? 0);
    map.set(key, current);
  });
  return Array.from(map.values());
}

export async function generateInvoicePreview(
  workerId: string,
  startDate: string,
  endDate: string,
  options?: { invoiceId?: string },
): Promise<InvoicePreview> {
  const invoiceId = options?.invoiceId ?? null;
  const [balanceSummary, workStatsResult, adjustmentResult] = await Promise.all([
    calculateWorkerBalance(workerId, startDate, endDate),
    supabase
      .from('work_stats')
      .select('project_id, units_completed, hours_worked')
      .eq('worker_id', workerId)
      .gte('work_date', startDate)
      .lte('work_date', endDate),
    invoiceId
      ? supabase
          .from('invoice_adjustments')
          .select('id, invoice_id, adjustment_type, amount, reason')
          .eq('invoice_id', invoiceId)
      : Promise.resolve({
          data: [] as Array<{ id: string; adjustment_type: string; amount: number; reason: string | null }>,
        }),
  ]);

  if (workStatsResult.error) {
    throw workStatsResult.error;
  }

  const stats = summarizeWorkStats((workStatsResult.data ?? []) as WorkStatRow[]);
  const lines: InvoicePreviewLine[] = [];

  for (const row of stats) {
    const rate = await getWorkerRateForProject(workerId, row.projectId ?? null);
    const amount = rate * row.units;
    lines.push({
      projectId: row.projectId,
      projectName: row.projectId ?? null,
      units: row.units,
      hours: row.hours,
      rate,
      amount,
    });
  }

  const adjustments = (adjustmentResult.data ?? []).map((record) => ({
    id: record.id,
    type: (record.adjustment_type as 'bonus' | 'deduction') ?? 'bonus',
    amount: Number(record.amount ?? 0),
    reason: record.reason ?? null,
  }));

  const baseTotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const adjustmentsTotal = adjustments.reduce(
    (sum, adjustment) => sum + (adjustment.type === 'deduction' ? -adjustment.amount : adjustment.amount),
    0,
  );

  return {
    workerId,
    periodStart: startDate,
    periodEnd: endDate,
    totalAmount: baseTotal + adjustmentsTotal,
    currency: balanceSummary.currency ?? null,
    lines,
    adjustments,
  };
}

export async function generateInvoicePdf(workerId: string, startDate: string, endDate: string): Promise<Uint8Array> {
  const preview = await generateInvoicePreview(workerId, startDate, endDate);

  const doc = new PDFDocument({ margin: 50 });
  const chunks: Uint8Array[] = [];

  return await new Promise<Uint8Array>((resolve, reject) => {
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', (error) => reject(error));

    doc.fontSize(18).text(`Invoice Preview #${preview.workerId}`, { align: 'left' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Period: ${preview.periodStart} → ${preview.periodEnd}`);
    doc.text(`Total: ${preview.totalAmount.toFixed(2)} ${preview.currency ?? 'USD'}`);
    doc.moveDown();

    doc.fontSize(14).text('Line Items', { underline: true });
    doc.moveDown(0.5);
    preview.lines.forEach((line, index) => {
      doc.fontSize(12).text(`${index + 1}. ${line.projectName ?? line.projectId ?? 'Project'}`, { continued: true });
      doc.text(`  Units: ${line.units}  Hours: ${line.hours}  Rate: ${line.rate.toFixed(2)}  Amount: ${line.amount.toFixed(2)}`);
    });

    doc.moveDown();
    doc.fontSize(14).text('Adjustments', { underline: true });
    doc.moveDown(0.5);
    if (preview.adjustments.length === 0) {
      doc.fontSize(12).text('No adjustments applied.');
    } else {
      preview.adjustments.forEach((adjustment) => {
        doc.fontSize(12).text(`${adjustment.type.toUpperCase()}: ${adjustment.amount.toFixed(2)} — ${adjustment.reason ?? 'No reason provided'}`);
      });
    }

    doc.moveDown();
    doc.fontSize(12).text('This PDF is generated for preview purposes only.');

    doc.end();
  });
}

export interface CreateInvoiceOptions {
  workerId: string;
  periodStart: string;
  periodEnd: string;
  status?: 'draft' | 'submitted';
  adjustments?: InvoiceAdjustmentInput[];
  preview?: InvoicePreview;
}

export async function createInvoice(options: CreateInvoiceOptions): Promise<{ invoiceId: string }> {
  const { workerId, periodStart, periodEnd, status = 'submitted', adjustments = [], preview: providedPreview } = options;
  const preview = providedPreview ?? (await generateInvoicePreview(workerId, periodStart, periodEnd));

  const adjustmentsTotal = adjustments.reduce(
    (sum, adjustment) => sum + (adjustment.type === 'deduction' ? -adjustment.amount : adjustment.amount),
    0,
  );

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      worker_id: workerId,
      period_start: periodStart,
      period_end: periodEnd,
      total_amount: preview.totalAmount + adjustmentsTotal,
      currency: preview.currency ?? 'USD',
      status,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new Error('Failed to create invoice');
  }

  if (preview.lines.length) {
    const lineItems = preview.lines.map((line) => ({
      invoice_id: data.id,
      project_id: line.projectId,
      units: line.units,
      hours: line.hours,
      rate: line.rate,
      amount: line.amount,
    }));
    await supabase.from('invoice_line_items').insert(lineItems);
  }

  if (adjustments.length) {
    const adjustmentRecords = adjustments.map((adjustment) => ({
      invoice_id: data.id,
      adjustment_type: adjustment.type,
      amount: adjustment.amount,
      reason: adjustment.reason ?? null,
    }));
    await supabase.from('invoice_adjustments').insert(adjustmentRecords);
  }

  return { invoiceId: data.id };
}
