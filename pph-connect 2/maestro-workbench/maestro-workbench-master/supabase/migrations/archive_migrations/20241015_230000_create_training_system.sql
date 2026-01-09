-- Training modules (reusable content)
CREATE TABLE IF NOT EXISTS training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Simpler approach: one training module per project
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS training_module_id uuid REFERENCES training_modules(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS training_required boolean DEFAULT false;

-- Track completions
CREATE TABLE IF NOT EXISTS worker_training_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  training_module_id uuid REFERENCES training_modules(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(worker_id, training_module_id, project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_training_module ON projects(training_module_id);
CREATE INDEX IF NOT EXISTS idx_worker_training_completions_worker ON worker_training_completions(worker_id, project_id);
