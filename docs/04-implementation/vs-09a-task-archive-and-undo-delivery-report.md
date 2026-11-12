# SONDER — VS-09A DELIVERY REPORT: SINGLE-ITEM TASK ARCHIVE & 10-SECOND UNDO

**Milestone**: VS-09A<br/>
**Canonical Capability**: `FEAT-A10a` (Single-Item Archive & 10s Undo Toast)<br/>
**Parent Capability**: `FEAT-A10` (Multi-Select Bulk Operations, Archive & 30-Day Trash)<br/>
**Governance Phase**: Phase 1 (Milestone M1.1 Work Management Foundation)<br/>
**Governance Sequence**: PLAN → GRILL → IMPLEMENT → TEST → REVIEW → LOCK → DOCUMENT<br/>
**Baseline Branch**: `develop @ 7f295bf472a0af6482d19622f4b72bdac22c3882`<br/>
**Feature Branch**: `feat/FE-VS09A-task-archive-undo`<br/>
**Frozen Implementation Commit**: `0b82ef93110b18f6f2b032d66f5b632cde7975fa` (`0b82ef9`)<br/>
**Approved Architecture Plan**: `docs/04-implementation/vs-09a-task-archive-and-undo-plan.md` (Version 2.1.0)<br/>
**Status**: **DELIVERED, VERIFIED, LOCKED & GOVERNANCE CLOSED**<br/>
**Date**: November 12, 2026<br/>
**Author**: Antigravity Pair Programming Agent<br/>

---

## 1. Executive Summary & Feature Overview

Milestone **VS-09A** delivers **Single-Item Task Archive & 10-Second Undo Toast (`FEAT-A10a`)**, establishing non-destructive, recoverable lifecycle transitions for tasks across all primary Sonder work management surfaces.

In Sonder, task deletion is replaced with recoverable soft-deletion. When a user archives a task, it is immediately and optimistically evicted from active queries while preserving its complete structural hierarchy, query ranking, status, and metadata. An accessible floating toast notification provides a 10-second recovery opportunity via an explicit "Undo" button or global keyboard hotkeys (`Z` and `Mod+Z`), with strict text-input suppression.

### Key Technical Achievements
1. **Server-Authoritative Evaluation with Advisory Client Countdown:**  
   The client countdown is strictly advisory, ensuring local clock drift or background tab suspension never causes premature client-side token expiration. The server remains solely authoritative for evaluating undo validity on `POST /restore`.
2. **Strict Fail-Closed Permission Gate:**  
   Archive actions are exposed only when `Boolean(task?.effectivePermissions?.canArchive && !isArchived)` evaluates to true. Missing permissions or already-archived states fail closed.
3. **Multi-View Query Cache Tracking & Surgical Rollback:**  
   Preserves query membership, sibling anchors (`prevTaskId`, `nextTaskId`), and original indices across List, Board, Calendar, and Timeline views. Re-inserts tasks surgically on archive failure and re-evicts tasks cleanly on restore failure.
4. **Independent Per-Task Undo Queue:**  
   Maintains independent undo opportunities across sequentially archived tasks, with per-task in-flight mutex locks against concurrent double-submission.
5. **Full WCAG 2.2 AA Conformance & Non-Stealing Focus:**  
   Touch targets meet &ge; 24&times;24px desktop and &ge; 44&times;44px mobile requirements. Focus returns to the nearest surviving canvas row/card upon drawer closure without stealing keyboard focus to the toast.

---

## 2. Delivered Functionality Inventory

