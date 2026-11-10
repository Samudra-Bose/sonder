# SONDER — VS-08A.2: REALTIME EVENT SCOPING CORRECTION DELIVERY REPORT

**Milestone ID:** VS-08A.2  
**Feature Scope:** Realtime Event Task Scoping Correction, Canonical Schema Alignment & Watcher Event Integrity  
**Canonical Reference:** `ws-events.schema.json`, `ws-protocol.schema.json`, OpenAPI 0.3.20-draft, Master Spec §8 & Appendix L  
**Working Branch:** `fix/FE-VS08A2-realtime-event-scope`  
**Baseline Commit:** `develop @ be23c22` (VS-08A.1 docs sync)  
**Governance Standard:** PLAN → GRILL → IMPLEMENT → TEST → REVIEW → LOCK → DOCUMENT  

---

## 1. Executive Summary

Milestone **VS-08A.2** performed a narrowly scoped, critical post-merge correctness pass on the collaboration realtime event consumer ([`useTaskCollaborationRealtime.ts`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/comments/useTaskCollaborationRealtime.ts)).

### Root Cause Analysis & Issues Resolved
1. **Incomplete Task Guard Scoping:** In VS-08A/VS-08A.1, the task-mismatch guard checked `if (eventTaskId && eventTaskId !== taskId && event.eventType.startsWith("comment."))`. Because this check only applied to `comment.*` events, a `watcher.changed` event originating from a different task in the same workspace bypassed the check and improperly invalidated query caches (`task-activity`, `task`, `my-work`) for the currently open task.
2. **Undeclared Event Field Consumption:** In VS-08A.1, `watcher.changed` handling attempted to parse `event.payload.watching`, `event.payload.isWatching`, and `event.payload.userId`. Inspection of canonical schemas confirmed that `ws-events.schema.json` and OpenAPI 0.3.20-draft strictly prohibit these fields in workspace domain payloads ("Payloads contain only taskId, commentId, version and event metadata; never Markdown, AST, mention recipient IDs, email or hidden task identifiers").
3. **Workspace Stream vs. Task Scoping Disconnect:** Events for other tasks in the same workspace are valid members of the workspace stream sequence (`workspaceSeq`). Returning early prior to sequence tracking or deduplication broke monotonic stream tracking.

---

## 2. Canonical Event Contract Inspection

We inspected the canonical sources of truth:
- `Community-Work-Management-v1.5/docs/contracts/ws-events.schema.json`
- `Community-Work-Management-v1.5/docs/contracts/ws-protocol.schema.json`
- `Community-Work-Management-v1.5/docs/contracts/openapi.yaml` (Realtime section)
- `Community-Work-Management-Master-Specification-v1.5.0.md` §8 & Appendix L

### Confirmed Canonical Field Mappings
| Dimension | Canonical Schema Definition | Implementation Rule |
| :--- | :--- | :--- |
| **Stream Identity** | `communityId: UUID`, `workspaceId: UUID`, `stream: "workspace"` | Events not matching active `communityId` and `workspaceId` are immediately rejected without advancing stream sequence. |
| **Sequence & Deduplication** | `workspaceSeq: integer (>= 1)`, `eventId: UUID` | Every valid event on the active workspace stream advances `latestSequence` and is deduplicated via a 500-entry bounded LRU cache, even if directed at another task. |
| **Task Identity** | Comment events: `payload.taskId` (explicit) and `entityId` (comment UUID).<br/>Task/Watcher events: `entityId` (task UUID) or `payload.taskId`. | Resolved via `resolveEventTaskId(event)`. If missing, empty, or mismatched with active `taskId`, the event is safely dropped from active task handling. |
| **Watcher Event Payload** | `payload: { taskId?: UUID }`, `actorId: UUID`, `entityId: UUID` | `watcher.changed` payload contains **only** `taskId` and event metadata. It does **not** declare `watching`, `isWatching`, or target `userId`. |
| **Actor vs Target** | `actorId: UUID` on the envelope identifies the initiating actor. | An event triggered by another actor (`actorId !== currentUserId`) must never alter the current user's local watcher state. |

---

## 3. Implementation Corrections

