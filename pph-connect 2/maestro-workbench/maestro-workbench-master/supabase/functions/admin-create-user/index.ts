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

    const { email, full_name, role, password } = await req.json()
    if (!email || !full_name || !role || !password) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
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
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('admin-create-user: authorized caller', callerId)

    // 2) Create auth user using Admin API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role }
    })

    // If email already exists, attempt a self-healing wipe-and-recreate
    if (authError && ((authError as any)?.status === 422 || (authError as any)?.code === 'email_exists')) {
      console.warn('admin-create-user: email exists, attempting wipe and recreate');

      // Try to locate the user by email via pagination
      let userId: string | null = null;
      let page = 1;
      const perPage = 1000;
      while (!userId) {
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (listErr) {
          console.error('admin-create-user: listUsers error during wipe flow', listErr);
          break;
        }
        const found = list.users.find((u: any) => u.email === email);
        if (found) {
          userId = found.id;
          break;
        }
        if (list.users.length < perPage) break;
        page++;
      }

      if (userId) {
        // Unassign tasks (non-completed), delete answers/events/assignments/profile, then delete auth user
        try {
          await supabaseAdmin.from('tasks')
            .update({ assigned_to: null, assigned_at: null, status: 'pending', updated_at: new Date().toISOString() })
            .eq('assigned_to', userId)
            .neq('status', 'completed');

          await Promise.all([
            supabaseAdmin.from('task_answers').delete().eq('worker_id', userId),
            supabaseAdmin.from('task_answer_events').delete().eq('worker_id', userId),
            supabaseAdmin.from('project_assignments').delete().eq('worker_id', userId),
            supabaseAdmin.from('profiles').delete().eq('id', userId)
          ]);

          const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
          if (delAuthErr) {
            console.warn('admin-create-user: failed to delete existing auth user (may already be gone)', delAuthErr);
          }
        } catch (wipeErr) {
          console.error('admin-create-user: wipe flow failed', wipeErr);
        }
      }

      // Retry user creation once after wipe
      const { data: retryUser, error: retryErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role }
      });

      if (retryErr || !retryUser?.user) {
        const msg = (retryErr as any)?.message || 'Failed to create user after wipe';
        return new Response(
          JSON.stringify({ error: msg, code: 'email_exists' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Continue with profile creation using retry user
      var finalUser = retryUser.user;
      console.log('admin-create-user: recreated auth user', finalUser.id);

      // 3) Ensure profile exists (handle trigger duplicates gracefully)
      const { error: upsertErr } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: finalUser.id,
          email,
          full_name,
          role,
          suspended: false,
          initial_password_hash: 'TEMP',
          password_changed_at: null
        }, { onConflict: 'id' });

      if (upsertErr) {
        console.error('admin-create-user: profile upsert error after recreate:', upsertErr);
        return new Response(JSON.stringify({ error: 'Failed to create user profile' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(
        JSON.stringify({ success: true, user: { id: finalUser.id, email, full_name, role } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (authError) {
      console.error('admin-create-user: auth user creation error:', authError)
      const msg = (authError as any)?.message || 'Failed to create user'
      const code = (authError as any)?.code || ''
      const status = (authError as any)?.status === 422 || code === 'email_exists' ? 409 : 400
      return new Response(
        JSON.stringify({ 
          error: msg,
          code: code || (status === 409 ? 'email_exists' : 'unknown_error')
        }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!authUser?.user) {
      console.error('admin-create-user: no user returned from createUser')
      return new Response(JSON.stringify({ error: 'Failed to create user - no user returned' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('admin-create-user: created auth user', authUser.user.id)

    // 2.5) Get default department ID
    const { data: defaultDept } = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('name', 'Default Department')
      .single();

    const defaultDeptId = defaultDept?.id || null;

    // 3) Ensure profile exists (handle trigger duplicates gracefully)
    const { error: upsertErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        email,
        full_name,
        role,
        suspended: false,
        department_id: defaultDeptId, // Auto-assign to default department
        // Flag first login to force password change
        initial_password_hash: 'TEMP',
        password_changed_at: null
      }, { onConflict: 'id' })

    if (upsertErr) {
      console.error('admin-create-user: profile upsert error:', upsertErr)
      // Verify presence of profile before failing
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', authUser.user.id)
        .single()
      if (!existingProfile) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        return new Response(JSON.stringify({ 
          error: 'Failed to create user profile',
          details: upsertErr.message 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      console.log('admin-create-user: profile already exists, continuing')
    }

    console.log('admin-create-user: ensured profile for user', authUser.user.id)

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: authUser.user.id, email, full_name, role }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('admin-create-user error:', e)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
