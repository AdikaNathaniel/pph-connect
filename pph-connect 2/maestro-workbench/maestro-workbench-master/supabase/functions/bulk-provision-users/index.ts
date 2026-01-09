import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Admin client (bypasses RLS for privileged operations)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// User-scoped client (uses caller's JWT to enforce RLS for authorization checks)
function createUserClient(authHeader: string | null) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {}
    },
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

interface ProvisionResult {
  email: string
  status: 'created' | 'skipped' | 'error'
  reason?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { emails } = await req.json()
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(JSON.stringify({ error: 'emails array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 1) Authorize caller (must be root or manager)
    const userClient = createUserClient(authHeader)
    const { data: callerUser, error: callerErr } = await userClient.auth.getUser()
    if (callerErr || !callerUser?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const callerId = callerUser.user.id
    const { data: callerProfile, error: profileErr } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .single()

    if (profileErr || !callerProfile || !['root','manager'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only root and managers can provision users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('bulk-provision-users: authorized caller', callerId)

    // 2) Get default department ID
    const { data: defaultDept, error: deptError } = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('name', 'Default Department')
      .single()

    if (deptError || !defaultDept) {
      console.error('bulk-provision-users: Failed to get default department', deptError)
      return new Response(JSON.stringify({ error: 'Default Department not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const defaultDeptId = defaultDept.id

    // 3) Process each email
    const results: ProvisionResult[] = []

    for (const email of emails) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        results.push({
          email,
          status: 'error',
          reason: 'Invalid email format'
        })
        continue
      }

      // Check if already provisioned or has active profile
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single()

      if (existingProfile) {
        results.push({
          email,
          status: 'skipped',
          reason: 'User already has active profile'
        })
        continue
      }

      const { data: existingProvision } = await supabaseAdmin
        .from('pre_provisioned_users')
        .select('id, email')
        .eq('email', email)
        .single()

      if (existingProvision) {
        results.push({
          email,
          status: 'skipped',
          reason: 'Already pre-provisioned'
        })
        continue
      }

      // Extract full name from email (part before @)
      const fullName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

      // Insert into pre_provisioned_users table
      const { error: insertError } = await supabaseAdmin
        .from('pre_provisioned_users')
        .insert({
          email,
          full_name: fullName,
          role: 'worker',
          department_id: defaultDeptId,
          provisioned_by: callerId,
          provisioned_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('bulk-provision-users: Insert error for', email, insertError)
        results.push({
          email,
          status: 'error',
          reason: insertError.message
        })
        continue
      }

      results.push({
        email,
        status: 'created',
      })
    }

    // 4) Return summary
    const summary = {
      total: emails.length,
      created: results.filter(r => r.status === 'created').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
      results
    }

    console.log('bulk-provision-users: Completed', summary)

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('bulk-provision-users error:', e)
    return new Response(JSON.stringify({ error: 'Internal server error', details: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