### 3.1 Task-Level Isolation Guard
In [`useTaskCollaborationRealtime.ts`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/comments/useTaskCollaborationRealtime.ts):
```ts
function resolveEventTaskId(event: WorkspaceEventEnvelope): string | null {
  const payloadTaskId =
    typeof event.payload?.taskId === "string" ? event.payload.taskId.trim() : null;
  if (payloadTaskId) {
    return payloadTaskId;
  }
  if (typeof event.entityId === "string" && event.entityId.trim().length > 0) {
    return event.entityId.trim();
  }
  return null;
}
```
All task-scoped collaboration events (`comment.created`, `comment.updated`, `comment.deleted`, `watcher.changed`) are guarded by:
```ts
const eventTaskId = resolveEventTaskId(event);
if (!eventTaskId || eventTaskId !== taskId) {
  return;
}
```
- An event for another task never modifies the active task's cache or watcher state.
- Missing or malformed task identity is safely rejected.

### 3.2 Canonical Watcher Event Handling
Per contract governance, missing payload properties are **never** fabricated or inferred:
```ts
case "watcher.changed": {
  // Canonical watcher.changed payload contains only taskId and event metadata.
  // It does NOT declare watching, isWatching, or target userId properties.
  // We do not fabricate missing payload fields or mutate the watcher cache with undeclared properties.
  queryClient.invalidateQueries({
    queryKey: taskActivityQueryKey(communityId, workspaceId, taskId),
  });
  queryClient.invalidateQueries({
    queryKey: ["task", communityId, workspaceId, taskId],
  });
  queryClient.invalidateQueries({ queryKey: ["my-work"] });
  break;
}
```

### 3.3 Dynamic Sequence Getter
Updated the hook return to expose a live sequence getter (`get latestSequence() { return latestSequence.current; }`), ensuring callers always read the live sequence value without forced re-renders.

---

## 4. Test Evidence & Regression Suite

### 4.1 Focused Regression Tests ([`TaskCollaborationHardening.test.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/comments/TaskCollaborationHardening.test.tsx))
Added tests covering all requirements from Section 4:
1. **Watcher event isolation:** A `watcher.changed` event for another task in the same workspace does not affect the currently open task.
2. **Canonical watcher handling:** A valid watcher event for the active task invalidates activity and task queries per canonical schema.
3. **Actor boundary:** An event concerning another user does not change the current user's watcher state.
4. **Workspace boundary:** An event for another workspace or community is completely ignored.
5. **Malformed identity rejection:** Missing or malformed task identity is safely rejected.
6. **Comment event scoping:** Comment events continue to be strictly task-scoped.
7. **Sequence & deduplication:** Event deduplication and workspace sequence tracking remain contiguous and monotonic.

### 4.2 Quality Gate Verification Summary
| Verification Gate | Command | Result |
| :--- | :--- | :--- |
| **TypeScript Typecheck** | `pnpm run typecheck` | 0 errors across all workspace packages |
| **Comments Module Tests** | `pnpm --filter @sonder/web test src/modules/tasks/comments/` | 3 files, 47 tests passed (100%) |
| **Monorepo Test Suite** | `pnpm run test` | 49 files, 487 tests passed (100%) |
| **Production Build** | `pnpm --filter @sonder/web build` | Clean Vite production build |
| **Canonical v1.5 Validation** | `python3 validate_v1_5.py` | 51/51 checks passed |
| **Canonical OpenAPI Diff** | `git diff Community-Work-Management-v1.5/` | 0 lines changed |
| **Generated Contracts Diff** | `git diff packages/contracts/src/api-types.ts` | 0 lines changed |
| **Whitespace Cleanliness** | `git diff --check` | 0 whitespace or formatting errors |

---

## 5. Pending Backend Dependencies

1. **`DEP-COLLAB-01` (Cross-Session Watcher State Persistence):**
   Backend schema expansion to expose `isWatching: boolean` on `TaskDto` or `TaskActivityDto`, reflecting the session user's watch status from `task_watchers`.
2. **`DEP-REALTIME-01` (Live WebSocket Gateway):**
   Backend deployment of `wss://...` gateway, ticket endpoint (`POST /communities/{cid}/realtime-ticket`), and `work-platform.v1` protocol frames.

---

## 6. Milestone Transition & Next Steps

1. **Active Branch:** `fix/FE-VS08A2-realtime-event-scope` merged into `develop` via PR #34.
2. **Merge Commit:** `develop @ 3cbbce2` (PR #34 squash merge).
3. **Track B Status:** UI/UX workstream remains recorded as **PAUSED**.
4. **Next Approved Engineering Milestone:**
   > **MILESTONE VS-08B / FEAT-F01a: SEGMENTED IN-APP NOTIFICATION CENTER (`FEAT-F01a`)**
   - Beginning with structured PLAN and GRILL passes.
