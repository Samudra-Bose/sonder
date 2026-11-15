# SONDER — FRONTEND COMPLETION TRACKER & ROADMAP BASELINE

**Document Version:** 1.7.0<br/>
**Last Synchronized:** 2026-11-15<br/>
**Current Baseline Commit:** `feat/FE-VS12-frontend-completeness-baseline @ 048f70d`<br/>
**Engineering Domain:** Frontend Only (Backend implementation & infrastructure owned by Backend Developer)<br/>
**Governance Standard:** Dual-Track Engineering & UI/UX Governance (PLAN → GRILL → IMPLEMENT → TEST → REVIEW → LOCK → DOCUMENT)<br/>
**Milestone:** FE-VS12 — Frontend Roadmap Reconciliation & Completeness Baseline<br/>
**Status Recommendation:** `PHASE 1 CORE FRONTEND FOUNDATION DELIVERED (86.36% WEIGHTED COMPLETION). REMAINING WORK BOUNDED TO CONTRACT-GATED CAPABILITIES & PHASE 2–4 ROADMAP.`

---

## 1. Executive Summary

Milestone **FE-VS12** establishes an authoritative, evidence-based baseline of Sonder's frontend feature completeness. Sonder's engineering responsibilities are strictly divided: our team builds the **frontend only**, while a separate developer owns backend runtime services, databases, RLS policies, and deployment infrastructure.

Our mandate is to ensure every approved frontend user workflow, interaction pattern, form validation, error/empty/loading state, and capability gate is fully implemented and functionally verified against OpenAPI contracts and MSW mock handlers before unfreezing dedicated UI/UX Track B implementation.

### Key Baseline Findings:
1. **Frontend Foundation Fully Operational:**
   * Automated verification across `apps/web/` stands at **64 test suites, 693 tests passing (100% green)** in Vitest with zero TypeScript compilation errors.
   * All 8 backend-independent Phase 1 milestones from Inventory A (`VS-09A` through `VS-09H`) plus M1.3 governance slices (`VS-09I` Permission Inspector, `VS-09J` Audit Log Table & CSV Export, `VS-09L` Release Hardening) are fully implemented, verified, and locked.
2. **Strict Frontend / Backend Responsibility Boundary:**
   * Frontend completeness is evaluated by client-side workflows, responsive components, URL synchronization, optimistic UI, state machines, and MSW contract fidelity.
   * Milestone `VS-10` (Authorization Foundation) and Milestone `VS-11` (Live Backend Runtime Package `@sonder/server`) established backend integration baselines. Those deliverables represent backend-owner handoff infrastructure and do NOT expand frontend engineering obligations.
   * Passing frontend tests against MSW mocks does not claim live production backend ACID correctness or database persistence; it confirms frontend client readiness to integrate.
3. **Canonical Hierarchy & Design System Preservation:**
   * Canonical hierarchy remains: $\text{Community} \longrightarrow \text{Workspace} \longrightarrow \text{Task} \longrightarrow \text{Subtask}$ (depth 1–2).
   * UI/UX Track B remains **PAUSED**. No visual redesign, decorative changes, or theme rewrites were introduced.
4. **Authoritative Metric Summary (Phase 1 Initial-Production Scope):**
   * **In-Scope Frontend Capabilities:** 33 concrete capabilities.
   * **FE COMPLETE:** 28 capabilities (84.85%).
   * **FE PARTIAL:** 1 capability (`FEAT-K01`, Smart URL Chips).
   * **FE NOT STARTED:** 0 capabilities (0.00%).
   * **FE BLOCKED (Product Decisions / Contract Gaps):** 3 capabilities (`FEAT-C04`, `FEAT-C06`, `FEAT-G02b`).
   * **BACKEND DEPENDENT:** 1 capability (`FEAT-F02`, Real-Time Presence / WebSocket).
   * **Weighted Frontend Completeness:** **86.36%**.
   * **Functional Verification Coverage:** **100%** of implemented frontend capabilities (29/29) possess dedicated automated Vitest test suites.

---

## 2. Source-of-Truth Hierarchy & Precedence Rules

To prevent scope creep, misattributed dependencies, and silent requirements drift, project documentation adheres to the following explicit order of precedence:

1. **Tier 1 — Master Product Specification & Governance Decisions:**
   * `Community-Work-Management-Master-Specification-v1.5.0.md`
   * `Community-Work-Management-v1.5/docs/01-product/master-prd.md`
   * `Community-Work-Management-v1.5/docs/00-governance/decision-register.md`
   * *Rule:* Formal stakeholder decisions (DEC-OPEN-*, SOT-*) override tracker summaries or provisional drafts.
2. **Tier 2 — Contract Infrastructure & API Specifications:**
   * `packages/contracts/src/api-types.ts` & `openapi-0.3.20-draft.yaml`
   * `packages/contracts/src/ws-events-types.ts` & `ws-protocol-types.ts`
   * *Rule:* The frontend must consume contract-defined DTOs and endpoints; frontend developers must never invent API endpoints, request bodies, or capability names.
