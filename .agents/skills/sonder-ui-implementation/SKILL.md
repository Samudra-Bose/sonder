---
name: sonder-ui-implementation
description: >-
  Design-system component implementation and UI development runbook using React, Tailwind CSS, Base UI, and Storybook.
  Use when creating or refactoring UI primitives, building view layouts, adding stories, or ensuring theme parity.
---

# UI & Design System Implementation Runbook

## 1. Purpose

Provides actionable guidance for constructing accessible, token-driven UI components and views with React, Tailwind CSS v4, Base UI, and Storybook.

## 2. When to Activate

- Developing new reusable UI primitives (buttons, inputs, dialogs, dropdowns, etc.).
- Implementing application shell views, sidebars, navigation headers, or drawers.
- Adding Storybook stories and theme variants for existing components.

## 3. Required Source Documents

- Frontend Experience Research & Token Architecture (`docs/04-implementation/frontend-experience-research.md`).
- Semantic Theme Tokens (`apps/web/src/index.css`).
- Shared Component Catalog (`apps/web/src/components/ui/index.ts`).

## 4. Step-by-Step Implementation Process

1. **Token First**:
   - Inspect required colors and surfaces.
   - Use semantic CSS variables (`var(--surface-card)`, `var(--brand-accent-btn-bg)`).
   - Never hardcode raw hex values or non-semantic Tailwind utility classes.
2. **Accessible Base UI Foundation**:
   - Use Base UI primitives (`@base-ui/react`) for complex interaction states (dialogs, menus, tabs, tooltips).
   - Ensure forwardRef and displayName are provided.
   - Ensure `aria-label` matches visible text per WCAG 2.5.3 (Label in Name).
3. **Responsive & Mobile Viewport**:
   - Ensure touch targets meet minimum 44×44px on mobile (`touch-manipulation`).
   - Implement drawer sheets that trap focus and restore focus on dismiss.
4. **Storybook Story Creation**:
   - Create `<Component>.stories.tsx` showcasing Default, Disabled, Loading, Error, and variant states.
   - Test both Light and Dark theme modes in Storybook toolbar.
5. **Component Tests**:
   - Write Vitest tests covering rendering, user events, accessibility roles, and keyboard interactions.

## 5. Validation Checklist

- [ ] No hardcoded hex color values.
- [ ] Semantic tokens used for both light and dark modes.
- [ ] Accessible name provided and aligned with visible text.
- [ ] Touch targets >= 44×44px on mobile viewports.
- [ ] Storybook story created and builds cleanly (`pnpm build-storybook`).
- [ ] Component unit tests pass (`pnpm test`).

## 6. Prohibited Actions

- Never introduce Radix UI dependencies; use Base UI.
- Never use non-semantic ad-hoc colors.
- Never create UI components that directly import feature business modules.
