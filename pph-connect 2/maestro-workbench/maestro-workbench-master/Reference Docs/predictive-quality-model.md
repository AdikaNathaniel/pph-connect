# Predictive Quality Model Plan

## Features
- Rolling worker performance metrics (7/30/90-day composite scores, rejection counts).
- Task metadata: domain, complexity tier, modality, time of day.
- Worker-task interaction stats: prior experience with the project, average throughput.
- Contextual signals: queue load, reviewer backlog, anomaly score from the detection model.

## Target
- Regression target: predicted quality score (0–1) for the submitted task.
- Training labels derived from reviewer scores or normalized QA pass rates.

## Training Approach
- Model: Gradient Boosted Trees (LightGBM) or Temporal Fusion Transformer for richer context.
- Train/validation split by time to avoid leakage; monitor MAE + Spearman correlation.
- Handle data drift with weekly retraining and rolling evaluation dashboards.

## Usage & Routing Strategy
- At submission, compute predicted quality; if <0.78, auto-route to expert reviewers.
- Feed scores into assignment logic to steer skilled workers toward high-risk tasks.
- Emit warnings to team leads when average predicted quality for a shift drops below thresholds.

## Deployment
- Package model via ONNX; serve through Supabase Edge Function `POST /quality-predict`.
- Cache per-worker predictions to avoid recomputation when batching assignments.
- Log predictions to `quality_predictions` for audit/retraining datasets.
