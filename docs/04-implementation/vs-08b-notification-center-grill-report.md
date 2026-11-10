# SONDER — VS-08B: NOTIFICATION CENTER GRILL REPORT

**Milestone ID:** VS-08B  
**Canonical Feature Reference:** `FEAT-F01a` (Segmented In-App Notification Center)  
**Governance Phase:** Phase 1: GRILL  
**Target Repository:** `Samudra-Bose/sonder`  
**Working Branch:** `plan/FE-VS08B-notification-center`  
**Baseline Commit:** `develop @ 658e807`  
**Merge Commit:** `develop @ 1ac051f` (PR #35)  

---

## 1. Executive Summary

This GRILL report actively challenges and stress-tests the implementation plan for the **Segmented In-App Notification Center (`FEAT-F01a`)**.

Rather than simply approving the proposed architecture, this audit rigorously investigates:
1. Canonical contract discrepancies between historical specification appendices and the normative OpenAPI 0.3.20-draft schema.
2. The complete absence of an API contract for "Mark as Unread".
3. Architectural gaps in task deep-linking caused by missing `taskKey` and `workspaceId` on `NotificationDto`.
4. Discrepancies between server-side category filters and client-side reason segmentation.
5. Realtime user-community stream payload boundaries and PII/body leak prevention.
6. Unread count cache synchronization and multi-tab state coherence.

---

## 2. Critical Contract Inconsistencies & Spec Discrepancies

### GRILL-01: Discrepancy in Notification Route Paths & Query Parameters
- **Finding:** In `Community-Work-Management-Master-Specification-v1.5.0.md` Appendix V (the historical PRD synthesis, line 20729), the endpoint was listed as:
  `GET /communities/{cid}/me/notifications` with `Query: tab, unreadOnly?, cursor, limit`
  and bulk mark-read was listed as:
  `POST /communities/{cid}/me/notifications/mark-read` with request body `{ notificationIds?: string[], all?: boolean }`.
- **Contradiction:** The canonical, normative contract in `Community-Work-Management-v1.5/docs/contracts/openapi.yaml` and generated types `packages/contracts/src/api-types.ts` declare:
  1. `GET /communities/{communityId}/notifications` with query parameters `cursor`, `limit`, `category` (enum: `ACTION_REQUIRED | UPDATES`), and `unreadOnly`.
  2. `POST /communities/{communityId}/notifications/{notificationId}/read` (no request body, returns `204`).
  3. `POST /communities/{communityId}/notifications/read-all` (no request body, returns `204`).
- **GRILL Verdict & Resolution:** The historical PRD appendix is explicitly marked non-normative ("This source predates later owner confirmations... Do not copy its older rules into code"). **OpenAPI 0.3.20-draft is the authoritative contract.** The frontend implementation MUST strictly call `/communities/{communityId}/notifications`, `/read`, and `/read-all`. The parameter is `category`, NOT `tab`.

---

### GRILL-02: Complete Absence of "Mark as Unread" in Canonical API
- **Finding:** The user request prompt specifies: *"Mark individual notification read/unread"*.
- **Contradiction:** A complete audit of `openapi.yaml` reveals that there is **NO** endpoint to mark a notification unread. There is no `POST /notifications/{id}/unread`, nor does `POST .../read` accept a boolean payload. The only available mutation is `markNotificationRead` (which sets `isRead = true`).
- **Risk:** If the frontend fabricates a `POST .../unread` call or passes `{ isRead: false }` to an endpoint that rejects request bodies, the request will fail or violate contract freeze invariants.
- **GRILL Verdict & Resolution:** 
  1. The frontend **MUST NOT** invent an unread mutation endpoint.
  2. The UI will support marking items as read (`markNotificationRead` and `markAllNotificationsRead`).
  3. If an explicit "Mark as Unread" toggle is required by product stakeholders, this must be formally logged as a backend contract expansion request for OpenAPI 0.3.21-draft.

---

### GRILL-03: Server-Side Category Filtering vs. Client-Side Reason Segmentation
- **Finding:** The product specification requires segmentation across Mentions, Assigned, and Watching.
- **Contract Inspection:** `GET /communities/{communityId}/notifications` accepts only:
  - `category?: NotificationCategory` (`"ACTION_REQUIRED"` | `"UPDATES"`)
  - `unreadOnly?: boolean`
  - It does **NOT** accept a `reason` parameter (such as `reason=MENTION` or `reason=TASK_ASSIGNED`).
- **Risk:** Attempting to pass `?reason=MENTION` to the server will result in unexpected query parameter handling or schema validation failure.
- **GRILL Verdict & Resolution:**
  1. Server queries handle top-level segmentation: `category=ACTION_REQUIRED` and `category=UPDATES`.
  2. Sub-filtering by reason (`Mentions`, `Assigned`, `Watching`) MUST be executed client-side over the loaded page items.
  3. The UI will clearly distinguish top-level category tabs from secondary reason filter chips.

---

## 3. Deep-Linking Gaps & Privacy Invariants

### GRILL-04: `NotificationDto` Lacks `taskKey` and `workspaceId`
- **Inspection of Schema:**
  ```yaml
  NotificationDto:
    properties:
      id: Uuid
      eventType: string
      title: string
      body: string | null
      resourceType: string | null # "task"
      resourceId: Uuid | null     # Task UUID
      createdAt: date-time
      isRead: boolean
      category: NotificationCategory
      reason: NotificationReason
  ```
- **The Gap:** Sonder's deep-linking architecture ([`useTaskPeekDrawer.ts`](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/apps/web/src/modules/tasks/useTaskPeekDrawer.ts)) operates on `taskKey` (e.g. `ENG-101`) to synchronize with URL `?task=KEY`. Furthermore, task lookups require `workspaceId`. `NotificationDto` does **NOT** include `taskKey` or `workspaceId`!
- **Risk:** When a user clicks a notification to view the affected task, the client has only the task UUID (`resourceId`) and the notification title.
- **GRILL Resolution & Fallback Hierarchy:**
  1. **Primary Extraction:** Parse canonical task key from notification title via regex `\b([A-Z0-9]+-\d+)\b`. Backend titles follow standard templates (e.g. `Mentioned on ENG-101: ...` or `Assigned to FEST-14`).
  2. **Workspace Derivation:** From the parsed task key, derive the workspace ID using the community prefix registry (`workspaces.find(w => w.keyPrefix === prefix)`).
  3. **Handoff Request to Backend Lead:** Formally recommend adding `taskKey?: string` and `workspaceId?: Uuid` to `NotificationDto` in OpenAPI 0.3.21-draft to eliminate client-side regex parsing.

---

### GRILL-05: Inaccessible, Deleted, or Archived Task Handling
- **Invariant:** A recipient might lose access to a workspace after a notification was generated, or the task might be in Trash.
- **Contract Guarantee:** `openapi.yaml` line 9051 guarantees:
  `resourceId: Null when the linked resource is not currently readable by the recipient.`
- **GRILL Resolution:**
  - When `resourceId === null`, the notification row must be rendered as informational text only, without an active clickable deep-link.
  - An inline tooltip or badge will explain: *"Task is no longer accessible or has been deleted."*
  - This preserves the core security invariant that inaccessible resource existence is never revealed.

---

## 4. Realtime Stream Boundaries & Privacy Enforcement

### GRILL-06: Strict Separation of Workspace Stream and User-Community Stream
- **Finding:** Collaboration events (`comment.created`, `watcher.changed`) operate on the `workspace` stream. In-app notifications operate on the `user-community` stream.
- **Crucial Rule:** The workspace stream must **NEVER** broadcast notification records, recipient IDs, or mention lists.
- **Realtime Payload Minimization:** `ws-events.schema.json` dictates that `notification.created` contains only:
  ```json
  {
    "notificationId": "UUID",
    "category": "ACTION_REQUIRED",
    "reason": "MENTION",
    "unreadCount": 3
  }
  ```
- **Implication:** The realtime event does **NOT** deliver notification text, task titles, or author names.
- **GRILL Verdict:**
  1. `useNotificationRealtime` consumes `notification.created` strictly to update the unread badge count immediately and invalidate the TanStack Query list.
  2. The full notification content is securely hydrated via authorized HTTP `GET /communities/{communityId}/notifications`.
  3. Toast notifications must wait for the REST query or display generic alerts (*"New notification in Action Required"*) if quiet hours are not active.

---

## 5. Unread Count Synchronization & Cache Coherence

### GRILL-07: Global Community Scope of `unreadCount`
- **Contract Specification:** `openapi.yaml` line 9082:
  `unreadCount: Unread count for the authenticated user across the full community inbox, independent of category/unreadOnly filters.`
- **Risk:** If a user is viewing the `Updates` tab (which might have 0 unread items) while the `Action Required` tab has 5 unread items, the API returns `unreadCount: 5`. If the frontend incorrectly computed unread count from the visible filtered items, the header badge would display 0.
- **GRILL Resolution:**
  1. The header badge counter MUST always bind to `data.unreadCount` from the canonical response, never `items.filter(i => !i.isRead).length`.
  2. When `markAllNotificationsRead` is triggered, the mutation optimistically sets `unreadCount = 0` across all cached queries.

---

## 6. Handoff Package for Backend Lead

The following items are formally recorded for coordination with the Backend Lead:

| Reference ID | Area | Exact Backend Dependency / Contract Request | Priority |
| :--- | :--- | :--- | :--- |
| **DEP-NOTIF-01** | API Contract | Confirm route canonicality: `/communities/{communityId}/notifications` is authoritative over historical `/me/notifications`. | High |
| **DEP-NOTIF-02** | DTO Enhancement | Request addition of optional `taskKey?: string` and `workspaceId?: Uuid` to `NotificationDto` in OpenAPI 0.3.21-draft for robust deep-linking. | Medium |
| **DEP-NOTIF-03** | Product Decision | Confirm that "Mark as Unread" is intentionally excluded from Phase 1 scope. | High |
| **DEP-NOTIF-04** | Realtime Transport | Backend implementation of `user-community` WebSocket stream with `notification.created`, `notification.read`, and `notification.read_all` envelopes per `ws-events.schema.json`. | High |

---

## 7. Quality Gate & Acceptance Criteria

When implementation begins (Phase 2), the following criteria must be satisfied:

- [ ] **Contract Compliance:** Strict adherence to `NotificationDto` and `NotificationListDto` without fabricated endpoints.
- [ ] **Unread Badge Coherence:** Header bell badge accurately displays `unreadCount` and decrements on read mutations.
- [ ] **Optimistic Read Transitions:** Clicking a notification marks it read immediately in UI with rollback on error.
- [ ] **Bulk Read Operation:** "Mark all as read" button calls `POST /read-all` and clears unread indicators.
- [ ] **Deep-Link Navigation:** Clicking a task notification opens the task in `TaskPeekDrawer` via `?task=KEY`.
- [ ] **Inaccessible Task Protection:** Tasks with `resourceId: null` are non-clickable and display safe disabled states.
- [ ] **Accessibility (WCAG AA):** Roving tabindex/keyboard navigation in popover, live region announcements for unread count, `Esc` dismisses popover and returns focus to bell.
- [ ] **Test Coverage:** Minimum 20 new unit/integration tests covering all notification scenarios and mock handlers.
