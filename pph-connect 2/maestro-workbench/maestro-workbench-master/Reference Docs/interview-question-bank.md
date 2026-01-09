# Interview Question Bank

Guidance for AI/manager-led interviews across core worker supply domains. Each domain lists canonical question themes plus the competency tags we use downstream for scoring rubrics and training data labelling.

## STEM
- **Foundational reasoning:** e.g., "Explain how you would estimate the number of API calls a system handles per hour." Targets problem decomposition.
- **Data interpretation:** Provide chart/table and ask candidate to summarize anomalies and outline validation steps.
- **Tool familiarity:** Questions about Git, Python notebooks, or QA harnesses used in Maestro workflows.

## Legal
- **Issue spotting:** Present a short contract clause; ask worker to identify red flags (jurisdiction conflicts, indemnity gaps).
- **Compliance workflow:** "Describe how you would verify that a document meets GDPR deletion requirements." Focus on procedural rigor.
- **Tone checks:** Ask candidate to rewrite a policy update for non-legal stakeholders, testing clarity.

## Creative
- **Copy editing:** Provide product brief; ask for a two-sentence marketing hook plus rationale.
- **Content adaptation:** "How would you localize this paragraph for an audience in Mexico without literal translation?" Evaluates cultural nuance.
- **Ideation speed:** Quick brainstorm (e.g., 5 tagline variants in 90 seconds) to assess divergent thinking.

## Medical
- **Terminology accuracy:** Ask worker to explain the difference between ICD and CPT coding or to define key anatomy terms.
- **Scenario triage:** Provide patient intake summary and have candidate outline first-line actions (non-diagnostic, focuses on protocol).
- **Data hygiene:** "Describe how you would de-identify PHI before uploading case notes to Maestro." Confirms HIPAA awareness.

## Adaptive Question Trees
- **STEM:** Baseline estimation prompt → **Follow-up:** dive into system design tradeoffs → **Calibration:** ask candidate to generalize approach to a different traffic scale.
- **Legal:** Initial clause review → **Follow-up:** require prioritization of two risk items → **Calibration:** role-play advising a non-legal stakeholder on next steps.
- **Creative:** Provide seed brief → **Follow-up:** request iteration in a new tone/locale → **Calibration:** have candidate critique their own draft for gaps.
- **Medical:** Intake synopsis → **Follow-up:** have candidate justify triage priority → **Calibration:** ask how protocol shifts if a new contraindication appears.

## Evaluation Criteria
| Domain | Primary Focus | Secondary Signals |
| --- | --- | --- |
| STEM | Accuracy of solutioning, correctness of calculations, **problem decomposition** clarity | Communication under ambiguity, ability to reference prior experiments |
| Legal | **Compliance** alignment, spotting risk vectors, articulation of **risk rationale** | Stakeholder empathy, ability to cite supporting statutes/policies |
| Creative | Voice/tone control, originality of ideas, structured **tone** switching | Brief adherence, ability to justify creative decisions |
| Medical | **Protocol adherence**, safety guardrails, handling of edge cases, data privacy discipline | Explicit mention of **privacy**/HIPAA steps, collaboration cues |
