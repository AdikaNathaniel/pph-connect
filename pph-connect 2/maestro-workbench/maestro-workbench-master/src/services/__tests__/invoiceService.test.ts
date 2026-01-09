import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('pdfkit', () => {
  class MockPdf {
    on() {
      return this;
    }
    end() {}
    fontSize() {
      return this;
    }
    text() {
      return this;
    }
    moveDown() {
      return this;
    }
  }
  return { default: MockPdf };
});

vi.mock('@/integrations/supabase/client', () => {
  const invoiceInsert = vi.fn(() => ({
    select: () => ({
      single: () => Promise.resolve({ data: { id: 'inv-test' }, error: null }),
    }),
  }));
  const lineItemsInsert = vi.fn(() => Promise.resolve({ data: null, error: null }));
  const adjustmentsInsert = vi.fn(() => Promise.resolve({ data: null, error: null }));

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'invoices') {
          return {
            insert: (payload: unknown) => {
              invoiceInsert(payload);
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: { id: 'inv-test' }, error: null }),
                }),
              };
            },
          };
        }
        if (table === 'invoice_line_items') {
          return {
            insert: (payload: unknown) => {
              lineItemsInsert(payload);
              return Promise.resolve({ data: null, error: null });
            },
          };
        }
        if (table === 'invoice_adjustments') {
          return {
            insert: (payload: unknown) => {
              adjustmentsInsert(payload);
              return Promise.resolve({ data: null, error: null });
            },
          };
        }
        return {
          insert: () => Promise.resolve({ data: null, error: null }),
          select: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
          update: () => Promise.resolve({ data: null, error: null }),
          delete: () => Promise.resolve({ data: null, error: null }),
        };
      },
    },
    __supabaseMock: {
      invoiceInsert,
      lineItemsInsert,
      adjustmentsInsert,
    },
  };
});

import { __supabaseMock } from '@/integrations/supabase/client';
import * as InvoiceService from '@/services/invoiceService';

const { invoiceInsert, lineItemsInsert, adjustmentsInsert } = __supabaseMock;
const { summarizeWorkStats, createInvoice } = InvoiceService as any;

afterEach(() => {
  invoiceInsert.mockClear();
  lineItemsInsert.mockClear();
  adjustmentsInsert.mockClear();
  vi.restoreAllMocks();
});

describe('invoiceService helpers', () => {
  it('summarizes work stats by project', () => {
    const rows = [
      { project_id: 'proj-1', units_completed: 10, hours_worked: 2 },
      { project_id: 'proj-1', units_completed: 5, hours_worked: 1 },
      { project_id: 'proj-2', units_completed: 8, hours_worked: 3 },
      { project_id: null, units_completed: 4, hours_worked: 2 },
    ];

    const summary = summarizeWorkStats(rows as any);

    expect(summary).toEqual([
      { projectId: 'proj-1', units: 15, hours: 3 },
      { projectId: 'proj-2', units: 8, hours: 3 },
      { projectId: null, units: 4, hours: 2 },
    ]);
  });

  it('creates invoice with line items and adjustments', async () => {
    const preview = {
      workerId: 'worker-123',
      periodStart: '2025-11-01',
      periodEnd: '2025-11-15',
      totalAmount: 150,
      currency: 'USD',
      lines: [
        { projectId: 'proj-1', projectName: 'Alpha', units: 10, hours: 3, rate: 5, amount: 50 },
        { projectId: 'proj-2', projectName: 'Beta', units: 20, hours: 5, rate: 5, amount: 100 },
      ],
      adjustments: [],
    };

    const adjustments = [
      { type: 'bonus' as const, amount: 25, reason: 'Peak week bonus' },
      { type: 'deduction' as const, amount: 5, reason: 'Equipment lease' },
    ];

    const result = await createInvoice({
      workerId: 'worker-123',
      periodStart: '2025-11-01',
      periodEnd: '2025-11-15',
      status: 'submitted',
      adjustments,
      preview,
    });

    expect(result.invoiceId).toBe('inv-test');
    expect(invoiceInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        worker_id: 'worker-123',
        period_start: '2025-11-01',
        period_end: '2025-11-15',
        total_amount: 170, // 150 + 25 - 5
        status: 'submitted',
        currency: 'USD',
      }),
    );
    expect(lineItemsInsert).toHaveBeenCalledWith([
      expect.objectContaining({ project_id: 'proj-1', units: 10, amount: 50, rate: 5 }),
      expect.objectContaining({ project_id: 'proj-2', units: 20, amount: 100, rate: 5 }),
    ]);
    expect(adjustmentsInsert).toHaveBeenCalledWith([
      { invoice_id: 'inv-test', adjustment_type: 'bonus', amount: 25, reason: 'Peak week bonus' },
      { invoice_id: 'inv-test', adjustment_type: 'deduction', amount: 5, reason: 'Equipment lease' },
    ]);

  });
});
