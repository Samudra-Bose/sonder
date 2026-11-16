# SONDER — FRONTEND COMPLETION TRACKER & ROADMAP BASELINE

**Document Version:** 1.11.0<br/>
**Last Synchronized:** 2026-11-16<br/>
**Current Baseline Commit:** `feat/FE-VS13-smart-url-chips @ b4a514a`<br/>
**Engineering Domain:** Frontend Only (Backend implementation & infrastructure owned by Backend Developer)<br/>
**Governance Standard:** Dual-Track Engineering & UI/UX Governance (PLAN → GRILL → IMPLEMENT → TEST → REVIEW → LOCK → DOCUMENT)<br/>
**Milestone:** FE-VS13.2.1 — Governance and Backend Handoff Consistency<br/>
**Status Recommendation:** `PHASE 1 CORE FRONTEND FOUNDATION DELIVERED (87.88% WEIGHTED COMPLETION). 100.00% STRICT AC VERIFICATION ACROSS IMPLEMENTED SLICES. REMAINING WORK BOUNDED TO CONTRACT-GATED CAPABILITIES & PHASE 2–4 ROADMAP.`

---

## 1. Executive Summary

Milestone **FE-VS13.2.1** performs a focused documentation and contract-reconciliation closeout following the delivery of `FE-VS13.2` (`b4a514a`). It aligns all project trackers, corrects stale OpenGraph references, reconciles the backend handoff details between API contracts and database specifications, and ensures absolute consistency across the 760-test verification baseline. Sonder's engineering responsibilities remain strictly separated: our team builds the **frontend only**, while a separate backend developer owns runtime services, databases, RLS policies, migrations, and deployment infrastructure.

Our mandate is to ensure every approved frontend user workflow, interaction pattern, form validation, error/empty/loading state, and capability gate is fully implemented and functionally verified against OpenAPI contracts and MSW mock handlers before unfreezing dedicated UI/UX Track B implementation.

### Key Audit & Correction Findings:
1. **Frontend Foundation Fully Operational:**
   * Automated verification across `apps/web/` stands at **66 test suites, 736 tests passing (100% green)** in Vitest with zero TypeScript compilation errors (760 tests total across the monorepo including `@sonder/server`).
   * All 8 backend-independent Phase 1 milestones from Inventory A (`VS-09A` through `VS-09H`) plus M1.3 governance slices (`VS-09I` Permission Inspector, `VS-09J` Audit Log Table & CSV Export, `VS-09L` Release Hardening) and external link milestones (`FE-VS13`, `FE-VS13.1`, `FE-VS13.2`) are fully implemented, verified, and locked.
2. **Authoritative Deferred Capability Inventory (Exactly 13 Unique Capabilities):**
   * **Phase 2 — Governance Expansion, Intake & Data Onboarding (5 capabilities):**
     1. `FEAT-D04b`: Extended Custom Fields (Multi-Select, User, Checkbox, URL)
     2. `FEAT-D05b`: Custom Workspace & Reusable Checklist Templates
     3. `FEAT-F01b`: Email Digests / Reminders (Custom Reminder Rules & Scheduled Email Digests)
     4. `FEAT-I01`: Lightweight Shareable Workspace Intake Forms
     5. `FEAT-J01b`: Guided CSV Import Wizard with Dry-Run Validation (`?dryRun=true`)
   * **Phase 3 — Automations, Outbound Integration & Offline Synchronization (5 capabilities):**
     1. `FEAT-A10c`: Granular Field-Revision Snapshot Restore (`TASK_FIELD_REVERTED`)
     2. `FEAT-D03`: Optional Single-Step Status Sign-Off Gate (`POST .../signoff`)
     3. `FEAT-H01`: Declarative 1-Hop Workflow Automations
     4. `FEAT-H02`: Outbound HMAC-Signed HTTPS Webhooks
     5. `FEAT-J02`: Selected-Field Offline Task Editing & Queued Sync (authoritatively deferred per SOT-11/14 and Master Spec §1.1)
   * **Phase 4 — Advanced Analytics & AI Capabilities (3 capabilities):**
     1. `FEAT-B03`: Opt-In Timeboxed Iterations / Cycles
     2. `FEAT-E02`: Agile Burndown, Velocity & Cumulative Flow Charts
     3. `FEAT-L01`: Optional AI Task Breakdown & Thread Summarization
   * *Accounting Invariants:* Exactly 13 unique deferred capabilities ($5 + 5 + 3 = 13$). No deferred capability is marked complete or in Phase 1 scope.
3. **Rigorous Separation of Frontend Verification vs. Backend Integration:**
   * `FEAT-A04` (Comments, @Mentions, Watchers): Watcher UI interactions, toggles, optimistic rollback, threaded comments, markdown AST, and @mentions are fully covered by 47 automated tests. Multi-user cross-session persistence and live WebSocket fan-out belong to the backend integration boundary (`DEP-REALTIME-01`, `DEP-COLLAB-01`) and do not reduce the frontend verification score. `FEAT-A04` is **VERIFIED** on the frontend.
   * `FEAT-A01` (Work-Item Archetypes): Frontend archetype selection, inline editing in peek drawer, badges, tokens, and permission gating are fully verified (16 tests). Live PostgreSQL database enum validation and check constraints remain a backend-owner responsibility.
   * `FEAT-G03` (Permission Inspector & Role Simulator): Frontend role simulation, plain-language capability presentation, scenario sandbox, downward-only preview banner, non-mutating POST allowlist, and client capability intersection are verified with MSW (34 tests). Production server-side authorization enforcement remains a backend-owner acceptance responsibility.
   * `FEAT-G04` (Audit Log Table & CSV Export): Frontend rendering of server-reported audit integrity status badges (`VALID`/`BROKEN`), structured filters, and CSV export is verified with MSW (22 tests). Preserves UI trust disclosure that mock/server-reported status is not production cryptographic proof. Full end-to-end cryptographic verification of the append-only SHA-256 chain in PostgreSQL belongs to backend/security ops.
   * `FEAT-A06` (Subtasks & BLOCKS DAG Dependencies): Depth-2 hierarchy cap, reparenting modal, BLOCKS DAG cycle prevention, drawer dependency links, timeline SVG connectors, conflict badges, and dynamic connector updates are verified (84 tests across 6 suites). Backend DB foreign key and transactional constraints belong to backend owner.
   * `FEAT-K01` (External Smart URL Metadata Chips & Link Management): Safe URL parsing/rendering, SEC-T09 protocol validation (`https://` scheme enforcement, strict rejection of `javascript:`, `data:`, `file:`, `vbscript:`, `//`), domain badges (GitHub, Figma, Google Docs/Sheets/Slides/Drive, generic), path truncation, copy-to-clipboard with visual/accessible feedback, `target="_blank"`, `rel="noopener noreferrer"`, integrated into Markdown AST (`markdown-ast.tsx`) and Task Peek Drawer (`TaskPeekDrawer.tsx`). Structured link management delivered in `FE-VS13.2` (`b4a514a`) via `TaskExternalLinksSection.tsx`: inline attach form with live provider detection, custom/auto title, SEC-T09 validation, duplicate URL prevention, inline editing, link removal, optimistic cache updates with rollback, 409 field-revision conflict handling against `task.fieldRevisions.externalLinks`, and permission gating (`canEditCustomFieldsLinks`). Candidate OpenAPI 0.3.20-draft reconciled requiring `[id, url, title, provider]` on `TaskDto.externalLinks.items` across all 3 mirror files (51/51 `validate_v1_5.py` checks passing). Exactly 75 automated tests passing across 4 suites (`SmartUrlChip.test.tsx` 22, `markdown-ast.test.tsx` 14, `TaskPeekDrawer.test.tsx` 26, `TaskExternalLinksManagement.test.tsx` 13). Rich backend OpenGraph scraping is formally catalogued under `DEP-METADATA-01` as a separate Phase 3 metadata enhancement (separate canonical FEAT ID pending approval); it does not block or diminish `FEAT-K01`. `FEAT-K01` is **VERIFIED** and **FE COMPLETE** on the frontend.
4. **Authoritative Metric Summary (Phase 1 Initial-Production Scope):**
   * **In-Scope Frontend Capabilities:** 33 concrete capabilities.
   * **FE COMPLETE:** 29 capabilities (87.88%).
   * **FE PARTIAL:** 0 capabilities (0.00%).
   * **FE NOT STARTED:** 0 capabilities (0.00%).
   * **FE BLOCKED (Product Decisions / Contract Gaps):** 3 capabilities (`FEAT-C04`, `FEAT-C06`, `FEAT-G02b`).
   * **BACKEND DEPENDENT:** 1 capability (`FEAT-F02`, Real-Time Presence / WebSocket).
   * **Weighted Frontend Completeness:** **87.88%** (29.0 / 33).
   * **Full Roadmap Completeness:** **63.04%** (29.0 / 46).
   * **Functional Acceptance Criteria Verification:** **100.00% Strict** (29/29) across implemented slices; **87.88% Strict** (29/33) across all 33 Phase 1 capabilities.
   * **Aggregate Automated Test Suite Proof:** 66 test files in `apps/web/`, 736 tests passing (100% green); 760 tests monorepo.
