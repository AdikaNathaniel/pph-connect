import { supabase } from '@/integrations/supabase/client';
import { normalizeError } from '@/lib/errors';

export type KnowledgeBaseArticleStatus = 'draft' | 'published';

export const KNOWLEDGE_BASE_STATUSES: KnowledgeBaseArticleStatus[] = ['draft', 'published'];

export type KnowledgeBaseArticleInput = {
  articleId?: string | null;
  title: string;
  categoryId: string;
  summary: string;
  content: string;
  status: KnowledgeBaseArticleStatus;
  authorId: string;
  tags?: string[];
};

export type KnowledgeBaseVersionRecord = {
  id: string;
  versionLabel: string;
  status: KnowledgeBaseArticleStatus;
  editor: string;
  updatedAt: string;
  summary: string;
};

export type KnowledgeBaseAssetUploadResult = {
  path: string;
  publicUrl: string | null;
  mimeType: string;
  size: number;
};

const KB_BUCKET = 'kb-assets';

export async function createKnowledgeBaseArticle(input: KnowledgeBaseArticleInput) {
  const { articleId = null, title, categoryId, summary, content, status, authorId, tags = [] } = input;

  const payload = {
    title,
    category_id: categoryId,
    summary,
    content,
    status,
    author_id: authorId,
    tags,
  };

  const mutation = articleId
    ? supabase.from('kb_articles').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', articleId)
    : supabase.from('kb_articles').insert(payload);

  const { data, error } = await mutation.select('id, title, status, summary, updated_at').single();

  if (error) {
    throw new Error(`Failed to save article: ${error.message}`);
  }

  return data;
}

export async function uploadKnowledgeBaseAsset(
  file: File | Blob,
  options: { articleId?: string | null } = {}
): Promise<KnowledgeBaseAssetUploadResult> {
  const fileName = (file as File)?.name ?? 'kb-asset.bin';
  const sanitizedName = fileName.replace(/\s+/g, '-').toLowerCase();
  const storagePath = `${options.articleId ?? 'drafts'}/${Date.now()}-${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from(KB_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: (file as File)?.type ?? 'application/octet-stream',
    });

  if (error) {
    throw new Error(`Failed to upload asset: ${normalizeError(error)}`);
  }

  const { data: publicData } = supabase.storage.from(KB_BUCKET).getPublicUrl(data.path);

  return {
    path: data.path,
    publicUrl: publicData?.publicUrl ?? null,
    mimeType: (file as File)?.type ?? 'application/octet-stream',
    size: (file as File)?.size ?? 0,
  };
}

export async function fetchKnowledgeBaseVersions(
  articleId: string | null
): Promise<KnowledgeBaseVersionRecord[]> {
  if (!articleId) {
    return [
      {
        id: 'draft-placeholder',
        versionLabel: 'Draft created',
        status: 'draft',
        editor: 'system',
        updatedAt: new Date().toISOString(),
        summary: 'Initial draft not yet saved.',
      },
    ];
  }

  const { data, error } = await supabase
    .from('kb_articles')
    .select('id, title, status, summary, updated_at, author_id')
    .eq('id', articleId)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (error) {
    console.warn('knowledgeBaseService: failed to fetch versions', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [
      {
        id: `${articleId}-draft`,
        versionLabel: 'Draft saved',
        status: 'draft',
        editor: 'system',
        updatedAt: new Date().toISOString(),
        summary: 'Draft stored without revision metadata.',
      },
    ];
  }

  return data.map((row, index) => ({
    id: `${row.id}-v${index + 1}`,
    versionLabel: index === 0 ? 'Latest revision' : `Revision ${index + 1}`,
    status: (row.status ?? 'draft') as KnowledgeBaseArticleStatus,
    editor: row.author_id ?? 'unknown',
    updatedAt: row.updated_at,
    summary: row.summary ?? row.title ?? '',
  }));
}