3. **Tier 3 — Delivery Trackers & Execution Roadmaps:**
   * `docs/04-implementation/sonder-frontend-completion-tracker.md` (this document)
   * `docs/04-implementation/sonder-project-progress-tracker.md`
   * `docs/04-implementation/sonder-overall-delivery-tracker.md`
   * *Rule:* Trackers reflect verified implementation evidence and must remain strictly synchronized with Tier 1 and Tier 2.

---

## 3. Comprehensive 70-Pattern Feature Inventory & Accounting

Across the Master Specification and PRD, exactly **70 canonical `FEAT-` patterns** are documented:
* **Group 1: Actionable Concrete Capabilities:** 53 items
* **Group 2: Composite Parent Identifiers:** 7 items (decomposed into concrete sub-features)
* **Group 3: Historical Research Boundary Citations:** 10 items (non-actionable family bounds)

```
================================================================================
CANONICAL FEATURE INVENTORY ACCOUNTING (ALL 70 PATTERNS)
================================================================================
Group 1: Actionable Concrete Capabilities (Families A through L):      53 items
Group 2: Composite Parent Identifiers (Subdivided into sub-features):   7 items
Group 3: Historical Research Family Boundary References:               10 items
--------------------------------------------------------------------------------
TOTAL CANONICAL FEAT PATTERNS ACCOUNTED FOR:                           70 items
================================================================================
```

### Mutual Exclusion Accounting of Actionable Capabilities (53 Features)
Every actionable capability is assigned **exactly one mutually exclusive status**:
* **FE COMPLETE (Phase 1):** 28
* **FE PARTIAL (Phase 1):** 1 (`FEAT-K01`)
* **FE NOT STARTED (Phase 1):** 0
* **FE BLOCKED (Phase 1):** 3 (`FEAT-C04`, `FEAT-C06`, `FEAT-G02b`)
* **BACKEND DEPENDENT (Phase 1):** 1 (`FEAT-F02`)
* **DEFERRED (Phases 2, 3, 4):** 13
* **REJECTED / OUT OF SCOPE:** 7
* **Total Actionable Capabilities:** $28 + 1 + 0 + 3 + 1 + 13 + 7 = 53$

---

## 4. Definitive 53-Feature Evaluation Matrix (5 Independent Dimensions)

Each feature is evaluated across five distinct, uncollapsed dimensions:
1. **Frontend Implementation:** `FE COMPLETE` | `FE PARTIAL` | `FE NOT STARTED` | `FE BLOCKED` | `DEFERRED` | `REJECTED`
2. **Functional Verification:** `VERIFIED` | `PARTIALLY VERIFIED` | `NOT VERIFIED`
3. **API Contract Readiness:** `CONTRACT READY` | `CONTRACT GAP` | `CONTRACT AMBIGUOUS` | `NOT APPLICABLE`
4. **Backend Handoff Readiness:** `READY FOR BACKEND INTEGRATION` | `BACKEND CONTRACT DEPENDENCY` | `INTEGRATION PENDING` | `NOT APPLICABLE`
5. **UI/UX Phase Readiness:** `READY FOR UI/UX PHASE` | `PENDING FE COMPLETION` | `NOT APPLICABLE`

### Group 1: Actionable Concrete Capabilities (53 Features)

