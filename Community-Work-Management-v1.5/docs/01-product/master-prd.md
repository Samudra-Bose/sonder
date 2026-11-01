# Master Product Requirements Document

**Baseline:** v1.5.0 · **API:** 0.3.20-draft (not frozen)

Approved product baseline; no approved requirement is silently dropped by phase sequencing.

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


---

# 6. Functional product requirements

## 6.1 Workspace lifecycle

- A signed-in user can create a Personal Workspace without a community-wide administrator granting special permission, subject to account/community policy.
- Shared Workspace creation obeys Community-level controls.
- Workspace creation allows name, optional description, template/preset selection, default Coordinator preselection and initial membership where authorized.
- The creator becomes an Owner. Shared Workspaces maintain an Owner floor.
- Workspace owners can invite active Community members, approve membership requests, assign allowed roles, remove members, archive/restore and transfer ownership.
- Membership changes invalidate current REST and realtime authorization promptly.

## 6.2 Task creation and editing

- Quick-create task composer: title required; default visible input count capped at five. Advanced details are available after creation or in a secondary section.
- Create task at Workspace root or as a child of another task, subject to hierarchy depth.
- Support inline changes for status, priority, assignee, due date and labels where authorized.
- Support estimates, start/due dates, task archetypes, dependencies and Workspace custom fields.
- Provide clear validation and field-level errors; forbidden mixed updates fail atomically.
- Task detail is opened from any projection without losing the current view context.

## 6.3 Four synchronized views — all required at launch

All projections use the same query membership and authorization rules. Projection changes only response/presentation shape, not the set of accessible tasks.

### List

- Dense desktop tree/grid layout with expandable subtasks and inline property editing.
- Keyboard accessible row navigation and expansion.
- Fast inline creation and multi-select foundation.
- Touch row targets expand to suitable mobile size.

### Board

- Workflow status columns; optional backlog tray.
- Cards show key, title, status, priority, due date, assignee and subtask progress as configurable display options.
- Reorder/status changes supported by pointer and non-drag alternatives (menu or keyboard reorder).
- Mobile adapts to a stage/status switcher instead of forcing a wide desktop board.

### Calendar

- Month/week/agenda-like windows; tasks displayed by due date or start–due span.
- Unscheduled tray displays matching undated tasks and makes them schedulable without hiding them.
- Date editing works by keyboard/menu as well as drag interactions.

### Timeline

- Split view: task hierarchy table plus horizontal time axis.
- Day/week/month/quarter zoom where practical.
- Draw date spans and dependency relationships; show conflicts when a non-completed blocker finishes later than its dependent task begins.
- All edits remain possible without dragging timeline bars.

## 6.4 Canonical query and view state

One canonical `ViewQuerySpec` defines filters, sorting, grouping, subtask inclusion and date window. The frontend serializes transient filters into URL/local navigation state. Saved view query specification is stored separately from display options/projection. A changed filter/sort on a Shared View is local until an explicit save/update action. A user can save a Personal View without changing the Shared View. Shared view update rights are role/capability controlled.

Task query snapshots use the CR-15 fixed 900-second cursor policy. Realtime updates newer than the snapshot watermark invalidate or refresh the active projection without mixing incompatible membership snapshots. List/Calendar/Timeline task limits and Board per-group limits must follow the latest CR-15 specification until the post-remediation contract review revises it.

## 6.5 Search, omnibar and My Work

- Global omnibar supports task key/current alias, title, and saved-view/workspace discovery.
- All search is permission-aware and intersects current Community/Workspace memberships; never disclose hidden names, keys, counts or metadata.
- My Work aggregates tasks assigned to, created by or watched by the user across accessible Personal and Shared Workspaces.
- Default useful groups: Overdue, Due Today, Upcoming and Unscheduled. Allow filter/sort customization and return-to-workspace navigation.
- Search results and aliases must authorize the current lineage destination before disclosing the task.

## 6.6 Comments, mentions and watchers

