# Decision Register

**Baseline:** v1.5.0 · **API:** 0.3.20-draft (not frozen)

Owner-confirmed product decisions are separated from engineering and operational approval gates that remain open.

## 18.2 Open product/engineering decisions

| ID | Decision | Current state | Required resolution |
|---|---|---|---|
| DEC-OPEN-01 | Personal Workspace administrator access | `AUDITED_BREAK_GLASS` is OWNER CONFIRMED. | Product/security/backend implementation sign-off and runtime evidence remain required. |
| DEC-OPEN-02 | Task editing policy and assignee editability | **OWNER CONFIRMED — Option A:** Workspace Owner controls delegation ceiling/default; Task Creator configures per-task subset; active Workspace Owner may override. | Product decision closed. FE/BE/Security contract and runtime verification remain. |
| DEC-OPEN-03 | Audit retention, archive and legal hold | Numeric searchable/archive/purge durations and legal-hold process unresolved; audit purge disabled. | Product/Operations/Security/legal-policy approval. This blocks activation of permanent task purge route. |
| DEC-OPEN-04 | Availability/RPO/RTO | 99.5% / RPO under 5 min / RTO under 60 min remain provisional targets. | Product/Ops approval, provider feasibility and measured DR drill. |
| DEC-OPEN-05 | Domain-neutral language and agile extension | Core language is domain-neutral; cycles/charts are opt-in Phase 4. | Confirm whether any terminology needs adjustment before Phase 4; not an M1.1 blocker. |
| DEC-OPEN-06 | Workspace task-key lifecycle | **OWNER CONFIRMED:** Community-unique, case-insensitive permanent prefix reservations; Workspace-local atomic monotonic sequence; Owner may atomically rename prefix while preserving numeric suffixes and aliases. | Product decision closed. Backend migration, concurrency tests and FE/BE contract verification remain. |
| DEC-OPEN-07 | Template target object | **OWNER CONFIRMED:** exactly three built-in Workspace setup templates for workflow, supported fields and default shared views; no sample tasks or membership/grant seeding. | Product decision closed. Template catalog and seed application remain implementation work. |
| DEC-OPEN-08 | Milestones | **OWNER CONFIRMED:** optional Workspace-level planning markers linked directly to tasks; never containers. | Product decision closed. Backend/FE implementation and view acceptance remain. |
| DEC-OPEN-09 | Subtask depth | **OWNER CONFIRMED:** default 1; Workspace Owner may raise to max 2; reject reductions below existing tree depth. | Product decision closed. Migration/runtime guard tests remain. |
| DEC-OPEN-10 | Cross-Workspace transfer destination placement | **OWNER CONFIRMED:** NAMES_ONLY titles/tree/order; transferred root always top-level; `targetParentTaskId=null`; no `itemType`. | Product decision closed. Backend and security transfer tests remain. |
| DEC-OPEN-11 | Task retention / Trash | **OWNER CONFIRMED:** 30-day restorable Trash; explicit Owner-authorized and audited purge; no automatic hard purge. | Product decision closed. Purge endpoint stays disabled until DEC-OPEN-03 approval. |
| DEC-OPEN-12 | Idempotency result retention | CR-15 draft uses 30 days. | FE/BE/Security/Product review storage cost, cleanup and runtime replay behavior. |
| DEC-OPEN-13 | Hosting/provider/region/budget | Not selected. | Backend + Ops selection with email/auth, database, backups and monitoring cost model. |
| DEC-OPEN-14 | Authentication deployment details | CR-13 cookie/OIDC/session rules are engineered as a draft; providers, origins and password-hash tuning unresolved. | Security/Backend/Ops confirm deployed provider, origins, callbacks, email sender, secret manager and final parameters. |
| DEC-OPEN-15 | Multiple Workspace Owners/transfer | **OWNER CONFIRMED:** multiple active Owners; dedicated atomic transfer; at least one active Owner at commit; no last-owner leave/demote/suspend without replacement. | Product decision closed. Backend/security tests and recovery runbook remain. |
| DEC-OPEN-16 | Creator-configured assignee editing | **CLOSED / SUPERSEDED by DEC-OPEN-02 Option A.** | No separate decision remains. |


---

## 18.3 Owner approvals recorded in v1.5.0

On 31 October 2026, the Product Owner explicitly approved the recommended defaults for DEC-OPEN-06, DEC-OPEN-07, DEC-OPEN-08, DEC-OPEN-09, DEC-OPEN-10, DEC-OPEN-11 and DEC-OPEN-15. They are now classified OWNER CONFIRMED and are reflected in the main body, API 0.3.20-draft, policy files and implementation documentation.

Other decisions remain open exactly as shown in Section 18.2. No approval is inferred for audit retention/legal hold, SLO/RPO/RTO, idempotency storage retention, hosting/provider/budget, or concrete authentication deployment configuration.
