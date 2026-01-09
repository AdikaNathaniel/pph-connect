


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."user_role" AS ENUM (
    'root',
    'admin',
    'manager',
    'team_lead',
    'worker'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


COMMENT ON TYPE "public"."user_role" IS 'User role hierarchy for access control and messaging';



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
    WHERE id = p_project_id;

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

    -- Create task reservation
    INSERT INTO public.tasks (
        project_id,
        question_id,
        row_index,
        data,
        status,
        assigned_to,
        assigned_at
    )
    VALUES (
        p_project_id,
        v_question_record.id,
        v_question_record.row_index,
        v_question_record.data,
        'assigned',
        p_worker_id,
        NOW()
    )
    RETURNING id INTO v_task_id;

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
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'worker')
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Trigger function: automatically create profile when user signs up';



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
        WHERE id = _user_id AND role IN ('root', 'manager')
    );
$$;


ALTER FUNCTION "public"."is_root_or_manager"("_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_root_or_manager"("_user_id" "uuid") IS 'Helper function to check if user is root or manager (avoids RLS recursion)';



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
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles extending Supabase auth.users';



COMMENT ON COLUMN "public"."profiles"."role" IS 'User role determining permissions';



COMMENT ON COLUMN "public"."profiles"."initial_password_hash" IS 'Stored to detect first-time login';



COMMENT ON COLUMN "public"."profiles"."suspended" IS 'If true, user cannot access system';



CREATE TABLE IF NOT EXISTS "public"."project_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "priority" integer DEFAULT 50 NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
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
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."projects" IS 'Active annotation projects with configuration';



COMMENT ON COLUMN "public"."projects"."replications_per_question" IS 'Number of workers that must answer each question';



COMMENT ON COLUMN "public"."projects"."reservation_time_limit_minutes" IS 'Max time a worker can hold a task reservation';



CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "question_id" "text" NOT NULL,
    "row_index" integer NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "required_replications" integer DEFAULT 1 NOT NULL,
    "completed_replications" integer DEFAULT 0 NOT NULL,
    "is_answered" boolean DEFAULT false NOT NULL,
    "is_gold_standard" boolean DEFAULT false NOT NULL,
    "correct_answer" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


COMMENT ON TABLE "public"."questions" IS 'Individual questions/rows from projects requiring answers';



COMMENT ON COLUMN "public"."questions"."question_id" IS 'Unique ID format: 24char+project_name+24char';



COMMENT ON COLUMN "public"."questions"."required_replications" IS 'How many workers must answer this question';



COMMENT ON COLUMN "public"."questions"."completed_replications" IS 'Current number of answers submitted';

COMMENT ON COLUMN "public"."questions"."is_gold_standard" IS 'Indicates whether the row is a seeded gold standard question';

COMMENT ON COLUMN "public"."questions"."correct_answer" IS 'Canonical answer payload used for gold standard evaluation';

CREATE INDEX IF NOT EXISTS "idx_questions_gold_standard"
  ON "public"."questions" ("project_id")
  WHERE is_gold_standard IS TRUE;



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
    CONSTRAINT "task_templates_modality_check" CHECK (("modality" = ANY (ARRAY['spreadsheet'::"text", 'audio-short'::"text", 'audio-long'::"text", 'text'::"text", 'image'::"text", 'video'::"text", 'multimodal'::"text"])))
);


ALTER TABLE "public"."task_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_templates" IS 'Reusable task configurations with multi-modality support';



COMMENT ON COLUMN "public"."task_templates"."column_config" IS 'JSON array defining form fields';



COMMENT ON COLUMN "public"."task_templates"."modality" IS 'Task type: spreadsheet, audio, text, image, video, multimodal';



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



