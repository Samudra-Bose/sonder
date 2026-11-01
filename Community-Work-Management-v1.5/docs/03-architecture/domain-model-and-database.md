# Domain Model and Database Design

**Baseline:** v1.5.0 · **API:** 0.3.20-draft (not frozen)

Logical model only. SQL migrations and RLS are not represented as executed.

# 3. Domain model and information architecture

## 3.1 Governing hierarchy — OWNER CONFIRMED

```text
Global User Identity
  └── Community (tenant boundary)
        ├── CommunityMembership
        └── Workspace (Personal | Shared)   ← primary work container
              ├── WorkspaceMembership (Shared only)
              ├── Workspace Settings / Roles / Workflow
              ├── Saved Views
              ├── Custom Field Definitions
              ├── Milestones (optional Workspace-level planning markers)
              └── Task
                    └── Subtask (configurable depth)
```

There is no Project or List layer. A team that needs a separate context creates another Workspace and invites the relevant members. Tasks and subtasks live directly inside a Workspace. This rule governs UI, domain model, persistence, API routes, permissions, filters, realtime events, tests and documentation.

## 3.2 Core entities and ownership boundaries

| Entity | Scope / purpose | Key invariants |
|---|---|---|
| `User` | Global identity, independent of any one community. | One identity may join multiple communities; auth credentials remain outside community data. |
| `Community` | Tenant/security boundary. | All tenant-owned rows reference one community; no cross-community reads by guessed IDs. |
| `CommunityMembership` | User's membership and admin/coordinator-pool flags in one community. | Community Admin authority is scoped to this row/community only. |
| `Workspace` | Main unit of work; `PERSONAL` or `SHARED`. | Belongs to one community; Personal is private and single-owner; Shared has explicit membership. |
| `WorkspaceMembership` | Active user's access to a Shared Workspace. | One current role per member; role and membership are checked at every operation. |
| `WorkspaceRole` | Built-in or workspace-local custom role. | Built-in identities are stable; no role inheritance; grant ceiling enforced by backend. |
| `Task` | Canonical unit of work. | Workspace-scoped; internal UUIDv7 identity; title/key/type/status/priority/date/estimate/labels/custom values and relationships. |
| `TaskAssignee` | Assignment relation. | Stores `assignedByUserId` separately from assignee; supports multiple assignees if confirmed in the final DTO. |
| `TaskLineage` | Stable identity across same-community workspace transfers. | Holds current task/workspace pointer; not an authorization bypass. |
| `TaskKeyAlias` | Immutable historical key registry. | Maps issuing workspace namespace + normalized key to stable lineage; aliases never reassign or recycle. |
| `TaskLink` | Dependency or relationship between tasks. | BLOCKS graph must be acyclic; inaccessible target metadata is masked. |
| `WorkflowStatus` | Workspace-defined visible statuses. | Every status maps to one of five canonical categories. |
| `Milestone` | Optional planning marker directly in a Workspace. | OWNER CONFIRMED DEC-OPEN-08; never a hierarchy container; tasks link directly to a milestone in the same Workspace. |
| `CustomFieldDefinition` / `CustomFieldOption` | Workspace-level schema for task metadata. | Field identity immutable; options use stable UUIDs; values validated server-side. |
| `SavedView` | PERSONAL or SHARED preset for one of four projections. | Stores query and display options separately; shared edits use explicit copy-on-write. |
| `Comment` / `TaskWatcher` | Task collaboration. | Sanitized Markdown AST; mentions/watchers resolved only among authorized users. |
| `Notification` / `NotificationPreference` | Recipient-scoped inbox and delivery controls. | One user's community stream; preference changes are per user/community. |
| `TaskActivity` | User-visible task history. | Separate from security/governance audit. |
| `AuditEvent` | Append-only governance/security evidence. | Hash chained, minimized, scoped read/export; retention/purge remains open. |
| `DomainEvent` / `OutboxOffset` | Durable transactional outbox and independent consumers. | Domain mutation, stream sequence and outbox intent commit atomically. Each consumer tracks its own progress. |
| `IdempotencyRecord` | Replay-safe mutation record. | Binds key to canonical request fingerprint and stored deterministic result; credentials never persisted. |
| `Session` / `AuthIdentity` | Authentication and session control. | Secure cookie, CSRF, rotation, revocation and account-linking invariants. |
| `Invitation` / `MembershipRequest` | Community and Shared Workspace onboarding. | Single-use expiring invitation; active community membership prerequisite for Shared Workspace invite. |

