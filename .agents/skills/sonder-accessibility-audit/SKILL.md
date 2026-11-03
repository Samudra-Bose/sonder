---
name: sonder-accessibility-audit
description: >-
  Automated and manual WCAG 2.1 AA accessibility auditing using axe-core, Playwright, and keyboard testing.
  Use when validating accessibility standards, auditing color contrast, checking focus traps, or reporting a11y violations.
---

# Accessibility Auditing & WCAG 2.1 AA Runbook

## 1. Purpose
Ensures web applications and design-system components meet rigorous WCAG 2.1 AA accessibility standards for all users.

## 2. When to Activate
- Performing automated accessibility audits on application routes or components.
- Inspecting interactive dialogs, menus, and drawers for keyboard focus traps and restoration.
- Reviewing color contrast ratios across light and dark theme modes.

## 3. Required Source Documents & Tools
- Playwright Accessibility Spec (`apps/web/e2e/accessibility.spec.ts`).
- Storybook a11y addon (`@storybook/addon-a11y`).
- Deque axe-core rule definitions (WCAG 2.1 A and AA tags).

## 4. Step-by-Step Auditing Process
1. **Automated Axe Scan**:
   - Run `pnpm --filter @sonder/web test:e2e:a11y`.
   - Scan pages with tags `["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]`.
   - Log violations to `apps/web/test-results/axe-accessibility-audit.json`.
2. **Examine Violation Classes**:
   - `label-content-name-mismatch`: Verify interactive buttons/links include visible text in their accessible names.
   - `color-contrast`: Verify text-to-background contrast ratio is >= 4.5:1 (3:1 for large text).
   - `aria-allowed-role` & `aria-required-children`: Verify ARIA semantics on custom widgets.
3. **Keyboard & Focus Navigation**:
   - Tab sequence must be logical and cyclic within open modals/drawers.
   - Escape key must dismiss open overlays and return focus to triggering element.
   - All interactive controls must display a distinct focus ring (`focus-visible:ring-2`).
4. **Report & Remediate**:
   - Fix low-risk isolated issues introduced during current slice.
   - Catalog and document pre-existing application violations in audit records.

## 5. Validation Checklist
- [ ] Automated axe scans run without critical violations.
- [ ] Keyboard navigation operable without a mouse.
- [ ] Focus restored to trigger on drawer/dialog dismissal.
- [ ] No arbitrary suppression of valid axe rules.
- [ ] Audit output saved to ignored filesystem directory.

## 6. Prohibited Actions
- Never disable accessibility rules just to force tests to pass.
- Never rely solely on automated scans without considering manual keyboard/screen reader workflows.