5. **Canonical Hierarchy & Design System Preservation:**
   * Canonical hierarchy remains: $\text{Community} \longrightarrow \text{Workspace} \longrightarrow \text{Task} \longrightarrow \text{Subtask}$ (depth 1–2).
   * UI/UX Track B remains **PAUSED**. No visual redesign, decorative changes, or theme rewrites were introduced.

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
* **FE COMPLETE (Phase 1):** 29
* **FE PARTIAL (Phase 1):** 0
* **FE NOT STARTED (Phase 1):** 0
* **FE BLOCKED (Phase 1):** 3 (`FEAT-C04`, `FEAT-C06`, `FEAT-G02b`)
* **BACKEND DEPENDENT (Phase 1):** 1 (`FEAT-F02`)
* **DEFERRED (Phases 2, 3, 4):** 13
  * **Phase 2 — 5 capabilities:**
    1. `FEAT-D04b`: Extended Custom Fields (Multi-Select, User, Checkbox, URL)
    2. `FEAT-D05b`: Custom Workspace & Reusable Checklist Templates
    3. `FEAT-F01b`: Email Digests / Reminders (Custom Reminder Rules & Scheduled Email Digests)
    4. `FEAT-I01`: Lightweight Shareable Workspace Intake Forms
    5. `FEAT-J01b`: Guided CSV Import Wizard with Dry-Run Validation (`?dryRun=true`)
  * **Phase 3 — 5 capabilities:**
    1. `FEAT-A10c`: Granular Field-Revision Snapshot Restore (`TASK_FIELD_REVERTED`)
    2. `FEAT-D03`: Optional Single-Step Status Sign-Off Gate (`POST .../signoff`)
    3. `FEAT-H01`: Declarative 1-Hop Workflow Automations
    4. `FEAT-H02`: Outbound HMAC-Signed HTTPS Webhooks
    5. `FEAT-J02`: Selected-Field Offline Task Editing & Queued Sync (authoritatively deferred per SOT-11/14 and Master Spec §1.1)
  * **Phase 4 — 3 capabilities:**
    1. `FEAT-B03`: Opt-In Timeboxed Iterations / Cycles
    2. `FEAT-E02`: Agile Burndown, Velocity & Cumulative Flow Charts
    3. `FEAT-L01`: Optional AI Task Breakdown & Thread Summarization
* **REJECTED / OUT OF SCOPE:** 7 (`FEAT-A05a`, `FEAT-A05b`, `FEAT-A09`, `FEAT-B05`, `FEAT-D02`, `FEAT-E03`, `FEAT-I02`)
* **Total Actionable Capabilities:** $28 + 1 + 0 + 3 + 1 + 13 + 7 = 53$

---

## 4. Definitive 53-Feature Evaluation Matrix & Traceability

Each feature is evaluated across five distinct, uncollapsed dimensions:
1. **Frontend Implementation:** `FE COMPLETE` | `FE PARTIAL` | `FE NOT STARTED` | `FE BLOCKED` | `DEFERRED` | `REJECTED`
2. **Functional Verification:** `VERIFIED` | `PARTIALLY VERIFIED` | `NOT VERIFIED` | `NOT APPLICABLE`
3. **API Contract Readiness:** `CONTRACT READY` | `CONTRACT GAP` | `CONTRACT AMBIGUOUS` | `NOT APPLICABLE`
4. **Backend Handoff Readiness:** `READY FOR BACKEND INTEGRATION` | `BACKEND CONTRACT DEPENDENCY` | `INTEGRATION PENDING` | `NOT APPLICABLE`
5. **UI/UX Phase Readiness:** `READY FOR UI/UX PHASE` | `PENDING FE COMPLETION` | `NOT APPLICABLE`

### 4.1 Group 1: Actionable Concrete Capabilities (53 Features)

