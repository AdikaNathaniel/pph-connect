-- Clean up duplicate active reservations and enforce a single active task per worker
-- Keeps the earliest reservation per worker and releases later duplicates back to pending.

-- Release duplicate reservations, keeping the earliest assignment per worker
WITH ranked_reservations AS (
  SELECT
    id,
    assigned_to,
    assigned_at,
    status,
    ROW_NUMBER() OVER (
      PARTITION BY assigned_to
      ORDER BY assigned_at ASC NULLS LAST, id ASC
    ) AS reservation_rank
  FROM public.tasks
  WHERE assigned_to IS NOT NULL
    AND status IN ('assigned', 'in_progress')
)
UPDATE public.tasks AS t
SET status = 'pending',
    assigned_to = NULL,
    assigned_at = NULL,
    updated_at = NOW()
WHERE t.id IN (
  SELECT id
  FROM ranked_reservations
  WHERE reservation_rank > 1
);

-- Recreate partial unique index to enforce a single active reservation per worker
DROP INDEX IF EXISTS idx_tasks_one_active_reservation;
CREATE UNIQUE INDEX idx_tasks_one_active_reservation
  ON public.tasks (assigned_to)
  WHERE assigned_to IS NOT NULL
    AND status IN ('assigned', 'in_progress');