ALTER TABLE ONLY "public"."client_logs"
    ADD CONSTRAINT "client_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_assignments"
    ADD CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_assignments"
    ADD CONSTRAINT "project_assignments_worker_id_project_id_key" UNIQUE ("worker_id", "project_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_project_id_question_id_key" UNIQUE ("project_id", "question_id");



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



CREATE INDEX "idx_client_logs_occurred_at" ON "public"."client_logs" USING "btree" ("occurred_at" DESC);



CREATE INDEX "idx_client_logs_project_id" ON "public"."client_logs" USING "btree" ("project_id");



CREATE INDEX "idx_client_logs_worker_id" ON "public"."client_logs" USING "btree" ("worker_id");



CREATE INDEX "idx_project_assignments_worker_priority" ON "public"."project_assignments" USING "btree" ("worker_id", "priority");



CREATE INDEX "idx_projects_enable_skip" ON "public"."projects" USING "btree" ("enable_skip_button") WHERE ("enable_skip_button" = true);



CREATE INDEX "idx_projects_training_module" ON "public"."projects" USING "btree" ("training_module_id");



CREATE INDEX "idx_questions_is_answered" ON "public"."questions" USING "btree" ("is_answered");



CREATE INDEX "idx_questions_project_id" ON "public"."questions" USING "btree" ("project_id");



CREATE INDEX "idx_questions_question_id" ON "public"."questions" USING "btree" ("question_id");



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



ALTER TABLE ONLY "public"."client_logs"
    ADD CONSTRAINT "client_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."client_logs"
    ADD CONSTRAINT "client_logs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



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



CREATE POLICY "Managers can update all questions" ON "public"."questions" FOR UPDATE USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Managers can view all answers" ON "public"."answers" FOR SELECT USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Managers can view all plugin metrics" ON "public"."worker_plugin_metrics" FOR SELECT USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Managers can view all questions" ON "public"."questions" FOR SELECT USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Managers can view client logs" ON "public"."client_logs" FOR SELECT USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can create profiles" ON "public"."profiles" FOR INSERT WITH CHECK ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can manage all tasks" ON "public"."tasks" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can manage assignments" ON "public"."project_assignments" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can manage invitations" ON "public"."user_invitations" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can manage projects" ON "public"."projects" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can manage templates" ON "public"."task_templates" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can manage training completions" ON "public"."worker_training_completions" USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can update profiles" ON "public"."profiles" FOR UPDATE USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can view all events" ON "public"."task_answer_events" FOR SELECT USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can view all profiles" ON "public"."profiles" FOR SELECT USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can view all task answers" ON "public"."task_answers" FOR SELECT USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root and managers can view all training completions" ON "public"."worker_training_completions" FOR SELECT USING ("public"."is_root_or_manager"("auth"."uid"()));



CREATE POLICY "Root can delete profiles" ON "public"."profiles" FOR DELETE USING ("public"."is_root"("auth"."uid"()));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



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




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































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



GRANT ALL ON FUNCTION "public"."is_root"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_root"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_root"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_root_or_manager"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_root_or_manager"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_root_or_manager"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_last_sign_in"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_last_sign_in"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_last_sign_in"() TO "service_role";



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



GRANT ALL ON TABLE "public"."client_logs" TO "anon";
GRANT ALL ON TABLE "public"."client_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."client_logs" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_assignments" TO "anon";
GRANT ALL ON TABLE "public"."project_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."project_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



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































drop extension if exists "pg_net";

drop trigger if exists "update_question_completion_trigger" on "public"."answers";

drop trigger if exists "trg_enforce_role_update" on "public"."profiles";

drop trigger if exists "update_profiles_updated_at" on "public"."profiles";

drop trigger if exists "update_projects_updated_at" on "public"."projects";

drop trigger if exists "update_questions_updated_at" on "public"."questions";

drop trigger if exists "update_task_templates_updated_at" on "public"."task_templates";

drop trigger if exists "update_tasks_updated_at" on "public"."tasks";

drop policy "Managers can view all answers" on "public"."answers";

drop policy "Managers can view client logs" on "public"."client_logs";

drop policy "Root and managers can create profiles" on "public"."profiles";

drop policy "Root and managers can update profiles" on "public"."profiles";

drop policy "Root and managers can view all profiles" on "public"."profiles";

drop policy "Root can delete profiles" on "public"."profiles";

drop policy "Root and managers can manage assignments" on "public"."project_assignments";

drop policy "Root and managers can manage projects" on "public"."projects";

drop policy "Workers can view assigned projects" on "public"."projects";

drop policy "Managers can update all questions" on "public"."questions";

drop policy "Managers can view all questions" on "public"."questions";

drop policy "Workers can update question completion" on "public"."questions";

drop policy "Workers can view assigned project questions" on "public"."questions";

drop policy "Root and managers can view all events" on "public"."task_answer_events";

drop policy "Root and managers can view all task answers" on "public"."task_answers";

drop policy "Root and managers can manage templates" on "public"."task_templates";

drop policy "Root and managers can manage all tasks" on "public"."tasks";

drop policy "Root and managers can manage invitations" on "public"."user_invitations";

drop policy "Managers can view all plugin metrics" on "public"."worker_plugin_metrics";

drop policy "Root and managers can manage training completions" on "public"."worker_training_completions";

drop policy "Root and managers can view all training completions" on "public"."worker_training_completions";

alter table "public"."answers" drop constraint "answers_project_id_fkey";

alter table "public"."answers" drop constraint "answers_question_id_fkey";

alter table "public"."answers" drop constraint "answers_worker_id_fkey";

alter table "public"."client_logs" drop constraint "client_logs_project_id_fkey";

alter table "public"."client_logs" drop constraint "client_logs_worker_id_fkey";

alter table "public"."project_assignments" drop constraint "project_assignments_assigned_by_fkey";

alter table "public"."project_assignments" drop constraint "project_assignments_project_id_fkey";

alter table "public"."project_assignments" drop constraint "project_assignments_worker_id_fkey";

alter table "public"."projects" drop constraint "projects_created_by_fkey";

alter table "public"."projects" drop constraint "projects_template_id_fkey";

alter table "public"."projects" drop constraint "projects_training_module_id_fkey";

alter table "public"."questions" drop constraint "questions_project_id_fkey";

alter table "public"."task_answers" drop constraint "task_answers_project_id_fkey";

alter table "public"."task_answers" drop constraint "task_answers_task_id_fkey";

alter table "public"."task_answers" drop constraint "task_answers_worker_id_fkey";

alter table "public"."task_templates" drop constraint "task_templates_created_by_fkey";

alter table "public"."tasks" drop constraint "tasks_assigned_to_fkey";

alter table "public"."tasks" drop constraint "tasks_project_id_fkey";

alter table "public"."tasks" drop constraint "tasks_question_id_fkey";

alter table "public"."user_invitations" drop constraint "user_invitations_invited_by_fkey";

alter table "public"."worker_plugin_metrics" drop constraint "worker_plugin_metrics_worker_id_fkey";

alter table "public"."worker_training_completions" drop constraint "worker_training_completions_project_id_fkey";

alter table "public"."worker_training_completions" drop constraint "worker_training_completions_training_module_id_fkey";

alter table "public"."worker_training_completions" drop constraint "worker_training_completions_worker_id_fkey";

drop function if exists "public"."create_user_invitation"(_email text, _role user_role, _initial_password text);

alter table "public"."profiles" alter column "role" set default 'worker'::public.user_role;

alter table "public"."profiles" alter column "role" set data type public.user_role using "role"::text::public.user_role;

alter table "public"."user_invitations" alter column "role" set data type public.user_role using "role"::text::public.user_role;

alter table "public"."answers" add constraint "answers_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."answers" validate constraint "answers_project_id_fkey";

alter table "public"."answers" add constraint "answers_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE not valid;

alter table "public"."answers" validate constraint "answers_question_id_fkey";

alter table "public"."answers" add constraint "answers_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."answers" validate constraint "answers_worker_id_fkey";

alter table "public"."client_logs" add constraint "client_logs_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL not valid;

alter table "public"."client_logs" validate constraint "client_logs_project_id_fkey";

alter table "public"."client_logs" add constraint "client_logs_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."client_logs" validate constraint "client_logs_worker_id_fkey";

alter table "public"."project_assignments" add constraint "project_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) not valid;

alter table "public"."project_assignments" validate constraint "project_assignments_assigned_by_fkey";

alter table "public"."project_assignments" add constraint "project_assignments_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."project_assignments" validate constraint "project_assignments_project_id_fkey";

alter table "public"."project_assignments" add constraint "project_assignments_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."project_assignments" validate constraint "project_assignments_worker_id_fkey";

alter table "public"."projects" add constraint "projects_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."projects" validate constraint "projects_created_by_fkey";

alter table "public"."projects" add constraint "projects_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.task_templates(id) ON DELETE RESTRICT not valid;

alter table "public"."projects" validate constraint "projects_template_id_fkey";

alter table "public"."projects" add constraint "projects_training_module_id_fkey" FOREIGN KEY (training_module_id) REFERENCES public.training_modules(id) ON DELETE SET NULL not valid;

alter table "public"."projects" validate constraint "projects_training_module_id_fkey";

alter table "public"."questions" add constraint "questions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."questions" validate constraint "questions_project_id_fkey";

alter table "public"."task_answers" add constraint "task_answers_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) not valid;

alter table "public"."task_answers" validate constraint "task_answers_project_id_fkey";

alter table "public"."task_answers" add constraint "task_answers_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE not valid;

alter table "public"."task_answers" validate constraint "task_answers_task_id_fkey";

alter table "public"."task_answers" add constraint "task_answers_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES public.profiles(id) not valid;

alter table "public"."task_answers" validate constraint "task_answers_worker_id_fkey";

alter table "public"."task_templates" add constraint "task_templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "public"."task_templates" validate constraint "task_templates_created_by_fkey";

alter table "public"."tasks" add constraint "tasks_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) not valid;

alter table "public"."tasks" validate constraint "tasks_assigned_to_fkey";

alter table "public"."tasks" add constraint "tasks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."tasks" validate constraint "tasks_project_id_fkey";

alter table "public"."tasks" add constraint "tasks_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE not valid;

alter table "public"."tasks" validate constraint "tasks_question_id_fkey";

alter table "public"."user_invitations" add constraint "user_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES public.profiles(id) not valid;

alter table "public"."user_invitations" validate constraint "user_invitations_invited_by_fkey";

alter table "public"."worker_plugin_metrics" add constraint "worker_plugin_metrics_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."worker_plugin_metrics" validate constraint "worker_plugin_metrics_worker_id_fkey";

alter table "public"."worker_training_completions" add constraint "worker_training_completions_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."worker_training_completions" validate constraint "worker_training_completions_project_id_fkey";

alter table "public"."worker_training_completions" add constraint "worker_training_completions_training_module_id_fkey" FOREIGN KEY (training_module_id) REFERENCES public.training_modules(id) ON DELETE CASCADE not valid;

alter table "public"."worker_training_completions" validate constraint "worker_training_completions_training_module_id_fkey";

alter table "public"."worker_training_completions" add constraint "worker_training_completions_worker_id_fkey" FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."worker_training_completions" validate constraint "worker_training_completions_worker_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_user_invitation(_email text, _role public.user_role, _initial_password text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

create or replace view "public"."worker_analytics_summary" as  SELECT worker_id,
    (count(*))::integer AS total_completed_tasks,
    (count(DISTINCT project_id))::integer AS distinct_projects,
    (count(*) FILTER (WHERE (completion_time >= (now() - '24:00:00'::interval))))::integer AS tasks_last_24h,
    (count(*) FILTER (WHERE ((completion_time)::date = CURRENT_DATE)))::integer AS tasks_today,
    (COALESCE(sum(aht_seconds), (0)::bigint))::integer AS total_active_seconds,
        CASE
            WHEN (count(*) > 0) THEN round(((sum(aht_seconds))::numeric / (count(*))::numeric), 2)
            ELSE NULL::numeric
        END AS avg_aht_seconds,
    min(start_time) AS first_active_at,
    max(completion_time) AS last_active_at
   FROM public.answers a
  GROUP BY worker_id;


create or replace view "public"."worker_daily_activity" as  SELECT worker_id,
    project_id,
    (completion_time)::date AS activity_date,
    (count(*))::integer AS tasks_completed,
    (COALESCE(sum(aht_seconds), (0)::bigint))::integer AS total_active_seconds
   FROM public.answers a
  GROUP BY worker_id, project_id, ((completion_time)::date);


create or replace view "public"."worker_project_performance" as  SELECT worker_id,
    project_id,
    (count(*))::integer AS tasks_completed,
    (COALESCE(sum(aht_seconds), (0)::bigint))::integer AS total_active_seconds,
        CASE
            WHEN (count(*) > 0) THEN round(((sum(aht_seconds))::numeric / (count(*))::numeric), 2)
            ELSE NULL::numeric
        END AS avg_aht_seconds,
    min(start_time) AS first_active_at,
    max(completion_time) AS last_active_at
   FROM public.answers a
  GROUP BY worker_id, project_id;



  create policy "Managers can view all answers"
  on "public"."answers"
  as permissive
  for select
  to public
using (public.is_root_or_manager(auth.uid()));



  create policy "Managers can view client logs"
  on "public"."client_logs"
  as permissive
  for select
  to public
using (public.is_root_or_manager(auth.uid()));



  create policy "Root and managers can create profiles"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check (public.is_root_or_manager(auth.uid()));



  create policy "Root and managers can update profiles"
  on "public"."profiles"
  as permissive
  for update
  to public
using (public.is_root_or_manager(auth.uid()));



  create policy "Root and managers can view all profiles"
  on "public"."profiles"
  as permissive
  for select
  to public
using (public.is_root_or_manager(auth.uid()));



  create policy "Root can delete profiles"
  on "public"."profiles"
  as permissive
  for delete
  to public
using (public.is_root(auth.uid()));



  create policy "Root and managers can manage assignments"
  on "public"."project_assignments"
  as permissive
  for all
  to public
using (public.is_root_or_manager(auth.uid()));



  create policy "Root and managers can manage projects"
  on "public"."projects"
  as permissive
  for all
  to public
using (public.is_root_or_manager(auth.uid()));



  create policy "Workers can view assigned projects"
  on "public"."projects"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.project_assignments
  WHERE ((project_assignments.worker_id = auth.uid()) AND (project_assignments.project_id = projects.id)))));



  create policy "Managers can update all questions"
  on "public"."questions"
  as permissive
  for update
  to public