| Feature ID & Name | Phase | FE Status | Verification | Contract Status | Backend Handoff | UI/UX Readiness | Acceptance Criteria Completed & Remaining Work | Blocking Dependency | Evidence / Test Location | Recommended Action |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **FEAT-A01**<br/>Work-Item Archetypes (`TASK`, `DELIVERABLE`, `BUG`, `DECISION`) | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Archetype dropdown, cards & drawer badges, color tokens, permission checks.<br/>**Remaining:** None on frontend. | None | `InlineArchetypeEditor.tsx`<br/>`TaskArchetypeBadge.tsx`<br/>`TaskArchetypes.test.tsx` (16) | Ready for backend integration; preserve frozen UI. |
| **FEAT-A02**<br/>Fast Task Creation, Peek Drawer & Deep Linking | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** `C` hotkey composer, peek drawer, URL sync (`?task=:id`), title/description edit, assignee select.<br/>**Remaining:** None on frontend. | None | `QuickTaskComposer.tsx`<br/>`TaskPeekDrawer.tsx`<br/>`TaskPeekDrawer.test.tsx` (19)<br/>`QuickTaskComposer.test.tsx` (21) | Maintain contract conformance. |
| **FEAT-A03**<br/>Core Task Metadata (Status, Priority, Dates, Labels, Estimate) | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Inline click-to-edit, optimistic updates, rollback on error, keyboard controls (Escape/Enter).<br/>**Remaining:** None on frontend. | None | `InlineFieldEditors.tsx`<br/>`useUpdateTask.ts`<br/>`InlineTaskEditing.test.tsx` (26) | Ready for backend integration. |
| **FEAT-A04**<br/>Comments, @Mentions, #KEY Links & Task Watchers | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Threaded comment composer, AST-safe markdown parsing, user mention autocomplete, optimistic watcher toggle.<br/>**Remaining:** None on frontend. Multi-user cross-session persistence and live WebSocket fan-out belong to backend integration boundary (`DEP-REALTIME-01`, `DEP-COLLAB-01`). | DEP-COLLAB-01 (DB persistence), DEP-REALTIME-01 (WS sync) | `CommentComposer.tsx`<br/>`markdown-ast.tsx`<br/>`TaskWatchButton.tsx`<br/>`TaskCollaboration.test.tsx` (12)<br/>`TaskCollaborationHardening.test.tsx` (22) | Ready for backend integration. |
| **FEAT-A05a**<br/>Task File Attachments & Binary Uploads | Excluded | **REJECTED** | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Formally excluded from product scope to protect simplicity (PRD §2.3). | None | None | Preserve exclusion; do not implement. |
| **FEAT-A05b**<br/>Workspace File Management Hub | Excluded | **REJECTED** | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Formally excluded from product scope (PRD §2.3). | None | None | Preserve exclusion; do not implement. |
| **FEAT-A06**<br/>Subtasks (Depth 1..2) & Dependency Links (BLOCKS DAG) | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Subtask hierarchy capped at depth 2, reparenting modal, cycle-checked BLOCKS DAG connectors in Timeline, drawer link manager.<br/>**Remaining:** None on frontend. Backend foreign key integrity and transactional constraints belong to backend owner. | None | `SubtaskList.tsx`<br/>`ReparentTaskModal.tsx`<br/>`TaskDependencies.tsx`<br/>`TimelineView.tsx`<br/>`SubtaskHierarchy.test.tsx` (18)<br/>`TaskDependencies.test.tsx` (11)<br/>`TimelineDependencies.test.tsx` (28) | Maintain depth cap of 2. |
| **FEAT-A07**<br/>Task & Checklist Cloning | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Single-click clone action, subtask clone toggle, toast with link to cloned task, optimistic cache insert.<br/>**Remaining:** None on frontend. | None | `useCloneTask.ts`<br/>`TaskCloneToast.tsx`<br/>`TaskCloning.test.tsx` (11) | Ready for backend integration. |
| **FEAT-A08**<br/>Fractional Ranking & Manual Ordering (`rankKey` / LexoRank) | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Drag-and-drop column drop ranking, accessible Move menu for keyboard users, lexorank calculation.<br/>**Remaining:** None on frontend. Background rebalancing job owned by backend. | None | `TaskBoardView.tsx`<br/>`TaskListView.tsx`<br/>`lexorank.ts`<br/>`TaskViews.test.tsx` (17)<br/>`CrossViewIntegration.test.tsx` (10) | Ready for backend integration. |
| **FEAT-A09**<br/>Granular Time Tracking & Billable Worklogs | Excluded | **REJECTED** | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Formally excluded per PRD §2.3 to preserve community focus. | None | None | Preserve exclusion; do not implement. |
| **FEAT-A10a**<br/>Single-Item Archive & 10s Undo Toast (`Z` hotkey) | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Soft-delete timestamp `archivedAt`, 10s floating undo toast with countdown progress bar, `Z` hotkey, view eviction.<br/>**Remaining:** None on frontend. | None | `TaskActionsMenu.tsx`<br/>`TaskUndoToast.tsx`<br/>`TaskArchive.test.tsx` (32) | Frozen at `0b82ef9`. |
| **FEAT-A10b**<br/>Bulk Action Bar (<=100 tasks) & 30-Day Trash View | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Multi-select table checkboxes, bulk status/priority/archive, dedicated `/trash` view with 30-day countdown & restore.<br/>**Remaining:** None on frontend. Hard purge disabled pending DEC-OPEN-03. | DEC-OPEN-03 (Hard purge policy) | `views/TaskTrashView.tsx`<br/>`views/BulkActionBar.tsx`<br/>`TaskBulkActions.test.tsx` (8)<br/>`WorkspaceTrashView.test.tsx` (14) | Maintain purge restriction. |
| **FEAT-A10c**<br/>Granular Field-Revision Snapshot Restore | Phase 3 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 3 roadmap (event `TASK_FIELD_REVERTED`). Archive filtering is intrinsic to `FEAT-A10a`/`FEAT-A10b`. | None | None | Preserve deferred status. |
| **FEAT-B01**<br/>Multi-Community, Workspace Spine & Navigation Rail | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Tenant switcher, responsive navigation rail, mobile drawer with focus trap, community context routing.<br/>**Remaining:** None on frontend. PostgreSQL RLS isolation owned by backend. | None | `AppShell.tsx`<br/>`WorkspaceSwitcher.tsx`<br/>`AppShell.test.tsx` (17)<br/>`WorkspaceSwitcher.test.tsx` (14) | Ready for backend integration. |
| **FEAT-B02**<br/>Backlog Status Category & Collapsible Tray | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Collapsible Backlog tray in List and Board views, count badge, 1-click promotion to To Do, ARIA disclosure, collapsed state persistence.<br/>**Remaining:** None on frontend. | None | `views/BacklogTaskTray.tsx`<br/>`BacklogTaskTray.test.tsx` (14) | Ready for backend integration. |
| **FEAT-B03**<br/>Opt-In Timeboxed Iterations / Cycles | Phase 4 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 4 roadmap. | None | None | Preserve deferred status. |
| **FEAT-B04**<br/>Workspace Milestones & Target Buckets | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Optional planning markers on Timeline (DEC-OPEN-08), creation dialog, target dates, progress rollup.<br/>**Remaining:** None on frontend. | None | `views/timeline/TimelineMilestoneMarker.tsx`<br/>`TimelineView.test.tsx` (7)<br/>`milestones.test.tsx` (5) | Ready for backend integration. |
| **FEAT-B05**<br/>Enterprise Scenario Sandbox & Capacity Math | Excluded | **REJECTED** | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Formally excluded to prevent enterprise bloat. | None | None | Preserve exclusion. |
| **FEAT-C01**<br/>Synchronized List View (TreeGrid) & Kanban Board View | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Virtualized treegrid, column headers, mobile stage carousel, optimistic task reordering, shared query cache.<br/>**Remaining:** None on frontend. | None | `views/TaskListView.tsx`<br/>`views/TaskBoardView.tsx`<br/>`TaskListView.test.tsx` (7)<br/>`TaskViews.test.tsx` (17) | Ready for backend integration. |
| **FEAT-C02**<br/>Synchronized Calendar View & Dependency Timeline View | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Monthly & weekly calendar grids, unscheduled task tray, Gantt chart split axis, drag-to-reschedule, conflict lines.<br/>**Remaining:** None on frontend. | None | `views/calendar/CalendarView.tsx`<br/>`views/timeline/TimelineView.tsx`<br/>`CalendarView.test.tsx` (14)<br/>`TimelineView.test.tsx` (7) | Ready for backend integration. |
| **FEAT-C03**<br/>Personal Cross-Workspace Dashboard ("My Work") | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Aggregated view of assigned/created tasks across workspaces, bucketing by Overdue, Today, Upcoming, and Later.<br/>**Remaining:** None on frontend. Client query aggregation complete. | None | `MyWorkView.tsx`<br/>`MyWorkView.test.tsx` (13)<br/>`task-helpers.test.ts` (13) | Ready for backend integration. |
| **FEAT-C04**<br/>Saved Views (Personal vs Shared Views) | M1.1 | **FE BLOCKED** | NOT VERIFIED | CONTRACT AMBIGUOUS | BACKEND CONTRACT DEPENDENCY | PENDING FE COMPLETION | **Done:** Draft spec in `proposed-saved-views-openapi.yaml`.<br/>**Remaining:** UI for creating, saving, switching, and sharing views blocked pending product decisions. | DEP-SV-01 (Decisions A–E) | `proposed-saved-views-openapi.yaml` | Awaiting PO decision sign-off. |
| **FEAT-C05**<br/>Omnibar (`Cmd+K`), Global Search & Filter Pills | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** `Cmd+K` instant modal, fuzzy search over tasks/views/settings, keyboard arrow navigation, action dispatch.<br/>**Remaining:** None on frontend. | None | `OmnibarModal.tsx`<br/>`OmnibarTrigger.tsx`<br/>`Omnibar.test.tsx` (11) | Ready for backend integration. |
| **FEAT-C06**<br/>Board Swimlanes & Card Property Visibility Toggles | M1.2 | **FE BLOCKED** | NOT VERIFIED | CONTRACT AMBIGUOUS | BACKEND CONTRACT DEPENDENCY | PENDING FE COMPLETION | **Done:** Card badge components exist.<br/>**Remaining:** Swimlane groupBy UI and property toggle controls blocked on Saved Views schema. | DEP-SV-01 (Decision D) | None | Awaiting Saved Views resolution. |
| **FEAT-C07**<br/>Permanent Task Keys (`PREFIX-NUM`) & Historical Aliases | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Monospace key badges, deep linking via `?task=PREFIX-NUM`, alias redirection resolution hooks.<br/>**Remaining:** None on frontend. | None | `TaskPeekDrawer.tsx`<br/>`useResolveTaskKey.ts`<br/>`TaskPeekDrawer.test.tsx` (19)<br/>`TaskIntegrationE2E.test.tsx` (24) | Ready for backend integration. |
| **FEAT-D01**<br/>5-Category Workflow Spine & Custom Statuses Editor | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** 5 canonical status categories (BACKLOG, TODO, IN_PROGRESS, DONE, CANCELED), custom status creator, category mapping editor.<br/>**Remaining:** None on frontend. | None | `settings/WorkspaceSettingsLayout.tsx`<br/>`settings/WorkflowSettingsView.tsx`<br/>`WorkspaceSettings.test.tsx` (5) | Ready for backend integration. |
| **FEAT-D02**<br/>Enterprise Workflow Schemes & Transition Screens | Excluded | **REJECTED** | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Formally excluded to preserve low cognitive overhead. | None | None | Preserve exclusion. |
| **FEAT-D03**<br/>Optional Single-Step Status Sign-Off Gate | Phase 3 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 3 roadmap (`POST .../signoff`). Custom fields belong to D04. | None | None | Preserve deferred status. |
| **FEAT-D04a**<br/>Core Custom Fields (Text, Number, Single-Select, Date, Bool) | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Field schema manager, option list builder, field value renderers/editors in peek drawer, validation.<br/>**Remaining:** None on frontend. | None | `settings/CustomFieldsSettingsView.tsx`<br/>`TaskCustomFieldsSection.tsx`<br/>`CustomFields.test.tsx` (7)<br/>`TaskCustomFields.test.tsx` (7) | Ready for backend integration. |
| **FEAT-D04b**<br/>Extended Custom Fields (Multi-Select, User, Checkbox, URL) | Phase 2 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 2 roadmap. Custom fields belong strictly to D04. | None | None | Preserve deferred status. |
| **FEAT-D05a**<br/>Built-in Starter Templates Picker UI (General, Event, Ops) | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Card picker for 3 approved templates, preview modal with pre-configured statuses and views, keyboard selection, form validation.<br/>**Remaining:** None on frontend. Backend atomic template seeding is an integration dependency. | Backend template seed runner | `CreateWorkspaceDialog.tsx`<br/>`WorkspaceTemplateCard.tsx`<br/>`WorkspaceTemplatesPicker.test.tsx` (15) | Provisional frontend complete. |
| **FEAT-D05b**<br/>Custom Workspace & Reusable Checklist Templates | Phase 2 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 2 roadmap. Workspace templates belong to D05. | None | None | Preserve deferred status. |
| **FEAT-E01**<br/>Workspace Overview, Completion & Workload Summary | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Workspace summary tab, completion ratio progress bar, overdue tally, per-assignee open task workload distribution.<br/>**Remaining:** None on frontend. | None | `views/TaskViews.tsx`<br/>`TaskViews.test.tsx` (17)<br/>`TaskIntegrationE2E.test.tsx` (6) | Ready for backend integration. |
| **FEAT-E02**<br/>Agile Burndown, Velocity & Cumulative Flow Charts | Phase 4 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 4 roadmap. | None | None | Preserve deferred status. |
| **FEAT-E03**<br/>Configurable Multi-Gadget Custom Dashboard Builder | Excluded | **REJECTED** | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Formally excluded in favor of standard My Work & Overview. | None | None | Preserve exclusion. |
| **FEAT-F01a**<br/>Segmented In-App Notification Center (REST Inbox) | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Header bell badge counter, popover preview, full `/inbox` route with filters (All, Mentions, Assigned), mark-all-read.<br/>**Remaining:** None on frontend. Realtime push sync is a separate backend dependency (`DEP-NOTIF-02`). | None on frontend | `NotificationBell.tsx`<br/>`InboxView.tsx`<br/>`Notifications.test.tsx` (19) | Ready for backend integration. |
| **FEAT-F01b**<br/>Custom Reminder Rules & Scheduled Email Digests | Phase 2 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 2 roadmap (Email Digests / Reminders). | None | None | Preserve deferred status. |
| **FEAT-F02**<br/>Real-Time Collaborative Updates & Presence | M1.1 | **BACKEND DEPENDENT** | NOT VERIFIED | CONTRACT READY | BACKEND CONTRACT DEPENDENCY | PENDING FE COMPLETION | **Done:** Client event abstraction exists in `useRealtimeStream.ts`.<br/>**Remaining:** Live WebSocket protocol connection, reconnect backoff, presence indicators pending backend WS ticket infrastructure. | DEP-REALTIME-01 (WebSocket ticket & gateway) | `useRealtimeStream.ts` | Awaiting backend WebSocket gateway. |
| **FEAT-G01**<br/>Authentication, Session Lifecycle, Cookies & CSRF Spine | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Login/registration views, session restoration, automatic CSRF token header attachment, 401 interceptor & redirect.<br/>**Remaining:** None on frontend. | None on frontend | `AuthFlow.tsx`<br/>`api-client.ts`<br/>`AuthFlow.test.tsx` (17)<br/>`AuthTheme.test.tsx` (5) | Ready for backend integration. |
| **FEAT-G02a**<br/>Capability RBAC Engine, 4 System Roles & Permission Gates | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Client-side `PermissionGate`, role guards, authoritative capability intersection evaluator, fail-closed tenant boundary checks.<br/>**Remaining:** None on frontend. | None | `authorization.ts`<br/>`authorization.test.ts` (19)<br/>`WorkspaceSwitcher.test.tsx` (14) | Ready for backend integration. |
| **FEAT-G02b**<br/>Configurable Custom Roles Builder UI | M1.3 | **FE BLOCKED** | NOT VERIFIED | CONTRACT GAP | BACKEND CONTRACT DEPENDENCY | PENDING FE COMPLETION | **Done:** Role preview simulator exists in `FEAT-G03`.<br/>**Remaining:** Custom role creation/edit builder UI, capability bundle selector, grant ceiling validator UI blocked on backend evaluator contract. | DEP-ROLES-01 (Custom role capability contract) | None | Awaiting custom role evaluator contract. |
| **FEAT-G03**<br/>Plain-Language Permission Inspector & Role Simulator | M1.3 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Plain-language descriptions, downward-only role simulator banner, scenario sandbox, 31 canonical capabilities, type-safe `RoleCapability` mapping.<br/>**Remaining:** None on frontend. Production server-side authorization enforcement belongs to backend owner. | None | `settings/PermissionInspector.tsx`<br/>`settings/PermissionsSettingsView.tsx`<br/>`RoleSimulator.test.tsx` (7)<br/>`authorization.test.ts` (19) | Ready for backend integration. |
| **FEAT-G04**<br/>Append-Only Hash-Chained Audit Log Table & CSV Export | M1.3 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Audit event table displaying server-reported integrity status, structured `actorId`/`targetId` filters, detail drawer (CR-14), formula-injection-safe CSV export gated by `audit:export`.<br/>**Remaining:** None on frontend. Preserves UI trust disclosure that mock/server-reported status is not production cryptographic proof. Full cryptographic verification of DB chain belongs to backend/security ops. | None | `settings/AuditLogSettingsView.tsx`<br/>`settings/auditExportCsv.ts`<br/>`AuditLog.test.tsx` (22) | Ready for backend integration. |
| **FEAT-H01**<br/>Declarative 1-Hop Workflow Automations | Phase 3 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 3 roadmap. | None | None | Preserve deferred status. |
| **FEAT-H02**<br/>Outbound HMAC-Signed HTTPS Webhooks | Phase 3 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 3 roadmap. | None | None | Preserve deferred status. |
| **FEAT-I01**<br/>Lightweight Shareable Workspace Intake Forms | Phase 2 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 2 roadmap (events `INTAKE_FORM_UPDATED`, `FORM_SUBMITTED_TASK_CREATED`). CSV Export belongs to `FEAT-J01a`. | None | None | Preserve deferred status. |
| **FEAT-I02**<br/>Full ITSM Helpdesk Suite, SLA Clocks & Incident Command | Excluded | **REJECTED** | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Formally excluded per low-overhead community scope. | None | None | Preserve exclusion. |
| **FEAT-J01a**<br/>Filtered View UTF-8 CSV Export | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Export button on view toolbar, exports filtered and sorted tasks, UTF-8 BOM (`\uFEFF`), OWASP formula injection protection.<br/>**Remaining:** None on frontend. | None | `taskExportCsv.ts`<br/>`TaskExportCsv.test.tsx` (10) | Ready for backend integration. |
| **FEAT-J01b**<br/>Guided CSV Import Wizard with Dry-Run Validation | Phase 2 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 2 roadmap. | None | None | Preserve deferred status. |
| **FEAT-J02**<br/>Selected-Field Offline Task Editing & Queued Sync | Phase 3 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 3 per SOT-11, SOT-14, and Master Spec §1.1. IndexedDB queue, 14-day expiry, FIFO replay, and 409 conflict resolver staged for Phase 3. | None | None | Authoritatively deferred to Phase 3. |
| **FEAT-J03**<br/>Accessible Design System Primitives & Tokens (WCAG 2.2 AA) | M1.1 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** 4.5:1 contrast, semantic focus ring utilities, keyboard shortcut management, theme provider (dark/light/system), reduced motion support, 13 Base UI primitives.<br/>**Remaining:** None on frontend. | None | `apps/web/src/components/ui/`<br/>`apps/web/src/index.css`<br/>`keyboard.ts`<br/>`theme.tsx`<br/>`design-tokens.test.ts` (6)<br/>`keyboard.test.tsx` (10)<br/>`theme.test.tsx` (5)<br/>`reduced-motion.test.ts` (3) | Verified across 4 foundation suites (24 tests, 70 static expect sites) plus 98 UI component tests. |
| **FEAT-K01**<br/>External Smart URL Metadata Chips & Link Management (GitHub, Figma, Docs) | M1.2 | **FE COMPLETE** | VERIFIED | CONTRACT READY | READY FOR BACKEND INTEGRATION | READY FOR UI/UX PHASE | **Done:** Domain-aware smart URL chip renderer (`SmartUrlChip.tsx`), SEC-T09 protocol validation (`https://` scheme enforcement, strict rejection of `javascript:`, `data:`, `file:`, `vbscript:`, `//`), domain badges (GitHub, Figma, Google Docs/Sheets/Slides/Drive, generic), path truncation, copy-to-clipboard with visual/accessible feedback, `target="_blank"`, `rel="noopener noreferrer"`, integrated into Markdown AST (`markdown-ast.tsx`) and Task Peek Drawer (`TaskPeekDrawer.tsx`). Structured external link management workflow implemented via `TaskExternalLinksSection.tsx` with attach, inline edit, remove, live provider detection, optimistic cache mutations with rollback, and 409 field-revision conflict handling against `task.fieldRevisions.externalLinks`. Candidate OpenAPI 0.3.20-draft reconciled requiring `[id, url, title, provider]`.<br/>**Remaining:** None on frontend. Native Git commit parsers excluded per D5; rich backend OpenGraph card scraping deferred to Phase 3 under `DEP-METADATA-01` (separate FEAT ID pending approval). | None | `SmartUrlChip.tsx`<br/>`SmartUrlChip.test.tsx` (22)<br/>`markdown-ast.tsx`<br/>`markdown-ast.test.tsx` (14)<br/>`TaskPeekDrawer.tsx`<br/>`TaskPeekDrawer.test.tsx` (26)<br/>`TaskExternalLinksSection.tsx`<br/>`TaskExternalLinksManagement.test.tsx` (13) | Verified across 4 suites (22 dedicated chip tests + 14 markdown tests + 26 drawer tests + 13 management workflow tests; 75 tests total). |
| **FEAT-L01**<br/>Optional AI Task Breakdown & Thread Summarization | Phase 4 | **DEFERRED** | NOT APPLICABLE | CONTRACT READY | NOT APPLICABLE | NOT APPLICABLE | Scheduled for Phase 4 roadmap. | None | None | Preserve deferred status. |

