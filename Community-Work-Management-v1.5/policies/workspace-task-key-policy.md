# Workspace Task-Key Policy — DEC-OPEN-06

**Status:** OWNER CONFIRMED — 31 October 2026. **API:** 0.3.20-draft. **Implementation:** pending backend migration, concurrency and security tests.

## Rules

1. Every Workspace has one canonical uppercase prefix and its own atomic sequence allocator.
2. Prefixes are unique across all current and historical namespaces within a Community, case-insensitively. A prefix is never reassigned after rename, archive or Workspace deletion.
3. Task sequence numbers are Workspace-local, strictly increasing, never reset, never decremented and never reused after task archive, permanent purge, task transfer or prefix rename.
4. The Workspace Owner may rename the prefix. The rename is one transaction: reserve the new prefix; lock Workspace allocator and task rows; update current display keys while preserving each numeric suffix; insert old current keys as immutable aliases; write the governance audit record and outbox event; commit.
5. A collision with a current or historical prefix reservation rejects the entire operation with `409 WORKSPACE_KEY_PREFIX_ALREADY_IN_USE`.
6. Prefix rename does not change internal UUIDv7 IDs, taskLineageIds or assignment relationships.
7. Cross-Workspace transfer creates fresh destination task UUIDs and destination Workspace sequence numbers. Old keys remain aliases to the same lineage, subject to authorization against the current Workspace.
8. Alias lookup never proves access. Resolve current lineage, authorize against current Workspace and only then return current task key/details. Unknown and unauthorized keys use the same non-disclosing 404 behavior.

## Data invariants

- `workspace_key_prefix_registry(community_id, normalized_prefix)` is unique and insert-only. Historical prefixes remain reserved.
- `task_key_aliases(community_id, namespace_workspace_id, normalized_key)` is unique and insert-only; it maps to stable taskLineageId.
- `workspace_task_key_sequences(workspace_id)` stores a monotonically increasing allocator value; updates use atomic locking/sequence allocation.
- Alias records are never updated or deleted by the application role.

## Required tests

- Two concurrent workspaces in one Community cannot reserve the same normalized prefix.
- Concurrent task creation has no duplicate suffixes.
- Prefix rename is atomic under collision/failure and preserves numeric suffixes.
- Old and new keys resolve to the same lineage after prefix rename.
- Prefixes are not reused after Workspace archive/delete or prefix rename.
- Transfer to another Workspace generates new destination keys but keeps aliases; source-only access does not reveal destination identity.

## Not implied

This decision does not choose the Workspace name, template, task-key display location, sequence start number, hosting database or audit numeric retention.
