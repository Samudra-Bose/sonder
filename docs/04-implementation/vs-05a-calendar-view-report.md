# SONDER — VS-05A DELIVERY REPORT: CALENDAR VIEW & UNSCHEDULED TASK TRAY

**Baseline Branch**: `develop` at `ae29bb084ee0bb81faae2b667a149ca717904033`
**Active Working Branch**: `feat/FE-VS05A-calendar-view`
**Target Branch**: `develop`
**Status**: COMPLETE — Functional Correctness, Contract Integrity, Responsive Views, Accessible Controls & Quality Gates Passed
**Date**: November 9, 2026
**Author**: Antigravity Pair Programming Agent

---

## 1. Executive Summary

VS-05A delivers the first stage of the Calendar, Timeline and Dependency Visualization milestone for Sonder:
1. **Modular Calendar View (`CALENDAR` projection)**:
   - **Month View**: Traditional 7-column calendar grid starting on Sunday, correctly mapping tasks to their `dueDate`, displaying visual "Today" indicators, rendering multiple task entries per cell, and revealing additional items via an accessible "+N more" popover dialog overlay.
   - **Week View**: A 7-day chronological column representation distributing tasks across Overdue, Scheduled, and Completed categories with a scrollable container.
   - **Unscheduled Task Tray**: A collapsible bottom drawer partitioning tasks with missing or empty `dueDate` records (`unscheduledPreview`, `unscheduledCount`), complete with task keys, titles, priority/status badges, and a clean empty state.
2. **Synchronization & Deep Linking**:
   - Operating on the canonical workspace task model with shared query, search, and filter state.
   - Synchronized view switching between List, Board, and Calendar views via `TaskViewToolbar`.
   - Full URL search parameter synchronization: `?view=calendar&mode=(month|week)&date=YYYY-MM-DD`.
   - Direct integration with `TaskPeekDrawer` when clicking any calendar chip or unscheduled task, updating URL deep-link state (`?task=<id>`).
3. **Deterministic Date Arithmetic & Pure UTC Correctness**:
   - Pure UTC date mathematics avoiding arbitrary timezone shifts or off-by-one errors.
   - Bounded leap-year calculation and month-boundary calculations handled via `calendar-date-utils.ts`.
4. **Contract-Faithful MSW Mock Layer**:
   - Extended `POST /api/v1/communities/:communityId/workspaces/:workspaceId/tasks/query` to support `projection: "CALENDAR"`.
   - Handles `dateWindow: { dateField: "DUE_DATE", from, to, includeUnscheduled: true }`, `unscheduledCount`, `unscheduledPreview`, `unscheduledNextCursor`, and continuation pages with `pageScope: "UNSCHEDULED"`.
   - Deterministic calendar seed tasks assigned to Gala workspace (`WS_SHARED_GALA_ID`) ensuring existing test count invariants on Engineering Platform (`WS_SHARED_ENG_ID`) remain strictly intact.

---

## 2. Source-of-Truth & Contract Alignment

| Requirement / Invariant | Authoritative Specification | Implementation Reference |
| :--- | :--- | :--- |
| **Active OpenAPI Contract** | `Community-Work-Management-v1.5/docs/contracts/openapi.yaml` | Version `0.3.20-draft` |
| **Canonical Hierarchy** | Master Specification §2.1 | `Community → Workspace → Task → Subtask` (Zero Project containers) |
| **Calendar Query Projection** | OpenAPI `TaskViewQueryRequest` | `projection: "CALENDAR"` |
| **Date Window Specification** | OpenAPI `QueryDateWindow` | `dateField: "DUE_DATE"` \| `"START_TO_DUE_SPAN"`, `from: YYYY-MM-DD`, `to: YYYY-MM-DD`, `includeUnscheduled: boolean` |
| **Calendar Query Result** | OpenAPI `TaskQueryResult` | Returns dated `items: TaskDto[]`, `unscheduledPreview: TaskDto[]`, `unscheduledCount`, `unscheduledNextCursor` |
| **Unscheduled Pagination** | OpenAPI `TaskQueryResult` | `pageScope: "UNSCHEDULED"` continuation cursor traversal |
| **Dual-Indicator Status / Priority** | Sonder Design System Tokens | Status and priority badges use color badge + text + icon; never color alone |
| **Accessible Grid & Dialogs** | WCAG 2.2 Level AA & WAI-ARIA | `role="grid"`, `role="gridcell"`, `role="dialog"`, accessible labels on navigation and expand buttons |
| **Routing Support** | Blueprint §3.1 & Routing Hierarchy | `/calendar`, `/workspaces/:workspaceId/calendar`, `/c/:communityId/w/:workspaceId/calendar` |
| **Boundary Discipline** | Architectural Invariants | Production code (`apps/web/src/modules/tasks/`) imports zero mock fixtures |

