# SONDER — VS-03 Stage 3 Delivery Report: Inline Task Editing & Concurrency Conflict Resolution

## Executive Summary

Stage 3 of **VS-03: Canonical Task Model, Quick Composer & Task Peek Drawer** has been implemented, thoroughly tested, and verified against canonical product and API specifications (`Community-Work-Management-v1.5/docs/contracts/openapi.yaml`, Master PRD, and Canonical Frontend Blueprint).

This stage elevates the responsive Task Peek Drawer from read-only presentation to an interactive, contract-faithful inline editing experience with optimistic updates, rollback, granular permission gating, and explicit HTTP 409 concurrency conflict resolution:

1. **Inline Field Editors ([`InlineFieldEditors.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/InlineFieldEditors.tsx))**:
   - **Title**: Accessible single-line input with 1–500 character length validation, draft editing, Save/Cancel controls, and keyboard `Enter`/`Escape` handling.
   - **Description**: Multi-line textarea editor with placeholder support, character boundary enforcement, and Save/Cancel controls.
   - **Status Category**: Accessible dropdown selector supporting canonical status categories: `BACKLOG`, `TODO`, `IN_PROGRESS`, `DONE`, and `CANCELED` (strictly single-L).
   - **Priority**: Dropdown selector supporting `LOW`, `MEDIUM`, `HIGH`, `URGENT`, and `NONE`.
   - **Dates (Start Date & Due Date)**: Date picker inputs (`type="date"`) with optional clearing and ISO-8601 string formatting.
   - **Estimate Points**: Non-negative integer numeric input with validation and clear option.
   - **Assignees**: Accessible multi-member toggle checklist with workspace member lookup and optimistic assignment synchronization.
   - **Labels**: Tag-based label management with removable active pills (`×`) and text input to add new labels.

2. **Contract-Faithful Concurrency & Optimistic Mutation Flow**:
   - Every `PATCH` mutation strictly submits `baseFieldRevisions` containing current known revisions for modified fields, satisfying OpenAPI `UpdateTaskRequest` requirements.
   - Leverages `useUpdateTask` TanStack Query hook for optimistic UI updates with automatic rollback on server error (e.g. 500 timeout or 403 forbidden), while preserving the user's uncommitted draft in form inputs.

3. **HTTP 409 Concurrency Conflict Resolution Strategy**:
   - Detects HTTP 409 `FIELD_REVISION_CONFLICT` when another actor concurrently modifies an attribute.
   - Surfaces an accessible `ConflictAlert` (`role="alert"`) directly inline within the affected field, displaying:
     - The current authoritative server value.
     - The user's attempted local edit.
   - Delivers two unambiguous, user-driven conflict actions:
     - **"Use Server Value"**: Discards the local draft, exits edit mode, and synchronizes the drawer with the authoritative server state.
     - **"Overwrite with My Edit"**: Deliberately refetches the freshest server task revision and re-submits the user's edit using the new base revision (strictly avoiding uncoordinated or automated background overwrite loops).

4. **Granular Permission Gating & Read-Only Invariants**:
   - Evaluates `task.effectivePermissions`:
     - `canEditTitleDescription`: Gates Title and Description editing.
     - `canUpdateStatus`: Gates Status Category changes.
     - `canEditDatesPriority`: Gates Priority, Start Date, and Due Date editing.
     - `canEditEstimate`: Gates Estimate Points editing.
     - `canAssign`: Gates Assignee modifications.
     - `canEditCustomFieldsLinks`: Gates Label tag editing.
   - Read-only fallback: When the authenticated user lacks permission (e.g. viewer task `ENG-050`), editing triggers and inputs are completely omitted.
   - Lifecycle state protection: When a task is archived (`lifecycleState === "ARCHIVED"` or `task.archivedAt` is present, e.g. `ENG-088`), all editing controls are hidden and the entity is rendered strictly read-only.

5. **Scope Boundaries Preserved**:
   - Zero implementation of Quick Composer (reserved for Stage 4).
   - Zero implementation of Subtask Tree UI or nesting mutations (reserved for Stage 5).
   - Zero scope creep into comments, attachments, or task move workflows.
   - Design styling strictly adhered to established design system primitives without decorative or speculative redesigns.

6. **Verification & Quality Gates**:
   - 247 tests passing across 30 test suites (17 new tests in [`InlineTaskEditing.test.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/InlineTaskEditing.test.tsx) and 19 existing tests in [`TaskPeekDrawer.test.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskPeekDrawer.test.tsx)).
   - 0 TypeScript errors (`tsc --noEmit`).
   - `typegen:check` passing with 0 diffs.
   - `validate:docs` passing 51/51 checks.
   - Clean Vite production build.
   - Clean `git diff --check`.

---

## 1. Authoritative Contract & Requirements Citations

| Domain / Area | Canonical Contract Path | Schema / Route / Rule |
| :--- | :--- | :--- |
| **Active OpenAPI Source** | `Community-Work-Management-v1.5/docs/contracts/openapi.yaml` | `openapi: 3.1.0`, `version: 0.3.20-draft` |
| **Update Task Operation** | `PATCH /communities/{communityId}/workspaces/{workspaceId}/tasks/{taskId}` | `UpdateTaskRequest` (`baseFieldRevisions` required with `minProperties: 2`, `title`, `description`, `statusCategory`, `priority`, `estimatePoints`, `assigneeIds`, `labelIds`, `startDate`, `dueDate`) |
| **Concurrency Conflict Model** | `ConflictProblem` (lines 6647–6690) | HTTP 409 with `code: FIELD_REVISION_CONFLICT`, `conflictingFields`, `currentFieldRevisions`, and `conflictDetails` (`fieldPath`, `clientValue`, `serverValue`, `baseRevision`, `currentRevision`) |
| **Task Permissions Schema** | `TaskPermissions` (lines 7477–7520) | `canEditTitleDescription`, `canUpdateStatus`, `canEditDatesPriority`, `canEditEstimate`, `canAssign`, `canEditCustomFieldsLinks` |
| **Status Category Enum** | `TaskStatusCategory` (lines 7522–7531) | `BACKLOG`, `TODO`, `IN_PROGRESS`, `DONE`, `CANCELED` (strictly single-L) |
| **Priority Enum** | `TaskPriority` (lines 7545–7554) | `LOW`, `MEDIUM`, `HIGH`, `URGENT`, `NONE` |
| **Optimistic Concurrency Strategy** | PRD §4.2 & Frontend Blueprint §4.3 | Field-level optimistic updates with immediate local state, rollback on rejection, explicit user choices on 409 without auto-overwrite |
| **Archived State Rule** | PRD §2.5 & Blueprint §4.4 | Tasks with `lifecycleState === "ARCHIVED"` or `archivedAt != null` are immutable in UI; render read-only |

---

## 2. Component Architecture & Implementation

### 2.1 Inline Field Editors ([`InlineFieldEditors.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/InlineFieldEditors.tsx))

