import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  getForumCategories,
  getThreadsByCategory,
  getPostsByThread,
  isModerator,
  moderateThread,
  moderatePost
} from '@/services/forumService';

interface Category {
  id: string;
  name: string;
  description: string;
  threadCount: number;
}

interface Thread {
  id: string;
  title: string;
  author: string;
  replies: number;
  upvotes: number;
  projectTag?: string | null;
  createdAt: string;
}

interface Post {
  id: string;
  threadId: string;
  author: string;
  content: string;
  createdAt: string;
  editedAt?: string | null;
}

const categoryFilters = [{ id: 'all', name: 'All Topics' }];

type ForumBoardProps = {
  testId?: string;
  heading?: string;
  subheading?: string;
  canModerate?: boolean;
};

export const ForumBoard: React.FC<ForumBoardProps> = ({
  testId = 'worker-forum-page',
  heading = 'Forum',
  subheading = 'Ask questions, share best practices, and connect with moderators.',
  canModerate: canModerateOverride,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [canModerate, setCanModerate] = useState<boolean>(Boolean(canModerateOverride));

  const loadPosts = useCallback(async (threadId: string | null) => {
    if (!threadId) {
      setPosts([]);
      return;
    }
    setPostsLoading(true);
    try {
      const data = await getPostsByThread(threadId);
      setPosts(data);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadForums = async () => {
      setThreadsLoading(true);
      try {
        const [categoriesResult, threadsResult] = await Promise.all([
          getForumCategories(),
          getThreadsByCategory(activeCategory),
        ]);
        setCategories(categoriesResult);
        setThreads(threadsResult);
        const defaultThread = threadsResult[0]?.id ?? null;
        setSelectedThreadId(defaultThread);
        await loadPosts(defaultThread ?? null);
        if (typeof canModerateOverride === 'undefined') {
          const moderatorStatus = await isModerator('mgr-001'); // mock worker id placeholder
          setCanModerate(moderatorStatus);
        }
      } finally {
        setThreadsLoading(false);
      }
    };
    loadForums().catch((error) => console.warn('ForumBoard: failed to load forums', error));
  }, [activeCategory, loadPosts]);

  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) ?? null;

  return (
    <div className="bg-background min-h-screen" data-testid={testId}>
      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Community</p>
            <h1 className="text-3xl font-bold">{heading}</h1>
            <p className="text-sm text-muted-foreground">{subheading}</p>
          </div>
          <Button size="sm" disabled>
            New thread (coming soon)
          </Button>
        </div>

        <Card data-testid="forum-category-list">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[...categoryFilters, ...categories].map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                  activeCategory === category.id ? 'border-primary bg-primary/5' : 'border-border/60'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{category.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {'description' in category
                      ? category.description
                      : 'Explore every thread across the forum.'}
                  </p>
                </div>
                {'threadCount' in category ? (
                  <Badge variant="outline">{category.threadCount} threads</Badge>
                ) : null}
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card data-testid="forum-thread-list">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Threads</CardTitle>
              <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList className="flex flex-wrap gap-2">
                  {[...categoryFilters, ...categories].map((category) => (
                    <TabsTrigger key={category.id} value={category.id} className="rounded-full px-3 py-1 text-xs">
                      {category.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {[...categoryFilters, ...categories].map((category) => (
                  <TabsContent key={category.id} value={category.id} />
                ))}
              </Tabs>
            </CardHeader>
            <CardContent className="space-y-3">
              {threadsLoading ? (
                <p className="text-sm text-muted-foreground">Loading threads…</p>
              ) : threads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No threads yet. Start the conversation!</p>
              ) : (
                threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                      selectedThreadId === thread.id ? 'border-primary bg-primary/5' : 'border-border/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{thread.title}</p>
                      {thread.projectTag ? <Badge variant="outline">{thread.projectTag}</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Posted by {thread.author} · {thread.replies} replies · {thread.upvotes} upvotes
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card data-testid="forum-thread-view">
              <CardHeader>
                <CardTitle>{selectedThread?.title ?? 'Select a thread'}</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedThread ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Posted by {selectedThread.author} on{' '}
                      {new Date(selectedThread.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      This thread supports Markdown. Use formatting for longform replies.
                    </p>
                    {canModerate ? (
                      <div className="mt-3 flex flex-wrap gap-2" data-testid="forum-thread-actions">
                        <Button size="xs" variant="outline" onClick={() => handleThreadAction(selectedThread.pinned ? 'unpin' : 'pin')}>
                          {selectedThread.pinned ? 'Unpin' : 'Pin'}
                        </Button>
                        <Button size="xs" variant="outline" onClick={() => handleThreadAction(selectedThread.locked ? 'unlock' : 'lock')}>
                          {selectedThread.locked ? 'Unlock' : 'Lock'}
                        </Button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Choose a thread from the list to view details.</p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="forum-post-list">
              <CardHeader>
                <CardTitle>Posts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {postsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading posts…</p>
                ) : posts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No replies yet. Be the first to respond.</p>
                ) : (
                  posts.map((post) => (
                    <div key={post.id} className="rounded-lg border px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{post.author}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button size="xs" variant="ghost" data-testid="forum-report-button" disabled>
                          Report
                        </Button>
                        {canModerate ? (
                          <Button size="xs" variant="destructive" onClick={() => handleDeletePost(post.id)}>
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card data-testid="forum-thread-composer">
              <CardHeader>
                <CardTitle>Reply</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea rows={4} placeholder="Supports Markdown syntax (bold, code, lists)…" disabled />
                <Button disabled>Post reply (coming soon)</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WorkerForumPage: React.FC = () => <ForumBoard />;

export default WorkerForumPage;
  const handleThreadAction = async (action: 'pin' | 'unpin' | 'lock' | 'unlock') => {
    if (!selectedThreadId) return;
    await moderateThread(selectedThreadId, action);
    setThreads((current) =>
      current.map((thread) =>
        thread.id === selectedThreadId
          ? { ...thread, pinned: action === 'pin' ? true : action === 'unpin' ? false : thread.pinned, locked: action === 'lock' ? true : action === 'unlock' ? false : thread.locked }
          : thread
      )
    );
  };

  const handleDeletePost = async (postId: string) => {
    await moderatePost(postId, 'delete');
    setPosts((current) => current.filter((post) => post.id !== postId));
  };