---

## 3. Implemented Architecture & Modular Components

### 3.1 Date Utilities (`apps/web/src/modules/tasks/views/calendar/calendar-date-utils.ts`)

- **Pure UTC Calculations**: Avoids local timezone leakage using `Date.UTC()` for all day, month, and year boundary arithmetic.
- **`parseDateParts(dateStr)`**: Validates and splits `YYYY-MM-DD` strings.
- **`formatDateParts(year, month, day)`**: Generates zero-padded ISO date strings.
- **`daysInMonth(year, month)`**: Accurately computes day counts including leap years (February 29 in leap years, 28 otherwise).
- **`getMonthCalendarGrid(year, month, todayStr)`**: Builds a 35- or 42-cell matrix (Sunday start) including leading and trailing padding days from adjacent months.
- **`getWeekDays(centerDateStr, todayStr)`**: Computes the 7-day window containing `centerDateStr` (Sunday to Saturday).
- **Navigation Shortcuts**: `getPreviousMonthDate`, `getNextMonthDate`, `getPreviousWeekDate`, `getNextWeekDate`.

### 3.2 Modular Calendar View (`apps/web/src/modules/tasks/views/calendar/`)

1. **`CalendarTaskItem.tsx`**:
   - Compact task chip with dual indicators: colored dot indicator, task key, truncated title, and status/priority badge.
   - Terminal status styling (strike-through and muted tone for `DONE` and `CANCELED`).
   - Overdue badge indicator for past-due unfinished tasks.
   - Keyboard accessible (`Enter`/`Space`) triggering Task Peek Drawer.

2. **`CalendarDayCell.tsx`**:
   - `role="gridcell"` with comprehensive accessible labels (`aria-label="YYYY-MM-DD, N tasks"`).
   - Prominent date number header with "Today" pill highlight.
   - Task list displaying up to 2 items directly in month view.
   - Interactive "+N more" button with popover dialog (`role="dialog"`) rendering the complete day roster.

3. **`MonthCalendar.tsx`**:
   - 7-column CSS grid with weekday headers (`Sun` through `Sat`).
   - Maps tasks by `dueDate` into corresponding day cells in `O(N)` time.
   - Out-of-month padding cells displayed with subdued styling.

4. **`WeekCalendar.tsx`**:
   - 7-column responsive week view (`role="region"`).
   - Columns categorized into Overdue, Scheduled, and Completed task sections.
   - Column-level task counts and empty state indicators ("No tasks").

5. **`UnscheduledTaskTray.tsx`**:
   - Collapsible bottom drawer (`aria-expanded`) displaying tasks without `dueDate`.
   - Badge counter showing total unscheduled tasks.
   - Displays task key, title, status badge, and priority badge.
   - Clean empty state when all workspace tasks are scheduled.

6. **`CalendarHeader.tsx`**:
   - Dynamic month/week title heading (e.g. `November 2026`, `Nov 8 – 14, 2026`).
   - "Today" shortcut button.
   - "Previous" and "Next" navigation buttons updating the active date.
   - View mode switcher tab list (`Month` / `Week`).

7. **`CalendarView.tsx`**:
   - Primary calendar orchestrator.
   - Accessible loading skeleton (`calendar-loading-skeleton`).
   - Error feedback state (`Feedback` danger variant) with retry action.

