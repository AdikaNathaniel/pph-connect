import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'
import { google, drive_v3 } from 'npm:googleapis@129.0.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const AUDIO_BUCKET = 'audio-assets'
const STORAGE_PREFIX = 'audio-projects'
const GOOGLE_SERVICE_ACCOUNT_EMAIL = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')!
const GOOGLE_PRIVATE_KEY = Deno.env.get('GOOGLE_PRIVATE_KEY')!.replace(/\\n/g, '\n')

type ProcessResult = {
  fileId: string
  fileName: string
  status: 'ready' | 'failed'
  message?: string
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const auth = new google.auth.JWT({
  email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: GOOGLE_PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
})

const drive = google.drive({ version: 'v3', auth })

const MAX_RUNTIME_MS = 54_000

function sanitizeFileName(name: string, fallback: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (base.length === 0) {
    return `${fallback}.wav`
  }
  return base
}

async function computeSha256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function buildStoragePath(projectId: string, fileId: string, fileName: string, rowIndex: number) {
  const safeName = sanitizeFileName(fileName, `audio-${rowIndex}`)
  const prefix = fileId.substring(0, 8)
  return `${STORAGE_PREFIX}/${projectId}/${prefix}-${safeName}`
}

async function upsertAudioAsset(
  projectId: string,
  file: drive_v3.Schema$File,
  storagePath: string,
  status: 'queued' | 'transferring' | 'ready' | 'failed',
  overrides: Partial<{
    checksum: string | null
    sizeBytes: number | null
    error: string | null
    ingestedAt: string | null
    publicUrl: string
  }> = {}
) {
  const { data: publicUrlData } = supabaseAdmin.storage
    .from(AUDIO_BUCKET)
    .getPublicUrl(storagePath)

  const upsertPayload = {
    project_id: projectId,
    drive_file_id: file.id ?? '',
    drive_file_name: file.name ?? file.id ?? 'untitled',
    storage_path: storagePath,
    public_url: overrides.publicUrl ?? publicUrlData.publicUrl,
    mime_type: file.mimeType ?? 'audio/mpeg',
    size_bytes: overrides.sizeBytes ?? (file.size ? Number(file.size) : null),
    checksum: overrides.checksum ?? null,
    status,
    error_message: overrides.error ?? null,
    ingested_at: overrides.ingestedAt ?? null,
  }

  const { data, error } = await supabaseAdmin
    .from('audio_assets')
    .upsert(upsertPayload, { onConflict: 'project_id,drive_file_id' })
    .select('id, ingested_at')
    .single()

  if (error) {
    throw error
  }

  return data
}

async function ensureQuestionForAsset(options: {
  projectId: string
  projectName: string
  replicationCount: number
  assetId: string
  storagePath: string
  publicUrl: string
  checksum: string
  driveFileId: string
  driveFileName: string
  mimeType: string
  rowIndex: number
  sizeBytes: number | null
}) {
  const {
    projectId,
    projectName,
    replicationCount,
    assetId,
    storagePath,
    publicUrl,
    checksum,
    driveFileId,
    driveFileName,
    mimeType,
    rowIndex,
    sizeBytes,
  } = options

  const questionData = {
    audio_file: driveFileName,
    drive_file_id: driveFileId,
    mime_type: mimeType,
    supabase_audio_path: storagePath,
    supabase_public_url: publicUrl,
    checksum,
    size_bytes: sizeBytes,
  }

  const { data: existingQuestion, error: questionLookupError } = await supabaseAdmin
    .from('questions')
    .select('id, question_id, row_index, data, required_replications, completed_replications')
    .eq('project_id', projectId)
    .eq('audio_asset_id', assetId)
    .maybeSingle()

  if (questionLookupError) {
    throw questionLookupError
  }

  if (!existingQuestion) {
    const { data: byDrive } = await supabaseAdmin
      .from('questions')
      .select('id, question_id')
      .eq('project_id', projectId)
      .eq('data->>drive_file_id', driveFileId)
      .maybeSingle()

    if (!byDrive) {
      const { data: generatedQuestionId, error: idError } = await supabaseAdmin.rpc(
        'generate_question_id',
        { project_name: projectName },
      )

      if (idError || !generatedQuestionId) {
        throw idError ?? new Error('Failed to generate question id')
      }

      const insertPayload = {
        project_id: projectId,
        question_id: generatedQuestionId as string,
        row_index: rowIndex,
        data: questionData,
        required_replications: replicationCount,
        completed_replications: 0,
        is_answered: false,
        audio_asset_id: assetId,
        supabase_audio_path: storagePath,
      }

      const { data: insertedQuestion, error: insertError } = await supabaseAdmin
        .from('questions')
        .insert(insertPayload)
        .select('id, question_id')
        .single()

      if (insertError || !insertedQuestion) {
        throw insertError ?? new Error('Failed to insert question for audio asset')
      }

      await supabaseAdmin
        .from('question_asset_status')
        .upsert(
          {
            project_id: projectId,
            question_uuid: insertedQuestion.id,
            question_id: insertedQuestion.question_id,
            replication_index: rowIndex,
            asset_source_id: driveFileId,
            audio_asset_id: assetId,
            supabase_audio_path: storagePath,
            metadata: questionData,
            current_status: 'pending',
          },
          { onConflict: 'question_uuid' },
        )
      return
    }

    const { error: updateExisting } = await supabaseAdmin
      .from('questions')
      .update({
        row_index: rowIndex,
        data: questionData,
        audio_asset_id: assetId,
        supabase_audio_path: storagePath,
        required_replications: replicationCount,
      })
      .eq('id', byDrive.id)

    if (updateExisting) {
      throw updateExisting
    }

    await supabaseAdmin
      .from('question_asset_status')
      .update({
        asset_source_id: driveFileId,
        audio_asset_id: assetId,
        supabase_audio_path: storagePath,
        metadata: questionData,
      })
      .eq('question_uuid', byDrive.id)

    return
  }

  const mergedData = {
    ...(existingQuestion.data as Record<string, unknown>),
    ...questionData,
  }

  const { error: updateQuestionError } = await supabaseAdmin
    .from('questions')
    .update({
      row_index: rowIndex,
      data: mergedData,
      audio_asset_id: assetId,
      supabase_audio_path: storagePath,
      required_replications: replicationCount,
    })
    .eq('id', existingQuestion.id)

  if (updateQuestionError) {
    throw updateQuestionError
  }

  await supabaseAdmin
    .from('question_asset_status')
    .update({
      asset_source_id: driveFileId,
      audio_asset_id: assetId,
      supabase_audio_path: storagePath,
      metadata: mergedData,
    })
    .eq('question_uuid', existingQuestion.id)
}

async function recordEvent(params: {
  projectId: string
  audioAssetId?: string | null
  driveFileId?: string | null
  eventType: string
  message?: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    await supabaseAdmin.from('audio_asset_events').insert({
      project_id: params.projectId,
      audio_asset_id: params.audioAssetId ?? null,
      drive_file_id: params.driveFileId ?? null,
      event_type: params.eventType,
      message: params.message ?? null,
      metadata: params.metadata ?? {},
    })
  } catch (eventError) {
    console.error('Failed to record audio asset event', eventError)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const body = await req.json().catch(() => ({}))
    const projectId = body?.projectId as string | undefined
    const batchSizeRaw = Number(body?.batchSize)
    const batchSize = Number.isFinite(batchSizeRaw) && batchSizeRaw > 0 ? Math.min(Math.floor(batchSizeRaw), 25) : 10

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, name, google_sheet_url, replications_per_question, total_tasks, completed_tasks, import_started_at')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      throw projectError ?? new Error('Project not found')
    }

    const folderMatch = project.google_sheet_url.match(/folders\/([a-zA-Z0-9-_]+)/)
    if (!folderMatch) {
      throw new Error('Project is not configured with a Google Drive folder URL')
    }

    const folderId = folderMatch[1]
    const listParams: drive_v3.Params$Resource$Files$List = {
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, size)',
      orderBy: 'name',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    }

    const folderMetadata = await drive.files.get({
      fileId: folderId,
      fields: 'id, driveId',
      supportsAllDrives: true,
    })

    if (folderMetadata.data?.driveId) {
      listParams.corpora = 'drive'
      listParams.driveId = folderMetadata.data.driveId
    } else {
      listParams.corpora = 'user'
    }

    const allFiles: drive_v3.Schema$File[] = []
    let nextPageToken: string | undefined | null = undefined

    do {
      const response = await drive.files.list({
        ...listParams,
        pageToken: nextPageToken ?? undefined,
        pageSize: 1000,
      })
      if (response.data.files) {
        allFiles.push(...response.data.files)
      }
      nextPageToken = response.data.nextPageToken
    } while (nextPageToken)
    const audioFiles = allFiles
      .filter((file) => {
        const name = file.name?.toLowerCase() ?? ''
        const mime = file.mimeType?.toLowerCase() ?? ''
        return (
          mime.includes('audio/') ||
          name.endsWith('.mp3') ||
          name.endsWith('.wav') ||
          name.endsWith('.m4a') ||
          name.endsWith('.aac') ||
          name.endsWith('.ogg') ||
          name.endsWith('.webm')
        )
      })
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { numeric: true }))

    const totalFiles = audioFiles.length

    if (totalFiles === 0) {
      await supabaseAdmin
        .from('projects')
        .update({
          status: 'ready',
          import_expected_assets: 0,
          import_ready_assets: 0,
          import_failed_assets: 0,
          import_started_at: project.import_started_at ?? new Date().toISOString(),
          import_last_updated: new Date().toISOString(),
        })
        .eq('id', projectId)

      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          readyCount: 0,
          failedCount: 0,
          pendingCount: 0,
          total: 0,
          hasMore: false,
          results: [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    await supabaseAdmin
      .from('projects')
      .update({
        status: 'importing',
        import_expected_assets: totalFiles,
        import_started_at: project.import_started_at ?? new Date().toISOString(),
        import_last_updated: new Date().toISOString(),
      })
      .eq('id', projectId)

    const fileIndexMap = new Map<string, number>()
    const validDriveIds = new Set<string>()
    audioFiles.forEach((file, index) => {
      if (file.id) {
        fileIndexMap.set(file.id, index)
        validDriveIds.add(file.id)
      }
    })

    type AssetRecord = {
      id: string
      status: string
      storage_path: string
      public_url: string
      mime_type: string | null
      size_bytes: number | null
      checksum: string | null
    }

    type QuestionRecord = {
      id: string
      audio_asset_id: string | null
      data: Record<string, unknown> | null
      row_index: number | null
      created_at: string | null
    }

    type QuestionScore = {
      missingAssetPenalty: number
      rowDelta: number
      createdAt: string
    }

    const { data: existingAssets, error: existingAssetsError } = await supabaseAdmin
      .from('audio_assets')
      .select('id, drive_file_id, status, storage_path, public_url, mime_type, size_bytes, checksum')
      .eq('project_id', projectId)

    if (existingAssetsError) {
      throw existingAssetsError
    }

    const assetMap = new Map<string, AssetRecord>()
    existingAssets?.forEach((asset) => {
      if (asset.drive_file_id && asset.id) {
        assetMap.set(asset.drive_file_id, {
          id: asset.id,
          status: asset.status ?? 'queued',
          storage_path: asset.storage_path ?? '',
          public_url: asset.public_url ?? '',
          mime_type: asset.mime_type ?? null,
          size_bytes: asset.size_bytes ?? null,
          checksum: asset.checksum ?? null,
        })
      }
    })

    const orphanAssets = (existingAssets ?? []).filter(
      (asset): asset is typeof asset & { drive_file_id: string; storage_path: string | null } =>
        Boolean(asset.drive_file_id) && !validDriveIds.has(asset.drive_file_id as string),
    )

    if (orphanAssets.length > 0) {
      const orphanAssetIds = orphanAssets.map((asset) => asset.id).filter((id): id is string => Boolean(id))
      const orphanPaths = orphanAssets
        .map((asset) => asset.storage_path ?? '')
        .filter((path) => typeof path === 'string' && path.length > 0)

      if (orphanAssetIds.length > 0) {
        const { error: deleteOrphanQuestionsError } = await supabaseAdmin
          .from('questions')
          .delete()
          .in('audio_asset_id', orphanAssetIds)

        if (deleteOrphanQuestionsError) {
          throw deleteOrphanQuestionsError
        }

        const { error: deleteOrphanAssetsError } = await supabaseAdmin
          .from('audio_assets')
          .delete()
          .in('id', orphanAssetIds)

        if (deleteOrphanAssetsError) {
          throw deleteOrphanAssetsError
        }
      }

      if (orphanPaths.length > 0) {
        const { error: removeStorageError } = await supabaseAdmin.storage.from(AUDIO_BUCKET).remove(orphanPaths)
        if (removeStorageError) {
          console.warn('Failed to remove orphaned storage objects', removeStorageError)
        }
      }

      orphanAssets.forEach((asset) => {
        if (asset.drive_file_id) {
          assetMap.delete(asset.drive_file_id)
        }
      })
    }

    const { data: existingQuestions, error: existingQuestionsError } = await supabaseAdmin
      .from('questions')
      .select('id, audio_asset_id, data, row_index, created_at')
      .eq('project_id', projectId)

    if (existingQuestionsError) {
      throw existingQuestionsError
    }

    const questionsToDelete = new Set<string>()
    const seenQuestions = new Map<string, { question: QuestionRecord; score: QuestionScore }>()

    const computeScore = (question: QuestionRecord, driveFileId: string): QuestionScore => {
      const expectedRowIndex = (fileIndexMap.get(driveFileId) ?? 0) + 1
      const actualRowIndex =
        typeof question.row_index === 'number' && Number.isFinite(question.row_index)
          ? question.row_index
          : expectedRowIndex

      return {
        missingAssetPenalty: question.audio_asset_id ? 0 : 1,
        rowDelta: Math.abs(actualRowIndex - expectedRowIndex),
        createdAt: question.created_at ?? '',
      }
    }

    const isCandidateBetter = (candidate: QuestionScore, existing: QuestionScore) => {
      if (candidate.missingAssetPenalty !== existing.missingAssetPenalty) {
        return candidate.missingAssetPenalty < existing.missingAssetPenalty
      }
      if (candidate.rowDelta !== existing.rowDelta) {
        return candidate.rowDelta < existing.rowDelta
      }
      return candidate.createdAt < existing.createdAt
    }

    for (const rawQuestion of existingQuestions ?? []) {
      const question = rawQuestion as QuestionRecord
      const metadata = (question.data ?? {}) as Record<string, unknown>
      const driveFileId = typeof metadata.drive_file_id === 'string' ? metadata.drive_file_id : null

      if (!driveFileId || !validDriveIds.has(driveFileId)) {
        questionsToDelete.add(question.id)
        continue
      }

      const score = computeScore(question, driveFileId)
      const existing = seenQuestions.get(driveFileId)

      if (!existing) {
        seenQuestions.set(driveFileId, { question, score })
        continue
      }

      if (isCandidateBetter(score, existing.score)) {
        questionsToDelete.add(existing.question.id)
        seenQuestions.set(driveFileId, { question, score })
      } else {
        questionsToDelete.add(question.id)
      }
    }

    if (questionsToDelete.size > 0) {
      const identifiers = Array.from(questionsToDelete)
      const { error: deleteDuplicatesError } = await supabaseAdmin
        .from('questions')
        .delete()
        .in('id', identifiers)

      if (deleteDuplicatesError) {
        throw deleteDuplicatesError
      }
    }

    const queueUpserts: {
      project_id: string
      drive_file_id: string
      drive_file_name: string
      storage_path: string
      public_url: string
      mime_type: string
      size_bytes: number | null
      checksum: string | null
      status: 'queued'
      error_message: null
      ingested_at: null
    }[] = []

    for (const file of audioFiles) {
      if (!file.id) continue
      if (assetMap.has(file.id)) continue

      const fileName = file.name ?? file.id
      const globalIndex = fileIndexMap.get(file.id) ?? queueUpserts.length
      const rowIndex = globalIndex + 1
      const storagePath = buildStoragePath(projectId, file.id, fileName, rowIndex)
      const { data: urlData } = supabaseAdmin.storage.from(AUDIO_BUCKET).getPublicUrl(storagePath)

      queueUpserts.push({
        project_id: projectId,
        drive_file_id: file.id,
        drive_file_name: fileName,
        storage_path,
        public_url: urlData.publicUrl,
        mime_type: file.mimeType ?? 'audio/mpeg',
        size_bytes: file.size ? Number(file.size) : null,
        checksum: null,
        status: 'queued',
        error_message: null,
        ingested_at: null,
      })
    }

    if (queueUpserts.length > 0) {
      const { data: queuedAssets, error: queueError } = await supabaseAdmin
        .from('audio_assets')
        .upsert(queueUpserts, { onConflict: 'project_id,drive_file_id' })
        .select('id, drive_file_id, status, storage_path, public_url, mime_type, size_bytes, checksum')

      if (queueError) {
        throw queueError
      }

      queuedAssets?.forEach((asset) => {
        if (asset.drive_file_id && asset.id) {
          assetMap.set(asset.drive_file_id, {
            id: asset.id,
            status: asset.status ?? 'queued',
            storage_path: asset.storage_path ?? '',
            public_url: asset.public_url ?? '',
            mime_type: asset.mime_type ?? null,
            size_bytes: asset.size_bytes ?? null,
            checksum: asset.checksum ?? null,
          })
        }
      })
    }

    const results: ProcessResult[] = []
    const startTime = Date.now()
    let timedOut = false
    const failedThisRun = new Set<string>()

    const shouldContinue = () => Date.now() - startTime < MAX_RUNTIME_MS

    while (shouldContinue()) {
      const pendingFiles = audioFiles.filter((file) => {
        if (!file.id) return false
        if (failedThisRun.has(file.id)) return false
        const asset = assetMap.get(file.id)
        if (!asset) return true
        return asset.status !== 'ready'
      })

      if (pendingFiles.length === 0) {
        break
      }

      const batch = pendingFiles.slice(0, batchSize)

      for (const file of batch) {
        if (!shouldContinue()) {
          timedOut = true
          break
        }

        const fileId = file.id
        if (!fileId) {
          continue
        }
        const fileName = file.name ?? fileId
        const existingAsset = assetMap.get(fileId) ?? null
        const globalIndex = fileIndexMap.get(fileId) ?? results.length
        const rowIndex = globalIndex + 1
        const storagePath = buildStoragePath(projectId, fileId, fileName, rowIndex)

        let assetId: string | null = existingAsset?.id ?? null

        try {
          await recordEvent({
            projectId,
            audioAssetId: existingAsset?.id ?? null,
            driveFileId: fileId,
            eventType: 'transferring',
            message: 'Copying file from Drive',
          })

          const upsertedAsset = await upsertAudioAsset(projectId, file, storagePath, 'transferring')

          assetId = upsertedAsset?.id ?? existingAsset?.id ?? assetId
          if (assetId) {
            assetMap.set(fileId, {
              id: assetId,
              status: 'transferring',
              storage_path: storagePath,
              public_url: existingAsset?.public_url ?? '',
              mime_type: existingAsset?.mime_type ?? file.mimeType ?? 'audio/mpeg',
              size_bytes: existingAsset?.size_bytes ?? (file.size ? Number(file.size) : null),
              checksum: existingAsset?.checksum ?? null,
            })
          }

          const mediaResponse = await drive.files.get(
            { fileId, alt: 'media', supportsAllDrives: true },
            { responseType: 'arraybuffer' },
          )

          const arrayBuffer = mediaResponse.data as ArrayBuffer
          const checksum = await computeSha256(arrayBuffer)
          const uint8 = new Uint8Array(arrayBuffer)
          const sizeBytes = file.size ? Number(file.size) : uint8.byteLength

          const uploadResult = await supabaseAdmin.storage.from(AUDIO_BUCKET).upload(storagePath, uint8, {
            contentType: file.mimeType ?? 'audio/mpeg',
            upsert: true,
            cacheControl: '3600',
          })

          if (uploadResult.error) {
            throw uploadResult.error
          }

          const publicUrl = supabaseAdmin.storage
            .from(AUDIO_BUCKET)
            .getPublicUrl(storagePath).data.publicUrl

          const { data: updatedAsset, error: completeUpdate } = await supabaseAdmin
            .from('audio_assets')
            .update({
              storage_path: storagePath,
              public_url: publicUrl,
              mime_type: file.mimeType ?? 'audio/mpeg',
              size_bytes: sizeBytes,
              checksum,
              status: 'ready',
              error_message: null,
              ingested_at: upsertedAsset?.ingested_at ?? new Date().toISOString(),
            })
            .eq('project_id', projectId)
            .eq('drive_file_id', fileId)
            .select('id')
            .single()

          if (completeUpdate || !updatedAsset) {
            throw completeUpdate ?? new Error('Failed to finalize audio asset')
          }

          assetId = updatedAsset.id
          assetMap.set(fileId, {
            id: assetId,
            status: 'ready',
            storage_path: storagePath,
            public_url: publicUrl,
            mime_type: file.mimeType ?? 'audio/mpeg',
            size_bytes: sizeBytes,
            checksum,
          })

          await ensureQuestionForAsset({
            projectId,
            projectName: project.name,
            replicationCount: project.replications_per_question ?? 1,
            assetId: updatedAsset.id,
            storagePath,
            publicUrl,
            checksum,
            driveFileId: fileId,
            driveFileName: fileName,
            mimeType: file.mimeType ?? 'audio/mpeg',
            rowIndex,
            sizeBytes,
          })

          await recordEvent({
            projectId,
            audioAssetId: assetId,
            driveFileId: fileId,
            eventType: 'ready',
            message: 'Ingestion complete',
            metadata: { checksum, size_bytes: sizeBytes },
          })

          results.push({ fileId, fileName, status: 'ready' })
        } catch (error) {
          console.error('Failed to ingest audio file', { file, error })

          await supabaseAdmin
            .from('audio_assets')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : String(error),
            })
            .eq('project_id', projectId)
            .eq('drive_file_id', fileId)

          await recordEvent({
            projectId,
            audioAssetId: assetId,
            driveFileId: fileId,
            eventType: 'failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          })

          if (assetId) {
            assetMap.set(fileId, {
              id: assetId,
              status: 'failed',
              storage_path: existingAsset?.storage_path ?? storagePath,
              public_url: existingAsset?.public_url ?? '',
              mime_type: existingAsset?.mime_type ?? file.mimeType ?? 'audio/mpeg',
              size_bytes: existingAsset?.size_bytes ?? (file.size ? Number(file.size) : null),
              checksum: existingAsset?.checksum ?? null,
            })
          }

          failedThisRun.add(fileId)

          results.push({
            fileId,
            fileName,
            status: 'failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      if (timedOut) {
        break
      }
    }

    const { data: statusRows, error: statusError } = await supabaseAdmin
      .from('audio_assets')
      .select('status')
      .eq('project_id', projectId)

    if (statusError) {
      throw statusError
    }

    const statsMap = new Map<string, number>()
    statusRows?.forEach((row) => {
      const status = (row as { status: string | null }).status ?? 'unknown'
      statsMap.set(status, (statsMap.get(status) ?? 0) + 1)
    })

    const readyCount = statsMap.get('ready') ?? 0
    const failedCount = statsMap.get('failed') ?? 0
    const transferringCount = statsMap.get('transferring') ?? 0
    const queuedCount = statsMap.get('queued') ?? 0
    const processingCount = transferringCount + queuedCount
    const pendingDerived = Math.max(totalFiles - readyCount - failedCount, 0)
    const pendingCount = Math.max(pendingDerived, processingCount)

    const nextStatus = pendingCount > 0 ? 'importing' : 'active'

    await supabaseAdmin
      .from('projects')
      .update({
        status: nextStatus,
        import_expected_assets: totalFiles,
        import_ready_assets: readyCount,
        import_failed_assets: failedCount,
        import_last_updated: new Date().toISOString(),
        total_tasks: Math.min(totalFiles, readyCount),
      })
      .eq('id', projectId)

    console.log('ingest-audio-assets summary', {
      projectId,
      processed: results.length,
      readyCount,
      failedCount,
      pendingCount,
      totalFiles,
      nextStatus,
    })

    return new Response(
      JSON.stringify({
        success: pendingCount === 0 && failedCount === 0,
        processed: results.length,
        readyCount,
        failedCount,
        pendingCount,
        total: totalFiles,
        hasMore: pendingCount > 0,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error ingesting audio assets:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