---

### 4.2 Detailed Acceptance Criteria Traceability Matrix (All Implemented Phase 1 Slices)

This matrix maps each of the 29 implemented or partially implemented Phase 1 capabilities against its specific approved acceptance criteria, concrete frontend components, automated test suites, verification verdict, and identified gaps:

| Feature ID | Acceptance Criteria | Frontend Implementation | Relevant Tests | Verification Result | Remaining Gaps / Hardening Notes |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **FEAT-A01** | • Support 4 canonical work-item archetypes (`TASK`, `DELIVERABLE`, `BUG`, `DECISION`).<br/>• Distinct visual badges with token-backed icons and semantic colors.<br/>• Inline archetype editor in Peek Drawer and creation flows.<br/>• Permission check: requires `task:edit_definition`.<br/>• Filter and view projections preserve archetype. | `InlineArchetypeEditor.tsx`<br/>`TaskArchetypeBadge.tsx`<br/>`TaskPeekDrawer.tsx` | `TaskArchetypes.test.tsx` (16 tests) | **VERIFIED** | Full frontend AC coverage. Frontend archetype selection, editing, display, permission checks, and filter projections fully verified (16 tests). Live PostgreSQL database enum validation, check constraints, and production persistence belong to backend owner. |
| **FEAT-A02** | • Quick task creation with `C` hotkey and floating button.<br/>• Task peek drawer with URL synchronization (`?task=:id`).<br/>• Browser back/forward navigation closes/re-opens drawer.<br/>• Editable title, description, assignee with optimistic UI and rollback.<br/>• Form dirty checking on close. | `QuickTaskComposer.tsx`<br/>`TaskPeekDrawer.tsx`<br/>`useTask.ts` | `TaskPeekDrawer.test.tsx` (19 tests)<br/>`QuickTaskComposer.test.tsx` (21 tests)<br/>`tasks.test.tsx` (24 tests) | **VERIFIED** | Full AC coverage across 64 automated tests. Live backend DB transactions owned by backend developer. |
| **FEAT-A03** | • Inline click-to-edit editors for status, priority, dates, labels, estimate.<br/>• Keyboard navigation (Enter to commit, Escape to cancel).<br/>• Optimistic updates with snapshot rollback on error.<br/>• 409 Conflict handling on stale field revisions. | `InlineFieldEditors.tsx`<br/>`useUpdateTask.ts`<br/>`TaskPeekDrawer.tsx` | `InlineTaskEditing.test.tsx` (26 tests) | **VERIFIED** | Full AC coverage including concurrency conflict rollback. |
| **FEAT-A04** | • Threaded comments with AST-safe Markdown parsing.<br/>• User @mention autocomplete popup filtered to workspace members.<br/>• Task #KEY auto-linking to peek drawer.<br/>• Optimistic toggle for task watchers (bell icon) with error rollback.<br/>• Comment editing/deletion with permission checks. | `CommentComposer.tsx`<br/>`markdown-ast.tsx`<br/>`TaskWatchButton.tsx` | `TaskCollaboration.test.tsx` (12 tests)<br/>`TaskCollaborationHardening.test.tsx` (22 tests)<br/>`markdown-ast.test.tsx` (13 tests) | **VERIFIED** | Full frontend AC coverage. Watcher UI interactions, toggle preference, optimistic rollback on error, threaded comments, markdown AST, and @mentions are fully verified in frontend tests (47 tests). Multi-user cross-session persistence and live WebSocket distribution belong to backend integration boundary (`DEP-REALTIME-01`, `DEP-COLLAB-01`). |
| **FEAT-A06** | • Subtask creation capped at maximum hierarchy depth of 2.<br/>• Reparenting modal preventing cyclic parent assignment.<br/>• Dependency linking (`BLOCKS`, `IS_BLOCKED_BY`, `RELATES_TO`) in drawer.<br/>• Cycle detection algorithm preventing circular BLOCKS dependencies.<br/>• Visual dependency connectors and conflict indicators in Timeline view. | `SubtaskList.tsx`<br/>`ReparentTaskModal.tsx`<br/>`TaskDependencies.tsx`<br/>`dependency-conflict-utils.ts`<br/>`views/timeline/TimelineView.tsx` | `SubtaskHierarchy.test.tsx` (18 tests)<br/>`TaskDependencies.test.tsx` (11 tests)<br/>`task-links.test.tsx` (5 tests)<br/>`TimelineDependencies.test.tsx` (28 tests)<br/>`dependency-conflict-utils.test.ts` (11 tests)<br/>`TimelineDependencyIntegration.test.tsx` (8 tests) | **VERIFIED** | Full frontend AC coverage across 81 tests in 6 suites. Subtask depth-2 constraint, reparenting modal, BLOCKS DAG cycle prevention, drawer dependency links, SVG connectors, conflict badges, and dynamic updates are verified. Backend database foreign key and transactional constraints belong to backend owner. |
| **FEAT-A07** | • Duplicate task action in menu and peek drawer.<br/>• Option to include/exclude subtasks and checklists.<br/>• Cloned task created with clean status (`TODO`/`BACKLOG`) and new key.<br/>• Undo toast with direct link to view cloned task.<br/>• Optimistic insertion into active view. | `useCloneTask.ts`<br/>`TaskCloneToast.tsx`<br/>`TaskActionsMenu.tsx` | `TaskCloning.test.tsx` (11 tests) | **VERIFIED** | Full AC coverage including checklist preservation and undo toast link. |
| **FEAT-A08** | • Manual drag-and-drop reordering within and across board columns.<br/>• Fractional index (`rankKey`) calculation with LexoRank midpoint math.<br/>• Keyboard-accessible "Move" menu for non-mouse reordering.<br/>• Fractional rank preserved across view switches. | `views/TaskBoardView.tsx`<br/>`views/TaskListView.tsx`<br/>`lexorank.ts`<br/>`TaskActionsMenu.tsx` | `TaskViews.test.tsx` (17 tests)<br/>`CrossViewIntegration.test.tsx` (10 tests) | **VERIFIED** | Full AC coverage. Backend background LexoRank rebalancing job owned by backend developer. |
| **FEAT-A10a** | • Archive single task from context menu or peek drawer.<br/>• Advisory 10-second countdown undo toast with progress bar.<br/>• `Z` keyboard shortcut triggers instant undo during toast window.<br/>• Server-authoritative undo token validation via MSW.<br/>• Task immediately removed from active views upon archive. | `TaskActionsMenu.tsx`<br/>`TaskUndoContext.tsx`<br/>`TaskUndoToast.tsx`<br/>`useArchiveTask.ts` | `TaskArchive.test.tsx` (32 tests) | **VERIFIED** | Full AC coverage. Frozen and locked at commit `0b82ef9`. |
| **FEAT-A10b** | • Multi-task selection in List and Board views with checkbox toggles.<br/>• Sticky Bulk Action Bar displaying count (capped at $\le 100$).<br/>• Bulk status change, bulk assignment, and bulk archive.<br/>• Dedicated 30-day Workspace Trash view listing soft-deleted items.<br/>• Individual and bulk restore from Trash back to active workspace views. | `views/BulkActionBar.tsx`<br/>`views/WorkspaceTrashView.tsx`<br/>`useTrashedTasks.ts`<br/>`useBulkUpdateTasks.ts` | `TaskBulkActions.test.tsx` (8 tests)<br/>`WorkspaceTrashView.test.tsx` (14 tests) | **VERIFIED** | Full AC coverage. Hard purge disabled pending stakeholder decision `DEC-OPEN-03`. |
| **FEAT-B01** | • Multi-community tenancy model with Community switcher.<br/>• Workspace switcher with Personal vs. Shared workspace groupings.<br/>• Responsive navigation rail collapsing to bottom bar or drawer on mobile.<br/>• Active workspace context propagation to all child routes. | `AppShell.tsx`<br/>`WorkspaceSwitcher.tsx`<br/>`WorkspaceContext.tsx` | `AppShell.test.tsx` (17 tests)<br/>`WorkspaceSwitcher.test.tsx` (14 tests) | **VERIFIED** | Full AC coverage including mobile focus trap and keyboard navigation. |
| **FEAT-B02** | • Dedicated `BACKLOG` category distinct from `TODO`.<br/>• Collapsible Backlog task tray below List and Board views.<br/>• ARIA disclosure attributes (`aria-expanded`, keyboard toggle).<br/>• One-click task promotion from Backlog to To Do.<br/>• Tray expanded/collapsed preference persisted per workspace. | `views/BacklogTaskTray.tsx`<br/>`views/TaskListView.tsx`<br/>`views/TaskBoardView.tsx` | `BacklogTaskTray.test.tsx` (14 tests) | **VERIFIED** | Full AC coverage including ARIA attributes and keyboard disclosure. |
| **FEAT-B04** | • Optional Workspace-scoped Milestone markers.<br/>• Milestone creation, editing, and deletion in Workspace Settings / Timeline.<br/>• Milestone markers rendered in Timeline view header.<br/>• Task assignment to milestones with completion percentage rollup. | `views/timeline/TimelineMilestoneMarker.tsx`<br/>`MilestoneDialog.tsx`<br/>`useMilestones.ts` | `milestones.test.tsx` (5 tests)<br/>`TimelineView.test.tsx` (7 tests) | **VERIFIED** | Full AC coverage conforming to `DEC-OPEN-08`. |
| **FEAT-C01** | • List view with TreeGrid indentation for subtasks, sorting, column resizing.<br/>• Kanban Board view with drag-and-drop columns corresponding to statuses.<br/>• Bidirectional data synchronization between views sharing query state.<br/>• Empty states, loading skeletons, and error retry states for both views. | `views/TaskListView.tsx`<br/>`views/TaskBoardView.tsx`<br/>`views/TaskViews.tsx` | `TaskListView.test.tsx` (7 tests)<br/>`TaskViews.test.tsx` (17 tests)<br/>`CrossViewIntegration.test.tsx` (10 tests) | **VERIFIED** | Full AC coverage including synchronized cache and virtualized TreeGrid. |
| **FEAT-C02** | • Calendar view with Month and Week grids, date navigation, unscheduled task tray.<br/>• Timeline view with interactive Gantt task bars, drag duration adjustment, and milestone bands.<br/>• Cross-view synchronization preserving active task selection and filter state. | `views/calendar/CalendarView.tsx`<br/>`views/timeline/TimelineView.tsx`<br/>`calendar-date-utils.ts`<br/>`timeline-date-utils.ts` | `CalendarView.test.tsx` (14 tests)<br/>`TimelineView.test.tsx` (7 tests)<br/>`calendar-date-utils.test.ts` (14 tests)<br/>`timeline-date-utils.test.ts` (12 tests) | **VERIFIED** | Full AC coverage across both Calendar and Timeline views. |
| **FEAT-C03** | • Cross-workspace triage dashboard displaying tasks assigned to logged-in user.<br/>• Categorized sections: Assigned to Me, Overdue, Upcoming, Recently Completed.<br/>• Date utilities for relative date bucketing.<br/>• Direct navigation and peek drawer access across workspace boundaries. | `MyWorkView.tsx`<br/>`date-utils.ts`<br/>`task-helpers.ts` | `MyWorkView.test.tsx` (13 tests)<br/>`date-utils.test.ts` (16 tests)<br/>`task-helpers.test.ts` (13 tests) | **VERIFIED** | Full AC coverage. Multi-workspace query aggregation handled on frontend client. |
| **FEAT-C05** | • Omnibar modal triggered by `Cmd+K` / `Ctrl+K`.<br/>• Instant search matching task key, title, and workspace names.<br/>• Filter pills for quick facet selection (status, assignee, priority, archetype).<br/>• Full keyboard navigation (arrows, Enter, Escape). | `OmnibarModal.tsx`<br/>`OmnibarTrigger.tsx`<br/>`SearchInput.tsx`<br/>`useSearch.ts` | `Omnibar.test.tsx` (11 tests) | **VERIFIED** | Full AC coverage including keyboard traps and fuzzy matching. |
| **FEAT-C07** | • Permanent task keys generated with workspace prefix (e.g., `CORE-12`).<br/>• Renaming prefix preserves alias redirects (`task_key_aliases`).<br/>• Resolving historical alias redirects to canonical task in peek drawer.<br/>• Search and deep-linking support both current and historical keys. | `useResolveTaskKey.ts`<br/>`TaskPeekDrawer.tsx`<br/>`api-client.ts` | `TaskPeekDrawer.test.tsx` (19 tests)<br/>`TaskIntegrationE2E.test.tsx` (24 tests) | **VERIFIED** | Full AC coverage including alias redirection banner. |
| **FEAT-D01** | • Enforce exactly 5 canonical status categories: `BACKLOG`, `TODO`, `IN_PROGRESS`, `DONE`, `CANCELED`.<br/>• Custom statuses can be created/edited/reordered in Workspace Settings.<br/>• Every custom status must map to exactly one canonical category.<br/>• Category order and semantics preserved in Board columns and List groupings. | `settings/WorkspaceSettingsLayout.tsx`<br/>`settings/WorkflowSettingsView.tsx`<br/>`useWorkflowStatuses.ts` | `WorkspaceSettings.test.tsx` (5 tests) | **VERIFIED** | Full AC coverage including category mapping constraints. |
| **FEAT-D04a** | • Support core custom field types: Text, Number, Single-Select, Date, Checkbox/Bool.<br/>• Workspace-scoped custom field definition manager in Settings.<br/>• Custom field value editors inside Task Peek Drawer.<br/>• Client-side validation against field definitions (required, min/max, options). | `settings/CustomFieldsSettingsView.tsx`<br/>`TaskCustomFieldsSection.tsx`<br/>`useCustomFields.ts` | `CustomFields.test.tsx` (7 tests)<br/>`TaskCustomFields.test.tsx` (7 tests) | **VERIFIED** | Full AC coverage for core custom field types. Extended types scheduled for Phase 2 (`FEAT-D04b`). |
| **FEAT-D05a** | • Exactly three built-in workspace templates: General Purpose, Event Planning, Team Operations.<br/>• Template picker modal with visual preview cards, included statuses, and sample tasks.<br/>• Keyboard navigation and accessible selection controls.<br/>• Template selection payload sent on workspace creation. | `CreateWorkspaceDialog.tsx`<br/>`WorkspaceTemplateCard.tsx`<br/>`WorkspaceTemplatePreviewModal.tsx` | `WorkspaceTemplatesPicker.test.tsx` (15 tests) | **VERIFIED** | Full AC coverage. Backend database seeding from template seed JSON owned by backend developer. |
| **FEAT-E01** | • Workspace overview tab displaying task completion rates.<br/>• Status breakdown progress bars and archetype counts.<br/>• Workload distribution summary by assignee.<br/>• Milestone progress rollup percentages. | `views/TaskViews.tsx`<br/>`WorkloadSummary.tsx` | `TaskViews.test.tsx` (17 tests)<br/>`TaskIntegrationE2E.test.tsx` (6 tests) | **VERIFIED** | Full AC coverage of client aggregation and overview metrics. |
| **FEAT-F01a** | • Bell icon with unread badge counter in navigation rail.<br/>• Notification popover preview showing recent notifications.<br/>• Dedicated `/inbox` route with segmented tabs (Action Required vs. Updates).<br/>• Mark as read, mark all read, and click-to-navigate to task. | `NotificationBell.tsx`<br/>`NotificationItem.tsx`<br/>`InboxView.tsx` | `Notifications.test.tsx` (19 tests) | **VERIFIED** | Full AC coverage for REST notification inbox. Realtime push sync is a separate backend dependency (`DEP-NOTIF-02`). |
| **FEAT-G01** | • Email/password and Google login forms.<br/>• HttpOnly session cookie lifecycle with CSRF header injection (`X-CSRF-Token`).<br/>• Protected route guard redirecting unauthenticated users to `/login`.<br/>• Session refresh, active user profile, and clean logout. | `AuthFlow.tsx`<br/>`api-client.ts`<br/>`ProtectedRoute.tsx` | `AuthFlow.test.tsx` (17 tests)<br/>`AuthTheme.test.tsx` (5 tests)<br/>`api-client.test.ts` (18 tests) | **VERIFIED** | Full AC coverage including CSRF header interceptors and session recovery. |
| **FEAT-G02a** | • 4 system roles: Community Admin, Workspace Owner, Coordinator, Member.<br/>• Granular capability-based RBAC engine (`hasCapability`, `Can` wrapper).<br/>• Server-authoritative capability evaluation with client enforcement.<br/>• Downward-only privilege boundaries; UI elements hidden/disabled without capability. | `authorization.ts`<br/>`PermissionGate.tsx`<br/>`usePermissions.ts` | `authorization.test.ts` (19 tests)<br/>`WorkspaceSwitcher.test.tsx` (14 tests) | **VERIFIED** | Full AC coverage including grant ceiling and fail-closed tenant boundary checks. |
| **FEAT-G03** | • Permission Inspector drawer displaying effective capabilities in plain language.<br/>• Role Simulator allowing Owners/Coordinators to preview view as other roles.<br/>• Strict downward-only capability intersection: `effectiveCapabilities = callerCapabilities ∩ previewRoleCapabilities`.<br/>• Visual banner during preview mode; mutation operations blocked during preview.<br/>• Non-mutating POST allowlist for safe reads/exports during preview. | `settings/PermissionInspector.tsx`<br/>`settings/PermissionsSettingsView.tsx`<br/>`authorization.ts`<br/>`api-client.ts` | `RoleSimulator.test.tsx` (7 tests)<br/>`authorization.test.ts` (19 tests)<br/>`api-client.test.ts` (8 tests) | **VERIFIED** | Full frontend AC coverage across 34 tests. Plain-language capability presentation, scenario sandbox, downward-only role preview banner, non-mutating POST allowlist, and client-side capability intersection are fully verified against MSW. Production server-side capability intersection and HTTP middleware enforcement remain backend-owner acceptance responsibilities. |
| **FEAT-G04** | • Security Audit Log viewer in Workspace Settings.<br/>• Display actor, event type, target, timestamp, and server-reported hash-chain status badge (`VALID` / `BROKEN`).<br/>• Structured filters for actor ID, target ID, date range, and event category.<br/>• CSV export with `audit:export` capability check and CSRF protection.<br/>• Mutation protection in preview mode. | `settings/AuditLogSettingsView.tsx`<br/>`settings/auditExportCsv.ts`<br/>`settings/useAuditLog.ts` | `AuditLog.test.tsx` (22 tests) | **VERIFIED** | Full frontend AC coverage including audit event table, structured filters, CSV export, and server-reported integrity status badge (`VALID`/`BROKEN`). Preserves UI trust disclosure that mock/server-reported status is not production cryptographic proof. Live cryptographic verification of the append-only SHA-256 chain in PostgreSQL belongs to backend/security ops. |
| **FEAT-J01a** | • Export visible tasks from List, Board, Calendar, or Timeline to CSV.<br/>• Preserves active search, filter, and sort parameters in export.<br/>• Generates valid UTF-8 CSV with RFC 4180 escaping and UTF-8 BOM (`\uFEFF`).<br/>• OWASP formula injection protection (`=`, `+`, `-`, `@` escaped).<br/>• Permission check: requires `task:export` capability. | `taskExportCsv.ts`<br/>`useTaskExportCsv.ts` | `TaskExportCsv.test.tsx` (10 tests) | **VERIFIED** | Full AC coverage. Import wizard is scheduled for Phase 2 (`FEAT-J01b`). |
| **FEAT-J03** | • 13 Base UI accessible primitives (Dialog, Tooltip, Dropdown, Tabs, Button, Input, etc.).<br/>• Contrast tokens guaranteeing $\ge$ 4.5:1 text contrast and $\ge$ 3:1 UI element contrast.<br/>• Visible focus rings with semantic `.focus-ring` utility.<br/>• Full keyboard accessibility and navigation across all views.<br/>• Respect `prefers-reduced-motion` media queries. | `apps/web/src/components/ui/`<br/>`apps/web/src/index.css`<br/>`keyboard.ts`<br/>`theme.tsx`<br/>`reduced-motion.ts` | `design-tokens.test.ts` (6)<br/>`keyboard.test.tsx` (10)<br/>`theme.test.tsx` (5)<br/>`reduced-motion.test.ts` (3)<br/>12 UI primitive test files | **VERIFIED** | Full AC coverage across 4 foundation suites (24 tests, 70 static expect sites) plus 98 UI component tests. |
| **FEAT-K01** | • Safe client-side URL parsing with protocol validation (`https://` only per `SEC-T09`), rejecting dangerous/protocol-relative schemes (`javascript:`, `data:`, `file:`, `vbscript:`, `//`, `\\`).<br/>• Clean domain/hostname extraction and presentation as branded badges (GitHub, Figma, Google Docs, generic).<br/>• Path/query truncation preserving domain context.<br/>• Copy-to-clipboard button with visual feedback and error handling.<br/>• Accessible external link indicators (`(opens in new tab)`).<br/>• Zero third-party favicon requests (privacy safe).<br/>• Structured candidate contract reconciliation (`externalLinks` requiring `[id, url, title, provider]`).<br/>• Full link management lifecycle: attach URL, auto/custom title, inline edit, remove link, `canEditCustomFieldsLinks` permission gating.<br/>• Optimistic cache mutations with automatic snapshot rollback.<br/>• Concurrency conflict detection (409) against `task.fieldRevisions.externalLinks` with user-facing error alert. | `SmartUrlChip.tsx`<br/>`markdown-ast.tsx`<br/>`TaskPeekDrawer.tsx`<br/>`TaskExternalLinksSection.tsx`<br/>`useUpdateTask.ts` | `SmartUrlChip.test.tsx` (22 tests)<br/>`markdown-ast.test.tsx` (14 tests)<br/>`TaskPeekDrawer.test.tsx` (26 tests)<br/>`TaskExternalLinksManagement.test.tsx` (13 tests) | **VERIFIED** | Full frontend AC coverage across 75 tests in 4 suites (22 dedicated unit tests + 14 markdown tests + 26 drawer integration tests + 13 management workflow tests). Domain-aware smart URL chip renderer, SEC-T09 protocol validation, path truncation, clipboard copy, accessibility indicators, drawer integration, attach/edit/remove workflows, permission gates, optimistic updates with rollback, and 409 concurrency conflict handling are fully verified. Native Git commit parsers excluded per D5; rich OpenGraph card scraper deferred to Phase 3 under `DEP-METADATA-01` (separate FEAT ID pending approval). |

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

