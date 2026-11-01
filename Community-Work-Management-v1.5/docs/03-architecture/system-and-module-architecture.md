# System and Module Architecture

**Baseline:** v1.5.0 · **API:** 0.3.20-draft (not frozen)



# 9. HTTP API contract and integration rules

## 9.1 Current contract artifacts

- HTTP: OpenAPI 3.1.0, Workspace-first candidate `openapi-0.3.20-draft.yaml`, version `0.3.20-draft`.
- Realtime event envelope: `ws-events-0.3.20-draft.schema.json` (unchanged because the approved DEC-OPEN decisions add no new event-envelope types), JSON Schema Draft 2020-12; its event enum remains synchronized with the OpenAPI `WorkspaceStreamEvent` enum.
- Realtime control protocol: `ws-protocol.schema.json`, JSON Schema Draft 2020-12; unchanged from the CR-12 baseline because its control frames are transport/authentication controls, not Project-domain events.
- API base path: `/api/v1`.
- Candidate inventory: 95 paths, 118 operations and 201 component schemas; the 31-event schema is unchanged because the approved decisions add no new realtime envelope types.
- HTTP JSON uses camelCase; errors use `application/problem+json` following the reviewed Problem Details shape.
- Internal entity IDs are UUIDv7 strings; task keys are human-readable identifiers, not database primary keys.

## 9.2 Workspace-first reconciliation status — DRAFT, NOT FROZEN

The prior `0.3.17-draft` contract contained Project routes, Project schemas and `projectId`-dependent task/query/permission shapes. Candidate `0.3.18-draft` reconciled the domain hierarchy; `0.3.19-draft` added DEC-OPEN-02 Option A; candidate `0.3.20-draft` applies the seven subsequently approved decisions DEC-OPEN-06/07/08/09/10/11/15.

**Applied in the 0.3.20-draft candidate:**

- Removed Project CRUD and Project-template routes, Project-only DTOs/schemas and the `ProjectId` parameter.
- Removed Project IDs from task DTOs/requests, task-key resolution, move/preview/clone DTOs, task query filters/grouping, search summaries and policy extensions.
- Kept tasks directly Workspace-scoped and moved the aggregate summary route/DTO to Workspace scope.
- Re-scoped optional milestones to Workspace-level metadata; retention as optional planning markers is OWNER CONFIRMED under `DEC-OPEN-08`.
- Moved task-key prefix and maximum subtask depth to Workspace scope and applied owner-confirmed Community-unique prefix lifecycle and 1–2 depth guard (`DEC-OPEN-06`, `DEC-OPEN-09`).
- Removed `workspace:create` from Workspace role capabilities. Shared Workspace creation remains governed by Community policy (`canCreateSharedWorkspace` / `community:create_shared_workspace`).
- Rewrote cross-Workspace transfer as `NAMES_ONLY`: task/subtask titles and the parent-child structure/sibling order only. The candidate excludes `itemType`, descriptions, assignees, creator/assigner identity, status/progress, dates, estimates, priority, labels, milestones, custom values, comments, watchers, dependencies and activity history.
- The candidate recreates the transferred root at the destination top level, as owner-confirmed under `DEC-OPEN-10`.
- Removed Project lifecycle event values and synchronized the standalone realtime event schema to the OpenAPI event enum.

**Candidate inventory:** see the 0.3.20-draft validation report. The candidate has no Project/List resource paths or identifier fields. `List` remains a task-view name, not a container or domain entity.

**Why it is still not contract-freezeable:**

1. Product/Backend/Frontend/Security must jointly approve the 0.3.20 HTTP/realtime contracts and verify implementation.
2. Database migrations, RLS, seed data, generated TypeScript clients, MSW handlers and target frontend/backend repositories have not been inspected or reconciled in this documentation pass.
3. Audit retention/legal hold (`DEC-OPEN-03`), final SLO/RPO/RTO (`DEC-OPEN-04`), domain-language/Phase 4 detail (`DEC-OPEN-05`), idempotency retention verification (`DEC-OPEN-12`), provider/budget (`DEC-OPEN-13`) and concrete authentication deployment values (`DEC-OPEN-14`) remain open.
4. The purge route remains disabled until DEC-OPEN-03 is approved.
5. Official OpenAPI lint/type generation, backend runtime, security integration, realtime runtime, performance, hosting, backup and restore remain unverified.

The 0.3.20 candidate is included in Appendix A with the matching event schema in Appendix B and unchanged control protocol in Appendix C. It supersedes the 0.3.19 candidate for current work; it does **not** authorize production client generation or declare a contract freeze.


