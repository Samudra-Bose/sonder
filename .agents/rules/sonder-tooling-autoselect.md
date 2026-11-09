# SONDER — PERMANENT ANTIGRAVITY TOOLING AUTONOMY

**Status:** Permanent Project Rule  
**Scope:** All Sonder frontend and full-stack development stages  
**Authority:** Project-level operating policy  

---

## 1. Objective and Operating Principle

Antigravity operates with automatic tooling autonomy across the Sonder codebase. At the beginning of every substantial engineering task, Antigravity must automatically discover, select, and utilize the best available installed tools, MCP servers, skills, subagents, browser automation capabilities, and development utilities.

The user should not need to explicitly prompt Antigravity to use its installed capabilities. Tool selection is driven by task technical requirements, quality gates, and efficiency safeguards.

---

## 2. Automatic Tool Discovery

At task initiation, Antigravity executes an environmental discovery pass:
1. **Discover available tools:** inspect available CLI utilities (`pnpm`, `tsc`, `vitest`, `vite`, `python3`, `git`).
2. **Inspect installed skills:** match active task scope against installed skills:
   - `accessibility-audit`: automated WCAG 2.2 AA testing with axe-core and keyboard navigation.
   - `architecture-review`: boundary verification, import restriction auditing, contract integrity.
   - `playwright-qa`: end-to-end browser automation and runtime validation.
   - `ui-implementation`: design system primitives, accessible UI styling runbook.
   - `feature-planning`: specification analysis and acceptance criteria mapping.
   - `pr-release-review`: quality gate verification and pre-merge sanity reviews.
   - `creative-ui` / `design-ui`: frontend UI architecture and accessible interaction patterns.
3. **Identify configured MCP capabilities:**
   - **Context7 MCP (`context7`):** library documentation resolution (`resolve-library-id`, `query-docs`).
   - **Chrome DevTools MCP (`chrome-devtools`):** browser performance traces, heap snapshots, and `lighthouse_audit`.
   - **Playwright MCP (`playwright`):** multi-viewport browser automation, DOM snapshots, network inspection, and screenshot verification.
4. **Verify operational readiness:** verify tools are active before execution. If a tool requires external services or is unavailable, document the status and proceed with an accessible fallback.

---

## 3. Automatic Tool Selection by Category

Tools are selected dynamically based on engineering requirements:

### A. Documentation & API Integration
- **Context7 MCP:** Query canonical external documentation for core libraries (e.g., TanStack Query, React Router, Base UI).
- **OpenAPI Contract Authority:** Always inspect `Community-Work-Management-v1.5/docs/contracts/openapi.yaml` (canonical version `0.3.20-draft`).
- **Code Generation:** Use `pnpm typegen:check` and generated types from `@sonder/contracts`. Never write ad-hoc duplicate schemas.

### B. Frontend Implementation & Design System
- **Framework & Primitives:** Utilize React 19, `@base-ui/react`, Tailwind CSS, and Sonder's design tokens in `apps/web/src/components/ui/`.
- **Component Isolation:** Ensure every component has isolated loading, empty, populated, and error states.
- **Architectural Boundaries:** Strictly prohibit importing mock fixtures or MSW handlers into production modules (`apps/web/src/modules/`).

### C. Browser Testing & Accessibility
- **Playwright MCP & Browser Automation:** Use realistic browser interaction for UI journeys, modal traps, mobile viewports, and deep-link flows.
- **Chrome DevTools MCP:** Utilize console logs, network inspection, and DOM snapshots for runtime debugging.
- **Accessibility (WCAG 2.2 Level AA):** Apply `accessibility-audit` guidelines. Validate dual-indicator statuses (never color alone), visible focus rings, roving tabindex on grids, 44×44px touch targets on mobile, and non-drag interactive alternatives.

### D. Performance & Bundle Integrity
- **Lighthouse CI & DevTools Audits:** Use Chrome DevTools `lighthouse_audit` when verifying performance or Core Web Vitals.
- **Bundle Analysis:** Monitor output of `pnpm build` (Vite) to prevent accidental bundle bloat or dependency duplication.

