# Capacity Planning Model Plan

## Demand Forecasting
- Inputs: backlog projections, historical task volume, sales pipeline for upcoming projects.
- Approach: Prophet-based time series per project family + categorical regressors (region, customer).
- Output: expected task volume per week with confidence intervals.

## Supply Forecasting
- Inputs: worker availability, ramp-up schedules, attrition probabilities, training completion timelines.
- Approach: cohort-based simulation that projects active hours per team.
- Output: available capacity (hours or tasks) per week.

## Gap Prediction
- Compare demand vs. supply per week; identify weeks with demand > supply.
- Compute deficit ratio and risk level (low/medium/high).

## Recommendations
- Recruitment: suggest number of workers to hire/ramp by target week.
- Task throttling: postpone low-priority launches when deficit is high.
- Overtime / cross-training: flag teams that can absorb extra load.

## Automation & Reporting
- Run nightly job to refresh forecasts using latest data.
- Surface results in Capacity Dashboard and send Slack alerts when deficits exceed thresholds.
