import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();
    
    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Project ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    console.log('Loading tasks for project:', project.name);

    // Extract sheet ID and GID from URL
    const sheetIdMatch = project.google_sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = project.google_sheet_url.match(/[#&]gid=([0-9]+)/);
    
    if (!sheetIdMatch) {
      throw new Error('Invalid Google Sheets URL');
    }

    const sheetId = sheetIdMatch[1];
    const gid = gidMatch ? gidMatch[1] : '0';
    
    // Fetch CSV data (Service Account first, fallback to public)
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');

    async function getAccessTokenFromSA(saJson: any): Promise<string> {
      const header = { alg: 'RS256', typ: 'JWT' };
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: saJson.client_email,
        scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
      };
      const enc = (obj: any) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      const toUint8 = (s: string) => new TextEncoder().encode(s);
      const importKey = async (pem: string) => {
        const pemBody = pem.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\n/g, '');
        const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
        return await crypto.subtle.importKey('pkcs8', binaryDer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
      };
      const unsigned = `${enc(header)}.${enc(payload)}`;
      const key = await importKey(saJson.private_key);
      const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, toUint8(unsigned));
      const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      const assertion = `${unsigned}.${sigB64}`;

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
      });
      if (!tokenRes.ok) throw new Error(`Failed to obtain Google access token: ${tokenRes.status}`);
      const tokenJson = await tokenRes.json();
      return tokenJson.access_token;
    }

    let csvText: string;
    try {
      let credentials: any | null = null;
      if (serviceAccountKey) {
        try { credentials = JSON.parse(serviceAccountKey); } catch { /* ignore */ }
      }

      if (credentials) {
        const accessToken = await getAccessTokenFromSA(credentials);
        const driveExportUrl = `https://www.googleapis.com/drive/v3/files/${sheetId}/export?mimeType=text/csv&gid=${gid}`;
        const res = await fetch(driveExportUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) throw new Error(`Drive export failed with ${res.status}. Ensure the sheet is shared with ${credentials.client_email}.`);
        csvText = await res.text();
      } else {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error(`Failed to fetch sheet: ${response.status}`);
        csvText = await response.text();
      }
    } catch (err) {
      throw err;
    }

    const lines = csvText.trim().split('\n');
    
    if (lines.length <= 1) {
      throw new Error('Sheet has no data rows');
    }
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim()).filter(h => h);
    
    // Get template config
    const { data: template } = await supabase
      .from('task_templates')
      .select('column_config')
      .eq('id', project.template_id)
      .single();

    const columnConfig = template?.column_config || [];
    
    // Create task records for each row
    const tasks = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      const taskData: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        taskData[header] = values[index] || '';
      });
      
      // Check if task needs completion (has empty write fields)
      const writeFields = columnConfig.filter((c: any) => c.type === 'write').map((c: any) => c.name);
      const needsCompletion = writeFields.some((field: string) => !taskData[field]);
      
      if (needsCompletion) {
        tasks.push({
          project_id: projectId,
          row_index: i,
          data: taskData,
          status: 'pending'
        });
      }
    }
    
    console.log(`Creating ${tasks.length} tasks for project ${projectId}`);
    
    // Delete existing tasks for this project (in case of reload)
    await supabase.from('tasks').delete().eq('project_id', projectId);
    
    // Insert tasks in batches
    const batchSize = 100;
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('tasks')
        .insert(batch);
      
      if (insertError) {
        console.error('Error inserting task batch:', insertError);
        throw insertError;
      }
    }
    
    // Update project task counts
    await supabase
      .from('projects')
      .update({ 
        total_tasks: tasks.length,
        completed_tasks: 0
      })
      .eq('id', projectId);
    
    console.log(`Successfully loaded ${tasks.length} tasks`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        tasksLoaded: tasks.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in populate-project-tasks:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
