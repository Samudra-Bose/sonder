# UX Architecture and Four-View Behavior

**Baseline:** v1.5.0 · **API:** 0.3.20-draft (not frozen)



# 7. UX, interaction and visual requirements

## 7.1 Persistent application shell

- Left navigation rail on desktop, collapsible and optimized for fast workspace switching.
- Global navigation: Omnibar, Quick Create, My Work, Inbox, Workspace Switcher, Saved Views, Trash/Recovery and User Preferences.
- Active Workspace navigation: four views and Workspace settings; no Projects/Lists accordion.
- Community administration appears only to authorized Community Admins.
- Main canvas remains visible while task details open in a right-side Task Peek Drawer on desktop and a full-height bottom sheet/full-screen view on mobile.
- Task details deep-link to the current task key/ID without losing view context.

## 7.2 Progressive disclosure layers

1. **Daily work:** task quick-create, inline status/priority/assignee/date controls, saved-view access and filter chips.
2. **View tuning:** grouping, sorting, card properties, column visibility and view-specific preferences.
3. **Governance:** role matrix, custom fields, status configuration, hierarchy, key namespace and security settings inside the six settings categories.

Do not put the entire permission matrix or custom-field editor into the daily task view.

## 7.3 Responsive and mobile behavior

- Desktop should optimize density and keyboard productivity.
- Tablet should preserve the current view model with compact navigation and touch controls.
- Mobile should feel like a coherent app: bottom navigation or compact shell, task creation/update flows, stage switcher for Board, list row cards, calendar agenda and simplified timeline representation.
- Core flows required on mobile at launch: sign in, workspace switch, My Work, create task, status update, comment, mention, task inspection and notification handling.
- Touch targets should generally be at least 44×44 CSS px for primary mobile controls; no critical operation may require drag-and-drop.

## 7.4 Accessibility and interaction states

Target WCAG 2.2 Level AA. Provide semantic headings/landmarks, visible focus, accessible dialogs/menus/popovers, focus restoration after close, keyboard-only paths, status/priority text in addition to color, and no drag-only interactions. Complex grids use predictable roving focus. Shortcuts are suppressible and must not hijack typing in inputs. Every major view/component has loading, empty, error, populated, disabled/permission-limited and offline/stale states as applicable.

## 7.5 Safe interaction patterns

- Optimistic local rendering should be responsive but reconciled with server response.
- On conflict, preserve the user's local draft and show a clear conflict resolution path; never silently overwrite.
- Destructive changes need confirmation when impact is broad or irreversible; routine reversible actions can use an undo pattern if the backend supports it.
- Shared View modifications remain local until explicitly committed.
- Permission denials explain what role or setting controls the action without disclosing hidden data.

---


---

## 6.3 Four synchronized views — all required at launch

All projections use the same query membership and authorization rules. Projection changes only response/presentation shape, not the set of accessible tasks.

### List

- Dense desktop tree/grid layout with expandable subtasks and inline property editing.
- Keyboard accessible row navigation and expansion.
- Fast inline creation and multi-select foundation.
- Touch row targets expand to suitable mobile size.

### Board

- Workflow status columns; optional backlog tray.
- Cards show key, title, status, priority, due date, assignee and subtask progress as configurable display options.
- Reorder/status changes supported by pointer and non-drag alternatives (menu or keyboard reorder).
- Mobile adapts to a stage/status switcher instead of forcing a wide desktop board.

### Calendar

- Month/week/agenda-like windows; tasks displayed by due date or start–due span.
- Unscheduled tray displays matching undated tasks and makes them schedulable without hiding them.
- Date editing works by keyboard/menu as well as drag interactions.

### Timeline

- Split view: task hierarchy table plus horizontal time axis.
- Day/week/month/quarter zoom where practical.
- Draw date spans and dependency relationships; show conflicts when a non-completed blocker finishes later than its dependent task begins.
- All edits remain possible without dragging timeline bars.


---

## 6.4 Canonical query and view state

One canonical `ViewQuerySpec` defines filters, sorting, grouping, subtask inclusion and date window. The frontend serializes transient filters into URL/local navigation state. Saved view query specification is stored separately from display options/projection. A changed filter/sort on a Shared View is local until an explicit save/update action. A user can save a Personal View without changing the Shared View. Shared view update rights are role/capability controlled.

Task query snapshots use the CR-15 fixed 900-second cursor policy. Realtime updates newer than the snapshot watermark invalidate or refresh the active projection without mixing incompatible membership snapshots. List/Calendar/Timeline task limits and Board per-group limits must follow the latest CR-15 specification until the post-remediation contract review revises it.


---

## 6.5 Search, omnibar and My Work

- Global omnibar supports task key/current alias, title, and saved-view/workspace discovery.
- All search is permission-aware and intersects current Community/Workspace memberships; never disclose hidden names, keys, counts or metadata.
- My Work aggregates tasks assigned to, created by or watched by the user across accessible Personal and Shared Workspaces.
- Default useful groups: Overdue, Due Today, Upcoming and Unscheduled. Allow filter/sort customization and return-to-workspace navigation.
- Search results and aliases must authorize the current lineage destination before disclosing the task.
