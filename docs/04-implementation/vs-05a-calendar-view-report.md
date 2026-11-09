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

## 4. Resilience & Concurrency Hardening

During browser verification and live integration, three potential runtime edge cases were identified and hardened:
1. **`WorkspaceContext.tsx` Safe Community Access**:
   - *Problem*: Before `useAuth()` completes session hydration, `communities` can be undefined, causing early `communities.length` or `communities.some` checks to throw a `TypeError`.
   - *Fix*: Introduced memoized `safeCommunities = rawCommunities ?? []` and guarded all community checks with optional chaining.
2. **`useWorkspaceTasks.ts` CSRF-Token Synchronization**:
   - *Problem*: `POST /tasks/query` is a POST request enforcing CSRF token presence. Cold starts triggered before `fetchCsrfToken` resolved resulted in a transient client `ApiProblemError`.
   - *Fix*: Enforced `isQueryEnabled = Boolean(communityId && workspaceId && csrfToken && enabled)`, ensuring queries wait for CSRF hydration before firing.
3. **`main.tsx` Localhost Preview Support**:
   - *Problem*: `process.env.NODE_ENV !== "development"` prevented MSW worker startup during `vite preview`, which is used for headless and standalone frontend verification.
   - *Fix*: Enabled MSW worker when `window.location.hostname` is `localhost` or `127.0.0.1`, guaranteeing deterministic contract mocks during local preview and automated QA.

---

## 5. Verification & Quality Gates

### 5.1 Unit, Integration & Boundary Test Suite

- **Date Utilities Test Suite** (`calendar-date-utils.test.ts`):
  - 14 tests verifying UTC parsing, leap years (2024, 2028), standard February (2025, 2026), 30/31-day months, grid generation, week generation, and navigation offsets.
- **Calendar View Test Suite** (`CalendarView.test.tsx`):
  - 9 tests verifying month grid rendering, week view columns, overdue task indicators, "+N more" popover dialog, unscheduled task tray toggle, task click drawer deep linking, loading skeletons, and zero production-to-mock import boundary invariants.
- **Monorepo Test Suite**:
  - **36 test files, 358 tests, 100% passing**.

### 5.2 Static Code & Schema Quality Gates

- `pnpm validate:docs`: **51/51 checks PASSED** (0 failures).
- `pnpm typegen:check`: **PASSED** (generated TypeScript types match canonical OpenAPI `0.3.20-draft` schemas).
- `pnpm -r run typecheck`: **PASSED** (0 errors across all workspace packages).
- `pnpm build`: **PASSED** (production Vite bundle built cleanly in 3.8s).
- `git diff --check`: **PASSED** (0 whitespace errors).

### 5.3 Browser Automation & Accessibility QA (Playwright)

Full end-to-end browser verification conducted on local preview server:
- **Desktop Journey (`1280x800`)**:
  - Navigated to `/c/:communityId/w/:workspaceId/calendar`.
  - Verified 7-column grid renders with 9 total tasks matching November 2026.
  - Verified visual "Today" highlight on `2026-11-09`.
  - Verified "+N more" expansion overlay opens and lists day tasks.
  - Clicked task chip: verified Task Peek Drawer opens with `?task=<id>`.
  - Verified collapsible Unscheduled Tasks Tray toggle and task items.
  - Full-page desktop screenshot captured: `calendar-desktop.png`.
- **Mobile Responsive Journey (`390x844`)**:
  - Verified calendar responsiveness on mobile iPhone viewport.
  - Tested Month and Week view mode switching.
  - Full-page mobile screenshots captured: `calendar-mobile.png`, `calendar-week-mobile.png`.

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
