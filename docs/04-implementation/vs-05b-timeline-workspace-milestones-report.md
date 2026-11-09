# SONDER — VS-05B DELIVERY REPORT: TIMELINE VIEW & WORKSPACE MILESTONES

**Baseline Branch**: `develop` at `da43dd002ef2c92e92c20fb4ec2e0d37e618f08c`
**Active Working Branch**: `feat/FE-VS05B-timeline-workspace-milestones` (merged into `develop`)
**Target Branch**: `develop`
**Pull Request**: [#23](https://github.com/Samudra-Bose/sonder/pull/23)
**Final Merge Commit**: `bc324ed`
**Status**: MERGED & VERIFIED — Functional Correctness, Contract Integrity, Responsive Views, Accessible Controls & Quality Gates Passed
**Date**: November 9, 2026
**Author**: Antigravity Pair Programming Agent

---

## 1. Executive Summary

VS-05B delivers the second stage of the Calendar, Timeline and Dependency Visualization milestone for Sonder:
1. **Gantt-Style Timeline View (`TIMELINE` projection)**:
   - **Horizontal Time Axis**: Day, Week, and Month zoom resolutions with dynamic group headers (Month/Year banners) and column ticks.
   - **Task Duration Bars**: Positioned using both `startDate` and `dueDate` across the time grid, visually distinguishing between:
     - Multi-day range tasks (`RANGE`): full duration span capsule with subtle border and status styling.
     - Start-only tasks (`START_ONLY`): open-ended forward point with start date indicator.
     - Due-only tasks (`DUE_ONLY`): lead-up deadline bar with due date indicator.
   - **Clipping & Bounds Handling**: Tasks spanning outside the active timeline range have clipped edges cleanly styled (e.g. flat left/right edge) without layout breaking.
   - **"Today" Indicator Line**: Distinct vertical marker spanning the entire timeline grid with a prominent "Today" pill at the top.
   - **Date Navigation & Zoom Controls**: Previous/Next navigation, "Today" shortcut, and Day / Week / Month resolution toggles.
   - **Unscheduled Tasks Tray**: Accessible collapsible tray displaying undated tasks with quick-action deep links to set dates via `TaskPeekDrawer`.
   - **Task Detail Drawer Deep Linking**: Clicking any task bar or left info cell opens `TaskPeekDrawer` with deep link `?task=KEY`.

2. **Workspace-Level Milestones (DEC-OPEN-08 & OpenAPI 0.3.20-draft)**:
   - **Strict Hierarchy Separation**: Milestones are optional Workspace-level planning markers (belonging directly to a Workspace, never hierarchy containers, folders, or projects).
   - **Contract Compliance**:
     - `GET /communities/{communityId}/workspaces/{workspaceId}/milestones`: Lists workspace milestones.
     - `POST /communities/{communityId}/workspaces/{workspaceId}/milestones`: Creates a milestone (requires `X-CSRF-Token` and UUIDv7 `X-Mutation-Id`).
     - `PATCH /communities/{communityId}/workspaces/{workspaceId}/milestones/{milestoneId}`: Updates milestone attributes (`name`, `targetDate`, `description`).
     - `DELETE /communities/{communityId}/workspaces/{workspaceId}/milestones/{milestoneId}`: Deletes unreferenced milestone; server automatically clears `milestoneId` references on linked tasks.
   - **Direct Task Association**: Linked directly to tasks via canonical `task.milestoneId`.
   - **Milestone Marker Visualization**: Vertical dashed markers displayed across the timeline time axis with milestone diamond badge, target date, name, description, and action popover (Edit, Delete, and linked task count).
   - **Workspace Isolation**: Milestone queries, creations, and updates enforce strict Workspace boundary isolation.

3. **4-Way View Synchronization**:
   - Synchronized view switcher in `TaskViewToolbar`: `List`, `Board`, `Calendar`, and `Timeline`.
   - Preserves shared query filter state (search `q`, `priority`, `status`, `sort`, `backlog`).
   - Full URL parameter synchronization: `?view=timeline&mode=(day|week|month)&date=YYYY-MM-DD`.
   - Uniform routing in `App.tsx`: `/timeline`, `/workspaces/:workspaceId/timeline`, `/c/:communityId/w/:workspaceId/timeline`.
   - Navigation links in `AppSidebar.tsx` with Lucide `GanttChart` icon.

4. **Production Build & Environment Isolation**:
   - Zero mock/MSW chunks emitted in production bundles (`import.meta.env.DEV` dead-code elimination).
   - All quality gates pass: `pnpm validate:docs`, `pnpm typegen:check`, `pnpm -r run typecheck`, `pnpm -r run test` (39 test files, 392 tests), `pnpm build`, `git diff --check`.

---

## 2. Source-of-Truth & Contract Alignment

| Requirement / Invariant | Authoritative Specification | Implementation Reference |
| :--- | :--- | :--- |
| **Active OpenAPI Contract** | `Community-Work-Management-v1.5/docs/contracts/openapi.yaml` | Version `0.3.20-draft` |
| **Milestone Policy (DEC-OPEN-08)** | Decision Register & Master Spec §2.1 | Milestones belong directly to a Workspace; never hierarchy containers or task folders. Excluded from task totals and snapshots. |
| **Milestones Endpoints** | OpenAPI `paths` | `/communities/{communityId}/workspaces/{workspaceId}/milestones` (GET, POST, PATCH, DELETE) |
| **Timeline Query Projection** | OpenAPI `TaskViewQueryRequest` | `projection: "TIMELINE"` |
| **Date Window Specification** | OpenAPI `QueryDateWindow` | `dateField: "START_TO_DUE_SPAN"`, `from: YYYY-MM-DD`, `to: YYYY-MM-DD`, `includeUnscheduled: boolean` |
| **Timeline Query Result** | OpenAPI `TaskQueryResult` | Returns dated `items: TaskDto[]`, `unscheduledPreview: TaskDto[]`, `unscheduledCount`, `unscheduledNextCursor`, `dependencyEdges: []` |
| **Mutating Request Invariants** | OpenAPI & Contract Invariants | Required `X-CSRF-Token` and UUIDv7 `X-Mutation-Id` headers on POST, PATCH, DELETE |
| **Milestone Deletion Cleanup** | OpenAPI `deleteMilestone` description | Server clears `milestoneId` on all linked tasks when a milestone is deleted |
| **Dual-Indicator Status / Priority** | Sonder Design System Tokens | Status and priority badges use color badge + text + icon; never color alone |
| **Accessible Roles & Controls** | WCAG 2.2 Level AA & WAI-ARIA | Accessible buttons, popovers, dialogs, `role="radiogroup"`, `aria-label`, 44x44px touch targets |
| **Routing Support** | Blueprint §3.1 & Routing Hierarchy | `/timeline`, `/workspaces/:workspaceId/timeline`, `/c/:communityId/w/:workspaceId/timeline` |
| **Production Isolation** | Architectural Invariants | Zero MSW code in production bundle via `import.meta.env.DEV` check |

---

## 3. Architecture & Modular Implementation

### 3.1 Milestones Data Layer (`apps/web/src/modules/milestones/`)

- **`types.ts`**: Re-exports canonical contract DTOs (`MilestoneDto`, `MilestoneListDto`, `CreateMilestoneRequest`, `UpdateMilestoneRequest`, `Uuid`).
- **`api.ts`**: Type-safe HTTP client functions (`fetchMilestones`, `createMilestoneApi`, `updateMilestoneApi`, `deleteMilestoneApi`) using canonical `apiRequest` with automatic CSRF token hydration and UUIDv7 mutation ID generation.
- **`useMilestones.ts`**:
  - `useMilestones(communityId, workspaceId)`: TanStack Query hook caching workspace milestones (`["milestones", communityId, workspaceId]`).
  - `useCreateMilestone()`: Mutation hook that invalidates milestone list.
  - `useUpdateMilestone()`: Mutation hook that invalidates milestone list and task caches.
  - `useDeleteMilestone()`: Mutation hook that invalidates milestone list and task caches (reflecting cleared `milestoneId` on tasks).
- **`index.ts`**: Module exports.

### 3.2 Timeline Date Utilities (`apps/web/src/modules/tasks/views/timeline/timeline-date-utils.ts`)

- **Pure UTC Calculations**: Strictly UTC-based date mathematics avoiding daylight saving or timezone shifts.
- **`diffInCalendarDays(dateA, dateB)`**: Returns exact difference in calendar days.
- **`getTimelineRange(anchorDate, mode, todayStr)`**:
  - `day` mode: 21 days (3 weeks) centered around anchor date with daily columns and month group headers.
  - `week` mode: 10 weeks (70 days) starting from Monday with weekly columns and month group headers.
  - `month` mode: 6 months starting on 1st of starting month with monthly columns and year group headers.
- **`calculateTaskTimelinePosition(task, rangeStart, rangeEnd, totalDays)`**: Computes `leftPercent` and `widthPercent`, detects clipping (`isStartClipped`, `isEndClipped`), enforces minimum clickable bar width (1.8%), and formats dates for tooltip and display.
- **`calculateMilestoneTimelinePosition(targetDate, rangeStart, totalDays)`**: Computes center percentage on the time axis and visibility status.
- **`navigateTimelineDate(anchorDate, mode, direction)`**: Jump by 7 days (day mode), 28 days (week mode), or 3 months (month mode).

### 3.3 Timeline View Components (`apps/web/src/modules/tasks/views/timeline/`)

- **`TimelineHeader.tsx`**: Resolution mode toggle (`day`, `week`, `month`), prev/next/today navigation buttons, range title, "+ New Milestone" button, and unscheduled tasks toggle badge.
- **`TimelineTimeAxis.tsx`**: Group header scale (Months / Years), column ticks scale (Day numbers / Weekdays / Months), and background `TimelineGridLines` with vertical "Today" indicator line.
- **`TimelineMilestoneMarker.tsx`**: Vertical dashed accent line through the timeline canvas with milestone badge button, popover detailing target date, description, linked tasks count, and Edit / Delete actions.
- **`TimelineTaskRow.tsx`**: Split row layout with frozen left pane (task key, title, status/priority badges, milestone tag) and right timeline canvas task bar styled according to status category (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `CANCELED`).
- **`TimelineMilestoneModal.tsx`**: Accessible dialog for creating and editing workspace milestones (`name`, `targetDate`, `description`) with validation and loading states.
- **`TimelineUnscheduledTray.tsx`**: Collapsible tray presenting undated tasks with quick actions to open drawer and assign dates.
- **`TimelineView.tsx`**: Top-level orchestrator integrating tasks, milestones, resolution zoom, loading skeletons, error states, and empty states.

### 3.4 Views Controller & Routing Integration

- **`TaskViewToolbar.tsx`**: Added `tab-view-timeline` to view switcher segmented control with `GanttChart` icon.
- **`WorkspaceTasksView.tsx`**: Added 4-way view support (`list`, `board`, `calendar`, `timeline`), dynamic `dateWindow` calculation with `START_TO_DUE_SPAN` for timeline, wired `useMilestones`, and preserved query parameters.
- **`useWorkspaceTasks.ts`**: Bounded query execution for `TIMELINE` projection preventing unwanted cursor continuation loops.
- **`App.tsx`**: Configured `/timeline`, `/workspaces/:workspaceId/timeline`, `/c/:communityId/w/:workspaceId/timeline`.
- **`AppSidebar.tsx`**: Added Timeline navigation link with `GanttChart` icon under Views.

### 3.5 MSW Mock Data & Handlers

- **`apps/web/src/mocks/data/milestones.ts`**: Seed milestones for `WS_SHARED_ENG_ID` ("Beta Architecture Freeze", "Public Beta Release", "GA Stability Hardening") and `WS_SHARED_GALA_ID` ("Venue & Vendor Sign-off", "Ticket Sales Launch", "Gala Night 2026").
- **`apps/web/src/mocks/handlers/milestones.ts`**: Contract-faithful handlers for GET, POST, PATCH, DELETE `/communities/:communityId/workspaces/:workspaceId/milestones` with CSRF and mutation ID validation.
- **`apps/web/src/mocks/handlers/tasks.ts`**: Extended task query handler to support `projection: "TIMELINE"` with `START_TO_DUE_SPAN` date filtering and added `clearMilestoneFromTasks` helper for milestone deletion.

---

## 4. Verification & Quality Gates

### 4.1 Automated Test Suite Results

```text
✓ pnpm validate:docs
  - 51 of 51 checks passed (OpenAPI 0.3.20-draft, DEC-OPEN-08 milestones invariant, etc.)

✓ pnpm typegen:check
  - OpenAPI and WebSocket schemas synchronized with generated TypeScript types.

✓ pnpm -r run typecheck
  - 0 errors across all workspace projects (web, contracts).

✓ pnpm -r run test
  - Test Files: 39 passed (39)
  - Tests: 392 passed (392)
  - Duration: ~20s
```

### 4.2 Dedicated Unit & Integration Tests

1. **`timeline-date-utils.test.ts` (18 tests)**:
   - Date difference math across leap years and month boundaries.
   - Monday alignment for week resolution.
   - Range generation for Day (21 days), Week (10 weeks), and Month (6 months).
   - Task position calculations: duration ranges, start-only, due-only, and undated tasks.
   - Clipping detection for tasks spanning beyond the active timeline window.
   - Milestone marker position calculation and out-of-range detection.
   - Navigation date jumps (prev/next across modes).

2. **`milestones.test.tsx` (5 tests)**:
   - Workspace isolation: milestones for workspace A are never returned in workspace B.
   - Milestone creation with CSRF validation and cache invalidation.
   - Milestone updating.
   - Milestone deletion and automatic clearing of `task.milestoneId` references on linked tasks.
   - Fail-closed security when CSRF token is missing.

3. **`TimelineView.test.tsx` (7 tests)**:
   - Full timeline rendering: header, controls, columns, task rows, milestone markers.
   - Task bar and info click triggers `onTaskClick`.
   - Unscheduled tasks tray toggle and task click.
   - 4-way view switcher in toolbar switching between List, Board, Calendar, and Timeline.
   - Direct navigation to `/timeline` route.
   - TaskPeekDrawer opening with deep link `?task=KEY`.
   - Milestone create/edit modal form and cancel handling.

### 4.3 Playwright Browser QA & Visual Artifacts

Browser validation was conducted on the running Vite development server (`http://localhost:5173`) across desktop and mobile viewports:

| Viewport | Test Workflow | Result |
| :--- | :--- | :--- |
| **Desktop (1280x800)** | Navigate to `/c/.../timeline?date=2026-11-09&mode=day`. Verify time axis columns, Today vertical indicator, milestone markers ("Beta Architecture Freeze", "Public Beta Release"), and task duration bars (`ENG-101`, `ENG-105`, `ENG-102`, `ENG-099`, `ENG-050`). Click task row to verify `TaskPeekDrawer` opens with `?task=ENG-102`. | **PASS** |
| **Mobile (390x844)** | Switch viewport to mobile width (390px). Verify responsive header layout, horizontal scrolling timeline canvas, touch-accessible controls, and milestone modal dialog. | **PASS** |

Visual evidence captured:
- Desktop: `timeline-dev-desktop.png`
- Mobile: `timeline-dev-mobile.png`

### 4.4 Production Build & Mock Isolation

```text
✓ pnpm build
  - 3,105 modules transformed.
  - Output files:
    dist/index.html                         0.74 kB │ gzip:   0.39 kB
    dist/assets/index-Bkn9Ja6F.css         67.27 kB │ gzip:  11.68 kB
    dist/assets/vendor-icons-B5KLIBya.js   30.37 kB │ gzip:   6.49 kB
    dist/assets/vendor-query-3XeVJ74H.js   40.68 kB │ gzip:  12.08 kB
    dist/assets/index-DTPBtMjv.js         293.30 kB │ gzip:  68.00 kB
    dist/assets/vendor-react-DwWd5cv7.js  443.33 kB │ gzip: 142.34 kB
  - Exactly 0 MSW mock chunks emitted in production.
```

---

## 5. Summary of Files Changed

```text
A  apps/web/src/mocks/data/milestones.ts
M  apps/web/src/mocks/data/tasks.ts
M  apps/web/src/mocks/handlers/index.ts
A  apps/web/src/mocks/handlers/milestones.ts
M  apps/web/src/mocks/handlers/tasks.ts
M  apps/web/src/modules/app-shell/AppSidebar.tsx
A  apps/web/src/modules/milestones/api.ts
A  apps/web/src/modules/milestones/index.ts
A  apps/web/src/modules/milestones/milestones.test.tsx
A  apps/web/src/modules/milestones/types.ts
A  apps/web/src/modules/milestones/useMilestones.ts
M  apps/web/src/modules/tasks/useWorkspaceTasks.ts
M  apps/web/src/modules/tasks/views/TaskViewToolbar.tsx
M  apps/web/src/modules/tasks/views/WorkspaceTasksView.tsx
A  apps/web/src/modules/tasks/views/timeline/TimelineHeader.tsx
A  apps/web/src/modules/tasks/views/timeline/TimelineMilestoneMarker.tsx
A  apps/web/src/modules/tasks/views/timeline/TimelineMilestoneModal.tsx
A  apps/web/src/modules/tasks/views/timeline/TimelineTaskRow.tsx
A  apps/web/src/modules/tasks/views/timeline/TimelineTimeAxis.tsx
A  apps/web/src/modules/tasks/views/timeline/TimelineUnscheduledTray.tsx
A  apps/web/src/modules/tasks/views/timeline/TimelineView.test.tsx
A  apps/web/src/modules/tasks/views/timeline/TimelineView.tsx
A  apps/web/src/modules/tasks/views/timeline/index.ts
A  apps/web/src/modules/tasks/views/timeline/timeline-date-utils.test.ts
A  apps/web/src/modules/tasks/views/timeline/timeline-date-utils.ts
M  apps/web/src/App.tsx
A  docs/04-implementation/vs-05b-timeline-workspace-milestones-report.md
```

---

## 6. Next Steps & Scope Discipline

- **Strict Scope Boundaries Maintained**:
  - NO dependency conflict visualizer or critical path graph (strictly deferred to VS-05C).
  - NO saved view presets.
  - NO project/container hierarchy models (adheres strictly to `Community → Workspace → Task → Subtask`).
  - NO unapproved contract changes or backend service modifications.
- Merge `feat/FE-VS05B-timeline-workspace-milestones` into `develop` via squash merge.
- Stand by for VS-05C: Dependency Edge Management & Conflict Visualization.
