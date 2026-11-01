# Workspace Task Move and Transfer Policy — DEC-OPEN-10

**Status:** OWNER CONFIRMED — 31 October 2026. **API:** 0.3.20-draft.

## Same-Workspace move

A same-Workspace move may reorder a task or change its parent to another authorized task in the same Workspace (or top-level). It preserves UUID, lineage, key and all task content. Moving a parent moves its descendants atomically. Cycles and depth-limit violations are rejected.

## Cross-Workspace transfer

Only within the same Community, subject to authorization in both source and target. The transfer is a privacy boundary change and requires a preview. Personal-to-Shared requires explicit audience confirmation.

**Carry only:** task/subtask titles, parent-child structure and sibling order.

**Never carry:** itemType, descriptions (including subtask descriptions), assignees, creator/assigner identity, status/progress, dates, estimates, priority, labels, milestones, custom-field values, comments, mentions, watchers, dependencies/task links, activity history or source private metadata.

The transferred root is always created at the destination Workspace top level. `targetParentTaskId` must be null for cross-Workspace transfer. No existing destination task may become the parent. Descendants preserve only their internal tree structure and sibling order.

Each destination node receives a new UUIDv7 and destination Workspace key. Aliases and stable lineage point to the current destination identity, but lookup authorizes against the current Workspace before revealing any details. Source records become content-free tombstones. The complete tree, aliases, tombstones, key allocations and both Workspace outbox events commit atomically.

## Required tests

- A cross-Workspace request with non-null targetParentTaskId returns 422 and changes nothing.
- Transfer copies only the approved names and tree/order.
- All excluded fields remain destination defaults/null.
- Source/target concurrency, alias resolution and Personal-to-Shared preview confirmation are covered.
- Failed transfer has no partial task, alias, tombstone, sequence or outbox writes.
