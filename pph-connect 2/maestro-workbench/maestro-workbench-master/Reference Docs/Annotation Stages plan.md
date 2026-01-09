# Audio Shortform Workflow Blueprint

## Entities
- **Task Templates (plugins)**: single source of UI + ingestion config. Spreadsheet templates remain unchanged; audio shortform templates will toggle review support once we build it.
- **Projects**: bind a plugin to a dataset/run. No schema changes required yet; review behaviour will be inferred from the selected plugin.
- **Assignments**: current schema (`project_assignments`) continues to gate who can see a project. Future iteration will extend this with per-stage capabilities (transcribe / review / QC) and priorities.
- **Questions / Answers**: existing tables remain the backbone for transcription. Review and QC artefacts will live in new tables once implemented.
- **Workflow Artifacts (planned)**:
  - `review_tasks` – reservation queue for reviewers.
  - `review_submissions` – reviewer payload (ratings, edits, notes).
  - `qc_records` – automatic QC metadata.
  - `final_answers` – published deliverable JSON.
  - `question_asset_status` – one row per replication tracking IDs across every stage.

## Engine Responsibilities
- **Ingestion Engine**: already supports Google Drive and Google Sheets. For audio, reuse the Drive ingestion that populates `questions` with `drive_file_id`.
- **Reservation Engine**: current `tasks` table + `claim_next_available_question` RPC. A parallel queue (`review_tasks` + `claim_next_review_task`) will handle review stage without disturbing spreadsheets.
- **Workflow Engine (future)**: JSON-defined stages (transcribe → review → QC) inspired by SuperAnnotate. Keeps transitions, constraints, and automations declarative so other modalities (longform audio, video) can reuse it.
- **Analytics / Export Engine (planned)**: powered by `question_asset_status` + `final_answers` to provide chain-of-custody views and JSON downloads.

## ID Strategy
| Layer | Primary Key (UUID) | Human-readable ID | Notes |
|-------|--------------------|-------------------|-------|
| Asset | `questions.data.drive_file_id` | external ID | Stable pointer to original media |
| Question | `questions.id` | `questions.question_id` | One per replication |
| Task | `tasks.id` | – | Reservation record for transcription |
| Answer | `answers.id` | `answers.answer_id` | Transcriber submission |
| Review | `review_submissions.id` | `review_id` (generated) | Links to answer + reviewer |
| QC | `qc_records.id` | `qc_id` | Auto-created from review |
| Final Deliverable | `final_answers.id` | `final_answer_id` | Immutable output JSON |

All new tables will follow the `_uuid` (primary key) vs `_id` (display string) convention to avoid historical confusion between UUIDs and friendly IDs.

## Stage Flow (target)
1. **Transcription**  
   - Worker submits answer (`answers`).  
   - If plugin review toggle is on, enqueue `review_task`, stamp transcriber UUID/answer info on `question_asset_status`, and move status to `review_pending`.
2. **Review**  
   - Reviewers see a dedicated shortform audio UI: waveform player, read-only preamble and transcript, editable fields for corrections, star rating widget, highlight tags (Accuracy/Punctuation/Guidelines/Label), feedback-to-transcriber, and internal notes (hidden from workers).  
   - `submit_review` RPC writes `review_submissions`, `final_answers`, and auto-creates `qc_records`.  
   - `question_asset_status` transitions to `completed`, capturing reviewer IDs, final payload links, and QC references.
3. **QC Audit (passive for now)**  
   - No UI yet; data stored for analytics. Future auditors can update `qc_records` without touching deliverables.

## Assignment & Priorities
- Project assignments gain per-stage toggles: `can_transcribe`, `can_review`, `can_qc`. Transcriber is on by default; managers can grant review/QC with a click.
- Each stage has its own priority (P0–P100). A worker assigned as Transcriber P50 + Reviewer P0 will automatically claim review tasks once available, otherwise they fall back to transcription.
- Bulk assignment tooling should allow flipping multiple workers’ stage toggles/priority presets so review pools feel like separate “projects” without cloning data.

## Data Explorer / Exports
- `question_asset_status` becomes the canonical table for dashboards and exports (contains links to transcription JSON, review payload, QC metadata, and final deliverable).
- Exports can simply join `final_answers` + `review_submissions` for richer reporting while leaving spreadsheet pipelines untouched.

## Workflow Constraints & Defaults
- Audio shortform is forward-only: stages never loop back to transcription. The only escape hatch is **Skip**, which is visible to all roles and bypasses review/QC.
- Default configuration enforces 100 % review. Every review submission immediately marks the replication complete and funnels it into the QC pool (informational only for now).
- Admins retain override abilities (manual status edits, emergency releases) but standard users only see transitions allowed for their stage.

## QA Outputs & Discoverability
- `review_submissions.review_payload` stores the reviewer-edited transcript plus ratings/notes; `final_answers.deliverable` is the canonical JSON delivered downstream.
- `qc_records.qc_payload` keeps placeholders for audit metadata so future QC tooling can add verdicts without reworking deliverables.
- `question_asset_status` includes URLs/IDs for transcription JSON, review JSON, and final deliverable so a manager can trace or export any asset’s full history.

## Implementation Phasing
1. **Schema pass** – introduce review/QC/final-answer tables, helper RPCs, and status ledger (without altering spreadsheet flows).
2. **Frontend pass** – new audio shortform transcription + review UIs, updated assignment UI for stage roles/priorities, review workbench flow.
3. **Workflow editor** – JSON-driven stage designer inspired by SuperAnnotate once basic flow is stable.

## Reusability
- The same workflow + status engine should power longform audio, video, or multimodal tasks. Swapping the plugin (UI + data schema) and workflow template is all that’s needed.
- Reservation logic (claim/release) remains shared across modalities; the only difference is which queue (transcription vs. review) the engine pulls from.
- Keeping IDs consistent (`*_uuid` vs `*_id`) guarantees downstream services and automations can scale to additional modalities without new naming conventions.

This document is safe for ingestion by automation (factory.ai / Codex) and acts as the execution blueprint for shortform audio with review + QC while preserving today’s spreadsheet engine.
