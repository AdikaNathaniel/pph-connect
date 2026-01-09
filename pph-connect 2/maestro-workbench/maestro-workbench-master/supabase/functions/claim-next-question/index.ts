import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type QuestionRow = {
  id: string;
  project_id: string;
  question_id?: string;
  row_index: number;
  data: Record<string, unknown>;
  completed_replications?: number;
  required_replications?: number;
  is_answered?: boolean;
  created_at?: string;
};

type TaskRow = {
  id: string;
  project_id: string;
  question_id: string;
  row_index: number;
  data: Record<string, unknown>;
  status: string;
  assigned_to: string;
  assigned_at: string;
  created_at?: string;
  updated_at?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, workerId } = await req.json();

    if (!projectId || !workerId) {
      return new Response(
        JSON.stringify({ error: 'Project ID and Worker ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Claiming question for project ${projectId}, worker ${workerId}`);

    const { data: claimResult, error: claimError } = await supabase
      .rpc('claim_next_available_question', {
        p_project_id: projectId,
        p_worker_id: workerId
      });

    if (claimError) {
      console.error('claim_next_available_question RPC failed:', claimError);
      return new Response(
        JSON.stringify({
          success: false,
          error: claimError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const questionRecord = claimResult && claimResult.length > 0
      ? claimResult[0]
      : null;

    const question = questionRecord ? {
      id: questionRecord.id,
      project_id: questionRecord.project_id,
      question_id: questionRecord.question_id,
      row_index: questionRecord.row_index,
      data: questionRecord.data,
      completed_replications: questionRecord.completed_replications,
      required_replications: questionRecord.required_replications,
      is_answered: questionRecord.is_answered,
      created_at: questionRecord.created_at,
    } as QuestionRow : null;

    const reservationTaskId = questionRecord ? (questionRecord as any).reservation_task_id as string | null : null;

    if (!question) {
      console.log('No questions available for this project');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No questions available for this project'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let taskRow = null;
    let fetchTaskError = null;

    if (reservationTaskId) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', reservationTaskId)
        .maybeSingle();
      taskRow = data;
      fetchTaskError = error;
    }

    if (!taskRow) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('question_id', question.id)
        .eq('assigned_to', workerId)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      taskRow = data;
      fetchTaskError = error;
    }

    if (fetchTaskError || !taskRow) {
      console.error('Failed to fetch task for claimed question:', fetchTaskError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch task reservation'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const task = taskRow as TaskRow;
    const wasResumed = Boolean(taskRow.created_at && taskRow.assigned_at && taskRow.status !== 'pending');

    console.log(`Claimed question ${question.question_id ?? question.id} for worker ${workerId}${wasResumed ? ' (resumed)' : ''}`);

    const responsePayload = {
      success: true,
      wasResumed,
      task,
      question,
    };

    return new Response(
      JSON.stringify(responsePayload),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in claim-next-question:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
