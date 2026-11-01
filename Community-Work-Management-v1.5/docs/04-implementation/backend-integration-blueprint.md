# Backend Integration Blueprint

**Baseline:** v1.5.0 · **API:** 0.3.20-draft (not frozen)



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


---

## 17.1 Frontend/backend responsibility matrix

| Area | Frontend owner | Backend owner | Joint gate |
|---|---|---|---|
| Product behavior | Reflect approved behavior; identify UX ambiguities. | Identify domain/security constraints. | Product signs scope and edge cases. |
| HTTP/WS contracts | Review usability and type needs. | Own canonical schema shape and implementation. | Joint contract review and freeze. |
| UI and responsive behavior | Own components, navigation, accessibility and mobile UX. | Expose stable permission/projection APIs. | E2E behavior acceptance. |
| Authentication | Render flows, CSRF integration and session UX; do not store secrets. | Own identity, cookies, OIDC, CSRF, session and revocation. | Security review. |
| Authorization | Render server-provided capability hints and handle denials. | Enforce all membership/role/task rules on every request. | BOLA/IDOR tests. |
| Assignee field delegation | Owner ceiling/default UI; task Creator per-task grant controls; render from `canManageAssigneeFieldGrants`. | Persist Workspace ceiling/default and task grants; validate subset, actor (Creator/Owner), revision and live active-assignee status. | DEC-OPEN-02 creator/Owner/Coordinator/Assigner permission tests. |
| Views and query | Shared normalized client cache; projection rendering and URL draft state. | Canonical query AST, filtering, snapshots and pagination. | Cross-view task parity. |
| Realtime | Client stream/cursor/dedupe/refetch. | WS auth, sequencing, outbox and revocation. | Race/reconnect/privacy tests. |
| Offline | Local queue, states and conflict-resolution UI. | Live-auth replay and per-field revision conflict endpoint. | M1.3 offline tests. |
| Audit/recovery | Read/export UI and safe recovery interactions. | Append-only audit/chain/retention/restore. | Security and Ops acceptance. |
| Release | Frontend build, bundle and browser verification. | Migrations, backend deploy, DB and health. | Shared staging, rollback and launch sign-off. |


---

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
