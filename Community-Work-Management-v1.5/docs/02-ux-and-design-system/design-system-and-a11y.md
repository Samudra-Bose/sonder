# Design System and Accessibility Requirements

**Baseline:** v1.5.0 · **API:** 0.3.20-draft (not frozen)

The source decisions specify UX/accessibility principles, not a finalized brand palette. Do not invent color tokens or visual identity as approved facts.

## 7.2 Progressive disclosure layers

1. **Daily work:** task quick-create, inline status/priority/assignee/date controls, saved-view access and filter chips.
2. **View tuning:** grouping, sorting, card properties, column visibility and view-specific preferences.
3. **Governance:** role matrix, custom fields, status configuration, hierarchy, key namespace and security settings inside the six settings categories.

Do not put the entire permission matrix or custom-field editor into the daily task view.


---

## 7.3 Responsive and mobile behavior

- Desktop should optimize density and keyboard productivity.
- Tablet should preserve the current view model with compact navigation and touch controls.
- Mobile should feel like a coherent app: bottom navigation or compact shell, task creation/update flows, stage switcher for Board, list row cards, calendar agenda and simplified timeline representation.
- Core flows required on mobile at launch: sign in, workspace switch, My Work, create task, status update, comment, mention, task inspection and notification handling.
- Touch targets should generally be at least 44×44 CSS px for primary mobile controls; no critical operation may require drag-and-drop.


---

## 7.4 Accessibility and interaction states

Target WCAG 2.2 Level AA. Provide semantic headings/landmarks, visible focus, accessible dialogs/menus/popovers, focus restoration after close, keyboard-only paths, status/priority text in addition to color, and no drag-only interactions. Complex grids use predictable roving focus. Shortcuts are suppressible and must not hijack typing in inputs. Every major view/component has loading, empty, error, populated, disabled/permission-limited and offline/stale states as applicable.


---

## 7.5 Safe interaction patterns

- Optimistic local rendering should be responsive but reconciled with server response.
- On conflict, preserve the user's local draft and show a clear conflict resolution path; never silently overwrite.
- Destructive changes need confirmation when impact is broad or irreversible; routine reversible actions can use an undo pattern if the backend supports it.
- Shared View modifications remain local until explicitly committed.
- Permission denials explain what role or setting controls the action without disclosing hidden data.

---
