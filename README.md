# Sonder — Community Work Management Platform

**Platform:** Sonder  
**Documentation Baseline:** v1.5.0 (`APPROVED PRODUCT BASELINE`, 31 October 2026)  
**Contract Baseline:** OpenAPI `0.3.20-draft` (Workspace-First, unfrozen) & WebSocket Stream Schema (31 event types)

---

## 1. Overview

Sonder is a modern, low-learning-curve work management platform designed for community-driven organizations, student groups, event teams, and cross-functional operations. It combines the structured depth of a mature task tracker (hierarchy, dependencies, synchronized views, role governance, and audit integrity) with the intuitive simplicity of lightweight tools.

### Core Architecture Invariants
- **Canonical Hierarchy:** Community &rarr; Workspace &rarr; Task &rarr; Subtask (default depth: 1, maximum depth: 2).
- **No Container Entities:** No intermediate Project or List resource containers.
- **No File Uploads:** Zero binary/attachment storage overhead.
- **Four Synchronized Views:** List, Board, Calendar, and Timeline operating over unified query semantics.
- **Assignee Delegation (DEC-OPEN-02 Option A):** Workspace Owner controls delegation ceiling and default; Task Creator configures per-task subsets.
- **Restorable Trash (DEC-OPEN-11):** 30-day restorable window; permanent purge disabled pending DEC-OPEN-03.

---

## 2. Documentation & Specifications

The complete, authoritative product and architecture documentation is located in:
- [Community-Work-Management-Master-Specification-v1.5.0.md](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/Community-Work-Management-Master-Specification-v1.5.0.md) — Consolidated normative master specification.
- [Community-Work-Management-v1.5/docs/README.md](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/Community-Work-Management-v1.5/docs/README.md) — Split documentation index.
- [docs/00-governance/source-of-truth-registry.md](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/Community-Work-Management-v1.5/docs/00-governance/source-of-truth-registry.md) — Precedence and change control rules.
- [docs/00-governance/decision-register.md](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/Community-Work-Management-v1.5/docs/00-governance/decision-register.md) — Approved and open decision registers.
- [docs/contracts/openapi.yaml](file:///home/samudra/Projects/VisualSCode/VisualCode/Vscoding/Sonder/Community-Work-Management-v1.5/docs/contracts/openapi.yaml) — Canonical OpenAPI 3.1.0 contract.

---

## 3. Workspace Structure

The repository is organized as a `pnpm` monorepo:

```text
sonder/
├── apps/
│   └── web/                     # Frontend SPA (Vite, React 19, TypeScript strict, Tailwind CSS, MSW v2)
├── packages/
│   └── contracts/               # Shared contracts, OpenAPI types, WebSocket protocol types
├── Community-Work-Management-v1.5/ # Authoritative documentation baseline v1.5.0 and contracts
├── .github/
│   ├── workflows/ci.yml         # GitHub Actions validation & test workflow
│   └── pull_request_template.md # Required pull request checklist
├── package.json                 # Workspace root scripts
└── pnpm-workspace.yaml          # Monorepo declaration
```

---

## 4. Git Governance & Branch Model

- `main`: Protected stable release branch.
- `develop`: Shared integration branch for active vertical slices.
- `feat/FE-*`: Frontend feature branches.
- `feat/BE-*`: Backend feature branches.
- `feat/FS-*`: Coordinated full-stack feature branches.
- `fix/*`: Bug fixes.
- `refactor/*`: Structural code improvements without behavioral changes.
- `perf/*`: Performance optimizations.
- `docs/*`: Documentation and specification updates.
- `test/*`: Test improvements and test rig enhancements.
- `chore/*`: Repository tooling, configuration, dependency management, and build infrastructure.
- `hotfix/*`: Urgent production fixes branching directly from `main`.

*Direct commits to `main` or `develop` are prohibited. All merges require pull requests passing CI checks.*

---

## 5. Developer Quickstart

### Prerequisites
- Node.js `>= 20.0.0` (LTS recommended)
- `pnpm` `>= 9.0.0` (Pinned to `12.13.0`)
- Python `3.12+` with `ruamel.yaml` and `jsonschema` (for static documentation verification)

### Setup & Development

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Generate TypeScript types from canonical OpenAPI and WebSocket schemas
pnpm typegen

# 3. Verify type generation sync
pnpm typegen:check

# 4. Run TypeScript checks across all workspaces
pnpm typecheck

# 5. Execute unit and component tests (Vitest + MSW)
pnpm test

# 6. Build production bundles
pnpm build

# 7. Run baseline document and schema validation (51 checks)
pnpm validate:docs

# 8. Start frontend development server with contract mocks
pnpm --filter @sonder/web dev
```
