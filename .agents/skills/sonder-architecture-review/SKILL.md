---
name: sonder-architecture-review
description: >-
  Architecture boundary verification, dependency-cruiser auditing, and security/privacy review for monorepos.
  Use when validating package boundaries, detecting circular dependencies, auditing security invariants, or checking contracts.
---

# Architecture, Security & Dependency Review Runbook

## 1. Purpose

Enforces package boundaries, dependency directions, module purity, and security invariants across the monorepo.

## 2. When to Activate

- Prior to merging any feature or infrastructure pull request.
- Checking for circular dependency introductions or cross-package leakage.
- Verifying Personal Workspace privacy and contract compliance.

## 3. Required Source Documents & Tools

- Dependency-cruiser Configuration (`.dependency-cruiser.cjs`).
- Knip Workspace Config (`knip.jsonc`).
- Contracts Package (`packages/contracts/`).
- Master PRD & Security Rules (`GEMINI.md`, `docs/03-architecture/`).

## 4. Step-by-Step Architecture Review Process

1. **Dependency Analysis**:
   - Run `pnpm depcruise` to audit package boundaries.
   - Confirm zero circular dependencies exist.
   - Confirm `packages/contracts` does not import from `apps/web`.
   - Confirm UI primitives (`components/ui`) do not import feature modules (`modules`).
2. **Dead Code & Dependency Hygiene**:
   - Run `pnpm knip` to inspect unused exports, dependencies, or orphan files.
   - Verify legitimate exports before considering deprecation.
3. **Security Invariant Audit**:
   - Verify backend authorization assumptions: frontend permission checks must be presentation hints only.
   - Verify Personal Workspace isolation: no admin overrides for personal workspaces.
   - Confirm zero secrets or environment credentials in repository commits.
4. **Contract Verification**:
   - Run `pnpm typegen:check` to ensure generated TypeScript interfaces match OpenAPI and WebSocket schemas.

## 5. Validation Checklist

- [ ] `pnpm depcruise` reports 0 violations.
- [ ] `pnpm knip` executed and findings categorized.
- [ ] `pnpm typegen:check` passes with zero schema drift.
- [ ] Shared contracts completely decoupled from applications.
- [ ] Zero secrets present in diff.

## 6. Prohibited Actions

- Never bypass dependency-cruiser errors by disabling rules.
- Never edit generated contract files directly.
- Never grant community admins access to personal workspaces.
