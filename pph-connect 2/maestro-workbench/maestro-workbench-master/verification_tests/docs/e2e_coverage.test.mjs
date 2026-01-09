import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const resolveDoc = () => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'e2e_coverage.md'),
    path.join(process.cwd(), 'Reference Docs', 'e2e_coverage.md'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
};

const docPath = resolveDoc();

const REQUIRED_SECTIONS = ['Overview', 'Playwright Specs', 'Verification Guards', 'Maintenance'];

test('E2E coverage doc exists with required sections and mappings', () => {
  assert.ok(existsSync(docPath), 'Expected e2e_coverage.md to exist in Reference Docs');
  const content = readFileSync(docPath, 'utf8');

  REQUIRED_SECTIONS.forEach((section) => {
    assert.match(content, new RegExp(`##\\s+${section}`), `Expected section ${section}`);
  });

  const flows = [
    { label: 'User login', spec: 'login.spec.ts', guard: 'login_flow_spec.test.mjs' },
    { label: 'Add worker', spec: 'add-worker.spec.ts', guard: 'add_worker_flow_spec.test.mjs' },
    { label: 'Bulk upload workers', spec: 'bulk-upload.spec.ts', guard: 'bulk_upload_flow_spec.test.mjs' },
    { label: 'Assign worker', spec: 'assign-worker.spec.ts', guard: 'assign_worker_flow_spec.test.mjs' },
    { label: 'Worker self-service', spec: 'worker-self-service.spec.ts', guard: 'worker_self_service_flow_spec.test.mjs' },
    { label: 'Send message', spec: 'send-message.spec.ts', guard: 'send_message_flow_spec.test.mjs' },
    { label: 'Create project listing', spec: 'create-project-listing.spec.ts', guard: 'create_project_listing_flow_spec.test.mjs' },
    { label: 'Apply to project', spec: 'apply-project.spec.ts', guard: 'apply_project_flow_spec.test.mjs' },
    { label: 'Approve application', spec: 'approve-project-application.spec.ts', guard: 'approve_project_application_flow_spec.test.mjs' },
  ];

  flows.forEach((flow) => {
    assert.match(content, new RegExp(flow.label), `Expected coverage entry for ${flow.label}`);
    assert.match(content, new RegExp(flow.spec), `Expected spec reference for ${flow.label}`);
    assert.match(content, new RegExp(flow.guard), `Expected verification reference for ${flow.label}`);
  });
});