## 3.3 Proposed relational model — ENGINEERING DRAFT

The following is a logical design, not a claim that SQL migrations have been authored or run. PostgreSQL is the current preferred database recommendation, with row-level security (RLS) and composite tenant keys. Final table/column design must be co-signed by backend and security owners and reconciled to the repaired OpenAPI contract.

### Identity and tenancy

- `community_task_key_prefix_registry(community_id, normalized_prefix, workspace_id, reserved_at, retired_at nullable)`; unique `(community_id, normalized_prefix)` under case-folded normalization; insert-only reservations are never released or reassigned after rename, archive or Workspace deletion.
- `workspace_task_key_sequences(workspace_id, next_sequence, version)`; Workspace-local atomic allocator; never reset, decrement or reuse a sequence value.
- `workspace_template_catalog(template_key, template_version, immutable_definition_json, published_at)`; three built-in, read-only catalog entries; applied template key/version are recorded on the Workspace.


- `users(id UUIDv7 PK, email_normalized UNIQUE, display_name, account_state, created_at, updated_at)`.
- `auth_identities(id, user_id FK, provider, provider_subject, credential_hash_or_external_ref, verified_at, created_at)`; unique `(provider, provider_subject)`; prevent unlinking the last usable verified auth method.
- `communities(id, name, policy_json, created_at, ...)`.
- `community_memberships(id, community_id, user_id, state, is_community_admin, is_default_coordinator, joined_at, ...)`; unique `(community_id,user_id)`.
- `workspaces(id, community_id, kind, name, owner policy, key_prefix, next_task_sequence, applied_template_key nullable, applied_template_version nullable, settings, assignee_editable_field_groups_allowed JSONB NOT NULL DEFAULT '[]', assignee_editable_field_groups_default JSONB NOT NULL DEFAULT '[]', last_workspace_seq, archived_at, ...)`; enforce that the default is a subset of the allowed ceiling in the backend transaction; ensure Personal single-owner privacy and Shared owner floor.
- `workspace_memberships(id, community_id, workspace_id, user_id, role_id, state, joined_at, ...)`; unique `(workspace_id,user_id)`; FK includes community/workspace scope.
- `workspace_roles(id, community_id, workspace_id, system_key nullable, name, capabilities JSONB, version, ...)`; seeded role identities OWNER/COORDINATOR/MEMBER/VIEWER, custom roles scoped to one workspace; no inheritance.

### Tasks and relationships

- `tasks(id UUIDv7 PK, community_id, workspace_id, parent_task_id nullable, lineage_id, title, description, item_type, status_id/status_category, priority, start_date, due_date, estimate_points, assignee_editable_field_groups JSONB NOT NULL DEFAULT '[]', rank_key, version, field_revisions JSONB, archived_at, created_by_user_id, created_at, updated_at, ...)`. Validate each task grant set as a subset of the current Workspace ceiling; include `assigneeEditableFieldGroups` in field revision tracking.
- Composite foreign keys ensure `(community_id, workspace_id)` agrees across parent, child, membership, alias and relationship rows.
- `task_assignees(task_id, user_id, assigned_by_user_id, assigned_at, ...)`; backend records assigner and validates current assignment context.
- `task_lineages(id, community_id, current_task_id, current_workspace_id, updated_at)`; update current pointer in the same transaction as transfer.
- `task_key_aliases(id, community_id, issuing_workspace_id, normalized_key, lineage_id, created_at)`; unique `(community_id, normalized_key)` in addition to namespace lookup; append-only; no reassignment/reuse. The permanent Community-wide prefix registry prevents ambiguous current and historical key strings.
- `task_links(id, community_id, source_task_id, target_task_id, link_type, created_by, created_at)`; unique and cycle validation for BLOCKS; target privacy filter is applied in DTO projection.
- `workflow_statuses(id, community_id, workspace_id, name, category, rank, is_default, ...)`; category in BACKLOG/TODO/IN_PROGRESS/DONE/CANCELED; deleting an in-use status requires atomic task migration to a fallback in the same Workspace.
- `workspace_milestones(id, community_id, workspace_id, title, description, target_date, ...)`; `tasks.milestone_id` references a milestone in the same Workspace. Milestones are OWNER CONFIRMED optional Workspace planning markers, never hierarchy containers.

### Configuration and collaboration

