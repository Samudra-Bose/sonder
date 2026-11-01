# Deployment, Observability and Disaster Recovery

**Baseline:** v1.5.0 · **API:** 0.3.20-draft (not frozen)



# 15. Reliability, observability, backup and incident response

## 15.1 Current provisional targets — OPEN / RECOMMENDED FOR REVIEW

| Measure | Current target proposal | Status |
|---|---:|---|
| Monthly service availability | 99.5% | Provisional, not an SLA and not measured. |
| Database RPO | Under 5 minutes | Provisional; requires configured WAL/PITR and a tested recovery path. |
| RTO | Under 60 minutes | Provisional; requires a timed clean-room restore drill. |

At 99.5% in a 30-day month, planned error budget is approximately 3 hours 36 minutes. The draft recommends readiness probes every 60 seconds from two independent regions. SLI denominator, exclusions, provider and budget require approval.

## 15.2 Health checks

- `GET /health/live`: unauthenticated, process/event-loop liveness only; no database dependency; minimal response.
- `GET /health/ready`: unauthenticated; PostgreSQL `SELECT 1` with a two-second timeout and fresh outbox worker heartbeat (under 30 seconds in current draft); generic 503 with `Retry-After` if not ready; no internal dependency details; no-store.

## 15.3 Observability and alerts

Structured JSON logs should include timestamp, severity, correlation ID, actor/community/workspace scope where appropriate, operation, status, duration and stable error code. Never log passwords, cookies, authorization headers, CSRF values, OAuth codes, session/ticket tokens, task descriptions, comment bodies, custom-field values or free-text break-glass reasons.

CR-16 draft alerts: prolonged readiness failure; 5xx spikes; outbox backlog/lag; immediate break-glass and audit-chain integrity events; backup/WAL/PITR lag; high-volume authorization/rate-limit anomalies. Final thresholds, routing, acknowledgement and on-call ownership require an Ops decision.

## 15.4 Backups and recovery

Recommended primary recovery: managed PostgreSQL continuous WAL archiving/PITR plus daily encrypted logical backup as an independent path, stored in an isolated backup account/bucket. Backup retention (30 days is only a recommendation) must be approved separately from audit retention. No object-storage/file recovery is required because uploads are out of scope.

A clean-room restore must be executed before M1.3 launch and then periodically (monthly in CR-16 draft). Verify schema, foreign keys, RLS, audit hash chain, idempotency/outbox integrity and high-risk acceptance scenarios. Restore procedures must never write recovered data directly into production without a separately approved cutover. No real restore drill has been evidenced yet.

## 15.5 Incident classification and release rollback

SEV-1 examples: tenant isolation breach, total outage, account/session compromise, destructive data corruption or audit hash integrity failure. SEV-2 examples: partial feature outage such as realtime/notification degradation while core work remains accessible. Response timing and postmortem targets in CR-16 are recommendations, not staffed commitments. Release rollback reuses immutable prior artifacts and is allowed only when the DB schema remains N-1 compatible. Never run destructive automatic database downgrades.

---


---

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