- Task-scoped threaded comments with a safe Markdown subset.
- Server converts Markdown into a versioned typed AST; clients render safe elements, never raw HTML.
- Disallow scripts, raw HTML, arbitrary SVG/iframe/image/embed nodes and dangerous URL schemes.
- @mention candidate search is permission-aware and only resolves currently authorized users in the same Workspace/Community scope.
- `#KEY` tokens resolve through the task-key alias system; inaccessible/unknown keys remain unlinked plain text.
- Creator/assignees/mentioned users may be auto-watched according to CR-08 draft; any eligible member may toggle watch state.
- File attachments and comment file IDs are not supported.

## 6.7 Notifications and reminders

- In-app Inbox categories: Action Required and Updates (CR-10 draft).
- Events include mentions, new assignment, approved sign-off requests if added later, reminders, watched-task comments and status changes.
- Recipient-specific notification settings; email and in-app channel preferences; quiet hours/local timezone and digest options subject to final signoff.
- Workspace-configured deadline reminder offsets with recipient preferences, assignee/creator fallback and deduplication.
- Durable notification generation uses outbox and bounded retries; sending a message must not block realtime event consumption.
- Provider/sender/domain configuration is deployment-dependent and remains open.

## 6.8 Custom fields

Phase 1 engineering draft supports `TEXT`, `NUMBER`, `DATE`, `BOOLEAN`, `SINGLE_SELECT` only. Definitions belong to the Workspace, not a Project. Field values are typed and validated server-side; single-select option UUIDs are stable; labels are display-only. Required-field changes and deletion/archive behavior must preserve existing values through an explicit migration or archive strategy. Custom field value changes use per-field revisions for conflict detection. Filtering/sorting is allowed only for supported indexed field types and reviewed query operators. Extended types are Phase 2.

## 6.9 Templates, milestones and bulk actions — OWNER CONFIRMED DEC-OPEN-07/08

Exactly three versioned, read-only built-in Workspace setup templates are included: `GENERAL_PURPOSE`, `EVENT_PLANNING` and `TEAM_OPERATIONS`. They seed workflow statuses, supported Phase 1 custom-field definitions/options and default SHARED saved views atomically with Workspace creation. They never create sample tasks/subtasks, assignees, assignments, comments, watchers, members, invitations or permission escalations. Existing Workspaces are not silently changed when the catalog version changes; Owners can edit the resulting configuration. A custom template builder is not part of the initial release.

Milestones are retained as optional Workspace-level planning markers linked directly to tasks. They may appear in Timeline/task context but are never hierarchy containers or an intermediate layer between Workspace and Task.

Bulk operations, if included in the reviewed release contract, are bounded, permission checked and all-or-nothing. A failed item means the transaction does not partially mutate the rest. Undo semantics must be explicit and durable enough for recovery.

### Task Trash and permanent purge — OWNER CONFIRMED DEC-OPEN-11

Archived tasks remain restorable for exactly 30 days. Expiry ends the normal recovery window; it does not automatically hard-delete the record. Permanent purge is separate, explicit, Owner-authorized and audit-recorded, and applies to an archived task subtree atomically. Historical key aliases and minimum content-free lineage tombstones remain for privacy-safe resolution. The purge operation is specified in API 0.3.20-draft but remains feature-disabled until DEC-OPEN-03 audit-retention/legal-hold authority is approved. Audit-log retention is a separate policy and is not set by this decision.

## 6.10 Activity, audit and recovery

- Task activity is user-facing history of task changes and collaboration.
- Governance/security audit events are separate, append-only and tamper-evident.
- Break-glass evidence is a distinct security-sensitive record class.
- Audit metadata must avoid raw task descriptions, titles, comment bodies, credentials, personal contact details and custom field values unless a specifically approved legal/security requirement says otherwise.
- Audit read/export is scoped: Community Admin to that community, Workspace Owner to that workspace, with separate `audit:read` and `audit:export` capabilities. Coordinators/Members have no default audit access; Platform Operator has no silent tenant-content audit privilege.
- Audit retention duration, archive schedule, legal-hold authority and ultimate purge remain open. Do not enable automatic audit purge.

---
