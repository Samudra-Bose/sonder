# Community Work Management Platform — Documentation Baseline v1.5.0

**Product baseline:** OWNER APPROVED for decisions explicitly marked OWNER CONFIRMED.  
**HTTP contract:** OpenAPI `0.3.20-draft` — joint Frontend/Backend/Security contract freeze pending.  
**Implementation state:** No application runtime, migrations, RLS deployment, production hosting or end-to-end execution is claimed by this package.

## Start here

1. `Community-Work-Management-Master-Specification-v1.5.0.md` — consolidated source of truth with embedded current HTTP/realtime contracts and historical source records.
2. `00-governance/project-charter.md` and `01-product/master-prd.md` — product direction, scope and features.
3. `00-governance/decision-register.md` — owner-approved decisions and unresolved decisions.
4. `03-architecture/domain-model-and-database.md` and `03-architecture/permission-and-security-model.md` — logical entities, tenancy and authorization.
5. `contracts/openapi.yaml`, `contracts/ws-events.schema.json`, `contracts/ws-protocol.schema.json` — current machine-readable draft contracts.
6. `policies/` — standalone owner-confirmed task/key/template/milestone/hierarchy/transfer/Trash/ownership policies plus CR-05 Option A.
7. `02-ux-and-design-system/` — interaction, view, accessibility and responsive requirements.
8. `04-implementation/` — Antigravity frontend blueprint, backend integration blueprint and vertical delivery plan.
9. `05-quality-and-operations/` and `06-operations/` — quality/security gates, deployment/DR and runbook templates.
10. `validation/` — exact static validation script and report, including what was not run.

## Owner-confirmed decisions in v1.5.0

- DEC-OPEN-02 Option A: Workspace Owner controls assignee permission ceiling/default; Task Creator chooses a per-task subset; active Workspace Owner may override.
- DEC-OPEN-06: Community-unique, case-insensitive, permanently reserved Workspace prefixes; atomic prefix rename with preserved numeric suffixes and immutable aliases; Workspace-local monotonic sequence.
- DEC-OPEN-07: Exactly three built-in versioned Workspace setup templates: General Purpose, Event Planning and Team Operations. They seed configuration only and never create sample tasks, assignments, members, invitations or elevated grants.
- DEC-OPEN-08: Optional Workspace-level milestone planning markers linked directly to tasks; never containers.
- DEC-OPEN-09: Default one subtask level; Workspace Owner may raise to two; reject unsafe reductions atomically.
- DEC-OPEN-10: Cross-Workspace transfer is NAMES_ONLY; transferred root is always top-level; `targetParentTaskId` is null; `itemType` is excluded.
- DEC-OPEN-11: 30-day restorable Trash; no automatic hard purge; explicit audited Owner purge only, and it remains disabled pending DEC-OPEN-03.
- DEC-OPEN-15: Multiple active Shared Workspace Owners; at least one active Owner at every commit; atomic owner-transfer flow; Personal Workspace remains single-owner.

## Decisions still open

- DEC-OPEN-03 audit retention, archive and legal-hold policy.
- DEC-OPEN-04 final availability SLO, RPO and RTO targets and operational evidence.
- DEC-OPEN-05 final domain-neutral language and Phase 4 agile feature detail.
- DEC-OPEN-12 idempotency retention/storage-cost verification.
- DEC-OPEN-13 hosting provider, region, budget and supporting services.
- DEC-OPEN-14 concrete authentication deployment values/providers/origins and final password-hash parameters.

DEC-OPEN-01 (`AUDITED_BREAK_GLASS`) and DEC-OPEN-02 are selected/approved product policies, but their detailed implementation/security gates still require verification.

## Handoff boundary

This documentation package is the implementation handoff baseline. It is not a frozen API contract. Before generating production clients or implementing dependent vertical slices, the Backend and Frontend developers must jointly review OpenAPI/realtime schemas and reconcile the database model, RLS, migrations, seeds and generated mocks. The backend must enforce authorization. Frontend permission flags are UI hints only.

## Version policy

Do not overwrite v1.2/v1.3/v1.4 historical artifacts. Changes to approved behavior require a dated decision record and versioned update to the master, affected policies, API/realtime contracts, database/permissions design, traceability and tests.
