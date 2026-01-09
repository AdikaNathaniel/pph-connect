# Performance Threshold Plan

## Project-Level Thresholds
- Each project defines:
  - Minimum accuracy (default 90%).
  - Maximum rework rate (default 5%).
  - Latency SLA (avg completion time vs target).

## Worker Flagging Rules
- If a worker’s 14-day accuracy < project threshold → flag.
- If rework rate > 2× project target → flag.
- Combine with anomaly signals for escalation.

## Actions
- First violation: auto-notify worker + manager.
- Repeated violations: remove from project, require retraining.
