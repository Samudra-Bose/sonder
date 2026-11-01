# Source-of-Truth Registry

**Baseline:** v1.5.0 · **Product decisions:** owner-confirmed where marked · **API:** 0.3.20-draft (not frozen)



## Authority order

1. Latest explicit Product Owner decisions and approved decision records.
2. Master Product, Architecture, Engineering and Delivery Specification v1.5.0 (main body).
3. `/docs/contracts/openapi.yaml` for HTTP wire formats after joint contract freeze; `/docs/contracts/ws-events.schema.json` and `/docs/contracts/ws-protocol.schema.json` for realtime.
4. Domain/database and permission/security documents for data invariants and authorization.
5. UX and implementation blueprints, which must not override product or contract semantics.
6. Historical appendices and source captures, which are retained for provenance only and are non-normative.

## Change requirements

- Product behavior change: update decision register, master PRD, feature catalogue, affected workflows, traceability and acceptance tests.
- HTTP/WS change: update schemas and examples; run lint, reference validation, generated client diff and contract tests; coordinate FE/BE in one reviewed change.
- Data-model change: update ER model, constraints, migrations, RLS, seed fixtures, API DTOs, indexes, rollback and tests.
- Permission change: update capability catalog, evaluator, effective-permission DTO, denial behavior, audit event and negative tests.
- No implementation agent may invent endpoints, DTO fields, roles, capabilities, events, database columns or error codes.

## Document owners

| Artifact | Owner | Change trigger |
|---|---|---|
| Master PRD and decisions | Product Owner / Lead | Scope, approved policy or release-boundary change |
| OpenAPI and realtime schemas | Backend + Frontend jointly | Any wire-format/event change |
| Domain/database and RLS | Backend + Security | Entity, key, tenant, relationship or authorization change |
| UX/design system | Frontend Lead | Interaction, responsive or accessibility change |
| Frontend blueprint | Antigravity/Frontend Lead | Route, module, data-cache or UI architecture change |
| Operations and DR | Backend + Operations | Provider, deployment, alert, backup or recovery change |
| Traceability and validation | Product/Tech Lead | Feature/contract/test mapping changes |

## Current versions

- Product baseline: 1.5.0.
- HTTP candidate: OpenAPI 3.1.0, `0.3.20-draft`.
- Realtime event schema: Workspace event schema bundled with 0.3.20-draft; no new event types added in this revision.
- Realtime control protocol: retained from CR-12 baseline.
- Contract status: draft; joint FE/BE/Security approval still required.


## Approved decision baseline

Owner-confirmed: DEC-OPEN-01 (`AUDITED_BREAK_GLASS`, with implementation sign-off pending), DEC-OPEN-02 Option A, DEC-OPEN-06, DEC-OPEN-07, DEC-OPEN-08, DEC-OPEN-09, DEC-OPEN-10, DEC-OPEN-11 and DEC-OPEN-15.

Still open: DEC-OPEN-03/04/05/12/13/14. Do not turn their current draft recommendations into approved product policy. The task purge API remains disabled pending DEC-OPEN-03.

Current API candidate: `0.3.20-draft` (95 paths / 118 operations / 201 schemas); not frozen.
