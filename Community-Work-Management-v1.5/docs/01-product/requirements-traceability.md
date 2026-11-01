# Requirements Traceability Matrix

**Baseline:** v1.5.0 · **Product decisions:** owner-confirmed where marked · **API:** 0.3.20-draft (not frozen)



## Traceability matrix

| Requirement group | Governing source | Contract surface | Data/security boundary | Acceptance evidence |
|---|---|---|---|---|
| Identity and sessions | PRD §5, §11 | `/auth/*`, `/me` | User identity, session, CommunityMembership | Email/password, Google OIDC, CSRF, session revocation tests |
| Community and Workspace lifecycle | PRD §6.1; domain §3 | `/communities/{communityId}/workspaces*` | Community tenant + Workspace scope | Cross-Community and cross-Workspace isolation, membership lifecycle |
| Workspace key prefix | DEC-OPEN-06; key policy | Workspace create/PATCH, `/tasks/by-key/{taskKey}` | Permanent prefix registry + alias ledger | Community-wide current/historical prefix collision, atomic prefix rename, suffix preservation, alias privacy, concurrency and no reuse |
| Task and subtask lifecycle | PRD §6.2; domain §4 | `/tasks`, `/tasks/{taskId}` | Workspace FK, bounded tree, effective permissions | CRUD, depth, parent cycle and permission matrix tests |
| Assignee edit grants | DEC-OPEN-02 Option A; CR-05 | Workspace settings PATCH + task create/PATCH | Owner ceiling/default, creator task grant | Subset enforcement, immediate ceiling reduction, audit atomicity |
| Cross-Workspace transfer | DEC-OPEN-10; transfer policy | move-preview + move | Source/target membership, lineage/aliases, two outbox streams | Names/tree-only transfer, top-level root, no partial writes |
| Four views and query | PRD §6.3–6.4; CR-04 | `/tasks/query`, saved views | Canonical ViewQuerySpec, current authorization | Same authorized task IDs across all four views |
| Templates | DEC-OPEN-07 | `/workspace-templates`, createWorkspace.templateKey | Built-in versioned seed bundles | Exact three template seed sets; atomic create; no sample task, assignment, member, invitation or grant seeding |
| Milestones | DEC-OPEN-08 | `/workspaces/{workspaceId}/milestones` | Workspace scoped, no hierarchy edge | Optional marker CRUD and Timeline rendering; same-Workspace validation; never parent/container behavior |
| Trash and purge | DEC-OPEN-11; DEC-OPEN-03 gate | archive/restore/trash/purge | Archived subtree, aliases, audit, retention/legal hold | Exactly 30-day restore window; no expiry-driven hard deletion; explicit audited Owner purge gated by DEC-OPEN-03 |
| Ownership | DEC-OPEN-15 | `/owner-transfer` | Active owner floor, Community membership | Multiple active Owners; atomic transfer; concurrent last-owner tests; Personal Workspace remains single-owner |
| Realtime | CR-09 | WSS control + WorkspaceStreamEvent | Independent streams, current membership | Subscribe/catch-up race, dedupe, revocation, privacy tests |
| Offline | CR-15 | task PATCH replay contract | User/community/workspace binding; field revisions | stale authorization, same-field conflict, replay/idempotency tests |
| Audit | CR-14 | audit events/export | Append-only chain, scope, PII minimization | Tamper, insert failure rollback, scope and export tests |
| Deployment/DR | CR-16 | health routes and operations controls | Environment boundaries, DB backup and recovery | Restore drill, rollback rehearsal, alerts and SLO measurement |

## Traceability status

The matrix maps product requirements to contract surfaces and acceptance evidence. It does not assert that the corresponding endpoints, database migrations, UI, runtime tests or production controls have already been implemented. Those are tracked as implementation work and require recorded evidence.
