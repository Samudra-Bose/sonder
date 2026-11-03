# UX & Accessibility Rules

- Responsive Design: Mobile and desktop are first-class. Touch targets >= 44x44px on mobile viewports.
- Design System: Always use CSS semantic variables from `apps/web/src/index.css` (`--surface-*`, `--text-*`, `--brand-*`).
- WCAG 2.1 AA: Accessible names on interactive elements, correct label-in-name alignment, proper contrast ratios, keyboard navigable focus rings.
- Interaction Quality: Drawers and modals must manage focus properly, restore focus upon dismissal, and support Escape key dismissal.
