# Sonder Developer Tooling Foundation

This document details the complete developer tooling infrastructure installed and configured across all four phases for the Sonder platform, supporting documentation accuracy, browser diagnostics, accessibility auditing, component-driven development, architectural enforcement, dependency hygiene, and Antigravity multi-agent intelligence.

---

## 1. Tooling Architecture Matrix

| Tool | Purpose | Installation Scope | Config File / Path | Command to Run | Verification Command | CI Integration | Auth / External Requirements |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Context7 MCP** | Up-to-date documentation retrieval for React 19, Vite, Tailwind v4, Base UI, etc. | User-Global (`~/.gemini/config/`) | `~/.gemini/config/mcp_config.json` | Managed by Language Server | MCP inspection in Antigravity | Local / Agent turns | Optional API key for higher rate limits |
| **Chrome DevTools MCP** | Runtime console error detection, network inspection, and rendering diagnostics | User-Global (`~/.gemini/config/`) | `~/.gemini/config/mcp_config.json` | Managed by Language Server | MCP inspection in Antigravity | Local / Agent turns | None (local Chrome instance) |
| **Playwright Test** | End-to-end browser functional testing | Frontend Workspace (`apps/web`) | `apps/web/playwright.config.ts` | `pnpm test:e2e` | `pnpm --filter @sonder/web test:e2e` | Optional CI job | None (Chromium binaries) |
| **axe-core Playwright** | Automated WCAG 2.1 AA accessibility auditing across desktop & mobile | Frontend Workspace (`apps/web`) | `apps/web/e2e/accessibility.spec.ts` | `pnpm test:e2e:a11y` | `pnpm --filter @sonder/web test:e2e:a11y` | Optional CI gate | None |
| **Prettier** | Code formatting enforcement without modifying canonical specs | Monorepo Root (`/`) | `.prettierrc`, `.prettierignore` | `pnpm format:check` | `pnpm format:check` | Pre-commit / CI gate | None |
| **Storybook 10** | Isolated UI component development and design-system catalog | Frontend Workspace (`apps/web`) | `apps/web/.storybook/main.ts`, `preview.tsx` | `pnpm storybook` | `pnpm build-storybook` | Static artifact build | None |
| **Storybook a11y Addon** | Live visual accessibility panel in Storybook for component states | Frontend Workspace (`apps/web`) | `apps/web/.storybook/main.ts` | `pnpm storybook` | In-browser a11y panel | None | None |
| **Lighthouse CI** | Performance, accessibility, best practices & SEO baseline measurement | Monorepo Root (`/`) | `lighthouserc.cjs` | `pnpm lhci:mobile` | `pnpm lhci:mobile` | Non-blocking CI artifact | None (local filesystem output) |
| **Knip** | Unused file, dependency, export, and script detection across workspaces | Monorepo Root (`/`) | `knip.jsonc` | `pnpm knip` | `pnpm knip` | Advisory CI check | None |
| **dependency-cruiser** | Architecture boundary enforcement (cycles, contract leakage, UI purity) | Monorepo Root (`/`) | `.dependency-cruiser.cjs` | `pnpm depcruise` | `pnpm depcruise` | Pre-commit & CI gate | None |
| **Rollup Visualizer** | Production bundle analysis and chunk visualization | Frontend Workspace (`apps/web`) | `apps/web/vite.config.ts` | `pnpm analyze` | `pnpm analyze` | On-demand local report | None (generated in `.artifacts/`) |
| **Renovate** | Automated dependency upgrade management with conservative defaults | GitHub Repository (`.github/`) | `.github/renovate.json` | Background bot | Renovate schema validator | GitHub App webhook | Requires user GitHub App authorization |
| **Agent Rules** | Invariant enforcement for Product, Architecture, Security, UX & Engineering | Workspace Root (`/`) | `GEMINI.md`, `.agents/rules/*.md` | Always-on during agent sessions | Read by Antigravity engine | Monorepo documentation | None |
| **Specialized Agents** | Defined roles: Analyst, UI/UX, Frontend, QA/A11y, Architecture Reviewer | Workspace & Global Session | `.agents/agents/*.md`, `define_subagent` | `invoke_subagent` | Subagent list in session | Agent pair-programming | None |
| **Specialized Skills** | 6 operational runbooks for planning, UI, QA, a11y, architecture, release | Workspace (`.agents/skills/`) & Global (`~/.gemini/config/skills/`) | `SKILL.md` in skill folders | Agent activation | Discovery in Antigravity | Pair-programming workflows | None |
| **Lifecycle Hooks** | Pre-tool command safety guards and session status reminders | Workspace Root (`.agents/`) | `.agents/hooks/hooks.json` | Triggered by agent events | Script execution test | Agent execution loop | None |