| Feature ID & Name | Phase | FE Status | Verification | Contract Status | Backend Handoff | UI/UX Readiness | Acceptance Criteria Completed & Remaining Work | Blocking Dependency | Evidence / Test Location | Recommended Action |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **FEAT-A01**<br/>Work-Item Archetypes (`TASK`, `DELIVERABLE`, `BUG`, `DECISION`) | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Archetype dropdown, cards & drawer badges, color tokens, permission checks.<br/>**Remaining:** None on frontend. | None | `InlineArchetypeEditor.tsx`<br/>`TaskArchetypes.test.tsx` (16) | Ready for backend integration; preserve frozen UI. |
| **FEAT-A02**<br/>Fast Task Creation, Peek Drawer & Deep Linking | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** `C` hotkey composer, peek drawer, URL sync (`?task=:id`), title/description edit, assignee select.<br/>**Remaining:** None on frontend. | None | `QuickTaskComposer.tsx`<br/>`TaskPeekDrawer.test.tsx` (19)<br/>`QuickTaskComposer.test.tsx` (21) | Maintain contract conformance. |
| **FEAT-A03**<br/>Core Task Metadata (Status, Priority, Dates, Labels, Estimate) | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Inline click-to-edit, optimistic updates, rollback on error, keyboard controls (Escape/Enter).<br/>**Remaining:** None on frontend. | None | `InlineFieldEditors.tsx`<br/>`InlineTaskEditing.test.tsx` (26) | Ready for backend integration. |
| **FEAT-A04**<br/>Comments, @Mentions, #KEY Links & Task Watchers | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Threaded comment composer, AST-safe markdown parsing, user mention autocomplete, optimistic watcher toggle.<br/>**Remaining:** None on frontend. | DEP-COLLAB-01 (DB persistence), DEP-REALTIME-01 (WS sync) | `CommentComposer.tsx`<br/>`TaskCollaboration.test.tsx` (12)<br/>`TaskCollaborationHardening.test.tsx` (22) | Ready for backend integration. |
| **FEAT-A05a**<br/>Task File Attachments & Binary Uploads | Excluded | **REJECTED** | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Formally excluded from product scope to protect simplicity (PRD §2.3). | None | None | Preserve exclusion; do not implement. |
| **FEAT-A05b**<br/>Workspace File Management Hub | Excluded | **REJECTED** | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Formally excluded from product scope (PRD §2.3). | None | None | Preserve exclusion; do not implement. |
| **FEAT-A06**<br/>Subtasks (Depth 1..2) & Dependency Links (BLOCKS DAG) | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Subtask hierarchy capped at depth 2, reparenting modal, cycle-checked BLOCKS DAG connectors in Timeline.<br/>**Remaining:** None on frontend. | None | `SubtaskList.tsx`<br/>`SubtaskHierarchy.test.tsx` (18)<br/>`dependency-conflict-utils.test.ts` (11) | Maintain depth cap of 2. |
| **FEAT-A07**<br/>Task & Checklist Cloning | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Single-click clone action, subtask clone toggle, toast with link to cloned task, optimistic cache insert.<br/>**Remaining:** None on frontend. | None | `useCloneTask.ts`<br/>`TaskCloning.test.tsx` (11) | Ready for backend integration. |
| **FEAT-A08**<br/>Fractional Ranking & Manual Ordering (`rankKey` / LexoRank) | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Drag-and-drop column drop ranking, accessible Move menu for keyboard users, lexorank calculation.<br/>**Remaining:** None on frontend. | None | `TaskBoardView.tsx`<br/>`TaskViews.test.tsx` (17)<br/>`CrossViewIntegration.test.tsx` (10) | Ready for backend integration. |
| **FEAT-A09**<br/>Granular Time Tracking & Billable Worklogs | Excluded | **REJECTED** | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Formally excluded per PRD §2.3 to preserve community focus. | None | None | Preserve exclusion; do not implement. |
| **FEAT-A10a**<br/>Single-Item Archive & 10s Undo Toast (`Z` hotkey) | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Soft-delete timestamp `archivedAt`, 10s floating undo toast with countdown progress bar, `Z` hotkey, view eviction.<br/>**Remaining:** None on frontend. | None | `TaskActionsMenu.tsx`<br/>`TaskArchive.test.tsx` (32) | Frozen at `0b82ef9`. |
| **FEAT-A10b**<br/>Bulk Action Bar (<=100 tasks) & 30-Day Trash View | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Multi-select table checkboxes, bulk status/priority/archive, dedicated `/trash` view with 30-day countdown & restore.<br/>**Remaining:** None on frontend. Hard purge disabled pending DEC-OPEN-03. | DEC-OPEN-03 (Hard purge policy) | `TaskTrashView.tsx`<br/>`BulkActionBar.tsx`<br/>`TaskBulkActions.test.tsx` (8) | Maintain purge restriction. |
| **FEAT-A10c**<br/>Granular Field-Revision Snapshot Restore | Phase 3 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 3 roadmap. | None | None | Preserve deferred status. |
| **FEAT-B01**<br/>Multi-Community, Workspace Spine & Navigation Rail | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Tenant switcher, responsive navigation rail, mobile drawer with focus trap, community context routing.<br/>**Remaining:** None on frontend. | None | `AppShell.tsx`<br/>`AppShell.test.tsx` (17)<br/>`WorkspaceSwitcher.test.tsx` (14) | Ready for backend integration. |
| **FEAT-B02**<br/>Backlog Status Category & Collapsible Tray | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Collapsible Backlog tray in List and Board views, count badge, 1-click promotion to To Do, ARIA disclosure, collapsed state persistence.<br/>**Remaining:** None on frontend. | None | `BacklogTaskTray.tsx`<br/>`BacklogTaskTray.test.tsx` (14) | Ready for backend integration. |
| **FEAT-B03**<br/>Opt-In Timeboxed Iterations / Cycles | Phase 4 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 4 roadmap. | None | None | Preserve deferred status. |
| **FEAT-B04**<br/>Workspace Milestones & Target Buckets | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Optional planning markers on Timeline (DEC-OPEN-08), creation dialog, target dates, progress rollup.<br/>**Remaining:** None on frontend. | None | `TimelineMilestoneMarker.tsx`<br/>`TimelineView.test.tsx` (7)<br/>`milestones.test.tsx` (5) | Ready for backend integration. |
| **FEAT-B05**<br/>Enterprise Scenario Sandbox & Capacity Math | Excluded | **REJECTED** | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Formally excluded to prevent enterprise bloat. | None | None | Preserve exclusion. |
| **FEAT-C01**<br/>Synchronized List View (TreeGrid) & Kanban Board View | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Virtualized treegrid, column headers, mobile stage carousel, optimistic task reordering, shared query cache.<br/>**Remaining:** None on frontend. | None | `TaskListView.tsx`<br/>`TaskBoardView.tsx`<br/>`TaskListView.test.tsx` (7)<br/>`TaskViews.test.tsx` (17) | Ready for backend integration. |
| **FEAT-C02**<br/>Synchronized Calendar View & Dependency Timeline View | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Monthly & weekly calendar grids, unscheduled task tray, Gantt chart split axis, drag-to-reschedule, conflict lines.<br/>**Remaining:** None on frontend. | None | `CalendarView.tsx`<br/>`TimelineView.tsx`<br/>`CalendarView.test.tsx` (14)<br/>`TimelineView.test.tsx` (7) | Ready for backend integration. |
| **FEAT-C03**<br/>Personal Cross-Workspace Dashboard ("My Work") | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Aggregated view of assigned/created tasks across workspaces, bucketing by Overdue, Today, Upcoming, and Later.<br/>**Remaining:** None on frontend. | None | `MyWorkView.tsx`<br/>`MyWorkView.test.tsx` (13)<br/>`task-helpers.test.ts` (13) | Ready for backend integration. |
| **FEAT-C04**<br/>Saved Views (Personal vs Shared Views) | M1.1 | **FE BLOCKED** | NOT VERIFIED | CONTRACT AMBIGUOUS | BACKEND CONTRACT DEPENDENCY | PENDING FE COMPLETION | **Done:** Draft spec in `proposed-saved-views-openapi.yaml`.<br/>**Remaining:** UI for creating, saving, switching, and sharing views blocked pending product decisions. | DEP-SV-01 (Decisions A–E) | `proposed-saved-views-openapi.yaml` | Awaiting PO decision sign-off. |
| **FEAT-C05**<br/>Omnibar (`Cmd+K`), Global Search & Filter Pills | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** `Cmd+K` instant modal, fuzzy search over tasks/views/settings, keyboard arrow navigation, action dispatch.<br/>**Remaining:** None on frontend. | None | `OmnibarModal.tsx`<br/>`Omnibar.test.tsx` (11) | Ready for backend integration. |
| **FEAT-C06**<br/>Board Swimlanes & Card Property Visibility Toggles | M1.2 | **FE BLOCKED** | NOT VERIFIED | CONTRACT AMBIGUOUS | BACKEND CONTRACT DEPENDENCY | PENDING FE COMPLETION | **Done:** Card badge components exist.<br/>**Remaining:** Swimlane groupBy UI and property toggle controls blocked on Saved Views schema. | DEP-SV-01 (Decision D) | None | Awaiting Saved Views resolution. |
| **FEAT-C07**<br/>Permanent Task Keys (`PREFIX-NUM`) & Historical Aliases | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Monospace key badges, deep linking via `?task=PREFIX-NUM`, alias redirection resolution hooks.<br/>**Remaining:** None on frontend. | None | `TaskPeekDrawer.tsx`<br/>`TaskPeekDrawer.test.tsx` (19)<br/>`TaskIntegrationE2E.test.tsx` (24) | Ready for backend integration. |
| **FEAT-D01**<br/>5-Category Workflow Spine & Custom Statuses Editor | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** 5 canonical status categories (BACKLOG, TODO, IN_PROGRESS, DONE, CANCELED), custom status creator, category mapping editor.<br/>**Remaining:** None on frontend. | None | `WorkspaceSettingsLayout.tsx`<br/>`WorkflowSettingsView.tsx`<br/>`WorkspaceSettings.test.tsx` (5) | Ready for backend integration. |
| **FEAT-D02**<br/>Enterprise Workflow Schemes & Transition Screens | Excluded | **REJECTED** | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Formally excluded to preserve low cognitive overhead. | None | None | Preserve exclusion. |
| **FEAT-D03**<br/>Optional Single-Step Status Sign-Off Gate | Phase 3 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 3 roadmap. | None | None | Preserve deferred status. |
| **FEAT-D04a**<br/>Core Custom Fields (Text, Number, Single-Select, Date, Bool) | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Field schema manager, option list builder, field value renderers/editors in peek drawer, validation.<br/>**Remaining:** None on frontend. | None | `CustomFieldsSettingsView.tsx`<br/>`CustomFields.test.tsx` (7)<br/>`TaskCustomFields.test.tsx` (7) | Ready for backend integration. |
| **FEAT-D04b**<br/>Extended Custom Fields (Multi-Select, User, Checkbox, URL) | Phase 2 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 2 roadmap. | None | None | Preserve deferred status. |
| **FEAT-D05a**<br/>Built-in Starter Templates Picker UI (General, Event, Ops) | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Card picker for 3 approved templates, preview modal with pre-configured statuses and views, keyboard selection, form validation.<br/>**Remaining:** None on frontend. Backend atomic template seeding is an integration dependency. | Backend template seed runner | `CreateWorkspaceDialog.tsx`<br/>`WorkspaceTemplatesPicker.test.tsx` (15) | Provisional frontend complete. |
| **FEAT-D05b**<br/>Custom Workspace & Reusable Checklist Templates | Phase 2 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 2 roadmap. | None | None | Preserve deferred status. |
| **FEAT-E01**<br/>Workspace Overview, Completion & Workload Summary | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Workspace summary tab, completion ratio progress bar, overdue tally, per-assignee open task workload distribution.<br/>**Remaining:** None on frontend. | None | `ProjectOverviewTab.tsx`<br/>`TaskViews.test.tsx` (17) | Ready for backend integration. |
| **FEAT-E02**<br/>Agile Burndown, Velocity & Cumulative Flow Charts | Phase 4 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 4 roadmap. | None | None | Preserve deferred status. |
| **FEAT-E03**<br/>Configurable Multi-Gadget Custom Dashboard Builder | Excluded | **REJECTED** | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Formally excluded in favor of standard My Work & Overview. | None | None | Preserve exclusion. |
| **FEAT-F01a**<br/>Segmented In-App Notification Center (REST Inbox) | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Header bell badge counter, popover preview, full `/inbox` route with filters (All, Mentions, Assigned), mark-all-read.<br/>**Remaining:** None on frontend. Realtime push sync is a separate backend dependency (`DEP-NOTIF-02`). | None on frontend | `NotificationCenter.tsx`<br/>`InboxView.tsx`<br/>`Notifications.test.tsx` (19) | Ready for backend integration. |
| **FEAT-F01b**<br/>Custom Reminder Rules & Scheduled Email Digests | Phase 2 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 2 roadmap. | None | None | Preserve deferred status. |
| **FEAT-F02**<br/>Real-Time Collaborative Updates & Presence | M1.1 | **BACKEND DEPENDENT** | NOT VERIFIED | CONTRACT READY | BACKEND CONTRACT DEPENDENCY | PENDING FE COMPLETION | **Done:** Client event abstraction exists in `useRealtimeStream.ts`.<br/>**Remaining:** Live WebSocket protocol connection, reconnect backoff, presence indicators pending backend WS ticket infrastructure. | DEP-REALTIME-01 (WebSocket ticket & gateway) | `useRealtimeStream.ts` | Awaiting backend WebSocket gateway. |
| **FEAT-G01**<br/>Authentication, Session Lifecycle, Cookies & CSRF Spine | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Login/registration views, session restoration, automatic CSRF token header attachment, 401 interceptor & redirect.<br/>**Remaining:** None on frontend. | None on frontend | `AuthFlow.tsx`<br/>`AuthFlow.test.tsx` (17)<br/>`AuthTheme.test.tsx` (5) | Ready for backend integration. |
| **FEAT-G02a**<br/>Capability RBAC Engine, 4 System Roles & Permission Gates | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Client-side `PermissionGate`, role guards, authoritative capability intersection evaluator, fail-closed tenant boundary checks.<br/>**Remaining:** None on frontend. | None | `PermissionGate.tsx`<br/>`authorization.ts`<br/>`authorization.test.ts` (19)<br/>`WorkspaceSwitcher.test.tsx` (14) | Ready for backend integration. |
| **FEAT-G02b**<br/>Configurable Custom Roles Builder UI | M1.3 | **FE BLOCKED** | NOT VERIFIED | CONTRACT GAP | BACKEND CONTRACT DEPENDENCY | PENDING FE COMPLETION | **Done:** Role preview simulator exists in `FEAT-G03`.<br/>**Remaining:** Custom role creation/edit builder UI, capability bundle selector, grant ceiling validator UI blocked on backend evaluator contract. | DEP-ROLES-01 (Custom role capability contract) | None | Awaiting custom role evaluator contract. |
| **FEAT-G03**<br/>Plain-Language Permission Inspector & Role Simulator | M1.3 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Plain-language descriptions, downward-only role simulator banner, scenario sandbox, 31 canonical capabilities, type-safe `RoleCapability` mapping.<br/>**Remaining:** None on frontend. | None | `PermissionInspector.tsx`<br/>`RoleSimulator.test.tsx` (7)<br/>`authorization.test.ts` (19) | Ready for backend integration. |
| **FEAT-G04**<br/>Append-Only Hash-Chained Audit Log Table & CSV Export | M1.3 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Audit event table with SHA-256 hash chains, cryptographic verification banner, separate `actorId`/`targetId` filters, allow-listed metadata detail drawer (CR-14), formula-injection-safe CSV export gated by `audit:export`.<br/>**Remaining:** None on frontend. | None | `AuditLogSettingsView.tsx`<br/>`AuditLog.test.tsx` (22) | Ready for backend integration. |
| **FEAT-H01**<br/>Declarative 1-Hop Workflow Automations | Phase 3 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 3 roadmap. | None | None | Preserve deferred status. |
| **FEAT-H02**<br/>Outbound HMAC-Signed HTTPS Webhooks | Phase 3 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 3 roadmap. | None | None | Preserve deferred status. |
| **FEAT-I01**<br/>Lightweight Shareable Workspace Intake Forms | Phase 2 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 2 roadmap. | None | None | Preserve deferred status. |
| **FEAT-I02**<br/>Full ITSM Helpdesk Suite, SLA Clocks & Incident Command | Excluded | **REJECTED** | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Formally excluded per low-overhead community scope. | None | None | Preserve exclusion. |
| **FEAT-J01a**<br/>Filtered View UTF-8 CSV Export | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Export button on view toolbar, exports filtered and sorted tasks, UTF-8 BOM (`\uFEFF`), OWASP formula injection protection.<br/>**Remaining:** None on frontend. | None | `taskExportCsv.ts`<br/>`TaskExportCsv.test.tsx` (10) | Ready for backend integration. |
| **FEAT-J01b**<br/>Guided CSV Import Wizard with Dry-Run Validation | Phase 2 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 2 roadmap. | None | None | Preserve deferred status. |
| **FEAT-J02**<br/>Selected-Field Offline Task Editing & Queued Sync | Phase 3 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 3 per SOT-11, SOT-14, and Master Spec §1.1. IndexedDB queue, 14-day expiry, FIFO replay, and 409 conflict resolver staged for Phase 3. | None | None | Authoritatively deferred to Phase 3. |
| **FEAT-J03**<br/>Accessible Design System Primitives & Tokens (WCAG 2.2 AA) | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** 4.5:1 contrast, semantic focus ring utilities, keyboard shortcut management, theme provider (dark/light/system), reduced motion support, 13 Base UI primitives.<br/>**Remaining:** None on frontend. | None | `design-tokens.ts`<br/>`keyboard.ts`<br/>`theme.tsx`<br/>`design-tokens.test.ts` (6)<br/>`keyboard.test.tsx` (10)<br/>`theme.test.tsx` (5)<br/>`reduced-motion.test.ts` (3) | Verified across 4 foundation suites (24 tests, 70 static expect sites). |
| **FEAT-K01**<br/>External Smart URL Metadata Chips (GitHub, Figma, Docs) | M1.2 | **FE PARTIAL** | PARTIALLY VERIFIED | CONTRACT GAP | INTEGRATION PENDING | PENDING FE COMPLETION | **Done:** Safe URL rendering with `rel="noopener noreferrer"` and protocol validation in Markdown.<br/>**Remaining:** Rich OpenGraph preview chips (title, thumbnail, favicon, domain) blocked on backend scrape endpoint contract. | DEP-METADATA-01 (Metadata endpoint contract) | `markdown-ast.tsx`<br/>`markdown-ast.test.tsx` (13) | Partial frontend; awaiting scrape schema. |
| **FEAT-L01**<br/>Optional AI Task Breakdown & Thread Summarization | Phase 4 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 4 roadmap. | None | None | Preserve deferred status. |

