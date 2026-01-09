export type KnowledgeBaseCategory = {
  id: string;
  name: string;
  description: string;
  icon?: string;
};

export type KnowledgeBaseArticle = {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  updatedAt: string;
  views: number;
  helpfulCount: number;
};

export const knowledgeBaseCategories: KnowledgeBaseCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Onboarding, access, and first-day guides.',
  },
  {
    id: 'best-practices',
    name: 'Best Practices',
    description: 'Productivity tips and workflow guidance.',
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    description: 'Resolve common errors and issues.',
  },
  {
    id: 'policies',
    name: 'Policies',
    description: 'Compliance, privacy, and operational policies.',
  },
];

export const knowledgeBaseArticles: KnowledgeBaseArticle[] = [
  {
    id: 'kb-getting-started-duo',
    categoryId: 'getting-started',
    title: 'Enable Duo Multi-Factor Authentication',
    summary: 'Secure your workspace access with Duo MFA before first login.',
    content: `## Duo Setup Checklist

1. Visit **settings.pphconnect.com/security**.
2. Scan the QR code with the Duo mobile app.
3. Confirm the test push notification.

> Need help? Submit a ticket with subject \`MFA\` and include a screenshot of the error message.`,
    tags: ['security', 'onboarding', 'access'],
    updatedAt: '2025-11-20T08:00:00Z',
    views: 210,
    helpfulCount: 37,
  },
  {
    id: 'kb-best-practices-qa-checklist',
    categoryId: 'best-practices',
    title: 'QA Checklist for Daily Launch',
    summary: 'A five-step review to keep rejection rates below 2%.',
    content: `### Daily QA Ritual

- **Warm up**: annotate two low-stakes tasks to calibrate.
- **Cross-check**: compare your approach with the gold sample.
- **Log edge cases**: capture examples in the forum thread.

Remember: consistency beats speed.`,
    tags: ['quality', 'workflow'],
    updatedAt: '2025-11-21T10:30:00Z',
    views: 145,
    helpfulCount: 28,
  },
  {
    id: 'kb-troubleshooting-audio-upload',
    categoryId: 'troubleshooting',
    title: 'Resolve Audio Upload Errors',
    summary: 'Steps to fix stalled or corrupted audio uploads.',
    content: `### Common Causes

1. **Browser cache** — clear and retry.
2. **Chunk mismatch** — rename files without spaces.
3. **Latency spike** — pause other uploads for 60 seconds.

If the waveform never renders, open DevTools and capture the console log.`,
    tags: ['audio', 'upload', 'errors'],
    updatedAt: '2025-11-19T13:15:00Z',
    views: 302,
    helpfulCount: 55,
  },
  {
    id: 'kb-policies-data-handling',
    categoryId: 'policies',
    title: 'Data Handling & Storage Policies',
    summary: 'Understand encryption, retention, and approved tooling.',
    content: `### Core Requirements

- Store work artifacts only in **PPH-approved** drives.
- Delete local files within 24 hours of task completion.
- Report accidental exposure via the **Compliance** ticket form.

> Non-compliance may pause worker access.`,
    tags: ['security', 'policy'],
    updatedAt: '2025-11-18T09:50:00Z',
    views: 90,
    helpfulCount: 19,
  },
];

export const knowledgeBaseCategoryMap = new Map(
  knowledgeBaseCategories.map((category) => [category.id, category] as const)
);

export function getCategoryById(categoryId: string): KnowledgeBaseCategory | undefined {
  return knowledgeBaseCategoryMap.get(categoryId);
}

export function getArticlesByCategory(categoryId: string): KnowledgeBaseArticle[] {
  return knowledgeBaseArticles.filter((article) => article.categoryId === categoryId);
}

export function searchArticles(query: string): KnowledgeBaseArticle[] {
  if (!query.trim()) {
    return knowledgeBaseArticles;
  }
  const normalized = query.toLowerCase();
  return knowledgeBaseArticles.filter((article) => {
    return (
      article.title.toLowerCase().includes(normalized) ||
      article.summary.toLowerCase().includes(normalized) ||
      article.tags.some((tag) => tag.toLowerCase().includes(normalized))
    );
  });
}
