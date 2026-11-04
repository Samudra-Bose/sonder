# SONDER — VS-03 Stage 1 Delivery Report: Mock Infrastructure & Task Data Access Layer

## Executive Summary

Stage 1 of **VS-03: Canonical Task Model, Quick Composer & Task Peek Drawer** has been completed, verified against the canonical OpenAPI contract (`Community-Work-Management-v1.5/docs/contracts/openapi.yaml`), and validated across the entire `@sonder` monorepo.

This stage establishes the data foundation for all task operations:
1. **Contract-Faithful MSW Mock Infrastructure**: Full in-memory deterministic task store supporting task retrieval, direct and aliased task-key resolution (`TaskKeyResolutionDto`), root task creation with monotonic sequence keys, hierarchical subtask depth validation (1–2 levels strictly bounded by workspace policy), and atomic field-level optimistic concurrency checking (`baseFieldRevisions` returning HTTP 409 `TASK_FIELD_CONCURRENCY_CONFLICT`).
2. **Typed Task Data Access Layer**: Endpoints encapsulated under `apps/web/src/modules/tasks/api.ts` with typed TanStack Query hooks (`useTask`, `useResolveTaskKey`, `useCreateTask`, `useUpdateTask`), stable cache keys, query cache invalidation for My Work and task lists, and automatic rollback on concurrent conflict.
3. **Four Post-Merge VS-02 Correctness Refinements**:
   - `AuthContext`: Removed `try/catch` around `useQueryClient()`, unconditionally adhering to the Rules of Hooks.
   - `getDefaultReferenceDate`: Refactored to use timezone-aware local date formatting (`Intl.DateTimeFormat("en-CA")`) without date string parsing as UTC timestamps.
   - `WorkspaceContext`: Enforced community cache isolation via `queryClient.removeQueries({ queryKey: ["communities", previousCommunityId] })`.
   - `TaskStatus`: Standardized spelling strictly on `CANCELED` across the UI and business logic.
4. **Verification & Quality Gates**: 210 tests passing across 28 test suites, 0 TypeScript errors (`tsc --noEmit`), clean OpenAPI/WebSocket typegen check (`typegen:check`), 51/51 documentation assertions passing (`validate:docs`), and a successful Vite production build.

---

## 1. Authoritative Contract & Requirements Citations

| Domain / Area | Canonical Contract Path | Schema / Route / Rule |
| :--- | :--- | :--- |
| **Active OpenAPI Source** | `Community-Work-Management-v1.5/docs/contracts/openapi.yaml` | `openapi: 3.1.0`, `version: 0.3.20-draft` |
| **Get Task by ID** | `GET /communities/{communityId}/workspaces/{workspaceId}/tasks/{taskId}` | `TaskDto` with `effectivePermissions: TaskPermissions` |
| **Resolve Task Key** | `GET /communities/{communityId}/workspaces/{workspaceId}/tasks/by-key/{taskKey}` | `TaskKeyResolutionDto` (`resolvedFromAlias`, `requestedKey`, `currentKey`, `workspaceId`) |
| **Create Task / Subtask** | `POST /communities/{communityId}/workspaces/{workspaceId}/tasks` | `CreateTaskRequest`, monotonic sequence key, max subtask depth validation |
| **Update Task (Atomic Concurrency)** | `PATCH /communities/{communityId}/workspaces/{workspaceId}/tasks/{taskId}` | `UpdateTaskRequest` with `baseFieldRevisions: { [field]: number }`, HTTP 409 conflict |
| **Required Security Headers** | RFC 9562 UUIDv7 & Double Submit Cookie | `X-CSRF-Token`, `X-Mutation-Id` on all mutating HTTP methods |
| **Hierarchy Constraints** | Master PRD §3.2, OpenAPI `maxSubtaskDepth` | Depth 1 in Personal/Gala; Depth 2 in Engineering Platform; Depth > 2 strictly forbidden |
| **Terminal Status Exclusion** | PRD §4.1 My Work Temporal Rules | Terminal statuses: `DONE` and `CANCELED` (one L) |