A dedicated module providing accessible, isolated inline editing primitives:

- **`ConflictAlert`**:
  - Accessible banner (`role="alert"`) rendered beneath an editor when an update encounters HTTP 409.
  - Displays:
    - Current authoritative server value extracted from `conflictDetails` or `serverTask`.
    - User's attempted local value.
  - Action buttons: "Use Server Value" (calls `onDiscard`) and "Overwrite with My Edit" (calls `onOverwrite`).

- **Field Editor Primitives**:
  - `InlineTitleEditor`: Renders task heading with edit trigger; switches to accessible text input with live validation (non-empty, <= 500 chars).
  - `InlineDescriptionEditor`: Renders description body or placeholder; switches to multi-line textarea with Save and Cancel actions.
  - `InlineStatusEditor`: Displays status badge with edit trigger; switches to select dropdown populated with canonical enum values.
  - `InlinePriorityEditor`: Displays priority badge with edit trigger; switches to priority select dropdown.
  - `InlineDateEditor`: Configurable for `startDate` and `dueDate`; renders localized date or "Set date" placeholder; switches to native date picker with Clear action.
  - `InlineEstimateEditor`: Displays estimate story points; switches to numeric input with validation (must be non-negative).
  - `InlineAssigneeEditor`: Displays avatars and assignee names; switches to member checklist toggling Alex Morgan (`MOCK_USER_ID`) or Jordan Lee (`OTHER_USER_ID`).
  - `InlineLabelsEditor`: Displays interactive tag badges; switches to tag manager supporting label addition and single-click tag removal.

### 2.2 Task Peek Drawer Integration ([`TaskPeekDrawer.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskPeekDrawer.tsx))

- Replaced static read-only presentation blocks with respective inline field editors.
- Maintained background non-blocking desktop panel and mobile bottom-sheet modal behaviors.
- Guarded drawer-level error presentation: when `task` is already present in cache, background refetch errors do not replace the drawer content or tear down the active edit inputs.