---

### Group 2: Composite Parent Identifiers (7 Patterns)

These patterns represent multi-part parent capability headings that are formally decomposed into concrete sub-features in Group 1:

| Pattern | Title & Definition | Decomposed Child Features | Accounting Status |
| :--- | :--- | :--- | :--- |
| **FEAT-A05** | Attachments, Workspace File Index & Activity Changelog | Decomposed into `FEAT-A05a` (Rejected), `FEAT-A05b` (Rejected), and Activity Changelog | Evaluated via child sub-features in Group 1. Activity diff history implemented under `FEAT-A02`/`FEAT-A04`. |
| **FEAT-A10** | Multi-Select Bulk Operations, Archive & 30-Day Trash | Decomposed into `FEAT-A10a`, `FEAT-A10b`, `FEAT-A10c` | Evaluated strictly via child sub-features in Group 1. |
| **FEAT-D04** | Custom Fields & Field Visibility Registry | Decomposed into `FEAT-D04a` (Phase 1) and `FEAT-D04b` (Phase 2) | Evaluated strictly via child sub-features in Group 1. |
| **FEAT-D05** | Built-in Workspace Starter Templates | Decomposed into `FEAT-D05a` (Phase 1) and `FEAT-D05b` (Phase 2) | Evaluated strictly via child sub-features in Group 1. |
| **FEAT-F01** | Unified Notification Inbox, Preferences & Reminders | Decomposed into `FEAT-F01a` (Phase 1 REST) and `FEAT-F01b` (Phase 2 Digests) | Evaluated strictly via child sub-features in Group 1. |
| **FEAT-G02** | Role-Based Access Control (RBAC) & Custom Roles | Decomposed into `FEAT-G02a` (Core RBAC) and `FEAT-G02b` (Custom Roles) | Evaluated strictly via child sub-features in Group 1. |
| **FEAT-J01** | CSV Task Import & Export with Validation Preview | Decomposed into `FEAT-J01a` (Phase 1 Export) and `FEAT-J01b` (Phase 2 Import) | Evaluated strictly via child sub-features in Group 1. |

