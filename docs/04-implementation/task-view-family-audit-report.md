# SONDER — VS-06A AUDIT REPORT: CONSOLIDATED TASK VIEW FAMILY REVIEW & READINESS AUDIT

**Audit Baseline**: `develop` at `bdb2180` (includes VS-05C.1 merge `d2c3eba`)  
**Active Working Branch**: `audit/VS06A-task-view-family-review` (merged into `develop`)  
**Target Branch**: `develop`  
**Pull Request**: [#26](https://github.com/Samudra-Bose/sonder/pull/26)  
**Final Merge Commit**: `a31a873`  
**Status**: MERGED & VERIFIED — Comprehensive Architecture, Usability, Contract Integrity, Accessibility & Cross-View Workflow Audit  
**Date**: November 9, 2026  
**Author**: Antigravity Pair Programming Agent  

---

## 1. Executive Assessment of Task-View Readiness

The Sonder task-view family comprises four primary projections:
1. **List View (`LIST` projection)**: Dense tabular representation for rapid triage, status/priority visualization, and hierarchical inspection.
2. **Board View (`BOARD` projection)**: Kanban representation organized by status category server buckets (`BACKLOG`, `TODO`, `IN_PROGRESS`, `DONE`, `CANCELED`), featuring non-drag accessible status transitions and mobile stage switcher tabs.
3. **Calendar View (`CALENDAR` projection)**: Chronological calendar grid supporting Month (7×5/6 matrix) and Week (7-day column) modes, pure UTC date math, "+N more" day popovers, and an unscheduled task tray.
4. **Timeline View (`TIMELINE` projection)**: Gantt-style planning canvas supporting Day, Week, and Month zoom resolutions, task duration bars (`RANGE`, `START_ONLY`, `DUE_ONLY`), dynamic clipping, vertical "Today" indicator, workspace milestone markers, SVG bezier dependency connectors, dual conflict warnings, and restricted endpoint privacy shielding.

### Overall Readiness Rating: **PRODUCTION-CANDIDATE (94/100)**
The four task views form an exceptionally cohesive, contract-compliant, and well-synchronized work management experience. Shared state propagation, URL search parameter synchronization, workspace boundary isolation, and Task Peek Drawer deep-linking function uniformly across all views. No regressions or contract violations were detected.

---

## 2. Shared Architecture & State Consistency

### 2.1 Unified Query Model
- **Endpoint**: All four views communicate through the canonical endpoint:
  `POST /communities/{communityId}/workspaces/{workspaceId}/tasks/query`
- **Projection Specialization**:
  - `LIST`: Populates `items: TaskDto[]`, `groups: []`, `total`, `querySnapshotId`.
  - `BOARD`: Populates `items: []`, `groups: TaskQueryBucketDto[]`, `querySnapshotId`.
  - `CALENDAR`: Populates dated `items: TaskDto[]` within `dateWindow: { dateField: "DUE_DATE", ... }` and `unscheduledPreview: TaskDto[]`.
  - `TIMELINE`: Populates dated `items: TaskDto[]` within `dateWindow: { dateField: "START_TO_DUE_SPAN", ... }`, `unscheduledPreview: TaskDto[]`, and `dependencyEdges: TaskQueryDependencyEdgeDto[]`.
- **Snapshot Parity**:
  - `WorkspaceTasksView.tsx` captures `queryResult.querySnapshotId` in `transitionSnapshotIdRef` upon view switching.
  - When switching between views (e.g. List → Board → Timeline), the existing server query snapshot (900-second TTL) is reused, guaranteeing dataset consistency across projections.
  - If a snapshot expires on the server, `useWorkspaceTasks.ts` automatically catches HTTP 409 `QUERY_SNAPSHOT_EXPIRED` and transparently refetches with a fresh snapshot.

### 2.2 Filter & Sort State Preservation
- **URL Synchronization**: Search text (`q`), priority filter (`priority`), status filter (`status`), sort field (`sort`), and backlog toggle (`backlog`) are bound to URL query parameters via `updateSearchParams({ replace: true })`.
- **Seamless Navigation**: Switching views via the segmented tab control in `TaskViewToolbar` updates the route pathname (`/list`, `/board`, `/calendar`, `/timeline`) while preserving all active search parameters (`${basePath}/${newView}${location.search}`).
- **Workspace Context**: All query keys are hierarchically structured:
  `["communities", communityId, "workspaces", workspaceId, "tasks", ...]`
  Switching workspace context cleanly resets local queries and prevents cross-workspace data leakage.

### 2.3 Cache Invalidation Invariants
- Task mutations (`useCreateTask`, `useUpdateTask`), milestone mutations (`useCreateMilestone`, `useUpdateMilestone`, `useDeleteMilestone`), and task link mutations (`useCreateTaskLink`, `useDeleteTaskLink`) invalidate the canonical prefix:
  `["communities", communityId, "workspaces", workspaceId, "tasks"]`
  All active views re-query and update without requiring a full page reload.

---

## 3. Individual View Assessments

### 3.1 List View (`TaskListView.tsx`)
- **Strengths**:
  - Semantic HTML table (`<table aria-label="Tasks table">`) with keyboard accessible rows (`tabIndex={0}`, `Enter`/`Space` handlers).
  - Prominent dual-indicator status and priority badges using Sonder design tokens.
  - Subtask child badge indicating hierarchical depth.
  - Due date formatting with calendar icon and empty date indicators (`—`).
  - Accessible loading skeleton (`task-list-loading`), empty state, and error banner with retry button.
- **Observations / Deficiencies**:
  - **Sort Triggering**: Table headers (`Key`, `Title`, `Status`, `Priority`, `Due Date`) are currently static labels. Sorting is controlled strictly through the toolbar `Sort:` combobox rather than clicking column headers.
  - **Pagination**: Large workspaces utilize infinite scroll / continuation cursors, but there is no explicit jump-to-page selector.

### 3.2 Board View (`TaskBoardView.tsx`)
- **Strengths**:
  - Status columns dynamically generated from server buckets (`TaskQueryBucketDto[]`).
  - Strict WCAG 2.2 Level AA accessibility: Avoids drag-only traps by providing an accessible `<select aria-label="Move task status">` on each card.
  - Optimistic mutations with field-level revision tracking (`statusCategoryRevision`) prevent race conditions.
  - Mobile stage switcher tabs (`md:hidden`) with `role="tablist"` allow single-column mobile triage without excessive horizontal scrolling.
- **Observations / Deficiencies**:
  - **Drag-and-Drop**: Visual drag-and-drop between columns is not implemented (intentionally deferred in VS-04 in favor of accessible dropdown transitions).
  - **Column Collapse**: Board columns cannot be manually collapsed to save horizontal space.

### 3.3 Calendar View (`CalendarView.tsx`)
- **Strengths**:
  - Dual modes: Month (7×5/6 grid starting Sunday) and Week (7 chronological columns).
  - Pure UTC date mathematics (`Date.UTC()`) eliminating timezone shifts and leap-year errors.
  - Date cells display up to 2 items directly; additional items are accessed via an accessible "+N more" popover dialog overlay (`role="dialog"`).
  - Unscheduled task tray at the bottom partitions tasks missing `dueDate` with full task details and click-to-drawer support.
  - Month/week navigation controls ("Previous", "Next", "Today" shortcut).
- **Observations / Deficiencies**:
  - **Date Creation Shortcut**: Clicking an empty day cell currently does not trigger task creation with that date pre-selected (users must click "+ New Task" in the toolbar).
  - **Multi-Day Spans**: Month cells map tasks strictly by `dueDate`. Multi-day span bars are exclusive to Timeline view.

### 3.4 Timeline View (`TimelineView.tsx`)
- **Strengths**:
  - Gantt-style time canvas supporting Day, Week, and Month zoom resolutions.
  - Task duration capsules distinguishing between `RANGE` (start to due), `START_ONLY` (open-ended), and `DUE_ONLY` (deadline bar).
  - Automatic boundary clipping styling (flat edge indicators) when tasks extend outside the visible window.
  - Milestone marker visualization: Vertical diamond markers with popover details (target date, linked task count, edit, delete).
  - SVG bezier dependency connectors with arrowheads, line styling per relationship type (`BLOCKS`, `RELATES_TO`, `DUPLICATES`), and midpoint conflict pills (`!`).
  - Privacy invariant: Restricted opposite endpoints render a neutral "Restricted Task" lock badge without exposing sensitive IDs or titles.
  - Explicit container `ResizeObserver` ensures connector paths dynamically recalculate on viewport resize.
- **Observations / Deficiencies**:
  - **Interactive Rescheduling**: Task duration bars cannot be dragged horizontally or edge-resized to change dates (dates are edited via `TaskPeekDrawer`). This preserves the strict "No automated rescheduling / explicit date editing" rule.

---

## 4. Cross-View Workflow Verification

All cross-view workflows were tested on a live Vite dev server with deterministic MSW data and Playwright browser automation:

| Workflow Scenario | Expected Behavior | Observed Result | Status |
| :--- | :--- | :--- | :--- |
| **Direct Route Navigation** | Accessing `/list`, `/board`, `/calendar`, `/timeline` loads the correct view | All 4 routes render correctly with view-specific components | **PASSED** |
| **Filter Preservation** | Applying `priority=HIGH` and switching views retains filter | Filter remains active across all 4 views; task counts match | **PASSED** |
| **Search Query Preservation** | Searching `q=auth` and switching views retains query | Search query persists in URL and filters all projections | **PASSED** |
| **Task Deep-Link (`?task=ENG-102`)** | Drawer opens with task details from any view | Drawer opens identically in List, Board, Calendar, and Timeline | **PASSED** |
| **Task Creation** | Creating a task in Quick Composer updates all views | Task appears in List, Board, Calendar (if dated), and Timeline | **PASSED** |
| **Status Transition (Board)** | Moving task from `TODO` to `IN_PROGRESS` via dropdown | Status updates immediately in Board and reflects in List and Timeline | **PASSED** |
| **Date Modifications** | Updating start/due dates via drawer shifts positions | Bar shifts in Timeline and moves to target day cell in Calendar | **PASSED** |
| **Milestone CRUD** | Creating/editing/deleting a milestone in Timeline | Milestone marker appears, updates, and deletes cleanly; tasks unlinked | **PASSED** |
| **Dependency CRUD** | Adding/deleting a dependency in drawer updates SVG | Connectors dynamically render and unmount on Timeline canvas | **PASSED** |
| **Workspace Boundary Isolation** | Switching between `ENG` and `ALEX` workspaces | Zero cross-workspace task or relationship leakage; clean isolation | **PASSED** |

---

## 5. Accessibility, Responsive Behavior & UX Consistency

### 5.1 Accessibility Audit (WCAG 2.2 AA)
- **Keyboard Navigation**:
  - Toolbar segmented view switcher: Full arrow-key navigation and `role="tablist"` / `role="tab"` / `aria-selected` semantics.
  - List View: Table rows are focusable (`tabIndex={0}`) with `Enter`/`Space` handlers opening the Task Peek Drawer.
  - Board View: Non-drag `<select aria-label="Move task status">` provides accessible status movement.
  - Calendar View: Month cells implement `role="gridcell"` with descriptive labels (e.g. `aria-label="2026-11-09, 2 tasks"`). Popover uses `role="dialog"`.
  - Timeline View: Task info buttons, zoom mode toggles, and milestone markers have accessible names and focus rings.
- **Dual-Indicator Tokens**:
  - No status or priority relies solely on color. Every indicator includes an icon, text label, and color badge.
- **Conflict & Privacy Warnings**:
  - Conflict warning uses icon (`AlertTriangle`) + amber color + descriptive tooltip + drawer warning alert.
  - Restricted tasks use lock icon + neutral text label (`"Restricted Task"`) with zero ID leakage in DOM or ARIA attributes.

### 5.2 Responsive Layout Verification
- **Desktop (`1280×800`)**:
  - All four views render spacious layouts.
  - List table displays all 6 columns cleanly.
  - Board displays 4 status columns side-by-side with horizontal scroll on overflow.
  - Calendar displays 7-column grid with clear "+N more" overflow.
  - Timeline displays 21-day / 10-week / 6-month Gantt grid with aligned SVG connector layer.
- **Mobile (`390×844`)**:
  - List table scrolls horizontally with preserved row interaction.
  - Board switches to single-column mode with top stage switcher tabs (`md:hidden`).
  - Calendar switches to compact mode; day cells stack cleanly.
  - Timeline displays responsive time axis; unscheduled tray collapses into mobile sheet.
  - Live viewport resizing (`1280×800` → `390×844`) triggers `ResizeObserver` recalculation without connector distortion.

---

## 6. Production & Architecture Checks

| Check | Specification Requirement | Audit Result | Status |
| :--- | :--- | :--- | :--- |
| **Production MSW Exclusion** | No MSW code or mock handlers in production bundle | `import.meta.env.DEV` guards in `main.tsx`; dead-code eliminated in build | **VERIFIED** |
| **`dist/mockServiceWorker.js`** | Investigate unreferenced public asset vs deployment issue | Copied by Vite from `public/` to `dist/`; never registered or executed in production | **RESOLVED** |
| **Contract Synchronization** | TypeScript types match OpenAPI `0.3.20-draft` | `pnpm typegen:check` passed with 0 diffs | **VERIFIED** |
| **Hierarchy Preservation** | `Community → Workspace → Task → Subtask` | Zero Project containers introduced | **VERIFIED** |
| **No File Attachments** | No file upload/attachment feature | No file attachment APIs or components present | **VERIFIED** |
| **Quality Gate Suite** | Docs, typegen, typecheck, tests, build, git diff | 51/51 docs, 44 test files (417 tests), clean build, 0 git whitespace errors | **VERIFIED** |

### Clarification on `dist/mockServiceWorker.js`
`mockServiceWorker.js` is placed in `apps/web/public/` to support local browser development with MSW. Vite's default build step copies all files in `public/` into `dist/`.
- **Runtime Execution**: In production builds, `main.tsx` evaluates `if (import.meta.env.DEV)` as `false`, which completely eliminates the MSW registration code. The browser never registers `mockServiceWorker.js`.
- **Security Assessment**: Low risk, but to ensure strict hygiene for production deployments, `mockServiceWorker.js` can be moved out of `public/` into a dedicated dev asset folder or excluded via `vite.config.ts` `publicDir` configuration during production builds.

---

## 7. Confirmed Defects & Anomalies

During the audit, no high-severity functional bugs were identified. Two minor low-severity usability anomalies were logged:

### Defect 1: Static Column Headers in List View
- **Severity**: Low (UX inconsistency)
- **Reproduction**:
  1. Navigate to `/list`.
  2. Click on column header "Due Date" or "Priority".
- **Observed Behavior**: Header text is non-interactive; sort order does not change. Sorting requires opening the toolbar "Sort:" combobox.
- **Expected Behavior**: Clicking a table column header should toggle sorting on that column (`ASC` / `DESC`).

### Defect 2: Click-to-Create Date Gap in Calendar Month View
- **Severity**: Low (Feature polish)
- **Reproduction**:
  1. Navigate to `/calendar?mode=month`.
  2. Click on an empty day cell (e.g. November 18).
- **Observed Behavior**: Nothing occurs. The user must click "+ New Task" in the toolbar and manually pick a date.
- **Expected Behavior**: Clicking an empty day cell should open the Quick Task Composer with `dueDate` pre-filled to that day.

---

## 8. Missing Test Coverage & Technical Risks

1. **E2E Playwright Suite in CI**:
   - Current CI workflow runs Vitest unit and integration tests (417 tests).
   - Playwright browser QA is currently executed locally during delivery preflight. Adding headless Playwright execution to GitHub Actions CI will ensure long-term regression protection.
2. **High-Density Dependency Graphs**:
   - Workspaces with >50 intersecting dependency edges on the Timeline canvas may experience visual overlapping of SVG bezier paths. Edge routing algorithms (e.g. orthogonal or bundled curves) can be evaluated in future milestones.

---

## 9. Prioritized Recommendations

| Priority | Recommendation | Category | Effort |
| :--- | :--- | :--- | :--- |
| **P1** | Add interactive column-header sorting to List View | UX Polish | Small |
| **P1** | Add click-to-create on Calendar day cells pre-filling `dueDate` | Usability | Small |
| **P2** | Exclude `mockServiceWorker.js` from production distribution in Vite config | Build / Security | Small |
| **P2** | Add keyboard shortcut navigation between view tabs (e.g. `1`=List, `2`=Board, `3`=Calendar, `4`=Timeline) | Accessibility | Small |
| **P3** | Add headless Playwright regression suite to GitHub Actions CI workflow | Infrastructure | Medium |

---

## 10. Next-Phase Recommendation: Saved Views vs. Dedicated UI/UX Refinement

The prompt directs an evaluation of two possible next workstreams:
- **Option A: Saved Views** — Personalized, reusable task-query configurations (custom filters, sort presets, active view selection).
- **Option B: Dedicated UI/UX Refinement & Polish** — Visual consistency, interaction quality, accessibility, responsive behavior, and interactive polish across all four views.

### Strategic Recommendation: **Option B (Dedicated UI/UX Refinement & Polish — VS-06B)**

**Reasoning**:
1. **Contract Stability**: Saved Views require persistent storage of query configurations (either via user profile settings or workspace view entities). The current canonical OpenAPI `0.3.20-draft` does not declare frozen CRUD routes for custom view entities (`/workspaces/{id}/views`). Implementing Saved Views now would risk inventing speculative APIs.
2. **Foundation Consolidation**: All four primary views (List, Board, Calendar, Timeline) are functionally complete and verified. A targeted refinement pass (adding column-header sorting in List, click-to-create on Calendar cells, keyboard view shortcuts, and production bundle asset cleanup) will bring the core task family to an outstanding, release-grade standard of polish.
3. **Execution Momentum**: Addressing the identified low-severity anomalies immediately eliminates technical debt before introducing additional state-persistence layers.

---

## 11. Visual Artifact References

The following high-resolution visual evidence artifacts were captured during Playwright browser automation and are stored in the artifact directory:

- Desktop List View (`1280×800`): [task-view-audit-list-desktop.png](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/task-view-audit-list-desktop.png)
- Desktop Board View (`1280×800`): [task-view-audit-board-desktop.png](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/task-view-audit-board-desktop.png)
- Desktop Calendar View (`1280×800`): [task-view-audit-calendar-desktop.png](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/task-view-audit-calendar-desktop.png)
- Desktop Timeline View (`1280×800`): [task-view-audit-timeline-desktop.png](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/task-view-audit-timeline-desktop.png)
- Desktop TaskPeekDrawer Deep Link (`1280×800`): [task-view-audit-drawer-desktop.png](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/task-view-audit-drawer-desktop.png)
- Mobile List View (`390×844`): [task-view-audit-list-mobile.png](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/task-view-audit-list-mobile.png)
- Mobile Board View (`390×844`): [task-view-audit-board-mobile.png](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/task-view-audit-board-mobile.png)
- Mobile Calendar View (`390×844`): [task-view-audit-calendar-mobile.png](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/task-view-audit-calendar-mobile.png)
- Mobile Timeline View (`390×844`): [task-view-audit-timeline-mobile.png](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/task-view-audit-timeline-mobile.png)
