# Project Completion Forecasting Plan

## Inputs
- Historical project metrics: total tasks, completed tasks per day, active workers, quality rejection rate.
- Worker performance features: average throughput, availability schedule, utilization.
- External signals: planned scope changes, holidays, staffing adjustments.

## Model
- Time series: Prophet or Temporal Fusion Transformer to capture seasonality + events.
- Features engineered per project: cumulative completion %, velocity, worker capacity forecast.
- Train/test split by project timeline; evaluate MAE on completion date prediction.

## Outputs
- Predicted completion date with 80%/95% confidence intervals.
- Daily burn-down chart overlayed with forecast trajectory.
- Risk indicators when forecast slips beyond SLA thresholds.

## Update Cadence
- Refresh forecasts daily via scheduled job pulling latest metrics.
- Re-run model on major scope changes; store historical forecasts for drift analysis.

## Integration
- Surface forecast in Project Detail dashboard, notify PMs when confidence interval exceeds SLA.
- Expose API endpoint `/project-forecast/:projectId` for downstream tooling.
