import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const componentPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'src', 'components', 'worker', 'BulkUploadModal.tsx'),
    path.join(process.cwd(), 'src', 'components', 'worker', 'BulkUploadModal.tsx')
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error('Could not locate BulkUploadModal.tsx');
  }
  return match;
})();

const content = readFileSync(componentPath, 'utf8');

test('BulkUploadModal exports helper utilities and component', () => {
  assert.match(content, /export\s+const\s+generateBulkUploadTemplate\b/, 'Expected CSV template generator export');
  assert.match(content, /export\s+interface\s+BulkUploadModalProps\b/, 'Expected props interface export');
  assert.match(content, /export\s+const\s+BulkUploadModal\b/, 'Expected component export');
  assert.match(content, /import\s+Papa\s+from\s+'papaparse'/, 'Expected papaparse integration');
});

test('BulkUploadModal renders multi-step workflow with navigation', () => {
  assert.match(
    content,
    /type\s+BulkUploadStepId\s*=\s*1\s*\|\s*2\s*\|\s*3\s*\|\s*4\s*\|\s*5/,
    'Expected explicit step id union'
  );
  assert.match(
    content,
    /interface\s+StepDefinition\s*{\s*id:\s*BulkUploadStepId;[\s\S]*label:\s*string;/,
    'Expected step definition interface'
  );
  assert.match(
    content,
    /const\s+STEP_FLOW\s*:\s*StepDefinition\[\]\s*=\s*\[/,
    'Expected step metadata definition'
  );
  assert.match(
    content,
    /const\s+\[activeStep,\s*setActiveStep\]\s*=\s*useState<BulkUploadStepId>\(1\)/,
    'Expected typed activeStep state'
  );
  assert.match(content, /data-testid="bulk-upload-step-indicator"/, 'Expected step indicator test id');
  assert.match(
    content,
    /data-testid=\{\s*`bulk-upload-step-\$\{step.id\}`\s*\}/,
    'Expected per-step button test id'
  );
  assert.match(
    content,
    /aria-current=\{activeStep === step\.id \? 'step' : undefined\}/,
    'Expected accessible step indicator states'
  );
  assert.match(
    content,
    /onClick=\{\(\)\s*=>\s*setActiveStep\(step\.id\)\}/,
    'Expected step navigation control'
  );
});

test('BulkUploadModal implements step 1 template download', () => {
  assert.match(content, /data-testid="bulk-upload-download-template"/, 'Expected download template button');
  assert.match(content, /onDownloadTemplate/, 'Expected download handler wiring');
});

test('BulkUploadModal implements step 2 file ingestion with validation', () => {
  assert.match(content, /accept="\.csv"/, 'Expected CSV file accept filter');
  assert.match(content, /data-testid="bulk-upload-file-input"/, 'Expected file input test id');
  assert.match(content, /onDrop=\{handleFileDrop\}/, 'Expected drop handler');
  assert.match(content, /data-testid="bulk-upload-dropzone"/, 'Expected dropzone region');
});

test('BulkUploadModal review step previews validated rows', () => {
  assert.match(content, /const\s+previewRows\s*=/, 'Expected preview row slicing helper');
  assert.match(content, /const\s+remainingRows\s*=\s*Math\.max/, 'Expected remaining row counter');
  assert.match(content, /data-testid="bulk-upload-preview-table"/, 'Expected preview table test id');
  assert.match(content, />\s*Confirm import\s*</, 'Expected confirm import action label');
});

test('BulkUploadModal parses CSV and surfaces validation results', () => {
  assert.match(content, /Papa\.parse/, 'Expected papaparse usage for CSV parsing');
  assert.match(content, /setValidationResult/, 'Expected validation state setter');
  assert.match(content, /data-testid="bulk-upload-validation-summary"/, 'Expected validation summary test id');
  assert.match(content, /data-testid="bulk-upload-error-report"/, 'Expected download error report control');
});

test('BulkUploadModal runs import step with progress feedback', () => {
  assert.match(content, /handleImportConfirm/, 'Expected import confirmation handler');
  assert.match(content, /data-testid="bulk-upload-progress"/, 'Expected progress indicator test id');
  assert.match(content, /onImportComplete/, 'Expected import completion callback');
});
