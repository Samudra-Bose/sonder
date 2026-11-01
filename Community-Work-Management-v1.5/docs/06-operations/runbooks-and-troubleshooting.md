# Operations Runbooks and Troubleshooting Baseline

**Baseline:** v1.5.0 · **Product decisions:** owner-confirmed where marked · **API:** 0.3.20-draft (not frozen)



## Purpose

This document defines the minimum runbook set that must be completed and rehearsed before M1.3 release. It is a template for operational procedures, not a claim that any environment currently exists.

## Required runbooks

1. Service unavailable: inspect liveness/readiness, recent release, error rates and dependency status; preserve logs and correlation IDs; use immutable previous artifacts only when schema N-1 compatibility holds.
2. Database degradation: check managed database health, connection pool, lock contention and outbox backlog; do not run destructive repair queries.
3. Restore from backup: declare incident, select recovery point, restore into isolated environment, verify schema/FKs/RLS/audit chain/outbox/idempotency, capture measured RPO/RTO, obtain approval before cutover.
4. Credential compromise: revoke affected sessions/tickets, rotate secrets/provider credentials, review auth audit metadata, preserve evidence and notify responsible security operator.
5. Tenant isolation incident: stop affected access path, preserve evidence, invalidate sessions/realtime access, verify cross-tenant controls and perform incident review.
6. Outbox/realtime lag: inspect worker heartbeat, event backlog, consumer-specific offsets and retry/dead-letter state; do not mark another consumer's work complete.
7. Audit chain integrity failure: preserve chain/checkpoint evidence, alert security, do not silently repair or delete ledger rows.

## Operational ownership required before launch

- Named Backend operator and Security contact.
- Named primary/backup incident responders.
- Provider console access and emergency credential custody.
- Staging restore and rollback rehearsal record.
- Alert routing, escalation and response targets.
- Production deployment and migration approval procedure.

## Explicit not-yet-configured items

Cloud provider/region, email sender, Google OAuth application, DNS and origins, secret manager, monitoring provider, alert destinations, WAL/PITR configuration, backup retention and restore evidence remain to be selected and verified.