---

### Group 3: Historical Research Family Boundary References (10 Patterns)

These patterns represent research register range boundaries defined in Section 3 of the Master Specification:

| Pattern | Research Boundary Context | Accounting Status |
| :--- | :--- | :--- |
| **FEAT-B08** | Family B Upper Range Bound (`FEAT-B01 to FEAT-B08`) | Non-actionable research range boundary. |
| **FEAT-C08** | Family C Upper Range Bound (`FEAT-C01 to FEAT-C08`) | Non-actionable research range boundary. |
| **FEAT-D07** | Family D Upper Range Bound (`FEAT-D01 to FEAT-D07`) | Non-actionable research range boundary. |
| **FEAT-E07** | Family E Upper Range Bound (`FEAT-E01 to FEAT-E07`) | Non-actionable research range boundary. |
| **FEAT-F04** | Family F Intermediate Research Citation | Non-actionable research reference. |
| **FEAT-F06** | Family F Upper Range Bound (`FEAT-F01 to FEAT-F06`) | Non-actionable research range boundary. |
| **FEAT-G08** | Family G Upper Range Bound (`FEAT-G01 to FEAT-G08`) | Non-actionable research range boundary. |
| **FEAT-H05** | Family H Upper Range Bound (`FEAT-H01 to FEAT-H05`) | Non-actionable research range boundary. |
| **FEAT-I05** | Family I Upper Range Bound (`FEAT-I01 to FEAT-I05`) | Non-actionable research range boundary. |
| **FEAT-J06** | Family J Upper Range Bound (`FEAT-J01 to FEAT-J06`) | Non-actionable research range boundary. |

