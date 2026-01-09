import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { knowledgeBaseCategories } from '@/lib/knowledgeBase/structure';
import {
  createKnowledgeBaseArticle,
  fetchKnowledgeBaseVersions,
  KNOWLEDGE_BASE_STATUSES,
  KnowledgeBaseArticleStatus,
  KnowledgeBaseVersionRecord,
  uploadKnowledgeBaseAsset
} from '@/services/knowledgeBaseService';
import RichTextEditor from '@/components/messaging/RichTextEditor';
import { useAuth } from '@/contexts/AuthContext';

type UploadedAsset = {
  id: string;
  name: string;
  url: string | null;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

const DEFAULT_CONTENT = '<p>Start documenting best practices, troubleshooting steps, or policy updates.</p>';

const formatBytes = (value: number) => {
  if (value === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(value) / Math.log(k));
  return `${(value / k ** i).toFixed(1)} ${sizes[i]}`;
};

const defaultCategoryId = knowledgeBaseCategories[0]?.id ?? 'getting-started';

export const ManagerKnowledgeBaseAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [status, setStatus] = useState<KnowledgeBaseArticleStatus>('draft');
  const [tags, setTags] = useState('');
  const [attachments, setAttachments] = useState<UploadedAsset[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [versions, setVersions] = useState<KnowledgeBaseVersionRecord[]>([]);

  const categoryOptions = useMemo(
    () => knowledgeBaseCategories.map((category) => ({ id: category.id, name: category.name })),
    []
  );

  const refreshVersions = useCallback(async (articleId: string | null) => {
    const records = await fetchKnowledgeBaseVersions(articleId);
    setVersions(records);
  }, []);

  useEffect(() => {
    refreshVersions(activeArticleId);
  }, [activeArticleId, refreshVersions]);

  const handleAttachmentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const uploads = await Promise.all(
        files.map(async (file) => {
          const upload = await uploadKnowledgeBaseAsset(file, { articleId: activeArticleId });
          return {
            id: crypto.randomUUID(),
            name: file.name,
            url: upload.publicUrl,
            mimeType: upload.mimeType,
            size: upload.size,
            uploadedAt: new Date().toISOString(),
          };
        })
      );

      setAttachments((prev) => [...uploads, ...prev]);
      toast.success(`${uploads.length} attachment${uploads.length > 1 ? 's' : ''} uploaded`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload attachment';
      toast.error(message);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleSave = async (nextStatus: KnowledgeBaseArticleStatus) => {
    if (!user?.id) {
      toast.error('You must be signed in to manage articles.');
      return;
    }

    if (!title.trim()) {
      toast.error('Title is required.');
      return;
    }

    setIsSaving(true);
    try {
      const tagList = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      const savedArticle = await createKnowledgeBaseArticle({
        articleId: activeArticleId,
        title,
        summary,
        categoryId,
        content,
        status: nextStatus,
        authorId: user.id,
        tags: tagList,
      });

      setActiveArticleId(savedArticle.id);
      await refreshVersions(savedArticle.id);

      toast.success(nextStatus === 'published' ? 'Article published' : 'Draft saved');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save article';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="kb-admin-page">
        <div>
          <p className="text-sm text-muted-foreground">Knowledge Base</p>
          <h1 className="text-3xl font-bold">Create or update articles</h1>
          <p className="text-sm text-muted-foreground">
            Capture institutional knowledge with rich media, staging drafts before publishing to workers.
          </p>
        </div>

      <Card data-testid="kb-admin-form">
          <CardHeader>
            <CardTitle>Article details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="kb-title">Title</Label>
                <Input
                  id="kb-title"
                  placeholder="Example: Resolve payment holds in Stripe"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kb-category">Category</Label>
                <Select value={categoryId} onValueChange={(value) => setCategoryId(value)}>
                  <SelectTrigger id="kb-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kb-summary">Summary</Label>
              <Textarea
                id="kb-summary"
                placeholder="Provide a quick overview visible in the article list."
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <Input
                placeholder="Separate tags with commas (e.g., payouts, compliance, payments)"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
              />
            </div>

            <div className="space-y-2" data-testid="kb-admin-status-select">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value: KnowledgeBaseArticleStatus) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {KNOWLEDGE_BASE_STATUSES.map((statusOption) => (
                    <SelectItem key={statusOption} value={statusOption}>
                      {statusOption === 'draft' ? 'Draft' : 'Published'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2" data-testid="kb-admin-editor">
              <Label>Content</Label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Write onboarding steps, escalation paths, or policy references…"
              />
            </div>

            <div className="space-y-2" data-testid="kb-admin-attachments">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Attachments</Label>
                  <p className="text-xs text-muted-foreground">Upload images or videos referenced in the article.</p>
                </div>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleAttachmentUpload}
                  disabled={isUploading}
                />
              </div>
              {attachments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No attachments uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{asset.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {asset.mimeType} • {formatBytes(asset.size)} • Uploaded{' '}
                          {new Date(asset.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline">{asset.url ? 'Ready' : 'Processing'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => handleSave('draft')}
              >
                Save draft
              </Button>
              <Button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave('published')}
              >
                Publish article
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="kb-admin-version-history">
          <CardHeader>
            <CardTitle>Version history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Once you save a draft we will track versions here.</p>
            ) : (
              versions.map((version) => (
                <div
                  key={version.id}
                  className="rounded-md border px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{version.versionLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {version.summary || 'No summary provided'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={version.status === 'published' ? 'default' : 'outline'}>
                        {version.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(version.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Editor: {version.editor || 'Unknown'}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
    </div>
  );
};

export default ManagerKnowledgeBaseAdminPage;