### DEC-OPEN-02 Option A amendment in 0.3.19-draft

- Workspace Owner controls `assigneeEditableFieldGroupsAllowed` (maximum delegation ceiling) and `assigneeEditableFieldGroupsDefault` (new-task default, subset of allowed).
- Task Creator chooses `assigneeEditableFieldGroups` per task. The same set applies to all active assignees on that task.
- Active Workspace Owner may override task-level grant metadata for governance/continuity. A Coordinator or Task Assigner does not gain that authority solely from the role.
- `TaskPermissions.canManageAssigneeFieldGrants` is backend-computed. Field-group grants are additive and are constrained by active membership, current Workspace ceiling and the existing security floor.
- The old Workspace-wide `assigneeCanEditDatesPriority` setting is removed from the active schema.
- Workspace policy updates are atomic: the resulting default group set must remain a subset of the resulting allowed ceiling. If a ceiling reduction would invalidate the current default, the Owner must update the default in the same request; otherwise the request is rejected with `422 ASSIGNEE_FIELD_DEFAULT_EXCEEDS_WORKSPACE_CEILING`.
- Task create/update requests reject a per-task group outside the current ceiling with `422 ASSIGNEE_FIELD_GRANT_EXCEEDS_WORKSPACE_CEILING`; unauthorized grant changes return `403 ASSIGNEE_FIELD_GRANT_FORBIDDEN`. Personal Workspaces keep both Workspace arrays and per-task grant arrays empty; non-empty grants are rejected.
- Workspace ceiling/default changes are recorded as `WORKSPACE_SETTINGS_CHANGED`; task-level grant changes are recorded as `TASK_ASSIGNEE_FIELD_GRANTS_CHANGED` in the append-only governance audit ledger in the same transaction as the governed mutation. The audit metadata contains only actor/task/workspace UUIDs and allow-listed group codes, never task content. Audit failure aborts the governed mutation.
- There is no new WebSocket event payload for this decision. Existing Workspace task/settings events remain the realtime invalidation mechanism; the added audit event is part of the governance audit ledger, not the WebSocket domain-event stream.

## 9.3 Common HTTP rules to preserve/review

- Global identity/session paths are separate from Community-scoped operational routes.
- A path `communityId` or `workspaceId` identifies a requested scope; it does not prove authorization.
- Verify active CommunityMembership, WorkspaceMembership, role/capability and resource access on every request.
- Use consistent Problem Details errors and no-store for sensitive actor-specific DTOs.
- Browser cookie-authenticated writes use CSRF defense; state-changing operations use `X-Mutation-Id` under CR-15 after joint sign-off.
- Read-only POST query/previews and one-time realtime ticket issuance are not treated as ordinary mutations for idempotency.
- Use deterministic pagination and opaque cursors; do not let the browser invent offsets or cursor payloads.
- Never log or replay credentials, Set-Cookie or raw one-time secrets.

## 9.4 Contract-first frontend/backend workflow

1. Backend and frontend agree on product semantics and an endpoint/DTO proposal.
2. Backend updates OpenAPI/JSON schemas and examples; product/security review changes affecting access/privacy.
3. Run schema validation, linting and internal-reference checks.
4. Generate TypeScript types and API clients from the same contract revision.
5. Frontend authors MSW handlers from the generated types/schema and exercises loading/error/empty/permission/conflict states.
6. Backend implements the route and integration tests against the same schema.
7. Joint contract tests verify requests, responses, status codes, Problem Details, pagination, idempotency and authorization boundaries.
8. Only then mark the specific operation as implemented/verified. Contract design status and runtime status are separate fields.

---


---

# 10. Realtime transport and event model

## 10.1 Two independent streams

- **Workspace stream:** scoped to `(communityId, workspaceId)`, monotonic `workspaceSeq`.
- **User-community stream:** scoped to `(authenticatedUserId, communityId)`, monotonic `userNotificationSeq`.

The authenticated user ID is derived from the session, never accepted from the client. Cursors cannot be exchanged between streams. Workspace task events and recipient-specific notifications must not be mixed into one sequence space.

## 10.2 Transport and authentication — CR-09 engineering draft

Use WebSocket over TLS at the configured `/api/v1/ws` endpoint and the versioned `work-platform.v1` subprotocol. Browser Origin must exactly match the configured trusted-origin allowlist. No wildcard, suffix or implicit-origin trust. Authentication is by existing secure session cookie during Upgrade or a short-lived, single-use, community-bound realtime ticket acquired via the CSRF-protected HTTP API. Ticket credentials travel only in the first `AUTHENTICATE` frame—not in a URL, query string, subprotocol or logs.

