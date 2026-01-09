import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const AUDIO_BUCKET = 'audio-assets'

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function recordEvent(params: {
  projectId: string
  audioAssetId: string | null
  driveFileId?: string | null
  eventType: string
  message?: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    await supabaseAdmin.from('audio_asset_events').insert({
      project_id: params.projectId,
      audio_asset_id: params.audioAssetId,
      drive_file_id: params.driveFileId ?? null,
      event_type: params.eventType,
      message: params.message ?? null,
      metadata: params.metadata ?? {},
    })
  } catch (error) {
    console.error('Failed to log cleanup event', error)
  }
}

type CleanupResult = {
  assetId: string
  status: 'archived' | 'skipped' | 'failed'
  message?: string
}

type AssetRow = {
  id: string
  project_id: string
  storage_path: string | null
  status: string
  ingested_at: string | null
  updated_at: string | null
  last_verified_at: string | null
  drive_file_id?: string | null
  projects?: {
    status: string
    updated_at: string | null
  } | null
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
    const { graceDays = 7 } = await req.json().catch(() => ({ graceDays: 7 }))
    const cutoffMillis = Date.now() - Math.max(1, Number(graceDays)) * 24 * 60 * 60 * 1000

    const { data: assetsRaw, error: fetchError } = await supabaseAdmin
      .from('audio_assets')
      .select(
        'id, project_id, storage_path, status, ingested_at, updated_at, last_verified_at, drive_file_id, projects!inner(status, updated_at)',
      )
      .eq('projects.status', 'completed')

    if (fetchError) {
      throw fetchError
    }

    const assets = (assetsRaw ?? []) as AssetRow[]

    const candidates = assets.filter((asset) => {
      if (asset.status !== 'ready') {
        return false
      }

      const ingestedAt = asset.ingested_at ? new Date(asset.ingested_at).getTime() : null
      const updatedAt = asset.updated_at ? new Date(asset.updated_at).getTime() : null
      const projectUpdatedAt = asset.projects?.updated_at
        ? new Date(asset.projects.updated_at).getTime()
        : null

      const reference = projectUpdatedAt ?? ingestedAt ?? updatedAt ?? Date.now()

      return reference < cutoffMillis
    })

    const results: CleanupResult[] = []

    for (const asset of candidates) {
      const storagePath = asset.storage_path

      if (!storagePath) {
        results.push({
          assetId: asset.id,
          status: 'skipped',
          message: 'Missing storage path',
        })
        continue
      }

      try {
        const { error: removeError } = await supabaseAdmin.storage
          .from(AUDIO_BUCKET)
          .remove([storagePath])

        if (removeError) {
          throw removeError
        }

        const { error: updateError } = await supabaseAdmin
          .from('audio_assets')
          .update({
            status: 'archived',
            error_message: null,
            last_verified_at: new Date().toISOString(),
          })
          .eq('id', asset.id)

        if (updateError) {
          throw updateError
        }

        await recordEvent({
          projectId: asset.project_id,
          audioAssetId: asset.id,
          driveFileId: asset.drive_file_id ?? null,
          eventType: 'archived',
          message: 'Supabase copy removed after grace period',
        })

        results.push({ assetId: asset.id, status: 'archived' })
      } catch (error) {
        console.error('Failed to archive audio asset', asset.id, error)
        await supabaseAdmin
          .from('audio_assets')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : String(error),
            last_verified_at: new Date().toISOString(),
          })
          .eq('id', asset.id)

        results.push({
          assetId: asset.id,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        })

        await recordEvent({
          projectId: asset.project_id,
          audioAssetId: asset.id,
          driveFileId: asset.drive_file_id ?? null,
          eventType: 'cleanup_failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        archived: results.filter((r) => r.status === 'archived').length,
        failed: results.filter((r) => r.status === 'failed').length,
        skipped: results.filter((r) => r.status === 'skipped').length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error during audio asset cleanup:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