---

## 2. Detailed Tool Descriptions & Verification

### 2.1 Context7 & Chrome DevTools MCP Servers
- **Location**: `~/.gemini/config/mcp_config.json`
- **Scope**: Machine-global across all Antigravity projects.
- **Commands**:
  - `context7`: `npx -y --silent @upstash/context7-mcp@latest` (Stdio transport).
  - `chrome-devtools`: `npx -y --silent chrome-devtools-mcp@latest --headless` (Stdio transport).
- **Safety**: No browser user profile or saved credentials are leaked. Headless mode by default.

### 2.2 Playwright & axe-core Accessibility Integration
- **Location**: `apps/web/playwright.config.ts`, `apps/web/e2e/accessibility.spec.ts`
- **Scope**: Frontend workspace (`@sonder/web`).
- **Features**:
  - Projects for `chromium` (desktop) and `mobile-chrome` (Pixel 7).
  - Automatically spins up Vite dev server on `http://localhost:3000` with MSW development mocking.
  - Audits `/`, `/my-work`, `/inbox`, `/login`, `/register`, and open mobile navigation drawer against WCAG 2.1 AA.
  - Generates detailed violation audit report to `apps/web/test-results/axe-accessibility-audit.json`.
- **Run command**:
  ```bash
  pnpm test:e2e
  pnpm test:e2e:a11y
  ```

### 2.3 Storybook & Addons
- **Location**: `apps/web/.storybook/`
- **Scope**: Frontend workspace (`@sonder/web`).
- **Stories Created**:
  - `Button`, `IconButton`, `Input`, `SearchInput`, `Badge`, `Avatar`, `Tooltip`, `DropdownMenu`, `Dialog`, `Popover`, `Tabs`, `Skeleton`, `EmptyState`, `Card`, `Feedback`.
- **Features**:
  - Real Sonder components with semantic tokens.
  - Theme switcher toolbar (Light / Dark) applying `.dark` class to document root.
  - Embedded `@storybook/addon-a11y` checking contrast and ARIA conformance.
- **Run & Build commands**:
  ```bash
  pnpm storybook          # Starts dev server on port 6006
  pnpm build-storybook    # Builds static assets to storybook-static/
  ```

### 2.4 Lighthouse CI Baseline
- **Location**: `lighthouserc.cjs`
- **Scope**: Monorepo root.
- **Measured Routes**: `/`, `/my-work`, `/inbox` on production preview (`pnpm preview --port 4173`).
- **Storage**: Local filesystem (`.lighthouseci/`); no public cloud uploading.
- **Baseline Scores**:
  - Dashboard (`/`): Performance 96, Accessibility 98, Best Practices 100, SEO 82.
  - My Work (`/my-work`): Performance 97, Accessibility 95, Best Practices 100, SEO 82.
  - Inbox (`/inbox`): Performance 97, Accessibility 98, Best Practices 100, SEO 82.
- **Run command**:
  ```bash
  pnpm lhci:mobile
  ```

### 2.5 Knip Unused Dependency & Code Detection
- **Location**: `knip.jsonc`
- **Scope**: Monorepo root configured for pnpm workspaces.
- **Features**:
  - Configured entry points for `@sonder/web` and `@sonder/contracts`.
  - Excludes generated contract types (`api-types.ts`, `ws-*-types.ts`).
  - Identifies dead files, unused devDependencies, and duplicate exports without destructive automatic deletion.
