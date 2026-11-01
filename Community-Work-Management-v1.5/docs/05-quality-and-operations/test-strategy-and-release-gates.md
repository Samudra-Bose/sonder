# Testing Strategy and Release Gates

**Baseline:** v1.5.0 · **API:** 0.3.20-draft (not frozen)



# 16. Quality strategy, verification and acceptance gates

## 16.1 Required testing layers

- Unit tests: domain rules, permission evaluation, task hierarchy, filters, custom-field validation, key allocation and query semantics.
- Database integration tests: real PostgreSQL, composite tenant constraints, RLS, transaction rollback, locking, concurrent key creation and outbox/idempotency atomicity.
- API contract tests: every operation against OpenAPI request/response schema, status code and Problem Details semantics.
- WebSocket tests: both stream scopes, auth, sequence/catch-up, at-least-once dedupe, disconnect/reconnect and cross-instance revocation.
- Frontend component tests: view parity, keyboard navigation, permissions, focus restoration, empty/error/loading/offline states.
- End-to-end tests: realistic multi-user flows with separate Personal and Shared Workspaces, Owner/Coordinator/Member/Viewer roles and cross-community attempts.
- Accessibility: automated axe plus manual keyboard/screen reader/focus/zoom review.
- Performance: representative community seed data and large-workspace stress cases.
- Security: BOLA/IDOR, cross-community isolation, stale membership revocation, alias privacy, break-glass and audit tampering.
- Reliability: health probes, backup restore, incident/rollback rehearsal.

## 16.2 High-risk acceptance scenarios

1. User A cannot see/search/mutate User B's Personal Workspace, even with a Community Admin role; only the approved same-community break-glass flow grants time-bound read-only access.
2. Removing a Coordinator/Member removes REST and realtime access promptly, including on other backend instances.
3. Concurrent task creation never duplicates Workspace key sequence; aliases resolve to current lineage only after destination authorization.
4. Cross-Workspace transfer carries only names plus structural tree/order; no assignee, status, description, comment, watcher, link or private metadata leaks; transaction is all-or-nothing.
5. BLOCKS links reject cycles and cross-scope target metadata is masked.
6. Four views return identical authorized task membership under the same query, subject only to projection-specific shape/bucketing.
7. Shared View filter edits never overwrite the shared saved record unless the user explicitly commits.
8. Same-field offline conflict produces no partial write; unauthorized replay is quarantined locally and never leaks to another account/community.
9. Duplicate mutation ID replays deterministic result only after current authorization; key reuse with different request is rejected.
10. Realtime catch-up closes the subscribe/refetch race and stream cursors cannot cross stream types.
11. Audit chain modification is detected; application DB role cannot update/delete prior audit events; no silent repair/purge occurs.
12. Restore drill meets approved RPO/RTO targets and produces recorded evidence.
13. Core desktop/mobile flows meet WCAG 2.2 AA review and no core action requires drag-only input.
14. Four view performance and API latency targets are measured under realistic seed/load data, not merely assumed.
15. DEC-OPEN-02: Workspace Owner may set allowed/default groups; default outside allowed ceiling is rejected; Task Creator can set only an allowed subset; a non-creator Coordinator/Assigner cannot change task grants; active Workspace Owner can override.
16. All active assignees on a task receive the same task-level groups; removing an assignee immediately removes their assignee rights; a ceiling reduction immediately removes effective rights for removed groups.
17. Changing the Workspace default affects new tasks only; existing tasks retain their task-level selection. `COLLABORATIVE_MEMBER` remains broader and is not restricted by task-level grants.
18. Task-level permission metadata is excluded from the offline replay allow-list and from ordinary field-capability mapping; any combined PATCH remains all-or-nothing.
19. Workspace key-prefix registry rejects case-insensitive collisions against current and historical prefixes; prefix rename is atomic, preserves numeric suffixes and earlier aliases, and concurrent task creation never duplicates a sequence.
20. Each of the three built-in Workspace templates seeds exactly its documented statuses, Phase 1 fields/options and SHARED views; the transaction creates no sample task, assignment, member, invitation or elevated permission.
21. Milestones are optional Workspace planning markers linked directly to tasks; they never appear as parent/child containers in hierarchy, List, Board or Timeline data.
22. A Workspace defaults to one subtask level; an Owner may raise it to two; lowering below any existing tree depth is rejected atomically without reparenting or deleting tasks.
23. Cross-Workspace transfer rejects non-null `targetParentTaskId`, excludes `itemType` and all non-name/tree/order fields, creates the root at top level, and commits no partial tree/alias/tombstone/outbox state on failure.
24. Archived tasks remain restorable for exactly 30 days; expiration does not automatically hard-delete; explicit purge is Owner-only, audited, subtree-atomic and rejected while DEC-OPEN-03 remains open.
25. Multiple Shared Workspace Owners may coexist; parallel owner-transfer/leave/suspend attempts can never commit a state with zero active Owners; Personal Workspaces remain single-owner.

