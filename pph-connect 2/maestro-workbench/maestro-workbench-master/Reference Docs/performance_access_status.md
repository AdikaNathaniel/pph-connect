# Performance-Based Access Status

This note summarizes the dynamic gating logic that restricts or expands worker access based on performance.

## Data Inputs

- `performance_thresholds` table stores global settings (minimum quality %, max rejection rate, latency caps, minimum actions). The ETL in `performanceMonitoringLogic` reads these values.
- `work_stats`, `quality_metrics`, and `auto_removals` supply per-worker signals (units, earnings, quality scores, removal history).

## Access Evaluation

- `performanceMonitoringLogic.classifyPerformance` (and `performanceMonitoringService`) aggregate the above signals, compare them to thresholds, and output classifications (`good`, `warning`, `blocked`).
- The “Access Gating” logic on `WorkersTable` uses this classification to show `Eligible` or `Blocked` badges with reasons (quality threshold, training incomplete, missing skills, violations).
- Task unlocking / job board uses the same classification via `taskUnlockService`, blocking workers from applying to projects that exceed their current tier.

## UI Surfaces

- Workers see access notices on `/worker/dashboard` (e.g., “Your access is limited until you complete training”).
- Managers see gating badges on the worker list and detail pages, plus `auto_removals` appeal tools when workers are blocked.

## Verification

- Tests such as `verification_tests/services/performance_monitoring_service.test.mjs`, `verification_tests/components/performance_access_badge.test.mjs`, and `verification_tests/pages/workers_table_structure.test.mjs` ensure logic + UI stay wired together.
