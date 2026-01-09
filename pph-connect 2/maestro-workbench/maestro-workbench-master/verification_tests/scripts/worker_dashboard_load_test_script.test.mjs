import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const scriptPath = (() => {
  const candidates = [
    path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'scripts', 'perf', 'worker_dashboard_load_test.js'),
    path.join(process.cwd(), 'scripts', 'perf', 'worker_dashboard_load_test.js'),
  ];
  const match = candidates.find((candidate) => existsSync(candidate));
  return match ?? candidates[0];
})();

test('worker dashboard k6 script defines scenarios for 100+ VUs', () => {
  assert.ok(existsSync(scriptPath), 'Expected worker_dashboard_load_test.js to exist');
  const content = readFileSync(scriptPath, 'utf8');

  assert.match(content, /options\s*=\s*{\s*scenarios/i, 'Expected k6 options with scenarios');
  assert.match(content, /vus:\s*100/i, 'Expected default 100 VUs');
  assert.match(content, /BASE_URL/i, 'Expected BASE_URL usage');
  assert.match(content, /http\.get/i, 'Expected HTTP get call');
});
