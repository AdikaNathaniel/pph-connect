# Anomaly Detection Model Plan

## Training Data
- Source: task completions with reviewer quality labels (approved/rejected) stored in `quality_metrics` and `work_stats`.
- Sampling window: last 6 months to capture current workflows.
- Positive class: tasks flagged by QA (defects, escalations). Negative class: normal completions.

## Feature Set
1. **Time to complete** – `completion_seconds`, log-transformed to reduce skew.
2. **Answer length** – token count or character length of final answer.
3. **Similarity to other answers** – cosine similarity against median embedding for that prompt.
4. **Worker historical patterns** – rolling 7/30/90-day quality scores, rejection counts, and variability.
5. **Metadata** – task type, difficulty tier, time of day, locale.

## Model Architecture
- Baseline: Gradient Boosting (XGBoost) classifier for tabular features.
- Label imbalance handled via class weights (rare anomalies) and focal loss.
- Evaluation: ROC-AUC + precision@k to ensure high recall on flagged items.
- Threshold tuning: choose anomaly probability cutoff to cap false positives <5%.

## Deployment Strategy
1. Serialize model via ONNX or native XGBoost artifact.
2. Wrap inference in a lightweight Edge Function (`POST /anomaly-score`) with feature vector assembly (embedding service + Supabase queries).
3. Real-time inference triggered on task submission; asynchronous batch scoring for backlog.
4. Logging: store scores + features in `quality_anomaly_scores` table for audits.

## Next Steps
- Finalize feature engineering notebook, run hyperparameter search.
- Validate with QA team before promoting to production endpoint.
- Integrate scoring call in task completion pipeline (with fallback if endpoint unavailable).
