import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const candidatePaths = [
  path.join(process.cwd(), 'Reference Docs', 'interview-question-bank.md'),
  path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'Reference Docs', 'interview-question-bank.md'),
  path.join(process.cwd(), 'docs', 'interview-question-bank.md'),
  path.join(process.cwd(), 'maestro-workbench', 'maestro-workbench-master', 'docs', 'interview-question-bank.md')
].filter((candidate) => existsSync(candidate));

if (candidatePaths.length === 0) {
  throw new Error('Could not locate interview-question-bank.md');
}

const docPath = candidatePaths[0];

function readDoc() {
  return readFileSync(docPath, 'utf8');
}

function getSection(content, heading) {
  const pattern = new RegExp(`##\\s+${heading}[^]*?(?=\\n##\\s+|$)`, 'i');
  const match = content.match(pattern);
  assert.ok(match, `Missing section for ${heading}`);
  return match[0];
}

test('Interview question bank defines required domains', () => {
  const content = readDoc();
  const domains = ['STEM', 'Legal', 'Creative', 'Medical'];

  domains.forEach((domain) => {
    assert.match(
      content,
      new RegExp(`##\\s+${domain}`, 'i'),
      `Missing section for ${domain}`
    );
  });
});

test('Interview question bank outlines adaptive question trees per domain', () => {
  const content = readDoc();
  const section = getSection(content, 'Adaptive Question Trees');

  ['STEM', 'Legal', 'Creative', 'Medical'].forEach((domain) => {
    assert.match(
      section,
      new RegExp(`${domain}\\s*:?[^\\n]+Follow-up`, 'i'),
      `Adaptive tree missing explicit follow-up path for ${domain}`
    );
  });
});

test('Interview question bank documents evaluation criteria per domain', () => {
  const content = readDoc();
  const section = getSection(content, 'Evaluation Criteria');

  const expectations = {
    STEM: ['accuracy', 'problem decomposition'],
    Legal: ['compliance', 'risk rationale'],
    Creative: ['tone', 'originality'],
    Medical: ['protocol adherence', 'privacy']
  };

  Object.entries(expectations).forEach(([domain, keywords]) => {
    const domainPattern = new RegExp(`${domain}[^\\n]*`, 'i');
    assert.match(section, domainPattern, `Missing evaluation row for ${domain}`);

    keywords.forEach((keyword) => {
      assert.match(
        section,
        new RegExp(`${domain}[\\s\\S]*${keyword}`, 'i'),
        `Expected ${keyword} criterion for ${domain}`
      );
    });
  });
});