| Capability Item | Description | Delivery Surface / Implementation | Verification Status |
| :--- | :--- | :--- | :---: |
| **1. Drawer Archive Action** | Primary header action bar button with Lucide `Archive` icon and tooltip. Closes drawer, removes `?task=` param, and evicts task. | [`TaskPeekDrawer.tsx` line 317](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskPeekDrawer.tsx#L317) | **VERIFIED** |
| **2. Actions Menu Dropdown** | Dropdown menu with "Copy Link" and "Archive Task" options. Emits `stopPropagation` to prevent row selection. | [`TaskActionsMenu.tsx` line 32](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskActionsMenu.tsx#L32) on `TaskListView` & `TaskBoardView` | **VERIFIED** |
| **3. Fail-Closed Permissions** | `Boolean(task?.effectivePermissions?.canArchive && !isArchived)` gate hides actions if permissions are loading or false. | Checked in Drawer, Actions Menu, and Context mutation hook | **VERIFIED** |
| **4. Advisory Countdown** | Derives `remainingMs = Math.max(0, expMs - Date.now())`. Clamps to 0ms without asserting local invalidity. | [`TaskUndoContext.tsx` line 225](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskUndoContext.tsx#L225) (100ms interval) | **VERIFIED** |
| **5. Server-Authoritative Restore**| Dispatches `POST /restore` with `undoToken`. Accepts 200 OK or catches 409 `UNDO_TOKEN_EXPIRED`. | Evaluated on server; handled in [`useArchiveTask.ts` line 450](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/useArchiveTask.ts#L450) | **VERIFIED** |
| **6. Tab Suspension Snapping** | Listens to `document.visibilitychange` to resynchronize countdown with wall-clock time on tab resume. | [`TaskUndoContext.tsx` line 253](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskUndoContext.tsx#L253) | **VERIFIED** |
| **7. Independent Undo Queue** | Manages `UndoItemState[]` array in state. Preserves multiple active toasts without cross-corruption. | [`TaskUndoContext.tsx` line 75](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskUndoContext.tsx#L75) | **VERIFIED** |
| **8. Duplicate Submission Guard** | Sets `status: "restoring"` immediately upon restore trigger, disabling Undo button and ignoring hotkeys. | Synchronous mutex lock in `undoTaskAction` | **VERIFIED** |
| **9. Keyboard Undo (`Z` & `Mod+Z`)**| Hotkeys target the newest idle undo entry in LIFO order without mouse interaction. | [`TaskUndoContext.tsx` line 289](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskUndoContext.tsx#L289) via `useKeyboardShortcut` | **VERIFIED** |
| **10. Input Suppression** | Hotkeys suppressed when typing inside `<input>`, `<textarea>`, `<select>`, or `[contenteditable]`. | Configured with `allowInInput: false` | **VERIFIED** |
| **11. Multi-View Cache Tracking**| `QueryMembershipAnchor` map tracks per-query presence, index, `prevTaskId`, and `nextTaskId`. | [`useArchiveTask.ts` line 118](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/useArchiveTask.ts#L118) across List, Board, Calendar, Timeline | **VERIFIED** |
| **12. Surgical Cache Rollback** | On archive failure, re-inserts task into prior positions without clobbering concurrent edits on sibling tasks. | [`useArchiveTask.ts` line 230](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/useArchiveTask.ts#L230) | **VERIFIED** |
| **13. Restore Failure Re-Eviction**| On restore failure (e.g. 409 expired), cleanses task from active queries and displays error in toast. | [`useArchiveTask.ts` line 468](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/useArchiveTask.ts#L468) | **VERIFIED** |
| **14. Accessible Floating Toast** | Linear progress bar (`role="progressbar"`), status region (`role="status"`), error alert (`role="alert"`). | [`TaskUndoToast.tsx` lines 20–117](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskUndoToast.tsx#L20-L117) | **VERIFIED** |
| **15. Non-Stealing Focus** | Focus returns to nearest surviving list row or board card rather than stealing focus to the floating toast. | [`TaskPeekDrawer.tsx` line 200](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskPeekDrawer.tsx#L200) & [`TaskActionsMenu.tsx` line 64](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskActionsMenu.tsx#L64) | **VERIFIED** |
| **16. Active Query Exclusion** | Active workspace task queries (`POST /tasks/query`) exclude archived tasks (`!t.archivedAt`). | Mock handler query filtering in `tasks.ts` | **VERIFIED** |
| **17. Deep-Link & Read-Only Drawer**| Archived tasks remain accessible via deep-link (`?task=ENG-088`), opening read-only drawer with archived notice. | Verified in `TaskPeekDrawer.tsx` lines 188–189 & `REG-03`/`REG-04` | **VERIFIED** |

---

## 3. Technical Architecture & Component Structure

### 3.1 Component Architecture & Data Flow

```
                                  User Action
             (TaskPeekDrawer Header or TaskActionsMenu Row/Card Dropdown)
                                       │
                                       ▼
                             [archiveTaskAction]
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
     [useArchiveTask onMutate]                     [POST /tasks/:id/archive]
  1. Inspect query cache memberships              1. Attach X-CSRF-Token & Mutation-ID
  2. Record QueryMembershipAnchors                2. Server soft-deletes task
  3. Optimistic eviction from views               3. Returns ArchiveTaskResultDto
  4. Single-task query marked ARCHIVED                  (undoToken, undoExpiresAt)
                │                                             │
                └──────────────────────┬──────────────────────┘
                                       │
                                       ▼
                       [TaskUndoContext State Registry]
                Creates UndoItemState { status: "idle", remainingMs }
                                       │
                                       ▼
                              [TaskUndoToast View]
                     1. Floating status banner (role="status")
                     2. Linear progress bar (role="progressbar")
                     3. Interactive "Undo" & "Dismiss" buttons
                                       │
                                       ▼
                         Advisory 100ms Countdown Tick
                     1. Clamps remainingMs to 0 without expiring
                     2. document.visibilitychange snaps to wall-clock
                                       │
                                       ▼
                             User Triggers Restore
                         (Clicks "Undo" or presses Z / Mod+Z)
                                       │
                                       ▼
                              [undoTaskAction]
                     1. Synchronous mutex lock (status: "restoring")
                     2. Fail-closed check: undoToken non-empty
                     3. POST /tasks/:id/restore with { undoToken }
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
          Server Accepts (200 OK)                       Server Rejects (409 Conflict)
  1. Authoritative TaskDto returned               1. Caught as ApiProblemError
  2. Single-task query cache updated              2. Re-evict task from active queries
  3. Workspace queries invalidated                3. status: "error" in UndoItemState
  4. Item unmounted from activeUndos              4. Toast renders <div role="alert">
```

### 3.2 Primary Files Delivered

1. **[`TaskUndoContext.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskUndoContext.tsx) (321 lines):**  
   Provides the React context and provider managing `activeUndos: UndoItemState[]`. Encapsulates `archiveTaskAction`, `undoTaskAction`, `dismissUndo`, advisory countdown intervals, tab visibility synchronization, and registered keyboard shortcuts.
2. **[`TaskUndoToast.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskUndoToast.tsx) (118 lines):**  
   Global floating toast container rendered in `WorkspaceTasksView.tsx`. Renders toast items with `role="status"`, linear progress bar with `aria-valuenow`, accessible buttons meeting WCAG 2.2 target sizes, and error announcements with `role="alert"`.
3. **[`useArchiveTask.ts`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/useArchiveTask.ts) (543 lines):**  
   Contains `useArchiveTask` and `useRestoreTask` React Query mutation hooks with multi-query cache inspection, `QueryMembershipAnchor` map capture, surgical rollback, and background query invalidation.
4. **[`TaskActionsMenu.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskActionsMenu.tsx) (143 lines):**  
   Dropdown action menu component integrated into `TaskListView` and `TaskBoardView`. Provides "Copy Link" and "Archive Task" with fail-closed permission gating and event propagation isolation.
5. **[`TaskPeekDrawer.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskPeekDrawer.tsx) (+46 lines):**  
   Integrated archive header button beside `TaskWatchButton`, non-stealing focus management, and read-only archived view presentation.
6. **[`api.ts`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/api.ts) (+52 lines):**  
   `archiveTask` and `restoreTask` API functions communicating with candidate endpoints with CSRF token and UUIDv7 idempotency headers.
7. **[`TaskArchive.test.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskArchive.test.tsx) (1,298 lines):**  
   Comprehensive automated regression suite containing 32 tests covering unit, integration, concurrency, skew, cache rollback, and accessibility workflows.

---

## 4. Security, Contract Boundaries & Invariants

- **CSRF Token Invariant:** `archiveTask` and `restoreTask` in `api.ts` pass the session `csrfToken` retrieved from `AuthContext`.
- **Mutation Idempotency Invariant:** Requests generate and transmit UUIDv7 mutation identifiers (`X-Mutation-Id`).
- **OpenAPI & Generated Types:** Zero changes were introduced to OpenAPI definitions (`packages/contracts/`) or the centralized API client (`apps/web/src/lib/api-client.ts`).
- **Attribution Boundary:** All automated, unit, integration, and browser runtime evidence was established using client-side Mock Service Worker (MSW) handlers. Live backend acceptance, database ACID persistence, and production rate-limiting remain pending backend milestones.

---

## 5. Final Verification Evidence

### 5.1 Automated Test Suites

```
================================================================================
SONDER AUTOMATED VERIFICATION AUDIT — MILESTONE VS-09A
================================================================================
Monorepo Test Suite:         pnpm test                                 538 / 538 passed (33.17s)
Task Domain Suite:           pnpm --filter @sonder/web test tasks      319 / 319 passed (19.76s)
Focused Archive Suite:       TaskArchive.test.tsx                       32 /  32 passed  (8.11s)
Integration E2E Suite:       TaskIntegrationE2E.test.tsx                24 /  24 passed  (6.91s)
Production Application Build:pnpm build                                Passed (3.74s, 3,137 modules)
TypeScript Validation:       pnpm typecheck                            Passed (0 errors)
Contract Typegen Check:      pnpm --filter @sonder/contracts typegen   Passed (OpenAPI 0.3.20-draft)
Documentation Schema Checks: pnpm validate:docs                        Passed (51 / 51 passed)
Whitespace / Patch Integrity:git diff --check develop..HEAD            Passed (0 violations)
================================================================================
```

### 5.2 Playwright Browser Runtime Verification

Executed against live Vite development server (`http://localhost:5173/`) and MSW mock fixtures:

| Journey / Scenario | Assertions Evaluated | Browser Result | Artifact Evidence |
| :--- | :--- | :---: | :--- |
| **Journey A: Task Peek Drawer Archive & Undo** | Deep link loaded drawer; task details loaded; archive button clicked; drawer closed; URL cleaned of `?task=`; row evicted; toast visible with progress bar; touch target 51.97x32px; focus transferred to next row (`TR.task-list-row-ENG-105`); Undo clicked; task restored to list; toast unmounted. | **PASSED**<br>(0 errors) | [`vs09a_drawer_open.png`](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/vs09a_drawer_open.png)<br>[`vs09a_toast_visible.png`](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/vs09a_toast_visible.png)<br>[`vs09a_task_restored.png`](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/vs09a_task_restored.png) |
| **Journey B Scenario 1: Countdown Zero + Server Accepts** | Task `ENG-102` archived; client clock fast-forwarded by 12s; client countdown confirmed at `aria-valuenow="0"`; Undo button confirmed enabled at zero countdown; Undo clicked; server accepted 200 OK; task re-appeared in List View; toast unmounted. | **PASSED**<br>(0 errors) | [`vs09a_zero_countdown_enabled.png`](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/vs09a_zero_countdown_enabled.png)<br>[`vs09a_zero_countdown_restored.png`](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/vs09a_zero_countdown_restored.png) |
| **Journey B Scenario 2: Countdown Positive + Server 409 Rejection** | Task `ENG-105` archived; server token expired in MSW store while client clock remained positive; Undo clicked; server returned HTTP 409 `UNDO_TOKEN_EXPIRED`; toast rendered `<div role="alert">`; task remained evicted; Undo button disabled; dismiss "X" unmounted toast cleanly. | **PASSED**<br>(0 errors) | [`vs09a_server_rejection_alert.png`](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/vs09a_server_rejection_alert.png) |

---

## 6. Accepted Limitations & Scope Boundaries

### 6.1 Accepted Minor UX Limitations

1. **Persistent Zero-Countdown Toasts:**  
   When an untouched undo countdown reaches 0s, it remains visible in the viewport until explicitly restored or dismissed via the "X" button. This enforces the server-authoritative invariant, preventing premature client-side loss of undo opportunities under clock drift.
2. **Transient Restore Failure Recovery:**  
   If an unexpected network disruption or server 5xx error occurs during restore, the item transitions to `status: "error"` and disables the Undo button. Retrying requires a page refresh; candidate API contracts in VS-09A do not specify retry semantics.

### 6.2 Explicit Unresolved Product Decisions

- **`DEC-ARCHIVE-01`:** Multi-task / bulk archive operations remain deferred to Milestone **VS-09B** (`FEAT-A10b`).
- **`DEC-ARCHIVE-02`:** Custom per-workspace retention policy configurations remain deferred.
- **`DEC-ARCHIVE-03`:** Permanent purge APIs remain gated pending platform-level `DEC-OPEN-03`.

### 6.3 Explicit Scope Exclusions

- **No Bulk Archive:** Reserved strictly for VS-09B.
- **No Dedicated Trash View:** The `/trash` route belongs strictly to VS-09B.
- **No Permanent Purge:** Hard deletion is strictly forbidden; purge APIs remain gated on `DEC-OPEN-03`.
- **UI/UX Track B Remains PAUSED:** Built strictly using existing semantic design tokens and `@base-ui/react` primitives.

---

## 7. Governance Progression & Lifecycle Record

| Governance Stage | Completion Criteria & Evidence | Stage Status |
| :--- | :--- | :---: |
| **1. PLAN** | `docs/04-implementation/vs-09a-task-archive-and-undo-plan.md` v2.1.0 approved by reviewer. | **ACCEPTED** |
| **2. GRILL** | Reconciled `RestoreTaskRequest`, verified `TaskPermissions` schema, established multi-view cache anchors. | **ACCEPTED** |
| **3. IMPLEMENT**| Implemented across 15 files with 8 commits; removed `ENG-088` exception and completed advisory countdown correction (`0b82ef9`). | **ACCEPTED** |
| **4. TEST** | Full monorepo (538/538), task domain (319/319), archive suite (32/32), E2E (24/24), build, typecheck, docs (51/51), and Playwright runtime journeys passed. | **ACCEPTED** |
| **5. REVIEW** | Comprehensive read-only code review confirmed 0 blockers and 0 major findings. Accepted 2 minor UX limitations. | **ACCEPTED** |
| **6. LOCK** | Implementation frozen at `0b82ef93110b18f6f2b032d66f5b632cde7975fa`. Clean working tree and zero git mutations confirmed. | **ACCEPTED** |
| **7. DOCUMENT**| Consolidated delivery report (`vs-09a-task-archive-and-undo-delivery-report.md`) published; trackers synchronized. | **CLOSED** |

---

## 8. Final Status Determination

```
================================================================================
SONDER MILESTONE VS-09A (FEAT-A10a) — FORMAL GOVERNANCE COMPLETE
================================================================================
Frozen Implementation Commit: 0b82ef93110b18f6f2b032d66f5b632cde7975fa
Develop Baseline:             7f295bf472a0af6482d19622f4b72bdac22c3882
Governance Stage:             DOCUMENT (Final Stage Completed)
Status:                       VS-09A DOCUMENTATION COMPLETE — GOVERNANCE CLOSED
Next Approved Target:         Awaiting explicit human direction for VS-09B
================================================================================
```
