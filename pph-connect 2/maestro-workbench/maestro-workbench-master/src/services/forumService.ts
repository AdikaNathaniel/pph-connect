type ForumCategory = {
  id: string;
  name: string;
  description: string;
  threadCount: number;
};

type ForumThread = {
  id: string;
  title: string;
  author: string;
  categoryId: string;
  replies: number;
  upvotes: number;
  projectTag?: string | null;
  createdAt: string;
};

const FORUM_CATEGORIES: ForumCategory[] = [
  {
    id: 'general',
    name: 'General',
    description: 'Platform-wide announcements, tips, and casual discussion.',
    threadCount: 42,
  },
  {
    id: 'projects',
    name: 'Project-specific',
    description: 'Updates and Q&A tied to individual projects.',
    threadCount: 28,
  },
  {
    id: 'training',
    name: 'Training',
    description: 'Study guides, clarifications, and shared resources for onboarding modules.',
    threadCount: 19,
  },
  {
    id: 'feedback',
    name: 'Feedback',
    description: 'Feature requests, bug reports, and policy suggestions.',
    threadCount: 33,
  },
];

const FORUM_THREADS: ForumThread[] = [
  {
    id: 'thr-001',
    title: 'Guidelines update for Project Atlas',
    author: 'Team Ops',
    categoryId: 'projects',
    replies: 12,
    upvotes: 24,
    projectTag: 'Atlas',
    createdAt: '2025-11-05T10:15:00Z',
  },
  {
    id: 'thr-002',
    title: 'Best practices for speeding up QC reviews',
    author: 'Alex G.',
    categoryId: 'training',
    replies: 7,
    upvotes: 31,
    createdAt: '2025-11-03T14:10:00Z',
  },
  {
    id: 'thr-003',
    title: 'Platform dark mode beta feedback',
    author: 'Product Team',
    categoryId: 'feedback',
    replies: 15,
    upvotes: 45,
    createdAt: '2025-11-01T08:45:00Z',
  },
];

const MODERATORS = new Set<string>(['mgr-001', 'mgr-002']);

export const getForumCategories = async (): Promise<ForumCategory[]> => FORUM_CATEGORIES;

export const getThreadsByCategory = async (categoryId: string | null): Promise<ForumThread[]> =>
  !categoryId || categoryId === 'all'
    ? FORUM_THREADS
    : FORUM_THREADS.filter((thread) => thread.categoryId === categoryId);

export const getPostsByThread = async (threadId: string | null): Promise<ForumPost[]> =>
  !threadId ? [] : FORUM_POSTS.filter((post) => post.threadId === threadId);

export const isModerator = async (workerId: string | null): Promise<boolean> =>
  Boolean(workerId && MODERATORS.has(workerId));

export const moderateThread = async (
  threadId: string,
  action: 'pin' | 'unpin' | 'lock' | 'unlock'
): Promise<void> => {
  const thread = FORUM_THREADS.find((item) => item.id === threadId);
  if (!thread) return;
  if (action === 'pin') thread.pinned = true;
  if (action === 'unpin') thread.pinned = false;
  if (action === 'lock') thread.locked = true;
  if (action === 'unlock') thread.locked = false;
};

export const moderatePost = async (postId: string, action: 'delete' | 'ban'): Promise<void> => {
  if (action === 'delete') {
    const index = FORUM_POSTS.findIndex((post) => post.id === postId);
    if (index !== -1) {
      FORUM_POSTS.splice(index, 1);
    }
  }
  // `ban` action would escalate to admin—no-op placeholder for now.
};
