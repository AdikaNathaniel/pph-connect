-- Add Modality Layer to Task Templates (Non-Breaking Migration)
-- All existing spreadsheet plugins continue working without changes

-- Add modality columns to task_templates table
ALTER TABLE public.task_templates 
  ADD COLUMN IF NOT EXISTS modality TEXT NOT NULL DEFAULT 'spreadsheet',
  ADD COLUMN IF NOT EXISTS modality_config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS label_ontology JSONB DEFAULT NULL;

-- Add comment documentation
COMMENT ON COLUMN public.task_templates.modality IS 
  'Type of task modality: spreadsheet, audio, text, image, video, multimodal';

COMMENT ON COLUMN public.task_templates.modality_config IS 
  'Modality-specific configuration (file formats, playback controls, etc.)';

COMMENT ON COLUMN public.task_templates.label_ontology IS 
  'Optional annotation schema for modalities that require labeling (audio, text, image, video). NULL for spreadsheet modality.';

-- Create index for filtering by modality
CREATE INDEX IF NOT EXISTS idx_task_templates_modality 
  ON public.task_templates(modality);

-- Verify existing templates are set to spreadsheet (should already be via DEFAULT)
UPDATE public.task_templates 
SET modality = 'spreadsheet' 
WHERE modality IS NULL OR modality = '';

-- Add check constraint for valid modality types
ALTER TABLE public.task_templates
  ADD CONSTRAINT valid_modality CHECK (
    modality IN ('spreadsheet', 'audio-short', 'audio-long', 'text', 'image', 'video', 'multimodal')
  );