- `custom_field_definitions(id, community_id, workspace_id, name, key, value_type, required, archived_at, version, ...)`.
- `custom_field_options(id, field_definition_id, label, rank, archived_at)`; stable option UUIDs.
- `task_custom_field_values(task_id, field_definition_id, value_json, field_revision, updated_at, updated_by)` with unique `(task_id, field_definition_id)` and same-workspace validation.
- `saved_views(id, community_id, workspace_id, owner_user_id, scope PERSONAL|SHARED, view_type, query_spec_json, display_options_json, version, ...)`; personal access limited to creator; Shared access requires current task:read.
- `comments(id, community_id, workspace_id, task_id, author_user_id, parent_comment_id, markdown_source, sanitized_ast, version, created_at, updated_at, deleted_at)`; enforce thread depth cap and markdown allow-list.
- `task_watchers(task_id, user_id, subscribed_at, source)`; mention/creator/assignee auto-watch behavior per CR-08, with explicit unsubscribe rules.
- `notifications(id, community_id, recipient_user_id, workspace_id nullable, task_id nullable, category, event_type, payload_metadata, read_at, created_at)`; user/community stream cursor separate.
- `notification_preferences(user_id, community_id, channel, category, enabled, quiet_hours, digest_schedule, ...)`.

### Operations and evidence

- `domain_events(id, community_id, workspace_id nullable, user_id nullable, stream_type, stream_seq, event_type, schema_version, payload_minimized, occurred_at)`; immutable event envelope; no one global `processed_at` marker.
- `outbox_consumer_offsets(consumer_group, shard_key, last_event_id/seq, updated_at)` and `outbox_consumer_failures(...)`; independent cursors for realtime, notifications and later consumers.
- `idempotency_records(scope_key, mutation_id, method, canonical_path, request_fingerprint, response_status, response_body_minimized, created_at, expires_at)`; transactionally coupled to mutation and outbox; never retain session/CSRF/Set-Cookie credential material.
- `task_activity_events(...)` distinct from security audit.
- `audit_events(id, community_id, workspace_id nullable, sequence, actor_user_id, event_type, metadata_minimized, previous_hash, entry_hash, occurred_at)`; append-only application grants; external write-only checkpoint sink; retention duration and legal hold are unresolved.
- `break_glass_grants(...)` and immutable `break_glass_evidence(...)` with grant/revoke/expiry and notification state.
- `invitations(...)`, `membership_requests(...)`, `sessions(...)`, `password_reset_tokens(...)`, `email_verification_tokens(...)`, `realtime_tickets(...)` with hashed one-time secrets.

## 3.4 Tenant and hierarchy invariants

1. Every tenant-owned row carries `community_id`; every workspace-owned row also carries `workspace_id`.
2. Composite foreign keys, RLS and application authorization must agree. RLS is defense in depth, not the only security control.
3. A task and all descendants belong to exactly one Workspace. A parent cannot be in another Workspace.
4. Parent changes are cycle checked and bounded by a Workspace-level maximum subtask depth. **OWNER CONFIRMED DEC-OPEN-09:** default one subtask level (`maxSubtaskDepth = 1`); Workspace Owner may raise the maximum to two levels; unbounded nesting is not supported. A reduction is rejected atomically while any existing tree exceeds the proposed new limit; users must restructure those trees first.
5. Same-workspace parent/order changes preserve task identity and all content; children move with parent.
6. Cross-workspace transfer is a privacy boundary operation and uses the name-only policy in Section 8.
7. Do not add `project_id`, `list_id`, project membership, project-level capability scope or project-level key sequence to the target model.
8. Personal Workspaces are single-owner/private. Community Admins do not gain silent content access. Only the audited break-glass path grants time-bound read-only access under CR-01.
9. Workspace membership removal or role downgrade must revoke HTTP and active realtime access promptly; authorization is reevaluated on every operation.
10. Archived/purged record lookup must authorize against the current workspace before revealing a tombstone or 410 condition.

---


---

# 4. Task model and task lifecycle

## 4.1 Canonical task fields

A Task is the only work item container in a Workspace. Subtasks are Tasks with a parent relation, not a separate list/project resource. Core task fields:

- UUIDv7 internal ID; immutable lineage ID for same-community transfer continuity.
- Workspace ID and nullable parent task ID.
- Human-readable current key plus key-alias history.
- Title (required), optional description and task archetype/type.
- Configurable Workspace workflow status, mapped to a canonical status category.
- Priority: NONE, LOW, MEDIUM, HIGH, URGENT (exact enum/order to follow reviewed schema).
- Assignee relation(s), creator identity and assigner identity kept distinct.
- Start date, due date, estimate points, labels and rank/order token.
- Optional Workspace milestone relation; milestone is a planning marker, not a hierarchy container.
- Workspace-defined custom-field values with per-field revisions.
- Task links/dependencies and version/updated timestamp.
- Created/updated/archive lifecycle timestamps.