---

## 2. Mock Infrastructure Architecture (`apps/web/src/mocks/`)

### 2.1 Seed Data & Fixtures (`apps/web/src/mocks/data/tasks.ts`)
- **Initial Task Set**: Deterministic seed tasks covering root tasks (`ENG-101`, `ENG-102`, `ALEX-1`, `GALA-201`), subtasks at depth 1 (`ENG-105`), nested subtasks at depth 2 (`ENG-106`), viewer read-only tasks (`ENG-050`), and terminal completed/canceled tasks.
- **Computed Permissions**: `makeTaskPermissions(canEdit)` produces complete actor-projected `effectivePermissions` matching OpenAPI `TaskPermissions`:
  - `canEditTitleDescription`, `canEditDatesPriority`, `canEditCustomFieldsLinks`, `canEditEstimate`, `canUpdateStatus`, `canAssign`, `canManageSubtasks`, `canCreateSubtask`, `canComment`, `canWatch`, `canArchive`, `canRestore`, `canDeletePermanent`.
- **Key Aliases**: Registry tracking historical moved keys (e.g., `ENG-OLD-1` -> `ENG-101`) to support seamless key redirection with `resolvedFromAlias: true`.

### 2.2 MSW Handlers (`apps/web/src/mocks/handlers/tasks.ts`)
- **GET Task by ID**: Returns 200 with `TaskDto` or 404 Problem Details (`Task Not Found`).
- **GET Task Key Resolution**: Follows immutable lineage pointers. If caller requests historical key (`ENG-OLD-1`), returns `resolvedFromAlias: true` with canonical `currentKey`. Preserves non-discovery privacy invariant by returning indistinguishable 404 (`Resource Not Found`) for unauthorized or unknown keys.
- **POST Task Creation**:
  - Enforces `X-CSRF-Token` and `X-Mutation-Id` headers.
  - Automatically allocates RFC 9562 UUIDv7 task ID and monotonic sequence key (`ENG-107`, etc.).
  - Calculates hierarchy depth: verifies `parentDepth < workspace.maxSubtaskDepth`. Rejects with 400 Problem Details (`Subtask Depth Limit Exceeded`) if limit exceeded.
  - Sets initial `fieldRevisions` starting at revision 1.
- **PATCH Task Update**:
  - Enforces `X-CSRF-Token` and `X-Mutation-Id`.
  - Evaluates `baseFieldRevisions`: if any client-provided base revision is lower than the server's current revision, rejects with HTTP 409 `TASK_FIELD_CONCURRENCY_CONFLICT` and includes `currentServerRevisions`.
  - On valid update, increments field revision counters and updates `version` and `updatedAt`.

---

## 3. Task Data Access Layer (`apps/web/src/modules/tasks/`)