---

## 5. Reconciled Decisions & Policy Governance

### 1. `FEAT-J02` (Offline Task Editing)
* **Authoritative Status:** **DEFERRED to Phase 3**.
* **Governance Alignment:** SOT-11, SOT-14, Master Specification §1.1 summary, and Section 4 Selection Matrix authoritatively defer offline editing to Phase 3. The historical text in Master PRD §2.1 was superseded by governance decisions to safeguard Phase 1 delivery focus.

### 2. `FEAT-D05a` (Workspace Starter Templates UI)
* **Authoritative Status:** **FE COMPLETE** (Provisional Frontend Candidate).
* **Governance Alignment:** The card picker, preview modal, keyboard navigation, and template selection form in `apps/web/` are fully implemented and verified by 15 tests in `WorkspaceTemplatesPicker.test.tsx`. Atomic backend database seeding is a separate integration dependency owned by the backend developer.

### 3. `FEAT-K01` (External Smart URL Metadata Chips)
* **Authoritative Status:** **FE PARTIAL**.
* **Governance Alignment:** Markdown AST parses URLs safely with `target="_blank"` and `rel="noopener noreferrer"`. Rich OpenGraph cards remain partial because no approved OpenAPI scrape endpoint (`DEP-METADATA-01`) exists in `openapi-0.3.20-draft.yaml`. The frontend will not invent an unauthorized endpoint.

