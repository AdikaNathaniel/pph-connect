import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { google } from 'npm:googleapis@129.0.0'

const GOOGLE_SERVICE_ACCOUNT_EMAIL = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')!
const GOOGLE_PRIVATE_KEY = Deno.env.get('GOOGLE_PRIVATE_KEY')!.replace(/\\n/g, '\n')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { projectId } = await req.json()

    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get project details
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      throw new Error('Project not found')
    }

    // Extract folder ID from google_sheet_url (which contains Drive folder URL for audio-short)
    console.log('Project google_sheet_url:', project.google_sheet_url)
    const folderIdMatch = project.google_sheet_url.match(/folders\/([a-zA-Z0-9-_]+)/)
    if (!folderIdMatch) {
      throw new Error(`Invalid Google Drive folder URL: ${project.google_sheet_url}`)
    }
    const folderId = folderIdMatch[1]
    console.log('Extracted folder ID:', folderId)

    // Initialize Google Drive API
    const auth = new google.auth.JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })

    const drive = google.drive({ version: 'v3', auth })

    // List audio files in the folder
    // First try to list all files to debug
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType)',
      orderBy: 'name',
    })

    const allFiles = response.data.files || []
    console.log('All files found:', allFiles.length, allFiles.map(f => ({ name: f.name, mime: f.mimeType })))

    // Filter for audio files (mp3, wav, m4a, aac)
    const audioFiles = allFiles.filter(file => {
      const name = file.name?.toLowerCase() || ''
      const mime = file.mimeType?.toLowerCase() || ''
      return mime.includes('audio') || 
             name.endsWith('.mp3') || 
             name.endsWith('.wav') || 
             name.endsWith('.m4a') || 
             name.endsWith('.aac')
    })

    console.log('Audio files found:', audioFiles.length, audioFiles.map(f => f.name))

    if (audioFiles.length === 0) {
      throw new Error(`No audio files found in the folder. Found ${allFiles.length} total files.`)
    }

    // Create questions for each audio file
    const questions = []
    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i]
      
      // Generate question ID
      const { data: questionIdData, error: questionIdError } = await supabaseClient
        .rpc('generate_question_id', { project_name: project.name })

      if (questionIdError) {
        console.error('Error generating question ID:', questionIdError)
        continue
      }

      questions.push({
        project_id: projectId,
        question_id: questionIdData,
        row_index: i + 1,
        data: {
          audio_file: file.name,
          drive_file_id: file.id,
          mime_type: file.mimeType
        },
        required_replications: project.replications_per_question || 1,
        completed_replications: 0,
        is_answered: false
      })
    }

    // Insert questions
    const { error: insertError } = await supabaseClient
      .from('questions')
      .insert(questions)

    if (insertError) {
      throw insertError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        questionsCreated: questions.length,
        audioFiles: audioFiles.map(f => f.name)
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  } catch (error) {
    console.error('Error populating audio questions:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  }
})

