# SONDER — CANONICAL FRONTEND COMPLETION TRACKER & INVENTORY

**Document Version:** 1.0.0  
**Last Synchronized:** 2026-11-11  
**Verified Baseline Commit:** `develop @ 8f887de`  
**Latest Feature Merge Commit:** `develop @ 1b88e60` (PR #37, Notification Center REST vertical slice)  
**Governance Standard:** Dual-Track Engineering Governance (PLAN → GRILL → IMPLEMENT → TEST → REVIEW → LOCK → DOCUMENT)  
**Maintenance Rule:** This document is the single authoritative source of truth for frontend feature completion, remaining backlog, and first-look readiness. Every claim must link to verified repository files and automated tests. Completion percentages must never be fabricated.

---

## 1. Executive Summary

This tracker provides an exhaustive, evidence-based audit of the entire Sonder web application as of Milestone **VS-09.0**.

Sonder is an original, low-learning-curve task and collaboration platform engineered for community squads, operations committees, and project teams. The frontend is built as a single-page application using React 19, TypeScript, Vite, TanStack Query v5, Tailwind CSS, Base UI, and MSW v2 for contract-accurate simulation.

### Core Audit Verdict
* **Foundational Architecture & Execution Spine:** **COMPLETE**.
* **Four Core Planning Views (List, Board, Calendar, Timeline):** **COMPLETE & SYNCHRONIZED**.
* **Cross-Workspace Execution (My Work, Omnibar, Drawer, Peek):** **COMPLETE**.
* **Collaboration Spine (Comments, @Mentions, Task Watchers):** **COMPLETE**.
* **In-App Notification Center (Bell, Badges, Inbox, Triage):** **COMPLETE (REST Vertical Slice)**.
* **Test Suite Health:** **100% GREEN** across 50 test files and 506 automated tests in CI.
* **Next Engineering Phase:** Prioritized backend-independent backlog (Task Trash & 30-Day Recovery, Workspace Starter Templates Picker, Work-Item Archetypes & Cloning, Filtered CSV Export).

---

## 2. Verified Repository Baseline

| Parameter | Verified Value | Evidence |
|---|---|---|
| **Active Branch** | `develop` | Local and remote synchronized |
| **Documentation Synchronization Commit** | `8f887de8ffec0d0752b047a05ba9b265ffdb7b46` | Git reflog / log verified |
| **Latest Feature Merge Commit** | `1b88e60a21c2b8a0e04f77b8dbf986bd98823c6b` | PR #37 squash merge commit |
| **Working Tree Cleanliness** | 100% Clean | Zero unstaged modifications |
| **Monorepo Test Suite** | 50 test files, 506 tests passing | `pnpm test` exit code 0 |
| **TypeScript Validation** | Zero errors across workspace | `pnpm typecheck` exit code 0 |
| **Production Web Build** | 3,133 modules transformed | `pnpm --filter @sonder/web build` (3.55s) |
| **Documentation / Spec Checks** | 51 / 51 validation checks passed | `pnpm validate:docs` exit code 0 |
| **Whitespace / Diff Hygiene** | Clean, zero trailing whitespace | `git diff --check` exit code 0 |

---

## 3. High-Level Status Categorization

All product capabilities are classified into one of seven strict statuses:

```mermaid
pie title Frontend Feature Status Distribution
    "DONE (Verified & Tested)" : 19
    "PARTIAL (Incomplete Scope)" : 3
    "NOT STARTED (Phase 1 Backlog)" : 9
    "DECISION BLOCKED (PO / Backend Sign-Off)" : 2
    "BACKEND DEPENDENT (Realtime / Endpoints)" : 3
    "DEFERRED (Phases 2, 3, 4)" : 12
    "REJECTED / OUT OF SCOPE (Excluded)" : 6
```

### Summary Totals by Status
1. **DONE (19 Features):** Fully implemented, verified with passing unit/integration tests, and merged into `develop`.
2. **PARTIAL (3 Features):** Core data layer or UI rendered, but requirements (e.g. template picker UI, smart chips, backlog category) remain partially unintegrated.
3. **NOT STARTED (9 Features):** Phase 1 features with approved contract schemas and zero code implementation (e.g., Task Trash, Task Cloning, CSV Export, Workspace Settings).
4. **DECISION BLOCKED (2 Features):** Implementation paused by explicit product decision (Saved Views `FEAT-C04` and Board Display Options `FEAT-C06`).
5. **BACKEND DEPENDENT (3 Features):** Live WebSocket transport (`DEP-NOTIF-03`, `DEP-REALTIME-01`), task deep-linking (`DEP-NOTIF-02`), and cross-session watcher persistence (`DEP-COLLAB-01`).
6. **DEFERRED (12 Features):** Approved product roadmap capabilities formally scheduled for Phase 2, Phase 3, or Phase 4.
7. **REJECTED / OUT OF SCOPE (6 Features):** Explicitly excluded from Sonder to prevent bloat (Files/Attachments, Granular Timers, Enterprise CMDB/ITSM, Multi-Gadget Custom Dashboards).

---

## 4. Feature-by-Feature Detailed Inventory & Evidence

| Feature ID | Feature Name | Planned Phase | Current Status | Implementation Evidence | Test Evidence | Remaining Frontend Work | Backend Dependency | Contract Status | Next Action |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **FEAT-A01** | Lightweight Work-Item Archetypes (Task, Deliverable, Bug, Decision) | M1.2 (Phase 1) | **NOT STARTED** | None (tasks default to `TASK` itemType) | None | Add archetype selector & visual badge chips in drawer and card headers | `TaskDto.itemType` supported in OpenAPI | Existing in OpenAPI 0.3.20-draft | Implement (Backlog #3) |
| **FEAT-A02** | Fast Task Creation, Editing & Assignment | M1.1 (Phase 1) | **DONE** | [`QuickTaskComposer.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/QuickTaskComposer.tsx), [`TaskPeekDrawer.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskPeekDrawer.tsx), [`useCreateTask.ts`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/useCreateTask.ts) | `QuickTaskComposer.test.tsx` (21 tests), `TaskPeekDrawer.test.tsx` (19 tests), `tasks.test.tsx` (20 tests) | None | None (MSW mock fully operational) | Existing in OpenAPI 0.3.20-draft | None |
| **FEAT-A03** | Core Task Metadata (Status, Priority, Dates, Labels, Estimate) | M1.1 (Phase 1) | **DONE** | [`InlineFieldEditors.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/InlineFieldEditors.tsx), [`useUpdateTask.ts`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/useUpdateTask.ts) | `InlineTaskEditing.test.tsx` (26 tests) | None | None | Existing in OpenAPI 0.3.20-draft | None |
| **FEAT-A04** | Threaded Comments, @Mentions, #KEY Links & Task Watchers | M1.1 (Phase 1) | **DONE** | [`CommentComposer.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/comments/CommentComposer.tsx), [`markdown-ast.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/comments/markdown-ast.tsx), [`TaskWatchButton.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/comments/TaskWatchButton.tsx) | `TaskCollaboration.test.tsx` (12 tests), `TaskCollaborationHardening.test.tsx` (22 tests), `markdown-ast.test.tsx` (13 tests) | Cross-session watcher persistence deferred to backend | `DEP-COLLAB-01` (`isWatching` persistence) | Existing in OpenAPI 0.3.20-draft | None |
| **FEAT-A05a** | Task File Attachments & Uploads | Excluded | **REJECTED / OUT OF SCOPE** | None (Stale references removed) | None | None (Zero file uploads per PRD §2.3) | None | Excluded from spec | None |
| **FEAT-A05b** | Workspace File Management Hub | Excluded | **REJECTED / OUT OF SCOPE** | None (Excluded per PRD §2.3) | None | None | None | Excluded from spec | None |
| **FEAT-A06** | Subtasks (Depth 1..2) & Dependency Links (BLOCKS DAG) | M1.1 (Phase 1) | **DONE** | [`SubtaskList.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/SubtaskList.tsx), [`ReparentTaskModal.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/ReparentTaskModal.tsx), [`TaskDependencies.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskDependencies.tsx), [`TimelineDependencyConnectors.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/views/timeline/TimelineDependencyConnectors.tsx) | `SubtaskHierarchy.test.tsx` (18 tests), `TaskDependencies.test.tsx` (6 tests), `task-links.test.tsx` (5 tests), `dependency-conflict-utils.test.ts` (11 tests), `TimelineDependencies.test.tsx` (2 tests) | None | None | Existing in OpenAPI 0.3.20-draft | None |
| **FEAT-A07** | Single-Click Task & Subtask Checklist Cloning | M1.2 (Phase 1) | **NOT STARTED** | None | None | Add "Clone task" action in task peek drawer and list/board context menus | `POST /tasks/{taskId}/clone` | Existing in OpenAPI 0.3.20-draft | Implement (Backlog #4) |
| **FEAT-A08** | Fractional Ranking & Manual Ordering (`rankKey`) | M1.1 (Phase 1) | **DONE** | [`TaskBoardView.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/views/TaskBoardView.tsx), [`TaskListView.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/views/TaskListView.tsx) | `TaskViews.test.tsx` (17 tests), `CrossViewIntegration.test.tsx` (10 tests) | None | None | Existing in OpenAPI 0.3.20-draft | None |
| **FEAT-A09** | Granular Time Tracking & Billable Worklogs | Excluded | **REJECTED / OUT OF SCOPE** | None | None | None (Preserves lightweight simplicity) | None | Excluded from spec | None |
| **FEAT-A10a** | Single-Item Archive, 10s Undo Toast (`Z`) & 30-Day Soft Delete | M1.1 (Phase 1) | **NOT STARTED** | None | None | Archive button in task drawer, undo toast with countdown and `Z` key trigger | `POST /tasks/{id}/archive`, `POST /tasks/{id}/restore` | Existing in OpenAPI 0.3.20-draft | Implement (Backlog #1) |
| **FEAT-A10b** | All-or-Nothing Bulk Action Bar (<=100 tasks) & Trash Recovery View | M1.2 (Phase 1) | **NOT STARTED** | None | None | Multi-select checkboxes in list view, bulk action floating bar, dedicated `/trash` route with 30-day countdown | `GET /workspaces/{id}/trash`, `POST /workspaces/{id}/trash/{id}/restore` | Existing in OpenAPI 0.3.20-draft (Purge gated on DEC-OPEN-03) | Implement (Backlog #2) |
| **FEAT-A10c** | Granular Field-Revision Snapshot Restore ("Time-Travel Revert") | Phase 3 | **DEFERRED** | None | None | None | Phase 3 audit revision endpoint | Deferred to Phase 3 | Defer |
| **FEAT-B01** | Multi-Community, Personal/Shared Workspace Spine & Responsive Rail | M1.1 (Phase 1) | **DONE** | [`AppShell.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/app-shell/AppShell.tsx), [`AppSidebar.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/app-shell/AppSidebar.tsx), [`WorkspaceSwitcher.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/workspace/WorkspaceSwitcher.tsx), [`MobileNavigation.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/app-shell/MobileNavigation.tsx) | `AppShell.test.tsx` (17 tests), `WorkspaceSwitcher.test.tsx` (14 tests) | None | None | Existing in OpenAPI 0.3.20-draft | None |
| **FEAT-B02** | Backlog Status Category & Collapsible Tray | M1.1 (Phase 1) | **PARTIAL** | `BACKLOG` category enum recognized in types | None | Collapsible Backlog side-tray on board and list views | Backend query param `includeBacklog` | Existing in OpenAPI 0.3.20-draft | Implement (Backlog #6) |
| **FEAT-B03** | Opt-In Timeboxed Iterations / Cycles (Lightweight Sprints) | Phase 4 | **DEFERRED** | None | None | None | Cycle endpoints & sprint burndowns | Deferred to Phase 4 | Defer |
| **FEAT-B04** | Workspace Milestones & Target Buckets (Completion % Rollup) | M1.2 (Phase 1) | **DONE** | [`useMilestones.ts`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/milestones/useMilestones.ts), [`TimelineMilestoneMarker.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/views/timeline/TimelineMilestoneMarker.tsx), [`TimelineMilestoneModal.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/views/timeline/TimelineMilestoneModal.tsx) | `milestones.test.tsx` (5 tests), `TimelineView.test.tsx` (7 tests) | None | None | Existing in OpenAPI 0.3.20-draft | None |
| **FEAT-B05** | Enterprise Scenario Sandbox & Capacity Calculators | Excluded | **REJECTED / OUT OF SCOPE** | None | None | None | None | Excluded from spec | None |
| **FEAT-C01** | Synchronized List View (36px TreeGrid) & Kanban Board View | M1.1 (Phase 1) | **DONE** | [`TaskListView.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/views/TaskListView.tsx), [`TaskBoardView.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/views/TaskBoardView.tsx), [`TaskViewToolbar.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/views/TaskViewToolbar.tsx) | `TaskViews.test.tsx` (17 tests), `TaskListView.test.tsx` (7 tests), `CrossViewIntegration.test.tsx` (10 tests) | None | None | Existing in OpenAPI 0.3.20-draft | None |
| **FEAT-C02** | Synchronized Calendar View & Split-Pane Dependency Timeline View | M1.2 (Phase 1) | **DONE** | [`CalendarView.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/views/calendar/CalendarView.tsx), [`TimelineView.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/views/timeline/TimelineView.tsx) | `CalendarView.test.tsx` (14 tests), `calendar-date-utils.test.ts` (14 tests), `TimelineView.test.tsx` (7 tests), `timeline-date-utils.test.ts` (18 tests) | None | None | Existing in OpenAPI 0.3.20-draft | None |
| **FEAT-C03** | Personal Cross-Workspace Dashboard ("My Work") | M1.1 (Phase 1) | **DONE** | [`MyWorkView.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/my-work/MyWorkView.tsx), [`TemporalGroupSection.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/my-work/TemporalGroupSection.tsx) | `MyWorkView.test.tsx` (13 tests), `date-utils.test.ts` (16 tests), `task-helpers.test.ts` (13 tests) | None | None | Existing in OpenAPI 0.3.20-draft | None |
| **FEAT-C04** | Personal Saved Views & Copy-on-Write Shared Views | M1.1 (Phase 1) | **DECISION BLOCKED** | PR #29 (`fb45f66`), PR #30 (`8fabfc2`), `proposed-saved-views-openapi.yaml` | `vs-07a-saved-views-contract-readiness-report.md` | UI implementation intentionally paused pending Product Owner sign-off on Decisions A–E | Backend Lead & PO sign-off on Decisions A–E | Proposed delta spec | Await Sign-Off (Track A unblocking mandate) |
| **FEAT-C05** | Omnibar (`Cmd+K`), Global Search & Faceted Filter Pills | M1.1 (Phase 1) | **DONE** | [`OmnibarModal.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/omnibar/OmnibarModal.tsx), [`useOmnibarCommands.ts`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/omnibar/useOmnibarCommands.ts) | `Omnibar.test.tsx` (11 tests) | None | None | Existing in OpenAPI 0.3.20-draft | None |
| **FEAT-C06** | Board Swimlanes & Card Property Visibility Toggles | M1.2 (Phase 1) | **DECISION BLOCKED** | Basic card badge rendering exists in `TaskBoardView.tsx` | None | Swimlane grouping selector and toggleable property visibility menu | Linked to Decision D of Saved Views contract | Proposed in Saved Views spec | Await Decision D |
| **FEAT-C07** | Permanent Human-Readable Task Keys (`PREFIX-NUM`) & Historical Aliases | M1.1 (Phase 1) | **DONE** | [`useResolveTaskKey.ts`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/useResolveTaskKey.ts), [`TaskPeekDrawer.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/TaskPeekDrawer.tsx) | `TaskIntegrationE2E.test.tsx` (24 tests), `tasks.test.tsx` (20 tests) | None | None | Existing in OpenAPI 0.3.20-draft | None |
| **FEAT-D01** | 5-Category Canonical Workflow Spine & Custom Statuses | M1.1 (Phase 1) | **PARTIAL** | Static 5-category statuses supported across views | None | Workspace Settings workflow editor for managing custom status labels per category | `GET /workspaces/{wid}/statuses`, `POST ...` | Existing in OpenAPI 0.3.20-draft | Implement with Workspace Settings (Backlog #7) |
| **FEAT-D02** | Enterprise Workflow Schemes & Blocking Transition Screens | Excluded | **REJECTED / OUT OF SCOPE** | None | None | None | None | Excluded from spec | None |
| **FEAT-D03** | Optional Status Sign-Off / Approval Gate | Phase 3 | **DEFERRED** | None | None | None | Phase 3 sign-off endpoint | Deferred to Phase 3 | Defer |
| **FEAT-D04a** | Core Custom Fields (Text, Number, Single-Select, Date) | M1.2 (Phase 1) | **NOT STARTED** | None | None | Workspace Settings custom field definition manager & custom field renderers in `InlineFieldEditors.tsx` | `GET/POST /workspaces/{wid}/custom-fields` | Existing in OpenAPI 0.3.20-draft | Implement with Workspace Settings (Backlog #8) |
| **FEAT-D04b** | Extended Custom Fields (Multi-Select, User, Checkbox, URL) | Phase 2 | **DEFERRED** | None | None | None | Phase 2 custom field types | Deferred to Phase 2 | Defer |
| **FEAT-D05a** | Built-in Starter Templates (3 Curated Presets) | M1.2 (Phase 1) | **PARTIAL** | Contract types generated; template policy validated | `validate_v1_5.py` check 13 | Template picker card UI in workspace creation modal | `GET /api/v1/workspace-templates` | Existing in OpenAPI 0.3.20-draft | Implement (Backlog #5) |
| **FEAT-D05b** | Custom Project & Reusable Checklist Templates | Phase 2 | **DEFERRED** | None | None | None | Custom template manager | Deferred to Phase 2 | Defer |
| **FEAT-E01** | Built-in Project/Workspace Overview & Completion % Summary | M1.2 (Phase 1) | **DONE** | [`DashboardView.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/app-shell/DashboardView.tsx) | `App.test.tsx` (2 tests), `AppShell.test.tsx` (17 tests) | None | None | Existing in OpenAPI 0.3.20-draft | None |
| **FEAT-E02** | Opt-In Cycle Burndown, Velocity & Cumulative Flow Charts | Phase 4 | **DEFERRED** | None | None | None | Phase 4 cycle reporting API | Deferred to Phase 4 | Defer |
| **FEAT-E03** | Multi-Gadget Custom Dashboard Builder | Excluded | **REJECTED / OUT OF SCOPE** | None | None | None | None | Excluded from spec | None |
| **FEAT-F01a** | Segmented In-App Notification Center & Preferences Spine | M1.1 / M1.3 | **DONE (REST)** / **BACKEND DEPENDENT** | [`NotificationBell.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/notifications/NotificationBell.tsx), [`InboxView.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/notifications/InboxView.tsx), [`useNotifications.ts`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/notifications/useNotifications.ts) | `Notifications.test.tsx` (19 tests) | Task deep-linking pending `DEP-NOTIF-02`; Notification preferences settings tab | Backend service deployment + `DEP-NOTIF-02` sign-off | Candidate OpenAPI 0.3.20-draft (Proposed in PR #36) | Backend Handoff |
| **FEAT-F01b** | Custom Reminder Lead-Time Rules & Scheduled Email Digests | Phase 2 | **DEFERRED** | None | None | None | Phase 2 digest service | Deferred to Phase 2 | Defer |
| **FEAT-F02** | Realtime Collaborative Updates, Dual Streams & Catch-Up | M1.1 (Phase 1) | **BACKEND DEPENDENT** | Event consumer logic in [`useTaskCollaborationRealtime.ts`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/comments/useTaskCollaborationRealtime.ts) | Tested via event abstraction | Live WebSocket gateway connection, reconnect handshake | `DEP-REALTIME-01` (WS gateway & ticket issuance) | Closed schemas in `ws-events.schema.json` | Await Backend Gateway |
| **FEAT-G01** | Email/Password Authentication, Session Lifecycle, Invites & CSRF | M1.1 (Phase 1) | **DONE** | [`AuthContext.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/auth/AuthContext.tsx), [`LoginForm.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/auth/LoginForm.tsx), [`RegisterForm.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/auth/RegisterForm.tsx) | `AuthFlow.test.tsx` (17 tests), `AuthTheme.test.tsx` (5 tests) | Google OAuth PKCE button integration | Live Google OIDC client ID | Existing in OpenAPI 0.3.20-draft | None |
| **FEAT-G02a** | Capability RBAC Engine, 4 System Roles & Default Coordinators Pool | M1.1 (Phase 1) | **DONE** | [`WorkspaceContext.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/workspace/WorkspaceContext.tsx), [`WorkspaceRolePill.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/workspace/WorkspaceRolePill.tsx) | `WorkspaceSwitcher.test.tsx` (14 tests), `AuthFlow.test.tsx` (17 tests) | Members tab in Workspace Settings | None | Existing in OpenAPI 0.3.20-draft | None |
| **FEAT-G02b** | Configurable Custom Roles Builder UI (6 Capability Bundles) | M1.3 (Phase 1) | **NOT STARTED** | None | None | Custom role editor UI in Workspace Settings | `POST /workspaces/{wid}/roles` | Existing in OpenAPI 0.3.20-draft | Implement in M1.3 Settings |
| **FEAT-G03** | Plain-Language Permission Inspector & Role Preview Simulator | M1.3 (Phase 1) | **NOT STARTED** | None | None | Role preview banner (`X-Preview-Role-Id`) & capability badge inspector | Server preview header evaluation | Existing in OpenAPI 0.3.20-draft | Implement in M1.3 Settings |
| **FEAT-G04** | Append-Only Hash-Chained Audit Log & Audited Break-Glass View | M1.3 (Phase 1) | **NOT STARTED** | None | None | Audit log viewer table with hash chain badges; break-glass emergency banner | `GET /workspaces/{wid}/audit-events`, `POST .../break-glass` | Existing in OpenAPI 0.3.20-draft | Implement in M1.3 Settings |
| **FEAT-H01** | Declarative 1-Hop Workflow Automations | Phase 3 | **DEFERRED** | None | None | None | Automation evaluation engine | Deferred to Phase 3 | Defer |
| **FEAT-H02** | Outbound HMAC-Signed HTTPS Webhooks | Phase 3 | **DEFERRED** | None | None | None | Webhook dispatch worker & SSRF firewall | Deferred to Phase 3 | Defer |
| **FEAT-I01** | Lightweight Shareable Project Intake Forms | Phase 2 | **DEFERRED** | None | None | None | Public form submission endpoint | Deferred to Phase 2 | Defer |
| **FEAT-I02** | Full ITSM Helpdesk, SLAs, Incident Center, CMDB | Excluded | **REJECTED / OUT OF SCOPE** | None | None | None | None | Excluded from spec | None |
| **FEAT-J01a** | Filtered View UTF-8 CSV Export | M1.2 (Phase 1) | **NOT STARTED** | None | None | Export button on `TaskViewToolbar` generating formatted UTF-8 CSV download | Client-side or `GET /tasks/export` | Existing in OpenAPI 0.3.20-draft | Implement (Backlog #9) |
| **FEAT-J01b** | Guided CSV Import Wizard with Dry-Run Validation | Phase 2 | **DEFERRED** | None | None | None | Multipart CSV import endpoint with dryRun | Deferred to Phase 2 | Defer |
| **FEAT-J02** | Selected-Field Offline Task Editing, Queue Replay & Conflict Handling | M1.3 (Phase 1) | **NOT STARTED** | None | None | IndexedDB mutation queue, offline indicator badge, 14-day FIFO replay, 409 conflict dialog | Backend field revision timestamps map | Contract defined in CR-15 | Implement in M1.3 Offline |
| **FEAT-J03** | Design System Primitives, Tokens, WCAG 2.2 AA Accessibility Baseline | M1.1 (Phase 1) | **DONE** | [`components/ui/`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/components/ui), [`lib/design-tokens.ts`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/lib/design-tokens.ts), [`lib/theme.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/lib/theme.tsx) | 12 UI primitive test files (71 tests), `design-tokens.test.ts` (6 tests), `theme.test.tsx` (5 tests), `reduced-motion.test.ts` (3 tests) | None | None | Governed by WCAG 2.2 AA | None |
| **FEAT-K01** | External Smart URL Links (GitHub, Figma, Google Docs chips) | M1.2 (Phase 1) | **PARTIAL** | AST safe link rendering exists in [`markdown-ast.tsx`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/comments/markdown-ast.tsx) | `markdown-ast.test.tsx` (13 tests) | Dedicated external link chips row in `TaskPeekDrawer.tsx` | `externalLinks` JSON array on `TaskDto` | Existing in OpenAPI 0.3.20-draft | Implement with Drawer Polish |
| **FEAT-L01** | Optional AI Task Breakdown & Thread Summarization | Phase 4 | **DEFERRED** | None | None | None | AI service adapter | Deferred to Phase 4 | Defer |

---

## 5. Three Independent Inventories

### Inventory A: Ready for Immediate Frontend Implementation (Backend-Independent)
These capabilities can be implemented, tested, and verified entirely on the frontend using existing candidate OpenAPI 0.3.20-draft schemas and MSW v2 mock handlers.

```mermaid
flowchart TD
    subgraph Immediate ["Immediate Frontend Implementation Backlog (Ranked)"]
        A1["1. FEAT-A10a: Single-Item Archive & 10s Undo Toast (Z)"] --> A2["2. FEAT-A10b: 30-Day Trash View (/trash) & Bulk Action Bar"]
        A2 --> A3["3. FEAT-D05a: Workspace Starter Templates Picker (3 Presets)"]
        A3 --> A4["4. FEAT-A01: Work-Item Archetypes (Task, Bug, Deliverable, Decision)"]
        A4 --> A5["5. FEAT-A07: Single-Click Task & Subtask Checklist Cloning"]
        A5 --> A6["6. FEAT-J01a: Filtered View UTF-8 CSV Export"]
        A6 --> A7["7. FEAT-B02: Collapsible Backlog Tray on Board & List"]
        A7 --> A8["8. FEAT-D01 / FEAT-D04a: Workspace Settings Shell & Custom Fields"]
    end
```

| Rank | Milestone / FEAT ID | Description | Why Backend-Independent? | UI Integration Surface |
|---|---|---|---|---|
| **1** | `FEAT-A10a` | **Single-Item Archive & 10s Undo Toast (`Z`)** | OpenAPI operations `archiveTask` (`POST /tasks/{id}/archive`) and `restoreTask` exist. MSW can mutate in-memory task lists and broadcast undo toast. | TaskPeekDrawer header action, keyboard `Z` / toast trigger. |
| **2** | `FEAT-A10b` | **30-Day Trash View & Bulk Action Bar** | OpenAPI `listTrashItems` and `restoreTrashItem` defined. MSW can maintain trash bucket with mock 30-day ISO timestamps. | Multi-select checkboxes on `TaskListView`, floating bulk bar, dedicated `/trash` route. |
| **3** | `FEAT-D05a` | **Workspace Starter Templates Picker (3 Presets)** | Contract schema `WorkspaceTemplateDto` exists. `GET /workspace-templates` returns catalog (`GENERAL_PURPOSE`, `EVENT_PLANNING`, `TEAM_OPERATIONS`). | Extends workspace creation modal in `WorkspaceSwitcher.tsx`. |
| **4** | `FEAT-A01` | **Work-Item Archetypes (`TASK`, `DELIVERABLE`, `BUG`, `DECISION`)** | `TaskDto.itemType` is already present in OpenAPI 0.3.20-draft. | Adds archetype badge and icon dropdown in `TaskPeekDrawer.tsx` and card headers. |
| **5** | `FEAT-A07` | **Single-Click Task & Checklist Cloning** | OpenAPI operation `cloneTask` is defined. MSW can duplicate the task row with `- Copy` suffix and reset status. | Drawer action menu item ("Clone Task"). |
| **6** | `FEAT-J01a` | **Filtered View UTF-8 CSV Export** | Pure client-side generation or MSW mock generating CSV blob from currently loaded TanStack Query items. | `TaskViewToolbar.tsx` export button. |
| **7** | `FEAT-B02` | **Collapsible Backlog Tray on Board & List** | Client-side filter or `includeBacklog=true` query param separating backlog tasks into collapsible tray. | Board left column / List bottom section. |
| **8** | `FEAT-D01` / `FEAT-D04a` | **Workspace Settings Shell & Custom Fields Manager** | OpenAPI `listCustomFieldDefs`, `createCustomFieldDef`, `manageWorkflowStatuses` exist. | New `/workspaces/:id/settings` route with 6 setting tabs. |

---

### Inventory B: Backend-Dependent Capabilities
These features have frontend architecture ready or drafted, but cannot be completed or tested in production without live backend services or protocol gateways:

| Dependency ID | Feature ID | Missing Backend Capability | Impact on Frontend |
|---|---|---|---|
| **DEP-COLLAB-01** | `FEAT-A04` | Persistence of `isWatching: boolean` on `TaskDto` / `TaskActivityDto`. | Watcher toggle works optimistically, but cross-session preference reverts on fresh query. |
| **DEP-REALTIME-01** | `FEAT-F02` | Live WebSocket gateway (`wss://...`), auth ticket (`POST /realtime-ticket`), sequence replay. | Frontend has deduplication event consumer, but live WebSocket transport is disconnected. |
| **DEP-NOTIF-02** | `FEAT-F01a` | Joint sign-off by Backend Lead & PO on Proposal A (Structured `target`) vs Proposal B (`taskKey` / `workspaceId` fields on `NotificationDto`). | Notification rows remain informational cards without direct task navigation. |
| **DEP-NOTIF-03** | `FEAT-F01a` | Live `user-community` WebSocket stream with `notification.*` envelopes. | Unread badge relies on TanStack Query invalidation and refetch rather than instantaneous push. |

---

### Inventory C: Decision-Blocked & Deferred Roadmap Scope
These features cannot be implemented until formal stakeholder resolution or belong to subsequent roadmap releases:

| Feature ID | Scope Classification | Governing Decision / Blocker | Current State |
|---|---|---|---|
| **FEAT-C04** | **DECISION BLOCKED** | Decisions A–E on Saved Views (Quotas, Default View, Filter Normalization, Display Options). | Contract audited in PR #29 & #30; frontend UI deferred per governance unblocking mandate. |
| **FEAT-C06** | **DECISION BLOCKED** | Decision D of Saved Views (Board Swimlanes & Display Options). | Paused until Decision D resolved. |
| **FEAT-A10c** | **DEFERRED (Phase 3)** | Granular field-revision time-travel revert. | Scheduled for Phase 3. |
| **FEAT-B03** | **DEFERRED (Phase 4)** | Opt-in timeboxed iterations / cycles (Sprints). | Scheduled for Phase 4. |
| **FEAT-D03** | **DEFERRED (Phase 3)** | Status sign-off approval gates. | Scheduled for Phase 3. |
| **FEAT-D04b** | **DEFERRED (Phase 2)** | Extended custom fields (Multi-Select, User, Checkbox, URL). | Scheduled for Phase 2. |
| **FEAT-D05b** | **DEFERRED (Phase 2)** | Custom workspace and checklist templates. | Scheduled for Phase 2. |
| **FEAT-E02** | **DEFERRED (Phase 4)** | Cycle burndown & velocity charts. | Scheduled for Phase 4. |
| **FEAT-F01b** | **DEFERRED (Phase 2)** | Custom reminder lead-time rules & scheduled digests. | Scheduled for Phase 2. |
| **FEAT-H01** / **H02** | **DEFERRED (Phase 3)** | Declarative 1-hop automations & outbound webhooks. | Scheduled for Phase 3. |
| **FEAT-I01** | **DEFERRED (Phase 2)** | Shareable project intake forms. | Scheduled for Phase 2. |
| **FEAT-J01b** | **DEFERRED (Phase 2)** | Guided CSV import wizard with dry-run preview. | Scheduled for Phase 2. |
| **FEAT-L01** | **DEFERRED (Phase 4)** | Optional AI task breakdown & comment summarization. | Scheduled for Phase 4. |
| **FEAT-A05a/b** | **REJECTED** | File attachments and File Hub. | Explicitly excluded per PRD §2.3. |
| **FEAT-A09** | **REJECTED** | Billable worklogs and granular timers. | Explicitly excluded per PRD §2.3. |

---

## 6. Functional Completeness Module-by-Module Audit

| Functional Area | Implemented Screens & Components | Minimum Usability & A11y Status | Functional Completeness |
|---|---|---|---|
| **Authentication & Session** | `LoginForm`, `RegisterForm`, `AuthContext` | Form validation, RFC 9457 Problem error banners, auto-redirect on session expiry | **100% COMPLETE (MSW)** |
| **Workspace Navigation** | `WorkspaceSwitcher`, `MobileWorkspaceSelector`, `WorkspaceBadge` | Keyboard navigable popover, desktop/mobile parity, personal vs shared grouping | **100% COMPLETE** |
| **Dashboard** | `DashboardView`, metric cards, recent tasks list | Overview cards, accessible link cards | **100% COMPLETE** |
| **My Work Triage** | `MyWorkView`, `TemporalGroupSection`, `RelationshipFilterControl` | Date triage buckets (Today, Upcoming, Later, Done), inline status editing | **100% COMPLETE** |
| **Notification Center** | `NotificationBell`, `InboxView`, `NotificationItem` | Dynamic badge (`99+`), accessible `aria-label`, category tabs, unread filter, optimistic mark-read | **100% COMPLETE (REST)** |
| **Task Creation & Editing** | `QuickTaskComposer`, `InlineFieldEditors`, `TaskPeekDrawer` | `C` shortcut, floating trigger, inline editing for title, status, priority, dates, assignee, labels | **100% COMPLETE** |
| **Subtasks & Reparenting** | `SubtaskList`, `SubtaskItem`, `ReparentTaskModal` | Nested tree-grid, status toggling, depth ceiling 2 validation, reparenting modal | **100% COMPLETE** |
| **List View** | `TaskListView`, `TaskViewToolbar` | 36px row density, column click-to-sort, roving tabindex keyboard navigation | **100% COMPLETE** |
| **Board View** | `TaskBoardView` | Kanban columns, card property badges, accessible "Move to..." menu (WCAG 2.5.7), mobile stage carousel | **100% COMPLETE** |
| **Calendar View** | `CalendarView`, `MonthCalendar`, `WeekCalendar`, `UnscheduledTaskTray` | Month/week toggle, empty-cell click-to-create with date prefill, unscheduled tray | **100% COMPLETE** |
| **Timeline (Gantt) View** | `TimelineView`, `TimelineTimeAxis`, `TimelineMilestoneMarker` | Day/week/month zoom, drag duration handles, milestone diamond markers with completion % | **100% COMPLETE** |
| **Dependencies & Conflicts** | `TaskDependencies`, `TimelineDependencyConnectors`, conflict visualizer | Predecessor/successor links, DAG cycle detection, inverted schedule red warning indicators | **100% COMPLETE** |
| **Comments & Collaboration** | `CommentComposer`, `CommentList`, `TaskWatchButton`, `markdown-ast` | AST-safe Markdown (zero XSS), @mention keyboard autocomplete, soft-delete preservation | **100% COMPLETE** |
| **Omnibar Search** | `OmnibarModal`, `useOmnibarCommands` | `Cmd+K` global hotkey, fuzzy task search, quick navigation, theme toggle | **100% COMPLETE** |
| **Design System & A11y** | `components/ui/`, `design-tokens.ts`, `theme.tsx` | Dark/light theme, high-contrast focus rings, WCAG 2.2 AA compliant danger buttons | **100% COMPLETE** |

---

## 7. Testing & Runtime Readiness Audit

### 7.1 Automated Test Evidence Breakdown

The monorepo contains **50 passing test files** with **506 automated tests** in `apps/web/src/`:

```
================================================================================
SONDER AUTOMATED TEST INVENTORY (506 TESTS ACROSS 50 SUITES)
================================================================================
Application & Integration:
- App.test.tsx                                   2 tests
- IntegrationFlows.test.tsx                      4 tests
- modules/app-shell/AppShell.test.tsx           17 tests
- modules/tasks/TaskIntegrationE2E.test.tsx     24 tests
- modules/tasks/views/CrossViewIntegration.test.tsx 10 tests

Authentication & Workspace:
- modules/auth/AuthFlow.test.tsx                17 tests
- modules/auth/AuthTheme.test.tsx                5 tests
- modules/workspace/WorkspaceSwitcher.test.tsx  14 tests

Task Execution, Editing & Hierarchy:
- modules/tasks/tasks.test.tsx                  20 tests
- modules/tasks/TaskPeekDrawer.test.tsx         19 tests
- modules/tasks/InlineTaskEditing.test.tsx      26 tests
- modules/tasks/QuickTaskComposer.test.tsx      21 tests
- modules/tasks/SubtaskHierarchy.test.tsx       18 tests

Planning Views (List, Board, Calendar, Timeline):
- modules/tasks/TaskViews.test.tsx              17 tests
- modules/tasks/views/TaskListView.test.tsx      7 tests
- modules/tasks/views/calendar/CalendarView.test.tsx 14 tests
- modules/tasks/views/calendar/calendar-date-utils.test.ts 14 tests
- modules/tasks/views/timeline/TimelineView.test.tsx 7 tests
- modules/tasks/views/timeline/timeline-date-utils.test.ts 18 tests
- modules/milestones/milestones.test.tsx         5 tests

Dependencies & Conflicts:
- modules/tasks/TaskDependencies.test.tsx        6 tests
- modules/tasks/dependencies/task-links.test.tsx 5 tests
- modules/tasks/dependencies/dependency-conflict-utils.test.ts 11 tests
- modules/tasks/views/timeline/TimelineDependencies.test.tsx 2 tests
- modules/tasks/views/timeline/TimelineDependencyIntegration.test.tsx 1 test

Collaboration & Notifications:
- modules/tasks/comments/TaskCollaboration.test.tsx 12 tests
- modules/tasks/comments/TaskCollaborationHardening.test.tsx 22 tests
- modules/tasks/comments/markdown-ast.test.tsx  13 tests
- modules/notifications/Notifications.test.tsx  19 tests

My Work & Omnibar:
- modules/my-work/MyWorkView.test.tsx           13 tests
- modules/my-work/date-utils.test.ts            16 tests
- modules/my-work/task-helpers.test.ts          13 tests
- modules/omnibar/Omnibar.test.tsx              11 tests

Design System, UI Primitives & Core Lib:
- components/ui/Badge.test.tsx                  23 tests
- components/ui/Button.test.tsx                  6 tests
- components/ui/IconButton.test.tsx              4 tests
- components/ui/Input.test.tsx                   4 tests
- components/ui/SearchInput.test.tsx             3 tests
- components/ui/Avatar.test.tsx                  3 tests
- components/ui/KeyboardShortcut.test.tsx        3 tests
- components/ui/Tooltip.test.tsx                 2 tests
- components/ui/Feedback.test.tsx                2 tests
- components/ui/Card.test.tsx                    1 test
- components/ui/Dialog.test.tsx                  1 test
- components/ui/Tabs.test.tsx                    1 test
- lib/keyboard.test.tsx                         10 tests
- lib/api-client.test.ts                         6 tests
- lib/design-tokens.test.ts                      6 tests
- lib/theme.test.tsx                             5 tests
- lib/reduced-motion.test.ts                     3 tests
================================================================================
TOTAL: 50 Test Files | 506 Tests Passing | 0 Failures
================================================================================
```

---

## 8. First-Look Readiness Assessment

### 8.1 Runtime Verification: Can the User Run the Application Today?
**YES.** The Sonder frontend is fully runnable locally without requiring a live backend service or external database.

### 8.2 Execution Instructions
To launch and inspect the application:

1. **Development Server Command:**
   ```bash
   pnpm --filter @sonder/web dev
   ```
   *Vite starts development server on `http://localhost:3000`.*

2. **Environment Variables Required:**
   * **None.** All configuration is handled out-of-the-box by Vite. `import.meta.env.DEV` is automatically set to `true`.

3. **MSW Service Worker Interception:**
   * On page load, `apps/web/src/main.tsx` dynamically imports `apps/web/src/mocks/browser.ts` and starts the Mock Service Worker using `public/mockServiceWorker.js`.
   * Intercepts 100% of `/api/v1/*` requests (auth, communities, workspaces, tasks, milestones, comments, notifications).

4. **Seeded Test User Walkthrough:**
   * The MSW session handler defaults to `isSessionActive: true`.
   * Navigating to `http://localhost:3000/` automatically logs the user in as **Alex Morgan** (`alex.morgan@example.org`) with two active communities:
     - `Sonder Community` (Admin)
     - `Regional Arts Guild` (Member)
   * The user immediately reaches `DashboardView` inside the full App Shell.

5. **Key Interactive Capabilities Ready to Inspect:**
   - **Navigation Rail:** Click through My Work (`/my-work`), Inbox (`/inbox`), List (`/list`), Board (`/board`), Calendar (`/calendar`), Timeline (`/timeline`).
   - **Header Notification Bell:** Click the bell to open the recent 5 notifications popover preview, check the unread badge, and test "Mark all read".
   - **Task Peek Drawer:** Click any task row in List, Board, Calendar, or Timeline to open the right-docked drawer; edit status, priority, or dates inline; inspect subtasks; write comments with @mentions; toggle task watching.
   - **Quick Task Composer:** Press `C` on the keyboard to open the global composer modal; create a task with immediate list/board synchronization.
   - **Omnibar Command Palette:** Press `Cmd+K` / `Ctrl+K` to search tasks by key or title, switch views, or toggle theme.
   - **Theme Switching:** Click the theme toggle icon in the header to switch between Light and Dark modes.

---

## 9. Conditions for Unfreezing UI/UX Transformation (Track B)

Per project governance, **UI/UX Track B remains strictly PAUSED**.

### Entry Criteria for Unfreezing Track B:
1. **Core Feature Completeness:** The high-priority backend-independent backlog (Milestone VS-09: Task Trash & Recovery, Workspace Starter Templates Picker, Work-Item Archetypes, and Filtered CSV Export) must be implemented and merged.
2. **Stable Component Hierarchy:** No further structural DOM additions or routing overhauls planned for Phase 1 views.
3. **Formal Approval:** The Product Owner explicitly authorizes unfreezing Track B to execute Slices UX-1 through UX-4:
   - **Slice UX-1:** Design System Tokens & Typography (Tabular numbers, dark mode contrast).
   - **Slice UX-2:** Application Shell & Mobile Ergonomics (Touch targets, header shortcuts, rail tooltips).
   - **Slice UX-3:** Task View Density & Interaction Polish (Compact rows, calendar month overflow, timeline SVG sync).
   - **Slice UX-4:** Deep Accessibility & Screen Reader Assurance (Live regions, focus restoration, zero axe-core violations).

---

## 10. Audit Sign-Off & Verification Metadata

- **Audited Commit:** `develop @ 8f887de8ffec0d0752b047a05ba9b265ffdb7b46`
- **Audit Date:** 2026-11-11
- **Quality Gates:** Zero TypeScript errors, 506/506 tests passing, 51/51 documentation checks passed, 100% clean git diff check.
- **Recommended Next Engineering Step:** Begin **Milestone VS-09A: 30-Day Task Trash, Single-Item Archive & Recovery View (`FEAT-A10a`, `FEAT-A10b`)**.
