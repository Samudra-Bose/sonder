# SONDER — VS-04 DELIVERY REPORT: SYNCHRONIZED LIST & BOARD VIEWS

**Baseline Branch**: `develop` at `b8234637950442b1c63431b0cb6a6a4a568e6490`  
**Active Working Branch**: `feat/FE-VS04-list-board-views`  
**Target Branch**: `develop`  
**Status**: COMPLETE — Functional Correctness, Contract Integrity, View Synchronization & Quality Gates Passed  
**Date**: November 9, 2026  
**Author**: Antigravity Pair Programming Agent  

---

## 1. Executive Summary

VS-04 delivers the first two primary workspace task views for Sonder:
1. **List View (`LIST` projection)**: A dense, accessible table/grid displaying workspace tasks with task keys, titles, status dual-indicator badges, priority dual-indicator badges, due dates, subtask count badges, and seamless Task Peek Drawer integration.
2. **Board View (`BOARD` projection)**: A structured Kanban board organized by status category columns derived directly from the server's query buckets (`groups: TaskQueryBucketDto[]`), featuring accessible non-drag status category transitions, mobile stage switcher tabs, and card-click Task Peek Drawer deep linking.

These two views operate on the same canonical workspace task model and maintain strict data and query synchronization across view switches, filter adjustments, search input, sorting, backlog inclusion, and inline task mutations.

In addition to VS-04 frontend deliverables, this milestone establishes a permanent, project-level operating rule (`.agents/rules/sonder-tooling-autoselect.md`) that codifies automatic tooling discovery, selection, MCP server utilization, accessibility safeguards, and the canonical 7-step engineering cycle for all subsequent Sonder development stages.

---

## 2. Source-of-Truth & Contract Alignment

| Requirement / Invariant | Authoritative Specification | Implementation Reference |
| :--- | :--- | :--- |
| **Active OpenAPI Contract** | `Community-Work-Management-v1.5/docs/contracts/openapi.yaml` | Version `0.3.20-draft` |
| **Canonical Hierarchy** | Master Specification §2.1 | `Community → Workspace → Task → Subtask` (Zero Project containers) |
| **Workspace Task Query** | `POST /communities/{communityId}/workspaces/{workspaceId}/tasks/query` | `projection: "LIST"` \| `"BOARD"` |
| **List Projection Semantics** | OpenAPI `TaskQueryResult` | Returns `items: TaskDto[]`, `groups: []`, `totalCount`, `querySnapshotId` |
| **Board Projection Semantics** | OpenAPI `TaskQueryResult` | Returns `items: []` ("BOARD PRIMARY uses groups"), `groups: TaskQueryBucketDto[]` |
| **Query Filter Model** | OpenAPI `QueryFilterGroup` & `QueryFilterCondition` | Converted to boolean AST (`AND` conditions with `op: "CONTAINS"`, `op: "EQ"`) |
| **Sorting Term Model** | OpenAPI `QuerySortTerm` | `field: "rankKey" \| "dueDate" \| "priority" \| "createdAt"`, `direction: "ASC" \| "DESC"` |
| **Snapshot Consistency** | OpenAPI `TaskQueryResult.querySnapshotId` | 900s server snapshot; reused strictly on view projection transitions |
| **Snapshot Expiration Handling** | OpenAPI `409 QUERY_SNAPSHOT_EXPIRED` | Automatic retry recovering from fresh snapshot |
| **Accessible Status Transitions** | PRD §3.2 & WCAG 2.2 Level AA | Non-drag `<select aria-label="Move task status">` with field-revision concurrency |
| **Dual-Indicator Status / Priority** | Sonder Design System Tokens | Color badge + textual label + icon; never color alone |
| **Routing Support** | Blueprint §3.1 & Routing Hierarchy | `/list`, `/board`, `/workspaces/:workspaceId/(list\|board)`, `/c/:communityId/w/:workspaceId/(list\|board)` |
| **Boundary Discipline** | Architectural Rules | Production code (`apps/web/src/modules/tasks/`) imports zero mock files |

---

## 3. Implemented Architecture & Components

### 3.1 Task View Components (`apps/web/src/modules/tasks/views/`)

