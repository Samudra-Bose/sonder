# AI Coding Agent Contract

**Baseline:** v1.5.0 · **API:** 0.3.20-draft (not frozen)

Rules for Antigravity, code-generation tools, backend contributors and reviewers.

# 20. Instructions for implementation agents and developers

These rules apply to Antigravity CLI, code-generation tools, frontend developers, backend developers and reviewers.

1. Read this master before modifying product code. Treat Sections 1–19 as governing intent; treat the appendices as source records whose status labels must be respected.
2. Do not implement Project or List containers. The canonical product path is Community → Workspace → Task → Subtask.
3. Do not implement file uploads, attachments, a file hub, object-storage features or file recovery.
4. Do not move offline editing to Phase 3. Implement only the narrow CR-15 existing-task field queue in M1.3; do not add offline task/comment creation or a batch sync endpoint.
5. Cross-Workspace transfer carries only task/subtask titles, parent-child structure and sibling order. Do not carry `itemType`, descriptions, assignees, creator/assigner identity, status/progress, dates, estimates, priority, labels, milestones, custom fields, comments, mentions, watchers, dependencies, activity or source-private metadata. The transferred root is always top-level in the destination Workspace.
6. Do not invent API endpoints, DTO fields, enum strings, DB columns, roles, capabilities, events or errors. Update contract and obtain joint review first.
7. Do not use client permission flags as authorization. The backend checks every request.
8. Do not leak hidden workspace/task identifiers or content through search counts, error responses, aliases, comments, mentions, logs or realtime messages.
9. Do not claim a test passed unless it was actually run and recorded. Distinguish schema validation from runtime, integration, security, accessibility, performance and disaster recovery evidence.
10. Keep changes small and vertical. Complete the contract/data-model dependencies for a slice before building a large frontend surface on guessed mocks.
11. Preserve source files and add dated decision records. Do not rewrite historical drafts without versioning them.
12. Before marking a feature done, provide: changed files; requirement/decision IDs; contract version; tests executed and exact results; known gaps; rollback/migration notes where applicable.

---
