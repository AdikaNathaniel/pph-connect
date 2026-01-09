import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts'

interface Payload {
  sheetUrl: string;
  columns: string[]; // header order
  values: (string | number)[]; // row values matching columns
}

async function getAccessTokenFromSA(saJson: any): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: saJson.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
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

function parseSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sheetUrl, columns, values } = await req.json() as Payload;

    if (!sheetUrl || !Array.isArray(columns) || !Array.isArray(values)) {
      return new Response(JSON.stringify({ error: 'sheetUrl, columns and values are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const sheetId = parseSheetId(sheetUrl);
    if (!sheetId) {
      return new Response(JSON.stringify({ error: 'Invalid Google Sheets URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const saKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!saKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_SERVICE_ACCOUNT_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let credentials: any;
    try {
      credentials = JSON.parse(saKey);
    } catch (_e) {
      return new Response(JSON.stringify({ error: 'GOOGLE_SERVICE_ACCOUNT_KEY must be full JSON' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const accessToken = await getAccessTokenFromSA(credentials);
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Ensure the sheet is shared with the service account email
    // 1) Check for Answers sheet
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`, { headers: authHeader });
    if (!metaRes.ok) {
      throw new Error(`Failed to read spreadsheet metadata (${metaRes.status}). Make sure the sheet is shared with ${credentials.client_email}.`);
    }
    const metaJson = await metaRes.json();
    const titles: string[] = (metaJson.sheets || []).map((s: any) => s.properties?.title);
    const hasAnswers = titles.includes('Answers');

    if (!hasAnswers) {
      const createRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [ { addSheet: { properties: { title: 'Answers' } } } ]
        })
      });
      if (!createRes.ok) {
        throw new Error(`Failed to create Answers sheet (${createRes.status})`);
      }
    }

    // 2) Ensure header row
    const headerRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Answers!1:1`, { headers: authHeader });
    if (!headerRes.ok) throw new Error(`Failed to read header (${headerRes.status})`);
    const headerJson = await headerRes.json();
    const headerPresent = Array.isArray(headerJson.values) && headerJson.values.length > 0 && headerJson.values[0].length > 0;
    if (!headerPresent) {
      const headerAppend = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Answers!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [columns] })
      });
      if (!headerAppend.ok) throw new Error(`Failed to write header (${headerAppend.status})`);
    }

    // 3) Append data row
    const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Answers!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [values] })
    });
    if (!appendRes.ok) throw new Error(`Failed to append row (${appendRes.status})`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('write-answer-to-sheet error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});