### 3. `FEAT-K01` (External Smart URL Metadata Chips & Link Management)
* **Authoritative Status:** **FE COMPLETE** & **VERIFIED**.
* **Governance Alignment & Scope Delivery:**
  - *Delivered Frontend Scope (FE-VS13, FE-VS13.1 & FE-VS13.2 @ `b4a514a`):* Built `SmartUrlChip.tsx` with SEC-T09 protocol validation (enforcing `https://` [and `http://` in dev], rejecting `javascript:`, `data:`, `file:`, `vbscript:`, `//`, `\\`), domain-aware branded badges (GitHub, Figma, Google Docs/Sheets/Slides/Drive, generic), path truncation, copy-to-clipboard action with visual feedback and error handling, direct navigation with `target="_blank"`, `rel="noopener noreferrer"`, and screen-reader `(opens in new tab)` announcement.
  - *Structured Link Management Workflow (FE-VS13.2):* Created `TaskExternalLinksSection.tsx` inside `TaskPeekDrawer.tsx`. Supports full CRUD operations: attaching new URLs with live provider icon/badge detection, title inputs (auto-generated fallback or custom), inline editing of existing links, and link removal with confirmation.
  - *Concurrency & Error Recovery (FE-VS13.2):* Implemented optimistic cache mutations in `useUpdateTask` with automatic snapshot rollback on server error. Incorporates 409 conflict detection against `task.fieldRevisions.externalLinks` and renders user-facing dismissible error banners.
  - *Permission Enforcement (FE-VS13.2):* Gated link add/edit/remove controls behind `canEditCustomFieldsLinks !== false`. Read-only users retain safe link rendering, navigation, and clipboard copy without mutation controls. Clean empty-state degradation suppresses the section for read-only users when zero links are present.
  - *Contract Reconciliation (FE-VS13.1 & FE-VS13.2):* Updated OpenAPI 0.3.20-draft across all 3 mirror files (`openapi-0.3.20-draft.yaml`, `Community-Work-Management-v1.5/contracts/openapi-0.3.20-draft.yaml`, `Community-Work-Management-v1.5/docs/contracts/openapi.yaml`) requiring `[id, url, title, provider]` on `TaskDto.externalLinks.items` per Master Spec v1.5 §10 line 21179. Regenerated `packages/contracts/src/api-types.ts`. All 51/51 `validate_v1_5.py` checks passing.
  - *MSW Mock Server Integration:* Updated `apps/web/src/mocks/handlers/tasks.ts` to validate SEC-T09 protocols, reject duplicate URLs, enforce permissions, track `task.fieldRevisions.externalLinks`, and return 409 `FIELD_REVISION_CONFLICT` when base revisions are stale.
  - *Automated Test Coverage:* Verified with 75 tests across 4 suites: `SmartUrlChip.test.tsx` (22), `markdown-ast.test.tsx` (14), `TaskPeekDrawer.test.tsx` (26), and `TaskExternalLinksManagement.test.tsx` (13).
  - *Backend Handoff Details & Field Reconciliation:*
    - *API `provider` vs DB `provider_icon`:* Master Spec v1.5 Jira audit matrix (line 20173) references a preliminary relational sketch `task_external_links (id, task_id, url, title, provider_icon)`. In contrast, the candidate OpenAPI contract (`0.3.20-draft`) and Master Spec §10 TypeScript definitions specify `externalLinks: Array<{ id: string, url: string, title: string, provider: string }>`. The API field `provider` carries semantic identifier strings (`github`, `figma`, `google`, `generic`), while icons are rendered client-side from the UI design system. When implementing live persistence, the backend owner may map the relational column `provider_icon` (or `provider`) to/from the API `provider` property, or store the canonical DTO array directly in `tasks.external_links_jsonb`.
    - *Dependency Identifier Verification (`DEP-LINKS-01`):* `DEP-LINKS-01` was used as an informal working label in earlier development notes, but does not exist in the authoritative Decision Register (`decision-register.md`). It is NOT an approved dependency identifier and must not be cited as a blocking dependency. Live backend persistence is unblocked standard backend implementation work.
    - *Four-Way Implementation Boundary:* (1) Frontend implementation & MSW tests: DELIVERED; (2) Candidate OpenAPI: RECONCILED; (3) Live PostgreSQL persistence and production authorization: BACKEND-OWNER RESPONSIBILITIES; (4) Formal contract freeze: PENDING JOINT APPROVAL.
  - *Scope Boundaries:* Native Git commit parsers are excluded per D5; rich server-side OpenGraph card scraping (`DEP-METADATA-01`) is formally catalogued as a Phase 3 metadata enhancement (separate canonical FEAT ID pending approval). Day-1 smart URL chips and structured link management (`FEAT-K01`) are 100% complete and verified.

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
* **FE COMPLETE:** 29 capabilities (87.88%)
* **FE PARTIAL:** 0 capabilities (0.00%)
* **FE NOT STARTED:** 0 capabilities (0.00%)
* **FE BLOCKED:** 3 capabilities (`FEAT-C04`, `FEAT-C06`, `FEAT-G02b`)
* **BACKEND DEPENDENT:** 1 capability (`FEAT-F02`)
* **Excluded from Denominator:** 13 DEFERRED (Phases 2–4) + 7 REJECTED = 20 features (explicitly scheduled outside Phase 1 release scope).

