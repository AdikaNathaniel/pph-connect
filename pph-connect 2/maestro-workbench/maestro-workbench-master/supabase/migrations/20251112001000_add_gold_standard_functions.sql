-- Migration: Gold standard accuracy + trust rating pipeline
-- Created: 2025-11-12
-- Purpose: Provide helper functions and triggers for quality automation
--
-- ============================================================================

CREATE OR REPLACE FUNCTION public.answers_match_gold(p_answer jsonb, p_expected jsonb)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_answer IS NULL OR p_expected IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_answer = p_expected THEN
    RETURN TRUE;
  END IF;

  IF jsonb_typeof(p_answer) = 'object' AND jsonb_typeof(p_expected) = 'object' THEN
    RETURN (p_answer @> p_expected) AND (p_expected @> p_answer);
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.answers_match_gold(jsonb, jsonb) IS 'Returns true when worker answer matches stored gold standard payload';

CREATE OR REPLACE FUNCTION public.calculate_gold_standard_accuracy(p_worker_id uuid, p_project_id uuid DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
  v_correct numeric;
BEGIN
  IF p_worker_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*)
  INTO v_total
  FROM public.answers a
  JOIN public.questions q ON q.id = a.question_id
  WHERE q.is_gold_standard = TRUE
    AND q.correct_answer IS NOT NULL
    AND a.skipped IS FALSE
    AND a.worker_id = p_worker_id
    AND (p_project_id IS NULL OR a.project_id = p_project_id);

  IF COALESCE(v_total, 0) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*)
  INTO v_correct
  FROM public.answers a
  JOIN public.questions q ON q.id = a.question_id
  WHERE q.is_gold_standard = TRUE
    AND q.correct_answer IS NOT NULL
    AND a.skipped IS FALSE
    AND a.worker_id = p_worker_id
    AND (p_project_id IS NULL OR a.project_id = p_project_id)
    AND public.answers_match_gold(a.answer_data, q.correct_answer);

  RETURN v_correct / v_total;
END;
$$;

COMMENT ON FUNCTION public.calculate_gold_standard_accuracy(uuid, uuid) IS 'Calculates worker accuracy on gold standard questions optionally scoped to a project';

CREATE OR REPLACE FUNCTION public.update_worker_trust_rating(p_worker_id uuid, p_project_id uuid DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accuracy numeric;
  v_trust numeric;
BEGIN
  IF p_worker_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_accuracy := public.calculate_gold_standard_accuracy(p_worker_id, p_project_id);

  IF v_accuracy IS NULL THEN
    v_trust := NULL;
  ELSE
    v_trust := LEAST(GREATEST(v_accuracy * 100, 0), 100);
  END IF;

  IF v_trust IS NOT NULL AND p_project_id IS NOT NULL THEN
    INSERT INTO public.quality_metrics (
      worker_id,
      project_id,
      metric_type,
      metric_value,
      measured_at
    )
    VALUES (
      p_worker_id,
      p_project_id,
      'quality',
      v_trust,
      NOW()
    );
  END IF;

  RETURN v_trust;
END;
$$;

COMMENT ON FUNCTION public.update_worker_trust_rating(uuid, uuid) IS 'Calculates/records worker trust rating using gold standard accuracy';

CREATE OR REPLACE FUNCTION public.process_gold_standard_answer()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question RECORD;
  v_accuracy numeric;
BEGIN
  SELECT id, project_id, is_gold_standard, correct_answer
  INTO v_question
  FROM public.questions
  WHERE id = NEW.question_id;

  IF NOT FOUND OR v_question.is_gold_standard IS NOT TRUE OR NEW.skipped THEN
    RETURN NEW;
  END IF;

  v_accuracy := public.calculate_gold_standard_accuracy(NEW.worker_id, NEW.project_id);

  IF v_accuracy IS NOT NULL THEN
    INSERT INTO public.quality_metrics (
      worker_id,
      project_id,
      metric_type,
      metric_value,
      measured_at
    )
    VALUES (
      NEW.worker_id,
      NEW.project_id,
      'accuracy',
      v_accuracy,
      NOW()
    );
  END IF;

  PERFORM public.update_worker_trust_rating(NEW.worker_id, NEW.project_id);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.process_gold_standard_answer() IS 'Trigger to recalc accuracy + trust rating when gold answer inserted';

DROP TRIGGER IF EXISTS process_gold_standard_answer_trigger ON public.answers;
CREATE TRIGGER process_gold_standard_answer_trigger
  AFTER INSERT ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION public.process_gold_standard_answer();

GRANT EXECUTE ON FUNCTION public.calculate_gold_standard_accuracy(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.calculate_gold_standard_accuracy(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_gold_standard_accuracy(uuid, uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.update_worker_trust_rating(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.update_worker_trust_rating(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_worker_trust_rating(uuid, uuid) TO service_role;