## 4.2 Task type and status model

The current contract draft defines `TASK`, `DELIVERABLE`, `BUG` and `DECISION` archetypes, with `TASK` as the default. The exact user-facing type vocabulary is an engineering draft, not a separately approved product decision; keep additional type choices low-friction and do not let them become hierarchy containers. It is not a new hierarchy layer.

Every configured status maps to one of five canonical categories:

- `BACKLOG`
- `TODO`
- `IN_PROGRESS`
- `DONE`
- `CANCELED`

A Workspace starts with a simple default workflow. Owners (and delegated Coordinators where approved) may rename/add statuses or map statuses to categories inside Workspace settings. Any status deletion with assigned tasks requires an explicit fallback status and one atomic migration. Timeline and reporting must consistently distinguish completed (`DONE`/`CANCELED`) work from active work.

## 4.3 Dependencies and relationships

Supported relationship candidates are `BLOCKS`, `IS_BLOCKED_BY` (normally derived as the inverse of BLOCKS), `RELATES_TO` and `DUPLICATES`. BLOCKS must form a directed acyclic graph; adding a link that creates a cycle is rejected. Dependencies can connect tasks within a Workspace; cross-Workspace task links are not assumed and require a separate privacy/authorization decision. A user without access to the target must never receive its title, key, status or workspace identity in a task-link summary.

## 4.4 Task keys — OWNER CONFIRMED DEC-OPEN-06

Task keys are short human-readable references such as `OPS-12`. They support discussion, search, mentions, URLs and support/debugging; they are not database primary keys. Internal UUIDv7 IDs remain immutable.

Every Workspace has a canonical uppercase prefix and a Workspace-local numeric sequence. Prefixes are unique across all current and historical namespaces within one Community (case-insensitive), and a prefix is never reassigned after rename, Workspace archive or deletion. Sequences are atomic, monotonically increasing, never reset and never reused after task archive, purge, transfer or prefix rename.

An active Workspace Owner may rename the prefix. The operation must be atomic: reserve the new Community-unique prefix; update the current display key for every active task while preserving its numeric suffix; insert each prior current key as an immutable alias; preserve all older aliases; append the governance audit record and outbox event; then commit. A collision with a current or historical prefix reservation rejects the complete operation with `409 WORKSPACE_KEY_PREFIX_ALREADY_IN_USE`.

Aliases map to stable task lineage, not transient task UUIDs. Resolution must authorize the caller against the lineage's current Workspace before revealing a current task key, task ID or lifecycle state. Unknown and unauthorized key lookups use indistinguishable 404 responses. Historical prefixes and aliases are never reassigned.

## 4.5 Task edit and execution permissions

Default task policy is `CREATOR_COORDINATOR_STRICT` in the CR-05 engineering draft:

- Workspace Owners and Coordinators can manage task definitions, subject to security floors.
- Task creator retains the defined creator rights while they remain an authorized active member.
- An active task assigner can retain definition/assignment rights for the assignments they created, subject to current membership and assignment rules.
- Assignees can update execution status, comment and manage/create permitted subtasks within the assigned task scope.
- Workspace Owners configure the maximum additional field groups that may be delegated to assignees and the default grant set for newly created tasks. Both default to empty; the default must be a subset of the allowed ceiling.
- The Task Creator chooses the additional assignee field groups for each task from the Workspace-approved ceiling. The same task-level grant set applies to every active assignee on that task; per-assignee differences are not part of this contract.
- An active Workspace Owner may override per-task assignee grants for governance and continuity. Coordinators and Task Assigners do not receive this permission solely from their role.
- Members can create tasks, comment, watch and use views; other editing depends on configured task policy.
- `COLLABORATIVE_MEMBER` is an Owner-controlled alternative under which active non-Viewer members receive broader collaboration rights, but not governance, move/archive/purge or Workspace administration rights.
- Viewers remain read-only apart from any explicitly allowed watch behavior.

The Option A delegation ownership model is OWNER CONFIRMED under DEC-OPEN-02. The exact field-group catalog and implementation controls are engineering-defined and remain subject to joint Backend/Frontend/Security contract review. A relationship grant does not bypass community/workspace membership, Personal Workspace privacy, disabled/suspended membership or resource visibility. Mixed-field PATCH requests are all-or-nothing. Server-side permission checks are performed afresh for every operation. DTO `effectivePermissions` are UI hints only—not bearer authority.

---
