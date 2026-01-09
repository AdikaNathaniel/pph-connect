-- Ensure lookups for training module relationships are indexed
create index if not exists projects_training_module_id_idx
  on public.projects (training_module_id);

create index if not exists worker_training_completions_module_completed_idx
  on public.worker_training_completions (training_module_id, completed_at);
