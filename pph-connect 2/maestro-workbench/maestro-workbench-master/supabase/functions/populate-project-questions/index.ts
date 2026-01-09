import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    console.log('Loading questions for project:', project.name);

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
    const googleClientEmail = Deno.env.get('GOOGLE_CLIENT_EMAIL');
    const googlePrivateKey = Deno.env.get('GOOGLE_PRIVATE_KEY');

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
      
      // Try individual secrets first (easier to manage)
      if (googleClientEmail && googlePrivateKey) {
        credentials = {
          client_email: googleClientEmail,
          private_key: googlePrivateKey
        };
        console.log('Using individual Google secrets for populate:', credentials.client_email);
      } 
      // Fallback to full JSON
      else if (serviceAccountKey) {
        try { 
          credentials = JSON.parse(serviceAccountKey); 
          console.log('Using full JSON service account for populate:', credentials.client_email);
        } catch { 
          console.log('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY');
        }
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
    
    // Proper CSV parser that handles quoted fields with commas
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote mode
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // Field separator (only when not in quotes)
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add the last field
      result.push(current.trim());
      
      return result;
    };
    
    // Parse Row 1 (IDs)
    const row1Ids = parseCSVLine(lines[0]).filter(h => h);
    console.log('Parsed Row 1 (IDs):', row1Ids);
    
    // Get template config to check modality
    const { data: template } = await supabase
      .from('task_templates')
      .select('column_config, modality')
      .eq('id', project.template_id)
      .single();

    const columnConfig = template?.column_config || [];
    const isChatbotEval = template?.modality === 'chatbot-eval';
    
    // Detect two-row header format for chatbot-eval
    // For chatbot-eval, we ALWAYS assume two-row header if Row 1 contains IDs with test_/base_/sxs_ prefixes
    let isTwoRowHeader = false;
    let dataStartIndex = 1; // Default: data starts at Row 2
    
    if (isChatbotEval && lines.length > 1) {
      const row2Values = parseCSVLine(lines[1]);
      console.log('Checking for two-row header format (chatbot-eval):', {
        row2Length: row2Values.length,
        row1Length: row1Ids.length,
        row1Sample: row1Ids.slice(0, 3),
        row2Sample: row2Values.slice(0, 3)
      });
      
      // Check if Row 1 contains IDs with chatbot-eval prefixes
      const row1HasPrefixes = row1Ids.some(id => 
        id.startsWith('test_') || id.startsWith('base_') || id.startsWith('sxs_')
      );
      
      // For chatbot-eval, if Row 1 has the expected prefixes, ALWAYS treat as two-row header
      // This ensures data starts at Row 3, not Row 2
      if (row1HasPrefixes) {
        // Additional check: Row 2 should have similar column count
        const hasSimilarColumnCount = row2Values.length >= row1Ids.length * 0.6;
        
        if (hasSimilarColumnCount) {
          isTwoRowHeader = true;
          dataStartIndex = 2; // Data starts at Row 3
          console.log('✅ Detected two-row header format - Row 1: IDs (test_/base_/sxs_ prefixes), Row 2: Question text, Data starts at Row 3');
        } else {
          console.warn('⚠️ Row 1 has chatbot-eval prefixes but Row 2 column count mismatch. Still using two-row format.');
          // Force two-row format anyway for chatbot-eval if prefixes are present
          isTwoRowHeader = true;
          dataStartIndex = 2;
        }
      } else {
        console.log('❌ Row 1 does not contain chatbot-eval prefixes (test_/base_/sxs_). Using single-row format.');
      }
    }
    
    const headers = row1Ids; // Use Row 1 IDs as column headers
    
    // Create question records for each data row (skipping header rows)
    const questions = [];
    for (let i = dataStartIndex; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      console.log(`Row ${i} (data row ${i - dataStartIndex + 1}) parsed values:`, values);
      const questionData: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        questionData[header] = values[index] || '';
      });
      
      // Generate unique question ID
      const { data: questionId, error: questionIdError } = await supabase.rpc('generate_question_id', { project_name: project.name });
      
      if (questionIdError) {
        console.error('Error generating question ID:', questionIdError);
        throw questionIdError;
      }
      
      questions.push({
        project_id: projectId,
        question_id: questionId,
        row_index: i - dataStartIndex + 1, // Store as 1-based index (Row 3 = row_index 1, Row 4 = row_index 2, etc.)
        data: questionData,
        required_replications: project.replications_per_question || 1,
        completed_replications: 0,
        is_answered: false
      });
    }
    
    console.log(`Creating ${questions.length} questions for project ${projectId}`);
    
    // Delete existing questions for this project (in case of reload)
    console.log('Deleting existing questions for project:', projectId);
    const { error: deleteError } = await supabase.from('questions').delete().eq('project_id', projectId);
    if (deleteError) {
      console.error('Error deleting existing questions:', deleteError);
    }
    
    // Insert questions in batches
    const batchSize = 100;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      console.log(`Inserting question batch ${Math.floor(i/batchSize) + 1}, questions ${i + 1}-${Math.min(i + batchSize, questions.length)}`);
      const { error: insertError } = await supabase
        .from('questions')
        .insert(batch);
      
      if (insertError) {
        console.error('Error inserting question batch:', insertError);
        throw insertError;
      }
    }
    
    // Update project task counts
    await supabase
      .from('projects')
      .update({ 
        total_tasks: questions.length,
        completed_tasks: 0
      })
      .eq('id', projectId);
    
    console.log(`Successfully loaded ${questions.length} questions`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        questionsLoaded: questions.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in populate-project-questions:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