### 4. `FEAT-G02b` (Configurable Custom Roles Builder UI)
* **Authoritative Status:** **FE BLOCKED**.
* **Governance Alignment:** While `FEAT-G03` (Permission Inspector & Role Simulator) provides downward-only role simulation, `FEAT-G02b` requires dynamic custom role creation and capability bundle assignment. This remains blocked on `DEP-ROLES-01` (backend custom role evaluator contract).

### 5. Open Governance Decisions (SOT-03, SOT-04, SOT-12)
* **`SOT-03` (Personal Workspace Privacy):** `AUDITED_BREAK_GLASS` (owner confirmed) vs `PRIVATE_STRICT` (engineering recommendation). Remains tracked as an open decision pending formal sign-off.
* **`SOT-04` (Task-Edit Policy):** Assignee field grant policy and creator ceiling remain tracked without silent mutation.
* **`SOT-12` (File Quota & Storage Ceiling):** Formal limits remain pending stakeholder review.

---

## 6. Authoritative Completeness Metrics

### Metric 1 — Initial Production Frontend Completeness
Evaluates progress across all **33 approved Phase 1 capabilities**:
* **Eligible Frontend Scope:** 33 capabilities
* **FE COMPLETE:** 28 capabilities
* **FE PARTIAL:** 1 capability (`FEAT-K01`)
* **FE NOT STARTED:** 0 capabilities
* **FE BLOCKED:** 3 capabilities (`FEAT-C04`, `FEAT-C06`, `FEAT-G02b`)
* **BACKEND DEPENDENT:** 1 capability (`FEAT-F02`)
* **Excluded from Denominator:** 13 DEFERRED (Phases 2–4) + 7 REJECTED = 20 features (explicitly scheduled outside Phase 1 release scope).

$$\text{Weighted Frontend Completeness} = \frac{\text{FE COMPLETE} + 0.5 \times \text{FE PARTIAL}}{\text{Eligible Scope}} \times 100$$
$$\text{Weighted Frontend Completeness} = \frac{28 + 0.5 \times 1}{33} \times 100 = \frac{28.5}{33} \times 100 = \mathbf{86.36\%}$$

