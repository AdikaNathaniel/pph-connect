import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  knowledgeBaseCategories,
  knowledgeBaseArticles,
  getArticlesByCategory,
  searchArticles
} from '@/lib/knowledgeBase/structure';

export const WorkerKnowledgeBasePage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [openArticleId, setOpenArticleId] = useState<string | null>(null);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, 'yes' | 'no'>>({});

  const categoryCounts = useMemo(
    () =>
      knowledgeBaseCategories.map((category) => ({
        ...category,
        articleCount: getArticlesByCategory(category.id).length
      })),
    []
  );

  const filteredArticles = useMemo(() => {
    const baseResults = searchArticles(query);
    if (categoryFilter === 'all') {
      return baseResults;
    }
    return baseResults.filter((article) => article.categoryId === categoryFilter);
  }, [categoryFilter, query]);

  useEffect(() => {
    if (filteredArticles.length === 0) {
      setOpenArticleId(null);
      return;
    }
    if (!openArticleId || !filteredArticles.some((article) => article.id === openArticleId)) {
      setOpenArticleId(filteredArticles[0].id);
    }
  }, [filteredArticles, openArticleId]);

  const openArticle =
    filteredArticles.find((article) => article.id === openArticleId) ?? filteredArticles[0] ?? null;

  const relatedArticles = useMemo(() => {
    if (!openArticle) {
      return [];
    }
    const primaryMatches = knowledgeBaseArticles.filter(
      (article) => article.categoryId === openArticle.categoryId && article.id !== openArticle.id
    );
    const fallbackMatches = knowledgeBaseArticles.filter((article) => article.id !== openArticle.id);
    const candidates = primaryMatches.length > 0 ? primaryMatches : fallbackMatches;
    return candidates.slice(0, 3);
  }, [openArticle]);

  const helpfulChoice = openArticle ? helpfulVotes[openArticle.id] : undefined;

  const handleHelpfulFeedback = (articleId: string, response: 'yes' | 'no') => {
    setHelpfulVotes((current) => ({
      ...current,
      [articleId]: response
    }));
  };

  return (
    <div className="bg-background min-h-screen" data-testid="worker-kb-page">
      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Help center</p>
            <h1 className="text-3xl font-bold">Knowledge Base</h1>
            <p className="text-sm text-muted-foreground">Browse documentation or search for answers.</p>
          </div>
          <Input
            data-testid="kb-search-input"
            placeholder="Search articles"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="max-w-sm"
          />
        </div>

        <Card data-testid="kb-category-grid">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {categoryCounts.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`rounded-lg border px-4 py-3 text-left transition hover:border-primary ${
                  categoryFilter === category.id ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setCategoryFilter((current) => (current === category.id ? 'all' : category.id))}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{category.name}</p>
                  <Badge variant="outline">
                    {category.articleCount === 1 ? '1 article' : `${category.articleCount} articles`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card data-testid="kb-article-list">
          <CardHeader>
            <CardTitle>Articles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No articles match your search.</p>
            ) : (
              filteredArticles.map((article) => (
                <button
                  key={article.id}
                  type="button"
                  className={`w-full rounded-lg border px-4 py-3 text-left transition hover:border-primary ${
                    openArticle?.id === article.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setOpenArticleId(article.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{article.title}</p>
                      <p className="text-xs text-muted-foreground">{article.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {knowledgeBaseCategories.find((category) => category.id === article.categoryId)?.name}
                      </p>
                    </div>
                    <Badge variant="secondary">{article.views} views</Badge>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {openArticle ? (
          <>
            <Card data-testid="kb-article-content">
              <CardHeader>
                <CardTitle>{openArticle.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{openArticle.summary}</p>
                <div className="rounded-md border bg-muted/40 p-4">
                  <pre className="whitespace-pre-wrap text-sm text-foreground">{openArticle.content}</pre>
                </div>
                <div className="flex flex-wrap gap-2">
                  {openArticle.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div
                  className="rounded-md border bg-muted/30 p-4"
                  data-testid="kb-helpful-feedback"
                >
                  <p className="text-sm font-medium text-foreground">Was this helpful?</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className={`rounded-md border px-3 py-1 text-sm transition ${
                        helpfulChoice === 'yes' ? 'border-primary bg-primary/10 text-primary' : 'hover:border-primary'
                      }`}
                      onClick={() => handleHelpfulFeedback(openArticle.id, 'yes')}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={`rounded-md border px-3 py-1 text-sm transition ${
                        helpfulChoice === 'no' ? 'border-destructive bg-destructive/10 text-destructive' : 'hover:border-destructive'
                      }`}
                      onClick={() => handleHelpfulFeedback(openArticle.id, 'no')}
                    >
                      Not really
                    </button>
                  </div>
                  {helpfulChoice ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {helpfulChoice === 'yes'
                        ? 'Thanks! Your vote helps us highlight the right docs.'
                        : 'Thanks for the feedback. We will expand this article soon.'}
                    </p>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last updated {new Date(openArticle.updatedAt).toLocaleDateString()} • {openArticle.helpfulCount}{' '}
                  workers marked this helpful
                </p>
              </CardContent>
            </Card>

            {relatedArticles.length > 0 ? (
              <Card data-testid="kb-related-articles">
                <CardHeader>
                  <CardTitle>Related articles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {relatedArticles.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      className="w-full rounded-md border px-3 py-2 text-left transition hover:border-primary"
                      onClick={() => setOpenArticleId(article.id)}
                    >
                      <p className="text-sm font-medium text-foreground">{article.title}</p>
                      <p className="text-xs text-muted-foreground">{article.summary}</p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default WorkerKnowledgeBasePage;
