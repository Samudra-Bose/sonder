# SONDER — VS-03 STAGE 5 DELIVERY REPORT: SUBTASK HIERARCHY UI & REPARENTING

**Baseline Branch**: `develop` at `67cba33` (PR #17 merged)
**Active Working Branch**: `feat/FE-VS03-stage5-subtask-hierarchy`
**Status**: COMPLETE — Functional Correctness, Contract Integrity & Quality Gates Passed
**Date**: November 8, 2026
**Author**: Antigravity Pair Programming Agent

---

## 1. Executive Summary

VS-03 Stage 5 delivers the **Subtask Hierarchy UI and Same-Workspace Reparenting** for Sonder, fully integrated into the existing `TaskPeekDrawer`.

This implementation delivers:
1. **Hierarchical Tree Presentation**: An accessible, collapsible tree structure rendering direct subtasks (depth 1) and nested subtasks (depth 2) beneath any opened task.
2. **Workspace Depth Limit Enforcement**: Strict adherence to workspace-specific `maxSubtaskDepth` configuration (default 1, maximum 2). Subtask creation controls are proactively disabled/hidden with user-facing depth notices once the depth ceiling is reached.
3. **Contract-Faithful Subtask Creation**: Inline subtask authoring inheriting the parent task's workspace scope, submitting `parentTaskId`, with title validation ($\le 500$ chars), duplicate submission prevention, and draft preservation on failure.
4. **Safe Same-Workspace Reparenting**: Reparenting via canonical `POST /communities/{communityId}/workspaces/{workspaceId}/tasks/{taskId}/move` with atomic cycle prevention (self-parent and descendant cycles) and destination depth calculation, supporting moves to top level (`targetParentTaskId: null`) or eligible sibling tasks.
5. **Zero Cross-Workspace Transfers**: Strictly constrained to same-workspace reparenting; cross-workspace transfer, transfer previews, and personal-to-shared transfers are not implemented.

All quality gates, contract verifications, and automated tests (294/294 passing across 32 test suites) pass cleanly.

---

## 2. Source-of-Truth & Contract Verification

| Requirement / Domain Element | Authoritative Specification | Implementation Reference |
| :--- | :--- | :--- |
| **Active OpenAPI Contract** | `Community-Work-Management-v1.5/docs/contracts/openapi.yaml` | Version `0.3.20-draft` |
| **Workspace Depth Limits** | PRD §3.2, OpenAPI `WorkspaceDto.maxSubtaskDepth` | Range: 1–2 (default 1, max 2) |
| **Canonical Query Endpoint** | `POST /workspaces/{id}/tasks/query` | `subtaskMode: "NESTED"`, LIST projection |
| **Subtask Creation** | `POST /workspaces/{id}/tasks` | `CreateTaskRequest.parentTaskId` |
| **Task Move / Reparent** | `POST /workspaces/{id}/tasks/{id}/move` | `MoveTaskRequest.targetParentTaskId` |
| **Move Permissions** | OpenAPI `TaskPermissions.canMove` | Gated by `task.effectivePermissions.canMove` |
| **Subtask Permissions** | OpenAPI `TaskPermissions.canCreateSubtask` | Gated by `parent.effectivePermissions.canCreateSubtask` |
| **Cycle & Depth Errors** | OpenAPI `x-error-codes` on `/move` | 422 `TARGET_PARENT_INVALID`, 422 `MAX_SUBTASK_DEPTH_EXCEEDED` |

---

## 3. Subtask Component Architecture

### 3.1 SubtaskList (`SubtaskList.tsx`)
Mounted inside [`TaskPeekDrawer.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskPeekDrawer.tsx):
- **Hierarchy Data Loading**: Consumes `useWorkspaceTasks` with `subtaskMode: "NESTED"`.
- **Dynamic Depth Calculation**: Calculates `currentDepth = computeTaskDepth(task, allTasks)` where Root = 0, Direct subtask = 1, Nested subtask = 2.
- **Workspace Depth Guard**: Resolves `workspace.maxSubtaskDepth` from active workspace context (`WorkspaceContext`). If `currentDepth >= maxSubtaskDepth`, displays a notice: `"Maximum subtask depth ({maxSubtaskDepth}) reached for this workspace"`, and disables/hides subtask creation.
- **Inline Creation**:
  - Displays "+ Add Subtask" button when `task.effectivePermissions.canCreateSubtask` and `currentDepth < maxSubtaskDepth`.
  - Input with auto-focus and `maxLength={500}`.
  - Calls `useCreateTask` with `parentTaskId: task.id`.
  - Disabled during submission to prevent duplicate creation.
  - Preserves user draft and surfaces error banner on recoverable/server errors.
- **States**: Loading skeleton, empty state (`"No subtasks yet"`), and error state with retry button calling `refetch()`.

### 3.2 SubtaskItem (`SubtaskItem.tsx`)
Located at [`apps/web/src/modules/tasks/SubtaskItem.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/SubtaskItem.tsx):
- **Semantic Structure**: Built with semantic `<li>` items and nested `<ul>` lists with left indentation and vertical tree markers for depth > 1.
- **Essential Attributes**:
  - Clickable task key linking into `TaskPeekDrawer` via `openTask(subtask.taskKey, { workspaceId: subtask.workspaceId })` (preserves URL parameters and deep linking).
  - Title with strike-through styling on terminal `DONE` and `CANCELED` tasks.
  - Semantic dual-indicator `Badge` for `statusCategory` (`status` prop) and `priority` (`priority` prop).
- **Collapsible Hierarchy**: Chevron toggle button with `aria-expanded` and accessible label when descendants exist.
- **Reparenting Action**: Action button (`data-testid="reparent-btn-{key}"`) visible on hover/focus when `effectivePermissions.canMove` is true, launching `ReparentTaskModal`.

### 3.3 ReparentTaskModal (`ReparentTaskModal.tsx`)
Located at [`apps/web/src/modules/tasks/ReparentTaskModal.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/ReparentTaskModal.tsx):
- Accessible modal dialog for same-workspace reparenting.
- **Destination Options**:
  1. `"Top Level (No parent / Root task)"` (`targetParentTaskId: null`).
  2. Eligible same-workspace tasks filtered to exclude:
     - The task itself (`candidate.id !== task.id`).
     - Any transitive descendant of the task (`!descendantIds.has(candidate.id)`).
     - Destinations where `candidateDepth + 1 + subtreeHeight > maxSubtaskDepth`.
- **Preflight & Error Handling**: Performs client-side validation and surfaces server-side 422/403 Problem errors without corrupting the local UI state.

---

## 4. Query Strategy, Pagination & Canonical AST Limitation

### Query Specification
- Endpoint: `POST /communities/{communityId}/workspaces/{workspaceId}/tasks/query`
- Request Spec:
  - `projection: "LIST"`
  - `pageScope: "PRIMARY"`
  - `querySpec.subtaskMode: "NESTED"`
  - `querySpec.includeBacklog: true`
  - `querySpec.includeCompleted: true`
- Headers: `X-CSRF-Token` synchronizer token.

### Documented Contract Limitation
Inspection of the canonical `QueryFilterField` regular expression in `Community-Work-Management-v1.5/docs/contracts/openapi.yaml`:
```regex
^(statusCategory|priority|itemType|assigneeId|createdById|watcherId|labelId|milestoneId|cycleId|startDate|dueDate|createdAt|updatedAt|estimatePoints|hasBlocker|isOverdue|q|cf\.[a-z][a-z0-9_]{0,47})$
```
reveals that `parentTaskId` is **not** an authorized leaf filter field in the query AST. Therefore:
- The frontend does not invent an unapproved parent-filter parameter.
- The frontend issues the workspace query with `subtaskMode: "NESTED"` and reconstructs the in-memory tree of descendants using `parentTaskId`.
- Ancestors or descendants outside the caller's read authorization are never fabricated or exposed.

---

## 5. Hierarchy Rules & Depth Limit Safeguards

Hierarchy depth is defined as:
$$\text{Depth} = \begin{cases} 0 & \text{if } \text{parentTaskId is null (Root task)} \\ 1 & \text{if } \text{parent is Root} \\ 2 & \text{if } \text{parent is Depth 1 (Nested subtask)} \end{cases}$$

Depth policies enforced:
- **Personal Workspace (`WS_PERSONAL_ALEX_ID`)**: `maxSubtaskDepth = 1`. Root tasks can have direct subtasks (depth 1), but depth 1 tasks cannot have subtasks.
- **Gala Workspace (`WS_SHARED_GALA_ID`)**: `maxSubtaskDepth = 1`.
- **Engineering Platform (`WS_SHARED_ENG_ID`)**: `maxSubtaskDepth = 2`. Root tasks can have depth 1 subtasks (`ENG-105`), and depth 1 subtasks can have depth 2 nested subtasks (`ENG-106`).
- **Depth Ceiling**: Attempting to create subtasks under `ENG-106` (depth 2) is blocked with `"Maximum subtask depth (2) reached for this workspace"`.

---

## 6. Same-Workspace Reparenting Safeguards

1. **Cycle Prevention**:
   - Self-Parent: `targetParentTaskId === task.id` is rejected with HTTP 422 `TARGET_PARENT_INVALID`.
   - Descendant Cycle: A task cannot be reparented under any node in its descendant transitive closure. Tested with `ENG-101` moved under `ENG-105` $\rightarrow$ rejected with HTTP 422 `TARGET_PARENT_INVALID`.
2. **Subtree Height & Depth Overflow**:
   - Reparenting evaluates destination parent depth plus the moving task's subtree height:
     $$\text{destParentDepth} + 1 + \text{subtreeHeight} \le \text{maxSubtaskDepth}$$
   - Tested moving `ENG-101` (subtree height 2) under `ENG-102` (depth 0) $\rightarrow$ rejected with HTTP 422 `MAX_SUBTASK_DEPTH_EXCEEDED` because the deepest child would reach depth 3 ($> 2$).
3. **Move to Top Level**:
   - Successfully moves subtasks to top level by setting `targetParentTaskId: null`. Tested and verified with `ENG-105`.
4. **Scope Boundaries**:
   - Explicitly confirms `targetWorkspaceId === workspaceId`. Cross-workspace transfer is rejected with 422 `TRANSFER_NOT_SUPPORTED`.

---

## 7. Test Matrix & Verification

### Test Suite: `SubtaskHierarchy.test.tsx` (18/18 Passing)

| Test Category | Test Description | Result |
| :--- | :--- | :--- |
| **Hierarchy Rendering** | Renders empty state `"No subtasks yet"` when root task has no descendants (`ENG-102`) | PASS |
| **Hierarchy Rendering** | Renders direct subtasks and nested descendants using `parentTaskId` (`ENG-101` $\rightarrow$ `ENG-105` $\rightarrow$ `ENG-106`) | PASS |
| **Hierarchy Rendering** | Supports expanding and collapsing nested descendant groups | PASS |
| **Hierarchy Rendering** | Navigates to subtask in `TaskPeekDrawer` when subtask key is clicked (preserves deep linking) | PASS |
| **Hierarchy Rendering** | Handles error state and provides functional retry button | PASS |
| **Depth Limits** | Enforces `maxSubtaskDepth = 2` in Engineering Platform and blocks depth > 2 (`ENG-106`) | PASS |
| **Depth Limits** | Enforces `maxSubtaskDepth = 1` in Personal Workspace (`ALEX-1`) | PASS |
| **Depth Limits** | Hides Add Subtask button when task is archived (`ENG-088`) | PASS |
| **Depth Limits** | Hides Add Subtask button when actor lacks `canCreateSubtask` (`ENG-050` viewer task) | PASS |
| **Subtask Creation** | Creates a new subtask under current task and updates hierarchy tree | PASS |
| **Subtask Creation** | Rejects empty title and disables submission | PASS |
| **Subtask Creation** | Preserves title draft on server error and surfaces error message for retry | PASS |
| **Reparenting** | Successfully reparents a subtask to top level (`targetParentTaskId: null`) | PASS |
| **Reparenting** | Prevents self-parenting and cycle formation in client calculation | PASS |
| **Reparenting** | Rejects move request with 422 if server detects depth limit violation | PASS |
| **Reparenting** | Rejects reparenting when target is a descendant (server 422 cycle rejection) | PASS |
| **Reparenting** | Rejects self-parenting with 422 `TARGET_PARENT_INVALID` | PASS |
| **Architectural Boundaries** | Verifies zero mock fixture imports in production task modules | PASS |

---

## 8. Quality Gates Summary

All quality gates passed with zero errors:

```bash
# 1. Contract & Documentation Validation (51/51 checks passed)
pnpm validate:docs

# 2. Contract Typegen Check (0 diffs)
pnpm typegen:check

# 3. Workspace TypeScript Compilation (0 errors)
pnpm -r run typecheck

# 4. Monorepo Vitest Test Suite (32 test files, 294 tests passed)
pnpm -r run test

# 5. Production Application Build (Clean bundle output)
pnpm build

# 6. Git Diff Whitespace & Hygiene (0 errors)
git diff --check
```

---

## 9. Limitations & Backend Runtime Status

- **Cross-Workspace Transfer Deferred**: Cross-workspace transfer (`NAMES_ONLY` mode, preview handles, Personal-to-Shared confirmation) was explicitly NOT implemented in Stage 5 per requirements.
- **Drag-and-Drop Reordering Deferred**: Drag-and-drop reordering is deferred; accessible destination select modal is implemented.
- **Backend Runtime Verification Status**: Verification was conducted against contract-faithful MSW handlers and TypeScript typegen; live PostgreSQL database migrations and RLS integration are not yet deployed in the test harness.
