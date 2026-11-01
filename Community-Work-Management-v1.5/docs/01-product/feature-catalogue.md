# Feature Catalogue

**Baseline:** v1.5.0 · **Product decisions:** owner-confirmed where marked · **API:** 0.3.20-draft (not frozen)



## Feature catalogue

| Feature family | Scope | Key requirements | Delivery |
|---|---|---|---|
| Workspace lifecycle | Personal/Shared workspaces, creation, archive/restore, membership and ownership | Community tenancy, default coordinators, multiple Owners, six settings groups | M1.1/M1.3 |
| Identity and access | Email/password, Google sign-in, session lifecycle, Community and Workspace membership | Backend-enforced membership, custom roles, least-privilege, audited break-glass | M1.1/M1.3 |
| Task execution | Tasks, subtasks, keys, assignment, status, priority, dates and estimates | Workspace-first hierarchy; stable UUIDv7; Community-unique permanent prefix reservations; atomic prefix rename; immutable aliases | M1.1 |
| Task relationships | Dependencies, links and bounded subtasks | BLOCKS DAG validation, relation authorization, default depth 1; Owner may set max 2; reductions below existing tree depth rejected | M1.1/M1.2 |
| Four planning views | List, Board, Calendar and Timeline | One task model, one canonical query AST, synchronized membership and filters | M1.1/M1.2 |
| My Work and search | Cross-workspace personal work dashboard and omnibar | Permission-aware results, keys/aliases/title search and saved views | M1.1 |
| Comments and mentions | Threaded comments, @mentions, task-key links and watchers | Sanitized Markdown, server-validated recipients, subscriptions | M1.1 |
| Notifications | Inbox, assignments, mentions, status updates and deadline reminders | In-app/email preference, quiet hours, retry/dedupe | M1.1/M1.3 |
| Customization | Workspace status workflow, custom fields, labels, saved views, exactly three built-in templates and optional Workspace milestones | Six settings categories; General Purpose/Event Planning/Team Operations seed configuration only; Workspace-level milestone markers | M1.2 |
| Governance | Roles, role preview, audit and recovery | Delegation ceiling, Option A assignee grants, append-only governance audit | M1.3 |
| Offline | Selected-field editing on existing tasks | FIFO replay, current authorization, per-field conflict handling; no offline create/comment | M1.3 |
| Mobile and accessibility | Touch-friendly core workflows and keyboard parity | Core mobile work, WCAG 2.2 AA target, no drag-only actions | M1.3 |

## Explicit exclusions

No file uploads/attachments/file hub; no mandatory Project or List containers; no JQL; no arbitrary workflow scripts; no billable worklogs; no enterprise ITSM/CMDB; no cross-community task transfer; no arbitrary automation scripts. Later roadmap capabilities remain separately identified in the PRD.

## Feature implementation rule

A feature is not complete when its screen renders. It is complete only when the frontend interaction, API contract, backend authorization, persistence, realtime/offline behavior where applicable, empty/error/loading states, test evidence and documentation traceability are all satisfied.
