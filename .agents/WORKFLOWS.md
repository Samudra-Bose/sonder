# Specialized Agent Workflows & Coordination Runbook

## 1. Principles of Agent Specialization
In Sonder, multi-agent workflows function like an engineering team with defined responsibilities and isolation boundaries:
1. **Separation of Concerns**: Each agent operates within its defined specialization.
2. **Read-Only Independence**: Reviewers and analysts operate in read-only mode to prevent concurrent edit collisions.
3. **Evidence-Based Handoffs**: Transitions between agents require concrete verification output (command logs, test results, or schema validation).
4. **No Synthetic Consensus**: Agent agreement never overrides canonical specifications or automated test failures.

---

## 2. Standard Vertical Slice Lifecycle

```
[1. Product Analyst]
       │
       ▼ (Requirements Spec & AC Mapping)
[2. UI/UX Engineer]
       │
       ▼ (Interaction Blueprint & Token Mapping)
[3. Frontend Engineer]
       │
       ▼ (Implementation & Unit Tests)
[4. QA & Accessibility Engineer]
       │
       ▼ (Playwright E2E & WCAG Audits)
[5. Architecture & Security Reviewer]
       │
       ▼ (Contract & Boundary Sign-off)
[Coordinator / User]
       │
       ▼ (Squash Merge to develop)
```

### Stage 1: Requirements & Scope Analysis
- **Agent**: `Product and Requirements Analyst`
- **Inputs**: Canonical specs (`Community-Work-Management-v1.5/`), Decision Register.
- **Output**: Acceptance criteria, boundary conditions, open decision checks.
- **Rules**: Strictly read-only; no code modifications.

### Stage 2: Interaction & Design System Review
- **Agent**: `UI/UX and Design-System Engineer`
- **Inputs**: Requirements output, Component catalog, Theme tokens (`apps/web/src/index.css`).
- **Output**: Component story requirements, responsive breakpoint definitions, focus management plan.
- **Rules**: Must use semantic CSS variables; minimum 44×44px touch targets.

### Stage 3: Frontend Implementation
- **Agent**: `Frontend Implementation Engineer`
- **Inputs**: Design and requirement blueprints, `@sonder/contracts`.
- **Output**: React 19 components, MSW handlers, Vitest tests.
- **Rules**: Query Context7 for documentation; adhere to OpenAPI DTO contracts.

### Stage 4: Automated E2E & Accessibility QA
- **Agent**: `Playwright QA and Accessibility Engineer`
- **Inputs**: Implemented views, Playwright test configuration.
- **Output**: Playwright specs, axe-core WCAG 2.1 AA audit reports, failure snapshots.
- **Rules**: Never suppress legitimate accessibility errors.

### Stage 5: Independent Architecture & Security Audit
- **Agent**: `Architecture and Security Reviewer`
- **Inputs**: Pull request diff, dependency-cruiser reports, Knip findings.
- **Output**: Boundary compliance report, security sign-off.
- **Rules**: Strictly read-only; audits Personal Workspace privacy and CSRF invariants.

---

## 3. Rules for Concurrent Agent Changes
When multiple agents collaborate simultaneously:
1. **Worktree / Branch Isolation**: Concurrent code modifications must happen on separate Git branches or worktrees.
2. **Single Committer per Branch**: Never allow two agents to commit overlapping changes to the same branch.
3. **Coordinating Integrator**: Exactly one coordinating agent or user integrates and verifies merged branches.
4. **Clean Baseline Required**: Before merging branches into `develop`, execute the complete 7-step quality gate suite.
