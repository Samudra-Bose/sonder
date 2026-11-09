# SONDER — VS-05C DELIVERY REPORT: DEPENDENCY EDGE MANAGEMENT & CONFLICT VISUALIZATION

**Baseline Branch**: `develop` at `302c8ee`
**Active Working Branch**: `feat/FE-VS05C-dependency-edge-management-conflicts` (merged into `develop`)
**Target Branch**: `develop`
**Pull Request**: [#24](https://github.com/Samudra-Bose/sonder/pull/24)
**Final Merge Commit**: `31ed749`
**Status**: MERGED & VERIFIED — Contract Integrity, Privacy Invariant Preserved, Dual Indicators, Responsive Layouts, Comprehensive Vitest & Playwright Browser QA
**Date**: November 9, 2026
**Author**: Antigravity Pair Programming Agent

---

## 1. Executive Summary

VS-05C introduces contract-compliant task dependency management and dependency conflict visualization for the Sonder platform:

1. **Contract-Compliant Task Relationship Model**:
   - **Supported Link Types**: Canonical relationship vocabulary (`"BLOCKS" | "IS_BLOCKED_BY" | "RELATES_TO" | "DUPLICATES"`).
   - **Task Links API Endpoints**:
     - `GET /communities/{communityId}/workspaces/{workspaceId}/tasks/{taskId}/links`: Lists all incoming and outgoing dependency and relation links for a work item (`TaskLinkListDto`).
     - `POST /communities/{communityId}/workspaces/{workspaceId}/tasks/{taskId}/links`: Creates a typed link (`CreateTaskLinkRequest`), requiring valid `X-CSRF-Token` and UUIDv7 `X-Mutation-Id` headers.
     - `DELETE /communities/{communityId}/workspaces/{workspaceId}/tasks/{taskId}/links/{linkId}`: Removes a task link with idempotency and CSRF guard (HTTP 204 No Content).
   - **Acyclic Enforcement & Cycle Detection**:
     - Attempting to introduce a directed cycle among blocking relationships is detected and rejected with HTTP 422 Problem (`code: "DEPENDENCY_CYCLE_DETECTED"`).
     - Self-linking is rejected client- and server-side with HTTP 422 (`code: "SELF_LINK_NOT_ALLOWED"`).
     - Duplicate relationships between the same tasks are prevented with HTTP 409 (`code: "DUPLICATE_LINK"`).

2. **Privacy Invariant (Restricted Task Handling)**:
   - **Strict Data Masking**: When an opposite endpoint of a dependency edge belongs to an inaccessible workspace or task, the API and client represent it as `{ access: "RESTRICTED", label: "Restricted Task" }`.
   - **Zero Leaks**: Inaccessible endpoints **never** disclose internal task UUIDs, task keys, titles, or status categories through HTML attributes, DOM trees, tooltips, ARIA labels, or connectors.
   - Displayed as a neutral, privacy-preserving "Restricted Task" badge with a lock icon.

3. **Timeline Dependency Edge Visualization**:
   - **Interactive SVG Canvas Overlay**: Renders responsive bezier curves between task bars on the Gantt canvas (`TimelineDependencyConnectors.tsx`), positioned with pixel accuracy matching time axis bounds.
   - **Directional Indicators**: Directional arrowheads point from upstream blocker to dependent work items.
   - **Relationship-Specific Styling**:
     - `BLOCKS` / `IS_BLOCKED_BY`: Solid connector line with arrow indicator.
     - `RELATES_TO`: Dashed connector line (`stroke-dasharray: 4 4`) in neutral slate.
     - `DUPLICATES`: Dotted connector line (`stroke-dasharray: 2 3`) in violet accent.
   - **Responsive Scaling**: Adapts smoothly to all zoom resolutions (`day`, `week`, `month`) and horizontal container widths via `ResizeObserver`.

4. **Dependency Conflict Detection & Visualization**:
   - **Canonical Rule (Master Spec §4.3 & line 21189)**: Scheduling conflict occurs when an upstream blocker completes after its dependent task is scheduled to begin (`blocker.dueDate > dependent.startDate`).
   - **No Fabricated Conflicts**: Tasks with missing dates do not generate false conflicts.
   - **Dual Warning Indicators**:
     - On the SVG connector: Highlighted in warning amber (`#f59e0b`) with a prominent conflict pill (`!`) at the midpoint.
     - On the task bar: Warning triangle icon (`AlertTriangle`) and amber border ring.
     - In the task list column: Distinct conflict badge with accessible tooltip and ARIA label explaining the conflict.
     - In the `TaskPeekDrawer`: Explicit warning message explaining dates (`"Blocker ENG-101 is scheduled to finish on 2026-10-28, after ENG-105 is scheduled to begin on 2026-10-25"`).
   - **No Automated Rescheduling**: Invariants strictly respected; no automatic date leveling or shifting without explicit user instruction.

5. **TaskPeekDrawer Integration (`TaskDependencies.tsx`)**:
   - Dedicated "Dependencies & Relations" section positioned beside subtasks.
   - Displays all incoming and outgoing links with link type badges, target keys (clickable to navigate drawer), titles, and status categories.
   - Inline "Add Link" form with relationship selector and workspace task search.
   - Trash action button with CSRF and mutation ID to remove links.
   - Graceful permission checks (`canEditCustomFieldsLinks` and not archived).

---

## 2. Source-of-Truth & Contract Alignment

| Requirement / Invariant | Authoritative Specification | Implementation Reference |
| :--- | :--- | :--- |
| **OpenAPI Task Links Endpoints** | OpenAPI `0.3.20-draft` (`paths`) | `/communities/{communityId}/workspaces/{workspaceId}/tasks/{taskId}/links` (GET, POST, DELETE) |
| **TaskLink DTO Schema** | OpenAPI `components.schemas.TaskLinkDto` | `{ id, sourceTaskId, targetTaskId, type, createdAt, targetAccessible, targetKey, targetTitle, targetStatusCategory }` |
| **Timeline Query Dependency Edges** | OpenAPI `TaskQueryDependencyEdgeDto` | `{ linkId, visibleTaskId, direction: "OUTGOING" \| "INCOMING", type, otherEndpoint }` |
| **Restricted Endpoint Schema** | OpenAPI `TaskQueryRestrictedEndpointDto` | `{ access: "RESTRICTED", label: "Restricted Task" }` |
| **Scheduling Conflict Invariant** | Master Spec §4.3 & line 21189 | `blocker.dueDate > dependent.startDate` (missing dates != conflict) |
| **Cycle Prevention** | Master Spec §2.1 & line 20647 | `DEPENDENCY_CYCLE_DETECTED` (HTTP 422) |
| **Mutating Request Invariants** | OpenAPI & Contract Invariants | Required `X-CSRF-Token` and UUIDv7 `X-Mutation-Id` headers on POST and DELETE |
| **Dual Indicators** | Sonder Design System Tokens | Conflict warning uses icon + color + textual explanation |
| **Production Isolation** | Architectural Invariants | MSW excluded from production bundle via `import.meta.env.DEV` check |

---

## 3. Architecture & Modular Implementation

```
apps/web/src/
├── mocks/
│   ├── data/
│   │   └── task-links.ts                 # In-memory mock task links (conflicting, valid, relates, restricted)
│   └── handlers/
│       ├── task-links.ts                 # Contract-faithful MSW handlers for GET, POST, DELETE links + cycle detection
│       └── tasks.ts                      # Populates dependencyEdges in TIMELINE projection
├── modules/tasks/
│   ├── dependencies/
│   │   ├── types.ts                      # Re-exports contracts schemas and dependency parameter types
│   │   ├── api.ts                        # Type-safe apiRequest client for listTaskLinks, createTaskLink, deleteTaskLink
│   │   ├── useTaskLinks.ts               # TanStack Query hooks (useTaskLinks, useCreateTaskLink, useDeleteTaskLink)
│   │   ├── dependency-conflict-utils.ts  # Pure conflict math: detectBlockerConflict, detectLinkConflict, findTaskConflicts
│   │   ├── dependency-conflict-utils.test.ts # 11 pure unit tests covering conflict edge cases
│   │   ├── task-links.test.tsx           # Integration test verifying queries, mutations, cycle check, deletion
│   │   └── index.ts                      # Clean module barrel
│   ├── views/timeline/
│   │   ├── TimelineDependencyConnectors.tsx # Responsive SVG connector layer with bezier curves and conflict pills
│   │   ├── TimelineTaskRow.tsx           # Displays conflict warning icon and restricted lock indicator on task bars
│   │   ├── TimelineView.tsx              # Computes task positions map, conflicts map, and renders connectors
│   │   └── TimelineDependencies.test.tsx # Unit tests for timeline SVG connectors, conflicts, and privacy invariant
│   ├── TaskDependencies.tsx              # Dedicated drawer section: list, conflict alert, add form, delete action
│   ├── TaskDependencies.test.tsx         # Comprehensive unit tests for drawer dependencies section (6 tests)
│   └── TaskPeekDrawer.tsx                # Embedded TaskDependencies section below subtasks
```

---

## 4. Verification & Quality Gates

### 4.1 Vitest Suite Results

- **Total Test Files**: 43 passed (43 total)
- **Total Tests**: 416 passed (416 total, +24 new tests added in VS-05C)
- **Duration**: ~23 seconds
- **Key Suites**:
  - `src/modules/tasks/dependencies/dependency-conflict-utils.test.ts` (11 tests passed)
  - `src/modules/tasks/dependencies/task-links.test.tsx` (5 tests passed)
  - `src/modules/tasks/views/timeline/TimelineDependencies.test.tsx` (2 tests passed)
  - `src/modules/tasks/TaskDependencies.test.tsx` (6 tests passed)
  - `src/modules/tasks/views/timeline/TimelineView.test.tsx` (7 tests passed)
  - `src/modules/tasks/TaskPeekDrawer.test.tsx` (19 tests passed)
  - All existing List, Board, Calendar, My Work, Auth, and E2E regression tests passed with zero regressions.

### 4.2 Quality Gate Execution

| Check | Command | Result |
| :--- | :--- | :--- |
| **Doc & Schema Validation** | `pnpm validate:docs` | **51 / 51 passed** |
| **Typegen Check** | `pnpm typegen:check` | **Passed (0 changes)** |
| **Strict Typecheck** | `pnpm -r run typecheck` | **Passed (0 errors across packages)** |
| **Test Suite** | `pnpm -r run test` | **43 files passed, 416 tests passed** |
| **Production Build** | `pnpm build` | **Passed (3112 modules built in 3.3s, 0 MSW leakage)** |
| **Git Diff Check** | `git diff --check` | **Clean (no whitespace errors)** |

---

## 5. Playwright Browser QA & Visual Artifacts

Browser QA was performed on live Vite dev server with MSW handlers active on `http://localhost:5173`:
1. Navigated to `/c/018f98a2-3f12-7890-b123-456789abcdef/w/018f98a2-3f12-7890-w002-456789abcdef/timeline`.
2. Verified SVG connector rendered between `ENG-102` (starts Nov 1, due Nov 3) and `ENG-050` (starts Nov 5, due Nov 15).
3. Verified restricted dependency badge rendered on `ENG-102` (`"Linked to a restricted task"` with lock icon).
4. Verified conflict warning badge and alert rendered when an upstream blocker finishes after dependent begins.
5. Opened `TaskPeekDrawer` for `ENG-102` with deep-link URL `?task=ENG-102` and verified "Dependencies & Relations" section displaying links and "Restricted Task" pill.
6. Captured visual artifacts:
   - Desktop Viewport (`1280x800`): [timeline-dependencies-desktop.png](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/timeline-dependencies-desktop.png)
   - Mobile Viewport (`390x844`): [timeline-dependencies-mobile.png](file:///home/samudra/.gemini/antigravity-cli/brain/bc25d557-5341-4c6e-a88e-02ec43e37e09/timeline-dependencies-mobile.png)

---

## 6. Delivery Artifacts & Pull Request

- **PR Branch**: `feat/FE-VS05C-dependency-edge-management-conflicts`
- **Target Branch**: `develop`
- **Files Changed**:
  - `apps/web/src/mocks/data/task-links.ts` (new)
  - `apps/web/src/mocks/data/tasks.ts`
  - `apps/web/src/mocks/handlers/index.ts`
  - `apps/web/src/mocks/handlers/task-links.ts` (new)
  - `apps/web/src/mocks/handlers/tasks.ts`
  - `apps/web/src/modules/tasks/dependencies/` (new module)
  - `apps/web/src/modules/tasks/views/timeline/TimelineDependencyConnectors.tsx` (new)
  - `apps/web/src/modules/tasks/views/timeline/TimelineDependencies.test.tsx` (new)
  - `apps/web/src/modules/tasks/views/timeline/TimelineTaskRow.tsx`
  - `apps/web/src/modules/tasks/views/timeline/TimelineView.tsx`
  - `apps/web/src/modules/tasks/views/timeline/index.ts`
  - `apps/web/src/modules/tasks/views/WorkspaceTasksView.tsx`
  - `apps/web/src/modules/tasks/TaskDependencies.tsx` (new)
  - `apps/web/src/modules/tasks/TaskDependencies.test.tsx` (new)
  - `apps/web/src/modules/tasks/TaskPeekDrawer.tsx`
  - `apps/web/src/modules/tasks/index.ts`
  - `docs/04-implementation/vs-05c-dependency-edge-management-conflicts-report.md` (this report)
