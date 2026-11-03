---
name: sonder-feature-planning
description: >-
  Feature planning, specification analysis, and acceptance criteria mapping for Sonder and complex web platforms.
  Use when planning vertical slices, analyzing canonical PRD requirements, detecting spec contradictions, or structuring milestone roadmaps.
---

# Feature Planning & Specification Mapping Runbook

## 1. Purpose
Guides the disciplined planning of product features, ensuring strict fidelity to canonical product specifications, domain entities, and decision registers before code is written.

## 2. When to Activate
- Starting any new vertical slice (e.g. VS-02C, VS-02D) or feature initiative.
- Resolving conflicting user stories or ambiguous interface requirements.
- Validating entity relationships before drafting schema or contract changes.

## 3. Required Source Documents
- Master Product Specification & PRD (`Community-Work-Management-v1.5/docs/01-product/`).
- Decision Register (`Community-Work-Management-v1.5/docs/02-governance/decision-register.md`).
- Domain Model & Database Architecture (`Community-Work-Management-v1.5/docs/03-architecture/`).
- Phased Vertical Slices Blueprint (`Community-Work-Management-v1.5/docs/04-implementation/`).

## 4. Step-by-Step Planning Process
1. **Domain Boundary Check**:
   - Confirm entity mappings adhere strictly to `Community` → `Workspace` → `Task` → `Subtask`.
   - Ensure no extraneous container entities (e.g. `Project`) are introduced.
2. **Decision Register Verification**:
   - Check if any proposed capability depends on open decisions (DEC-OPEN-03 through DEC-OPEN-14).
   - If an open decision is touched, keep the feature safely gated and report the boundary.
3. **Contract Alignment**:
   - Identify corresponding REST endpoints in OpenAPI 0.3.20-draft and WebSocket event schemas.
   - If an endpoint does not exist, draft a contract request for the backend team rather than fabricating client endpoints.
4. **Acceptance Criteria Definition**:
   - Define testable criteria for desktop, tablet, and mobile views.
   - Define error states, empty states, and permission boundary states.
5. **Technical Slice Plan**:
   - Break work into isolated phases: Primitives → Feature Module → MSW Mocks → Unit Tests → E2E Tests.

## 5. Validation Checklist
- [ ] No `Project` entities introduced.
- [ ] Subtask nesting restricted to 1–2 levels.
- [ ] No open governance decisions independently decided.
- [ ] REST & WebSocket interactions mapped to official contract types.
- [ ] Dedicated feature branch planned (`feat/*` or `chore/*`).

## 6. Prohibited Actions
- Never invent unapproved database fields or API paths.
- Never write application code during the planning phase.
- Never bypass the decision register.
