-- Add RLS policy to allow workers to update question completion status
CREATE POLICY "Workers can update question completion status" 
ON public.questions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_assignments 
    WHERE worker_id = auth.uid() AND project_id = public.questions.project_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_assignments 
    WHERE worker_id = auth.uid() AND project_id = public.questions.project_id
  )
);

-- Also allow managers to update questions
CREATE POLICY "Managers can update all questions" 
ON public.questions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('root', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('root', 'manager')
  )
);

