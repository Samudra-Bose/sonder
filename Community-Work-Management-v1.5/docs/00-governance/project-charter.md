# Project Charter

**Baseline:** v1.5.0 · **API:** 0.3.20-draft (not frozen)

Approved product purpose, target users, release boundaries and explicit non-goals.

# 1. Executive summary and product direction

## 1.1 Product vision — OWNER CONFIRMED

Build an original, modern, low-learning-curve work-management platform for an initial community of approximately 70–90 people, supporting engineering groups, event committees, operations teams, student clubs and study groups. The architecture must support multiple independent communities from day one without imposing enterprise-level administrative overhead on ordinary members.

The experience should combine the useful depth of a mature task tracker with the clarity and speed of a lightweight tool. A new member should be able to sign in, understand their personal work, create a task and update progress without training. Owners and administrators should be able to configure roles, access, workflows, saved views and governance from structured settings rather than forcing all members to deal with that complexity daily.

## 1.2 Core product problem

Lightweight boards become inadequate when teams need reliable identifiers, task hierarchy, dependencies, multiple synchronized planning views, role-aware editing, auditability and workspace-level ownership. Enterprise tools often solve those needs with a high configuration and learning burden. This product targets the middle ground: deep enough for complex community work, simple by default and governed at the right boundary.

## 1.3 Primary users and jobs to be done

| User type | Primary job | Product value |
|---|---|---|
| Community member / contributor | See work assigned to them across joined workspaces, update progress quickly, comment and manage private personal tasks. | My Work, rapid task creation, four consistent views, simple status actions and app-like mobile UX. |
| Coordinator | Organize shared work, assign tasks, resolve blockers, manage deadlines and help members. | Workspace coordination capabilities, hierarchy, dependencies, saved shared views and planning views. |
| Workspace Owner | Create and govern a workspace, control membership/roles, configure task behavior and recover mistakes. | Six-category settings, custom roles, workflow settings, role preview, task transfer and audit visibility. |
| Community Administrator | Manage community membership and shared-workspace policies, and perform limited emergency recovery when justified. | Community-scoped administration, default coordinator pool, governance audit and audited Personal Workspace break-glass. |
| Platform Operator | Maintain infrastructure without routine access to community content. | Operational-plane tools only; no silent tenant-content privilege. |

## 1.4 Binding product principles

1. **Simplicity first; depth on demand.** The default task composer should show no more than five fields. Advanced options live in contextual menus or categorized settings.
2. **One canonical task model.** List, Board, Calendar and Timeline are projections of the same authorized task set and the same canonical filters.
3. **Recognition over recall.** Use visible status/priority labels and icons, searchable keys, clear filter pills and familiar navigation rather than requiring a query language.
4. **Safe exploration.** Draft view/filter changes locally; explicitly save shared changes; provide undo/recovery for destructive actions where specified.
5. **Explain permissions.** The backend makes the decision; the UI explains why a control is unavailable in plain language.
6. **Privacy by default.** Community membership, workspace membership, task visibility and Personal Workspace privacy are separate and rechecked on every request.
7. **Mobile as a first-class client.** Core task create, status update and comment flows work comfortably on narrow touch screens.
8. **Contract-first parallel delivery.** Frontend and backend teams use the same reviewed schemas and mock fixtures; neither side invents behavior independently.

## 1.5 Explicit product non-goals — OUT OF SCOPE

- JQL or another complex text query language.
- Enterprise workflow transition screens, arbitrary workflow scripts or post-functions.
- Billable timers and worklog accounting.
- PMO scenario sandboxes, generic dashboard widget builders or enterprise ITSM/SLA/CMDB suites.
- Live scraping, reverse-engineering or copying proprietary hosted SaaS behavior/assets.
- File uploads, attachments, a workspace file hub, object-storage quotas or file recovery.
- Mandatory Projects, Lists or Milestone containers between a Workspace and its Tasks.
- Cross-community task transfer.
- Arbitrary user-authored automation scripts or unbounded automation loops.

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
