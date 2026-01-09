/**
 * Edge Function: send-message
 *
 * Purpose:
 * Handles complete message sending workflow including:
 * - Authentication verification
 * - Permission validation
 * - Thread creation (or reuse)
 * - Message creation with attachments
 * - Recipient record creation
 *
 * Request Body:
 * {
 *   recipient_ids?: string[] (array of UUIDs, required for direct messages),
 *   group_id?: string (UUID, required for group messages),
 *   subject: string,
 *   content: string,
 *   attachments?: Array<{path: string, name: string, size: number, type: string}>
 *   thread_id?: string (optional, for replies to existing thread)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message_id: string,
 *   thread_id: string,
 *   error?: string
 * }
 *
 * Authorization:
 * Requires Bearer token in Authorization header
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, tryHandleCors } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = tryHandleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    // Extract JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing Authorization header'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const { recipient_ids, group_id, subject, content, attachments = [], thread_id } = await req.json();

    // Validate required fields - either recipient_ids OR group_id must be provided
    const isGroupMessage = !!group_id;
    const isDirectMessage = Array.isArray(recipient_ids) && recipient_ids.length > 0;

    if (!isGroupMessage && !isDirectMessage) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Either recipient_ids (for direct messages) or group_id (for group messages) is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (isGroupMessage && isDirectMessage) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cannot specify both recipient_ids and group_id. Use one or the other.'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'subject is required and must be a non-empty string'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'content is required and must be a non-empty string'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create authenticated Supabase client (with user's JWT)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication failed'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase admin client for queries (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // For group messages, verify sender is a member of the group
    if (isGroupMessage) {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('group_members')
        .select('id, role')
        .eq('group_id', group_id)
        .eq('user_id', user.id)
        .is('left_at', null)
        .maybeSingle();

      if (membershipError || !membership) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'You are not a member of this group'
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } else {
      // For direct messages, validate permissions by calling validate-message-permissions
      // This ensures the user can message all recipients
      const validateUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/validate-message-permissions`;
      const validateResponse = await fetch(validateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          sender_id: user.id,
          recipient_ids
        })
      });

      const validation = await validateResponse.json();

      if (!validation.valid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: validation.error_message || 'Permission denied',
            invalid_recipients: validation.invalid_recipients
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Step 1: Create or get thread
    let finalThreadId = thread_id;

    if (!finalThreadId) {
      // Create new thread
      const { data: newThread, error: threadError } = await supabaseAdmin
        .from('message_threads')
        .insert({
          subject,
          created_by: user.id
        })
        .select('id')
        .single();

      if (threadError || !newThread) {
        console.error('Thread creation error:', threadError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to create message thread'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      finalThreadId = newThread.id;
    }

    // Step 2: Create message
    const messageData: any = {
      thread_id: finalThreadId,
      sender_id: user.id,
      content,
      attachments: attachments || []
    };

    // Add group_id if this is a group message
    if (isGroupMessage) {
      messageData.group_id = group_id;
    }

    const { data: newMessage, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert(messageData)
      .select('id')
      .single();

    if (messageError || !newMessage) {
      console.error('Message creation error:', messageError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create message'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Step 3: Create recipient records (only for direct messages)
    // Group messages don't need recipient records as membership is tracked in group_members
    if (isDirectMessage) {
      const recipientRecords = recipient_ids.map(recipient_id => ({
        message_id: newMessage.id,
        recipient_id: recipient_id,
        read_at: null,
        deleted_at: null
      }));

      const { error: recipientsError } = await supabaseAdmin
        .from('message_recipients')
        .insert(recipientRecords);

      if (recipientsError) {
        console.error('Recipients creation error:', recipientsError);
        // Note: Message and thread already created, but recipients failed
        // In production, you might want to implement rollback or retry logic
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to create recipient records',
            message_id: newMessage.id,
            thread_id: finalThreadId
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Success! Return message and thread IDs
    return new Response(
      JSON.stringify({
        success: true,
        message_id: newMessage.id,
        thread_id: finalThreadId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in send-message:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
