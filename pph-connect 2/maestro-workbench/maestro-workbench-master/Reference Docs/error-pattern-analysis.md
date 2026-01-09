# Automated Error Pattern Analysis Plan

## Clustering Strategy
- Aggregate annotated errors from `quality_anomalies`, reviewer notes, and rejection reasons.
- Normalize text via embeddings (OpenAI or internal encoder) and run mini-batch k-means to create error clusters (e.g., "missed entity", "formatting issue").
- Refresh clusters weekly; store centroids + top keywords in `error_clusters` table.

## Per-Worker Patterns
- Join clusters with worker IDs to compute frequency per worker/project.
- Threshold-based alerts: if a worker has >3 occurrences in a cluster over 7 days, flag for coaching.
- Visualization: per-worker heatmap showing cluster densities over time.

## Reporting
- Weekly report automatically generated with insights:
  - "Worker X frequently misses Y" (link to representative tasks)
  - "Task type Z has high error rate" with cluster composition.
- Export as Markdown + send summary to QA Slack channel.

## Personalized Training
- Map clusters to existing training modules; if none exists, log a training request.
- When a worker is flagged, auto-assign relevant micro-learning content and track completion.
- Record interventions in `worker_error_interventions` for auditing.

## Implementation Outline
1. Build ETL job to pull errors, compute embeddings, and refresh clusters.
2. Store cluster assignments in Supabase tables for dashboards.
3. Add QA dashboard widgets showing top error clusters, per-worker flags, and training assignments.
