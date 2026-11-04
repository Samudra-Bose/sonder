# SONDER — VS-03 Stage 2 Delivery Report: Task Peek Drawer & Deep Linking

## Executive Summary

Stage 2 of **VS-03: Canonical Task Model, Quick Composer & Task Peek Drawer** has been implemented, thoroughly tested, and verified against canonical product and API specifications (`Community-Work-Management-v1.5/docs/contracts/openapi.yaml`, Master PRD, and Canonical Frontend Blueprint).

This stage delivers the responsive, deep-linked, read-only task details experience:
1. **Responsive Task Peek Drawer Component (`TaskPeekDrawer`)**:
   - **Desktop Layout**: Right-docked non-modal panel (`w-[480px] lg:w-[540px]`) docked alongside the main canvas without disrupting current route state or blocking background interactions.
   - **Mobile Layout**: Responsive full-height bottom-sheet modal using `@base-ui/react` primitives with drag handle, dimmed backdrop, focus trap, and touch targets conforming to the 44×44px minimum touch target standard.
2. **Deep-Linking & URL Synchronisation (`useTaskPeekDrawer`)**:
   - Uses canonical `?task=KEY-123` query parameter.
   - Seamlessly preserves unrelated query parameters (e.g. `?filter=assigned&sort=due&task=ENG-101` cleanses back to `?filter=assigned&sort=due` upon closure).
   - Resolves workspace context deterministically from task key prefix (`ENG` -> Engineering Platform, `ALEX` -> Personal Workspace, etc.) or in-session cache, seamlessly bridging direct deep links without requiring explicit workspace query parameters.
3. **Contract-Faithful Read-Only Task Presentation**:
   - Renders task key, workspace badge, lock indicator for Personal Workspaces, title, description, status badge, priority badge, assignees with avatars, due date (`formatDueDisplay`), start date, estimate points, labels, and provenance audit footer (version and updated date).
   - Displays clear metadata banners: historical alias redirection banner (`resolvedFromAlias`) and archived state notice banner (`lifecycleState === "ARCHIVED"`).
   - Loading skeleton state with `aria-busy="true"` and screen-reader announcements.
   - Copy task link button with visual clipboard confirmation.
4. **Security, Privacy & Indistinguishable 404s**:
   - Implements strict privacy boundary per DEC-OPEN-02: when a task key is non-existent, deleted, or caller lacks workspace access, an indistinguishable `Task Not Found` 404 state is presented with zero disclosure of workspace names, IDs, or metadata.
5. **Accessibility & Keyboard Management**:
   - Desktop and mobile keyboard dismissal via `Escape`.
   - Focus entry into modal on mobile; focus restoration to initiating trigger button/card upon closing.
   - Dual-indicator status badges (icon + text) with color contrast meeting WCAG AA requirements.
   - Canonical status spelling strictly standardized on `CANCELED` (one L), with backward-compatible normalization for legacy data boundaries.
6. **Integration**:
   - Mounted globally within [`AppShell.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/app-shell/AppShell.tsx) across all authenticated routes.
   - Integrated into [`TaskRow.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/my-work/TaskRow.tsx) with mouse click and keyboard `Enter`/`Space` activation, with event propagation stopped on nested controls.
7. **Verification & Quality Gates**:
   - 230 tests passing across 29 test suites (19 new tests in `TaskPeekDrawer.test.tsx`).
   - 0 TypeScript errors (`tsc --noEmit`).
   - `typegen:check` passing with 0 diffs.
   - `validate:docs` passing 51/51 checks.
   - Clean Vite production build.

---

## 1. Authoritative Contract & Requirements Citations