### 3.1 Typed API Client (`api.ts`)
- [`getTaskById`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/api.ts#L15-L23): Calls `GET /communities/{communityId}/workspaces/{workspaceId}/tasks/{taskId}`.
- [`resolveTaskKey`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/api.ts#L30-L38): Calls `GET /communities/{communityId}/workspaces/{workspaceId}/tasks/by-key/{taskKey}`.
- [`createTask`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/api.ts#L45-L61): Calls `POST /communities/{communityId}/workspaces/{workspaceId}/tasks` with CSRF and mutation headers.
- [`updateTask`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/api.ts#L68-L84): Calls `PATCH /communities/{communityId}/workspaces/{workspaceId}/tasks/{taskId}` with atomic concurrency headers.

### 3.2 TanStack Query Hooks
- [`useTask`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/useTask.ts#L27-L46): Caches under `["communities", communityId, "workspaces", workspaceId, "tasks", taskId]`. Supports conditional disabling.
- [`useResolveTaskKey`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/useResolveTaskKey.ts#L27-L47): Caches under `["communities", communityId, "workspaces", workspaceId, "tasks", "by-key", taskKey]`. Uses 5-minute stale time (immutable keys) and disables retry on 404.
- [`useCreateTask`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/useCreateTask.ts#L18-L69): Mutates task entity, seeds `useTask` detail cache and `useResolveTaskKey` cache, and invalidates workspace task queries and `["communities", communityId, "my-work"]`.
- [`useUpdateTask`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/useUpdateTask.ts#L24-L113): Implements optimistic cache updates. In case of 409 Concurrency Conflict or network failure, rolls back to snapshot state via `onError` while keeping user's attempted form draft intact.

---

## 4. Post-Merge VS-02 Correctness Refinements

1. **`AuthContext.tsx` Hook Purity**:
   - Removed `try { queryClient = useQueryClient(); } catch {}`.
   - `useQueryClient()` is invoked unconditionally at top level in `AuthProvider`.
   - Verified that `App.tsx` renders `QueryClientProvider` above `AuthProvider`.
2. **`getDefaultReferenceDate` Timezone Semantics**:
   - Updated in `apps/web/src/modules/my-work/date-utils.ts` to format `now` directly into the specified IANA timezone (`Intl.DateTimeFormat("en-CA", { timeZone })`), avoiding artificial UTC midnight distortions.
3. **`WorkspaceContext.tsx` Multi-Community Cache Isolation**:
   - `switchCommunity` explicitly tracks `previousCommunityId` and calls:
     ```ts
     queryClient.removeQueries({ queryKey: ["communities", previousCommunityId] });
     ```
   - Verified by integration test `evicts previous community queries from cache when switching communities`.
4. **Canonical Status Enum (`CANCELED`)**:
   - Normalized spelling to American English `CANCELED` (one L) in `Badge.tsx`, `date-utils.ts`, and mock data fixtures.

---

## 5. Test Matrix & Verification Results

### 5.1 Test Execution Summary
- **Total Test Suites**: 28 passed (28 total)
- **Total Tests**: 210 passed (210 total)
- **Task Module Suite**: 18 tests covering:
  - Canonical task ID retrieval and permissions
  - 404 Problem Details on non-existent task
  - Direct key resolution (`ENG-101`)
  - Historical alias resolution (`ENG-OLD-1` -> `ENG-101`)
  - Indistinguishable 404 for unknown/unauthorized keys
  - Root task creation with monotonic sequence keys
  - Subtask creation at depth 1 and depth 2
  - Subtask rejection at depth limit (400 `Subtask Depth Limit Exceeded`)
  - Personal workspace depth-1 ceiling enforcement
  - Field updates with revision incrementing
  - Field-level optimistic concurrency conflict detection (409 Conflict)
  - `useTask` cache seeding and conditional enabling
  - `useResolveTaskKey` immutable alias caching
  - `useCreateTask` mutation with My Work query invalidation
  - `useUpdateTask` optimistic updates with 409 conflict rollback

### 5.2 Quality Gates
- `pnpm validate:docs`: **51/51 PASSED**
- `pnpm typegen:check`: **PASSED** (0 diffs against canonical OpenAPI & WebSocket schemas)
- `pnpm -r run typecheck`: **PASSED** (0 TypeScript errors)
- `pnpm -r run test`: **PASSED** (210 tests passed)
- `pnpm build`: **PASSED** (Vite production bundle built cleanly in 4.25s)
- `git diff --check`: **PASSED** (no trailing whitespace or conflict markers)

---

## 6. Stage 2 Readiness Assessment

With Stage 1 merged, the repository is fully prepared for **Stage 2: Quick Composer & Task Peek Drawer**:
- **Task Entity Model**: Authoritative `TaskDto`, `CreateTaskRequest`, `UpdateTaskRequest`, and `TaskKeyResolutionDto` are ready for UI component consumption.
- **Optimistic Concurrency**: `useUpdateTask` is ready to drive drawer field edits with automatic conflict rollback.
- **Hierarchy Controls**: Depth validation rules are established for the drawer's subtask creation view.
- **Zero Rework**: All Stage 2 components will consume `@/modules/tasks` hooks directly without modifying API or mock structures.
