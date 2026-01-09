import crypto from 'node:crypto';

type InterviewDomain = 'general' | 'data' | 'creative' | 'legal';

interface InterviewQuestion {
  id: string;
  prompt: string;
  followUps?: string[];
}

interface InterviewAnswer {
  questionId: string;
  question: string;
  answer: string;
  score: number;
  feedback: string;
}

interface InterviewSessionState {
  id: string;
  workerId: string;
  domain: InterviewDomain;
  questions: InterviewQuestion[];
  currentIndex: number;
  answers: InterviewAnswer[];
  startedAt: string;
  completedAt?: string;
}

export interface InterviewQuestionResponse {
  questionId: string;
  question: string;
  progress: {
    asked: number;
    total: number;
  };
  completed: boolean;
}

export interface InterviewEvaluationResponse extends InterviewAnswer {}

export interface InterviewReport {
  sessionId: string;
  workerId: string;
  domain: InterviewDomain;
  transcript: string;
  score: number;
  answers: InterviewAnswer[];
  completedAt: string;
}

const QUESTION_BANK: Record<InterviewDomain, InterviewQuestion[]> = {
  general: [
    {
      id: 'general-icebreaker',
      prompt: 'Describe a project where you had to learn something new quickly. How did you approach it?',
      followUps: [
        'What was the most challenging aspect and how did you overcome it?',
        'How would you apply that lesson to this role?',
      ],
    },
    {
      id: 'general-collaboration',
      prompt: 'Tell me about a time you collaborated across teams. What went well and what would you change?',
    },
    {
      id: 'general-growth',
      prompt: 'What skills are you currently improving and why are they important to you?',
    },
  ],
  data: [
    {
      id: 'data-quality',
      prompt: 'How do you validate the quality of a large dataset before analysis?',
      followUps: ['Which tooling do you lean on for profiling?', 'Describe a time quality issues changed your approach.'],
    },
    {
      id: 'data-modeling',
      prompt: 'Walk me through how you would build a model to forecast worker throughput.',
    },
    {
      id: 'data-ethics',
      prompt: 'How do you mitigate bias when building automation workflows?',
    },
  ],
  creative: [
    {
      id: 'creative-brief',
      prompt: 'You are asked to craft a tone guide for a new customer. How do you gather voice & style requirements?',
    },
    {
      id: 'creative-feedback',
      prompt: 'Describe your process for incorporating editor feedback while keeping your creative voice.',
    },
    {
      id: 'creative-iteration',
      prompt: 'Share a time when iteration led to a significantly better outcome.',
    },
  ],
  legal: [
    {
      id: 'legal-research',
      prompt: 'How do you stay current on regulations that impact cross-border data work?',
    },
    {
      id: 'legal-risk',
      prompt: 'Describe a scenario where you had to escalate a potential compliance issue. What steps did you take?',
    },
    {
      id: 'legal-communication',
      prompt: 'How do you translate legal requirements into actionable guidance for non-legal teammates?',
    },
  ],
};

const DEFAULT_DOMAIN: InterviewDomain = 'general';
const sessionStore = new Map<string, InterviewSessionState>();

const resolveDomain = (domain?: string | null): InterviewDomain => {
  if (!domain) return DEFAULT_DOMAIN;
  const normalized = domain.toLowerCase();
  if (normalized in QUESTION_BANK) {
    return normalized as InterviewDomain;
  }
  return DEFAULT_DOMAIN;
};

const cloneQuestions = (domain: InterviewDomain) => QUESTION_BANK[domain].map((question) => ({ ...question }));

export async function startInterview(workerId: string, domain?: string | null) {
  if (!workerId) {
    throw new Error('startInterview requires a workerId');
  }

  const resolvedDomain = resolveDomain(domain);
  const questions = cloneQuestions(resolvedDomain);
  const sessionId = crypto.randomUUID();
  const state: InterviewSessionState = {
    id: sessionId,
    workerId,
    domain: resolvedDomain,
    questions,
    currentIndex: 0,
    answers: [],
    startedAt: new Date().toISOString(),
  };

  sessionStore.set(sessionId, state);

  return {
    sessionId,
    workerId,
    domain: resolvedDomain,
    totalQuestions: questions.length,
    startedAt: state.startedAt,
  };
}

const getSession = (sessionId: string) => {
  const session = sessionStore.get(sessionId);
  if (!session) {
    throw new Error('Interview session not found');
  }
  return session;
};

export async function askQuestion(sessionId: string): Promise<InterviewQuestionResponse> {
  const session = getSession(sessionId);
  const { questions, currentIndex } = session;

  if (currentIndex >= questions.length) {
    return {
      questionId: 'complete',
      question: 'Interview complete',
      progress: {
        asked: questions.length,
        total: questions.length,
      },
      completed: true,
    };
  }

  const question = questions[currentIndex];
  session.currentIndex += 1;

  return {
    questionId: question.id,
    question: question.prompt,
    progress: {
      asked: currentIndex + 1,
      total: questions.length,
    },
    completed: false,
  };
}

const scoreAnswer = (answer: string) => {
  if (!answer) return 1;
  const lengthScore = Math.min(5, Math.ceil(answer.trim().split(/\s+/).length / 15));
  const detailBonus = /because|therefore|however|specifically|for example/i.test(answer) ? 1 : 0;
  return Math.min(5, Math.max(1, lengthScore + detailBonus));
};

const buildFeedback = (score: number) => {
  if (score >= 5) return 'Excellent detail and structure.';
  if (score >= 4) return 'Strong answer with room for more specificity.';
  if (score >= 3) return 'Good direction. Expand on your reasoning and outcomes.';
  if (score >= 2) return 'Consider adding concrete examples and results.';
  return 'Please elaborate with more details and impact.';
};

export async function evaluateAnswer(sessionId: string, answer: string): Promise<InterviewEvaluationResponse> {
  const session = getSession(sessionId);
  const questionIndex = Math.max(0, session.currentIndex - 1);
  const question = session.questions[Math.min(questionIndex, session.questions.length - 1)];

  if (!question) {
    throw new Error('No question available to evaluate');
  }

  const score = scoreAnswer(answer);
  const feedback = buildFeedback(score);

  const entry: InterviewAnswer = {
    questionId: question.id,
    question: question.prompt,
    answer,
    score,
    feedback,
  };

  session.answers.push(entry);

  if (session.currentIndex >= session.questions.length && !session.completedAt) {
    session.completedAt = new Date().toISOString();
  }

  return entry;
}

export async function generateInterviewReport(sessionId: string): Promise<InterviewReport> {
  const session = getSession(sessionId);

  if (!session.completedAt) {
    session.completedAt = new Date().toISOString();
  }

  const totalScore = session.answers.reduce((sum, entry) => sum + entry.score, 0);
  const normalizedScore = session.answers.length ? totalScore / session.answers.length : 0;

  const transcriptLines = session.answers.map(
    (entry) => `Q: ${entry.question}\nA: ${entry.answer}\nScore: ${entry.score} – ${entry.feedback}`
  );

  return {
    sessionId: session.id,
    workerId: session.workerId,
    domain: session.domain,
    transcript: transcriptLines.join('\n\n'),
    score: Number(normalizedScore.toFixed(2)),
    answers: session.answers,
    completedAt: session.completedAt,
  };
}
