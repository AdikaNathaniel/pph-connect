import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { UploadCloud, CheckCircle2, AlertTriangle } from 'lucide-react';
import { generateStatsTemplate } from '@/lib/stats/template';
import { cn } from '@/lib/utils/helpers';
import { validateStatsRows, type StatsRow } from '@/lib/stats/validation';

const STEPS = ['template', 'upload', 'validate', 'import'] as const;

const CSV_COLUMNS = [
  'worker_account_email',
  'project_code',
  'work_date',
  'units_completed',
  'hours_worked'
] as const;

type Step = (typeof STEPS)[number];

type UploadedFile = {
  name: string;
  size: number;
  rows: number;
};

type ValidationMessage = {
  id: string;
  level: 'error' | 'warning' | 'info';
  message: string;
};

export interface StatsImportModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onImportStart?: (payload: StatsRow[]) => Promise<void>;
  onImportComplete?: () => void;
}

const stepLabel: Record<Step, string> = {
  template: 'Download template',
  upload: 'Upload CSV',
  validate: 'Review validation',
  import: 'Import stats'
};

export const StatsImportModal: React.FC<StatsImportModalProps> = ({
  open,
  onOpenChange,
  onImportStart,
  onImportComplete
}) => {
  const [activeStep, setActiveStep] = useState<Step>('template');
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [validationMessages, setValidationMessages] = useState<ValidationMessage[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState<StatsRow[]>([]);

  const currentStepIndex = useMemo(() => STEPS.indexOf(activeStep), [activeStep]);
  const progressValue = useMemo(() => ((currentStepIndex + 1) / STEPS.length) * 100, [currentStepIndex]);

  const handleDownloadTemplate = () => {
    const payload = generateStatsTemplate();
    const blob = new Blob([payload], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'stats-import-template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const parseCsvContent = (content: string): StatsRow[] => {
    const [headerLine, ...lines] = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (!headerLine) {
      return [];
    }
    const headers = headerLine.split(',').map((value) => value.trim());
    return lines.map((line) => {
      const cells = line.split(',');
      const record: Record<string, string> = {};
      headers.forEach((key, index) => {
        record[key] = cells[index]?.trim() ?? '';
      });
      return {
        worker_account_email: record.worker_account_email ?? '',
        project_code: record.project_code ?? '',
        work_date: record.work_date ?? '',
        units_completed: Number(record.units_completed ?? '0'),
        hours_worked: Number(record.hours_worked ?? '0')
      };
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setValidationMessages([]);
      return;
    }
    const text = await file.text();
    const rows = parseCsvContent(text);
    setSelectedFile({
      name: file.name,
      size: file.size,
      rows: rows.length
    });
    setParsedRows(rows);
    setActiveStep('validate');
    if (rows.length === 0) {
      setValidationMessages([
        {
          id: 'empty-file',
          row: 0,
          level: 'error',
          message: 'Uploaded file appears to be empty.'
        }
      ]);
      return;
    }
    try {
      const result = await validateStatsRows(rows);
      setValidationMessages(result.messages);
    } catch (error) {
      setValidationMessages([
        {
          id: 'validation-crash',
          row: 0,
          level: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Validation failed unexpectedly. Please try again.'
        }
      ]);
    }
  };

  const resetState = () => {
    setActiveStep('template');
    setSelectedFile(null);
    setValidationMessages([]);
    setIsImporting(false);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const advanceToImport = () => {
    setActiveStep('import');
    setValidationMessages((messages) =>
      messages.filter((message) => message.level !== 'error')
    );
  };

  const runImport = async () => {
    setIsImporting(true);
    try {
      if (onImportStart && parsedRows.length > 0) {
        await onImportStart(parsedRows);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 750));
      }
      onImportComplete?.();
      handleClose(false);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl" aria-describedby="stats-import-description">
        <DialogHeader>
          <DialogTitle>Import stats</DialogTitle>
          <DialogDescription id="stats-import-description">
            Upload the latest production metrics export to keep dashboards fresh.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4" data-testid="stats-import-stepper">
            <Progress value={progressValue} className="h-2" />
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {STEPS.map((step, index) => {
                const isActive = step === activeStep;
                const isComplete = currentStepIndex > index;

                return (
                  <div key={step} className="flex items-center gap-2">
                    <Badge
                      variant={isActive ? 'default' : isComplete ? 'secondary' : 'outline'}
                      className={cn('px-3 py-1', isActive && 'bg-primary text-primary-foreground')}
                    >
                      {index + 1}
                    </Badge>
                    <span className={cn('font-medium', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                      {stepLabel[step]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {activeStep === 'template' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Download template</h2>
              <p className="text-sm text-muted-foreground">
                Use the CSV template to avoid formatting issues. Populate the rows and return here to upload.
              </p>
              <Button
                data-testid="stats-download-template"
                variant="secondary"
                onClick={handleDownloadTemplate}
              >
                Download template
              </Button>
              <div className="text-xs text-muted-foreground">
                Required columns: {CSV_COLUMNS.join(', ')}
              </div>
            </div>
          ) : null}

          {activeStep === 'upload' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Upload CSV</h2>
              <label
                data-testid="stats-upload-dropzone"
                className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-8 text-center text-sm text-muted-foreground hover:bg-primary/10"
              >
                <UploadCloud className="h-6 w-6 text-primary" />
                <div>
                  Drop file here or <span className="font-medium text-primary">browse</span>
                </div>
                <Input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          ) : null}

          {activeStep === 'validate' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Review validation</h2>
              <p className="text-sm text-muted-foreground">
                Confirm that the import looks correct. Fix any errors before running the import.
              </p>
              <div className="rounded-lg border border-border/60 bg-muted/50 p-4 space-y-3" data-testid="stats-validation-summary">
                {selectedFile ? (
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium text-foreground">{selectedFile.name}</div>
                      <div className="text-muted-foreground text-xs">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <Badge variant="secondary">Pending import</Badge>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Upload a file to start validation.
                  </div>
                )}
                <Separator />
                <div className="space-y-2 text-sm">
                  {validationMessages.length === 0 ? (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>Ready to import</AlertTitle>
                      <AlertDescription>No issues detected.</AlertDescription>
                    </Alert>
                  ) : (
                    validationMessages.map((message) => (
                      <Alert
                        key={message.id}
                        variant={message.level === 'error' ? 'destructive' : 'default'}
                      >
                        {message.level === 'error' ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : message.level === 'warning' ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                        <AlertTitle className="capitalize">{message.level}</AlertTitle>
                        <AlertDescription>{message.message}</AlertDescription>
                      </Alert>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeStep === 'import' ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Import stats</h2>
              <p className="text-sm text-muted-foreground">
                Push the validated file to Supabase. Large imports may take a minute to appear in dashboards.
              </p>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Heads up</AlertTitle>
                <AlertDescription>
                  Importing stats is irreversible. Ensure you have a source backup in case you need to roll back.
                </AlertDescription>
              </Alert>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Step {currentStepIndex + 1} of {STEPS.length}
          </div>
          <div className="space-x-2">
            {activeStep !== 'template' ? (
              <Button variant="outline" onClick={resetState}>
                Start over
              </Button>
            ) : null}
            {activeStep === 'template' ? (
              <Button onClick={() => setActiveStep('upload')}>Continue</Button>
            ) : activeStep === 'upload' ? (
              <Button disabled={!selectedFile} onClick={() => setActiveStep('validate')}>
                Continue
              </Button>
            ) : activeStep === 'validate' ? (
              <Button
                disabled={validationMessages.some((message) => message.level === 'error')}
                onClick={advanceToImport}
              >
                Continue
              </Button>
            ) : (
              <Button onClick={runImport} disabled={isImporting} data-testid="stats-import-submit">
                {isImporting ? 'Importing…' : 'Run import'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatsImportModal;
