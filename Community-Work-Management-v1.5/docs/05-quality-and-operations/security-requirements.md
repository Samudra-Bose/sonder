# Security Requirements and Threat Controls

**Baseline:** v1.5.0 · **API:** 0.3.20-draft (not frozen)



## 11.2 Authorization layers

1. Global account/session validity.
2. Community membership and community-scoped administration.
3. Workspace membership and workspace role.
4. Personal Workspace privacy and break-glass state.
5. Task visibility and relationship-based grants (creator/assigner/assignee).
6. Per-field/per-action capability and task policy.
7. Preview role mask, which may only reduce the real permission set.

The backend enforces this chain; frontend flags are advisory. All list/search/query endpoints must apply authorization before aggregation/counting to prevent side-channel leakage.


---

## 11.3 Security engineering controls

- Use parameterized queries, strict DTO allow-lists, size limits, safe Markdown AST rendering and exact URL scheme allow-lists.
- Enforce per-tenant composite constraints and RLS; test both with ordinary and elevated role contexts.
- Never trust client-supplied user IDs for the current principal, task assigner, notification recipient or audit actor.
- Revalidate authorization on idempotency replay, cursor continuation, offline mutation replay, task-key alias resolution and WebSocket catch-up.
- Sensitive DTOs use private/no-store caching; cache keys include principal and permission revision where caching is justified.
- Do not place bearer tokens, refresh credentials or session values in browser localStorage, URL query strings, logs or telemetry.
- Include dependency and secret scanning in CI; separate runtime and migration database identities.

---


---

## 5.5 Personal Workspace privacy and emergency access

**Privacy status — OWNER CONFIRMED.**

The selected product policy is `AUDITED_BREAK_GLASS`, not broad administrator access. Only an active Community Administrator belonging to the same Community as the target Personal Workspace may initiate. Platform Operators, cross-community administrators, Coordinators and ordinary members cannot initiate. The access is read-only and limited to one Personal Workspace. Fresh reauthentication is required; the justification uses a closed reason category plus a minimum non-whitespace explanation. The CR-01 draft chooses a 15-minute default, 60-minute maximum initial grant, one independently approved 30-minute extension and 90-minute absolute lifetime. Owner notification, grantor/peer-admin revocation and immutable pre-access audit evidence are mandatory. The exact procedure needs product/security/backend sign-off before freeze.

Routine support, curiosity, performance monitoring, convenience or ordinary management review are not valid reasons. A separate formal legal process is required for legal/regulatory disclosure; break-glass is not a substitute.

---