$$\text{Frontend Completeness} = \frac{\text{FE COMPLETE}}{\text{Eligible Scope}} \times 100 = \frac{29}{33} \times 100 = \mathbf{87.88\%}$$

### Metric 2 — Full Approved Frontend Roadmap Completeness
Evaluates progress across all **46 non-rejected capabilities** (including deferred work):
* **Non-Rejected Roadmap Total:** 46 capabilities (33 Phase 1 + 5 Phase 2 + 5 Phase 3 + 3 Phase 4)
* **Active Phase 1 Scope Progress:** **87.88%** (29.0 / 33)
* **Full Roadmap Scope (including 13 Phase 2–4 Deferred):**
  $$\text{Full Roadmap Completeness} = \frac{29}{46} \times 100 = \mathbf{63.04\%}$$

### Metric 3 — Functional Verification Coverage (Evidence-Based AC Audit)
* **Implemented Frontend Capabilities:** 29 (29 FE COMPLETE + 0 FE PARTIAL)
* **Acceptance Criteria Verification Breakdown:**
  * **VERIFIED (Complete AC coverage in automated tests):** 29 capabilities
  * **PARTIALLY VERIFIED:** 0 capabilities
  * **NOT VERIFIED:** 0 capabilities
* **Strict Implemented Verification Rate:**
  $$\text{Strict Verification Rate} = \frac{29}{29} \times 100 = \mathbf{100.00\%}$$