1. **`TaskViewToolbar.tsx`**:
   - Segmented view switcher (`List` / `Board`) with active state indicators and `aria-pressed`.
   - Text search input bound to `q` filter state.
   - Priority filter dropdown (`All Priorities`, `URGENT`, `HIGH`, `MEDIUM`, `LOW`, `NONE`).
   - Status category filter dropdown (`All Statuses`, `BACKLOG`, `TODO`, `IN_PROGRESS`, `DONE`, `CANCELLED`).
   - Sort selector (`Manual Rank`, `Due Date`, `Priority`, `Creation Date`).
   - Backlog visibility checkbox toggle (`includeBacklog`).
   - Real-time task count badge displaying total matched tasks.
   - Quick task creation button (`+ New Task`) integrated with `useQuickTaskComposer`.

2. **`TaskListView.tsx`**:
   - Semantic table structure (`<table aria-label="Workspace Tasks List">`) with keyboard accessible rows.
   - Column layout: Key, Title & Subtasks, Status, Priority, Due Date.
   - Enter/Space keyboard navigation opening the Task Peek Drawer.
   - Subtask counter badge (`N subtasks`) with link to view hierarchy.
   - Dual-indicator status and priority badges using design tokens (`getStatusBadgeColor`, `getPriorityBadgeColor`).
   - Accessible loading skeleton (`task-list-loading-skeleton`), empty state, and error feedback with retry action.

3. **`TaskBoardView.tsx`**:
   - Status category columns rendered dynamically from server buckets (`TaskQueryBucketDto[]`): `BACKLOG`, `TODO`, `IN_PROGRESS`, `DONE`, `CANCELLED`.
   - Responsive design with horizontal scrolling on wide viewports and an accessible stage switcher tab bar (`md:hidden`) on mobile viewports.
   - Task cards displaying key prefix badge, title, priority, due date indicator, and accessible non-drag status transition selector.
   - Status transition selector executes optimistic mutation via `useUpdateTask` with field-level revision protection (`statusCategoryRevision`), seamlessly updating both List and Board views without full page reloads.
   - Accessible loading skeleton (`task-board-loading-skeleton`), column empty states, and feedback error state with retry.

4. **`WorkspaceTasksView.tsx`**:
   - Top-level container component coordinating active community/workspace context via `useWorkspace`.
   - Bidirectional URL query synchronization: reflects `q`, `priority`, `status`, `sort`, `backlog`, and `stage` into URL search parameters without page refreshes.
   - Snapshot reuse orchestration: Captures `queryResult.querySnapshotId` in `transitionSnapshotIdRef` exclusively when switching between `LIST` and `BOARD` projections. Clears snapshot ID upon filter adjustments or mutations to guarantee fresh server evaluation.
   - Renders `TaskPeekDrawer` connected to URL `taskId` parameter.

### 3.2 Enhanced Task Data Layer & Query Hook

1. **`apps/web/src/modules/tasks/types.ts`**:
   - Re-exported canonical types from `@sonder/contracts`: `TaskQueryBucketDto`, `ViewQuerySpec`, `QueryFilterGroup`, `QueryFilterCondition`, `QuerySortTerm`.
2. **`apps/web/src/modules/tasks/api.ts`**:
   - Canonical `queryWorkspaceTasks` defaults for Board projection (`groupBy: "statusCategory"`, `includeBacklog: true`, `includeCompleted: true`).
3. **`apps/web/src/modules/tasks/useWorkspaceTasks.ts`**:
   - Added support for `BOARD` projection (`result.groups`).
   - Integrated `querySnapshotId` parameter with automatic retry logic upon `409 QUERY_SNAPSHOT_EXPIRED`.
   - Maintained multi-page traversal capability for `LIST` projection up to 1000 tasks.

### 3.3 Mock Service Worker (MSW) Contract Upgrade

- **`apps/web/src/mocks/handlers/tasks.ts`**:
  - Full implementation of `POST /communities/{communityId}/workspaces/{workspaceId}/tasks/query` for both `LIST` and `BOARD` projections.
  - Implemented server query snapshot cache with 900-second TTL and filter-signature validation.
  - Implemented AST filter parser evaluating `q` (title search), `statusCategory`, `priority`, and `assigneeId`.
  - Implemented server-side sorting by `rankKey`, `dueDate`, `priority`, and `createdAt`.
  - Implemented backlog partitioning (`backlogCount`, `backlogPreview`) and `subtaskMode: "TOP_LEVEL_ONLY"`.
  - Implemented bucket grouping by `statusCategory` for Board projection, generating 5 buckets (`BACKLOG`, `TODO`, `IN_PROGRESS`, `DONE`, `CANCELLED`) with per-bucket task counts.