### 3.3 Workspace Tasks View Controller (`WorkspaceTasksView.tsx`)

- Expanded `activeView` resolution to support `"calendar"`.
- Synchronized `mode` (`month` | `week`) and `date` (`YYYY-MM-DD`) URL search parameters.
- Calculated `dateWindow` range (`from` to `to`) passed into canonical `querySpec`.
- Wired task click handlers to `openTask(taskId)` for seamless drawer deep linking.

### 3.4 Routing & AppShell Integration

- **`App.tsx`**: Registered `/calendar`, `/workspaces/:workspaceId/calendar`, and `/c/:communityId/w/:workspaceId/calendar`.
- **`AppSidebar.tsx`**: Added Calendar link with `Calendar` icon to sidebar navigation rail.
- **`TaskViewToolbar.tsx`**: Added Calendar segmented tab (`tab-view-calendar`).

---

## 4. Resilience & Concurrency Hardening (VS-05A & VS-05A.1)

During browser verification and corrective QA hardening (VS-05A.1), several runtime edge cases and production isolation requirements were resolved:

1. **`WorkspaceContext.tsx` Safe Community Access**:
   - *Problem*: Before `useAuth()` completes session hydration, `communities` can be undefined, causing early `communities.length` or `communities.some` checks to throw a `TypeError`.
   - *Fix*: Introduced memoized `safeCommunities = rawCommunities ?? []` and guarded all community checks with optional chaining in `WorkspaceContext.tsx`, `WorkspaceSwitcher.tsx`, and `MobileWorkspaceSelector.tsx`.
   - *Regression Tests*: Added dedicated test cases in `WorkspaceSwitcher.test.tsx` verifying safe rendering when `communities` is initially undefined or loading.

2. **`useWorkspaceTasks.ts` CSRF-Token Synchronization**:
   - *Problem*: `POST /tasks/query` is a POST request enforcing CSRF token presence. Cold starts triggered before `fetchCsrfToken` resolved resulted in a transient client `ApiProblemError`.
   - *Fix*: Enforced `isQueryEnabled = Boolean(communityId && workspaceId && csrfToken && enabled)`, ensuring queries wait for CSRF hydration before firing.
   - *Regression Tests*: Added dedicated test cases in `tasks.test.tsx` verifying `useWorkspaceTasks` remains disabled while `csrfToken` is null and fires immediately upon token arrival.

3. **Production / MSW Environment Separation (`main.tsx`)**:
   - *Problem*: A temporary localhost hostname exception in `main.tsx` allowed MSW to start in production preview, bundling a 353 kB `browser-*.js` chunk into `dist/assets/`.
   - *Fix*: Removed the hostname-based exception in favor of Vite's canonical `import.meta.env.DEV` flag:
     ```ts
     async function enableMocking(): Promise<void> {
       if (import.meta.env.DEV) {
         const { worker } = await import("./mocks/browser.js");
         await worker.start({
           onUnhandledRequest: "bypass",
         });
       }
     }
     ```
   - *Isolation Evidence*: In production build (`pnpm build`), dead code elimination removes the dynamic import entirely. Module count drops from 3,334 to 3,092, the 353 kB `browser-*.js` chunk is completely eliminated, and grep confirms zero MSW references in production assets.

4. **Deep-Linking Key Resolution in `WorkspaceTasksView.tsx`**:
   - *Problem*: `WorkspaceTasksView.tsx` previously passed `task.id` (UUID) to `openTask(task.id)` instead of `task.taskKey` (e.g. `GALA-201`), causing `GET /tasks/by-key/:key` to return a 404 error.
   - *Fix*: Updated `onTaskClick` in `WorkspaceTasksView.tsx` to pass `task.taskKey` with `{ workspaceId: effectiveWorkspaceId ?? undefined }`, achieving parity with `TaskListView` and `TaskBoardView`.

---

## 5. Verification & Quality Gates

### 5.1 Unit, Integration & Boundary Test Suite

