---
name: sonder-playwright-qa
description: >-
  End-to-end browser automation, functional testing, and runtime debugging with Playwright and Chrome DevTools.
  Use when writing Playwright specs, verifying multi-viewport workflows, running E2E suites, or debugging console/network issues.
---

# Playwright E2E QA & Browser Debugging Runbook

## 1. Purpose

Guides the creation, execution, and debugging of browser-based end-to-end functional tests across desktop and mobile form factors.

## 2. When to Activate

- Creating functional test coverage for user flows (login, register, navigation, triage).
- Verifying cross-device responsive behavior (Desktop Chrome vs. Mobile Chrome).
- Diagnosing runtime console exceptions or failed network requests in the browser.

## 3. Required Source Documents & Tools

- Playwright Configuration (`apps/web/playwright.config.ts`).
- E2E Test Suite (`apps/web/e2e/`).
- Chrome DevTools MCP and Playwright browser binaries.

## 4. Step-by-Step QA Process

1. **Define Test Scenarios**:
   - Focus on end-user journeys: navigation, session transitions, modal drawers, and data entry.
   - Use role-based locators (`getByRole`, `getByLabel`, `getByText`) over CSS selectors.
2. **Execute Cross-Viewport Runs**:
   - Test on Desktop (`chromium` project, 1280×720).
   - Test on Mobile (`mobile-chrome` project, Pixel 7 viewport).
3. **Capture Diagnostics on Failure**:
   - Inspect trace logs, page snapshots, and console error reports in `test-results/`.
   - Use Chrome DevTools MCP to evaluate runtime errors and network requests.
4. **Deterministic Mocking**:
   - Ensure tests run with MSW browser worker enabled (`pnpm dev`) for predictable backend responses.
5. **Verify Assertions**:
   - Run `pnpm test:e2e` to confirm all assertions pass cleanly without flaky sleeps.

## 5. Validation Checklist

- [ ] Role-based locators used instead of brittle DOM paths.
- [ ] Mobile navigation drawer tested specifically on mobile viewport.
- [ ] Tests execute without timing out (30s default).
- [ ] No hardcoded passwords or authentication tokens in spec files.
- [ ] Test artifacts placed in ignored `test-results/` directory.

## 6. Prohibited Actions

- Never commit test screenshots, traces, or videos to Git.
- Never use arbitrary `sleep` timeouts; use Playwright web-first assertions.
