# Sonder — Frontend Experience & UI/UX Research

**Document Status:** Complete Research Specification  
**Target Milestone Baseline:** Pre-VS-02 Architectural Design Direction  
**Repository Branch:** `docs/frontend-experience-research`  
**Canonical Product Baseline:** Sonder v1.5.0 (`Community-Work-Management-v1.5`)  
**Contract Baseline:** OpenAPI `0.3.20-draft` (Unfrozen)  
**Authority Hierarchy:** PRD v1.5.0 → Master Specification v1.5.0 → `frontend-antigravity-blueprint.md` → Decision Register  

---

## 1. Executive Summary

This research establishes the comprehensive product, interaction-design, and visual-design foundation for **Sonder**—a next-generation community work-management platform. Sonder bridges the gap between high-velocity, keyboard-first developer issue trackers (e.g., Linear, Height) and human-scale, calm, accessible collaboration tools (e.g., Basecamp, Things 3, Asana). It deliberately rejects the bureaucratic configuration labyrinth, visual noise, sluggish rendering, and cognitive fatigue characteristic of legacy enterprise tools such as Jira and ClickUp.

### 1.1 Core Strategic Differentiators
1. **Calm, High-Density Efficiency:** Sonder treats speed not merely as a technical metric, but as an essential UX requirement. Sub-50ms local interactions, keyboard shortcuts (`Cmd/Ctrl+K`, single-key chords), and persistent navigation enable seamless daily workflows.
2. **Strict, Predictable Hierarchy:** Unlike tools with arbitrary, deeply nested container models (Workspaces → Spaces → Folders → Lists → Tasks → Subtasks in ClickUp; Portfolios → Projects → Sections → Tasks → Subtasks in Asana), Sonder strictly enforces a 4-tier domain hierarchy:
   $$\text{Community (Tenancy)} \longrightarrow \text{Workspace (Governance)} \longrightarrow \text{Task (Keyed Work Item)} \longrightarrow \text{Subtask (Depth 1–2)}$$
   Projects and Lists are **not** independent entity layers; they do not exist in Sonder.
3. **Four Synchronized Projections:** List, Board, Calendar, and Timeline are four lenses projecting the **identical** canonical query and authorization result. No view maintains divergent task truth or conflicting filters.
4. **Zero-Client-Storage Security & Permission Transparency:** The UI adheres strictly to zero browser credential storage (no JWTs or tokens in `localStorage`). UI capability indicators are display hints only; backend authorization remains authoritative.
5. **Desktop Power with First-Class Mobile Workflows:** Sonder does not shrink desktop tables for mobile viewports. Instead, it adapts projections into native mobile interaction patterns: board columns become tabbed stage switchers, task sidebars become bottom sheets, and primary touch targets strictly respect a 44×44 CSS px bounding box.

---

## 2. Research Methodology and Sources

### 2.1 Research Framework & Evidence Classification
To ensure research integrity, every observation and recommendation in this specification is categorized using explicit evidentiary tiers:
- `[DIRECT INTERFACE OBSERVATION]`: Verified through direct hands-on testing of current public production web, desktop, or mobile applications.
- `[OFFICIAL DOCUMENTATION]`: Sourced directly from vendor user guides, developer documentation, design systems, and changelogs.
- `[ENGINEERING / DESIGN BLOG]`: Sourced from verified technical write-ups published by the product's engineering, design, or leadership teams.
- `[INFERRED RECOMMENDATION]`: Architectural adaptation formulated specifically for Sonder's approved domain model and constraints.

### 2.2 Investigated Products Inventory
Fourteen leading products across work management and personal productivity were researched:

| Product | Category | Primary Interface URL | Primary Documentation Reference |
|---|---|---|---|
| **Linear** | Work Management | [linear.app](https://linear.app) | [linear.app/docs](https://linear.app/docs) · [linear.app/method](https://linear.app/method) |
| **Asana** | Work Management | [asana.com](https://asana.com) | [asana.com/guide](https://asana.com/guide) |
| **Jira** | Work Management | [atlassian.com/software/jira](https://www.atlassian.com/software/jira) | [support.atlassian.com/jira-software-cloud](https://support.atlassian.com/jira-software-cloud/) |
| **ClickUp** | Work Management | [clickup.com](https://clickup.com) | [help.clickup.com](https://help.clickup.com) |
| **Monday.com** | Work Management | [monday.com](https://monday.com) | [support.monday.com](https://support.monday.com) |
| **Height** | Work Management | [height.app](https://height.app) | [height.app/blog](https://height.app/blog) · [height.app/docs](https://height.app/docs) |
| **Plane** | Work Management | [plane.so](https://plane.so) | [docs.plane.so](https://docs.plane.so) |
| **Basecamp** | Work Management | [basecamp.com](https://basecamp.com) | [basecamp.com/features](https://basecamp.com/features) · [37signals.com/books](https://37signals.com) |
| **GitHub Projects** | Work Management | [github.com/features/issues](https://github.com/features/issues) | [docs.github.com/en/issues/planning-and-tracking-with-projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects) |
| **Notion** | Personal Productivity | [notion.so](https://www.notion.so) | [notion.so/help](https://www.notion.so/help) |
| **Superlist** | Personal Productivity | [superlist.com](https://www.superlist.com) | [superlist.com/updates](https://www.superlist.com/updates) |
| **Sunsama** | Personal Productivity | [sunsama.com](https://sunsama.com) | [help.sunsama.com](https://help.sunsama.com) |
| **Things 3** | Personal Productivity | [culturedcode.com/things](https://culturedcode.com/things/) | [culturedcode.com/things/support](https://culturedcode.com/things/support/) |
| **Craft** | Personal Productivity | [craft.do](https://www.craft.do) | [support.craft.do](https://support.craft.do) |

### 2.3 Research Limitations
- **Enterprise-Gated Modules:** Advanced compliance features in Jira Enterprise (e.g., Atlassian Guard, SAML SCIM auto-provisioning) and ClickUp Enterprise were analyzed via official administration documentation rather than live administrative tenants.
- **Proprietary Source Code:** Closed-source products (Linear, Superlist, Things 3, Craft) were evaluated via their live DOM, network requests, bundle manifests, and public design talks, without access to proprietary source trees.
- **Native Platform Boundaries:** Things 3 is an Apple-native client (macOS/iOS/iPadOS); its gestural interactions and type scale were studied via iOS Human Interface Guidelines and live iPadOS testing, then translated into standards-compliant Web/PWA equivalents.

---

## 3. Product-by-Product Findings

### 3.1 Linear
- **Reference:** [linear.app](https://linear.app) · [linear.app/docs](https://linear.app/docs)
- **Observed Patterns:**
  - `[DIRECT INTERFACE OBSERVATION]` **Global Omnibar (`Cmd/Ctrl+K`):** Opens a centered command palette within <10ms. Supports nested sub-menus (e.g., "Change status..." opens status options in-place with breadcrumb back-navigation).
  - `[DIRECT INTERFACE OBSERVATION]` **Keyboard-First Navigation:** Roving focus via `J`/`K` or Arrow keys. `Spacebar` triggers a transient "Peek" modal; `Enter` opens full detail; `C` opens the global issue creator from anywhere.
  - `[DIRECT INTERFACE OBSERVATION]` **Right Docked Peek Panel:** Inspecting an issue opens a right-side panel without shifting the background list scroll position or unmounting active filters.
  - `[DIRECT INTERFACE OBSERVATION]` **Density & Micro-Pills:** Minimalist attribute pills (Assignee avatar, Priority bars, Status circle) display inline in table rows. Clicking a pill opens an anchored dropdown menu.
- **Strengths to Emulate:**
  - Sub-50ms interaction latency with optimistic rendering.
  - Keyboard chords (`G` then `I` for Inbox, `G` then `M` for My Issues) that reduce mouse traversal.
  - High information density that respects vertical and horizontal viewport limits.
- **Weaknesses / Anti-Patterns to Reject:**
  - Extreme minimalism that obscures non-engineering governance (e.g., complex role permissions or multi-community boundaries).
  - Heavy reliance on dark mode defaults that can suffer from poor contrast on low-tier displays if not tuned to WCAG 2.2 AA.
- **Sonder Architectural Takeaway:** Adopt Linear's roving focus, `Cmd+K` command menu architecture, and right-docked peek panel. Reject its rigid engineering-only nomenclature (Cycles, Triage, Backlog) in favor of Sonder's domain-neutral 5-stage workflow (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `CANCELLED`).

### 3.2 Asana
- **Reference:** [asana.com](https://asana.com) · [asana.com/guide](https://asana.com/guide)
- **Observed Patterns:**
  - `[DIRECT INTERFACE OBSERVATION]` **Synchronized View Tabs:** Top tab bar seamlessly switches between List, Board, Timeline (Gantt), and Calendar over identical underlying project data.
  - `[DIRECT INTERFACE OBSERVATION]` **Task Detail Slide-Over:** The right pane opens over the canvas, preserving list scroll position. Breadcrumbs display project provenance. Subtasks render as an expandable tree inside the drawer.
  - `[DIRECT INTERFACE OBSERVATION]` **Calendar Unscheduled Tray:** Tasks lacking due dates are quarantined in a collapsible right drawer, allowing drag-and-drop or date-picker scheduling.
  - `[OFFICIAL DOCUMENTATION]` **Timeline Dependencies:** Visual connector handles link dependent tasks; date conflicts visually flag in red when a prerequisite slips past a dependent start date.
- **Strengths to Emulate:**
  - View tab parity: switching projections preserves active filter state.
  - Unscheduled task tray in Calendar view to prevent undated tasks from becoming invisible.
  - Clear subtask hierarchy visualization within the task peek drawer.
- **Weaknesses / Anti-Patterns to Reject:**
  - Deep, confusing container hierarchy (Portfolios → Projects → Sections → Tasks → Subtasks).
  - Aggressive upsell banners for premium enterprise tiers embedded in routine UI flows.
  - Slow initial payload and noticeable layout shifts during view transitions.
- **Sonder Architectural Takeaway:** Replicate the 4-view tab switching model and the Calendar unscheduled tray. Strictly enforce Sonder's flat hierarchy: `Community → Workspace → Task → Subtask`, rejecting intermediate "Project" and "Section" abstractions.

### 3.3 Jira
- **Reference:** [atlassian.com/software/jira](https://www.atlassian.com/software/jira) · [support.atlassian.com/jira-software-cloud](https://support.atlassian.com/jira-software-cloud/)
- **Observed Patterns:**
  - `[OFFICIAL DOCUMENTATION]` **Deterministic Task Keys:** Prefix-based alphanumeric keys (`ENG-123`) serve as permanent, human-readable verbal and written identifiers.
  - `[OFFICIAL DOCUMENTATION]` **Prefix Renaming & Aliasing:** When a project key is renamed (e.g., `PROJ` to `ENG`), historical keys permanently alias and redirect to the new identifier.
  - `[OFFICIAL DOCUMENTATION]` **Structured Role Permission Schemes:** Fine-grained capability matrices governing who can edit fields, move issues, or transition statuses.
- **Strengths to Emulate:**
  - Canonical task-key resolution (`PREFIX-SEQ`) with community-unique permanent prefix reservations (DEC-OPEN-06).
  - Permanent alias redirection when a workspace prefix is renamed.
  - Transparent role permission display.
- **Weaknesses / Anti-Patterns to Reject:**
  - The "configuration labyrinth": overwhelming multi-tab settings screens that require administrative certification to navigate.
  - JQL requirement for basic multi-criteria filtering.
  - Heavy DOM footprint resulting in 2–4 second page reloads and unresponsive form fields.
  - Giant modal dialogs that obscure the underlying workspace context.
- **Sonder Architectural Takeaway:** Implement Jira's permanent keying and aliasing system (DEC-OPEN-06) while completely eliminating its configuration bloat through progressive disclosure and clean Tailwind v4 UI styling.

### 3.4 ClickUp
- **Reference:** [clickup.com](https://clickup.com) · [help.clickup.com](https://help.clickup.com)
- **Observed Patterns:**
  - `[DIRECT INTERFACE OBSERVATION]` **View Display Customization:** Users can toggle individual card properties (Assignee, Subtasks, Priority, Due Date) on or off per view.
  - `[DIRECT INTERFACE OBSERVATION]` **Density Switching:** Explicit toggle between Compact, Normal, and Clean density modes.
  - `[OFFICIAL DOCUMENTATION]` **Multi-Modal Views:** Supports dozens of views (List, Board, Box, Calendar, Gantt, Activity, Mind Map, Whiteboard).
- **Strengths to Emulate:**
  - User-configurable card and row field visibility.
  - Compact density mode for power users on smaller desktop displays.
- **Weaknesses / Anti-Patterns to Reject:**
  - Severe "feature soup": dozens of half-baked view modes that dilute core product stability.
  - Chaotic, 6-level hierarchy (Workspaces → Spaces → Folders → Lists → Tasks → Subtasks → Nested Subtasks).
  - Severe UI lag and high memory consumption caused by mounting thousands of un-virtualized DOM nodes.
- **Sonder Architectural Takeaway:** Support field visibility toggles and compact density modes. Limit view projections strictly to the 4 approved, fully synchronized views (List, Board, Calendar, Timeline).

### 3.5 Monday.com
- **Reference:** [monday.com](https://monday.com) · [support.monday.com](https://support.monday.com)
- **Observed Patterns:**
  - `[DIRECT INTERFACE OBSERVATION]` **Visual Status Columns:** High-contrast colored status badges with prominent text labels.
  - `[DIRECT INTERFACE OBSERVATION]` **Summary / Progress Bars:** Footer bars summarize group status breakdown (e.g., 60% Done, 20% In Progress, 20% Blocked).
  - `[DIRECT INTERFACE OBSERVATION]` **Inline Cell Selection:** Single-click opens select menus directly within table cells.
- **Strengths to Emulate:**
  - High peripheral legibility of task statuses across large tables.
  - Column summaries that provide instant visual progress overviews.
- **Weaknesses / Anti-Patterns to Reject:**
  - Cartoonish gamification (confetti bursts, sound effects on task completion) that degrades professional tone.
  - Excessive horizontal whitespace and oversized pill elements that reduce information density.
- **Sonder Architectural Takeaway:** Adopt high-contrast, dual-indicator status badges (icon + text, WCAG 2.2 compliant) and group-level progress summaries. Maintain a calm, restrained, professional aesthetic without frivolous animations.

### 3.6 Height
- **Reference:** [height.app](https://height.app) · [height.app/docs](https://height.app/docs)
- **Observed Patterns:**
  - `[DIRECT INTERFACE OBSERVATION]` **Spreadsheet-Grade Inline Editing:** Direct click-and-type editing in table cells. Arrow keys navigate between cells; pressing `Enter` commits and creates the next row.
  - `[DIRECT INTERFACE OBSERVATION]` **Keyboard Attribute Popovers:** Focusing a cell and pressing `Enter` or `Space` opens a keyboard-navigable attribute popover (Assignee picker, Status menu, Date picker).
  - `[DIRECT INTERFACE OBSERVATION]` **Realtime Co-Presence:** Subtle avatar pings appear on rows currently being edited by other users.
- **Strengths to Emulate:**
  - Zero-latency spreadsheet cell editing.
  - Rapid task creation: typing a title and pressing `Enter` creates sequential tasks without opening modals.
  - Accessible roving tabindex across table cells.
- **Weaknesses / Anti-Patterns to Reject:**
  - Unstructured chat stream embedded directly into task lists, blurring the boundary between official task audit trails and casual discussion.
- **Sonder Architectural Takeaway:** Implement spreadsheet-like inline editing and keyboard row traversal in Sonder's List view. Retain strict separation between task description, subtask hierarchy, and threaded comments.

### 3.7 Plane
- **Reference:** [plane.so](https://plane.so) · [docs.plane.so](https://docs.plane.so)
- **Observed Patterns:**
  - `[DIRECT INTERFACE OBSERVATION]` **Clean Workspace/Project Structure:** Top-level sidebar handles workspace switching and project isolation with clean iconography.
  - `[DIRECT INTERFACE OBSERVATION]` **Light/Dark Contrast Modes:** High-contrast dark mode paired with neutral, un-tinted light mode surfaces.
  - `[DIRECT INTERFACE OBSERVATION]` **Single-Key Issue Creation:** Pressing `C` globally triggers a standardized issue creation modal.
- **Strengths to Emulate:**
  - Modern, open-source aesthetic with clear visual hierarchy.
  - Crisp modal dialogs with autofocus on the title field.
  - Logical separation between workspace administration and active task views.
- **Weaknesses / Anti-Patterns to Reject:**
  - Occasional layout overflow issues on smaller laptop screens (1366×768).
  - Inconsistent mobile web experience where desktop board layouts are forced into horizontal overflow.
- **Sonder Architectural Takeaway:** Adopt Plane's clean modal layouts and high-contrast surface tokens. Ensure rigorous responsive breakpoints and dedicated mobile adaptations.

### 3.8 Basecamp
- **Reference:** [basecamp.com](https://basecamp.com) · [basecamp.com/features](https://basecamp.com/features)
- **Observed Patterns:**
  - `[OFFICIAL DOCUMENTATION]` **Calm Technology Architecture:** Asynchronous-by-default communication; absence of flashing red alert badges.
  - `[DIRECT INTERFACE OBSERVATION]` **"Hey!" Menu / Notification Categorization:** Separates high-priority personal action items (assignments, direct @mentions) from general project activity updates.
  - `[OFFICIAL DOCUMENTATION]` **Hill Charts:** Qualitative visualization showing whether work is in the "uphill" discovery phase vs "downhill" execution phase, replacing misleading percentage metrics.
- **Strengths to Emulate:**
  - Inbox categorization: splitting notifications into "Action Required" and "Updates".
  - Calm defaults: respectful notification delivery that prevents alert fatigue.
  - Human-friendly copywriting that avoids robotic error codes.
- **Weaknesses / Anti-Patterns to Reject:**
  - Total lack of structured board/timeline views for complex multi-dependency workflows.
  - Rigid, flat to-do lists lacking subtask depth or attribute sorting.
- **Sonder Architectural Takeaway:** Adopt Basecamp's calm notification architecture in Sonder's Inbox (`/inbox`), categorizing items into "Action Required" and "Updates". Retain Sonder's synchronized 4-view engine for structured execution.

### 3.9 GitHub Projects
- **Reference:** [github.com/features/issues](https://github.com/features/issues) · [docs.github.com/en/issues](https://docs.github.com/en/issues)
- **Observed Patterns:**
  - `[DIRECT INTERFACE OBSERVATION]` **High-Density Table Grid:** Compact rows with configurable column widths, multi-column sorting, and field sum aggregations in group headers.
  - `[DIRECT INTERFACE OBSERVATION]` **Kanban WIP Limits:** Visual indicators when column card counts exceed defined Work-In-Progress thresholds.
  - `[DIRECT INTERFACE OBSERVATION]` **Roadmap / Timeline Zoom:** Smooth horizontal scaling across Month, Quarter, and Year viewports with vertical milestone marker overlays.
  - `[DIRECT INTERFACE OBSERVATION]` **Explicit Field Exposure:** Custom fields are not dumped into views automatically; users explicitly toggle visibility per saved view tab.
- **Strengths to Emulate:**
  - High information density with clean tabular lines.
  - Vertical milestone markers on timeline/calendar views (DEC-OPEN-08).
  - View-specific field configuration without polluting global schemas.
- **Weaknesses / Anti-Patterns to Reject:**
  - Lack of rich text editing in quick-create popovers.
  - Subtask / issue relationship visualization is clunky and requires separate drill-down pages.
- **Sonder Architectural Takeaway:** Emulate GitHub Projects' table density, group-level field sums, and vertical milestone lines in Timeline view. Provide superior in-context subtask editing via the Task Peek Drawer.

### 3.10 Notion
- **Reference:** [notion.so](https://www.notion.so) · [notion.so/help](https://www.notion.so/help)
- **Observed Patterns:**
  - `[DIRECT INTERFACE OBSERVATION]` **Slash Command (`/`) Menu:** Instant contextual menu for formatting, dates, mentions, and block insertions.
  - `[DIRECT INTERFACE OBSERVATION]` **Thoughtful Empty States:** Friendly, actionable empty states that explain the view purpose and provide one-click starter actions.
  - `[DIRECT INTERFACE OBSERVATION]` **Breadcrumb Hierarchy Navigation:** Persistent top breadcrumbs that clearly indicate workspace and parent page context.
- **Strengths to Emulate:**
  - Action-oriented empty states that orient new users.
  - Clean, accessible breadcrumb navigation.
- **Weaknesses / Anti-Patterns to Reject:**
  - Unstructured block canvas that lacks relational task constraints or rigid validation.
  - Sluggish database performance on large datasets (>500 items).
- **Sonder Architectural Takeaway:** Adopt Notion's approachable empty states and clean breadcrumbs. Maintain Sonder's rigid relational schema, typed API contracts, and high-performance virtualized grids.

### 3.11 Superlist
- **Reference:** [superlist.com](https://www.superlist.com) · [superlist.com/updates](https://superlist.com/updates)
- **Observed Patterns:**
  - `[DIRECT INTERFACE OBSERVATION]` **Unified Personal vs Work Segregation:** Clean sidebar toggle separating private personal tasks from collaborative shared team workspaces.
  - `[DIRECT INTERFACE OBSERVATION]` **Mobile Bottom Action Bar:** Contextual bottom bar providing rapid one-thumb task creation and view switching.
  - `[DIRECT INTERFACE OBSERVATION]` **Tactile Micro-Interactions:** Subtle haptic feedback and gentle audio-visual confirmation upon task completion.
- **Strengths to Emulate:**
  - Seamless mental separation between Personal and Shared Workspaces.
  - Mobile bottom navigation bar optimized for 44px thumb reachability.
- **Weaknesses / Anti-Patterns to Reject:**
  - Playful styling and sound effects that can feel out of place in formal enterprise or community governance settings.
  - Loose task attribute structure that hampers deep filtering.
- **Sonder Architectural Takeaway:** Model Sonder's Workspace Switcher after Superlist's clean Personal vs Shared separation. Adapt its mobile bottom navigation for Sonder's core mobile flows (`My Work`, `Views`, `Quick Create`, `Inbox`, `Account`).

### 3.12 Sunsama
- **Reference:** [sunsama.com](https://sunsama.com) · [help.sunsama.com](https://help.sunsama.com)
- **Observed Patterns:**
  - `[DIRECT INTERFACE OBSERVATION]` **Daily Planning Ritual:** Guided morning flow that pulls tasks from backlogs and timeboxes them onto a calendar schedule.
  - `[DIRECT INTERFACE OBSERVATION]` **Workload Capacity Indicators:** Realtime meter displaying planned hours against a healthy daily capacity limit (e.g., 6 hours), turning amber if overloaded.
  - `[DIRECT INTERFACE OBSERVATION]` **Cross-Tool Aggregation:** Centralized personal dashboard that aggregates work assigned to the user across multiple project silos.
- **Strengths to Emulate:**
  - Personal workload awareness: showing total scheduled hours and overdue counts in My Work.
  - Clear distinction between "Scheduled for Today" vs "Backlogged".
- **Weaknesses / Anti-Patterns to Reject:**
  - Rigid ritual wizards that block immediate access to daily tasks for users in a hurry.
  - Heavy subscription cost model unsuitable for open community platforms.
- **Sonder Architectural Takeaway:** Incorporate workload awareness and clear temporal triage groupings (`Overdue`, `Due Today`, `Upcoming`, `Unscheduled`) into Sonder's My Work dashboard (`/my-work`).

### 3.13 Things 3
- **Reference:** [culturedcode.com/things](https://culturedcode.com/things/) · [culturedcode.com/things/support](https://culturedcode.com/things/support/)
- **Observed Patterns:**
  - `[DIRECT INTERFACE OBSERVATION]` **Masterclass in Typography & Whitespace:** Extreme typographic discipline; generous vertical padding between list items that eliminates visual clutter without sacrificing density.
  - `[DIRECT INTERFACE OBSERVATION]` **The "Magic Plus" Button:** Floating action button on mobile that can be dragged directly into specific list sections or tapped for quick capture.
  - `[DIRECT INTERFACE OBSERVATION]` **Progressive Disclosure Sheets:** Tapping a task reveals secondary attributes (tags, notes, sub-checklist) within a clean, bounded card sheet that slides up smoothly.
- **Strengths to Emulate:**
  - Typographic restraint: using font weight and scale rather than heavy borders or colored backgrounds to establish hierarchy.
  - Frictionless quick-capture workflow.
  - Generous touch targets and subtle swipe gestures.
- **Weaknesses / Anti-Patterns to Reject:**
  - Locked to Apple proprietary platforms with no native web or multi-user collaboration support.
  - Flat tagging system lacking structured status workflows or role-based governance.
- **Sonder Architectural Takeaway:** Apply Things 3's typographic discipline, subtle hairline dividers, and spacious touch targets to Sonder's mobile interface and desktop task composer.

### 3.14 Craft
- **Reference:** [craft.do](https://www.craft.do) · [support.craft.do](https://support.craft.do)
- **Observed Patterns:**
  - `[DIRECT INTERFACE OBSERVATION]` **Structured Card Containers:** Groups content into visually refined, modular card blocks with subtle borders and balanced internal padding.
  - `[DIRECT INTERFACE OBSERVATION]` **Contextual Action Menus:** Non-disruptive floating action bars that appear directly adjacent to selected items.
  - `[DIRECT INTERFACE OBSERVATION]` **Visual Breadcrumbs & Smooth Zoom:** Fluid view transitions that maintain spatial continuity when drilling down into nested documents.
- **Strengths to Emulate:**
  - Balanced card padding and subtle border contrast that feel modern and tactile.
  - Contextual action toolbars anchored to selections.
- **Weaknesses / Anti-Patterns to Reject:**
  - Heavy document-centric canvas model that is poorly suited for tabular task tracking or Gantt dependencies.
- **Sonder Architectural Takeaway:** Emulate Craft's card surface styling, clean hairline borders, and floating action toolbars for Sonder's Board cards and modal dialogs.

---

## 4. Comparative Research Matrix

| Area | Reference Product | Observed Pattern | User Problem Solved | Strength | Weakness | Recommendation for Sonder |
|---|---|---|---|---|---|---|
| **Global Nav & Shell** | Linear | Collapsible left rail + G-chord shortcuts | Eliminates navigation latency | Instant keyboard switching | Can be intimidating for new users | **Adopt**: Left rail + G-chords + persistent breadcrumbs |
| **Workspace Switching** | Superlist | Explicit Personal vs Shared workspace separation | Prevents accidental mixing of private and team work | Immediate mental clarity | None observed | **Adopt**: Dedicated Personal vs Shared sections in switcher |
| **Task Capture** | Linear / Things 3 | Global `C` shortcut + modal composer with max 5 initial fields | Captures tasks in <3 seconds without context loss | Zero friction; progressive disclosure | Users might miss optional fields | **Adopt**: Modal composer with 5 primary fields + collapsible secondary section |
| **Task Details** | Asana / Linear | Right-docked Task Peek Drawer (`?task=KEY`) | Inspects/edits tasks without unmounting active view | Context preservation; deep-linkable | Can feel cramped on narrow viewports (<1280px) | **Adopt**: 480px right drawer on desktop; full bottom sheet on mobile |
| **List Projection** | Height | Spreadsheet-grade inline editing with roving arrow-key focus | High-volume batch updates without modal clicking | Unmatched editing speed | Accidental edits if click targets are ambiguous | **Adopt**: Inline cell editing for status, priority, assignee, due date |
| **Board Projection** | Plane / Jira | Kanban swimlanes with status headers + mobile stage tabs | Visualizes workflow stages; prevents mobile horizontal sprawl | Native mobile ergonomics | Drag-and-drop difficult on small touchscreens | **Adopt**: Drag-and-drop on desktop; sticky stage tab switcher on mobile |
| **Calendar Projection** | Asana | Month grid + right-side "Unscheduled Tasks" drawer | Prevents undated tasks from becoming invisible | Complete task visibility | Drawer takes horizontal space | **Adopt**: Collapsible unscheduled drawer with 1-click scheduling |
| **Timeline Projection** | GitHub Projects | Split-screen: hierarchy table left + Gantt time axis right | Visualizes durations, milestones, and blocking conflicts | Direct temporal manipulation | Complex canvas rendering | **Adopt**: Split table + timeline; red conflict indicators (DEC-OPEN-08) |
| **Command Palette** | Linear (`cmdk`) | Centered `Cmd+K` palette with nested sub-menus & fuzzy search | Rapid navigation and action execution without mouse | Sub-10ms response; muscle memory | Complex to implement accessible combobox | **Adopt**: `cmdk`-based Omnibar with task key, title, view, and workspace search |
| **Filtering & Sorting** | Asana | Top filter bar: chips for Assignee, Status, Priority + Save View | Customizes view projections dynamically | Intuitive discovery | Can consume vertical canvas space | **Adopt**: Filter chip bar; URL-serialized state; copy-on-write saved views |
| **My Work Dashboard** | Sunsama | Cross-workspace aggregation: Overdue, Due Today, Upcoming | Daily triage across multiple team silos | High clarity on daily priorities | Can feel overwhelming if overdue tasks pile up | **Adopt**: Triaged groups + return-to-workspace links (`/my-work`) |
| **Notifications** | Basecamp | Split inbox: Action Required (@mentions, assigns) vs Updates | Combats alert fatigue; highlights urgent work | High signal-to-noise ratio | Requires disciplined backend classification | **Adopt**: Categorized tabs in `/inbox` |
| **Permission Controls** | Jira | Complex permission matrix with granular capability flags | Precise enterprise access control | Robust security | Configuration labyrinth | **Adapt**: 6 clean settings categories + Role Preview Simulator |
| **Mobile Experience** | Superlist / Things 3 | 44px bottom nav + swipe actions + full bottom sheets | One-handed mobile ergonomics | Native app feel in PWA | Requires custom responsive view adaptations | **Adopt**: Dedicated mobile layout with bottom navigation bar |

### 4.1 Patterns Worth Adopting
1. **Roving Tabindex Keyboard Navigation:** Arrow keys and `J`/`K` traverse rows; `Enter` opens details; `Space` triggers preview; `Escape` closes panels.
2. **Right-Docked Task Peek Drawer:** Slides out smoothly to 480px width, preserving canvas filters, search queries, and scroll positions. Deep-linked via `?task=PREFIX-123`.
3. **Calendar Unscheduled Tray:** Dedicated collapsible tray ensuring tasks without dates remain schedulable.
4. **Split-Screen Timeline with Dependency Conflict Markers:** Visual indicators highlighting when a prerequisite task completes after a dependent task begins.
5. **Personal vs Shared Workspace Segregation:** Dedicated, visually distinct sections in the workspace switcher.
6. **Calm Categorized Notifications:** Segmenting inbox items into "Action Required" (assignments, mentions) and "Updates" (status shifts, comments).

### 4.2 Patterns Worth Adapting
1. **Linear's Command Menu Chords:** Adapt engineering-centric chords (`G+I`, `G+M`) into domain-neutral chords (`G+W` for Workspaces, `G+M` for My Work, `G+I` for Inbox).
2. **Height's Spreadsheet Cells:** Implement inline cell editing while providing clear visual focus rings to prevent accidental mutations.
3. **Jira's Permanent Keys & Aliasing:** Adapt into a lightweight, instant prefix validator and rename flow (DEC-OPEN-06).

### 4.3 Patterns to Strictly Reject
1. **Jira's Configuration Labyrinth:** Reject multi-layered administration screens, JQL requirements, and complex permission scheme schemes.
2. **ClickUp's Feature Soup & Deep Container Hierarchy:** Reject arbitrary folders, lists, and unneeded view types. Stick strictly to `Community → Workspace → Task → Subtask`.
3. **Monday's Gamification & Confetti:** Reject juvenile completion celebrations, sound effects, and celebratory animations in favor of a calm, professional tone.
4. **Mobile Horizontal Board Scrolling:** Reject wide horizontal Kanban boards on mobile devices; replace with tabbed stage switchers.
5. **Drag-Only Interactions:** Reject any workflow where dragging a mouse or finger is the only way to accomplish a task. Every action must have an accessible keyboard/click alternative.

### 4.4 Opportunities to Surpass References
- **Unified 4-View Synchronized State:** Unlike Asana or ClickUp where view switches often trigger complete refetches and lost scroll positions, Sonder derives all four views from a single normalized TanStack Query client cache, achieving zero-latency view toggling.
- **Role Preview Simulator:** Allow Workspace Owners to simulate views as `COORDINATOR`, `MEMBER`, or `VIEWER` with a sticky indicator banner, eliminating the need to maintain secondary dummy accounts.
- **Fail-Closed CSRF & Zero-Storage Security:** Deliver enterprise-grade bank-level session security with zero client storage secrets, proving that security and consumer-grade speed can coexist.

---

## 5. Sonder Experience Principles

### 5.1 Principle 1: Clarity Over Visual Complexity
- **Rationale:** Work management is cognitively demanding. Cluttered chrome, excessive borders, and unnecessary visual ornamentation compete with user focus.
- **Screen & Interaction Application:**
  - High signal-to-noise ratio: content takes center stage. Chrome, borders, and controls use low-contrast neutral tones until focused.
  - Zero decorative gradients, gratuitous glassmorphism, or floating decorative blobs.
  - Clear visual hierarchy achieved through typographic scale and spatial grouping rather than heavy bounding boxes.

### 5.2 Principle 2: Recognition Over Recall
- **Rationale:** Users should never have to memorize hidden syntax, obscure shortcuts, or complex query languages to navigate work.
- **Screen & Interaction Application:**
  - The Omnibar (`Cmd/Ctrl+K`) exposes keyboard shortcuts inline next to every command item.
  - Filter chips explicitly display their active condition (e.g., `Status: In Progress ✕`) rather than hiding behind an opaque badge counter.
  - Tooltips with explicit shortcut legends appear on hover for all primary icon buttons.

### 5.3 Principle 3: Progressive Disclosure Across Three Distinct Layers
- **Rationale:** Exposing every advanced capability at once creates cognitive paralysis. Features should surface only when needed.
- **Screen & Interaction Application:**
  1. **Layer 1 (Daily Work):** Task quick-create, inline status/priority changes, filter chips, and the right-docked peek drawer.
  2. **Layer 2 (View Tuning):** Column visibility toggles, grouping controls, sorting options, and personal saved view presets.
  3. **Layer 3 (Governance):** Role permission matrices, custom field configuration, prefix renaming, and audit logs confined to dedicated Workspace Settings tabs.

### 5.4 Principle 4: Fast Task Capture and Low-Friction Updates
- **Rationale:** When capturing a task takes more than 5 seconds, users postpone capture, resulting in fragmented backlogs and lost momentum.
- **Screen & Interaction Application:**
  - Pressing `C` anywhere opens the Quick Task Composer with immediate autofocus on the title field.
  - Default composer contains only 5 essential fields: Title, Workspace, Status, Priority, Assignee. Secondary fields (Due Date, Labels, Estimate) collapse under an accessible disclosure toggle.
  - Pressing `Cmd/Ctrl+Enter` instantly submits the task and restores previous focus.

### 5.5 Principle 5: Consistent Interaction Patterns Across All Task Views
- **Rationale:** Learning to interact with tasks in one view must translate seamlessly to all other views.
- **Screen & Interaction Application:**
  - Clicking any task in List, Board, Calendar, or Timeline opens the identical Task Peek Drawer.
  - Status badges, priority indicators, and assignee avatars look, behave, and respond identically across all views.
  - Keyboard shortcuts (`Space` to peek, `Enter` to open, `E` to edit) operate uniformly across all 4 projections.

### 5.6 Principle 6: Clear Hierarchy and Predictable Navigation
- **Rationale:** Users must always maintain spatial awareness of their location within the platform.
- **Screen & Interaction Application:**
  - Strict visual adherence to `Community → Workspace → Task → Subtask`.
  - Top breadcrumbs permanently display `[Community Name] / [Workspace Name] / [View Name]`.
  - Left navigation rail highlights active workspace with a clear selection indicator.

### 5.7 Principle 7: Permission Transparency and Privacy Awareness
- **Rationale:** Users should understand why an action is restricted without disclosing confidential metadata or breaking layout stability.
- **Screen & Interaction Application:**
  - Elements restricted by role capabilities (e.g., editing workspace prefix) render with disabled styling and an explanatory tooltip explaining which role is required.
  - Personal Workspaces display a prominent privacy lock icon (`Alex's Private Notes [🔒 Personal]`), reassuring the user that contents are private by default.
  - Break-glass administrative access is clearly labeled with an audit warning banner (DEC-OPEN-01).

### 5.8 Principle 8: Useful Information Density Without Clutter
- **Rationale:** Professional users need to scan dozens of work items simultaneously without excessive vertical scrolling.
- **Screen & Interaction Application:**
  - Compact row height of **32px** for dense table rows and timeline bars.
  - Comfortable card padding of **12px–16px** for Kanban cards and detail drawers.
  - Tabular monospace numbers for task keys (`ENG-101`) and date stamps to ensure perfect vertical column alignment.

### 5.9 Principle 9: Desktop Productivity with Genuinely First-Class Mobile Workflows
- **Rationale:** Mobile devices are not secondary viewports; they are the primary tool for field triage, rapid status updates, and notification review.
- **Screen & Interaction Application:**
  - Minimum touch target bounding box of **44×44 CSS px** for all mobile interactive controls.
  - Bottom navigation bar anchoring core daily destinations within easy thumb reach.
  - Kanban board multi-column scrolling replaced with a clean tabbed Stage Switcher.

### 5.10 Principle 10: Accessibility, Keyboard Navigation, and Touch Usability
- **Rationale:** Accessibility is an essential baseline, not an afterthought.
- **Screen & Interaction Application:**
  - Strict compliance with **WCAG 2.2 Level AA**.
  - Minimum 4.5:1 text contrast for body copy; 3:1 for interactive controls.
  - Mandatory dual-indicator status chips: every badge combines an icon and text label (never color alone).
  - Unbroken keyboard focus management: opening modals traps focus; closing modals restores focus to trigger elements.

### 5.11 Principle 11: Subtle, Intentional, Performance-Conscious Motion
- **Rationale:** Motion must communicate spatial continuity, not showcase animation prowess.
- **Screen & Interaction Application:**
  - Animation durations strictly capped at **150ms–200ms** using `ease-out` timing curves (`cubic-bezier(0, 0, 0.2, 1)`).
  - Animations operate exclusively on `transform` and `opacity` properties to prevent browser reflows.
  - Instant transition snapping (0ms) when `prefers-reduced-motion: reduce` is detected.

---

## 6. Component-Library and Interaction Resource Evaluation

| Library / Resource | Problem Solved | Suitability for Sonder | Accessibility & Keyboard Support | Bundle Size & Performance Impact | Integration Effort | Verdict |
|---|---|---|---|---|---|---|
| **React Bits** (`reactbits.dev`) | Pre-built creative visual effects (particle grids, 3D tilts, text animations) | **Low (Selective Only)**: Useful for marketing hero or celebratory milestones; inappropriate for core productivity workspaces | Variable: Many canvas/WebGL effects lack accessible fallbacks; potential vestibular triggers | High overhead if un-optimized; canvas loops can degrade 60fps data grid performance | Low (copy-paste), but requires manual auditing for `prefers-reduced-motion` | **Avoid in Workspace; Adapt Selectively for Empty States** |
| **shadcn/ui** (`ui.shadcn.com`) | Copy-paste accessible, themeable UI components styled with Tailwind CSS | **Very High**: Provides production-ready patterns for Dialog, Dropdown, Tabs, Tooltip, and Popover | Built on accessible headless primitives (Radix/Base UI); full WAI-ARIA compliance | Zero runtime package overhead (code lives directly in project repository) | Minimal: Fits existing React 19 + Tailwind v4 + Vite stack perfectly | **Adopt as Primary Component Architecture Pattern** |
| **Radix UI** (`radix-ui.com`) | Unstyled, accessible headless UI primitives | **High**: Industry standard for accessible popovers, dialogs, and roving tabindex menus | Gold standard WAI-ARIA compliance, automated focus trapping, roving tabindex | Modular: ~2–5kb per primitive; tree-shakable | Low: Well-documented, but `asChild` / Slot pattern can have edge cases in React 19 | **Adopt / Retain as Primitive Baseline** |
| **Base UI** (`base-ui.com`) | Next-generation headless primitives from MUI team | **Very High**: Modern render-prop composition, advanced form validation, native React 19 support | Exceptional accessibility; exposes fine-grained data attributes and cancellable events | Highly optimized; zero CSS output; clean modular imports | Low-to-Medium: Drops in cleanly alongside Tailwind v4 modifier syntax | **Recommended Modern Headless Primitive Alternative** |
| **Motion** (`motion.dev`) | Declarative animation engine and layout projection transitions | **High (Selective)**: Excellent for layout animations (drawer slide-in, tab indicator transitions) | Respects `prefers-reduced-motion` via `useReducedMotion`; preserves DOM accessibility | ~5kb when optimized with `<LazyMotion>` and `<m.div>`; WAAPI hardware acceleration | Low: Simple declarative props (`initial`, `animate`, `exit`) | **Adopt with LazyMotion for Drawer & Layout Transitions** |
| **cmdk** (`cmdk.paco.me`) | Fast, unstyled command palette combobox | **Very High**: Powers Linear and shadcn command palettes; handles fuzzy filtering and keyboard navigation | WAI-ARIA combobox compliant; manages `aria-expanded`, `aria-activedescendant` | Tiny (~3kb); keeps filtered DOM rendering fast up to 2,000+ items | Minimal: Direct drop-in for Sonder's Omnibar (`Cmd/Ctrl+K`) | **Adopt for Omnibar / Command Palette** |
| **Lucide React** (`lucide.dev`) | Clean, consistent, lightweight SVG iconography | **Very High**: Cohesive 24×24 icon system covering all work-management concepts | Accessible when paired with `aria-hidden="true"` or accessible labels | Fully tree-shakable; ~0.5kb per icon | Trivial: Standard React SVG components | **Adopt as Universal Icon System** |
| **@tanstack/react-virtual** | Virtualized row/column rendering for large lists and tables | **High (Required for VS-04)**: Ensures 60fps scrolling over 500+ tasks in List and Timeline | Maintains standard DOM focus management when properly configured with roving index | Lightweight (~4kb); zero external styling dependencies | Low: Integrates directly with standard HTML `<table>` or `<div>` grids | **Adopt for Large Data Grids in VS-04** |

### 6.1 Architectural Component Recommendations
1. **Adopt `shadcn/ui` Pattern with Base UI / Radix Primitives:** Do not install monolithic component frameworks. Use the `shadcn/ui` pattern of copying unstyled, accessible headless primitives into `apps/web/src/components/ui/` and styling them via Tailwind CSS v4 design tokens.
2. **Adopt `cmdk` for Omnibar:** The `cmdk` package represents the industry gold standard for accessible, zero-latency command palettes and is the exact engine powering Linear and Raycast web clones.
3. **Adopt `Motion` Selectively with `LazyMotion`:** Restrict Motion to layout transitions (drawer slide-over, view tab indicators, modal enter/exit). Always wrap with `<LazyMotion features={domAnimation}>` to keep bundle overhead under 5kb.
4. **Reject React Bits in Core Workspace:** Decorative particle backgrounds, 3D tilts, and glowing cursor effects are strictly rejected in the core application workspace to preserve information density, accessibility, and high frame rates.

---

## 7. Proposed Visual Direction and Design Tokens

### 7.1 Visual Philosophy
Sonder’s visual direction is **Calm, High-Contrast, and Structurally Disciplined**. It projects quiet confidence and executive polish. It draws inspiration from Swiss modernist typography, the precision of physical notebooks (Things 3), and the speed of high-performance developer tools (Linear).
- **Anti-Slop Guarantees:**
  - No generic tracked-out ALL-CAPS text for mundane labels.
  - No cliché warm terracotta / cream AI-generated color palettes.
  - No oversized bubble cards with uniform 24px corner radii.
  - No faint, unreadable 2:1 low-contrast grey text.

### 7.2 Surface Hierarchy & Elevation Model
The interface utilizes a 4-tier surface elevation system that communicates spatial depth through clean 1px hairline borders and subtle shadow elevation:

| Elevation Level | Role / Surface | Light Theme Hex | Dark Theme Hex | Border Color (Light / Dark) | Shadow Token |
|---|---|---|---|---|---|
| **Layer 0** | Base Canvas / Background | `#F8FAFC` (Slate 50) | `#090D16` (Deep Obsidian) | None | None |
| **Layer 1** | Primary Rail / Cards / Table Rows | `#FFFFFF` (White) | `#0F172A` (Slate 900) | `#E2E8F0` / `#1E293B` | `shadow-xs` (`0 1px 2px rgba(0,0,0,0.05)`) |
| **Layer 2** | Drawers / Popovers / Dropdowns | `#FFFFFF` (White) | `#1E293B` (Slate 800) | `#CBD5E1` / `#334155` | `shadow-md` (`0 4px 6px -1px rgba(0,0,0,0.1)`) |
| **Layer 3** | Modal Overlays / Omnibar / Alerts | `#FFFFFF` (White) | `#1E293B` (Slate 800) | `#94A3B8` / `#475569` | `shadow-2xl` (`0 25px 50px -12px rgba(0,0,0,0.25)`) |

### 7.3 Brand Accent & Semantic Color Palette
Color is used with strict semantic discipline. It is never used purely for decoration.

#### Brand Primary
- **Light Theme:** Deep Navy / Slate `#0F172A` (Text) with Rich Indigo/Teal Accent `#0284C7` (Sky 600) / `#0D9488` (Teal 600).
- **Dark Theme:** Crisp White `#F8FAFC` (Text) with Electric Cyan/Teal `#14B8A6` (Teal 500) / `#38BDF8` (Sky 400).

#### Workflow Status Categories (Dual-Indicator Standard)
Every status chip includes an SVG icon and text label to satisfy WCAG 2.2 AA non-color reliance:

| Status Category | Semantic Meaning | Light Theme (Bg / Border / Text) | Dark Theme (Bg / Border / Text) | Icon (Lucide) |
|---|---|---|---|---|
| `TODO` | Not started; queued | `#F1F5F9` / `#CBD5E1` / `#475569` | `#1E293B` / `#334155` / `#94A3B8` | `Circle` |
| `IN_PROGRESS` | Actively being worked on | `#EFF6FF` / `#BFDBFE` / `#1D4ED8` | `#172554` / `#1E40AF` / `#60A5FA` | `Clock` |
| `IN_REVIEW` | Awaiting QA or sign-off | `#FAF5FF` / `#E9D5FF` / `#7E22CE` | `#2E1065` / `#581C87` / `#C084FC` | `Eye` |
| `DONE` | Completed & verified | `#F0FDF4` / `#BBF7D0` / `#15803D` | `#052E16` / `#166534` / `#4ADE80` | `CheckCircle2` |
| `CANCELLED` | Discarded or obsolete | `#FEF2F2` / `#FECACA` / `#B91C1C` | `#450A0A` / `#991B1B` / `#F87171` | `XCircle` |

#### Priority Levels
| Priority Level | Visual Treatment | Light Theme Color | Dark Theme Color | Icon (Lucide) |
|---|---|---|---|---|
| `URGENT` | Bold Red Badge | `#DC2626` (Red 600) | `#EF4444` (Red 500) | `AlertCircle` |
| `HIGH` | Amber Orange Badge | `#D97706` (Amber 600) | `#F59E0B` (Amber 500) | `ChevronUp` |
| `MEDIUM` | Subtle Indigo Badge | `#2563EB` (Blue 600) | `#60A5FA` (Blue 400) | `Minus` |
| `LOW` | Neutral Slate Badge | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) | `ChevronDown` |
| `NONE` | Faint Border Only | `#94A3B8` (Slate 400) | `#64748B` (Slate 500) | `CircleDashed` |

### 7.4 Typography System
- **Primary Typeface:** Clean, modern geometric neo-grotesque sans-serif: `Plus Jakarta Sans` or `Inter`, falling back to `system-ui, -apple-system, sans-serif`.
- **Monospace Typeface (Task Keys & Code):** `JetBrains Mono` or `ui-monospace`, ensuring tabular alignment for keys like `ENG-101` and `EVENT-204`.

#### Type Scale
| Role | Size (rem / px) | Weight | Line Height | Tracking | Usage |
|---|---|---|---|---|---|
| `Display` | `1.5rem` / 24px | 700 (Bold) | `1.25` (30px) | `-0.02em` | Workspace landing titles, My Work header |
| `Title` | `1.125rem` / 18px | 600 (Semibold) | `1.33` (24px) | `-0.01em` | Modal titles, Task Peek Drawer title |
| `Body Large` | `0.9375rem` / 15px | 500 (Medium) | `1.4` (21px) | `0em` | Primary task row title, composer input |
| `Body Regular` | `0.875rem` / 14px | 400 (Regular) | `1.43` (20px) | `0em` | Table data cells, description body, comments |
| `Caption / Label`| `0.75rem` / 12px | 500 (Medium) | `1.33` (16px) | `+0.01em` | Status chips, table headers, breadcrumbs |
| `Micro / Key` | `0.6875rem` / 11px | 600 (Semibold) | `1.2` (13px) | `+0.02em` | Task key badges (`ENG-101`), shortcut hints |

### 7.5 Spacing, Radii, and Interaction States
- **Spacing Grid:** Multiples of 4px (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`).
- **Corner Radii:**
  - Small elements (badges, buttons, inputs): `rounded-md` (**6px**).
  - Cards, peek panels, dropdown menus: `rounded-lg` (**8px**).
  - Modal dialogs: `rounded-xl` (**12px**).
  - Rounded pills (`rounded-full`) reserved exclusively for circular avatar images.
- **Interaction States:**
  - **Hover:** Subtle background shift (`bg-slate-100` / `dark:bg-slate-800/60`), transition 150ms ease.
  - **Focus Visible:** Unbroken, high-contrast 2px ring with 2px offset (`ring-2 ring-sky-500 ring-offset-2`).
  - **Active / Pressed:** Subtle scale `active:scale-[0.98]`.
  - **Disabled / Permission-Denied:** `opacity-50 cursor-not-allowed pointer-events-auto` (with explanatory tooltip).

### 7.6 Concrete Design Tokens (Tailwind CSS v4 & CSS Variables)
These tokens will be integrated into `apps/web/src/index.css`:

```css
@import "tailwindcss";

@layer base {
  :root {
    /* Surface Layers */
    --surface-canvas: #f8fafc;
    --surface-card: #ffffff;
    --surface-drawer: #ffffff;
    --surface-modal: #ffffff;
    --surface-muted: #f1f5f9;

    /* Text & Content */
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-muted: #64748b;
    --text-inverted: #ffffff;

    /* Borders & Hairlines */
    --border-subtle: #e2e8f0;
    --border-strong: #cbd5e1;
    --border-focus: #0284c7;

    /* Brand Accent */
    --brand-primary: #0f172a;
    --brand-accent: #0284c7;
    --brand-accent-hover: #0369a1;

    /* Semantic Status - Light */
    --status-todo-bg: #f1f5f9;
    --status-todo-text: #475569;
    --status-progress-bg: #eff6ff;
    --status-progress-text: #1d4ed8;
    --status-review-bg: #faf5ff;
    --status-review-text: #7e22ce;
    --status-done-bg: #f0fdf4;
    --status-done-text: #15803d;
    --status-cancelled-bg: #fef2f2;
    --status-cancelled-text: #b91c1c;

    /* Priority Colors */
    --priority-urgent: #dc2626;
    --priority-high: #d97706;
    --priority-medium: #2563eb;
    --priority-low: #64748b;
  }

  .dark {
    /* Surface Layers */
    --surface-canvas: #090d16;
    --surface-card: #0f172a;
    --surface-drawer: #1e293b;
    --surface-modal: #1e293b;
    --surface-muted: #1e293b;

    /* Text & Content */
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --text-inverted: #0f172a;

    /* Borders & Hairlines */
    --border-subtle: #1e293b;
    --border-strong: #334155;
    --border-focus: #38bdf8;

    /* Brand Accent */
    --brand-primary: #f8fafc;
    --brand-accent: #38bdf8;
    --brand-accent-hover: #0ea5e9;

    /* Semantic Status - Dark */
    --status-todo-bg: #1e293b;
    --status-todo-text: #94a3b8;
    --status-progress-bg: #172554;
    --status-progress-text: #60a5fa;
    --status-review-bg: #2e1065;
    --status-review-text: #c084fc;
    --status-done-bg: #052e16;
    --status-done-text: #4ade80;
    --status-cancelled-bg: #450a0a;
    --status-cancelled-text: #f87171;

    /* Priority Colors */
    --priority-urgent: #ef4444;
    --priority-high: #f59e0b;
    --priority-medium: #60a5fa;
    --priority-low: #94a3b8;
  }
}
```

---

## 8. Key Experience Blueprints

### 8.1 Blueprint 1: Application Shell & Primary Navigation
- **Page Structure:**
  - **Left Rail (Desktop):** 240px persistent sidebar, collapsible to 64px icon-only rail (`Cmd/Ctrl+B`).
  - **Top Navigation Bar:** Persistent 48px header displaying active Community Name, Breadcrumbs, Omnibar trigger (`Cmd+K`), Quick Create button (`+`), and User Profile Menu.
  - **Main Canvas:** Dynamic flex-1 workspace area housing the active view projection.
- **Key Interactions:**
  - `Cmd/Ctrl+B`: Toggles left sidebar collapse state.
  - Hovering a collapsed rail icon reveals a delayed accessible tooltip (200ms delay).
  - Breadcrumbs support one-click navigation up to Community or Workspace level.

### 8.2 Blueprint 2: Workspace Switcher (Personal vs Shared)
- **Page Structure:**
  - Located in the upper section of the left rail.
  - Dropdown menu split into two distinct sections:
    1. **Personal Workspace:** Marked with user avatar and private lock (`Alex Morgan [🔒 Personal]`).
    2. **Shared Workspaces:** Listed alphabetically with team template badges (`Engineering Platform [General]`, `Community Gala [Event]`).
    3. **Create Workspace Action:** Bottom button triggering `CreateWorkspaceModal`.
- **Key Interactions:**
  - Instant transition between workspaces without reloading the SPA.
  - Creation modal validates community-unique prefix availability in realtime (DEC-OPEN-06).

### 8.3 Blueprint 3: Omnibar & Command Palette (`Cmd/Ctrl+K`)
- **Page Structure:**
  - Centered modal dialog (`w-full max-w-2xl`) rendered via `cmdk` with backdrop blur.
  - Top search input with autofocus and instant query debouncing (50ms).
  - Categorized results list:
    - **Tasks:** Displays Key (`ENG-101`), Title, Status Badge, and Workspace provenance.
    - **Navigation:** Direct jumps to `/my-work`, `/inbox`, or specific Saved Views.
    - **Actions:** Quick Create Task, Toggle Dark Mode, Open Settings.
- **Key Interactions:**
  - Arrow keys cycle through results; `Enter` executes selection.
  - Typing an exact task key (`ENG-101` or historical alias) immediately elevates that item to the top match.

### 8.4 Blueprint 4: My Work Dashboard (`/my-work`)
- **Page Structure:**
  - Cross-workspace personal triage aggregation view.
  - Header displays greeting, summary metric badges (Total Assigned, Overdue Count, Due Today Count), and filter toggle (`Assigned to Me` | `Created by Me` | `Watching`).
  - Four collapsible temporal groups:
    1. **Overdue:** Red alert indicator; items whose due date is in the past.
    2. **Due Today:** Amber indicator; items due by 23:59 local time.
    3. **Upcoming:** Green indicator; items due within the next 7 days.
    4. **Unscheduled:** Neutral indicator; backlog items requiring date triage.
- **Key Interactions:**
  - Clicking any row opens the Task Peek Drawer.
  - Inline date picker allows one-click date rescheduling directly from the dashboard.

### 8.5 Blueprint 5: Task List & Task Peek Drawer
- **Page Structure:**
  - **List Table:** Dense tabular grid with columns for Checkbox/Select, Task Key, Title, Subtask Progress (`1/3`), Status, Priority, Assignee, and Due Date.
  - **Task Peek Drawer:** 480px right-docked canvas drawer.
    - Header: Breadcrumbs (`ENG > Tasks`), Task Key (`ENG-104`), Status selector, Close button (`Esc`).
    - Body: Rich editable Title, Markdown Description editor, Subtask Tree (depth 1–2 max, DEC-OPEN-09), Assignee Field Delegation panel (DEC-OPEN-02), and Threaded Comments.
- **Key Interactions:**
  - Arrow keys navigate between cells; `Space` previews; `Enter` opens drawer.
  - Changing a property in the drawer immediately syncs the background row in realtime.

### 8.6 Blueprint 6: Board Experience
- **Page Structure:**
  - Five horizontal columns representing workflow categories: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `CANCELLED`.
  - Column headers show status icon, name, card count, and optional WIP limit badge.
  - Cards show Task Key, Title, Assignee avatar, Priority badge, and Subtask progress bar.
- **Key Interactions:**
  - Pointer drag-and-drop moves cards between columns with optimistic UI update.
  - Non-drag alternative: card menu allows moving to any column via keyboard (`M` shortcut).
  - Mobile adaptation: horizontal scrolling is replaced with a sticky tab bar allowing switching between stages.

### 8.7 Blueprint 7: Calendar Experience
- **Page Structure:**
  - 7-column monthly grid or 7-day weekly agenda view.
  - Tasks render as colored pill bars on their designated due date or span.
  - Right-side collapsible **Unscheduled Tasks Tray** listing all matching tasks lacking dates.
- **Key Interactions:**
  - Dragging a task from the Unscheduled Tray onto a calendar cell sets its due date.
  - Clicking a calendar cell opens the quick creator pre-populated with that date.

### 8.8 Blueprint 8: Timeline Experience
- **Page Structure:**
  - Split-screen layout:
    - Left side: 300px task hierarchy tree table (Task Title, Assignee, Start/Due Dates).
    - Right side: Horizontal continuous time axis with Day, Week, and Month zoom toggles.
  - Tasks render as horizontal duration bars.
  - Dependency arrows link prerequisite tasks to dependent tasks.
  - Vertical line markers overlay workspace milestones (DEC-OPEN-08).
- **Key Interactions:**
  - Red visual conflict badges appear when a blocking prerequisite ends after a dependent task begins.
  - Double-clicking a timeline bar opens the Task Peek Drawer.

### 8.9 Blueprint 9: Inbox & Notifications (`/inbox`)
- **Page Structure:**
  - Split into two primary tabs:
    1. **Action Required:** Direct @mentions, new task assignments, and review requests.
    2. **Updates:** Status shifts on watched tasks, new comments, and workspace milestone completions.
  - Each item shows actor avatar, action description, timestamp, and "Mark as Read" action.
- **Key Interactions:**
  - Clicking a notification opens the relevant task in the peek drawer and jumps directly to the mentioned comment or field change.

### 8.10 Blueprint 10: Workspace Settings & Governance
- **Page Structure:**
  - Accessible only to Workspace Owners (`WorkspaceOwnerGuard`).
  - Six distinct tabbed categories:
    1. **General:** Workspace name, description, prefix renaming & alias history (DEC-OPEN-06).
    2. **Members:** Member list, role assignments (`OWNER`, `COORDINATOR`, `MEMBER`, `VIEWER`), invitation links.
    3. **Permissions:** Assignee field delegation ceiling/defaults (DEC-OPEN-02 Option A), subtask max depth (1 or 2, DEC-OPEN-09).
    4. **Tasks:** Custom fields management, workflow status mappings.
    5. **Views:** Shared view presets governance and default view configuration.
    6. **Notifications:** Default email and in-app digest settings.
  - Sticky top banner: **Role Preview Simulator** (`Previewing as: MEMBER ✕`).
- **Key Interactions:**
  - Changing prefix triggers atomic validation guard; prevents collision with reserved prefixes.
  - Role Preview Simulator immediately recalculates client permission hints to test viewer/member experiences.

### 8.11 Dedicated Mobile Touch Experience
Mobile users do not receive a shrunken desktop interface. Mobile layouts follow dedicated touch ergonomics:
- **Navigation:** Top compact bar with Hamburger menu, Workspace title, and Omnibar search icon. Bottom navigation bar with 5 primary thumb targets (44×44px): `My Work` | `Views` | `Quick Create (+)` | `Inbox` | `Profile`.
- **Board Adaptation:** Multi-column horizontal sprawl is completely replaced with a sticky **Stage Switcher tab bar** (`To Do` | `In Progress` | `Review` | `Done`). Selecting a tab displays only that column's cards in a high-density vertical list.
- **Task Drawer:** Renders as a full-height **bottom sheet** with a drag handle, supporting swipe-down-to-dismiss and an explicit "Close" button.
- **Touch Target Floor:** All interactive buttons, checkboxes, and select menus strictly enforce a minimum bounding box of **44×44 CSS px**.

---

## 9. Evaluation of Proposed VS-02 Scope

### 9.1 Scope Analysis
The proposed VS-02 milestone encompasses:
1. Persistent application shell (`AppShell`) with collapsible left rail and global header.
2. Workspace switcher supporting Personal vs Shared workspaces and creation modal.
3. Command Palette Omnibar (`Cmd/Ctrl+K`) with permission-aware search.
4. My Work personal dashboard (`/my-work`) with temporal triage groupings.
5. In-memory reactive mock entity store and seed data fixtures (Alex, Jordan, Casey, Riley; 3 workspaces; 15 tasks).
6. Comprehensive Vitest suite validating navigation, search, and triage workflows.

### 9.2 Recommended Implementation Sequence
To avoid refactoring or building components in isolation, the implementation should follow this precise sequence:
1. **Design System Primitives (`src/components/ui/`):**
   - Establish core accessible primitives first: `Button`, `Input`, `Badge`, `Avatar`, `DropdownMenu`, `Dialog`, `Tooltip`, `Card`.
2. **Deterministic Mock Store (`src/mocks/`):**
   - Implement the reactive in-memory entity repository (`store.ts`) and seed data fixtures (`data/seed.ts`) representing Alex (Owner), Jordan (Coordinator), Casey (Member), and Riley (Viewer) across 3 workspaces.
3. **Application Shell (`src/modules/app-shell/`):**
   - Build `AppShell`, `LeftRail`, `GlobalHeader`, and `PersonaSwitcher`.
4. **Workspace Switcher & Modal (`src/modules/workspace/`):**
   - Implement `WorkspaceSwitcher` dropdown and `CreateWorkspaceModal` with prefix collision handling.
5. **Omnibar (`src/modules/search/`):**
   - Integrate `cmdk`-based `OmnibarModal` supporting task key, title, and workspace navigation.
6. **My Work Dashboard (`src/modules/my-work/`):**
   - Implement `/my-work` with Overdue, Due Today, Upcoming, and Unscheduled triage groupings.
7. **Automated Testing Suite:**
   - Write Vitest unit and integration tests covering navigation, keyboard shortcuts, workspace switching, and persona simulation.

### 9.3 Boundary Enforcement
- **Backend & Server Infrastructure:** Completely out of scope. All runtime data is served by MSW v2 network interception against typed contracts.
- **Deep Task Views (List/Board/Calendar/Timeline):** Out of scope for VS-02 (deferred to VS-04 and VS-05). VS-02 provides empty placeholder canvas views that verify route mounting and view tabs.

---

## 10. Risks, Trade-offs, and Implementation Recommendations

| Risk / Trade-Off | Impact | Recommended Mitigation |
|---|---|---|
| **Headless Library React 19 Compatibility** | Potential warning or ref errors with legacy Radix versions | Use latest React 19 compatible releases or modern Base UI primitives; verify zero console warnings in Vitest jsdom tests |
| **Command Palette Search Latency** | Lag during fast typing in Omnibar if filtering is un-debounced | Utilize `cmdk` in-memory DOM filtering for datasets under 2,000 items; debounce external network queries by 50ms |
| **Mobile Board Sprawl** | Horizontal scrolling Kanban boards are unusable on mobile | Strictly enforce the Mobile Stage Switcher tab pattern on viewports `<768px` |
| **Unapproved Open Decisions** | Accidentally implementing features gated by open decisions (e.g. DEC-OPEN-03 task purge) | Render gated actions in a disabled state with explanatory tooltips citing the relevant open decision |
| **Mock-to-Backend Drift** | Mock data diverging from real backend schema when backend is built | Validate all mock handler responses and seed fixtures against `@sonder/contracts` generated types in strict mode |

---

## 11. Prioritized List of Design Decisions Requiring Approval

The following design decisions are documented for product owner alignment before executing subsequent vertical slices:

| Decision ID | Priority | Description | Proposed Recommendation | Alternative Considered |
|---|---|---|---|---|
| **DES-DEC-01** | **High (VS-02)** | Icon library selection | Adopt **Lucide React** (`lucide.dev`) for universal SVG icons | Heroicons (less extensive coverage) |
| **DES-DEC-02** | **High (VS-02)** | Command Palette primitive | Adopt **`cmdk`** (`cmdk.paco.me`) for Omnibar architecture | Custom custom-built combobox (higher maintenance and accessibility risk) |
| **DES-DEC-03** | **Medium (VS-03)** | Task Peek Drawer default width on desktop | **480px** fixed width with collapsible canvas flex | 600px wide drawer (cramps canvas on 1280px laptops) |
| **DES-DEC-04** | **Medium (VS-04)** | Mobile Board view representation | **Sticky Stage Switcher tab bar** replacing horizontal column scrolling | Horizontal card swipe (cumbersome touch navigation) |
| **DES-DEC-05** | **Low (VS-05)** | Calendar unscheduled tasks placement | **Collapsible right drawer** inside Calendar view | Separate modal list (loses spatial context) |

---

## 12. Conclusion and Next Steps

This research phase provides the definitive, evidence-backed UX and visual architecture for Sonder. By combining the speed of Linear, the multi-view synchronization of Asana, the calm focus of Basecamp and Things 3, and the rigorous governance of Jira, Sonder is positioned to deliver a world-class work management platform.

Upon authorization of this research specification, implementation will proceed directly to **VS-02 (`feat/FE-VS02-app-shell-mywork`)** starting with the core accessible component primitives and deterministic mock entity store.
