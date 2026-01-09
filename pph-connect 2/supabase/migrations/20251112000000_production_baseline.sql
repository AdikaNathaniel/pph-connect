


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."user_role" AS ENUM (
    'root',
    'admin',
    'manager',
    'team_lead',
    'worker'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


COMMENT ON TYPE "public"."user_role" IS 'User role hierarchy for access control and messaging';



CREATE OR REPLACE FUNCTION "public"."add_creator_to_group"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Only for conversation groups
  IF NEW.group_type = 'conversation' THEN
    -- Add the creator as an admin member
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'admin')
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_creator_to_group"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_creator_to_group"() IS 'Automatically adds the group creator as an admin member when a new conversation group is created';



CREATE OR REPLACE FUNCTION "public"."can_message_user"("_sender_id" "uuid", "_recipient_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  sender_role user_role;
  recipient_role user_role;
  sender_dept_id uuid;
  recipient_dept_id uuid;
  sender_reports_to uuid;
  recipient_reports_to uuid;
  sender_suspended boolean;
  recipient_suspended boolean;
BEGIN
  -- Step 1: Fetch sender information
  SELECT role, department_id, reports_to, suspended
  INTO sender_role, sender_dept_id, sender_reports_to, sender_suspended
  FROM profiles
  WHERE id = _sender_id;

  -- Step 2: Fetch recipient information
  SELECT role, department_id, reports_to, suspended
  INTO recipient_role, recipient_dept_id, recipient_reports_to, recipient_suspended
  FROM profiles
  WHERE id = _recipient_id;

  -- Step 3: Check if either user doesn't exist or is suspended
  IF sender_role IS NULL OR recipient_role IS NULL THEN
    RETURN false;
  END IF;

  IF sender_suspended = true OR recipient_suspended = true THEN
    RETURN false;
  END IF;

  -- Step 4: Users cannot message themselves
  IF _sender_id = _recipient_id THEN
    RETURN false;
  END IF;

  -- =========================================================================
  -- Step 5: Role-based permission checks (hierarchical)
  -- =========================================================================

  -- 5a. Root can message anyone
  IF sender_role = 'root' THEN
    RETURN true;
  END IF;

  -- 5b. Admin can message anyone
  IF sender_role = 'admin' THEN
    RETURN true;
  END IF;

  -- 5c. Manager can message:
  --     - Anyone in their department
  --     - Other managers
  --     - Admins/Root (upward communication)
  IF sender_role = 'manager' THEN
    -- Can message anyone in same department
    IF sender_dept_id IS NOT NULL
       AND recipient_dept_id IS NOT NULL
       AND sender_dept_id = recipient_dept_id THEN
      RETURN true;
    END IF;

    -- Can message other managers
    IF recipient_role IN ('manager', 'admin', 'root') THEN
      RETURN true;
    END IF;

    -- Check if sender is the manager of recipient's department
    IF sender_dept_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM departments
      WHERE id = recipient_dept_id
      AND manager_id = _sender_id
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- 5d. Team Lead can message:
  --     - Their direct reports
  --     - Their manager (reports_to)
  --     - People in their department
  --     - Anyone they report to (upward communication)
  IF sender_role = 'team_lead' THEN
    -- Can message direct reports
    IF recipient_reports_to = _sender_id THEN
      RETURN true;
    END IF;

    -- Can message their own manager
    IF sender_reports_to = _recipient_id THEN
      RETURN true;
    END IF;

    -- Can message people in same department
    IF sender_dept_id IS NOT NULL
       AND recipient_dept_id IS NOT NULL
       AND sender_dept_id = recipient_dept_id THEN
      RETURN true;
    END IF;

    -- Can message department manager
    IF sender_dept_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM departments
      WHERE id = sender_dept_id
      AND manager_id = _recipient_id
    ) THEN
      RETURN true;
    END IF;

    -- Can message up the chain (anyone in management)
    IF recipient_role IN ('team_lead', 'manager', 'admin', 'root') THEN
      RETURN true;
    END IF;
  END IF;

  -- 5e. Worker can message:
  --     - Their team lead (reports_to)
  --     - Their department manager
  --     - Team leads and managers in their department
  --     - Admins/Root
  IF sender_role = 'worker' THEN
    -- Can message their direct supervisor
    IF sender_reports_to = _recipient_id THEN
      RETURN true;
    END IF;

    -- Can message department manager
    IF sender_dept_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM departments
      WHERE id = sender_dept_id
      AND manager_id = _recipient_id
    ) THEN
      RETURN true;
    END IF;

    -- Can message team leads/managers in same department
    IF sender_dept_id IS NOT NULL
       AND recipient_dept_id IS NOT NULL
       AND sender_dept_id = recipient_dept_id
       AND recipient_role IN ('team_lead', 'manager') THEN
      RETURN true;
    END IF;

    -- Can message admins/root
    IF recipient_role IN ('admin', 'root') THEN
      RETURN true;
    END IF;
  END IF;

  -- =========================================================================
  -- Step 6: Bidirectional communication check
  -- If recipient can message sender, then sender can message recipient
  -- This enables two-way conversations
  -- =========================================================================

  -- To avoid infinite recursion, we do a simplified check
  -- If the recipient has already been granted permission through the above rules,
  -- we allow bidirectional communication

  -- Check if recipient would be able to message sender (reverse check)
  -- We'll do a simplified reverse check to avoid recursion

  -- If recipient is admin/root, bidirectional allowed
  IF recipient_role IN ('root', 'admin') THEN
    RETURN true;
  END IF;

  -- If recipient is sender's manager, bidirectional allowed
  IF recipient_role = 'manager' AND sender_dept_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM departments
      WHERE id = sender_dept_id
      AND manager_id = _recipient_id
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- If recipient is sender's supervisor, bidirectional allowed
  IF sender_reports_to = _recipient_id THEN
    RETURN true;
  END IF;

  -- If recipient and sender are in same department and recipient is team_lead/manager
  IF sender_dept_id IS NOT NULL
     AND recipient_dept_id IS NOT NULL
     AND sender_dept_id = recipient_dept_id
     AND recipient_role IN ('team_lead', 'manager') THEN
    RETURN true;
  END IF;

  -- =========================================================================
  -- Step 7: Default deny
  -- If none of the above conditions are met, deny permission
  -- =========================================================================

  RETURN false;

END;
$$;


ALTER FUNCTION "public"."can_message_user"("_sender_id" "uuid", "_recipient_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_message_user"("_sender_id" "uuid", "_recipient_id" "uuid") IS 'Permission check function for messaging system. Returns true if sender_id is allowed to message recipient_id based on role hierarchy, department relationships, and reporting structure. Implements bidirectional communication (if A can message B, then B can reply to A).

Permission Rules:
- Root/Admin: Can message anyone
- Manager: Can message anyone in their department, other managers, and upward
- Team Lead: Can message direct reports, their manager, department members, and upward
- Worker: Can message their supervisor, department managers/team leads, and admins
- Bidirectional: If B can message A, then A can message B (enables replies)

Returns false if:
- Either user does not exist
- Either user is suspended
- Sender attempts to message themselves
- No permission rules grant access';



CREATE OR REPLACE FUNCTION "public"."can_send_messages"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- User can send messages if:
  --   1. They have a valid role (any role in the enum)
  --   2. They are not suspended
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _user_id
    AND role IN ('root', 'admin', 'manager', 'team_lead', 'worker')
    AND suspended = false
  );
END;
$$;