* **Total Phase 1 Verification Rate (across all 33 in-scope capabilities):**
  * Strict: $29 / 33 \times 100 = \mathbf{87.88\%}$
* **Aggregate Automated Test Suite Proof (Reported Separately):**
  * 66 test files in `apps/web/`, 736 tests passed (100% green in Vitest).
  * 5 test files in `@sonder/server`, 24 tests passed (100% green).
  * Total monorepo automated tests: 760 tests across 71 test suites.

### Metric 4 — API Contract & Backend Handoff Readiness
* **Contract Ready:** 29 capabilities
* **Contract Gap:** 1 capability (`FEAT-G02b` [DEP-ROLES-01])
* **Contract Ambiguous:** 2 capabilities (`FEAT-C04` [DEP-SV-01 Decisions A–E], `FEAT-C06` [DEP-SV-01 Decision D])
* **Backend Contract Dependency:** 1 capability (`FEAT-F02` [DEP-REALTIME-01])
* **Backend Handoff Readiness:**
  * 29 capabilities: `READY FOR BACKEND INTEGRATION`
  * 1 capability: `BACKEND CONTRACT DEPENDENCY` (`FEAT-F02`)
  * 3 capabilities: `BLOCKED ON PRODUCT GOVERNANCE / CONTRACT GAP` (`FEAT-C04`, `FEAT-C06`, `FEAT-G02b`)
  * 20 capabilities: `NOT APPLICABLE` (13 Deferred + 7 Rejected)

---

## 7. Historical Milestone Comparison & Delivery Progression

| Evaluation Metric | VS-09L Baseline | FE-VS12.2 Reconciled | FE-VS13 Delivered | FE-VS13.2 Delivered | Trend / Analysis |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Active Branch** | `feat/FE-VS09L` | `feat/FE-VS12` | `feat/FE-VS13-smart-url-chips` | `feat/FE-VS13-smart-url-chips` | External Link management lifecycle. |
| **Total In-Scope Phase 1** | 33 capabilities | 33 capabilities | 33 capabilities | 33 capabilities | Stable, reconciled scope boundary. |
| **FE COMPLETE** | 28 capabilities | 28 capabilities | 29 capabilities | **29 capabilities** | Full lifecycle for `FEAT-K01`. |
| **FE PARTIAL** | 1 capability | 1 capability | 0 capabilities | **0 capabilities** | Closed via `FEAT-K01` delivery. |
| **FE NOT STARTED** | 0 capabilities | 0 capabilities | 0 capabilities | **0 capabilities** | All 10 backlog capabilities completed. |
| **FE BLOCKED** | 3 capabilities | 3 capabilities | 3 capabilities | **3 capabilities** | Gated on product decisions (`DEP-SV-01`, `DEP-ROLES-01`). |
| **BACKEND DEPENDENT** | 1 capability | 1 capability | 1 capability | **1 capability** | `FEAT-F02` (WebSocket gateway `DEP-REALTIME-01`). |
| **Weighted FE Score** | **86.36%** (28.5/33) | **86.36%** (28.5/33) | **87.88%** (29/33) | **87.88%** (29/33) | Core Phase 1 frontend complete. |
| **AC Verification Rate (Strict)** | Unmeasured | **96.55%** (28/29) | **100.00%** (29/29) | **100.00%** (29/29) | 100% AC verification for all implemented slices. |
| **AC Verification Rate (Weighted)**| Unmeasured | **98.28%** (28.5/29) | **100.00%** (29/29) | **100.00%** (29/29) | Complete verification of all implemented slices. |
| **Automated Web Tests** | 676 tests (63 suites) | 693 tests (64 suites) | 719 tests (65 suites) | **736 tests (66 suites)** | +43 tests since FE-VS12; 100% passing in Vitest. |

### Historical Delivery Progression (Inventory A & Governance Delivery):
1. `VS-09A`: Single-Item Task Archive & 10-Second Undo Toast (`FEAT-A10a`) — Delivered & locked at `0b82ef9`.
2. `VS-09B`: 30-Day Workspace Trash & Bulk Action Bar (`FEAT-A10b`) — Delivered & locked.
3. `VS-09C`: Workspace Starter Templates Card Picker UI (`FEAT-D05a`) — Delivered & locked.
4. `VS-09D`: Work-Item Archetypes Badge System (`FEAT-A01`) — Delivered & locked.
5. `VS-09E`: Single-Click Task & Subtask Checklist Cloning (`FEAT-A07`) — Delivered & locked.
6. `VS-09F`: Filtered View UTF-8 CSV Export on Toolbar (`FEAT-J01a`) — Delivered & locked.
7. `VS-09G`: Collapsible Backlog Tray in List & Board Views (`FEAT-B02`) — Delivered & locked.
8. `VS-09H`: Workspace Settings Shell & Custom Fields Manager (`FEAT-D01`, `FEAT-D04a`) — Delivered & locked.
9. `VS-09I`: Permission Inspector & Role Simulator (`FEAT-G03`) — Delivered & locked at `a6f04a2`.
10. `VS-09J`: Append-Only Hash-Chained Audit Log Table & CSV Export (`FEAT-G04`) — Delivered & locked at `59a9511`.
11. `VS-09L`: Phase 1 Partial-Scope Closure & Security Hardening — Delivered & locked at `5ab2436`.

---

## 8. Local Execution & Runtime Setup Guide

To execute Sonder locally in browser development mode and verify frontend behavior:

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Launch web application dev server
pnpm --filter @sonder/web dev
```

* **Local Development URL:** `http://localhost:3000`
* **Application Routes:**
  * `/` — Application Shell & Root Redirect
  * `/workspaces/:workspaceId` — Core Task View Family (List, Board, Calendar, Timeline)
  * `/workspaces/:workspaceId?task=:taskId` — Task Peek Drawer deep link
  * `/inbox` — Segmented Notification Center Inbox
  * `/workspaces/:workspaceId/settings` — Workspace Settings (Workflow, Custom Fields, Roles, Audit Log)