### E. Architecture, Boundaries & Maintainability
- **Dependency & Boundary Verification:** Follow `architecture-review` invariants. Strictly enforce that `apps/web/src/modules/tasks/` has zero mock dependencies.
- **Unused Code Detection:** Audit for dead code, unused exports, and orphan styles before release.
- **Contract Parity:** Re-verify all query specifications and request/response payloads against OpenAPI schemas.

### F. Dependency Maintenance
- **Strict Dependency Discipline:** Never install new dependencies or modify root/workspace `package.json` dependencies without approval.
- **Security & Hygiene:** Preserve existing lockfile integrity and verify clean audits.

---

## 4. Parallel Execution & Subagent Coordination

When tasks involve distinct, non-overlapping activities, Antigravity uses subagents to execute in parallel:
- **Research & Contract Verification:** Delegate deep contract lookups or schema searches to read-only `research` subagents.
- **Independent Verification:** Run background checks (e.g. background test suites) without blocking immediate turn progress.
- **Conflict Prevention:** Never parallelize tasks that modify the same source files or depend on unfinalized architectural decisions.
- **Clear Ownership:** Keep active implementation in the primary workspace session with atomic git discipline.

---

## 5. Model Selection Policy

- **Complex & High-Impact Tasks:** Use the highest capability model (`pro` / inherit) for architectural design, concurrency conflict resolution, security models, contract alignment, and complex multi-view state synchronization.
- **Routine & Well-Bounded Tasks:** Use fast, lightweight models (`flash`, `flash_lite`) for simple lint checks, high-volume repetitive formatting, or straightforward lookups.
- Avoid wasting heavy reasoning overhead on trivial operations.

---

## 6. Canonical Engineering Workflow (The 7-Step Cycle)

Substantial engineering tasks must execute through the following seven steps:

1. **PLAN:** Inspect repository status, git baseline, contracts, and architecture. Produce a concrete implementation plan.
2. **GRILL:** Interrogate edge cases, race conditions, permission nuances, contract drift, and mobile/a11y constraints before writing code.
3. **IMPLEMENT:** Execute code modifications with high precision, maintaining clean separation of concerns and existing comments.
4. **TEST:** Run focused unit and integration tests immediately after implementation.
5. **REVIEW:** Conduct diff inspections for contract fidelity, accessibility compliance, query cache boundaries, and mock-import isolation.
6. **LOCK:** Run all mandatory quality gates:
   - `pnpm validate:docs`
   - `pnpm typegen:check`
   - `pnpm -r run typecheck`
   - `pnpm -r run test`
   - `pnpm build`
   - `git diff --check`
7. **NEXT:** Open PR, verify CI checks, squash-merge to `develop`, clean local/remote branches, run post-merge sanity tests, and stop strictly at the stage boundary.

---

## 7. Sonder-Specific Safeguards

All automatic tooling behavior is strictly bounded by Sonder's project governance:
- **Contract Authority:** Master Specification v1.5.0, Decision Register, and `openapi.yaml` (0.3.20-draft) always take precedence over assumptions.
- **No Schema Invention:** Never invent query filters, sorting fields, routes, or mutation parameters not defined in OpenAPI.
- **Authoritative Security:** The backend is authoritative for authorization, status transitions, and placement. Client-side `effectivePermissions` are presentation hints only.
- **Idempotency & CSRF:** Always supply required CSRF tokens and UUIDv7 `X-Mutation-Id` headers for mutations.
- **Zero Mock Imports in Production:** Production task modules must never import mock fixtures or test data.
- **Mock vs. Runtime Honesty:** Clearly distinguish contract-faithful MSW testing from live backend runtime proof in all reports.

---

## 8. Efficiency Requirements

Tool usage must enhance productivity without introducing bloat:
- Prefer installed tools and skills over manual approximations.
- Avoid duplicate executions of identical checks when outputs remain valid.
- Run focused tests during iterative development; execute full-suite gates before delivery.
- Use browser automation tools (Playwright / Chrome DevTools MCP) for true interactive verification.
- Clearly report tools used and identify any missing or gated capabilities.

---

## 9. Integration Checklist for Future Tasks

At the start of every future stage:
1. Re-read this rule file (`.agents/rules/sonder-tooling-autoselect.md`).
2. Run discovery to record active tools, skills, and MCP servers.
3. Integrate appropriate tools into the stage plan.
4. Execute with automatic tool assistance.
5. Summarize tool discoveries and usage in the final delivery report.
