import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const resolvePath = (...segments) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', ...segments),
    path.join(process.cwd(), ...segments),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${segments.join('/')}`);
  }
  return match;
};

const pagePath = resolvePath('src', 'pages', 'worker', 'AvailableProjectsPage.tsx');

test('AvailableProjectsPage renders apply modal with optional cover message', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /data-testid="apply-confirmation-modal"/, 'Expected confirmation modal test id');
  assert.match(content, /coverMessage/, 'Expected cover message state');
  assert.match(content, /Textarea/, 'Expected textarea to collect cover message');
});

test('AvailableProjectsPage submits worker_applications rows and prevents duplicate applies', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /supabase[\s\S]*\.from\('worker_applications'\)[\s\S]*insert\({/, 'Expected worker_applications insert');
  assert.match(content, /worker_id:\s*workerId/, 'Expected worker_id payload');
  assert.match(content, /project_listing_id:\s*activeListing\.id/, 'Expected project listing payload');
  assert.match(
    content,
    /notes:\s*(?:coverMessage|normalizedCoverMessage|notePayload)/,
    'Expected cover message stored with notes field'
  );
  assert.match(content, /appliedListingIds/, 'Expected client-side tracking to prevent duplicate submissions');
});

test('AvailableProjectsPage notifies managers after application submit', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(
    content,
    /supabase\.functions\.invoke\('send-message'/,
    'Expected message notification via edge function'
  );
});

test('AvailableProjectsPage blocks applications when worker is not rehire eligible', () => {
  const content = readFileSync(pagePath, 'utf8');
  assert.match(content, /checkRehireEligibility/, 'Expected rehire eligibility helper import');
  assert.match(content, /const\s+\[rehireStatus/i, 'Expected rehire status state handling');
  assert.match(content, /toast\.error\(.+rehire/i, 'Expected toast when ineligible');
  assert.match(content, /rehireStatus\?.eligible\s*===\s*false/i, 'Expected guard preventing apply action');
});
