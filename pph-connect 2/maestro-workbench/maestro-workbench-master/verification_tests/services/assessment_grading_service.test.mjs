import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

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

const servicePath = resolvePath('src', 'services', 'assessmentGradingService.ts');
const requireFromTest = createRequire(import.meta.url);

const loadGradingModule = () => {
  const source = readFileSync(servicePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  const module = { exports: {} };
  const context = {
    module,
    exports: module.exports,
    require: requireFromTest,
    __filename: servicePath,
    __dirname: path.dirname(servicePath),
    console,
  };
  vm.runInNewContext(outputText, context, { filename: servicePath });
  return context.module.exports;
};

test('assessmentGradingService exports gradeAssessmentResponses helper', () => {
  assert.ok(existsSync(servicePath), 'Expected assessmentGradingService.ts to exist');
  const { gradeAssessmentResponses } = loadGradingModule();
  assert.equal(typeof gradeAssessmentResponses, 'function', 'Expected gradeAssessmentResponses export');
});

test('gradeAssessmentResponses auto-scores gradable items and marks manual review', () => {
  const { gradeAssessmentResponses } = loadGradingModule();
  const result = gradeAssessmentResponses({
    passingScore: 70,
    questions: [
      {
        id: 'q1',
        prompt: 'Select the correct letter',
        type: 'multiple_choice',
        options: ['A', 'B', 'C'],
        correctIndex: 1,
      },
      {
        id: 'q2',
        prompt: 'True or false?',
        type: 'true_false',
        options: ['True', 'False'],
        correctIndex: 0,
      },
      {
        id: 'q3',
        prompt: 'Explain your reasoning',
        type: 'short_answer',
      },
    ],
    responses: {
      q1: 'b',
      q2: 'False',
      q3: 'Because it is required',
    },
  });

  assert.equal(result.totalQuestions, 3, 'Should include all questions');
  assert.equal(result.gradableQuestions, 2, 'Only multiple choice and true/false are gradable');
  assert.equal(result.correctCount, 1, 'One answer should be correct');
  assert.equal(result.incorrectCount, 1, 'One answer should be incorrect');
  assert.equal(result.score, 50, 'Score should reflect correct ratio');
  assert.equal(result.passed, false, 'Score below passing threshold should fail');

  const manualReview = result.breakdown.find((item) => item.questionId === 'q3');
  assert.ok(manualReview, 'Expected breakdown entry for q3');
  assert.equal(manualReview.requiresManualReview, true, 'Short answer requires manual review');
  assert.equal(manualReview.isCorrect, null, 'Manual review should not auto-grade correctness');
});
