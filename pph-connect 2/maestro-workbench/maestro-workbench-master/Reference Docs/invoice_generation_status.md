# Invoice Generation Status

This note tracks how invoices move from preview to persisted records and how the offboarding workflow triggers the automation.

## Preview Flow

- `generateInvoicePreview(workerId, startDate, endDate)` aggregates `work_stats` via `summarizeWorkStats`, fetches worker/project rates, and produces normalized line data (units, hours, rate, amount).
- Preview totals are calculated by summing line amounts plus any applied adjustments and provide the currency hint from `calculateWorkerBalance`.
- `generateInvoicePdf` reuses the preview payload to render a lightweight PDF for download.

## Creation Flow

- `createInvoice({ workerId, periodStart, periodEnd, status, adjustments, preview })` calls `generateInvoicePreview` (or accepts an injected preview) to obtain line items.
- The helper inserts a row in `invoices`, then writes batched `invoice_line_items` records and optional `invoice_adjustments` rows tied to the generated invoice id.
- Adjustments passed into `createInvoice` are persisted with their type (bonus/deduction) and included in the stored total amount.
- A dedicated Vitest suite (`src/services/__tests__/invoiceService.test.ts`) verifies both the summarization helper and invoice creation behavior.

## Offboarding Integration

- `processOffboardingStep` now uses `createInvoice` during the `generate_invoice` step, replacing the placeholder insert logic.
- Successful invoice ids are stored in the `offboarding_events` metadata so later steps can mark them as paid.
- Updating this integration ensured `verification_tests/services/offboarding_service.test.mjs` asserts the new dependency.