### 3.4 Navigation & Routing Integration

- **`apps/web/src/App.tsx`**:
  - Added routes:
    - `/list` and `/board`
    - `/workspaces/:workspaceId/list` and `/workspaces/:workspaceId/board`
    - `/c/:communityId/w/:workspaceId/list` and `/c/:communityId/w/:workspaceId/board`
- **`apps/web/src/modules/app-shell/AppSidebar.tsx`**:
  - Added dedicated "Views" section featuring "List" and "Board" links when an active workspace is present, highlighting active route based on current path.

---

## 4. Permanent Project Operating Rule

Created `.agents/rules/sonder-tooling-autoselect.md` establishing persistent tooling autonomy:
1. **Automatic Discovery**: Automatically inspects CLI tools, skills, MCP servers, and subagents on task initiation without requiring explicit prompts.
2. **Dynamic Tool Selection**:
   - Documentation & API Integration: `context7` MCP and canonical OpenAPI contracts.
   - Frontend Implementation: React 19, `@base-ui/react`, design tokens, dual indicators.
   - Browser Testing & Accessibility: `playwright` MCP, `chrome-devtools` MCP, WCAG 2.2 AA.
   - Performance & Audits: DevTools audits and Lighthouse CI.
   - Boundary Integrity: `architecture-review` enforcing zero mock imports in production code.
3. **The 7-Step Canonical Engineering Workflow**: Plan $\to$ Grill $\to$ Implement $\to$ Test $\to$ Review $\to$ Lock $\to$ Document.

---

## 5. Verification & Test Suite Results

A dedicated test suite `apps/web/src/modules/tasks/TaskViews.test.tsx` was created containing 17 comprehensive unit and integration tests:

1. **List View Suite**:
   - Renders task rows with key, title, status, priority, and due date.
   - Filters task rows by search query (`q`).
   - Filters task rows by priority dropdown.
   - Filters task rows by status category dropdown.
   - Navigates to Task Peek Drawer on row click or `Enter` press.
   - Displays empty state when no tasks match filters.
2. **Board View Suite**:
   - Renders Kanban columns corresponding to status categories (`TODO`, `IN_PROGRESS`, `DONE`, etc.).
   - Renders task cards in appropriate columns with key badges and titles.
   - Supports non-drag status transition selector on task cards.
   - Updates task status category optimistically and persists change.
   - Opens Task Peek Drawer when clicking a board card.
   - Renders mobile stage switcher tabs on mobile viewports.
3. **View Synchronization Suite**:
   - Toggles between List and Board views while preserving filter state.
   - Reuses `querySnapshotId` during view transitions to guarantee snapshot consistency.
   - Clears snapshot ID and re-queries when filter criteria change.
   - Reflects quick task creation across both views.
4. **Architectural Boundary Suite**:
   - Verifies that zero mock fixture or handler imports exist in `apps/web/src/modules/tasks/views/`.

### Summary of Monorepo Quality Gates:
- **`pnpm validate:docs`**: 51/51 checks passed (0 errors)
- **`pnpm typegen:check`**: Clean diff against OpenAPI `0.3.20-draft`
- **`pnpm -r run typecheck`**: 0 errors across all workspaces
- **`pnpm -r run test`**: 34 test files, 335 tests passed (100% green)
- **`pnpm build`**: Successful Vite production build (0 warnings/errors)
- **`git diff --check`**: 0 whitespace errors

---

## 6. PR & Integration Traceability

- **Baseline Commit**: `b8234637950442b1c63431b0cb6a6a4a568e6490`
- **Working Branch**: `feat/FE-VS04-list-board-views`
- **Pull Request**: [#20](https://github.com/Samudra-Bose/sonder/pull/20) (Merged)
- **Merge Commit**: `8b18be2193173734faa95dc48d88d80cb8c7977b`
- **Merge Method**: Squash and merge
- **Target Branch**: `develop`