* **Mock Authentication & Persistence Behavior:**
  * In Vite development mode (`import.meta.env.DEV`), MSW activates automatically via `setupWorker` in `apps/web/src/mocks/browser.ts`.
  * `apps/web/src/mocks/handlers/auth.ts` intercepts `/api/v1/session` and automatically provisions an active authenticated session.
  * **Default Seed User:** Alex Morgan (`alex.morgan@example.com`, Community Owner / Workspace Admin).
  * **Persistence Boundary:** MSW stores state in browser memory. Reloading the page resets mock data to default seed fixtures. It does not represent live backend persistence.

---

## 9. UI/UX Track B Status & Prerequisite Checklist

* **Current Status:** Strictly **PAUSED**.
* **Rationale:** No design system refactoring, visual styling changes, or micro-ergonomic tuning may distract from establishing complete functional feature coverage.

### Prerequisite Checklist Before Track B Unfreeze:
- [x] Complete Milestone VS-09A (Task Archive & 10s Undo Toast) — DELIVERED & LOCKED (`0b82ef9`)
- [x] Complete Milestone VS-09B (30-Day Trash & Bulk Action Bar) — DELIVERED & LOCKED
- [x] Complete Milestone VS-09C (Starter Templates Picker UI) — DELIVERED & LOCKED
- [x] Complete Milestone VS-09D (Work-Item Archetypes) — DELIVERED & LOCKED
- [x] Complete Milestone VS-09E (Task Cloning) — DELIVERED & LOCKED
- [x] Complete Milestone VS-09F (Filtered CSV Export) — DELIVERED & LOCKED
- [x] Complete Milestone VS-09G (Backlog Tray in Views) — DELIVERED & LOCKED
- [x] Complete Milestone VS-09H (Workspace Settings Shell) — DELIVERED & LOCKED
- [x] Complete Milestone VS-09I (Permission Inspector & Role Simulator) — DELIVERED & LOCKED
- [x] Complete Milestone VS-09J (Audit Log Table & CSV Export) — DELIVERED & LOCKED
- [x] Reconcile Frontend Completeness Baseline (FE-VS12 / FE-VS12.1 / FE-VS12.2) — DELIVERED & LOCKED
- [x] Complete FE-VS13 (Smart URL Chip Experience `FEAT-K01`) — DELIVERED & LOCKED
- [x] Complete FE-VS13.1 (Smart URL Chip Contract & Verification Closeout) — DELIVERED & LOCKED
- [x] Complete FE-VS13.2 (Structured External Link Management `FEAT-K01`) — DELIVERED & LOCKED
- [ ] Final Accessibility & Keyboard Navigation Audit Gate
- [ ] Formal Stakeholder Authorization to Unfreeze UI/UX Track B

---

## 10. Completed Frontend Implementation Milestones: FE-VS13, FE-VS13.1 & FE-VS13.2

### Milestone FE-VS13: Smart URL Chip & External Link Experience (`FEAT-K01`) — DELIVERED & LOCKED
* **Milestone Type:** Frontend Feature Implementation & SEC-T09 Hardening
* **Target Feature ID:** `FEAT-K01` (External Smart URL Links / Chips)
* **Outcome:** Delivered `SmartUrlChip.tsx`, SEC-T09 scheme validation, branded domain badges (GitHub, Figma, Google Docs/Sheets/Slides/Drive, generic), path truncation, copy-to-clipboard with animated/accessible feedback, `target="_blank"`, `rel="noopener noreferrer"`, integrated into Markdown AST (`markdown-ast.tsx`) and Task Peek Drawer (`TaskPeekDrawer.tsx`). 22 unit tests passing in `SmartUrlChip.test.tsx` (719 web tests passing total).

### Milestone FE-VS13.1: Smart URL Chip Contract & Verification Closeout (`FEAT-K01`) — DELIVERED & LOCKED
* **Milestone Type:** Frontend Contract Reconciliation & Verification Closeout
* **Target Feature ID:** `FEAT-K01` (External Smart URL Links / Chips)
* **Outcomes & Verifications:**
  1. *Candidate OpenAPI Reconciliation:* Added `externalLinks?: Array<{ id: string, url: string, title?: string, provider?: string }>` to `TaskDto`, `CreateTaskRequest`, and `UpdateTaskRequest` in all 3 candidate OpenAPI mirror files (`openapi-0.3.20-draft.yaml`, `Community-Work-Management-v1.5/contracts/openapi-0.3.20-draft.yaml`, `Community-Work-Management-v1.5/docs/contracts/openapi.yaml`).
  2. *Schema & Tooling Invariants:* Re-ran `Community-Work-Management-v1.5/validation/validate_v1_5.py` confirming 51/51 checks pass with exactly 201 schemas and exact byte-for-byte copy match. Regenerated `@sonder/contracts` with `openapi-typescript`.
  3. *Type Safety & Zero Casts:* Eliminated all `as any` and `as unknown` casts in `TaskPeekDrawer.tsx` and `TaskPeekDrawer.test.tsx`.
  4. *MSW Mock Fixtures:* Populated `ENG-101` with structured external links (GitHub PR, Figma specs) and `ENG-102` with Markdown description links.
  5. *Live Drawer Integration Tests:* Added component-level integration suite in `TaskPeekDrawer.test.tsx` testing live drawer rendering with MSW and QueryClient across structured links, Markdown description links, copy button interaction, and linkless empty states (25 tests in `TaskPeekDrawer.test.tsx`, 722 tests passing in `apps/web`).
  6. *Navigation & Usability Verification:* Verified against Master Specification and PRD that external redirect confirmation dialogs are not required; direct navigation with `target="_blank"`, `rel="noopener noreferrer"`, and screen reader text `(opens in new tab)` is the canonical design.
  7. *P3 Metadata Reclassification:* Confirmed Day-1 client-side smart URL chip is complete; rich OpenGraph cards requiring server scraping (`DEP-METADATA-01`) is catalogued in Phase 3.
  8. *Monorepo Verification:* Monorepo builds cleanly (`pnpm build`), typechecks with 0 errors (`pnpm typecheck`), and all 722 tests pass across 65 suites (`pnpm --filter @sonder/web test`).

### Milestone FE-VS13.2: Structured External Link Management (`FEAT-K01`) — DELIVERED & LOCKED (`b4a514a`)
* **Milestone Type:** Frontend Workflow Implementation & Contract Enforcement
* **Target Feature ID:** `FEAT-K01` (External Smart URL Links / Chips)
* **Outcomes & Verifications:**
  1. *Authoritative Contract Synchronization:* Updated `TaskDto.properties.externalLinks.items.required` to `[id, url, title, provider]` across all 3 candidate OpenAPI mirror files matching Master Specification v1.5 §10 line 21179. All 51/51 `validate_v1_5.py` checks pass. Regenerated `@sonder/contracts` TypeScript types with non-optional fields on task responses.
  2. *Interactive Management Section (`TaskExternalLinksSection.tsx`):* Implemented full structured link lifecycle in Task Peek Drawer: attach new external URLs, live provider icon/badge detection, title inputs (custom or auto-derived), inline link editing, and link removal with confirmation.
  3. *Permission Gating:* Gated all mutation controls behind `canEditCustomFieldsLinks !== false`. Read-only users can view, copy, and navigate links, but cannot add, edit, or delete. If zero links exist for a read-only user, the section gracefully degrades to render nothing.
  4. *Optimistic Mutations & Concurrency Rollback:* Enhanced `useUpdateTask` to optimistically update `externalLinks` in the TanStack query cache. Configured 409 conflict detection against `task.fieldRevisions.externalLinks` with automatic cache snapshot rollback and dismissible user error alerts.
  5. *MSW Mock Server Alignment:* Updated MSW task PATCH handler to validate SEC-T09 protocols, reject duplicate URLs, enforce permissions, track `task.fieldRevisions.externalLinks`, and return 409 `FIELD_REVISION_CONFLICT` when base revisions are stale.
  6. *Chip Actions Integration:* Added `actions?: React.ReactNode` prop to `SmartUrlChip.tsx`, enabling inline edit and delete buttons to dock neatly within chip containers.
  7. *Automated Test Verification:* Added dedicated suite `TaskExternalLinksManagement.test.tsx` (13 tests) and updated `TaskPeekDrawer.test.tsx` (26 tests). All 75 tests across 4 suites for `FEAT-K01` pass 100% green. Full monorepo passes 760 tests (736 web + 24 server), typechecks with 0 errors, and builds cleanly. Delivered at commit `b4a514a`.
* **Track B Status:** Remains strictly **PAUSED**.

### Milestone FE-VS13.2.1: Governance and Backend Handoff Consistency — DELIVERED & LOCKED
* **Milestone Type:** Governance, Documentation & Backend Handoff Reconciliation
* **Target Feature ID:** `FEAT-K01` / `DEP-METADATA-01`
* **Outcomes & Verifications:**
  1. *OpenGraph Scope Delineation:* Reconciled all roadmap citations, diagrams, and dependency registers across the three delivery trackers. Reaffirmed that `FEAT-K01` is 100% complete and verified on the frontend for Phase 1. Clarified that server-side OpenGraph metadata scraping is catalogued under `DEP-METADATA-01` as a Phase 3 metadata enhancement (separate FEAT ID pending approval), and does not block `FEAT-K01`.
  2. *Backend Handoff Alignment:* Documented the semantic mapping between API DTO field `provider` and the preliminary Master Spec matrix research sketch `provider_icon` on `task_external_links`. Confirmed client-side token-backed rendering eliminates binary asset transmission.
  3. *Dependency Identifier Integrity:* Verified that `DEP-LINKS-01` does not exist in the authoritative Decision Register (`decision-register.md`) and must not be cited as an approved dependency ID. Recorded backend persistence as standard implementation handoff.
  4. *Contract and Type Integrity:* Verified OpenAPI mirror consistency, passed `typegen:openapi:check`, and passed all 51 static validation checks (`validate_v1_5.py`).
  5. *Commit & Test Accuracy:* Confirmed `FE-VS13.2` commit SHA `b4a514a` and exact verification metrics (736 web tests, 24 server tests, 760 monorepo tests passing 100% green).
* **Track B Status:** Remains strictly **PAUSED**.