| Domain / Area | Canonical Contract Path | Schema / Route / Rule |
| :--- | :--- | :--- |
| **Active OpenAPI Source** | `Community-Work-Management-v1.5/docs/contracts/openapi.yaml` | `openapi: 3.1.0`, `version: 0.3.20-draft` |
| **Get Task by ID** | `GET /communities/{communityId}/workspaces/{workspaceId}/tasks/{taskId}` | `TaskDto` (`title`, `description`, `statusCategory`, `priority`, `estimatePoints`, `assigneeAssignments`, `labels`, `dueDate`, `startDate`, `version`) |
| **Resolve Task Key** | `GET /communities/{communityId}/workspaces/{workspaceId}/tasks/by-key/{taskKey}` | `TaskKeyResolutionDto` (`taskId`, `workspaceId`, `requestedKey`, `currentKey`, `resolvedFromAlias`, `lifecycleState`, `archivedAt`) |
| **Deep Link Contract** | Master PRD §3.1 & Blueprint §4.1 | Canonical URL parameter `?task=KEY-123`; must preserve unrelated query parameters |
| **Indistinguishable 404s** | PRD §2.4 & DEC-OPEN-02 | Unknown or unauthorized keys return indistinguishable 404 Problem Details; reveal zero private workspace metadata |
| **Status Taxonomy** | Master PRD §4.1 & OpenAPI `TaskStatusCategory` | Allowed values: `BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `CANCELED` (one L) |
| **Responsive Presentation** | Blueprint §4.2 Drawer Specifications | Desktop: right-docked panel (`w-[480px] lg:w-[540px]`); Mobile: bottom-sheet modal (`@base-ui/react`) with backdrop & drag handle |
| **Touch Target Standard** | Design Tokens & WCAG 2.5.5 | Minimum touch target 44×44px on mobile surfaces |

---

## 2. Component Architecture & Implementation

### 2.1 Deep-Linking & Routing Hook ([`useTaskPeekDrawer.ts`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/useTaskPeekDrawer.ts))
- **URL Parameter Binding**: Reads and writes `?task=KEY-123` via React Router's `useSearchParams`.
- **Query Parameter Preservation**:
  ```ts
  const openTask = (key: string, options?: { workspaceId?: string }) => {
    const next = new URLSearchParams(searchParams);
    next.set("task", key);
    setSearchParams(next, { replace: false });
  };

  const closeTask = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("task");
    setSearchParams(next, { replace: false });
  };
  ```
- **Workspace Resolution**:
  1. Checks in-session cache (`taskWorkspaceMap.get(taskKey)`).
  2. Parses prefix (e.g. `ENG-101` -> `ENG`) and matches against available community workspaces from `WorkspaceContext` (`workspaces.find(w => w.keyPrefix.toUpperCase() === prefix)`).
  3. Falls back to `activeWorkspaceId`.

### 2.2 Task Peek Drawer Presentation ([`TaskPeekDrawer.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskPeekDrawer.tsx))
- **Dual Presentation Modes**:
  - **Desktop (`forceMode="desktop"` or `window.innerWidth >= 768`)**:
    - `<aside className="w-[480px] lg:w-[540px] flex-shrink-0 border-l border-[var(--border-subtle)] bg-[var(--surface-canvas)] flex flex-col h-full z-20">`.
    - Non-modal; users can read or interact with the main canvas alongside the drawer.
  - **Mobile (`forceMode="mobile"` or `window.innerWidth < 768`)**:
    - Uses Base UI Dialog primitive (`Dialog.Root`, `Dialog.Backdrop`, `Dialog.Popup`).
    - Full-height bottom-sheet styling with rounded top borders, swipe handle indicator, focus trap, and darkened backdrop overlay.
- **Data Resolution Pipeline**:
  - `useResolveTaskKey({ communityId, workspaceId, taskKey })` determines canonical `taskId` and lineage.
  - `useTask({ communityId, workspaceId, taskId })` loads full entity attributes.
- **Detail Sections**:
  - **Header**: Workspace badge, lock icon for Personal Workspaces, monospace task key, copy link button with feedback tooltip, and close button. Header strictly suppresses workspace info when `isNotFound` or `error` is true.
  - **Redirection Notice Banner**: Highlighted amber banner displayed when `resolution.resolvedFromAlias === true`, explaining that the requested key was moved to canonical `currentKey`.
  - **Archived Notice Banner**: Neutral banner displayed when `resolution.lifecycleState === "ARCHIVED"` or `task.archivedAt` is populated.
  - **Task Attributes Grid**: Status badge, priority badge, due date with temporal urgency formatting (`formatDueDisplay`), start date, estimate points badge, and labels list.
  - **Description**: Formatted text display with fallback placeholder.
  - **Assignees**: Avatar stack and list with display names and email titles.
  - **Provenance Footer**: Monospace task ID, schema version, and last updated timestamp.
  - **Loading Skeleton**: `aria-busy="true"` container with pulsing placeholders and screen-reader status text.
  - **404 Boundary**: Accessible `Task Not Found` card with close action.
  - **Error Boundary**: Red alert banner with Problem Details error text and a retry button that triggers query refetches.
- **Clipboard Integration**:
  - Copies canonical URL (`${window.location.origin}${window.location.pathname}?task=${taskKey}`) to clipboard.
  - Renders visual checkmark icon and tooltip notification (`Link copied!`).

### 2.3 Status Standardization & UI Primitives ([`Badge.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/components/ui/Badge.tsx))
- Updated `TaskStatus` type strictly to `"BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELED"`.
- Removed `CANCELLED` from canonical status config.
- Added boundary normalization function `normalizeTaskStatus` ensuring any legacy `"CANCELLED"` strings resolve to canonical `"CANCELED"`.
- Added `BACKLOG` status styling with `CircleDashed` icon.