### 2.3 Mock Service Worker & Concurrency Simulation ([`tasks.ts`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/mocks/handlers/tasks.ts))

- Added `simulateConcurrentFieldUpdate(taskIdOrKey, field, newValue)` to mutate tasks and increment field-level revisions independently in test scenarios.
- Enhanced `PATCH /tasks/:taskId` mock handler:
  - Validates `baseFieldRevisions` presence (returns 400 Problem Details if missing or empty).
  - Validates permissions: rejects unauthorized field modifications with 403 `PERMISSION_DENIED`.
  - Concurrency checks: compares client revisions against server revisions; on mismatch, returns 409 `FIELD_REVISION_CONFLICT` with structured `conflictingFields`, `currentFieldRevisions`, and `conflictDetails`.
  - Increments field-level revisions and task `version` monotonically upon successful field updates.

---

## 3. Test Matrix & Verification Results

### 3.1 New Integration Test Suite ([`InlineTaskEditing.test.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/InlineTaskEditing.test.tsx))

17 comprehensive unit/integration tests verifying all functional requirements:

| Test Group | Test Case | Status | Coverage |
| :--- | :--- | :---: | :--- |
| **Editing Supported Attributes** | `edits title successfully with baseFieldRevisions and reconciles server state` | Passed | Title mutation, revision increment, server reconciliation |
| | `validates title cannot be empty and prevents submission` | Passed | Client validation, error message display, mutation prevention |
| | `cancels title edit restoring original value without mutation` | Passed | Draft discard, restore initial value, no API call |
| | `edits description successfully` | Passed | Textarea input, markdown description update, mutation verification |
| | `edits status category successfully with canonical CANCELED` | Passed | Dropdown select, canonical single-L `CANCELED`, revision increment |
| | `edits priority successfully` | Passed | Priority select, `LOW` category update, revision increment |
| | `edits due date and start date successfully` | Passed | Date input, ISO format persistence, clear & update behaviors |
| | `edits estimate points successfully and validates non-negative value` | Passed | Numeric input, non-negative validation, points persistence |
| | `edits assignees by toggling workspace members` | Passed | Member toggle, assignment synchronization |
| | `edits labels by adding and removing tags` | Passed | Tag removal, tag creation, labels array synchronization |
| **Permission Gating & Read-Only** | `renders all fields read-only with no edit controls for viewer task (ENG-050)` | Passed | Omission of edit controls when actor lacks permissions |
| | `renders all fields read-only with no edit controls for archived task (ENG-088)` | Passed | Omission of edit controls when `lifecycleState === "ARCHIVED"` |
| **Optimistic Updates & Rollback** | `optimistically updates title and rolls back on server 500 error while preserving user draft` | Passed | Cache optimistic update, server 500 rollback, draft input preservation |
| **Concurrency Conflict (HTTP 409)** | `detects concurrent title modification (409) and displays conflict alert with server and client values` | Passed | 409 detection, `ConflictAlert` display, server & client values surfaced |
| | `allows user to discard edit on conflict and adopt current server value` | Passed | "Use Server Value" action, query invalidation, server state adoption |
| | `allows user to deliberately overwrite with fresh revisions on conflict without auto-retrying` | Passed | "Overwrite with My Edit" action, refetch fresh revision, deliberate save |
| **URL & State Preservation** | `preserves URL query parameters across editing workflows` | Passed | URL search param retention throughout inline editing lifecycle |

### 3.2 Monorepo Quality Gates Summary

```text
================================================================================
Monorepo Quality Gate Execution Results
================================================================================
pnpm validate:docs         PASSED  (51/51 checks passed)
pnpm typegen:check         PASSED  (0 diffs on OpenAPI & WebSocket schemas)
pnpm -r run typecheck      PASSED  (0 TypeScript errors across 3 workspaces)
pnpm -r run test           PASSED  (247/247 tests passed across 30 test files)
pnpm build                 PASSED  (Vite production bundle built cleanly in 4.19s)
git diff --check           PASSED  (0 whitespace errors)
================================================================================
```

---

## 4. Stage 4 Readiness & Scope Confirmation

- **Delivered**: VS-03 Stage 3 (Inline Task Editing & Concurrency Conflict Resolution) is complete, robustly tested, and fully aligned with contract specifications.
- **Strict Scope Confirmation**: Zero implementation of Quick Composer (Stage 4) or Subtask Tree UI (Stage 5) was performed.
- **Next Step**: VS-03 Stage 4 (Quick Composer) can proceed on top of this verified foundation.
