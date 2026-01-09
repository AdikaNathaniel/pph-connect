# CSV Bulk Upload Status

This document explains how the worker CSV importer works and which helpers keep the feature stable.

## Template

- `generateBulkUploadTemplate()` (from `BulkUploadModal.tsx`) emits a header row covering HR ID, engagement model, locales, emails, and compliance dates plus a populated example row so admins understand formatting.
- The download button in `BulkUploadModal` simply converts the template string to a Blob and triggers a browser download; no server call is required.

## Validation

- Each parsed row flows through `mapRowToWorkerValues`, which trims strings, splits `locale_all` into an array, and returns `{ values, errors }` so invalid rows are surfaced inline.
- `workerFormSchema` is re-used for single-record creation and drives error messaging (invalid emails, required locales, etc.), ensuring CSV uploads match manual form rules.

## Ingestion

- The modal batches valid rows and sends them to Supabase via `supabase.from('workers').insert(cleanedRows)`, while failures accumulate with row numbers so admins can download an “errors CSV”.
- A summary panel shows counts for successful inserts vs. failures, and the component emits toast notifications using `showErrorToast`/`showSuccessToast`.
- Existing unit tests (`src/components/worker/__tests__/BulkUploadCsv.test.ts`) validate the template generator and row-mapping helpers, keeping the importer aligned with schema updates.
