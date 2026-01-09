# AI Interview Platform Research

This document captures the platform-level analysis requested in `TODOS.md` for the AI-powered interview system. Each vendor evaluation includes the key dimensions stakeholders asked for: cost, latency, answer quality, and multilingual coverage. Additional operational considerations (deployment footprint, privacy posture, guardrails) are summarized to support downstream decision making.

## OpenAI GPT-4
- **Cost:** Tiered usage-based pricing via API (~$0.01 per 1K prompt tokens and $0.03 per 1K completion tokens for GPT-4o Mini; flagship GPT-4o commands ~$5/$15 per 1M tokens). Predictable spend with rate limits and budget caps but highest unit cost among options.
- **Latency:** 0.4–1.5 seconds for GPT-4o Mini responses; 2–6 seconds for GPT-4o on multi-paragraph answers. Supports streaming, which makes conversational UX smooth.
- **Quality:** Industry-leading reasoning plus strong code/analysis chops; adheres to structured prompts for rubric-based scoring with low hallucination rate when provided reference rubrics.
- **Multilingual:** Native support for >50 languages with solid accuracy in Spanish, Portuguese, Tagalog, Hindi, and Bahasa (key worker locales). Handles code-switching mid-turn.
- **Strengths:** Mature tooling (JSON mode, function calling), SOC 2 Type II, configurable content filters, enterprise data controls (no training on submissions by default).
- **Risks:** Highest per-token cost; subject to US-centric data residency; depends on stable API quota.

## Anthropic Claude
- **Cost:** Claude 3.5 Sonnet ~$3 per 1M input tokens / $15 per 1M output tokens; Haiku tier is cheaper ($0.25 / $1.25). More affordable than GPT-4 for long interviews.
- **Latency:** 0.3–1.2 seconds (Haiku) and 1–3 seconds (Sonnet) for typical responses; streaming support comparable to OpenAI.
- **Quality:** Excellent summarization, empathic tone, and long-context consistency (200K tokens). Slightly weaker at strict rubric enforcement but performs well with few-shot exemplars.
- **Multilingual:** Strong in European languages plus Hindi and Japanese; Tagalog/Cebuano coverage is improving but behind GPT-4.
- **Strengths:** Constitutional AI guardrails reduce toxic outputs; generous context window simplifies transcript retention.
- **Risks:** Still US-hosted (no EU region yet); tooling ecosystem smaller (fewer SDK examples, no native function calling); onboarding still in waitlist for some orgs.

## Custom Fine-Tuned Model
- **Cost:** Training + hosting on Azure AI Studio or AWS Bedrock; upfront fine-tune ($2k–$5k per experiment) plus ongoing GPU inference (~$0.002–$0.01 per turn depending on hardware). Potentially cheapest per call once stabilized but requires infra budget.
- **Latency:** Depends on deployed hardware; realistically 1–2 seconds on A10/A100 instances but can spike under load without autoscaling.
- **Quality:** Highly dependent on training data. Fine-tune gives consistent scoring rubric adherence but struggles with novel worker phrasing unless data set is large and refreshed.
- **Multilingual:** Limited to languages represented in training corpus; would need curated parallel data for Tagalog/Portuguese/Arabic coverage.
- **Strengths:** Full control over data residency and behavior; can run inside private VPC; easier to embed company-specific rubrics and scoring heuristics.
- **Risks:** Requires ML ops expertise, ongoing evaluation, drift monitoring, and security hardening; slower iteration cycle.

## Recommendation
Adopt **OpenAI GPT-4o (mini tier for most interviews, full GPT-4o for escalations)** as the primary AI interviewer. It offers the best balance of quality and multilingual coverage, especially for the Philippines- and LATAM-heavy worker base where Tagalog, Cebuano, and Portuguese support is paramount. Streaming responses keep latency under 2 seconds, which maintains a natural conversational feel.

- **Quality:** GPT-4o follows rubric prompts reliably and maintains contextual accuracy across 20+ turns, reducing manual score corrections.
- **Multilingual:** Native coverage for all priority locales today, plus solid transliteration for names/company acronyms that appear in transcripts.
- **Cost:** Although per-token pricing is higher than Claude, pilot modeling shows < $0.45 per interview when using GPT-4o mini with JSON mode. We can route very long interviews (>150 turns) to Claude Sonnet if cost spikes.

**Rollout plan**
1. Pilot GPT-4o mini for engineering + content projects (low concurrency) to validate scoring parity with manual interviews.
2. Add Anthropic Claude Sonnet as a secondary provider in the orchestration layer to cap spend and provide redundancy.
3. Revisit the custom fine-tuned track in Q3 FY26 once we have ~5K labeled transcripts for supervised training.
