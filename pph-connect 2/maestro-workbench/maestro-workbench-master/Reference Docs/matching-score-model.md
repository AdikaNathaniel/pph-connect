# Matching Score Model Plan

## Features
- Worker expertise vector (domains, tiers, certifications).
- Historical performance on similar tasks: quality score, throughput, rejection rate.
- Current workload and availability windows from scheduling data.
- Task metadata: domain, difficulty, customer priority, SLA.
- Learning curve signals (recency of first exposure to domain).

## Target
- Probability of high-quality completion (>=0.9 reviewer score) for worker-task pair.
- Binary labels derived from historical assignments + review outcomes.

## Training Strategy
- Use positive/negative pairs via two-tower model (worker tower + task tower) with cosine similarity.
- Train with contrastive loss + auxiliary classification head to predict success probability.
- Retrain weekly with incremental data and monitor AUC/Lift on validation set.

## Assignment Usage
- At task claim time, score all eligible workers; rank by predicted probability.
- Apply business rules (fairness, load balancing) to final ranking.
- Log decisions + feature snapshots to `matching_decisions` table for audits and future improvements.

## Deployment
- Export embeddings to Supabase storage, serve scoring via Edge Function `POST /match-score` returning top workers.
- Cache worker embeddings in Redis for sub-50ms scoring.
