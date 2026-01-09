import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('wipe-user-by-email: attempting to wipe', email)

    // Try to find user id via profiles first
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    let userId: string | null = null

    if (profile?.id) {
      userId = profile.id
      console.log('wipe-user-by-email: found user id in profiles', userId)
    } else {
      console.log('wipe-user-by-email: user not in profiles, searching auth.users with pagination')
      let page = 1
      const perPage = 1000
      while (!userId) {
        const { data: authList, error: authListErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
        if (authListErr) {
          console.error('wipe-user-by-email: listUsers error', authListErr)
          break
        }
        const foundUser = authList.users.find((u: any) => u.email === email)
        if (foundUser) {
          userId = foundUser.id
          console.log('wipe-user-by-email: found user id in auth.users', userId)
          break
        }
        if (authList.users.length < perPage) break
        page++
      }
    }

    if (!userId) {
      console.log('wipe-user-by-email: user not found', email)
      return new Response(JSON.stringify({ success: true, message: 'User not found, nothing to wipe' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Clean related application data BEFORE deleting auth user
    // 1) Unassign any tasks currently assigned to this user (except completed ones)
    const { error: unassignErr } = await supabaseAdmin
      .from('tasks')
      .update({ assigned_to: null, assigned_at: null, status: 'pending', updated_at: new Date().toISOString() })
      .eq('assigned_to', userId)
      .neq('status', 'completed')
    if (unassignErr) {
      console.warn('wipe-user-by-email: unassign tasks error', unassignErr)
    }

    // 2) Delete task answers and events created by this user
    const [{ error: delAnswersErr }, { error: delEventsErr }] = await Promise.all([
      supabaseAdmin.from('task_answers').delete().eq('worker_id', userId),
      supabaseAdmin.from('task_answer_events').delete().eq('worker_id', userId),
    ])
    if (delAnswersErr) console.warn('wipe-user-by-email: delete task_answers error', delAnswersErr)
    if (delEventsErr) console.warn('wipe-user-by-email: delete task_answer_events error', delEventsErr)

    // 3) Delete project assignments
    const { error: delAssignmentsErr } = await supabaseAdmin
      .from('project_assignments')
      .delete()
      .eq('worker_id', userId)
    if (delAssignmentsErr) console.warn('wipe-user-by-email: delete project_assignments error', delAssignmentsErr)

    // 3b) Delete any pending invitations for this email (if used in your flows)
    const { error: delInvitesErr } = await supabaseAdmin
      .from('user_invitations')
      .delete()
      .eq('email', email)
    if (delInvitesErr) console.warn('wipe-user-by-email: delete user_invitations error', delInvitesErr)

    // 4) Delete profile
    const { error: delProfileErr } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
    if (delProfileErr) console.warn('wipe-user-by-email: delete profile error', delProfileErr)

    // 5) Delete auth user (may already be deleted)
    const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authDelErr) {
      console.warn('wipe-user-by-email: auth user delete failed (may already be gone)', authDelErr)
    } else {
      console.log('wipe-user-by-email: deleted auth user', userId)
    }

    return new Response(
      JSON.stringify({ success: true, message: `User ${email} completely wiped`, userId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('wipe-user-by-email error:', e)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
