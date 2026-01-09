export type AutoGradableQuestionType = 'multiple_choice' | 'true_false';

export interface AssessmentQuestionConfig {
  id: string;
  prompt?: string;
  type: string;
  options?: string[];
  correctIndex?: number | null;
}

export interface GradeAssessmentInput {
  questions: AssessmentQuestionConfig[];
  responses: Record<string, string>;
  passingScore: number;
}

export interface GradedQuestionResult {
  questionId: string;
  type: string;
  response: string | null;
  expectedAnswer: string | null;
  isCorrect: boolean | null;
  requiresManualReview: boolean;
}

export interface AssessmentGradeResult {
  totalQuestions: number;
  gradableQuestions: number;
  correctCount: number;
  incorrectCount: number;
  score: number;
  passed: boolean;
  breakdown: GradedQuestionResult[];
}

const AUTO_GRADABLE_TYPES: AutoGradableQuestionType[] = ['multiple_choice', 'true_false'];

const isGradableQuestion = (question: AssessmentQuestionConfig): question is AssessmentQuestionConfig & {
  type: AutoGradableQuestionType;
} => AUTO_GRADABLE_TYPES.includes((question.type ?? '').toLowerCase() as AutoGradableQuestionType);

const normalizeValue = (value: string | null | undefined) =>
  typeof value === 'string' ? value.trim().toLowerCase() : null;

const resolveExpectedAnswer = (question: AssessmentQuestionConfig): string | null => {
  if (typeof question.correctIndex !== 'number' || question.correctIndex < 0) {
    return null;
  }
  return question.options?.[question.correctIndex] ?? null;
};

export function gradeAssessmentResponses(input: GradeAssessmentInput): AssessmentGradeResult {
  const breakdown: GradedQuestionResult[] = [];
  let correctCount = 0;
  let incorrectCount = 0;

  input.questions.forEach((question) => {
    const response = input.responses[question.id] ?? null;

    if (!isGradableQuestion(question)) {
      breakdown.push({
        questionId: question.id,
        type: question.type,
        response,
        expectedAnswer: null,
        isCorrect: null,
        requiresManualReview: true,
      });
      return;
    }

    const expectedAnswer = resolveExpectedAnswer(question);
    if (!expectedAnswer) {
      breakdown.push({
        questionId: question.id,
        type: question.type,
        response,
        expectedAnswer: null,
        isCorrect: null,
        requiresManualReview: true,
      });
      return;
    }

    const normalizedExpected = normalizeValue(expectedAnswer);
    const normalizedResponse = normalizeValue(response);
    const isCorrect = Boolean(normalizedResponse) && normalizedExpected === normalizedResponse;
    if (isCorrect) {
      correctCount += 1;
    } else {
      incorrectCount += 1;
    }

    breakdown.push({
      questionId: question.id,
      type: question.type,
      response,
      expectedAnswer,
      isCorrect,
      requiresManualReview: false,
    });
  });

  const gradableQuestions = correctCount + incorrectCount;
  const score = gradableQuestions > 0 ? Math.round((correctCount / gradableQuestions) * 100) : 0;
  const passed = gradableQuestions > 0 ? score >= input.passingScore : false;

  return {
    totalQuestions: input.questions.length,
    gradableQuestions,
    correctCount,
    incorrectCount,
    score,
    passed,
    breakdown,
  };
}
