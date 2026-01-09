import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import type { ParseResult } from 'papaparse';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import type { WorkerFormValues } from '@/types/app';

export interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportRows?: (rows: WorkerFormValues[]) => Promise<BulkImportSummary>;
  onImportComplete?: (summary: BulkImportSummary) => void;
  onDownloadTemplate?: () => void;
}

export interface BulkImportSummary {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ValidationResult {
  validRows: WorkerFormValues[];
  errors: ValidationError[];
}

type BulkUploadStepId = 1 | 2 | 3 | 4 | 5;

interface StepDefinition {
  id: BulkUploadStepId;
  label: string;
  description: string;
}

const STEP_FLOW: StepDefinition[] = [
  { id: 1, label: 'Template', description: 'Download the CSV template with required columns.' },
  { id: 2, label: 'Upload', description: 'Select the CSV file to validate.' },
  { id: 3, label: 'Validate', description: 'Review validation results and resolve issues.' },
  { id: 4, label: 'Review', description: 'Confirm rows that are ready to import.' },
  { id: 5, label: 'Import', description: 'Track import progress and outcomes.' }
];

const REQUIRED_COLUMNS = [
  'hr_id',
  'full_name',
  'engagement_model',
  'worker_role',
  'email_personal',
  'email_pph',
  'country_residence',
  'locale_primary',
  'locale_all',
  'hire_date',
  'rtw_datetime',
  'supervisor_id',
  'termination_date',
  'bgc_expiration_date',
  'status'
];

const ENGAGEMENT_MODELS = ['core', 'upwork', 'external', 'internal'];
const WORKER_STATUSES = ['pending', 'active', 'inactive', 'terminated'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const COUNTRY_REGEX = /^[A-Z]{2}$/;
const MAX_UPLOAD_ROWS = 500;
const CHUNK_SIZE = 20;

export const generateBulkUploadTemplate = (): string => {
  const header = REQUIRED_COLUMNS.join(',');
  const exampleRow = [
    'HR-000123',
    'Jane Worker',
    'core',
    'Content Reviewer',
    'jane.worker@example.com',
    'jane.worker@pphconnect.com',
    'US',
    'en-US',
    '"en-US|es-ES"',
    '2024-01-15',
    '2024-01-20T09:00',
    '',
    '',
    '',
    'pending'
  ].join(',');
  return `${header}\n${exampleRow}\n`;
};

const sanitizeForFilter = (value: string) => value.replace(/[^A-Za-z0-9@._-]/g, '');

const normalizeLocaleList = (value: string): string[] => {
  if (!value) {
    return [];
  }
  return value
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export const mapRowToWorkerValues = (
  row: Record<string, string>,
  index: number
): { values: WorkerFormValues | null; errors: ValidationError[] } => {
  const errors: ValidationError[] = [];
  const val = (key: string) => row[key]?.trim() ?? '';
  const rowNumber = index + 2;

  const addError = (field: string, message: string) => {
    errors.push({ row: rowNumber, field, message });
  };

  const requiredChecks: Array<[string, string]> = [
    ['hr_id', 'HR ID is required'],
    ['full_name', 'Full name is required'],
    ['engagement_model', 'Engagement model is required'],
    ['email_personal', 'Personal email is required'],
    ['country_residence', 'Country is required'],
    ['locale_primary', 'Primary locale is required'],
    ['hire_date', 'Hire date is required'],
    ['status', 'Status is required']
  ];

  requiredChecks.forEach(([field, message]) => {
    if (!val(field)) {
      addError(field, message);
    }
  });

  const engagementModel = val('engagement_model').toLowerCase();
  if (engagementModel && !ENGAGEMENT_MODELS.includes(engagementModel)) {
    addError('engagement_model', `Engagement model must be one of: ${ENGAGEMENT_MODELS.join(', ')}`);
  }

  const status = val('status').toLowerCase();
  if (status && !WORKER_STATUSES.includes(status)) {
    addError('status', `Status must be one of: ${WORKER_STATUSES.join(', ')}`);
  }

  const personalEmail = val('email_personal');
  if (personalEmail && !EMAIL_REGEX.test(personalEmail)) {
    addError('email_personal', 'Enter a valid personal email address');
  }

  const pphEmail = val('email_pph');
  if (pphEmail && !EMAIL_REGEX.test(pphEmail)) {
    addError('email_pph', 'Enter a valid PPH email address');
  }

  const country = val('country_residence').toUpperCase();
  if (country && !COUNTRY_REGEX.test(country)) {
    addError('country_residence', 'Country must be a two-letter ISO code');
  }

  const hireDate = val('hire_date');
  if (hireDate && !DATE_REGEX.test(hireDate)) {
    addError('hire_date', 'Hire date must use YYYY-MM-DD format');
  }

  const rtwDateTime = val('rtw_datetime');
  if (rtwDateTime && !DATE_TIME_REGEX.test(rtwDateTime)) {
    addError('rtw_datetime', 'RTW Date/Time must use YYYY-MM-DDTHH:MM format');
  }

  const terminationDate = val('termination_date');
  if (terminationDate && !DATE_REGEX.test(terminationDate)) {
    addError('termination_date', 'Termination date must use YYYY-MM-DD format');
  }

  const bgcExpirationDate = val('bgc_expiration_date');
  if (bgcExpirationDate && !DATE_REGEX.test(bgcExpirationDate)) {
    addError('bgc_expiration_date', 'BGC expiration date must use YYYY-MM-DD format');
  }

  if (errors.length > 0) {
    return { values: null, errors };
  }

  return {
    values: {
      hrId: val('hr_id'),
      fullName: val('full_name'),
      engagementModel: engagementModel as WorkerFormValues['engagementModel'],
      workerRole: val('worker_role') || null,
      emailPersonal: personalEmail,
      emailPph: pphEmail || null,
      countryResidence: country,
      localePrimary: val('locale_primary'),
      localeAll: normalizeLocaleList(val('locale_all')),
      hireDate,
      rtwDateTime: rtwDateTime || null,
      supervisorId: val('supervisor_id') || null,
      terminationDate: terminationDate || null,
      bgcExpirationDate: bgcExpirationDate || null,
      status: status as WorkerFormValues['status']
    },
    errors
  };
};

const buildErrorReportCsv = (errors: ValidationError[]) => {
  const header = 'row,field,message';
  const rows = errors.map((error) => `${error.row},${error.field},"${error.message.replace(/"/g, '""')}"`);
  return [header, ...rows].join('\n');
};

const useDownloadBlob = () => {
  const anchorRef = useRef<HTMLAnchorElement | null>(null);

  if (!anchorRef.current && typeof document !== 'undefined') {
    const anchor = document.createElement('a');
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchorRef.current = anchor;
  }

  return useCallback((filename: string, content: string, type = 'text/csv') => {
    if (!anchorRef.current) {
      return;
    }
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    anchorRef.current.href = url;
    anchorRef.current.download = filename;
    anchorRef.current.click();
    URL.revokeObjectURL(url);
  }, []);
};

const chunkRows = <T,>(rows: T[], size: number): T[][] => {
  const output: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    output.push(rows.slice(index, index + size));
  }
  return output;
};

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  open,
  onOpenChange,
  onImportRows,
  onImportComplete,
  onDownloadTemplate
}) => {
  const [activeStep, setActiveStep] = useState<BulkUploadStepId>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importSummary, setImportSummary] = useState<BulkImportSummary | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const downloadBlob = useDownloadBlob();

  const resetState = useCallback(() => {
    setActiveStep(1);
    setSelectedFile(null);
    setFileError(null);
    setIsParsing(false);
    setValidationResult(null);
    setImportSummary(null);
    setIsImporting(false);
    setProgress(0);
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  const handleDownloadTemplate = useCallback(() => {
    if (onDownloadTemplate) {
      onDownloadTemplate();
      return;
    }
    const csv = generateBulkUploadTemplate();
    downloadBlob('bulk_worker_template.csv', csv);
  }, [downloadBlob, onDownloadTemplate]);

  const handleFileSelection = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('Only .csv files are supported.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setFileError(null);
    setValidationResult(null);
    setImportSummary(null);
  }, []);

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFileSelection(file);
      }
      event.target.value = '';
    },
    [handleFileSelection]
  );

  const handleFileDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (event.dataTransfer.files?.length) {
        handleFileSelection(event.dataTransfer.files[0]);
      }
    },
    [handleFileSelection]
  );

  const validateWithSupabase = useCallback(async (rows: Array<{ rowNumber: number; values: WorkerFormValues }>, errors: ValidationError[]) => {
    const nextErrors = [...errors];
    if (rows.length === 0) {
      return nextErrors;
    }

    const hrIds = Array.from(
      new Set(
        rows
          .map((entry) => sanitizeForFilter(entry.values.hrId))
          .filter((value) => Boolean(value))
      )
    );
    const emails = Array.from(
      new Set(
        rows
          .flatMap((entry) => [entry.values.emailPersonal, entry.values.emailPph])
          .filter((value): value is string => Boolean(value))
          .map(sanitizeForFilter)
      )
    );

    if (hrIds.length === 0 && emails.length === 0) {
      return nextErrors;
    }

    const filters: string[] = [];
    if (hrIds.length > 0) {
      filters.push(`hr_id.in.(${hrIds.join(',')})`);
    }
    if (emails.length > 0) {
      filters.push(`email_personal.in.(${emails.join(',')})`);
      filters.push(`email_pph.in.(${emails.join(',')})`);
    }

    const { data, error } = await supabase
      .from('workers')
      .select('hr_id, email_personal, email_pph')
      .or(filters.join(','));

    if (error || !data) {
      nextErrors.push({
        row: 0,
        field: 'supabase',
        message: `Unable to verify uniqueness: ${error?.message ?? 'unexpected error'}`
      });
      return nextErrors;
    }

    const existingHrIds = new Set(
      data
        .map((row) => row.hr_id)
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase())
    );
    const existingEmails = new Set(
      data
        .flatMap((row) => [row.email_personal, row.email_pph])
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase())
    );

    rows.forEach((entry) => {
      const { values, rowNumber } = entry;
      if (existingHrIds.has(values.hrId.toLowerCase())) {
        nextErrors.push({
          row: rowNumber,
          field: 'hr_id',
          message: 'HR ID already exists in workspace'
        });
      }
      if (existingEmails.has(values.emailPersonal.toLowerCase())) {
        nextErrors.push({
          row: rowNumber,
          field: 'email_personal',
          message: 'Personal email already exists in workspace'
        });
      }
      if (values.emailPph && existingEmails.has(values.emailPph.toLowerCase())) {
        nextErrors.push({
          row: rowNumber,
          field: 'email_pph',
          message: 'PPH email already exists in workspace'
        });
      }
    });

    return nextErrors;
  }, []);

  const parseCsv = useCallback(
    (file: File) =>
      new Promise<ValidationResult>((resolve) => {
        setIsParsing(true);
        setValidationResult(null);
        setImportSummary(null);

        Papa.parse(file, {
          header: true,
          skipEmptyLines: 'greedy',
          complete: (results: ParseResult<Record<string, string>>) => {
            (async () => {
              const candidateRows: Array<{ rowNumber: number; values: WorkerFormValues }> = [];
              const nextErrors: ValidationError[] = [];

              const headerColumns = results.meta.fields ?? [];
              const missingColumns = REQUIRED_COLUMNS.filter((column) => !headerColumns.includes(column));
              const extraColumns = headerColumns.filter((column) => !REQUIRED_COLUMNS.includes(column));

              missingColumns.forEach((column) => {
                nextErrors.push({
                  row: 1,
                  field: column,
                  message: `Missing column "${column}" in CSV header`
                });
              });

              extraColumns.forEach((column) => {
                nextErrors.push({
                  row: 1,
                  field: column,
                  message: `Unexpected column "${column}" found in CSV header`
                });
              });

              results.errors.forEach((parseError) => {
                nextErrors.push({
                  row: (parseError.row ?? 0) + 1,
                  field: 'parse',
                  message: parseError.message
                });
              });

              const rawRows = results.data;

              if (rawRows.length === 0) {
                nextErrors.push({
                  row: 0,
                  field: 'rows',
                  message: 'The CSV does not contain any data rows.'
                });
              }

              if (rawRows.length > MAX_UPLOAD_ROWS) {
                nextErrors.push({
                  row: 0,
                  field: 'rows',
                  message: `Upload limit is ${MAX_UPLOAD_ROWS} rows per file.`
                });
              }

              const seenHrIds = new Map<string, number>();
              const seenEmails = new Map<string, number>();

              rawRows.forEach((row, index) => {
                const isEmptyRow = Object.values(row).every((value) => {
                  if (typeof value !== 'string') {
                    return true;
                  }
                  return value.trim() === '';
                });

                if (isEmptyRow) {
                  return;
                }

                const { values, errors } = mapRowToWorkerValues(row, index);
                if (errors.length > 0 || !values) {
                  nextErrors.push(...errors);
                  return;
                }

                const rowNumber = index + 2;
                const lowerHrId = values.hrId.toLowerCase();
                if (seenHrIds.has(lowerHrId)) {
                  nextErrors.push({
                    row: rowNumber,
                    field: 'hr_id',
                    message: `Duplicate HR ID also found on row ${seenHrIds.get(lowerHrId)}`
                  });
                } else {
                  seenHrIds.set(lowerHrId, rowNumber);
                }

                const personalEmail = values.emailPersonal.toLowerCase();
                if (seenEmails.has(personalEmail)) {
                  nextErrors.push({
                    row: rowNumber,
                    field: 'email_personal',
                    message: `Duplicate personal email also found on row ${seenEmails.get(personalEmail)}`
                  });
                } else {
                  seenEmails.set(personalEmail, rowNumber);
                }

                if (values.emailPph) {
                  const pphKey = values.emailPph.toLowerCase();
                  if (seenEmails.has(pphKey)) {
                    nextErrors.push({
                      row: rowNumber,
                      field: 'email_pph',
                      message: `Duplicate PPH email also found on row ${seenEmails.get(pphKey)}`
                    });
                  } else {
                    seenEmails.set(pphKey, rowNumber);
                  }
                }

                candidateRows.push({ rowNumber, values });
              });

              const errorsWithSupabase = await validateWithSupabase(candidateRows, nextErrors);
              const errorRows = new Set(errorsWithSupabase.filter((error) => error.row > 0).map((error) => error.row));
              const validRows = candidateRows
                .filter((entry) => !errorRows.has(entry.rowNumber))
                .map((entry) => entry.values);

              const result = { validRows, errors: errorsWithSupabase };
              setValidationResult(result);
              setIsParsing(false);
              resolve(result);
            })().catch((error) => {
              setIsParsing(false);
              resolve({
                validRows: [],
                errors: [
                  {
                    row: 0,
                    field: 'parse',
                    message: error instanceof Error ? error.message : 'Unexpected error while validating CSV'
                  }
                ]
              });
            });
          },
          error: (error) => {
            setIsParsing(false);
            resolve({
              validRows: [],
              errors: [
                {
                  row: 0,
                  field: 'parse',
                  message: error.message || 'Unable to parse CSV'
                }
              ]
            });
          }
        });
      }),
    [validateWithSupabase]
  );

  const handleValidate = useCallback(async () => {
    if (!selectedFile) {
      setFileError('Select a CSV file before continuing.');
      return;
    }
    await parseCsv(selectedFile);
    setActiveStep(3);
  }, [parseCsv, selectedFile]);

  const handleProceedToReview = useCallback(() => {
    setActiveStep(4);
  }, []);

  const handleImportConfirm = useCallback(async () => {
    if (!validationResult || validationResult.validRows.length === 0) {
      return;
    }

    const rows = validationResult.validRows;
    const summary: BulkImportSummary = {
      total: rows.length,
      success: 0,
      failed: 0,
      errors: []
    };

    const performImport =
      onImportRows ??
      (async (payload: WorkerFormValues[]) => {
        const timestamp = new Date().toISOString();
        const mapped = payload.map((row) => ({
          hr_id: row.hrId,
          full_name: row.fullName,
          engagement_model: row.engagementModel,
          worker_role: row.workerRole,
          email_personal: row.emailPersonal,
          email_pph: row.emailPph,
          country_residence: row.countryResidence,
          locale_primary: row.localePrimary,
          locale_all: row.localeAll,
          hire_date: row.hireDate,
          rtw_datetime: row.rtwDateTime,
          supervisor_id: row.supervisorId,
          termination_date: row.terminationDate,
          bgc_expiration_date: row.bgcExpirationDate,
          status: row.status,
          created_at: timestamp,
          updated_at: timestamp
        }));
        const { error } = await supabase.from('workers').insert(mapped);
        if (error) {
          throw new Error(error.message);
        }
        return {
          total: mapped.length,
          success: mapped.length,
          failed: 0,
          errors: []
        };
      });

    try {
      setIsImporting(true);
      setActiveStep(5);
      setProgress(0);

      const batches = chunkRows(rows, CHUNK_SIZE);
      for (let index = 0; index < batches.length; index += 1) {
        const batch = batches[index];
        try {
          const batchResult = await performImport(batch);
          summary.success += batchResult.success;
          summary.failed += batchResult.failed;
          summary.errors.push(
            ...batchResult.errors.map((error) => ({
              row: error.row,
              message: error.message
            }))
          );
        } catch (error) {
          summary.failed += batch.length;
          summary.errors.push({
            row: 0,
            message: error instanceof Error ? error.message : 'Unexpected error occurred while importing this batch.'
          });
        }
        const completed = Math.min(rows.length, (index + 1) * CHUNK_SIZE);
        setProgress(completed / rows.length);
      }

      setImportSummary(summary);
      onImportComplete?.(summary);
    } finally {
      setIsImporting(false);
    }
  }, [validationResult, onImportRows, onImportComplete]);

  const handleDownloadValidationErrors = useCallback(() => {
    if (!validationResult || validationResult.errors.length === 0) {
      return;
    }
    downloadBlob('bulk_upload_errors.csv', buildErrorReportCsv(validationResult.errors));
  }, [downloadBlob, validationResult]);

  const handleDownloadImportErrors = useCallback(() => {
    if (!importSummary || importSummary.errors.length === 0) {
      return;
    }
    downloadBlob('bulk_upload_import_errors.csv', buildErrorReportCsv(importSummary.errors));
  }, [downloadBlob, importSummary]);

  const stepContent = useMemo(() => {
    switch (activeStep) {
      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Start by downloading the CSV template. The template includes required columns and an example row to guide formatting.
            </p>
            <Button data-testid="bulk-upload-download-template" onClick={handleDownloadTemplate}>
              Download template
            </Button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div
              data-testid="bulk-upload-dropzone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleFileDrop}
              className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border/60 bg-muted/30 p-6 text-center"
            >
              <p className="text-sm text-muted-foreground">
                Drag and drop your CSV file here, or choose a file to upload.
              </p>
              <Input
                data-testid="bulk-upload-file-input"
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
              />
              {selectedFile ? <Badge variant="secondary">{selectedFile.name}</Badge> : null}
            </div>
            {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveStep(1)}>
                Back
              </Button>
              <Button onClick={handleValidate} disabled={!selectedFile || isParsing}>
                Validate file
              </Button>
            </DialogFooter>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            {isParsing ? (
              <div className="flex items-center justify-center gap-2 py-8">
                <span className="text-sm text-muted-foreground">Parsing CSV…</span>
              </div>
            ) : (
              <>
                <div data-testid="bulk-upload-validation-summary" className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {validationResult?.validRows.length ?? 0} valid row{validationResult?.validRows.length === 1 ? '' : 's'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {validationResult?.errors.length ?? 0} issue{validationResult?.errors.length === 1 ? '' : 's'} detected
                  </p>
                </div>
                {validationResult && validationResult.errors.length > 0 ? (
                  <ScrollArea className="max-h-48 rounded border border-border/60">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                          <th className="px-3 py-2">Row</th>
                          <th className="px-3 py-2">Field</th>
                          <th className="px-3 py-2">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.errors.map((error) => (
                          <tr key={`${error.row}-${error.field}-${error.message}`} className="border-b border-border/40">
                            <td className="px-3 py-2">{error.row}</td>
                            <td className="px-3 py-2">{error.field}</td>
                            <td className="px-3 py-2">{error.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    data-testid="bulk-upload-error-report"
                    variant="outline"
                    onClick={handleDownloadValidationErrors}
                    disabled={!validationResult || validationResult.errors.length === 0}
                  >
                    Download error report
                  </Button>
                  <Button
                    onClick={handleProceedToReview}
                    disabled={
                      !validationResult ||
                      validationResult.validRows.length === 0 ||
                      validationResult.errors.length > 0
                    }
                  >
                    Continue to review
                  </Button>
                </div>
              </>
            )}
          </div>
        );
      case 4: {
        const previewRows = validationResult?.validRows.slice(0, 5) ?? [];
        const remainingRows = Math.max(
          0,
          (validationResult?.validRows.length ?? 0) - previewRows.length
        );

        return (
          <div className="space-y-4">
            <div className="rounded-md border border-border/60 bg-muted/30 p-4">
              <h3 className="text-sm font-medium text-foreground">Import summary</h3>
              <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Valid</Badge>
                  <span>{validationResult?.validRows.length ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Issues</Badge>
                  <span>{validationResult?.errors.length ?? 0}</span>
                </div>
              </div>
            </div>

            {validationResult && validationResult.errors.length === 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <span aria-hidden="true">✓</span>
                  <span>
                    All {validationResult?.validRows.length ?? 0} rows validated successfully.
                  </span>
                </div>
                <ScrollArea
                  data-testid="bulk-upload-preview-table"
                  className="max-h-56 rounded border border-border/60"
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                        <th className="px-3 py-2">HR ID</th>
                        <th className="px-3 py-2">Full name</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Country</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr key={`${row.hrId}-${index}`} className="border-b border-border/40">
                          <td className="px-3 py-2">{row.hrId}</td>
                          <td className="px-3 py-2">{row.fullName}</td>
                          <td className="px-3 py-2">{row.emailPersonal}</td>
                          <td className="px-3 py-2 capitalize">{row.status}</td>
                          <td className="px-3 py-2">{row.countryResidence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
                {remainingRows > 0 ? (
                  <p className="text-xs text-muted-foreground">...and {remainingRows} more rows.</p>
                ) : null}
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveStep(3)}>
                Back
              </Button>
              <Button
                onClick={handleImportConfirm}
                disabled={
                  isImporting ||
                  !validationResult ||
                  validationResult.validRows.length === 0
                }
              >
                Confirm import
              </Button>
            </DialogFooter>
          </div>
        );
      }
      case 5:
        return (
          <div className="space-y-4">
            {isImporting ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Importing workers…</span>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    data-testid="bulk-upload-progress"
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md border border-border/60 bg-muted/30 p-4 text-sm">
                  <p>Total rows: {importSummary?.total ?? 0}</p>
                  <p>Imported: {importSummary?.success ?? 0}</p>
                  <p>Failed: {importSummary?.failed ?? 0}</p>
                </div>
                {importSummary && importSummary.errors.length > 0 ? (
                  <ScrollArea className="max-h-48 rounded border border-border/60">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                          <th className="px-3 py-2">Row</th>
                          <th className="px-3 py-2">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importSummary.errors.map((error, index) => (
                          <tr key={`${error.row}-${index}`} className="border-b border-border/40">
                            <td className="px-3 py-2">{error.row}</td>
                            <td className="px-3 py-2">{error.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDownloadImportErrors}
                    disabled={!importSummary || importSummary.errors.length === 0}
                  >
                    Download failed rows
                  </Button>
                  <Button onClick={() => onOpenChange(false)}>Done</Button>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  }, [
    activeStep,
    fileError,
    handleDownloadImportErrors,
    handleDownloadTemplate,
    handleDownloadValidationErrors,
    handleFileDrop,
    handleFileInputChange,
    handleImportConfirm,
    handleProceedToReview,
    handleValidate,
    isImporting,
    isParsing,
    parseCsv,
    progress,
    selectedFile,
    validationResult,
    importSummary
  ]);

  const activeStepMeta = STEP_FLOW.find((step) => step.id === activeStep);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="bulk-upload-dialog">
        <DialogHeader>
          <DialogTitle>Bulk upload workers</DialogTitle>
          <DialogDescription>
            Import worker records in five guided steps. {activeStepMeta?.description}
          </DialogDescription>
        </DialogHeader>

        <div data-testid="bulk-upload-step-indicator" className="flex flex-wrap items-center gap-2">
          {STEP_FLOW.map((step) => (
            <Button
              key={step.id}
              type="button"
              variant={activeStep === step.id ? 'default' : 'outline'}
              size="sm"
              data-testid={`bulk-upload-step-${step.id}`}
              aria-current={activeStep === step.id ? 'step' : undefined}
              onClick={() => setActiveStep(step.id)}
            >
              {step.id}. {step.label}
            </Button>
          ))}
        </div>

        <div className="mt-4 space-y-4">{stepContent}</div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadModal;
