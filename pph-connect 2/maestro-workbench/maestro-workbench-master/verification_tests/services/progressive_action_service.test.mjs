import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const resolveModule = (relativePath) => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', relativePath),
    path.join(process.cwd(), relativePath),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(`Unable to locate ${relativePath}`);
  }
  return match;
};

const servicePath = resolveModule('src/services/progressiveActionService.ts');
const serviceContent = readFileSync(servicePath, 'utf8');

test('progressive action service exports key helpers', () => {
  assert.match(serviceContent, /export\s+type\s+ProgressiveAction\b/, 'Expected ProgressiveAction type export');
  assert.match(serviceContent, /export\s+function\s+buildProgressiveActionPlan/, 'Expected plan builder export');
  assert.match(serviceContent, /export\s+async\s+function\s+applyProgressiveActionPlan/, 'Expected plan executor export');
  assert.match(serviceContent, /export\s+async\s+function\s+handleProgressiveActions/, 'Expected orchestrator export');
});

test('buildProgressiveActionPlan maps zones to expected actions', () => {
  assert.match(
    serviceContent,
    /case\s+'yellow'[\s\S]+notify_worker[\s\S]+recommend_training[\s\S]+notify_manager/i,
    'Expected yellow zone actions'
  );
  assert.match(
    serviceContent,
    /case\s+'orange'[\s\S]+escalated_warning[\s\S]+pause_assignments[\s\S]+manager_review/i,
    'Expected orange zone escalation actions'
  );
  assert.match(
    serviceContent,
    /case\s+'red'[\s\S]+auto_remove[\s\S]+notify_manager[\s\S]+pause_assignments/i,
    'Expected red zone auto removal actions'
  );
  assert.match(serviceContent, /TRAINING_RECOMMENDATIONS/, 'Expected default training resources');
});

test('progressive action service orchestrates warnings, alerts, and removals', () => {
  assert.match(serviceContent, /triggerQualityWarning/, 'Expected to reuse quality warning service');
  assert.match(serviceContent, /createQualityAlert/, 'Expected to log alerts for managers');
  assert.match(serviceContent, /supabase[\s\S]+\.from\('auto_removals'\)/, 'Expected auto removals insert');
  assert.match(serviceContent, /supabase[\s\S]+\.from\('quality_alerts'\)/, 'Expected quality alerts insert');
  assert.match(serviceContent, /supabase\.functions\.invoke\('send-message'/, 'Expected messaging notification');
  assert.match(serviceContent, /handleProgressiveActions/, 'Expected main orchestration helper');
});
