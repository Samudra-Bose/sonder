# Frontend Antigravity Implementation Blueprint

**Baseline:** v1.5.0 · **API:** 0.3.20-draft (not frozen)



# 13. Frontend architecture and responsibilities

## 13.1 Frontend responsibility

Antigravity CLI / frontend developer owns the SPA/PWA experience, navigation, component system, accessibility, responsive/mobile UX, state/cache layer, request orchestration, optimistic behavior, view projections, local draft/offline queue client, realtime client, generated TypeScript API types and frontend integration tests. It does not own security policy decisions or backend authorization.

## 13.2 Proposed technology direction — RECOMMENDED DEFAULT, NOT FROZEN

The prior research baseline recommends Vite + React + TypeScript. Candidate supporting pieces include a typed API client generated from OpenAPI, a query/cache layer such as TanStack Query, MSW for contract-shaped mocks, router-based URL state, accessible headless primitives, semantic CSS tokens and Tailwind or equivalent styling. This is a proposed stack, not a final lock; the final choice must be confirmed jointly after backend deployment/API requirements are reviewed.

Do not add a heavyweight component framework solely for convenience if it makes dense views, keyboard behavior or visual consistency harder. Prefer well-scoped primitives, composable components and semantic design tokens. Motion should be lightweight, purposeful and respect reduced-motion settings.

## 13.3 Recommended frontend module boundaries

- `app-shell` — routes, global navigation, workspace switcher and responsive shell.
- `identity` — sign-in, sign-up, provider linking, session and profile UI.
- `community` — community switcher, membership and community admin UI.
- `workspace` — Workspace landing, members, settings and role administration.
- `tasks` — canonical task model, task drawer, composer, inline edits, subtask tree and task-key resolution. The composer/detail permission panel uses `canManageAssigneeFieldGrants`; Workspace Owners edit the allowed/default ceiling, while Task Creators select per-task groups from the approved set.
- `views/list`, `views/board`, `views/calendar`, `views/timeline` — view-only projections over shared query/cache data.
- `my-work` — cross-workspace triage.
- `search` — omnibar, filtering and result routing.
- `collaboration` — comments, mention picker, watchers and activity timeline.
- `notifications` — inbox, preferences and reminders.
- `saved-views` — Personal/Shared presets and copy-on-write flow.
- `offline` — service worker asset caching, IndexedDB selected-field queue and conflict UI; exact cache/queue policy must follow CR-15.
- `realtime` — WebSocket ticket/bootstrap, stream cursors, event dedupe and refetch recovery.
- `design-system` — tokens, accessible primitives, iconography and responsive layout patterns.
- `mocks` / `tests` — schema-shaped MSW fixtures, deterministic seed data, Playwright and accessibility tests.

## 13.4 Frontend rules

- Do not duplicate task truth into four independent stores; normalize by task ID and derive view projections.
- Do not infer permissions from role names or hard-code Coordinator/Owner exceptions into every component. Consume server permission projections for display and still handle 403/404/409 from operations.
- Render assignee field-group controls only when `canManageAssigneeFieldGrants` is true. The Workspace Permissions settings expose the allowed ceiling and default; task composer/detail controls expose only groups within the returned ceiling. Never treat the displayed checkboxes as enforcement.
- Do not hand-author duplicate API types that drift from OpenAPI. Generate types after contract remediation and freeze.
- Use optimistic updates only where the mutation contract is idempotent and rollback/conflict behavior is defined.
- URL state represents unsaved view draft filters; persisted SavedView changes require explicit action.
- Treat offline entries as local untrusted pending commands. Never bypass current backend permission checks.
- Never store auth tokens/session secrets in localStorage.

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