- **Run command**:
  ```bash
  pnpm knip
  ```

### 2.6 dependency-cruiser Architecture Enforcement
- **Location**: `.dependency-cruiser.cjs`
- **Scope**: Monorepo root.
- **Enforced Rules**:
  - `no-circular`: Forbids cyclic dependencies between source modules.
  - `no-contracts-importing-apps`: Prevents shared contracts from depending on application code.
  - `ui-primitive-purity`: Ensures design system primitives do not import business feature modules.
  - `no-mock-leakage-in-features`: Forbids production modules from importing MSW mock definitions.
- **Run command**:
  ```bash
  pnpm depcruise
  ```

### 2.7 Bundle Visualization
- **Location**: `apps/web/vite.config.ts` (`rollup-plugin-visualizer`)
- **Scope**: Frontend workspace (`@sonder/web`).
- **Behavior**:
  - Active ONLY when `process.env.ANALYZE === "true"`. Normal builds remain lightweight.
  - Writes interactive treemap report to `.artifacts/bundle-stats.html` (git-ignored).
- **Run command**:
  ```bash
  pnpm analyze
  ```

### 2.8 Renovate Configuration
- **Location**: `.github/renovate.json`
- **Scope**: GitHub repository.
- **Policy**:
  - Conservative preset: automerge disabled, major upgrades separated, dev dependencies grouped.
  - Rate-limited to 2 PRs per hour, max 5 concurrent PRs, scheduled for Monday morning UTC.
- **External Action**: Requires repository owner to authorize the [Renovate GitHub App](https://github.com/apps/renovate).

### 2.9 Antigravity Agent Intelligence (Workspace & Global)
- **Rules**:
  - `GEMINI.md`: Authoritative repository invariants covering Product, Architecture, Security, UX, and Engineering.
  - `.agents/rules/`: Modular rule files for progressive disclosure.
- **Specialized Agents**:
  - `Product and Requirements Analyst`: Read-only canonical specification analysis.
  - `UI/UX and Design-System Engineer`: Storybook, responsive design, and token consistency.
  - `Frontend Implementation Engineer`: React 19 / TypeScript 5 implementation with MSW mocks.
  - `Playwright QA and Accessibility Engineer`: End-to-end tests and axe WCAG audits.
  - `Architecture and Security Reviewer`: Read-only security and package boundary audits.
- **Specialized Skills**:
  - Reusable runbooks installed both in `.agents/skills/` and machine-global in `~/.gemini/config/skills/` for use in any project:
    - `sonder-feature-planning`
    - `sonder-ui-implementation`
    - `sonder-playwright-qa`
    - `sonder-accessibility-audit`
    - `sonder-architecture-review`
    - `sonder-pr-release-review`
- **Lifecycle Hooks**:
  - `.agents/hooks/hooks.json`
  - `safety-guard`: Blocks destructive git operations (`git push --force`, `git reset --hard`).
  - `session-reminder`: Reminds the agent of active invariants upon session start.
- **Workflow Guide**:
  - `.agents/WORKFLOWS.md`: Documents sequential handoffs and concurrency guardrails.

---

## 3. Known Limitations & Pre-Existing Observations

1. **Axe WCAG 2.5.3 (Label in Name) Findings**:
   - Automated axe-core testing identified pre-existing `label-content-name-mismatch` occurrences in VS-02B components (e.g. user menu avatar button containing visible text "AM" with `aria-label="Open user menu"`, and home link containing visible text "Sonder" with `aria-label="Sonder Home"`). Per prompt rules, these pre-existing findings are preserved and cataloged in `apps/web/test-results/axe-accessibility-audit.json` for remediation in dedicated feature iterations.
2. **Renovate GitHub App Activation**:
   - The Renovate configuration is committed and schema-validated, but automated dependency PRs will not begin until the repository owner installs and grants access to the Renovate GitHub App.
3. **Headless Chrome in CI**:
   - Lighthouse CI and Playwright tests require Chromium binaries installed in the environment. In GitHub Actions, ensure `pnpm exec playwright install --with-deps chromium` is executed if browser tests are added to CI.
