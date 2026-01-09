/**
 * Edge Function: validate-message-permissions
 *
 * Purpose:
 * Validates whether a sender is allowed to message a list of recipients
 * based on hierarchical permissions defined in can_message_user function.
 *
 * Request Body:
 * {
 *   sender_id: string (UUID),
 *   recipient_ids: string[] (array of UUIDs)
 * }
 *
 * Response:
 * {
 *   valid: boolean,
 *   invalid_recipients: string[],
 *   error_message?: string
 * }
 *
 * Usage:
 * Called by the frontend before sending a message to validate permissions.
 * Can also be called by send-message function for additional validation.
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
    // Parse request body
    const { sender_id, recipient_ids } = await req.json();

    // Validate input
    if (!sender_id || typeof sender_id !== 'string') {
      return new Response(
        JSON.stringify({
          valid: false,
          invalid_recipients: [],
          error_message: 'sender_id is required and must be a string (UUID)'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!Array.isArray(recipient_ids) || recipient_ids.length === 0) {
      return new Response(
        JSON.stringify({
          valid: false,
          invalid_recipients: [],
          error_message: 'recipient_ids is required and must be a non-empty array'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase admin client (uses service role key)
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

    // Check permissions for each recipient
    const invalid_recipients: string[] = [];

    for (const recipient_id of recipient_ids) {
      // Call the can_message_user function via RPC
      const { data, error } = await supabaseAdmin.rpc('can_message_user', {
        _sender_id: sender_id,
        _recipient_id: recipient_id
      });

      if (error) {
        console.error(`Error checking permission for recipient ${recipient_id}:`, error);
        return new Response(
          JSON.stringify({
            valid: false,
            invalid_recipients: [],
            error_message: `Permission check failed: ${error.message}`
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // If permission is false, add to invalid list
      if (!data) {
        invalid_recipients.push(recipient_id);
      }
    }

    // Return validation result
    const isValid = invalid_recipients.length === 0;

    return new Response(
      JSON.stringify({
        valid: isValid,
        invalid_recipients,
        error_message: isValid
          ? null
          : `You do not have permission to message ${invalid_recipients.length} recipient(s)`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in validate-message-permissions:', error);

    return new Response(
      JSON.stringify({
        valid: false,
        invalid_recipients: [],
        error_message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