using (public.is_root_or_manager(auth.uid()));



  create policy "Managers can view all questions"
  on "public"."questions"
  as permissive
  for select
  to public
using (public.is_root_or_manager(auth.uid()));



  create policy "Workers can update question completion"
  on "public"."questions"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.project_assignments
  WHERE ((project_assignments.worker_id = auth.uid()) AND (project_assignments.project_id = questions.project_id)))));



  create policy "Workers can view assigned project questions"
  on "public"."questions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.project_assignments
  WHERE ((project_assignments.worker_id = auth.uid()) AND (project_assignments.project_id = questions.project_id)))));



  create policy "Root and managers can view all events"
  on "public"."task_answer_events"
  as permissive
  for select
  to public
using (public.is_root_or_manager(auth.uid()));



  create policy "Root and managers can view all task answers"
  on "public"."task_answers"
  as permissive
  for select
  to public
using (public.is_root_or_manager(auth.uid()));



  create policy "Root and managers can manage templates"
  on "public"."task_templates"
  as permissive
  for all
  to public
using (public.is_root_or_manager(auth.uid()));



  create policy "Root and managers can manage all tasks"
  on "public"."tasks"
  as permissive
  for all
  to public
using (public.is_root_or_manager(auth.uid()));



  create policy "Root and managers can manage invitations"
  on "public"."user_invitations"
  as permissive
  for all
  to public
using (public.is_root_or_manager(auth.uid()));



  create policy "Managers can view all plugin metrics"
  on "public"."worker_plugin_metrics"
  as permissive
  for select
  to public
using (public.is_root_or_manager(auth.uid()));



  create policy "Root and managers can manage training completions"
  on "public"."worker_training_completions"
  as permissive
  for all
  to public
using (public.is_root_or_manager(auth.uid()));



  create policy "Root and managers can view all training completions"
  on "public"."worker_training_completions"
  as permissive
  for select
  to public
using (public.is_root_or_manager(auth.uid()));


CREATE TRIGGER update_question_completion_trigger AFTER INSERT ON public.answers FOR EACH ROW EXECUTE FUNCTION public.update_question_completion();

CREATE TRIGGER trg_enforce_role_update BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.enforce_role_update();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON public.task_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Anyone can view project files"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'project-files'::text));



  create policy "Authenticated users can delete project files"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'project-files'::text) AND (auth.uid() IS NOT NULL)));



  create policy "Authenticated users can update project files"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'project-files'::text) AND (auth.uid() IS NOT NULL)));



  create policy "Authenticated users can upload project files"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'project-files'::text) AND (auth.uid() IS NOT NULL)));


