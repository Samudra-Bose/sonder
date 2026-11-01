# Phased Vertical-Slice Implementation Plan

**Baseline:** v1.5.0 · **API:** 0.3.20-draft (not frozen)



## 17.2 Recommended milestone entry/exit criteria

**Before M1.1:** Jointly review the Workspace-first 0.3.20 API/event candidate including all approved DEC-OPEN decisions; align database tables, migrations/RLS, template seeds and key-prefix registry; and confirm auth/security behavior. Generated clients and MSW mocks must derive from the reviewed contract revision.

**M1.1 exit:** User identity and tenancy function; Personal/Shared Workspaces and memberships are secure; tasks and subtasks can be managed; List/Board/My Work work against shared query semantics; comments/mentions/watchers and realtime are functional; seed and contract tests pass.

**M1.2 exit:** Calendar/Timeline delivered; all four views share filter membership; workflow/custom fields/saved views/templates and dependencies operate; task key aliases and workspace-level settings reconcile; view parity tests pass.

**M1.3 exit:** Custom roles, preview, audit access, reminders, offline queue, mobile/accessibility polish, performance, backups, restore drill, alerting, operational runbook and rollback pass. Required approvals collected. Only then is Phase 1 an Initial Production Release.


---

## 17.3 Recommended vertical sequencing

1. Contract/domain remediation and source-of-truth registry.
2. Identity/session/community/workspace tenancy and RLS.
3. Workspace membership, roles/capabilities and Personal Workspace privacy.
4. Task/subtask schema, Workspace key allocator/aliases and permissions.
5. Canonical query AST, List and Board, My Work and search.
6. Comments/mentions/watchers and notification foundation.
7. Transactional outbox and WebSocket/revocation.
8. Calendar/Timeline, dependencies and optional Workspace-level milestones.
9. Workflow status and custom fields; templates and saved-view parity.
10. Governance, custom role builder/preview and audit.
11. Offline edits and conflict recovery.
12. Mobile/accessibility/performance/operations/launch gates.

Do not start dependent frontend/backend slices against an unreviewed API that contains the wrong hierarchy.

---


---

# 2. Scope and release boundaries

## 2.1 Initial production release — Phase 1 — OWNER CONFIRMED

The Phase 1 release is complete only when all four views and the governance, privacy, collaboration and reliability gates pass. Work is sequenced to make delivery manageable; sequencing does not reduce launch scope.

### M1.1 — Core spine, identity, workspace and daily execution

- Email/password and Google sign-in, session lifecycle, account profile and community membership.
- Multi-community identity model and strict community/workspace authorization.
- Personal Workspace creation by every eligible user; Shared Workspace creation governed by community policy.
- Shared Workspace membership invitations, request/approval controls and default coordinator preselection/removal.
- Workspace Owner, Coordinator, Member and Viewer roles plus capability scaffolding for custom roles.
- Workspace → Task → Subtask hierarchy; task keys/aliases using the approved Community-wide prefix registry and Workspace-local monotonic sequence (database migration and runtime verification remain implementation work).
- Basic task create/read/update, assignment, status, priority, dates, estimates, labels and dependencies.
- List and Board views using shared query behavior.
- My Work cross-workspace dashboard and omnibar/search.
- Task detail drawer, comments, @mentions, watchers, in-app inbox foundation and realtime collaboration.
- Saved-view foundation with personal/shared scope and copy-on-write.
- Activity history, safe optimistic UI and online undo where approved.

### M1.2 — Complete planning and configuration experience

- Calendar and Timeline views; all four views operate from the same task data and filter semantics.
- Date windows, unscheduled tasks and dependency-conflict visualization.
- Workspace-level workflow statuses and simple five-category mapping.
- Workspace-level custom fields (Phase 1 types below).
- Exactly three built-in Workspace setup templates: General Purpose, Event Planning and Team Operations; each seeds configuration only, never sample tasks or members.
- Task/subtask hierarchy controls and key configuration, after project-removal remediation.
- Bulk task operations with atomic all-or-nothing semantics where included in the reviewed contract.
- Saved view lifecycle, presentation settings and workspace copying where permitted.
- Search/filter polish and cross-view parity tests.

### M1.3 — Governance, mobile, offline and production acceptance

- Custom role builder, capability delegation controls and preview-as-role simulator.
- Six workspace settings categories: General, Members, Permissions, Tasks, Views, Notifications.
- Audit log views/exports with correct workspace/community scoping and privacy safeguards.
- In-app/email notification preferences, quiet hours, digest behavior and deadline reminders.
- Selected-field offline editing for existing tasks, using the CR-15 allow-list, 14-day queue age, FIFO replay and per-field conflict handling. This is in the initial release scope, not deferred to Phase 3.
- Full mobile-first core flows: create task, update status, comment, inspect assigned work and navigate all four views with suitable mobile adaptations.
- Accessibility review, performance testing, backup/restore rehearsal, rollback rehearsal, security review and operational readiness.
- Product, frontend, backend, security and operations launch sign-off.

## 2.2 Roadmap after Phase 1

| Phase | Deferred capabilities | Guardrails |
|---|---|---|
| **Phase 2** | Guided CSV import, shareable intake forms, extended custom-field types, richer/custom digest schedules. | Dry-run previews, validation and import rollback; form abuse controls; preserve Phase 1 field semantics. |
| **Phase 3** | Declarative one-hop automations, status sign-off gates, outbound HTTPS webhooks, field revision restore and further workflow automation. | No arbitrary scripts; bounded one-hop evaluation; SSRF controls for webhooks; permission-aware restore. Offline task-field editing is not deferred; it belongs in M1.3. |
| **Phase 4** | Opt-in agile cycles, charts and carefully scoped AI-assisted features. | Domain-neutral core terminology; no default Sprint/Burndown language for non-software teams; opt-in per workspace. |

These roadmap capabilities must remain traceable but must not expand Phase 1 by omission. A dated decision is required to move any feature between phases.

## 2.3 Excluded file capability — OWNER CONFIRMED

No task attachment, comment attachment, Workspace File Hub, binary upload/download, signed storage URL, storage quota, malware scanning pipeline, object-storage vendor or file recovery feature is in the current product. Remove stale file references from implementation prompts, DTOs, navigation, settings, acceptance tests and deployment estimates. Audit metadata may mention historical file-related actions only if an actual record existed in a prior compatible system; it must not imply new upload support.

---
