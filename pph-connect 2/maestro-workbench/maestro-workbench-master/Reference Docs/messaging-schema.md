# Messaging Schema Reference

This document captures the current messaging-related database schema as implemented in the Supabase migrations. Each section describes the purpose of the table, key columns, and relevant indexes or constraints.

## Messages Table

Tracks individual messages that belong to a thread.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key generated via `gen_random_uuid()` |
| `thread_id` | `uuid` | References `public.message_threads(id)`; cascades on delete |
| `sender_id` | `uuid` | References `public.workers(id)`; cascades on delete |
| `content` | `text` | Message body text |
| `attachments` | `jsonb` | Defaults to empty array; stores attachment metadata |
| `sent_at` | `timestamptz` | Defaults to `now()` |
| `deleted_at` | `timestamptz` | Soft-delete marker; NULL when active |
| `created_at` | `timestamptz` | Defaults to `now()` |
| `updated_at` | `timestamptz` | Defaults to `now()` |
| `delivery_type` | `public.message_delivery_type` | Defaults to `direct`; `broadcast` for mass notifications |

**Indexes**
- `idx_messages_thread_id` on `thread_id`
- `idx_messages_sender_id` on `sender_id`
- `idx_messages_sent_at` on `sent_at DESC`

**Other Notes**
- `attachments` records metadata objects such as `{ path, name, size, type }`.
- `deleted_at` is used for audit-friendly soft deletion.
- `delivery_type` toggles between individual (`direct`) and broadcast deliveries.

## Message Threads Table

Represents conversation containers that group related messages.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key generated via `gen_random_uuid()` |
| `subject` | `text` | Thread subject/title |
| `created_by` | `uuid` | References `public.workers(id)`; cascades on delete |
| `created_at` | `timestamptz` | Defaults to `now()` |
| `updated_at` | `timestamptz` | Defaults to `now()` |

**Indexes**
- `idx_message_threads_created_by` on `created_by`

## Message Attachments Storage

Attachments are stored in the private Supabase storage bucket `message-attachments`. The messaging tables reference attachment metadata through the `messages.attachments` JSONB array rather than a relational table.

- **Bucket ID / Name:** `message-attachments`
- **Access:** Private (authenticated users only)
- **File Size Limit:** 10MB per file (`10485760` bytes)
- **Allowed MIME Types:** common images (`image/jpeg`, `image/png`, `image/webp`, etc.), PDFs, Microsoft Office documents (`.docx`, `.xlsx`, `.pptx`), plain text, CSV, and ZIP archives.
- **Key Policies:** authenticated users can upload/view their own attachments, recipients can view attachments shared with them, admins (root/manager) can view all, and uploaders may delete recent uploads within an hour.

## Message Groups Table

Conversation groups and saved recipient lists live in `public.message_groups`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key generated via `gen_random_uuid()` |
| `name` | `text` | Group name |
| `created_by` | `uuid` | References `public.workers(id)`; cascades on delete |
| `recipient_ids` | `uuid[]` | Default empty array; legacy list of recipients for saved lists |
| `description` | `text` | Optional narrative for group purpose |
| `avatar_url` | `text` | Optional group avatar/icon |
| `is_active` | `boolean` | Defaults to `true`; archived vs active |
| `group_type` | `text` | Defaults to `conversation`; also supports `saved_list` |
| `created_at` | `timestamptz` | Defaults to `now()` |
| `updated_at` | `timestamptz` | Defaults to `now()` |

**Indexes**
- `idx_message_groups_created_by` on `created_by`

**Automation**
- Trigger `trigger_add_creator_to_group` calls `add_creator_to_group()` to insert the creator as an admin member whenever a new conversation group is created.

## Group Members Table

Tracks membership for message groups with role and lifecycle data.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key generated via `gen_random_uuid()` |
| `group_id` | `uuid` | References `public.message_groups(id)`; cascades on delete |
| `user_id` | `uuid` | References `public.workers(id)`; cascades on delete |
| `role` | `text` | Defaults to `member`; `admin` grants management privileges |
| `joined_at` | `timestamptz` | Defaults to `now()` |
| `left_at` | `timestamptz` | Soft-leave marker; NULL when active |
| `created_at` | `timestamptz` | Defaults to `now()` |

**Indexes**
- `idx_group_members_group_id` on `group_id`
- `idx_group_members_user_id` on `user_id`
- Partial `idx_group_members_active` on `(group_id, user_id)` filtering `left_at IS NULL`

**Constraints**
- Unique `(group_id, user_id)` ensures a single active membership record per user per group.

## Group Read Status

Read tracking for group conversations is handled through the `group_members.last_read_at` column (added via migration `20251030010000_add_group_read_tracking.sql`). When a member views a group, application logic updates `last_read_at`, enabling unread message calculations by comparing the timestamp to message `sent_at` values.

- `last_read_at` defaults to each member's `joined_at` during migration backfill.
- Unread counts = number of group-linked messages where `messages.sent_at > group_members.last_read_at` for the member.
- Because tracking lives on `group_members`, no separate `group_read_status` table is required.

## Message Audience Targets

Department and team targeting is modeled via `public.message_audience_targets`, linking message threads to organizational segments.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key generated via `gen_random_uuid()` |
| `thread_id` | `uuid` | References `public.message_threads(id)`; cascades on delete |
| `department_id` | `uuid` | References `public.departments(id)`; nullable |
| `team_id` | `uuid` | References `public.teams(id)`; nullable |
| `created_at` | `timestamptz` | Defaults to `now()` |
| `created_by` | `uuid` | References `public.workers(id)`; nullable, set null on worker removal |

**Constraints**
- CHECK constraint enforces at least one of `department_id` or `team_id` is populated.

**Indexes**
- `idx_message_audience_targets_thread` on `thread_id`
- Partial `idx_message_audience_targets_department` on `department_id`
- Partial `idx_message_audience_targets_team` on `team_id`

## Message Broadcast Runs

Broadcast executions are captured in `public.message_broadcast_runs`, one record per dispatch cycle.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key generated via `gen_random_uuid()` |
| `thread_id` | `uuid` | References `public.message_threads(id)`; cascades on delete |
| `message_id` | `uuid` | References `public.messages(id)`; cascades on delete |
| `audience_target_id` | `uuid` | References `public.message_audience_targets(id)`; nullable (e.g., full broadcast) |
| `status` | `public.message_broadcast_status` | `pending` → `processing` → `completed` / `failed` |
| `summary` | `text` | Optional execution notes |
| `run_by` | `uuid` | References `public.workers(id)`; nullable, set null if worker removed |
| `run_at` | `timestamptz` | Defaults to `now()` |
| `created_at` | `timestamptz` | Defaults to `now()` |

**Indexes**
- `idx_message_broadcast_runs_thread` on `thread_id`
- `idx_message_broadcast_runs_status` on `status`
