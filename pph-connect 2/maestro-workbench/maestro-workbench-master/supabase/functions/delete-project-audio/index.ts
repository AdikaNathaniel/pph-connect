import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const AUDIO_BUCKET = 'audio-assets'
const BATCH_SIZE = 200

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

type StorageObject = { name: string }

type CleanupResult = {
  removed: number
  errors: { path: string; message: string }[]
}

async function listObjects(prefix: string, page: number, limit: number): Promise<StorageObject[]> {
  const { data, error } = await supabaseAdmin
    .storage
    .from(AUDIO_BUCKET)
    .list(prefix, { limit, offset: page * limit })

  if (error) {
    throw error
  }

  return data ?? []
}

async function deleteBatch(paths: string[]): Promise<{ removed: number; errors: { path: string; message: string }[] }> {
  if (paths.length === 0) {
    return { removed: 0, errors: [] }
  }

  const { data, error } = await supabaseAdmin
    .storage
    .from(AUDIO_BUCKET)
    .remove(paths)

  if (error) {
    throw error
  }

  const removed = (data ?? []).length
  const missing = paths.filter((path) => !(data ?? []).includes(path))
  const errors = missing.map((path) => ({ path, message: 'not-found' }))

  return { removed, errors }
}

async function cleanupProject(projectId: string): Promise<CleanupResult> {
  let page = 0
  let removed = 0
  const errors: { path: string; message: string }[] = []
  const prefix = `audio-projects/${projectId}`

  while (true) {
    const objects = await listObjects(prefix, page, BATCH_SIZE)
    if (objects.length === 0) {
      break
    }

    const paths = objects
      .filter((obj) => obj.name)
      .map((obj) => `${prefix}/${obj.name}`)

    try {
      const { removed: deletedCount, errors: batchErrors } = await deleteBatch(paths)
      removed += deletedCount
      errors.push(...batchErrors)
    } catch (error) {
      console.error('Failed to delete audio batch', error)
      errors.push(...paths.map((path) => ({ path, message: error instanceof Error ? error.message : 'Unknown error' })))
    }

    if (objects.length < BATCH_SIZE) {
      break
    }
    page += 1
  }

  return { removed, errors }
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
    const { projectId } = await req.json()

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { removed, errors } = await cleanupProject(projectId)

    return new Response(
      JSON.stringify({ removed, errors }),
      { status: errors.length === 0 ? 200 : 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('delete-project-audio error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
