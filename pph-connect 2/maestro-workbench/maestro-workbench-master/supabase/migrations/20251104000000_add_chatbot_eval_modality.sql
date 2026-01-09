-- Add chatbot-eval modality support
-- This extends the modality layer to support chatbot evaluation tasks

-- Update the check constraint to include chatbot-eval
ALTER TABLE public.task_templates
  DROP CONSTRAINT IF EXISTS valid_modality;

ALTER TABLE public.task_templates
  ADD CONSTRAINT valid_modality CHECK (
    modality IN ('spreadsheet', 'audio-short', 'audio-long', 'text', 'image', 'video', 'multimodal', 'chatbot-eval')
  );

-- Update the comment to include chatbot-eval
COMMENT ON COLUMN public.task_templates.modality IS 
  'Type of task modality: spreadsheet, audio-short, audio-long, text, image, video, multimodal, chatbot-eval';

