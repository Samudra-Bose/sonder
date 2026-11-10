# SONDER — VS-07A.2: ROADMAP RECONCILIATION & IMPLEMENTATION RE-ALIGNMENT REPORT

**Document Version:** 1.0.0  
**Status:** CANONICAL ROADMAP RECONCILED & AUDITED  
**Date:** 2026-11-10  
**Feature Branch:** `docs/FE-VS07A2-roadmap-ux-baseline`  
**Baseline Commit:** `8fabfc2` (HEAD of `develop`, clean and synchronized)  
**Governance Methodology:** PLAN → GRILL → IMPLEMENT → TEST → REVIEW → LOCK → DOCUMENT  
**Target Milestone:** VS-07A.2 (Roadmap Reconciliation & Website-Wide UI/UX Baseline Audit)  

---

## Executive Summary & Purpose

This document delivers **VS-07A.2**, establishing a complete reconciliation of the Sonder application against the canonical product and engineering roadmap, formally unblocking frontend development while Saved Views backend decisions are under review, and establishing a persistent website-wide UI/UX audit and improvement workstream.

### Core Objectives Achieved
1. **Unblock Frontend Engineering:** Formally records that Saved Views (FEAT-C04) contract readiness is complete, delegating decisions A–E to the Backend Lead and Product Owner, and freeing the frontend roadmap to advance independently.
2. **Exhaustive Roadmap Reconciliation:** Audits the entire Git history (PRs #1 through #30) and application codebase against Master Specification v1.5.0, classifying every feature across Phase 1.
3. **Single Next Feature Recommendation:** Evaluates all remaining uncompleted roadmap capabilities against rigorous readiness criteria and recommends exactly ONE next independent implementation milestone: **FEAT-A04 — Collaboration Spine: Threaded Comments, @Mentions & Task Watchers**.
4. **Establish Dual-Track Governance:** Establishes **Track A (Engineering Milestones)** and **Track B (Website-Wide UI/UX Audit & Improvements)** to run concurrently without competing priorities.

---

## 1. Saved Views (FEAT-C04) Governance Status

Following the execution of milestones VS-07A and VS-07A.1, the status of **Saved Views (FEAT-C04)** is formally recorded as follows:

| Governance Milestone / Stage | Scope & Artifacts | Status | Responsible Party |
| :--- | :--- | :--- | :--- |
| **VS-07A: Contract Readiness** | `vs-07a-saved-views-contract-readiness-report.md` | **COMPLETED & MERGED** (PR #29, `fb45f66`) | Frontend Lead |
| **VS-07A.1: Contract Reconciliation** | `vs-07a.1-saved-views-contract-signoff-report.md`<br>`proposed-saved-views-openapi.yaml` | **COMPLETED & MERGED** (PR #30, `2de4522`, `8fabfc2`) | Frontend Lead |
| **Decisions A–E (PO / Backend)** | Decisions on Default View, Filter Normalization, Quotas, Multi-View Display Options, and Workspace Default View API | **PENDING REVIEW** | Backend Lead & Product Owner |
| **Backend Implementation Confirmation** | PostgreSQL tables, RLS policies, REST endpoints, and WebSocket event emitters | **PENDING CONFIRMATION** | Backend Lead |
| **Frontend Implementation (VS-07B)** | UI components, view selector, draft state bar, and TanStack query integration | **STRICTLY DEFERRED** until decisions A–E are formally resolved | Frontend Lead |

### Unblocking Mandate
Engineering governance explicitly dictates that **the remainder of the product roadmap must not wait for Saved Views.** The six core Saved Views API operations are audited, the contract delta is isolated, and backend review will proceed asynchronously. Frontend engineering immediately proceeds to the next unblocked canonical milestone.

---

## 2. Canonical Source-of-Truth & Repository Preflight

### 2.1 Preflight Verification
- **Baseline Git Commit:** `8fabfc2` (synchronized with `origin/develop`, working tree clean).
- **Dedicated Branch:** `docs/FE-VS07A2-roadmap-ux-baseline`.
- **Preflight Static Document Check:** `pnpm validate:docs` passed 51/51 checks.
- **Contract & Type Immutability Check:** `git diff --exit-code Community-Work-Management-v1.5/` and `git diff --exit-code packages/contracts/src/api-types.ts` returned zero modifications.

### 2.2 Canonical Sources Reviewed
1. **Master Specification v1.5.0:**
   - Section 1.1: *Core Architectural Synthesis & Milestone Sequences*.
   - Section 2: *Authoritative Source-of-Truth and Decision Register* (SOT-01 through SOT-08, DEC-OPEN-01 through DEC-OPEN-15).
   - Section 3: *Feature Inventory & Authoritative Milestones (FEAT-A01 through FEAT-L01)*.
   - Section 5.3: *URL Serialization vs. Saved Views*.
2. **Phased Vertical-Slice Implementation Plan (`phased-vertical-slices.md`):**
   - Section 2: *Scope and Release Boundaries (Phase 1 Initial Production Release: M1.1, M1.2, M1.3)*.
   - Section 17.3: *Recommended Vertical Sequencing (Steps 1–12)*.
3. **Frontend Antigravity Blueprint (`frontend-antigravity-blueprint.md`):**
   - Section 13.5: *Repository Baseline & Implementation Status*.
   - Section 13.6: *State Machine & Cache Topology*.
   - Section 13.8: *Information Architecture & Component Hierarchy*.
4. **Frontend Experience & UI/UX Research (`frontend-experience-research.md`):**
   - Sections 4–7: *Design Principles, Density Rules, WCAG 2.2 AA Contrast Standards, and Component Primitives*.
5. **Full Git Commit History on `develop`:** Commits from PR #1 (`setup-vs00-foundations`) through PR #30 (`VS-07A.1 sign-off packet`).

---

## 3. Full Roadmap Reconciliation Matrix

The table below reconciles all canonical Phase 1 capabilities against actual merged implementation and test evidence in the repository.

| Feature Family / Capability | Canonical FEAT ID | Planned Milestone | Actual Implementation & Location | Verification Evidence | Status | Dependencies & Readiness |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication & Session Spine** | `FEAT-G01` | M1.1 (Phase 1) | `/modules/auth`<br>Session cookies, CSRF double-submit, login/register | PR #2 (`9915196`), 25 tests, `AuthFlow.test.tsx` | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Design System Primitives & Tokens** | `FEAT-J03` | M1.1 (Phase 1) | `/components/ui`, `/lib/design-tokens.ts`<br>Accessible buttons, inputs, modals, cards, badges | PR #5 (`3c4ddc7`), 16 tests, `design-tokens.test.ts` | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Application Shell & Responsive Rail** | `FEAT-B01` | M1.1 (Phase 1) | `/modules/app-shell`<br>Left navigation rail, header, user menu, mobile nav | PR #6 (`8a04498`), 14 tests, `AppShell.test.tsx` | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Workspace Management & Switcher** | `FEAT-B01` | M1.1 (Phase 1) | `/modules/workspace`<br>Personal vs. Shared workspaces, switcher popover/drawer | PR #8 (`52c30b6`), 22 tests, `WorkspaceSwitcher.test.tsx` | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Omnibar Command Palette (`Cmd+K`)** | `FEAT-C05` | M1.1 (Phase 1) | `/modules/omnibar`<br>Modal search across keys, titles, workspaces | PR #9 (`ab116da`), 18 tests, `OmnibarModal.test.tsx` | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **My Work Cross-Workspace Dashboard** | `FEAT-C03` | M1.1 (Phase 1) | `/modules/my-work`<br>Today, Upcoming, Later, Done triage buckets | PR #10 (`c89782c`), 24 tests, `MyWorkView.test.tsx` | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **App Shell & Integration QA Suite** | Multi | M1.1 (Phase 1) | Comprehensive multi-module integration suite | PR #11 (`6a9e643`), 118 monorepo tests | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Task Model, Key Allocation & Data Layer**| `FEAT-A02`, `FEAT-C07` | M1.1 (Phase 1) | `/modules/tasks/api.ts`, `/modules/tasks/useWorkspaceTasks.ts` | PR #13 (`95e71f7`), MSW mock infrastructure | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Task Peek Drawer & Deep-Linking** | `FEAT-A02`, `FEAT-A03` | M1.1 (Phase 1) | `/modules/tasks/TaskPeekDrawer.tsx`<br>Right-docked drawer, URL `?task=` sync | PR #14 (`b37efe0`), 28 tests, `TaskPeekDrawer.test.tsx` | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Inline Task Attribute Editing** | `FEAT-A03`, `FEAT-A08` | M1.1 (Phase 1) | `/modules/tasks/InlineFieldEditors.tsx`<br>Title, status, priority, dates, assignee, labels | PR #15 (`8491497`), PR #16 (`4591ee1`), 35 tests | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Quick Task Composer (`C` shortcut)** | `FEAT-A02` | M1.1 (Phase 1) | `/modules/tasks/QuickTaskComposer.tsx`<br>Global modal composer, prefill support | PR #17 (`67cba33`), 20 tests, `QuickTaskComposer.test.tsx` | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Subtask Hierarchy (Depth 1–2)** | `FEAT-A06` | M1.1 (Phase 1) | `/modules/tasks/SubtaskList.tsx`, `ReparentTaskModal.tsx`<br>Tree-grid nesting, reparenting modal | PR #18 (`3c290d4`), 26 tests, `SubtaskHierarchy.test.tsx` | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Task Domain Regression QA Gate** | Multi | M1.1 (Phase 1) | `/modules/tasks/TaskIntegrationE2E.test.tsx`<br>Cross-slice integration tests | PR #19 (`82e9dc9`), 44 test files, 320 tests | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Synchronized List & Board Views** | `FEAT-C01` | M1.1 (Phase 1) | `/modules/tasks/views/TaskListView.tsx`, `TaskBoardView.tsx` | PR #20 (`8b18be2`), 38 tests, `TaskViews.test.tsx` | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Calendar View & Unscheduled Tray** | `FEAT-C02` | M1.2 (Phase 1) | `/modules/tasks/views/calendar/CalendarView.tsx`<br>Month/week view, date navigation, tray | PR #21 (`303426e`), PR #22 (`4770e49`), 34 tests | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Timeline View & Workspace Milestones** | `FEAT-C02`, `FEAT-B04` | M1.2 (Phase 1) | `/modules/tasks/views/timeline/TimelineView.tsx`<br>Gantt time axis, day/week/month zoom, markers | PR #23 (`bc324ed`), 36 tests, `TimelineView.test.tsx` | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Dependency Edges & Conflict Visualizer**| `FEAT-A06` | M1.1 / M1.2 | `/modules/tasks/dependencies`<br>BLOCKS edges, DAG validation, conflict flags | PR #24 (`31ed749`), PR #25 (`d2c3eba`), 28 tests | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Task View Family Audit & Alignment** | `FEAT-C01`, `FEAT-C02` | M1.2 (Phase 1) | `docs/04-implementation/task-view-family-audit-report.md` | PR #26 (`a31a873`), full 4-view audit | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Interactive Sort & Calendar Prefill Polish**| `FEAT-C01`, `FEAT-C02` | M1.2 (Phase 1) | Column click-to-sort, Calendar empty cell create | PR #27 (`764b99d`), PR #28 (`9ccabe2`), 12 tests | **IMPLEMENTED & VERIFIED** | None. Complete. |
| **Saved Views (FEAT-C04)** | `FEAT-C04` | M1.1 (Phase 1) | `vs-07a-saved-views-contract-readiness-report.md`<br>`vs-07a.1-saved-views-contract-signoff-report.md` | PR #29 (`fb45f66`), PR #30 (`2de4522`, `8fabfc2`) | **CONTRACT READINESS COMPLETE / IMPLEMENTATION DEFERRED** | Backend & PO sign-off on Decisions A–E pending. |
| **Threaded Comments, @Mentions & Watchers**| `FEAT-A04` | M1.1 (Phase 1) | Not implemented yet | None (Pending implementation) | **NOT IMPLEMENTED (NEXT READY CANDIDATE)** | Canonical OpenAPI lines 2012–2140 frozen. Extends `TaskPeekDrawer`. |
| **Segmented In-App Notification Center** | `FEAT-F01a` | M1.1 (Phase 1) | Not implemented yet | None (Pending implementation) | **NOT IMPLEMENTED** | Consumes events from comments/mentions/assignments. |
| **30-Day Task Trash & Recovery View** | `FEAT-A10a`, `FEAT-A10b` | M1.1 / M1.2 | Not implemented yet | None (Pending implementation) | **NOT IMPLEMENTED** | Gated on DEC-OPEN-11 / DEC-OPEN-03. |
| **Workspace Workflow Statuses & Custom Fields**| `FEAT-D01`, `FEAT-D04a` | M1.2 (Phase 1) | Not implemented yet | None (Pending implementation) | **NOT IMPLEMENTED** | Requires workspace settings infrastructure. |
| **Workspace Setup Templates Seeding** | `FEAT-D05a` | M1.2 (Phase 1) | Template policy verified; UI picker not built | Policy doc verified in `validate_v1_5.py` | **PARTIALLY IMPLEMENTED (DATA ONLY)** | Requires workspace creation modal extension. |
| **Custom Roles Builder & Role Preview** | `FEAT-G02b`, `FEAT-G03` | M1.3 (Phase 1) | Canonical OpenAPI operations exist | None (Pending implementation) | **NOT IMPLEMENTED** | Phase 1 Milestone M1.3 scope. |
| **Selected-Field Offline Queue & Conflict**| `FEAT-J02` | M1.3 (Phase 1) | Primitives exist in contract | None (Pending implementation) | **NOT IMPLEMENTED** | Phase 1 Milestone M1.3 scope. |

---

## 4. Next Milestone Selection & Justification

### 4.1 Candidate Evaluation Against Readiness Criteria

To select the single next engineering milestone, candidate features were evaluated against five mandatory criteria:
1. **Approved on Roadmap:** Part of canonical Phase 1 (M1.1 or M1.2).
2. **Not Completed:** No existing implementation in codebase.
3. **Independent of Saved Views:** Can be completely developed, tested, and shipped without relying on pending Saved Views contract decisions.
4. **Stable API Contract:** Authoritative, frozen endpoints and DTOs in OpenAPI 0.3.20-draft.
5. **Clear Architecture:** Clean fit within existing frontend architecture and mock infrastructure.

| Candidate Feature | Canonical FEAT ID | Planned Milestone | API Contract Stability | Dependencies & Blockers | Decision Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Threaded Comments, @Mentions & Task Watchers** | `FEAT-A04` | **M1.1 (Phase 1)** | **100% Frozen in OpenAPI 0.3.20-draft** (lines 2012–2140). DTOs: `TaskCommentDto`, `CreateTaskCommentRequest`, `UpdateTaskCommentRequest`, `SetWatchStatusRequest`. | **Zero blockers.** Extends existing `TaskPeekDrawer.tsx`. Completely decoupled from Saved Views. | **RECOMMENDED (WINNER)** |
| **In-App Notification Center / Inbox** | `FEAT-F01a` | M1.1 (Phase 1) | Frozen in OpenAPI 0.3.20-draft (`/notifications`). | Naturally downstream of comments and mentions. Best implemented after comment notifications exist. | **DEFERRED TO NEXT SLICE** |
| **30-Day Task Trash & Recovery View** | `FEAT-A10a/b` | M1.1 / M1.2 | Partially gated by DEC-OPEN-03 (hard purge policy). | Requires dedicated Trash navigation and bulk restoration mechanics. | **DEFERRED** |
| **Workspace Workflow Statuses & Custom Fields** | `FEAT-D01`, `FEAT-D04a` | M1.2 (Phase 1) | Open decisions on custom field types and workflow categories. | Requires full Workspace Settings infrastructure. | **DEFERRED** |

### 4.2 Definitive Recommendation: Milestone VS-08A

The single next implementation milestone recommended is:

> **MILESTONE VS-08A: COLLABORATION SPINE — THREADED COMMENTS, @MENTIONS & TASK WATCHERS (`FEAT-A04`)**

#### Architectural Justification
1. **Direct UI Integration Surface:** Milestone VS-03 Stage 2 (`b37efe0`) delivered the right-docked `TaskPeekDrawer.tsx`. The drawer was intentionally designed with an Activity / Collaboration tab placeholder ready to receive comments and watchers.
2. **Authoritative, Frozen Contract in Canonical OpenAPI 0.3.20-draft:**
   - `GET /communities/{cid}/workspaces/{wid}/tasks/{taskId}/comments` (`listTaskComments`)
   - `POST /communities/{cid}/workspaces/{wid}/tasks/{taskId}/comments` (`createTaskComment`)
   - `PATCH /communities/{cid}/workspaces/{wid}/comments/{commentId}` (`updateTaskComment`)
   - `DELETE /communities/{cid}/workspaces/{wid}/comments/{commentId}` (`deleteTaskComment`)
   - `POST /communities/{cid}/workspaces/{wid}/tasks/{taskId}/watch` (`setTaskWatchStatus`)
3. **Decoupled from Saved Views:** Comments and watchers live entirely at the single-task level inside the drawer. They do not touch query ASTs, URL search parameters, or view layouts.
4. **Enables Subsequent In-App Notification Center (`FEAT-F01a`):** Delivering comments, @mentions, and task watchers creates the canonical domain events (`comment.created`, `mention.added`, `task.watched`) that power the In-App Notification Inbox in the subsequent milestone.

> [!IMPORTANT]
> **Implementation of VS-08A is NOT started in this milestone.**
> In strict accordance with scope restrictions, this document establishes the recommendation and readiness packet only. Implementation begins only upon user instruction.

---

## 5. Summary of UI/UX Audit Baseline & Progress Tracking

Concurrent with roadmap reconciliation, two persistent governance artifacts have been established:

1. **Website-Wide UI/UX Audit Baseline:**
   - Authored canonical baseline: [`docs/04-implementation/ui-ux/sonder-ui-ux-audit-baseline.md`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/docs/04-implementation/ui-ux/sonder-ui-ux-audit-baseline.md).
   - Audits all 7 experience dimensions: Visual Design System, Application Shell, Task Views, Interaction Design, Responsive Layouts, Accessibility (WCAG 2.2 AA), and Experience Quality.
   - Categorizes 14 actionable findings across a 4-slice prioritized UI/UX backlog.

2. **Canonical Project Progress Tracker:**
   - Authored canonical tracker: [`docs/04-implementation/sonder-project-progress-tracker.md`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/docs/04-implementation/sonder-project-progress-tracker.md).
   - Tracks **Track A (Engineering Milestones)** with verified PR numbers, merge SHAs, and test counts.
   - Tracks **Track B (UI/UX Workstream)** with audit coverage, findings severity, and improvement slices.

---

## 6. Quality Gates & Verification Evidence

- **Baseline Documentation Validation:** `pnpm validate:docs` passed 51/51 checks with zero failures.
- **Contract Immutability:** `git diff --exit-code Community-Work-Management-v1.5/` returned 0 changes.
- **Generated Types Immutability:** `git diff --exit-code packages/contracts/src/api-types.ts` returned 0 changes.
- **TypeScript Monorepo Compilation:** `pnpm run typecheck` passed with 0 errors across all packages.
- **Automated Test Suite:** `pnpm run test` passed all 46 test suites and 440 unit/integration tests.
- **Production Build:** `pnpm --filter @sonder/web build` built cleanly in 3.31 seconds.
- **Git Whitespace & Formatting:** `git diff --check` reported zero warnings.