* **Functional Verification Coverage:** 29 / 29 implemented frontend features have passing automated tests in Vitest (**100% of implemented code verified**). Across all 33 in-scope capabilities: $28.5 / 33 = \mathbf{86.36\%}$.

### Metric 2 — Full Approved Frontend Roadmap Completeness
Evaluates progress across all **46 non-rejected capabilities** (including deferred work):
* **Non-Rejected Roadmap Total:** 46 capabilities
* **Active Phase 1 Scope Progress:** **86.36%** (28.5 / 33)
* **Full Roadmap Scope (including 13 Phase 2–4 Deferred):**
  $$\text{Full Roadmap Completeness} = \frac{28 + 0.5 \times 1}{46} \times 100 = \frac{28.5}{46} \times 100 = \mathbf{61.96\%}$$

### Metric 3 — Functional Verification Coverage
* **Automated Test Evidence:** 64 test files in `apps/web/`, 693 tests passed (100% green).
* **Test Verification of Implemented Features:** **100%** (28/28 COMPLETE + 1/1 PARTIAL have passing automated Vitest suites).
* **Mock Boundary Integrity:** All frontend tests execute against MSW mock handlers conforming to OpenAPI 0.3.20-draft.

### Metric 4 — Backend Integration Readiness
* **Contract Ready:** 28 capabilities
* **Contract Gap:** 2 capabilities (`FEAT-K01` [DEP-METADATA-01], `FEAT-G02b` [DEP-ROLES-01])
* **Contract Ambiguous:** 2 capabilities (`FEAT-C04` [DEP-SV-01 Decisions A–E], `FEAT-C06` [DEP-SV-01 Decision D])
* **Backend Contract Dependency:** 1 capability (`FEAT-F02` [DEP-REALTIME-01])
* *Governance Invariant:* Outstanding backend integration dependencies do not reduce the frontend implementation score.

---

## 7. Historical Milestone Comparison

| Evaluation Metric | VS-09.0 Baseline | VS-09L Baseline | FE-VS12 Current Baseline | Trend / Analysis |
| :--- | :---: | :---: | :---: | :--- |
| **Active Branch** | `develop @ 26bd662` | `feat/FE-VS09L` | `feat/FE-VS12` | Clean dedicated baseline branch. |
| **Total In-Scope Phase 1** | 33 capabilities | 33 capabilities | 33 capabilities | Stable, reconciled scope boundary. |
| **FE COMPLETE** | 18 capabilities | 28 capabilities | 28 capabilities | +10 capabilities delivered via VS-09A through VS-09J. |
| **FE PARTIAL** | 1 capability | 1 capability | 1 capability | `FEAT-K01` smart URL chips. |
| **FE NOT STARTED** | 10 capabilities | 0 capabilities | 0 capabilities | All 10 backlog capabilities completed! |
| **FE BLOCKED** | 3 capabilities | 3 capabilities | 3 capabilities | Gated on product decisions (`DEP-SV-01`, `DEP-ROLES-01`). |
| **BACKEND DEPENDENT** | 1 capability | 1 capability | 1 capability | `FEAT-F02` (WebSocket gateway `DEP-REALTIME-01`). |
| **Weighted FE Score** | **56.06%** (18.5/33) | **86.36%** (28.5/33) | **86.36%** (28.5/33) | **+30.30% absolute gain** since VS-09.0. |
| **Automated Web Tests** | 506 tests (50 suites) | 676 tests (63 suites) | 693 tests (64 suites) | +187 automated tests added; 100% green. |

---

## 8. Prioritized Next Frontend Implementation Sequence

Since all 10 unstarted Phase 1 capabilities are completed, and remaining blocked capabilities (`FEAT-C04`, `FEAT-C06`, `FEAT-G02b`, `FEAT-F02`) depend on external product decisions or backend contracts:

1. **Milestone FE-VS13 (Immediate Priority — Frontend Independent):**
   * **Smart URL Fallback Chip Renderer (`FEAT-K01`):** Complete the frontend presentation of external URLs by implementing a client-side smart chip renderer with domain badges, favicon extraction, external redirect confirmation, and mock metadata fallbacks while waiting for live backend scrape endpoint `DEP-METADATA-01`.
   * **Scope:** `SmartUrlChip.tsx`, fallback metadata resolver, 10+ unit tests in `SmartUrlChip.test.tsx`.
2. **Milestone FE-VS14 (Frontend Hardening & Contract Bridge):**
   * **Client-Side Saved Views Draft Spec & State Bridge (`FEAT-C04` / `FEAT-C06`):** Author the client-side state machine for saving view preferences, draft query filters, and display options in `localStorage` as a migration bridge for `DEP-SV-01`.
3. **Milestone FE-VS15 (Comprehensive Accessibility & Interaction Gate):**
   * Final keyboard focus trap audit, screen reader aria-live announcements, and contrast verification across all 28 completed slices in preparation for unfreezing UI/UX Track B.
