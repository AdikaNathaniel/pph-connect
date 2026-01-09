# Question Asset Status Table Setup

This repo already ships the `public.question_asset_status` ledger described in the Annotation Stages plan. The notes below reflect the *current* schema and the way it is exercised by the audio ingestion + review pipeline that now runs through Supabase Storage.

## Current Schema

| Column | Type | Details / Source |
| --- | --- | --- |
| `id` | `uuid` PK | System key for the ledger row. |
| `project_id` | `uuid` FK → `public.projects.id` | Allows project-level analytics and clean cascade on project delete. |
| `question_uuid` | `uuid` FK → `public.questions.id` (unique) | 1:1 with the question replication being tracked. |
| `question_id` | `text` | Stored copy of `questions.question_id` (human-friendly ID). |
| `replication_index` | `integer` | Mirrors the question row index (defaults to 1). |
| `asset_source_id` | `text` | Original Drive file id injected when questions are created. |
| `audio_asset_id` | `uuid` FK → `public.audio_assets.id` (nullable) | Populated when the Supabase ingestion worker stages audio. |
| `supabase_audio_path` | `text` (nullable) | Direct storage path (`audio-assets/audio-projects/...`) used by the workbench for streaming. |
| `current_status` | `text` enum | `pending`, `transcribed`, `review_pending`, `reviewed`, `qc_ready`, `completed`, `skipped`. |
| `transcription_task_uuid` | `uuid` FK → `public.tasks.id` | Reservation record when a worker claims the task. |
| `transcription_answer_uuid` | `uuid` FK → `public.answers.id` | Answer id for the completed transcription. |
| `review_task_uuid` | `uuid` FK → `public.review_tasks.id` | Review queue reservation (cleared when review finishes or is skipped). |
| `review_submission_uuid` | `uuid` FK → `public.review_submissions.id` | Reviewer payload. |
| `qc_record_uuid` | `uuid` FK → `public.qc_records.id` | Auto-generated QC stub. |
| `final_answer_uuid` | `uuid` FK → `public.final_answers.id` | Canonical deliverable JSON. |
| `transcriber_uuid` | `uuid` FK → `public.profiles.id` | Who submitted the transcription. |
| `reviewer_uuid` | `uuid` FK → `public.profiles.id` | Reviewer of record. |
| `qc_reviewer_uuid` | `uuid` FK → `public.profiles.id` | Reserved for QC tooling. |
| `transcription_submitted_at` | `timestamptz` | Timestamp captured by `update_question_asset_status_after_transcription`. |
| `review_submitted_at` | `timestamptz` | Filled when review completes. |
| `qc_created_at` | `timestamptz` | Currently mirrors the QC stub creation timestamp. |
| `finalized_at` | `timestamptz` | Set when the workflow reaches `completed`. |
| `deliverable_url` | `text` | Pointer to the final answer JSON blob (matches “final_answer_url” in the blueprint). |
| `review_json_url` | `text` | Stored reference to review payload export. |
| `qc_json_url` | `text` | Reserved for QC artefacts. |
| `metadata` | `jsonb` | Lightweight cache of question + asset metadata. |
| `created_at` / `updated_at` | `timestamptz` | Managed by `update_updated_at_column()` trigger. |

> **Status delta vs. blueprint:** we currently map `transcription_in_progress → pending`, `review_in_progress → reviewed`, and future QC states to `qc_ready`. Skips still set the explicit `skipped` status. We can extend the enum if we want dedicated `review_in_progress` later.

## Lifecycle Hooks

- **Row creation:** `public.init_question_asset_status` fires after each question insert. The audio ingestion worker re-runs `upsert` logic so legacy Drive projects and the new Supabase ingestion both seed the ledger.
- **Transcription submit:** `public.update_question_asset_status_after_transcription` is invoked from `src/lib/answers.ts`. It stamps the transcription task/answer UUIDs, the transcriber, the submission timestamp, and flips `current_status` to `review_pending`.
- **Review enqueue/claim:** `public.enqueue_review_task` (and its secure wrapper in recent migrations) writes `review_task_uuid`. The worker client sets the waveform source by reading `supabase_audio_path`; this doubles as a sanity check that the ledger row is up to date.
- **Review submit:** Review RPCs (in `src/lib/reviews.ts`) set the reviewer IDs, review submission UUID, `review_submitted_at`, final answer UUID/URL, and advance the status to `completed`. QC scaffolding (`qc_record_uuid`, `qc_created_at`, `qc_json_url`) is also updated here.
- **Skips:** When workers skip a task, the answer payload and `metadata` are updated with the skip reason. The ledger status is moved to `skipped` and the review reservation is cleared. (We still store the textual reason in `metadata`; a dedicated `skip_reason` column can be added later if we need easier analytics.)

## Interaction with Supabase Storage

The new ingestion function (`ingest-audio-assets`) fills `audio_asset_id` and `supabase_audio_path` as soon as a Drive file is copied into the `audio-assets` bucket. The workbench now prefers streaming from this path, falling back to Drive only if the Supabase copy is absent. When cleanup runs, storage objects are removed and the corresponding `audio_assets` rows shift to `archived`; the ledger row remains for auditing.

## Analytics & Exports

Dashboards or downstream exports can join `question_asset_status` to:

- `audio_assets` for Supabase copy health (`status`, checksums, failure messages).
- `answers`, `review_submissions`, `final_answers`, and `qc_records` for stage-specific payloads.
- `projects` to report overall project stage completion (new `projects.status` values `importing` → `ready` → `active`).

### Import Telemetry

- `projects.import_expected_assets / import_ready_assets / import_failed_assets` now track ingestion progress and feed the manager UI progress bars.
- `audio_asset_events` captures every ingestion/cleanup transition (`transferring`, `ready`, `failed`, `archived`) with messages and metadata (size, checksum, errors) so managers can self-serve debugging from the new Upload Logs screen.

Because the ledger maintains every UUID involved in the lifecycle, it is the single source of truth for stage timing, assignment attribution, and deliverable links—exactly as described in the original Annotation Stages blueprint. Future QC work only needs to extend the QC columns that already exist (status + timestamp placeholders).