ALTER FUNCTION "public"."can_send_messages"("_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_send_messages"("_user_id" "uuid") IS 'Helper function to check if a user can send messages. Returns true if user exists, has a valid role, and is not suspended. Used by messaging RLS policies.';



CREATE OR REPLACE FUNCTION "public"."claim_next_available_question"("p_project_id" "uuid", "p_worker_id" "uuid") RETURNS TABLE("id" "uuid", "project_id" "uuid", "question_id" "text", "row_index" integer, "data" "jsonb", "completed_replications" integer, "required_replications" integer, "is_answered" boolean, "created_at" timestamp with time zone, "reservation_task_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
#variable_conflict use_column
DECLARE
    v_question_record RECORD;
    v_task_id UUID;
    v_reservation_time_limit INTEGER;
    v_existing_reservation_task_id UUID;
    v_existing_reservation_project_id UUID;
BEGIN
    -- Get project reservation time limit
    SELECT COALESCE(reservation_time_limit_minutes, 60)
    INTO v_reservation_time_limit
    FROM public.projects
    WHERE projects.id = p_project_id;

    -- Clean up expired reservations for this worker across all projects
    UPDATE public.tasks t
    SET status = 'pending',
        assigned_to = NULL,
        assigned_at = NULL
    FROM public.projects p
    WHERE t.project_id = p.id
      AND t.assigned_to = p_worker_id
      AND t.status IN ('assigned', 'in_progress')
      AND t.assigned_at < NOW() - MAKE_INTERVAL(mins => GREATEST(COALESCE(NULLIF(p.reservation_time_limit_minutes, 0), 60), 1));

    -- Check if worker already has an active reservation for THIS project
    SELECT t.id, t.project_id
    INTO v_existing_reservation_task_id, v_existing_reservation_project_id
    FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE t.assigned_to = p_worker_id
      AND t.status IN ('assigned', 'in_progress')
      AND t.assigned_at >= NOW() - MAKE_INTERVAL(mins => GREATEST(COALESCE(NULLIF(p.reservation_time_limit_minutes, 0), 60), 1))
      AND t.project_id = p_project_id
    LIMIT 1;

    -- If worker has existing reservation for this project, return it
    IF v_existing_reservation_task_id IS NOT NULL THEN
        RETURN QUERY
        SELECT
            q.id,
            q.project_id,
            q.question_id,
            q.row_index,
            q.data,
            q.completed_replications,
            q.required_replications,
            q.is_answered,
            q.created_at,
            v_existing_reservation_task_id AS reservation_task_id
        FROM public.questions q
        JOIN public.tasks t ON t.question_id = q.id
        WHERE t.id = v_existing_reservation_task_id;
        RETURN;
    END IF;

    -- Check if worker has active reservation for DIFFERENT project (block new claim)
    SELECT t.id
    INTO v_existing_reservation_task_id
    FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE t.assigned_to = p_worker_id
      AND t.status IN ('assigned', 'in_progress')
      AND t.assigned_at >= NOW() - MAKE_INTERVAL(mins => GREATEST(COALESCE(NULLIF(p.reservation_time_limit_minutes, 0), 60), 1))
      AND t.project_id != p_project_id
    LIMIT 1;

    -- If worker has reservation for different project, return empty
    IF v_existing_reservation_task_id IS NOT NULL THEN
        RETURN;
    END IF;

    -- Clean up expired reservations for target project
    UPDATE public.tasks t
    SET status = 'pending',
        assigned_to = NULL,
        assigned_at = NULL
    WHERE t.project_id = p_project_id
      AND t.status IN ('assigned', 'in_progress')
      AND t.assigned_at < NOW() - MAKE_INTERVAL(mins => v_reservation_time_limit);

    -- Find next available question with row-level locking
    SELECT q.*
    INTO v_question_record
    FROM public.questions q
    WHERE q.project_id = p_project_id
      AND q.is_answered = false
      AND q.completed_replications < q.required_replications
      AND NOT EXISTS (
          SELECT 1 FROM public.tasks t
          WHERE t.question_id = q.id
            AND t.status IN ('assigned', 'in_progress')
            AND t.assigned_at >= NOW() - MAKE_INTERVAL(mins => v_reservation_time_limit)
      )
    ORDER BY q.row_index
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- If no question found, return empty
    IF v_question_record.id IS NULL THEN
        RETURN;
    END IF;

    -- Pre-generate UUID to avoid ambiguous RETURNING clause
    v_task_id := gen_random_uuid();

    -- Create task reservation with pre-generated ID
    INSERT INTO public.tasks (
        id,
        project_id,
        question_id,
        row_index,
        data,
        status,
        assigned_to,
        assigned_at
    )
    VALUES (
        v_task_id,
        p_project_id,
        v_question_record.id,
        v_question_record.row_index,
        v_question_record.data,
        'assigned',
        p_worker_id,
        NOW()
    );

    -- Return question data with reservation task ID
    RETURN QUERY
    SELECT
        v_question_record.id,
        v_question_record.project_id,
        v_question_record.question_id,
        v_question_record.row_index,
        v_question_record.data,
        v_question_record.completed_replications,
        v_question_record.required_replications,
        v_question_record.is_answered,
        v_question_record.created_at,
        v_task_id AS reservation_task_id;
END;
$$;


ALTER FUNCTION "public"."claim_next_available_question"("p_project_id" "uuid", "p_worker_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."claim_next_available_question"("p_project_id" "uuid", "p_worker_id" "uuid") IS 'Atomically claim next available question with reservation system';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_reservations"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    UPDATE public.tasks t
    SET status = 'pending',
        assigned_to = NULL,
        assigned_at = NULL
    FROM public.projects p
    WHERE t.project_id = p.id
      AND t.status IN ('assigned', 'in_progress')
      AND t.assigned_at < NOW() - MAKE_INTERVAL(mins => GREATEST(COALESCE(NULLIF(p.reservation_time_limit_minutes, 0), 60), 1));

    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN cleaned_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_reservations"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_reservations"() IS 'Clean up expired task reservations using per-project time limits';



CREATE OR REPLACE FUNCTION "public"."count_active_reservations_for_worker"("p_project_id" "uuid", "p_worker_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    active_count INTEGER;
    reservation_time_limit INTEGER;
BEGIN
    -- Get project reservation time limit
    SELECT COALESCE(reservation_time_limit_minutes, 60)
    INTO reservation_time_limit
    FROM public.projects
    WHERE id = p_project_id;

    -- Count active reservations
    SELECT COUNT(*)::INTEGER
    INTO active_count
    FROM public.tasks
    WHERE project_id = p_project_id
      AND assigned_to = p_worker_id
      AND status IN ('assigned', 'in_progress')
      AND assigned_at >= NOW() - MAKE_INTERVAL(mins => reservation_time_limit);

    RETURN active_count;
END;
$$;


ALTER FUNCTION "public"."count_active_reservations_for_worker"("p_project_id" "uuid", "p_worker_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."count_active_reservations_for_worker"("p_project_id" "uuid", "p_worker_id" "uuid") IS 'Count active task reservations for a worker within reservation window';



CREATE OR REPLACE FUNCTION "public"."count_claimable_questions"("p_project_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    claimable_count INTEGER;
    reservation_time_limit INTEGER;
BEGIN
    -- Get project reservation time limit
    SELECT COALESCE(reservation_time_limit_minutes, 60)
    INTO reservation_time_limit
    FROM public.projects
    WHERE id = p_project_id;

    -- Count questions that can be claimed
    SELECT COUNT(*)::INTEGER
    INTO claimable_count
    FROM public.questions q
    WHERE q.project_id = p_project_id
      AND q.is_answered = false
      AND q.completed_replications < q.required_replications
      AND NOT EXISTS (
          SELECT 1 FROM public.tasks t
          WHERE t.question_id = q.id
            AND t.status IN ('assigned', 'in_progress')
            AND t.assigned_at >= NOW() - MAKE_INTERVAL(mins => reservation_time_limit)
      );

    RETURN claimable_count;
END;
$$;


ALTER FUNCTION "public"."count_claimable_questions"("p_project_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."count_claimable_questions"("p_project_id" "uuid") IS 'Count questions available for claiming without violating reservations';



CREATE OR REPLACE FUNCTION "public"."create_user_invitation"("_email" "text", "_role" "public"."user_role", "_initial_password" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    invitation_id UUID;
    password_hash TEXT;
BEGIN
    -- Only root and managers can create invitations
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('root', 'manager')
    ) THEN
        RAISE EXCEPTION 'Only root users and managers can create invitations';
    END IF;

    -- Hash password using pgcrypto
    password_hash := crypt(_initial_password, gen_salt('bf'));

    -- Insert invitation
    INSERT INTO public.user_invitations (email, role, invited_by, initial_password_hash)
    VALUES (_email, _role, auth.uid(), password_hash)
    RETURNING id INTO invitation_id;

    RETURN invitation_id;
END;
$$;


ALTER FUNCTION "public"."create_user_invitation"("_email" "text", "_role" "public"."user_role", "_initial_password" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_user_invitation"("_email" "text", "_role" "public"."user_role", "_initial_password" "text") IS 'Create invitation for new user with hashed password';



CREATE OR REPLACE FUNCTION "public"."enforce_role_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Only root can assign root role
    IF NEW.role = 'root' AND NOT public.is_root(auth.uid()) THEN
        RAISE EXCEPTION 'Only root can assign the root role';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_role_update"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enforce_role_update"() IS 'Trigger function: prevent non-root users from assigning root role';



CREATE OR REPLACE FUNCTION "public"."generate_answer_id"("question_id" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    prefix TEXT;
    suffix TEXT;
    project_name TEXT;
    clean_name TEXT;
BEGIN
    project_name := split_part(question_id, '+', 2);
    prefix := substring(question_id from 1 for 24);
    suffix := substring(md5(random()::text || clock_timestamp()::text) from 1 for 24);

    clean_name := regexp_replace(project_name, '[^a-zA-Z0-9]', '', 'g');
    clean_name := substring(clean_name from 1 for 50);

    RETURN prefix || '+' || clean_name || '+answer+' || suffix;
END;
$$;


ALTER FUNCTION "public"."generate_answer_id"("question_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_answer_id"("question_id" "text") IS 'Generate unique answer ID: 24char+project_name+answer+24char';



CREATE OR REPLACE FUNCTION "public"."generate_question_id"("project_name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    prefix TEXT;
    suffix TEXT;
    clean_name TEXT;
BEGIN
    prefix := substring(md5(random()::text || clock_timestamp()::text) from 1 for 24);
    suffix := substring(md5(random()::text || clock_timestamp()::text) from 1 for 24);

    clean_name := regexp_replace(project_name, '[^a-zA-Z0-9]', '', 'g');
    clean_name := substring(clean_name from 1 for 50);

    RETURN prefix || '+' || clean_name || '+' || suffix;
END;
$$;


ALTER FUNCTION "public"."generate_question_id"("project_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_question_id"("project_name" "text") IS 'Generate unique question ID: 24char+project_name+24char';



CREATE OR REPLACE FUNCTION "public"."get_project_completion_stats"("project_uuid" "uuid") RETURNS TABLE("total_questions" integer, "answered_questions" integer, "completion_percentage" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_questions,
        COUNT(*) FILTER (WHERE is_answered = true)::INTEGER as answered_questions,
        CASE
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(*) FILTER (WHERE is_answered = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
        END as completion_percentage
    FROM public.questions
    WHERE project_id = project_uuid;
END;
$$;


ALTER FUNCTION "public"."get_project_completion_stats"("project_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_project_completion_stats"("project_uuid" "uuid") IS 'Get project completion statistics';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  default_dept_id uuid;
BEGIN
  -- Get the default department ID
  SELECT id INTO default_dept_id
  FROM public.departments
  WHERE name = 'Default Department'
  LIMIT 1;

  -- Insert new profile with department assignment
  INSERT INTO public.profiles (id, email, full_name, role, department_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'worker'),
    default_dept_id  -- Assign to default department
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Trigger function: automatically create profile when user signs up. Assigns new users to default department.';



CREATE OR REPLACE FUNCTION "public"."increment_project_completed_tasks"("project_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.projects
  SET completed_tasks = COALESCE(completed_tasks, 0) + 1
  WHERE id = project_id;
END;
$$;


ALTER FUNCTION "public"."increment_project_completed_tasks"("project_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_project_completed_tasks"("project_id" "uuid") IS 'Atomically increment completed_tasks counter when question is fully answered (all replications complete)';



CREATE OR REPLACE FUNCTION "public"."is_group_admin"("p_group_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND role = 'admin'
      AND left_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public.message_groups
    WHERE id = p_group_id
      AND created_by = p_user_id
  );
END;
$$;


ALTER FUNCTION "public"."is_group_admin"("p_group_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_group_admin"("p_group_id" "uuid", "p_user_id" "uuid") IS 'Check if a user is an admin of a group or the group creator. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';



CREATE OR REPLACE FUNCTION "public"."is_group_member"("p_group_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND left_at IS NULL
  );
END;
$$;


ALTER FUNCTION "public"."is_group_member"("p_group_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_group_member"("p_group_id" "uuid", "p_user_id" "uuid") IS 'Check if a user is an active member of a group. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';



CREATE OR REPLACE FUNCTION "public"."is_root"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = _user_id AND role = 'root'
    );
$$;


ALTER FUNCTION "public"."is_root"("_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_root"("_user_id" "uuid") IS 'Helper function to check if user has root role (avoids RLS recursion)';



CREATE OR REPLACE FUNCTION "public"."is_root_or_manager"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = _user_id AND role IN ('root', 'admin', 'manager')
    );
$$;


ALTER FUNCTION "public"."is_root_or_manager"("_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_root_or_manager"("_user_id" "uuid") IS 'Check if user has root, admin, or manager role for permission checks';



CREATE OR REPLACE FUNCTION "public"."mark_last_sign_in"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    UPDATE public.profiles
    SET last_sign_in_at = now()
    WHERE id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."mark_last_sign_in"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_last_sign_in"() IS 'Update user last sign-in timestamp';



CREATE OR REPLACE FUNCTION "public"."migrate_pre_provisioned_assignments"("p_user_id" "uuid", "p_user_email" "text") RETURNS TABLE("migrated_count" integer, "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_pre_provisioned_user_id UUID;
  v_migrated_count INTEGER := 0;
BEGIN
  -- Find the pre-provisioned user record by email (case-insensitive)
  SELECT id INTO v_pre_provisioned_user_id
  FROM public.pre_provisioned_users
  WHERE LOWER(email) = LOWER(p_user_email)
  LIMIT 1;

  -- If no pre-provisioned record found, return early (not an error)
  IF v_pre_provisioned_user_id IS NULL THEN
    RETURN QUERY SELECT 0, NULL::TEXT;
    RETURN;
  END IF;

  -- Migrate assignments with explicit transaction control
  BEGIN
    -- Step 1: Insert assignments into project_assignments
    INSERT INTO public.project_assignments (worker_id, project_id, assigned_by, assigned_at, priority)
    SELECT
      p_user_id,
      ppa.project_id,
      ppa.assigned_by,
      ppa.assigned_at,
      50 AS priority -- Default priority
    FROM public.pre_provisioned_project_assignments ppa
    WHERE ppa.pre_provisioned_user_id = v_pre_provisioned_user_id
      AND NOT EXISTS (
        -- Avoid duplicates in case of retry
        SELECT 1
        FROM public.project_assignments pa
        WHERE pa.worker_id = p_user_id
          AND pa.project_id = ppa.project_id
      );

    GET DIAGNOSTICS v_migrated_count = ROW_COUNT;

    -- Step 2: Only clean up if migration succeeded OR no assignments to migrate
    IF v_migrated_count > 0 OR NOT EXISTS (
      SELECT 1 FROM public.pre_provisioned_project_assignments
      WHERE pre_provisioned_user_id = v_pre_provisioned_user_id
    ) THEN
      -- Clean up migrated assignments from pre-provisioned table
      DELETE FROM public.pre_provisioned_project_assignments
      WHERE pre_provisioned_user_id = v_pre_provisioned_user_id;

      -- Clean up pre_provisioned_users record
      DELETE FROM public.pre_provisioned_users
      WHERE id = v_pre_provisioned_user_id;

      -- Log successful migration
      RAISE NOTICE 'Successfully migrated % assignment(s) for user %', v_migrated_count, p_user_email;
    END IF;

    -- Return success
    RETURN QUERY SELECT v_migrated_count, NULL::TEXT;

  EXCEPTION
    WHEN OTHERS THEN
      -- DO NOT delete pre-provisioned records on error
      -- This preserves data for retry or manual intervention
      RAISE WARNING 'Migration failed for user % (ID: %): %', p_user_email, p_user_id, SQLERRM;

      -- Return error details for client-side handling
      RETURN QUERY SELECT 0, SQLERRM;
  END;
END;
$$;


ALTER FUNCTION "public"."migrate_pre_provisioned_assignments"("p_user_id" "uuid", "p_user_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."migrate_pre_provisioned_assignments"("p_user_id" "uuid", "p_user_email" "text") IS 'Migrates project assignments from pre_provisioned_project_assignments to project_assignments when a pre-provisioned user signs in via OAuth. Uses SECURITY DEFINER to bypass RLS restrictions. Improved version with explicit transaction control and data preservation on failure.';



CREATE OR REPLACE FUNCTION "public"."release_task_by_id"("p_task_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    task_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.tasks
        WHERE id = p_task_id
          AND assigned_to = auth.uid()
          AND status IN ('assigned', 'in_progress')
    ) INTO task_exists;

    IF NOT task_exists THEN
        RETURN FALSE;
    END IF;

    UPDATE public.tasks
    SET status = 'pending',
        assigned_to = NULL,
        assigned_at = NULL,
        updated_at = NOW()
    WHERE id = p_task_id
      AND assigned_to = auth.uid()
      AND status IN ('assigned', 'in_progress');

    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."release_task_by_id"("p_task_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."release_task_by_id"("p_task_id" "uuid") IS 'Release a specific task by ID';



CREATE OR REPLACE FUNCTION "public"."release_worker_tasks"() RETURNS TABLE("released_count" integer, "released_task_ids" "uuid"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    released_ids UUID[];
    count_released INTEGER;
BEGIN
    SELECT ARRAY_AGG(id)
    INTO released_ids
    FROM public.tasks
    WHERE assigned_to = auth.uid()
      AND status IN ('assigned', 'in_progress');

    UPDATE public.tasks
    SET status = 'pending',
        assigned_to = NULL,
        assigned_at = NULL,
        updated_at = NOW()
    WHERE assigned_to = auth.uid()
      AND status IN ('assigned', 'in_progress');

    GET DIAGNOSTICS count_released = ROW_COUNT;

    RETURN QUERY SELECT count_released, COALESCE(released_ids, ARRAY[]::UUID[]);
END;
$$;


ALTER FUNCTION "public"."release_worker_tasks"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."release_worker_tasks"() IS 'Release all tasks assigned to current user';



CREATE OR REPLACE FUNCTION "public"."update_question_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.questions
    SET
        completed_replications = (
            SELECT COUNT(*) FROM public.answers
            WHERE question_id = NEW.question_id
        ),
        is_answered = (
            SELECT COUNT(*) >= required_replications
            FROM public.answers
            WHERE question_id = NEW.question_id
        ),
        updated_at = now()
    WHERE id = NEW.question_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_question_completion"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_question_completion"() IS 'Trigger function: update question completion status when answer is inserted';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_updated_at_column"() IS 'Generic trigger function to update updated_at timestamp';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "answer_id" "text" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "answer_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "completion_time" timestamp with time zone NOT NULL,
    "aht_seconds" integer NOT NULL,
    "skipped" boolean DEFAULT false NOT NULL,
    "skip_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."answers" OWNER TO "postgres";


COMMENT ON TABLE "public"."answers" IS 'Worker answers/submissions for questions';



COMMENT ON COLUMN "public"."answers"."answer_id" IS 'Unique ID format: 24char+project_name+answer+24char';



COMMENT ON COLUMN "public"."answers"."aht_seconds" IS 'Answer Handle Time: completion_time - start_time';



CREATE TABLE IF NOT EXISTS "public"."audio_asset_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "audio_asset_id" "uuid",
    "drive_file_id" "text",
    "event_type" "text" NOT NULL,
    "message" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audio_asset_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audio_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "drive_file_id" "text" NOT NULL,
    "drive_file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "public_url" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "size_bytes" bigint,
    "checksum" "text",
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "error_message" "text",
    "ingested_at" timestamp with time zone,
    "last_verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audio_assets_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'transferring'::"text", 'ready'::"text", 'failed'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."audio_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "uuid",
    "project_id" "uuid",
    "level" "text" NOT NULL,
    "message" "text" NOT NULL,
    "context" "text",
    "metadata" "jsonb",
    "stack" "text",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "client_logs_level_check" CHECK (("level" = ANY (ARRAY['info'::"text", 'warn'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."client_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."client_logs" IS 'Client-side error and console logging';



CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "manager_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."final_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "final_answer_id" "text" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "question_uuid" "uuid" NOT NULL,
    "replication_index" integer DEFAULT 1 NOT NULL,
    "source_answer_uuid" "uuid",
    "review_submission_uuid" "uuid",
    "deliverable" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."final_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "left_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_read_at" timestamp with time zone
);


ALTER TABLE "public"."group_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."group_members" IS 'Tracks individual user membership in conversation groups. Supports roles (admin/member) and tracks when users join/leave.';



COMMENT ON COLUMN "public"."group_members"."role" IS 'Member role: "admin" can manage group, "member" is regular participant';



COMMENT ON COLUMN "public"."group_members"."left_at" IS 'Timestamp when user left the group. NULL = still active member';



COMMENT ON COLUMN "public"."group_members"."last_read_at" IS 'Timestamp when the user last viewed/read messages in this group. Used to calculate unread message count.';



CREATE TABLE IF NOT EXISTS "public"."message_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "recipient_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    "avatar_url" "text",
    "is_active" boolean DEFAULT true,
    "group_type" "text" DEFAULT 'conversation'::"text"
);


ALTER TABLE "public"."message_groups" OWNER TO "postgres";


COMMENT ON TABLE "public"."message_groups" IS 'Saved recipient groups for easy message broadcasting. Created by managers/admins for frequently used distribution lists.';



COMMENT ON COLUMN "public"."message_groups"."description" IS 'Optional description of the group purpose';



COMMENT ON COLUMN "public"."message_groups"."avatar_url" IS 'Optional URL to group avatar/icon';



COMMENT ON COLUMN "public"."message_groups"."is_active" IS 'Whether the group is active. Inactive groups are archived but not deleted';



COMMENT ON COLUMN "public"."message_groups"."group_type" IS 'Type of group: "conversation" for WhatsApp-style groups, "saved_list" for broadcast recipient lists';



CREATE TABLE IF NOT EXISTS "public"."message_recipients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."message_recipients" OWNER TO "postgres";


COMMENT ON TABLE "public"."message_recipients" IS 'Junction table tracking message recipients. Includes read_at timestamp for read receipts and deleted_at for soft delete from recipient inbox.';



COMMENT ON COLUMN "public"."message_recipients"."read_at" IS 'Read receipt timestamp. NULL = unread. Non-null = timestamp when recipient read the message.';



COMMENT ON COLUMN "public"."message_recipients"."deleted_at" IS 'Soft delete from recipient inbox. NULL = visible. Non-null = deleted from this recipient view.';



CREATE TABLE IF NOT EXISTS "public"."message_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."message_threads" OWNER TO "postgres";


COMMENT ON TABLE "public"."message_threads" IS 'Message threads (conversations). Each thread has a subject and contains multiple messages.';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "group_id" "uuid"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."messages" IS 'Individual messages within threads. Supports soft delete (deleted_at) and attachments (JSONB array).';



COMMENT ON COLUMN "public"."messages"."attachments" IS 'JSONB array of attachment metadata. Each entry contains: {path: string, name: string, size: number, type: string}';



COMMENT ON COLUMN "public"."messages"."deleted_at" IS 'Soft delete timestamp. NULL = active message. Non-null = deleted (preserved for audit trail).';



COMMENT ON COLUMN "public"."messages"."group_id" IS 'Optional reference to a conversation group. If set, this message was sent to a group rather than individual recipients.';



CREATE TABLE IF NOT EXISTS "public"."pre_provisioned_project_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pre_provisioned_user_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pre_provisioned_project_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."pre_provisioned_project_assignments" IS 'Project assignments for pre-provisioned users awaiting OAuth sign-in. When user signs in, assignments are migrated to project_assignments table.';



COMMENT ON COLUMN "public"."pre_provisioned_project_assignments"."pre_provisioned_user_id" IS 'Reference to pre-provisioned user (before they have a profiles entry)';



COMMENT ON COLUMN "public"."pre_provisioned_project_assignments"."project_id" IS 'Project the user will be assigned to after sign-in';



COMMENT ON COLUMN "public"."pre_provisioned_project_assignments"."assigned_by" IS 'Manager who made the assignment';



CREATE TABLE IF NOT EXISTS "public"."pre_provisioned_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "public"."user_role" DEFAULT 'worker'::"public"."user_role" NOT NULL,
    "department_id" "uuid",
    "provisioned_by" "uuid",
    "provisioned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pre_provisioned_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."pre_provisioned_users" IS 'Pre-provisioned users awaiting OAuth sign-in. When a user signs in with OAuth, their email is matched against this table to assign pre-configured role and department.';



COMMENT ON COLUMN "public"."pre_provisioned_users"."email" IS 'Email address that will be matched during OAuth sign-in';



COMMENT ON COLUMN "public"."pre_provisioned_users"."role" IS 'Role to assign when user signs in (default: worker)';



COMMENT ON COLUMN "public"."pre_provisioned_users"."department_id" IS 'Department to assign when user signs in';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'worker'::"public"."user_role" NOT NULL,
    "initial_password_hash" "text",
    "password_changed_at" timestamp with time zone,
    "suspended" boolean DEFAULT false NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "department_id" "uuid",
    "reports_to" "uuid",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "check_no_self_reporting" CHECK (("id" <> "reports_to"))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles extending Supabase auth.users';



COMMENT ON COLUMN "public"."profiles"."role" IS 'User role determining permissions';



COMMENT ON COLUMN "public"."profiles"."initial_password_hash" IS 'Stored to detect first-time login';



COMMENT ON COLUMN "public"."profiles"."suspended" IS 'If true, user cannot access system';



COMMENT ON COLUMN "public"."profiles"."deleted_at" IS 'Timestamp when user was soft deleted. NULL = active user, NOT NULL = deleted user. Soft deleted users have their email anonymized but full_name preserved for audit trail.';



CREATE TABLE IF NOT EXISTS "public"."project_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "priority" integer DEFAULT 50 NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "can_transcribe" boolean DEFAULT true NOT NULL,
    "can_review" boolean DEFAULT false NOT NULL,
    "can_qc" boolean DEFAULT false NOT NULL,
    "priority_transcribe" integer DEFAULT 50 NOT NULL,
    "priority_review" integer DEFAULT 10 NOT NULL,
    "priority_qc" integer DEFAULT 90 NOT NULL
);


ALTER TABLE "public"."project_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."project_assignments" IS 'Many-to-many: Workers assigned to projects';



COMMENT ON COLUMN "public"."project_assignments"."priority" IS 'Priority level: 0 (highest) to 100 (lowest)';



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "template_id" "uuid" NOT NULL,
    "language" "text",
    "locale" "text" DEFAULT 'en_us'::"text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "google_sheet_url" "text" NOT NULL,
    "total_tasks" integer DEFAULT 0,
    "completed_tasks" integer DEFAULT 0,
    "replications_per_question" integer DEFAULT 1 NOT NULL,
    "training_module_id" "uuid",
    "training_required" boolean DEFAULT false,
    "reservation_time_limit_minutes" integer DEFAULT 60 NOT NULL,
    "average_handle_time_minutes" integer,
    "enable_skip_button" boolean DEFAULT false NOT NULL,
    "skip_reasons" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "instructions" "text",
    "instructions_pdf_url" "text",
    "instructions_google_docs_url" "text",
    "due_date" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "import_expected_assets" integer,
    "import_ready_assets" integer,
    "import_failed_assets" integer,
    "import_started_at" timestamp with time zone,
    "import_last_updated" timestamp with time zone,
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['importing'::"text", 'ready'::"text", 'active'::"text", 'paused'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."projects" IS 'Active annotation projects with configuration';



COMMENT ON COLUMN "public"."projects"."replications_per_question" IS 'Number of workers that must answer each question';



COMMENT ON COLUMN "public"."projects"."reservation_time_limit_minutes" IS 'Max time a worker can hold a task reservation';



CREATE TABLE IF NOT EXISTS "public"."qc_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "qc_id" "text" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "question_uuid" "uuid" NOT NULL,
    "review_submission_uuid" "uuid" NOT NULL,
    "qc_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."qc_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_asset_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "question_uuid" "uuid" NOT NULL,
    "question_id" "text" NOT NULL,
    "replication_index" integer DEFAULT 1 NOT NULL,
    "asset_source_id" "text",
    "current_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "transcription_task_uuid" "uuid",
    "transcription_answer_uuid" "uuid",
    "review_task_uuid" "uuid",
    "review_submission_uuid" "uuid",
    "qc_record_uuid" "uuid",
    "final_answer_uuid" "uuid",
    "transcriber_uuid" "uuid",
    "reviewer_uuid" "uuid",
    "qc_reviewer_uuid" "uuid",
    "transcription_submitted_at" timestamp with time zone,
    "review_submitted_at" timestamp with time zone,
    "qc_created_at" timestamp with time zone,
    "finalized_at" timestamp with time zone,
    "deliverable_url" "text",
    "review_json_url" "text",
    "qc_json_url" "text",
    "audio_asset_id" "uuid",
    "supabase_audio_path" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "question_asset_status_current_status_check" CHECK (("current_status" = ANY (ARRAY['pending'::"text", 'transcribed'::"text", 'review_pending'::"text", 'reviewed'::"text", 'qc_ready'::"text", 'completed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."question_asset_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "question_id" "text" NOT NULL,
    "row_index" integer NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "required_replications" integer DEFAULT 1 NOT NULL,
    "completed_replications" integer DEFAULT 0 NOT NULL,
    "is_answered" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "audio_asset_id" "uuid",
    "supabase_audio_path" "text"
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


COMMENT ON TABLE "public"."questions" IS 'Individual questions/rows from projects requiring answers';



COMMENT ON COLUMN "public"."questions"."question_id" IS 'Unique ID format: 24char+project_name+24char';



COMMENT ON COLUMN "public"."questions"."required_replications" IS 'How many workers must answer this question';



COMMENT ON COLUMN "public"."questions"."completed_replications" IS 'Current number of answers submitted';



CREATE TABLE IF NOT EXISTS "public"."review_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_id" "text" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "question_uuid" "uuid" NOT NULL,
    "answer_uuid" "uuid" NOT NULL,
    "reviewer_id" "uuid",
    "review_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "rating_overall" integer,
    "highlight_tags" "text"[] DEFAULT '{}'::"text"[],
    "feedback_to_transcriber" "text",
    "internal_notes" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."review_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "question_uuid" "uuid" NOT NULL,
    "answer_uuid" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "assigned_to" "uuid",
    "assigned_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "review_tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'assigned'::"text", 'completed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."review_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_answer_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "task_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "field_id" "text",
    "field_name" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_answer_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_answer_events" IS 'Event logging for task interactions (paste detection, etc.)';



CREATE TABLE IF NOT EXISTS "public"."task_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "answer_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "completion_time" timestamp with time zone NOT NULL,
    "aht_seconds" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_answers" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_answers" IS 'Alternative answer tracking (may be superseded by answers table)';



CREATE TABLE IF NOT EXISTS "public"."task_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "google_sheet_url" "text" NOT NULL,
    "column_config" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "modality" "text" DEFAULT 'spreadsheet'::"text" NOT NULL,
    "modality_config" "jsonb" DEFAULT '{}'::"jsonb",
    "label_ontology" "jsonb",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "review_enabled" boolean DEFAULT false NOT NULL,
    "review_stage_config" "jsonb",
    CONSTRAINT "task_templates_modality_check" CHECK (("modality" = ANY (ARRAY['spreadsheet'::"text", 'audio-short'::"text", 'audio-long'::"text", 'text'::"text", 'image'::"text", 'video'::"text", 'multimodal'::"text", 'chatbot-eval'::"text"]))),
    CONSTRAINT "valid_modality" CHECK (("modality" = ANY (ARRAY['spreadsheet'::"text", 'audio-short'::"text", 'audio-long'::"text", 'text'::"text", 'image'::"text", 'video'::"text", 'multimodal'::"text", 'chatbot-eval'::"text"])))
);


ALTER TABLE "public"."task_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_templates" IS 'Reusable task configurations with multi-modality support';



COMMENT ON COLUMN "public"."task_templates"."column_config" IS 'JSON array defining form fields';



COMMENT ON COLUMN "public"."task_templates"."modality" IS 'Type of task modality: spreadsheet, audio-short, audio-long, text, image, video, multimodal, chatbot-eval';



CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "question_id" "uuid",
    "row_index" integer NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "assigned_to" "uuid",
    "assigned_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "completion_time_seconds" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'assigned'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks" IS 'Task reservations and completion tracking';



COMMENT ON COLUMN "public"."tasks"."status" IS 'pending (available) | assigned (reserved) | completed';



CREATE TABLE IF NOT EXISTS "public"."training_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "video_url" "text",
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."training_modules" OWNER TO "postgres";


COMMENT ON TABLE "public"."training_modules" IS 'Reusable training content for projects';



CREATE TABLE IF NOT EXISTS "public"."user_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "initial_password_hash" "text" NOT NULL,
    "invited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "used" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."user_invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_invitations" IS 'Pending user invitations created by managers/root';



CREATE OR REPLACE VIEW "public"."worker_analytics_summary" AS
 SELECT "worker_id",
    ("count"(*))::integer AS "total_completed_tasks",
    ("count"(DISTINCT "project_id"))::integer AS "distinct_projects",
    ("count"(*) FILTER (WHERE ("completion_time" >= ("now"() - '24:00:00'::interval))))::integer AS "tasks_last_24h",
    ("count"(*) FILTER (WHERE (("completion_time")::"date" = CURRENT_DATE)))::integer AS "tasks_today",
    (COALESCE("sum"("aht_seconds"), (0)::bigint))::integer AS "total_active_seconds",
        CASE
            WHEN ("count"(*) > 0) THEN "round"((("sum"("aht_seconds"))::numeric / ("count"(*))::numeric), 2)
            ELSE NULL::numeric
        END AS "avg_aht_seconds",
    "min"("start_time") AS "first_active_at",
    "max"("completion_time") AS "last_active_at"
   FROM "public"."answers" "a"
  GROUP BY "worker_id";


ALTER VIEW "public"."worker_analytics_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."worker_analytics_summary" IS 'Core worker analytics aggregates derived from answers table';



CREATE OR REPLACE VIEW "public"."worker_daily_activity" AS
 SELECT "worker_id",
    "project_id",
    ("completion_time")::"date" AS "activity_date",
    ("count"(*))::integer AS "tasks_completed",
    (COALESCE("sum"("aht_seconds"), (0)::bigint))::integer AS "total_active_seconds"
   FROM "public"."answers" "a"
  GROUP BY "worker_id", "project_id", (("completion_time")::"date");


ALTER VIEW "public"."worker_daily_activity" OWNER TO "postgres";


COMMENT ON VIEW "public"."worker_daily_activity" IS 'Per-worker, per-project activity counts by day for charting';



CREATE TABLE IF NOT EXISTS "public"."worker_plugin_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "plugin_type" "text" NOT NULL,
    "metric_key" "text" NOT NULL,
    "metric_value" numeric NOT NULL,
    "metric_unit" "text",
    "metric_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "recorded_at" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."worker_plugin_metrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."worker_plugin_metrics" IS 'Extensible plugin-specific metrics (e.g., audio minutes processed)';



CREATE OR REPLACE VIEW "public"."worker_project_performance" AS
 SELECT "worker_id",
    "project_id",
    ("count"(*))::integer AS "tasks_completed",
    (COALESCE("sum"("aht_seconds"), (0)::bigint))::integer AS "total_active_seconds",
        CASE
            WHEN ("count"(*) > 0) THEN "round"((("sum"("aht_seconds"))::numeric / ("count"(*))::numeric), 2)
            ELSE NULL::numeric
        END AS "avg_aht_seconds",
    "min"("start_time") AS "first_active_at",
    "max"("completion_time") AS "last_active_at"
   FROM "public"."answers" "a"
  GROUP BY "worker_id", "project_id";


ALTER VIEW "public"."worker_project_performance" OWNER TO "postgres";


COMMENT ON VIEW "public"."worker_project_performance" IS 'Per-project performance breakdown for each worker';



CREATE TABLE IF NOT EXISTS "public"."worker_training_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "uuid",
    "training_module_id" "uuid",
    "project_id" "uuid",
    "started_at" timestamp with time zone,
    "duration_seconds" integer,
    "completed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."worker_training_completions" OWNER TO "postgres";


COMMENT ON TABLE "public"."worker_training_completions" IS 'Tracks which workers completed which training modules';



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_answer_id_key" UNIQUE ("answer_id");



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audio_asset_events"
    ADD CONSTRAINT "audio_asset_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audio_assets"
    ADD CONSTRAINT "audio_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_logs"
    ADD CONSTRAINT "client_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."final_answers"
    ADD CONSTRAINT "final_answers_final_answer_id_key" UNIQUE ("final_answer_id");



ALTER TABLE ONLY "public"."final_answers"
    ADD CONSTRAINT "final_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_user_id_key" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_groups"
    ADD CONSTRAINT "message_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_recipients"
    ADD CONSTRAINT "message_recipients_message_id_recipient_id_key" UNIQUE ("message_id", "recipient_id");



ALTER TABLE ONLY "public"."message_recipients"
    ADD CONSTRAINT "message_recipients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pre_provisioned_project_assignments"
    ADD CONSTRAINT "pre_provisioned_project_assig_pre_provisioned_user_id_proje_key" UNIQUE ("pre_provisioned_user_id", "project_id");



ALTER TABLE ONLY "public"."pre_provisioned_project_assignments"
    ADD CONSTRAINT "pre_provisioned_project_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pre_provisioned_users"
    ADD CONSTRAINT "pre_provisioned_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."pre_provisioned_users"
    ADD CONSTRAINT "pre_provisioned_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_assignments"
    ADD CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_assignments"
    ADD CONSTRAINT "project_assignments_worker_id_project_id_key" UNIQUE ("worker_id", "project_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qc_records"
    ADD CONSTRAINT "qc_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qc_records"
    ADD CONSTRAINT "qc_records_qc_id_key" UNIQUE ("qc_id");



ALTER TABLE ONLY "public"."question_asset_status"
    ADD CONSTRAINT "question_asset_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_asset_status"
    ADD CONSTRAINT "question_asset_status_question_uuid_key" UNIQUE ("question_uuid");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_project_id_question_id_key" UNIQUE ("project_id", "question_id");



ALTER TABLE ONLY "public"."review_submissions"
    ADD CONSTRAINT "review_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_submissions"
    ADD CONSTRAINT "review_submissions_review_id_key" UNIQUE ("review_id");



ALTER TABLE ONLY "public"."review_tasks"
    ADD CONSTRAINT "review_tasks_answer_uuid_key" UNIQUE ("answer_uuid");



ALTER TABLE ONLY "public"."review_tasks"
    ADD CONSTRAINT "review_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_answer_events"
    ADD CONSTRAINT "task_answer_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_answers"
    ADD CONSTRAINT "task_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_templates"
    ADD CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."training_modules"
    ADD CONSTRAINT "training_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."worker_plugin_metrics"
    ADD CONSTRAINT "worker_plugin_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."worker_training_completions"
    ADD CONSTRAINT "worker_training_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."worker_training_completions"
    ADD CONSTRAINT "worker_training_completions_worker_id_training_module_id_pr_key" UNIQUE ("worker_id", "training_module_id", "project_id");



CREATE INDEX "idx_answers_answer_id" ON "public"."answers" USING "btree" ("answer_id");



CREATE INDEX "idx_answers_project_id" ON "public"."answers" USING "btree" ("project_id");



CREATE INDEX "idx_answers_question_id" ON "public"."answers" USING "btree" ("question_id");



CREATE INDEX "idx_answers_skipped" ON "public"."answers" USING "btree" ("skipped") WHERE ("skipped" = true);



CREATE INDEX "idx_answers_worker_id" ON "public"."answers" USING "btree" ("worker_id");



CREATE INDEX "idx_audio_asset_events_audio_asset_id" ON "public"."audio_asset_events" USING "btree" ("audio_asset_id");



CREATE INDEX "idx_audio_asset_events_event_type" ON "public"."audio_asset_events" USING "btree" ("event_type");



CREATE INDEX "idx_audio_asset_events_project_id" ON "public"."audio_asset_events" USING "btree" ("project_id");



CREATE INDEX "idx_audio_assets_drive_file_id" ON "public"."audio_assets" USING "btree" ("drive_file_id");



CREATE INDEX "idx_audio_assets_project_id" ON "public"."audio_assets" USING "btree" ("project_id");



CREATE INDEX "idx_audio_assets_status" ON "public"."audio_assets" USING "btree" ("status");



CREATE INDEX "idx_client_logs_occurred_at" ON "public"."client_logs" USING "btree" ("occurred_at" DESC);



CREATE INDEX "idx_client_logs_project_id" ON "public"."client_logs" USING "btree" ("project_id");



CREATE INDEX "idx_client_logs_worker_id" ON "public"."client_logs" USING "btree" ("worker_id");



CREATE INDEX "idx_departments_manager_id" ON "public"."departments" USING "btree" ("manager_id");



CREATE INDEX "idx_final_answers_final_answer_id" ON "public"."final_answers" USING "btree" ("final_answer_id");



CREATE INDEX "idx_final_answers_project_id" ON "public"."final_answers" USING "btree" ("project_id");



CREATE INDEX "idx_final_answers_question_uuid" ON "public"."final_answers" USING "btree" ("question_uuid");



CREATE INDEX "idx_final_answers_review_submission_uuid" ON "public"."final_answers" USING "btree" ("review_submission_uuid");



CREATE INDEX "idx_final_answers_source_answer_uuid" ON "public"."final_answers" USING "btree" ("source_answer_uuid");



CREATE INDEX "idx_group_members_active" ON "public"."group_members" USING "btree" ("group_id", "user_id") WHERE ("left_at" IS NULL);



CREATE INDEX "idx_group_members_group_id" ON "public"."group_members" USING "btree" ("group_id");



CREATE INDEX "idx_group_members_user_id" ON "public"."group_members" USING "btree" ("user_id");



CREATE INDEX "idx_message_groups_created_by" ON "public"."message_groups" USING "btree" ("created_by");



CREATE INDEX "idx_message_recipients_message_id" ON "public"."message_recipients" USING "btree" ("message_id");



CREATE INDEX "idx_message_recipients_recipient_id" ON "public"."message_recipients" USING "btree" ("recipient_id");



CREATE INDEX "idx_message_recipients_unread" ON "public"."message_recipients" USING "btree" ("recipient_id", "read_at") WHERE (("read_at" IS NULL) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_message_threads_created_by" ON "public"."message_threads" USING "btree" ("created_by");



CREATE INDEX "idx_messages_group_id" ON "public"."messages" USING "btree" ("group_id");



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_messages_sent_at" ON "public"."messages" USING "btree" ("sent_at" DESC);



CREATE INDEX "idx_messages_thread_id" ON "public"."messages" USING "btree" ("thread_id");



CREATE INDEX "idx_pre_provisioned_project_assignments_assigned_by" ON "public"."pre_provisioned_project_assignments" USING "btree" ("assigned_by");



CREATE INDEX "idx_pre_provisioned_project_assignments_project" ON "public"."pre_provisioned_project_assignments" USING "btree" ("project_id");



CREATE INDEX "idx_pre_provisioned_project_assignments_user" ON "public"."pre_provisioned_project_assignments" USING "btree" ("pre_provisioned_user_id");



CREATE INDEX "idx_pre_provisioned_users_email" ON "public"."pre_provisioned_users" USING "btree" ("email");



CREATE INDEX "idx_pre_provisioned_users_email_lower" ON "public"."pre_provisioned_users" USING "btree" ("lower"("email"));



COMMENT ON INDEX "public"."idx_pre_provisioned_users_email_lower" IS 'Case-insensitive email index for faster pre-provisioned user lookups during OAuth sign-in. Prevents email case mismatches from blocking user onboarding.';



CREATE INDEX "idx_pre_provisioned_users_provisioned_by" ON "public"."pre_provisioned_users" USING "btree" ("provisioned_by");



CREATE INDEX "idx_profiles_deleted_at_null" ON "public"."profiles" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_profiles_department_id" ON "public"."profiles" USING "btree" ("department_id");



CREATE INDEX "idx_profiles_email_lower" ON "public"."profiles" USING "btree" ("lower"("email"));



COMMENT ON INDEX "public"."idx_profiles_email_lower" IS 'Case-insensitive email index for profile lookups. Improves query performance when matching users by email.';



CREATE INDEX "idx_profiles_reports_to" ON "public"."profiles" USING "btree" ("reports_to");



CREATE INDEX "idx_project_assignments_worker_priority" ON "public"."project_assignments" USING "btree" ("worker_id", "priority");



CREATE INDEX "idx_projects_enable_skip" ON "public"."projects" USING "btree" ("enable_skip_button") WHERE ("enable_skip_button" = true);



CREATE INDEX "idx_projects_training_module" ON "public"."projects" USING "btree" ("training_module_id");



CREATE INDEX "idx_qc_records_project_id" ON "public"."qc_records" USING "btree" ("project_id");



CREATE INDEX "idx_qc_records_qc_id" ON "public"."qc_records" USING "btree" ("qc_id");



CREATE INDEX "idx_qc_records_question_uuid" ON "public"."qc_records" USING "btree" ("question_uuid");



CREATE INDEX "idx_qc_records_review_submission_uuid" ON "public"."qc_records" USING "btree" ("review_submission_uuid");



CREATE INDEX "idx_question_asset_status_audio_asset_id" ON "public"."question_asset_status" USING "btree" ("audio_asset_id");



CREATE INDEX "idx_question_asset_status_current_status" ON "public"."question_asset_status" USING "btree" ("current_status");



CREATE INDEX "idx_question_asset_status_project_id" ON "public"."question_asset_status" USING "btree" ("project_id");



CREATE INDEX "idx_question_asset_status_reviewer_uuid" ON "public"."question_asset_status" USING "btree" ("reviewer_uuid");



CREATE INDEX "idx_question_asset_status_transcriber_uuid" ON "public"."question_asset_status" USING "btree" ("transcriber_uuid");



CREATE INDEX "idx_questions_audio_asset_id" ON "public"."questions" USING "btree" ("audio_asset_id");



CREATE INDEX "idx_questions_is_answered" ON "public"."questions" USING "btree" ("is_answered");



CREATE INDEX "idx_questions_project_id" ON "public"."questions" USING "btree" ("project_id");



CREATE INDEX "idx_questions_question_id" ON "public"."questions" USING "btree" ("question_id");



CREATE INDEX "idx_review_submissions_answer_uuid" ON "public"."review_submissions" USING "btree" ("answer_uuid");



CREATE INDEX "idx_review_submissions_project_id" ON "public"."review_submissions" USING "btree" ("project_id");



CREATE INDEX "idx_review_submissions_question_uuid" ON "public"."review_submissions" USING "btree" ("question_uuid");



CREATE INDEX "idx_review_submissions_review_id" ON "public"."review_submissions" USING "btree" ("review_id");



CREATE INDEX "idx_review_submissions_reviewer_id" ON "public"."review_submissions" USING "btree" ("reviewer_id");



CREATE INDEX "idx_review_tasks_assigned_to" ON "public"."review_tasks" USING "btree" ("assigned_to");



CREATE INDEX "idx_review_tasks_project_id" ON "public"."review_tasks" USING "btree" ("project_id");



CREATE INDEX "idx_review_tasks_question_uuid" ON "public"."review_tasks" USING "btree" ("question_uuid");



CREATE INDEX "idx_review_tasks_status" ON "public"."review_tasks" USING "btree" ("status");



CREATE INDEX "idx_task_answer_events_created_at" ON "public"."task_answer_events" USING "btree" ("created_at");



CREATE INDEX "idx_task_answer_events_project" ON "public"."task_answer_events" USING "btree" ("project_id");



CREATE INDEX "idx_task_answer_events_task" ON "public"."task_answer_events" USING "btree" ("task_id");



CREATE INDEX "idx_task_answer_events_worker" ON "public"."task_answer_events" USING "btree" ("worker_id");



CREATE INDEX "idx_task_answers_created_at" ON "public"."task_answers" USING "btree" ("created_at");



CREATE INDEX "idx_task_answers_project_id" ON "public"."task_answers" USING "btree" ("project_id");



CREATE INDEX "idx_task_answers_task_id" ON "public"."task_answers" USING "btree" ("task_id");



CREATE INDEX "idx_task_answers_worker_id" ON "public"."task_answers" USING "btree" ("worker_id");



CREATE INDEX "idx_task_templates_modality" ON "public"."task_templates" USING "btree" ("modality");



CREATE INDEX "idx_tasks_assigned_to" ON "public"."tasks" USING "btree" ("assigned_to");



CREATE INDEX "idx_tasks_completed_at" ON "public"."tasks" USING "btree" ("completed_at") WHERE ("completed_at" IS NOT NULL);



CREATE INDEX "idx_tasks_project_id" ON "public"."tasks" USING "btree" ("project_id");



CREATE INDEX "idx_tasks_question_id" ON "public"."tasks" USING "btree" ("question_id");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");



CREATE INDEX "idx_worker_plugin_metrics_plugin_date" ON "public"."worker_plugin_metrics" USING "btree" ("plugin_type", "recorded_at");



CREATE INDEX "idx_worker_plugin_metrics_worker_id" ON "public"."worker_plugin_metrics" USING "btree" ("worker_id");



CREATE INDEX "idx_worker_training_completions_worker" ON "public"."worker_training_completions" USING "btree" ("worker_id", "project_id");



CREATE OR REPLACE TRIGGER "trg_enforce_role_update" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_role_update"();



CREATE OR REPLACE TRIGGER "trigger_add_creator_to_group" AFTER INSERT ON "public"."message_groups" FOR EACH ROW EXECUTE FUNCTION "public"."add_creator_to_group"();



CREATE OR REPLACE TRIGGER "update_pre_provisioned_project_assignments_updated_at" BEFORE UPDATE ON "public"."pre_provisioned_project_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pre_provisioned_users_updated_at" BEFORE UPDATE ON "public"."pre_provisioned_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_projects_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_question_completion_trigger" AFTER INSERT ON "public"."answers" FOR EACH ROW EXECUTE FUNCTION "public"."update_question_completion"();



CREATE OR REPLACE TRIGGER "update_questions_updated_at" BEFORE UPDATE ON "public"."questions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_task_templates_updated_at" BEFORE UPDATE ON "public"."task_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audio_asset_events"
    ADD CONSTRAINT "audio_asset_events_audio_asset_id_fkey" FOREIGN KEY ("audio_asset_id") REFERENCES "public"."audio_assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audio_asset_events"
    ADD CONSTRAINT "audio_asset_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audio_assets"
    ADD CONSTRAINT "audio_assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_logs"
    ADD CONSTRAINT "client_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."client_logs"
    ADD CONSTRAINT "client_logs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."final_answers"
    ADD CONSTRAINT "final_answers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."final_answers"
    ADD CONSTRAINT "final_answers_question_uuid_fkey" FOREIGN KEY ("question_uuid") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."final_answers"
    ADD CONSTRAINT "final_answers_review_submission_uuid_fkey" FOREIGN KEY ("review_submission_uuid") REFERENCES "public"."review_submissions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."final_answers"
    ADD CONSTRAINT "final_answers_source_answer_uuid_fkey" FOREIGN KEY ("source_answer_uuid") REFERENCES "public"."answers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."message_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_groups"
    ADD CONSTRAINT "message_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_recipients"
    ADD CONSTRAINT "message_recipients_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_recipients"
    ADD CONSTRAINT "message_recipients_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."message_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pre_provisioned_project_assignments"
    ADD CONSTRAINT "pre_provisioned_project_assignment_pre_provisioned_user_id_fkey" FOREIGN KEY ("pre_provisioned_user_id") REFERENCES "public"."pre_provisioned_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pre_provisioned_project_assignments"
    ADD CONSTRAINT "pre_provisioned_project_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pre_provisioned_project_assignments"
    ADD CONSTRAINT "pre_provisioned_project_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pre_provisioned_users"
    ADD CONSTRAINT "pre_provisioned_users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pre_provisioned_users"
    ADD CONSTRAINT "pre_provisioned_users_provisioned_by_fkey" FOREIGN KEY ("provisioned_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_reports_to_fkey" FOREIGN KEY ("reports_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_assignments"
    ADD CONSTRAINT "project_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."project_assignments"
    ADD CONSTRAINT "project_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_assignments"
    ADD CONSTRAINT "project_assignments_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."task_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_training_module_id_fkey" FOREIGN KEY ("training_module_id") REFERENCES "public"."training_modules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."qc_records"
    ADD CONSTRAINT "qc_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qc_records"
    ADD CONSTRAINT "qc_records_question_uuid_fkey" FOREIGN KEY ("question_uuid") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qc_records"
    ADD CONSTRAINT "qc_records_review_submission_uuid_fkey" FOREIGN KEY ("review_submission_uuid") REFERENCES "public"."review_submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_asset_status"
    ADD CONSTRAINT "question_asset_status_audio_asset_id_fkey" FOREIGN KEY ("audio_asset_id") REFERENCES "public"."audio_assets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_asset_status"
    ADD CONSTRAINT "question_asset_status_final_answer_uuid_fkey" FOREIGN KEY ("final_answer_uuid") REFERENCES "public"."final_answers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_asset_status"
    ADD CONSTRAINT "question_asset_status_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_asset_status"
    ADD CONSTRAINT "question_asset_status_qc_record_uuid_fkey" FOREIGN KEY ("qc_record_uuid") REFERENCES "public"."qc_records"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_asset_status"
    ADD CONSTRAINT "question_asset_status_qc_reviewer_uuid_fkey" FOREIGN KEY ("qc_reviewer_uuid") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_asset_status"
    ADD CONSTRAINT "question_asset_status_question_uuid_fkey" FOREIGN KEY ("question_uuid") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_asset_status"
    ADD CONSTRAINT "question_asset_status_review_submission_uuid_fkey" FOREIGN KEY ("review_submission_uuid") REFERENCES "public"."review_submissions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_asset_status"
    ADD CONSTRAINT "question_asset_status_review_task_uuid_fkey" FOREIGN KEY ("review_task_uuid") REFERENCES "public"."review_tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_asset_status"
    ADD CONSTRAINT "question_asset_status_reviewer_uuid_fkey" FOREIGN KEY ("reviewer_uuid") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_asset_status"
    ADD CONSTRAINT "question_asset_status_transcriber_uuid_fkey" FOREIGN KEY ("transcriber_uuid") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_asset_status"
    ADD CONSTRAINT "question_asset_status_transcription_answer_uuid_fkey" FOREIGN KEY ("transcription_answer_uuid") REFERENCES "public"."answers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_asset_status"
    ADD CONSTRAINT "question_asset_status_transcription_task_uuid_fkey" FOREIGN KEY ("transcription_task_uuid") REFERENCES "public"."tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_audio_asset_id_fkey" FOREIGN KEY ("audio_asset_id") REFERENCES "public"."audio_assets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_submissions"
    ADD CONSTRAINT "review_submissions_answer_uuid_fkey" FOREIGN KEY ("answer_uuid") REFERENCES "public"."answers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_submissions"
    ADD CONSTRAINT "review_submissions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_submissions"
    ADD CONSTRAINT "review_submissions_question_uuid_fkey" FOREIGN KEY ("question_uuid") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_submissions"
    ADD CONSTRAINT "review_submissions_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."review_tasks"
    ADD CONSTRAINT "review_tasks_answer_uuid_fkey" FOREIGN KEY ("answer_uuid") REFERENCES "public"."answers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_tasks"
    ADD CONSTRAINT "review_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."review_tasks"
    ADD CONSTRAINT "review_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_tasks"
    ADD CONSTRAINT "review_tasks_question_uuid_fkey" FOREIGN KEY ("question_uuid") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_answers"
    ADD CONSTRAINT "task_answers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."task_answers"
    ADD CONSTRAINT "task_answers_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_answers"
    ADD CONSTRAINT "task_answers_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."task_templates"
    ADD CONSTRAINT "task_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."worker_plugin_metrics"
    ADD CONSTRAINT "worker_plugin_metrics_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."worker_training_completions"
    ADD CONSTRAINT "worker_training_completions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."worker_training_completions"
    ADD CONSTRAINT "worker_training_completions_training_module_id_fkey" FOREIGN KEY ("training_module_id") REFERENCES "public"."training_modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."worker_training_completions"
    ADD CONSTRAINT "worker_training_completions_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins and managers can manage departments" ON "public"."departments" TO "authenticated" USING ("public"."is_root_or_manager"("auth"."uid"())) WITH CHECK ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Admins view all groups" ON "public"."message_groups" FOR SELECT TO "authenticated" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Admins view all messages" ON "public"."messages" FOR SELECT TO "authenticated" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Admins view all recipients" ON "public"."message_recipients" FOR SELECT TO "authenticated" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Admins view all threads" ON "public"."message_threads" FOR SELECT TO "authenticated" USING ("public"."is_root_or_manager"("auth"."uid"()));



COMMENT ON POLICY "Admins view all threads" ON "public"."message_threads" IS 'Allows root and manager roles to view all message threads for administrative oversight.';



CREATE POLICY "Allow soft delete" ON "public"."messages" FOR UPDATE TO "authenticated" USING (("sender_id" = "auth"."uid"())) WITH CHECK (("sender_id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can view departments" ON "public"."departments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view profiles for messaging" ON "public"."profiles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



COMMENT ON POLICY "Authenticated users can view profiles for messaging" ON "public"."profiles" IS 'Allows all authenticated users to view basic profile information (name, role, email) of other users. This is required for the messaging system to display sender names and roles. Does not grant access to sensitive profile fields.';



CREATE POLICY "Authenticated users create threads" ON "public"."message_threads" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "Authenticated users send messages" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK (("sender_id" = "auth"."uid"()));



CREATE POLICY "Group admins can add members" ON "public"."group_members" FOR INSERT WITH CHECK ("public"."is_group_admin"("group_id", "auth"."uid"()));



CREATE POLICY "Group admins can remove members" ON "public"."group_members" FOR UPDATE USING (("public"."is_group_admin"("group_id", "auth"."uid"()) AND ((EXISTS ( SELECT 1
   FROM "public"."message_groups"
  WHERE (("message_groups"."id" = "group_members"."group_id") AND ("message_groups"."created_by" = "auth"."uid"())))) OR (NOT (EXISTS ( SELECT 1
   FROM "public"."message_groups"
  WHERE (("message_groups"."id" = "group_members"."group_id") AND ("message_groups"."created_by" = "group_members"."user_id"))))))));



CREATE POLICY "Group admins can update their groups" ON "public"."message_groups" FOR UPDATE USING ((("auth"."uid"() = "created_by") OR "public"."is_group_admin"("id", "auth"."uid"())));



CREATE POLICY "Managers can update all questions" ON "public"."questions" FOR UPDATE USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Managers can view all answers" ON "public"."answers" FOR SELECT USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Managers can view all plugin metrics" ON "public"."worker_plugin_metrics" FOR SELECT USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Managers can view all questions" ON "public"."questions" FOR SELECT USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Managers can view client logs" ON "public"."client_logs" FOR SELECT USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Prevent hard delete" ON "public"."messages" FOR DELETE TO "authenticated" USING (false);



COMMENT ON POLICY "Prevent hard delete" ON "public"."messages" IS 'Critical security policy: Prevents hard deletion of messages to maintain audit trail and compliance.';



CREATE POLICY "Recipients view messages" ON "public"."messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."message_recipients" "mr"
  WHERE (("mr"."message_id" = "messages"."id") AND ("mr"."recipient_id" = "auth"."uid"()) AND ("mr"."deleted_at" IS NULL)))));



CREATE POLICY "Recipients view threads" ON "public"."message_threads" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."messages" "m"
     JOIN "public"."message_recipients" "mr" ON (("m"."id" = "mr"."message_id")))
  WHERE (("m"."thread_id" = "message_threads"."id") AND ("mr"."recipient_id" = "auth"."uid"())))));



COMMENT ON POLICY "Recipients view threads" ON "public"."message_threads" IS 'Allows users to view threads where they are recipients of at least one message.';



CREATE POLICY "Root and managers can create profiles" ON "public"."profiles" FOR INSERT WITH CHECK ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can delete pre-provisioned assignments" ON "public"."pre_provisioned_project_assignments" FOR DELETE TO "authenticated" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can delete pre-provisioned users" ON "public"."pre_provisioned_users" FOR DELETE TO "authenticated" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can insert pre-provisioned assignments" ON "public"."pre_provisioned_project_assignments" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can insert pre-provisioned users" ON "public"."pre_provisioned_users" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can manage all tasks" ON "public"."tasks" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can manage assignments" ON "public"."project_assignments" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can manage invitations" ON "public"."user_invitations" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can manage projects" ON "public"."projects" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can manage templates" ON "public"."task_templates" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can manage training completions" ON "public"."worker_training_completions" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can update pre-provisioned assignments" ON "public"."pre_provisioned_project_assignments" FOR UPDATE TO "authenticated" USING ("public"."is_root_or_manager"("auth"."uid"())) WITH CHECK ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can update pre-provisioned users" ON "public"."pre_provisioned_users" FOR UPDATE TO "authenticated" USING ("public"."is_root_or_manager"("auth"."uid"())) WITH CHECK ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can update profiles" ON "public"."profiles" FOR UPDATE USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can view all events" ON "public"."task_answer_events" FOR SELECT USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can view all profiles" ON "public"."profiles" FOR SELECT USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can view all task answers" ON "public"."task_answers" FOR SELECT USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can view all training completions" ON "public"."worker_training_completions" FOR SELECT USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can view pre-provisioned assignments" ON "public"."pre_provisioned_project_assignments" FOR SELECT TO "authenticated" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can view pre-provisioned users" ON "public"."pre_provisioned_users" FOR SELECT TO "authenticated" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root can delete profiles" ON "public"."profiles" FOR DELETE USING ("public"."is_root"("auth"."uid"()));



CREATE POLICY "Service role creates recipients" ON "public"."message_recipients" FOR INSERT TO "authenticated" WITH CHECK (false);



COMMENT ON POLICY "Service role creates recipients" ON "public"."message_recipients" IS 'Recipient records are created exclusively by edge functions using service role key, not by regular users.';



CREATE POLICY "Users can create conversation groups" ON "public"."message_groups" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can create their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



COMMENT ON POLICY "Users can create their own profile" ON "public"."profiles" IS 'Allows new users to create their own profile during OAuth signup. User can only insert a profile where id matches their auth.uid().';



CREATE POLICY "Users can leave groups" ON "public"."group_members" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can send group messages" ON "public"."messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "sender_id") AND (("group_id" IS NULL) OR "public"."is_group_member"("group_id", "auth"."uid"()))));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view group messages" ON "public"."messages" FOR SELECT USING ((("group_id" IS NULL) OR "public"."is_group_member"("group_id", "auth"."uid"())));



CREATE POLICY "Users can view groups they are members of" ON "public"."message_groups" FOR SELECT USING ((("auth"."uid"() = "created_by") OR ("group_type" = 'saved_list'::"text") OR (("group_type" = 'conversation'::"text") AND "public"."is_group_member"("id", "auth"."uid"()))));



CREATE POLICY "Users can view their group memberships" ON "public"."group_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_group_member"("group_id", "auth"."uid"())));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users manage own groups" ON "public"."message_groups" TO "authenticated" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "Users update own recipient records" ON "public"."message_recipients" FOR UPDATE TO "authenticated" USING (("recipient_id" = "auth"."uid"())) WITH CHECK (("recipient_id" = "auth"."uid"()));



CREATE POLICY "Users view own recipient records" ON "public"."message_recipients" FOR SELECT TO "authenticated" USING (("recipient_id" = "auth"."uid"()));



CREATE POLICY "Users view own threads" ON "public"."message_threads" FOR SELECT TO "authenticated" USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Users view sent messages" ON "public"."messages" FOR SELECT TO "authenticated" USING (("sender_id" = "auth"."uid"()));



CREATE POLICY "Workers can insert client logs" ON "public"."client_logs" FOR INSERT WITH CHECK (("worker_id" = "auth"."uid"()));



CREATE POLICY "Workers can insert their own answers" ON "public"."answers" FOR INSERT WITH CHECK (("worker_id" = "auth"."uid"()));



CREATE POLICY "Workers can insert their own events" ON "public"."task_answer_events" FOR INSERT WITH CHECK (("worker_id" = "auth"."uid"()));



CREATE POLICY "Workers can insert their own task answers" ON "public"."task_answers" FOR INSERT WITH CHECK (("worker_id" = "auth"."uid"()));



CREATE POLICY "Workers can insert their own training completions" ON "public"."worker_training_completions" FOR INSERT WITH CHECK (("worker_id" = "auth"."uid"()));



CREATE POLICY "Workers can manage their plugin metrics" ON "public"."worker_plugin_metrics" USING (("worker_id" = "auth"."uid"()));



CREATE POLICY "Workers can update question completion" ON "public"."questions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."project_assignments"
  WHERE (("project_assignments"."worker_id" = "auth"."uid"()) AND ("project_assignments"."project_id" = "questions"."project_id")))));



CREATE POLICY "Workers can update their assigned tasks" ON "public"."tasks" FOR UPDATE USING (("assigned_to" = "auth"."uid"()));



CREATE POLICY "Workers can update their own training completions" ON "public"."worker_training_completions" FOR UPDATE USING (("worker_id" = "auth"."uid"()));



CREATE POLICY "Workers can view assigned project questions" ON "public"."questions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."project_assignments"
  WHERE (("project_assignments"."worker_id" = "auth"."uid"()) AND ("project_assignments"."project_id" = "questions"."project_id")))));



CREATE POLICY "Workers can view assigned projects" ON "public"."projects" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."project_assignments"
  WHERE (("project_assignments"."worker_id" = "auth"."uid"()) AND ("project_assignments"."project_id" = "projects"."id")))));



CREATE POLICY "Workers can view templates" ON "public"."task_templates" FOR SELECT USING (true);



CREATE POLICY "Workers can view their assigned tasks" ON "public"."tasks" FOR SELECT USING (("assigned_to" = "auth"."uid"()));



CREATE POLICY "Workers can view their assignments" ON "public"."project_assignments" FOR SELECT USING (("worker_id" = "auth"."uid"()));



CREATE POLICY "Workers can view their own answers" ON "public"."answers" FOR SELECT USING (("worker_id" = "auth"."uid"()));



CREATE POLICY "Workers can view their own events" ON "public"."task_answer_events" FOR SELECT USING (("worker_id" = "auth"."uid"()));



CREATE POLICY "Workers can view their own task answers" ON "public"."task_answers" FOR SELECT USING (("worker_id" = "auth"."uid"()));



CREATE POLICY "Workers can view their own training completions" ON "public"."worker_training_completions" FOR SELECT USING (("worker_id" = "auth"."uid"()));



CREATE POLICY "Workers can view their plugin metrics" ON "public"."worker_plugin_metrics" FOR SELECT USING (("worker_id" = "auth"."uid"()));



ALTER TABLE "public"."answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_recipients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_threads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pre_provisioned_project_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pre_provisioned_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_answer_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."worker_plugin_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."worker_training_completions" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_creator_to_group"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_creator_to_group"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_creator_to_group"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_message_user"("_sender_id" "uuid", "_recipient_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_message_user"("_sender_id" "uuid", "_recipient_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_message_user"("_sender_id" "uuid", "_recipient_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_send_messages"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_send_messages"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_send_messages"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_next_available_question"("p_project_id" "uuid", "p_worker_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_next_available_question"("p_project_id" "uuid", "p_worker_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_next_available_question"("p_project_id" "uuid", "p_worker_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_reservations"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_reservations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_reservations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."count_active_reservations_for_worker"("p_project_id" "uuid", "p_worker_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."count_active_reservations_for_worker"("p_project_id" "uuid", "p_worker_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_active_reservations_for_worker"("p_project_id" "uuid", "p_worker_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."count_claimable_questions"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."count_claimable_questions"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_claimable_questions"("p_project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_invitation"("_email" "text", "_role" "public"."user_role", "_initial_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_invitation"("_email" "text", "_role" "public"."user_role", "_initial_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_invitation"("_email" "text", "_role" "public"."user_role", "_initial_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_role_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_role_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_role_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_answer_id"("question_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_answer_id"("question_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_answer_id"("question_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_question_id"("project_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_question_id"("project_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_question_id"("project_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_project_completion_stats"("project_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_project_completion_stats"("project_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_project_completion_stats"("project_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_project_completed_tasks"("project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_project_completed_tasks"("project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_project_completed_tasks"("project_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_group_admin"("p_group_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_group_admin"("p_group_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_group_admin"("p_group_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_group_member"("p_group_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_group_member"("p_group_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_group_member"("p_group_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_root"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_root"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_root"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_root_or_manager"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_root_or_manager"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_root_or_manager"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_last_sign_in"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_last_sign_in"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_last_sign_in"() TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_pre_provisioned_assignments"("p_user_id" "uuid", "p_user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_pre_provisioned_assignments"("p_user_id" "uuid", "p_user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_pre_provisioned_assignments"("p_user_id" "uuid", "p_user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."release_task_by_id"("p_task_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."release_task_by_id"("p_task_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_task_by_id"("p_task_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."release_worker_tasks"() TO "anon";
GRANT ALL ON FUNCTION "public"."release_worker_tasks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_worker_tasks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_question_completion"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_question_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_question_completion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."answers" TO "anon";
GRANT ALL ON TABLE "public"."answers" TO "authenticated";
GRANT ALL ON TABLE "public"."answers" TO "service_role";



GRANT ALL ON TABLE "public"."audio_asset_events" TO "anon";
GRANT ALL ON TABLE "public"."audio_asset_events" TO "authenticated";
GRANT ALL ON TABLE "public"."audio_asset_events" TO "service_role";



GRANT ALL ON TABLE "public"."audio_assets" TO "anon";
GRANT ALL ON TABLE "public"."audio_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."audio_assets" TO "service_role";



GRANT ALL ON TABLE "public"."client_logs" TO "anon";
GRANT ALL ON TABLE "public"."client_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."client_logs" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."final_answers" TO "anon";
GRANT ALL ON TABLE "public"."final_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."final_answers" TO "service_role";



GRANT ALL ON TABLE "public"."group_members" TO "anon";
GRANT ALL ON TABLE "public"."group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."group_members" TO "service_role";



GRANT ALL ON TABLE "public"."message_groups" TO "anon";
GRANT ALL ON TABLE "public"."message_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."message_groups" TO "service_role";



GRANT ALL ON TABLE "public"."message_recipients" TO "anon";
GRANT ALL ON TABLE "public"."message_recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."message_recipients" TO "service_role";



GRANT ALL ON TABLE "public"."message_threads" TO "anon";
GRANT ALL ON TABLE "public"."message_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."message_threads" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."pre_provisioned_project_assignments" TO "anon";
GRANT ALL ON TABLE "public"."pre_provisioned_project_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."pre_provisioned_project_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."pre_provisioned_users" TO "anon";
GRANT ALL ON TABLE "public"."pre_provisioned_users" TO "authenticated";
GRANT ALL ON TABLE "public"."pre_provisioned_users" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_assignments" TO "anon";
GRANT ALL ON TABLE "public"."project_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."project_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."qc_records" TO "anon";
GRANT ALL ON TABLE "public"."qc_records" TO "authenticated";
GRANT ALL ON TABLE "public"."qc_records" TO "service_role";



GRANT ALL ON TABLE "public"."question_asset_status" TO "anon";
GRANT ALL ON TABLE "public"."question_asset_status" TO "authenticated";
GRANT ALL ON TABLE "public"."question_asset_status" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."review_submissions" TO "anon";
GRANT ALL ON TABLE "public"."review_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."review_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."review_tasks" TO "anon";
GRANT ALL ON TABLE "public"."review_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."review_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."task_answer_events" TO "anon";
GRANT ALL ON TABLE "public"."task_answer_events" TO "authenticated";
GRANT ALL ON TABLE "public"."task_answer_events" TO "service_role";



GRANT ALL ON TABLE "public"."task_answers" TO "anon";
GRANT ALL ON TABLE "public"."task_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."task_answers" TO "service_role";



GRANT ALL ON TABLE "public"."task_templates" TO "anon";
GRANT ALL ON TABLE "public"."task_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."task_templates" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."training_modules" TO "anon";
GRANT ALL ON TABLE "public"."training_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."training_modules" TO "service_role";



GRANT ALL ON TABLE "public"."user_invitations" TO "anon";
GRANT ALL ON TABLE "public"."user_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."worker_analytics_summary" TO "anon";
GRANT ALL ON TABLE "public"."worker_analytics_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_analytics_summary" TO "service_role";



GRANT ALL ON TABLE "public"."worker_daily_activity" TO "anon";
GRANT ALL ON TABLE "public"."worker_daily_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_daily_activity" TO "service_role";



GRANT ALL ON TABLE "public"."worker_plugin_metrics" TO "anon";
GRANT ALL ON TABLE "public"."worker_plugin_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_plugin_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."worker_project_performance" TO "anon";
GRANT ALL ON TABLE "public"."worker_project_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_project_performance" TO "service_role";



GRANT ALL ON TABLE "public"."worker_training_completions" TO "anon";
GRANT ALL ON TABLE "public"."worker_training_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_training_completions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







