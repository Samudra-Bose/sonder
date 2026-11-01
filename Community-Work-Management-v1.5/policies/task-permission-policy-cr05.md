# CR-05 — Task Permission and Effective Authorization Policy

**Contract:** `0.3.19-draft`  
**Product decision:** DEC-OPEN-02 Option A — OWNER CONFIRMED, 31 October 2026.  
**Status:** Engineering amendment pending joint FE/BE/security review and runtime verification.

## Workspace Owner governs the ceiling and default

The Workspace Owner configures:

- `assigneeEditableFieldGroupsAllowed`: maximum additional task-definition field groups that may be delegated. Allowed groups: `TITLE_DESCRIPTION`, `DATES_PRIORITY`, `CUSTOM_FIELDS_LINKS`. Default `[]`.
- `assigneeEditableFieldGroupsDefault`: default additional grants for newly created tasks. Default `[]`; it must be a subset of the allowed ceiling. Changing the default affects new tasks only.

Workspace updates are atomic. The resulting default must be a subset of the resulting allowed ceiling. If a ceiling reduction would invalidate the current default, the Owner must submit a compatible new default in the same request; otherwise the update is rejected with `422 ASSIGNEE_FIELD_DEFAULT_EXCEEDS_WORKSPACE_CEILING`. Removing a group from the ceiling immediately removes its effective permission from existing tasks. The task-level stored selection is retained and can become effective again only if the group is re-allowed. Personal Workspaces must keep both arrays empty.

The former `assigneeCanEditDatesPriority` boolean is removed.

## Task Creator configures each task

`TaskDto.assigneeEditableFieldGroups` stores the additional field groups delegated to active assignees on that task. At creation, omission applies the Workspace default; a supplied set must be a subset of the Workspace ceiling. The Task Creator may change it later. An active Workspace Owner may override it for governance and continuity. A Coordinator or Task Assigner does not receive grant-management authority solely from that role.

`TaskPermissions.canManageAssigneeFieldGrants` is true only for the active Task Creator and active Workspace Owners, subject to the security floor and downward-only role-preview rules. Updates use `baseFieldRevisions.assigneeEditableFieldGroups` and are atomic. Invalid grant expansion returns `422 ASSIGNEE_FIELD_GRANT_EXCEEDS_WORKSPACE_CEILING`; an unauthorized editor receives `403 ASSIGNEE_FIELD_GRANT_FORBIDDEN`. Personal Workspaces reject non-empty task-level grants with `422 PERSONAL_WORKSPACE_ASSIGNEE_GRANTS_NOT_SUPPORTED`.

The same grant set applies to every active assignee on a task. Per-assignee differences are not supported. Removing an assignment immediately removes that person's assignee-context rights.

## Field groups

| Group | Fields | Effective permission |
|---|---|---|
| `TITLE_DESCRIPTION` | `title`, `description`, `itemType` | `canEditTitleDescription` |
| `DATES_PRIORITY` | `startDate`, `dueDate`, `priority` | `canEditDatesPriority` |
| `CUSTOM_FIELDS_LINKS` | `customFieldValues`, `labelIds`, `milestoneId`, task links | `canEditCustomFieldsLinks` |

Estimate editing remains part of baseline assignee execution rights, along with status, permitted subtasks and comments.

## Effective authorization

Under `CREATOR_COORDINATOR_STRICT`, an active assignee receives baseline execution rights plus the intersection of task-level `assigneeEditableFieldGroups` and the current Workspace allowed ceiling. Grants are additive only and do not restrict broader permissions held independently as Owner, Coordinator, Task Creator, active Task Assigner or through `COLLABORATIVE_MEMBER`. In collaborative mode, task-level grants do not restrict broader member rights.

All authorization is recalculated by the backend on every request. Client-side flags are display hints only. Active membership, tenant isolation, Personal Workspace privacy, assignee membership and role-preview restrictions are always enforced.

## Audit and transaction boundary

Workspace ceiling/default changes are written to the append-only governance audit ledger as `WORKSPACE_SETTINGS_CHANGED` with changed-field identifiers. Per-task changes are recorded as `TASK_ASSIGNEE_FIELD_GRANTS_CHANGED` (category `ROLE_AND_PERMISSION`, target `TASK`). The event metadata may contain actor/task/workspace UUIDs and allow-listed before/after group codes only; it must not contain task titles, descriptions, comment content or other user-authored text. Audit insertion is in the same transaction as the governed mutation; if it fails, the mutation must fail too. These are governance audit records, not new WebSocket event payloads.
