# SONDER — AGENT OPERATIONAL RULES & INVARIANTS

This repository is **Sonder**, a community-oriented work management platform built strictly to canonical specifications and decision-register approvals.

---

## 1. PRODUCT INVARIANTS

1. **Canonical Hierarchy**:
   - `Community` → `Workspace` → `Task` → `Subtask` (maximum subtask depth: 1–2 levels).
   - There is NO `Project` or `List` container entity. Never introduce a `Project` entity or API route.
2. **Synchronized Projections**:
   - `List`, `Board`, `Calendar`, and `Timeline` are synchronized view projections of the identical task dataset, not separate entity containers.
3. **Canonical Authority**:
   - The specifications in `Community-Work-Management-v1.5/` and the approved decision register are the authoritative source of truth.
   - Do not independently invent requirements, data models, or silently resolve open decisions (e.g. DEC-OPEN-03 through DEC-OPEN-14).
4. **Community Scoping**:
   - Tasks receive community-unique identifier prefixes (e.g. `FE-101`) managed through the community prefix registry.

---

## 2. ARCHITECTURE INVARIANTS

1. **Frontend-Only Responsibility**:
   - Antigravity owns frontend applications (`apps/web`) and client-side contracts.
   - The backend service is owned by the backend engineering team.
2. **Contract Compliance**:
   - All frontend communication must strictly adhere to the OpenAPI specification (`packages/contracts/src/api-types.ts`) and WebSocket schemas (`packages/contracts/src/ws-*-types.ts`).
   - Do not invent backend endpoints, adjust payload fields, or alter contract semantics without joint sign-off.
3. **Deterministic Mocking**:
   - In development and component testing, use MSW (Mock Service Worker) handlers matching canonical schema contracts.
   - Mock data must be deterministic and mirror OpenAPI DTO structures.

---

## 3. SECURITY & PRIVACY INVARIANTS

1. **Authoritative Backend**:
   - All authorization and permission enforcement occurs on the server. Frontend permission flags are presentation hints only.
2. **Personal Workspace Privacy**:
   - Personal workspaces are private to their owner. Community administrators do not possess administrative access to personal workspaces without explicit owner delegation.
3. **Metadata Protection**:
   - Never expose hidden task or workspace metadata in client state or DOM elements.
   - Preserve task-key alias authorization and fail-closed CSRF protections.
4. **Credential Safety**:
   - Never store API keys, tokens, session secrets, or personal browsing data in Git, prompts, or scripts.

---

## 4. UX & DESIGN-SYSTEM INVARIANTS

1. **First-Class Mobile**:
   - Mobile and desktop are equal citizens. Minimum 44×44px touch targets on interactive controls.
   - Responsive drawers and sheets must trap focus and return focus to triggering elements on dismissal.
2. **Cognitive Clarity**:
   - Recognition over recall; progressive disclosure of complex settings.
   - Avoid generic, bloated dashboard templates or decorative complexity.
3. **Accessible Foundations**:
   - Full WCAG 2.1 AA compliance: accessible names for all interactive controls, proper color contrast, keyboard navigable routes, and accessible alternatives to drag-and-drop.
4. **Token Consistency**:
   - Use semantic CSS design tokens defined in `apps/web/src/index.css` (e.g., `var(--surface-card)`, `var(--brand-accent-btn-bg)`). Never hardcode ad-hoc hex colors in components.

---

## 5. ENGINEERING INVARIANTS

1. **Consult Current Documentation**:
   - Always query Context7 MCP or official docs before using unfamiliar or updated library APIs.
2. **Verify Before Claiming**:
   - Never report a test, build, or validation has passed without executing the command in the shell and observing the exit code.
3. **Quality Gates**:
   - Before submitting changes:
     - `pnpm validate:docs`
     - `pnpm typegen:check`
     - `pnpm typecheck`
     - `pnpm test`
     - `pnpm --filter @sonder/web build`
     - `pnpm depcruise`
4. **Branch & PR Discipline**:
   - All work happens on dedicated feature/chore branches targeting `develop`. Never push directly to `develop` or `main`.
