# Built-in Workspace Setup Templates — DEC-OPEN-07

**Status:** OWNER CONFIRMED — 31 October 2026. **API:** 0.3.20-draft.

Exactly three versioned, read-only built-in Workspace setup templates are included in the initial product scope. The template names and seed sets below are the initial catalog version 1.

| Key | Workflow statuses | Custom fields seeded | Default shared views |
|---|---|---|---|
| `GENERAL_PURPOSE` | To do (`TODO`), In progress (`IN_PROGRESS`), Done (`DONE`) | None | All work (List), Board |
| `EVENT_PLANNING` | Backlog (`BACKLOG`), To do (`TODO`), In progress (`IN_PROGRESS`), Done (`DONE`) | Event date (`DATE`); Workstream (`SINGLE_SELECT`: Program, Logistics, Marketing, Registration) | Planning board, Event calendar, Timeline |
| `TEAM_OPERATIONS` | Backlog (`BACKLOG`), Planned (`TODO`), In progress (`IN_PROGRESS`), Done (`DONE`) | Service area (`SINGLE_SELECT`: Facilities, Communications, Technical, Community); Review date (`DATE`) | Operations list, Operations board, Review calendar |

Applying a template is configuration-only and atomic with Workspace creation. It does not create sample tasks/subtasks, assignments, assignees, comments, watchers, invitations, members or elevated permission grants. The template catalog is versioned; existing Workspace configuration is never silently rewritten when a catalog version changes. Owners can edit the resulting statuses, custom fields and saved views after creation.

The `GET /communities/{communityId}/workspace-templates` catalog is read-only. `CreateWorkspaceRequest.templateKey` selects a template and defaults to `GENERAL_PURPOSE`. A custom template builder is not in the initial release.

## Required tests

- Each template produces exactly the documented status, custom-field and saved-view seed set.
- Repeated create requests with the same idempotency key do not duplicate seeded records.
- Template application does not create tasks, members, invitations or grants.
- Template catalog changes do not mutate existing Workspaces.