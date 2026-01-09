import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Request body received:', requestBody);
    
    // Handle both direct body and wrapped body formats
    const { sheetUrl } = requestBody.body || requestBody;
    
    if (!sheetUrl) {
      console.log('No sheetUrl provided in request body');
      return new Response(
        JSON.stringify({ error: 'Sheet URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Loading sheet data from:', sheetUrl);

    // Extract sheet ID and GID from URL
    const sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = sheetUrl.match(/[#&]gid=([0-9]+)/);
    
    if (!sheetIdMatch) {
      return new Response(
        JSON.stringify({ error: 'Invalid Google Sheets URL format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const sheetId = sheetIdMatch[1];
    const gid = gidMatch ? gidMatch[1] : '0';
    
    // Try Google Service Account first (Drive export API)
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    const googleClientEmail = Deno.env.get('GOOGLE_CLIENT_EMAIL');
    const googlePrivateKey = Deno.env.get('GOOGLE_PRIVATE_KEY');

    let csvText: string;

    async function getAccessTokenFromSA(saJson: any): Promise<string> {
      const header = { alg: 'RS256', typ: 'JWT' };
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: saJson.client_email,
        scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/spreadsheets',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
      };
      const enc = (obj: any) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      const toUint8 = (s: string) => new TextEncoder().encode(s);
      const importKey = async (pem: string) => {
        const pemBody = pem.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\n/g, '');
        const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
        return await crypto.subtle.importKey(
          'pkcs8',
          binaryDer,
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
          false,
          ['sign']
        );
      };
      const unsigned = `${enc(header)}.${enc(payload)}`;
      const key = await importKey(saJson.private_key);
      const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, toUint8(unsigned));
      const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
      const assertion = `${unsigned}.${sigB64}`;

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion
        })
      });
      if (!tokenRes.ok) throw new Error(`Failed to obtain Google access token: ${tokenRes.status}`);
      const tokenJson = await tokenRes.json();
      return tokenJson.access_token;
    }

    try {
      let credentials: any | null = null;
      
      // Try individual secrets first (easier to manage)
      if (googleClientEmail && googlePrivateKey) {
        credentials = {
          client_email: googleClientEmail,
          private_key: googlePrivateKey
        };
        console.log('Using individual Google secrets:', credentials.client_email);
      } 
      // Fallback to full JSON
      else if (serviceAccountKey) {
        try {
          credentials = JSON.parse(serviceAccountKey);
          console.log('Service account credentials parsed successfully:', credentials.client_email);
        } catch (parseError) {
          console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', parseError);
          console.warn('GOOGLE_SERVICE_ACCOUNT_KEY is not JSON; service-account-only access will fail. Falling back to public CSV export.');
        }
      } else {
        console.log('No Google credentials found in environment');
      }

      if (credentials) {
        console.log('Using Google Service Account for Drive export');
        console.log('Sheet ID:', sheetId, 'GID:', gid);
        const accessToken = await getAccessTokenFromSA(credentials);
        console.log('Access token obtained successfully');
        const driveExportUrl = `https://www.googleapis.com/drive/v3/files/${sheetId}/export?mimeType=text/csv&gid=${gid}`;
        console.log('Drive export URL:', driveExportUrl);
        const res = await fetch(driveExportUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
        console.log('Drive export response status:', res.status);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Drive export error response:', errorText);
          throw new Error(`Drive export failed with ${res.status}: ${errorText}. Ensure the sheet is shared with ${credentials.client_email}.`);
        }
        csvText = await res.text();
        console.log('CSV data retrieved successfully, length:', csvText.length);
      } else {
        // Public CSV export fallback
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
        const response = await fetch(csvUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SheetDataLoader/1.0)' } });
        if (!response.ok) {
          throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}. Sheet must be publicly accessible or share the JSON key for service account.`);
        }
        csvText = await response.text();
      }
    } catch (saErr) {
      console.error('Service account or public fetch failed:', saErr);
      return new Response(
        JSON.stringify({ 
          error: saErr instanceof Error ? saErr.message : 'Failed to access Google Sheet',
          details: 'Either make the sheet public OR share it with the service account and set GOOGLE_SERVICE_ACCOUNT_KEY (full JSON) in project secrets.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('CSV content preview:', csvText.substring(0, 200));

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

    // Parse CSV data
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) {
      throw new Error('Empty sheet');
    }
    
    // Parse Row 1 (IDs)
    const row1Ids = parseCSVLine(lines[0]).filter(h => h);
    
    if (row1Ids.length === 0) {
      throw new Error('No headers found in sheet');
    }
    
    console.log('Parsed Row 1 (IDs):', row1Ids);
    
    // Detect two-row header format
    // For chatbot-eval: if Row 1 has test_/base_/sxs_ prefixes, ALWAYS treat as two-row header
    let isTwoRowHeader = false;
    let questionTextRow: string[] = [];
    let headers: string[] = row1Ids; // Default: use Row 1 as headers
    let questionNames: Record<string, string> = {}; // Map ID -> question text
    
    if (lines.length > 1) {
      questionTextRow = parseCSVLine(lines[1]);
      
      // Check if Row 1 contains chatbot-eval prefixes (test_, base_, sxs_)
      const row1HasPrefixes = row1Ids.some(id => 
        id.startsWith('test_') || id.startsWith('base_') || id.startsWith('sxs_')
      );
      
      // Check if this looks like a question text row:
      // - Has similar column count to Row 1
      // - Contains text that looks like questions (longer strings, not empty)
      const hasSimilarColumnCount = questionTextRow.length >= row1Ids.length * 0.6;
      const hasQuestionText = questionTextRow.some((text, i) => text && text.length > 10);
      
      // If Row 1 has chatbot-eval prefixes, ALWAYS treat as two-row header
      // OR if Row 2 has question-like text with similar column count
      if (row1HasPrefixes || (hasSimilarColumnCount && hasQuestionText)) {
        isTwoRowHeader = true;
        console.log('Detected two-row header format', row1HasPrefixes ? '(chatbot-eval prefixes detected)' : '(question text detected)');
        
        // Use Row 1 IDs as headers
        headers = row1Ids;
        
        // Map each ID to its question text from Row 2
        row1Ids.forEach((id, index) => {
          questionNames[id] = questionTextRow[index] || id; // Fallback to ID if no question text
        });
      }
    }
    
    // Parse sample row (first data row after headers)
    // If two-row header: sample row is Row 3 (index 2)
    // If single-row header: sample row is Row 2 (index 1)
    const sampleRowIndex = isTwoRowHeader ? 2 : 1;
    let sampleRow: Record<string, any> = {};
    if (lines.length > sampleRowIndex) {
      const values = parseCSVLine(lines[sampleRowIndex]);
      headers.forEach((header, index) => {
        sampleRow[header] = values[index] || '';
      });
    }
    
    // Count non-header rows as total tasks
    // If two-row header: skip Row 1 and Row 2 (so totalTasks = lines.length - 2)
    // If single-row header: skip Row 1 (so totalTasks = lines.length - 1)
    const totalTasks = isTwoRowHeader ? Math.max(0, lines.length - 2) : Math.max(0, lines.length - 1);
    
    const result = {
      success: true,
      headers, // Row 1 IDs (for column configuration)
      questionNames, // Map of ID -> question text (Row 2)
      isTwoRowHeader, // Flag indicating two-row format
      sampleRow,
      totalTasks,
      rawPreview: lines.slice(0, isTwoRowHeader ? 4 : 3) // Show Row 1-3 or Row 1-4
    };
    
    console.log('Sheet data loaded successfully:', result);
    
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Error in load-sheet-data function:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Make sure the Google Sheet is shared with the service account email or is publicly accessible.',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});