## 16.3 CI gates

1. OpenAPI lint, schema validation, internal-reference check and generated type/client diff check.
2. Frontend TypeScript, lint, dependency/secret scan and production build.
3. Backend unit/integration/contract tests against ephemeral PostgreSQL.
4. Frontend MSW/Playwright plus axe checks.
5. Release artifact, database migration compatibility, health/readiness and operational smoke gates.

The current 250 local checks are not a substitute for all 16 CR runtime, security and integration tests.

---


---

# 19. Contract freeze and launch checklist

## 19.1 Contract freeze gate

- [ ] Product signs off on this master and each open decision that blocks affected behavior.
- [ ] The 0.3.20-draft HTTP/realtime candidate is Workspace-first and includes the DEC-OPEN-02 amendment; reconcile Workspace ceiling/default and task-level grant arrays across DB/RLS, generated types, mocks, frontend controls and runtime tests; reconcile database schema/migrations, RLS, seeds, generated client types, MSW mocks, tests, UI and implementation prompts to the same Workspace → Task → Subtask model.
- [ ] DEC-OPEN-06/07/08/09/10/11/15 owner-confirmed policies are implemented: community-unique permanent prefixes and rename aliases; built-in template seeding; optional Workspace milestones; bounded subtask depth; top-level-only name/tree transfer; 30-day Trash with disabled automatic purge; multiple Owners with atomic ownership floor.
- [ ] No file upload/attachment routes, DTOs, storage features or tests remain in the active product contract.
- [ ] Permanent task purge remains disabled until DEC-OPEN-03 is approved and the policy/legal-hold controls are implemented.
- [ ] All CR-01..CR-16 drafts receive the necessary Product/FE/BE/Security/Ops approval, or are explicitly marked as non-blocking with an owner and due milestone.
- [ ] OpenAPI lint and JSON Schema Draft 2020-12 validation run in CI; all `$ref` and path parameters resolve.
- [ ] Generated frontend API types and mock handlers match exact contract version.
- [ ] HTTP and WS payload examples are schema-validated.
- [ ] Permission/tenant isolation and error semantics are tested, including hidden-resource 404 behavior.
- [ ] Database schema, migrations, RLS and composite FK/index design reviewed.
- [ ] Offline replay, idempotency, pagination and realtime race tests are specified and executable.
- [ ] Contract revision is pinned in both frontend and backend repositories.

## 19.2 Initial production release gate (M1.3)

- [ ] Four views functional and parity-tested against one canonical query.
- [ ] All core task, workspace and membership journeys pass end-to-end tests.
- [ ] Personal Workspace privacy and break-glass controls pass negative/positive tests.
- [ ] Task transfer carries only the approved fields and is atomic.
- [ ] Realtime event delivery, replay, deduplication, catch-up and revocation pass multi-instance tests.
- [ ] Offline selected-field edit/replay/conflict and access-revocation cases pass.
- [ ] Custom role delegation/preview and audit scope tests pass.
- [ ] Notification/reminder delivery and preference behavior pass.
- [ ] Mobile core flows usable on supported viewport sizes.
- [ ] WCAG 2.2 AA automated and manual acceptance complete.
- [ ] Performance targets are measured against representative workload and approved.
- [ ] Production provider, region, DNS, email, secrets and monitoring configured.
- [ ] Backups/PITR configured and clean-room restore drill passes.
- [ ] Alert routing, incident playbook, release rollback and migration compatibility rehearsed.
- [ ] Support/ownership/on-call contacts identified.
- [ ] Product, frontend, backend, security and operations jointly sign the release.

---