### 2.4 App Shell & My Work Integration
- Mounted `<TaskPeekDrawer />` inside [`AppShell.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/app-shell/AppShell.tsx) inside the main desktop container flex row so the drawer docks naturally alongside `MainContent`.
- Updated [`TaskRow.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/my-work/TaskRow.tsx):
  - Invokes `openTask(task.taskKey, { workspaceId: task.workspaceId })` on row click.
  - Added keyboard accessibility: `onKeyDown` with `Enter` and `Space` activation.
  - `e.stopPropagation()` on nested buttons/links prevents accidental drawer toggling when activating secondary controls.

---

## 3. Test Matrix & Verification Results

### 3.1 New Test Suite ([`TaskPeekDrawer.test.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskPeekDrawer.test.tsx))

19 comprehensive integration tests covering all specified requirements:

| Test Name | Coverage / Validation |
| :--- | :--- |
| `renders nothing when no task parameter is present in URL` | Drawer is closed when `?task` is absent |
| `opens drawer automatically upon direct deep link navigation (?task=ENG-101)` | Deep-link hydration directly mounts drawer and fetches task data |
| `updates URL with ?task=ENG-101 when opening a task and preserves unrelated query params` | Preserves query parameters like `?filter=assigned&sort=due` |
| `cleanses only the task parameter when closing the drawer` | Retains other query parameters while removing `task` on close |
| `switches displayed task seamlessly when navigating between tasks` | Switching from `ENG-101` to `ALEX-1` updates URL and content smoothly |
| `renders complete task fields: status, priority, description, dates, estimate, labels, assignees` | Verifies full attribute rendering according to OpenAPI schema |
| `displays canonical CANCELED badge without legacy spelling in presentation` | Confirms single-L `CANCELED` badge and icon rendering |
| `resolves historical alias with redirection metadata and notice banner` | Alias `ENG-OLD-1` displays canonical task and redirection banner |
| `displays archived task banner when task is archived` | Archived task `ENG-088` displays archived notice banner |
| `renders accessible 'Task Not Found' state for non-existent key without disclosing private metadata` | Indistinguishable 404 state with zero private workspace disclosure |
| `resolves personal workspace task using caller's personal workspace context` | Resolves personal workspace task and renders lock icon |
| `displays error alert and retry button upon server error` | Renders Problem Details message and refetches upon retry click |
| `renders right-docked non-modal panel on desktop without blocking main canvas` | Desktop mode renders `<aside>` docked beside `<main>` canvas |
| `renders modal bottom sheet with backdrop on mobile` | Mobile mode renders Base UI Dialog popup, backdrop, and drag handle |
| `closes drawer when Escape key is pressed` | Global `Escape` shortcut dismisses drawer and cleanses URL |
| `restores focus to the triggering element when drawer is closed` | Returns active focus to the button that triggered drawer opening |
| `copies task link to clipboard and renders visual confirmation` | Writes deep-link URL to `navigator.clipboard` and toggles checkmark |
| `opens task peek drawer when clicking a task card in My Work with proper workspace context` | Clicking `TaskRow` opens drawer and preserves My Work filters |
| `opens task peek drawer via keyboard Enter key on focused task card` | Pressing `Enter` on focused card opens drawer |

### 3.2 Monorepo Quality Gates Summary

```text
================================================================================
Monorepo Quality Gate Execution Results
================================================================================
pnpm validate:docs         PASSED  (51/51 checks passed)
pnpm typegen:check         PASSED  (0 diffs on OpenAPI & WebSocket schemas)
pnpm -r run typecheck      PASSED  (0 TypeScript errors across 3 workspaces)
pnpm -r run test           PASSED  (230/230 tests passed across 29 test files)
pnpm build                 PASSED  (Vite production bundle built cleanly in 4.35s)
git diff --check           PASSED  (0 whitespace errors)
================================================================================
```

---

## 4. Stage 3 Readiness

With the Task Peek Drawer successfully delivered and verified:
1. **Drawer Container Ready**: The right-docked panel structure is established to host inline editing controls in Stage 3.
2. **Data Layer Ready**: Stage 1 mutations (`useUpdateTask` with field-level revisions and rollback) are already wired and tested.
3. **Contract Adherence**: Read-only presentation establishes the baseline for actor permission gating (`effectivePermissions.canEditTitleDescription`, `canUpdateStatus`, etc.) that will conditionally render edit controls in Stage 3.
