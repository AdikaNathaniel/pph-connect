# Quality Metrics Dashboards Status

This doc outlines where quality metrics are ingested and displayed for managers and workers.

## Data Pipeline

- `quality_metrics` table stores per-worker measurements (metric_type = 'quality', score, measured_at). Updates arrive via ETL jobs and `qualityTrackingService` when AI reviewers score answers.
- `quality_alerts`, `quality_warnings`, and `quality_reviews` tables link to workers/projects so dashboards can highlight high-risk performers.

## Worker-Facing Views

- `workerAnalyticsService` queries `quality_metrics` alongside `work_stats` to populate the worker dashboard (“Unlock progress” + quality trend sparkline).
- `WorkerDashboard` and `WorkerAnalytics` pages show percentile badges, trendlines, and insights (e.g., “Top 10% quality”).

## Manager Dashboards

- `/m/quality` renders `QualityDashboard`, which pulls aggregated `quality_metrics`, `quality_alerts`, and `quality_reviews` per project, team, and time period.
- Manager `WorkerDetail` tabs include “Qualifications/Quality” sections, showing recent metrics and alert history for the selected worker.

## Tests & Guardrails

- Verification suites such as `verification_tests/pages/quality_dashboard_structure.test.mjs`, `verification_tests/services/quality_metrics_service.test.mjs`, and `verification_tests/schema/quality_metrics.test.mjs` ensure tables, services, and UI wiring stay intact.

Together these components satisfy “Quality metrics displayed in dashboards” by covering ingestion, worker dashboards, and manager quality views.