The session cookie specification in CR-13 uses `__Host-session`, Secure, HttpOnly, SameSite=Lax, Path=/, no Domain; 14-day sliding idle lifetime, 30-day absolute expiry and 24-hour rotation. These values remain an engineering draft pending deployment/security review.

## 10.3 Delivery, catch-up and recovery

- Events are at-least-once; clients deduplicate by immutable `eventId`.
- Domain mutation, sequence allocation and durable outbox event commit atomically.
- Independent consumer offsets prevent a slow email provider from blocking realtime relay.
- Replay is exclusive and ascending with a bounded batch (CR-09 draft max 500).
- A cursor beyond retention returns a typed recovery response; a cursor ahead of latest returns typed conflict.
- To avoid a lost-update window, register/buffer the subscription, capture a high-water mark, refetch canonical HTTP projection, then resume buffered events from that mark.
- Reconnect uses bounded jittered exponential backoff; slow consumers are disconnected with a resumable cursor rather than silently skipping events.
- Membership/role change, logout or session revoke propagates revocation across instances and terminates subscriptions. Fail closed if the revocation barrier is unavailable.

## 10.4 Privacy-safe event payloads

Events do not include raw comment Markdown/AST, mention recipient lists, email addresses, session/ticket credentials, hidden task identifiers or counterpart Workspace names/IDs. Cross-Workspace move notifications reveal only the necessary event side and moved count; source/target identifiers remain masked where caller authorization does not support disclosure. Event DTO and schema must be reviewed against the name-only transfer policy.

---


---

# 14. Backend architecture, persistence and deployment responsibilities

## 14.1 Backend responsibility

The backend developer owns authentication, membership, all authorization checks, data model/migrations, RLS, REST controllers, validation, task/query domain logic, task key allocation/aliases, transaction semantics, custom role capabilities, comment sanitization and mention resolution, notifications, outbox consumers, WebSocket server/replay, idempotency, offline conflict handling, audit integrity, operational health checks, telemetry and database backup/restore integration.

## 14.2 Recommended architecture — ENGINEERING RECOMMENDATION

Start with one modular monolith, not a microservice fleet. Use clear internal modules and domain boundaries while deploying one coherent backend service. Keep a transactional outbox worker in-process or in the same image initially. Use one managed PostgreSQL service with RLS and point-in-time recovery. A static frontend can be hosted on an edge CDN. Add Redis, a dedicated message broker, additional backend replicas or separate workers only when measured needs justify the operational cost.

Initial 70–90 user load does not justify Kubernetes, Kafka, service mesh or self-managed database clustering as a default.

## 14.3 Backend module boundaries

1. Identity and sessions.
2. Community and membership.
3. Workspace, roles and capability evaluation.
4. Task, hierarchy, workflow and task-key lineage.
5. Query engine and four-view projection service.
6. Saved views and custom fields.
7. Comments, mentions and watchers.
8. Notifications and reminders.
9. Realtime transport, catch-up and revocation.
10. Activity and governance audit.
11. Idempotency, pagination and offline replay.
12. Health, monitoring, deployment and backup integration.

Modules share the database transaction boundary where atomicity is required; avoid service-to-service network calls inside the initial domain command path.

## 14.4 Transactional outbox pattern

For every relevant domain mutation, the backend performs one database transaction:

1. Build authenticated server-side SecurityContext and evaluate current permission.
2. Lock/update authoritative domain rows and increment version/field revisions.
3. Allocate the relevant Workspace or user-community sequence.
4. Insert immutable event into `domain_events`.
5. Insert idempotency result (if state-changing request requires it).
6. Commit.

Separate outbox consumer offsets are required for realtime relay, notification generation and future automation/webhooks. Never use one shared `processed_at` flag where one consumer could prevent another from processing an event. Consumer failures have bounded retry and dead-letter/alert handling. Event payloads are minimized and versioned.

## 14.5 Deployment recommendation — CR-16 engineering draft

- Static Vite/React SPA/PWA via CDN/edge hosting.
- One always-on modular-monolith backend serving REST and WSS.
- Same image or process contains transactional outbox worker initially.
- Managed PostgreSQL 16/17 with RLS and continuous WAL/PITR.
- Centralized logs/metrics/alerts with redaction.
- Strictly isolated development, staging and production with separate databases/secrets; staging email sandbox; runtime app and migration credentials separated.
- Secret manager injection; no committed credentials.
- Expand-and-contract database migrations, N-1 application compatibility and immutable release artifacts.
- Provider, region, email sender, secret manager, costs and deployment host remain unselected.

---