- **Date Utilities Test Suite** (`calendar-date-utils.test.ts`):
  - 14 tests verifying UTC parsing, leap years (2024, 2028), standard February (2025, 2026), 30/31-day months, grid generation, week generation, and navigation offsets.
- **Calendar View Test Suite** (`CalendarView.test.tsx`):
  - 9 tests verifying month grid rendering, week view columns, overdue task indicators, "+N more" popover dialog, unscheduled task tray toggle, task click drawer deep linking, loading skeletons, and zero production-to-mock import boundary invariants.
- **Workspace Switcher & Auth Resilience** (`WorkspaceSwitcher.test.tsx`):
  - 14 tests, including defensive tests for initially undefined community collections in desktop and mobile selectors.
- **Task Query & CSRF Invariants** (`tasks.test.tsx`):
  - 20 tests, including explicit assertions that `useWorkspaceTasks` waits for CSRF token hydration.
- **Monorepo Test Suite**:
  - **36 test files, 362 tests, 100% passing**.

### 5.2 Static Code & Schema Quality Gates

- `pnpm validate:docs`: **51/51 checks PASSED** (0 failures).
- `pnpm typegen:check`: **PASSED** (generated TypeScript types match canonical OpenAPI `0.3.20-draft` schemas).
- `pnpm -r run typecheck`: **PASSED** (0 errors across all workspace packages).
- `pnpm build`: **PASSED** (production Vite bundle built cleanly in 3.2s, 0 mock chunks emitted).
- `git diff --check`: **PASSED** (0 whitespace errors).

### 5.3 Real Browser Automation & Accessibility QA (Playwright on Vite Dev Server)

Full end-to-end browser verification conducted against the live Vite development server (`http://localhost:5173`):
- **Desktop Journey (`1280x800`)**:
  1. Calendar route loads cleanly without runtime errors or uncaught exceptions.
  2. Month view displays 7-column grid with 9 total tasks matching November 2026.
  3. Visual "Today" highlight is prominently displayed on current UTC date `2026-11-09`.
  4. "Next month", "Previous month", and "Today" navigation buttons correctly transition date range and synchronize URL search parameters (`?date=YYYY-MM-DD`).
  5. Multi-task cell reveals "+1 more" interactive button; clicking opens popover dialog displaying all 3 tasks (`GALA-202`, `GALA-203`, `GALA-204`).
  6. Clicking a task (`GALA-201` / `GALA-204`) opens `TaskPeekDrawer` with deep link `?task=GALA-201`, fetching task details and field editors with HTTP 200 responses.
  7. Collapsible Unscheduled Tasks Tray displays `GALA-207` and `GALA-208` with status/priority badges; collapse/expand button functions smoothly.
  8. View switcher tabs (`List`, `Board`, `Calendar`) preserve active query state, snapshot sequence, and URL pathing.
  9. Console output contains zero uncaught application errors and zero unhandled mock requests.
  - Full-page desktop screenshot captured: `calendar-dev-desktop.png`.
- **Mobile Responsive Journey (`390x844`)**:
  1. Month grid adapts smoothly to narrow mobile viewport.
  2. Week view renders responsive chronological columns with stage counts and empty state indicators.
  - Full-page mobile screenshots captured: `calendar-dev-mobile-month.png`, `calendar-dev-mobile-week.png`.

---

## 6. Scope Discipline & Roadmap Deferred Items

To maintain strict phased discipline:
- **Saved Views**: Recorded as future scope for dedicated view customization milestones. Not included in VS-05A.
- **Timeline View**: Explicitly deferred to subsequent milestone VS-05B.
- **Dependency Visualization**: Explicitly deferred to milestone VS-05C.

---

## 7. Delivery Status

| Stage | Milestone | Branch | Status |
| :--- | :--- | :--- | :--- |
| **VS-05A** | Calendar View & Unscheduled Tray | `feat/FE-VS05A-calendar-view` (merged via PR #21 commit `303426e79b9a674d81f2150a24f0c4068532c589`) | **COMPLETE** |
| **VS-05A.1** | Runtime & QA Hardening | `fix/FE-VS05A-runtime-qa-hardening` | **COMPLETE** |
