# User Roles, Membership and Workflows

**Baseline:** v1.5.0 · **API:** 0.3.20-draft (not frozen)



## 1.3 Primary users and jobs to be done

| User type | Primary job | Product value |
|---|---|---|
| Community member / contributor | See work assigned to them across joined workspaces, update progress quickly, comment and manage private personal tasks. | My Work, rapid task creation, four consistent views, simple status actions and app-like mobile UX. |
| Coordinator | Organize shared work, assign tasks, resolve blockers, manage deadlines and help members. | Workspace coordination capabilities, hierarchy, dependencies, saved shared views and planning views. |
| Workspace Owner | Create and govern a workspace, control membership/roles, configure task behavior and recover mistakes. | Six-category settings, custom roles, workflow settings, role preview, task transfer and audit visibility. |
| Community Administrator | Manage community membership and shared-workspace policies, and perform limited emergency recovery when justified. | Community-scoped administration, default coordinator pool, governance audit and audited Personal Workspace break-glass. |
| Platform Operator | Maintain infrastructure without routine access to community content. | Operational-plane tools only; no silent tenant-content privilege. |


---

# 5. Roles, membership, workspace governance and privacy

## 5.1 Identity and membership boundaries

- One global User identity can join multiple independent Communities.
- A `CommunityMembership` is independent from `WorkspaceMembership`.
- Community Admin authority comes only from the user's active membership in that same Community. It does not imply membership in all its Workspaces or task-level read access.
- Shared Workspace invitation requires active Community membership. Community invite acceptance precedes Workspace invitation acceptance where necessary.
- Personal Workspace creation is self-service for every eligible user. The Personal Workspace has one owner and is private; it does not accept additional workspace members.
- Shared Workspace creation is controlled by a Community policy. Workspace membership is explicitly invited/requested/approved and revocable.
- The community's Default Coordinator pool is preselected for new Shared Workspaces. The creator/owner can remove members from the preselected list before creation and the Owner can later remove a Coordinator. This default is for new workspaces only; it does not grant retroactive access to existing workspaces.

## 5.2 Built-in and custom roles

Built-in role identities: `OWNER`, `COORDINATOR`, `MEMBER`, `VIEWER`. The role model is flat: exactly one role per active WorkspaceMembership, no role inheritance and no implicit capability stacking. Custom roles are Workspace-local capability sets.

Custom role governance must enforce a grant ceiling: an actor cannot create/assign a role containing capabilities they do not personally hold and are allowed to delegate. Sensitive capabilities (ownership transfer, membership/role governance, audit export, purge and security configuration) require explicit reserved handling. Community Admin privileges remain separate from Workspace role capabilities.

Role preview is a read-only, downward-only simulation. It can demonstrate a more restrictive role view but must never grant a capability the actual actor does not possess. Preview mode is not a security boundary; backend authorization continues to use the authenticated user's real membership and the preview mask.

## 5.3 Workspace settings — OWNER CONFIRMED

The settings navigation has exactly six top-level categories:

1. **General** — name, description, archive/restore and ownership controls.
2. **Members** — invitations, requests, member list, role assignment and default Coordinator inclusion.
3. **Permissions** — built-in/custom roles, capabilities, per-setting access and role preview.
4. **Tasks** — task policy, task hierarchy depth, key prefix/sequence, statuses, priority defaults, labels, dependencies and custom fields.
5. **Views** — four views, default projection behavior, saved views, layout and display options.
6. **Notifications** — recipient preferences, channels, quiet hours, digest controls and Workspace deadline reminders.

The six categories supersede older nine-category mockups and navigation structures. Each setting needs an identified owner capability and a clear explanation of who may change it. If fine-grained per-setting authorization is offered, changes must be validated by the backend—not merely hidden in the frontend.

## 5.4 Ownership and recovery — OWNER CONFIRMED DEC-OPEN-15

Shared Workspaces may have multiple active Owners. At least one active Owner must remain at every transaction commit. Owner promotion/transfer uses the dedicated atomic `owner-transfer` operation: promote an eligible active Workspace member first, then optionally demote or suspend the caller in the same transaction. A last active Owner cannot leave, be suspended, be removed or be demoted unless a replacement becomes Owner in that transaction. Generic membership/role patch endpoints cannot promote or demote an Owner.

Personal Workspaces remain single-owner and do not support multi-owner transfer. Community Admin recovery is separate, audited and explicit; it is not silent routine takeover authority. The API candidate already contains the dedicated owner-transfer operation; its runtime and audit behavior require joint Backend/Security verification.

## 5.5 Personal Workspace privacy and emergency access

**Privacy status — OWNER CONFIRMED.**

The selected product policy is `AUDITED_BREAK_GLASS`, not broad administrator access. Only an active Community Administrator belonging to the same Community as the target Personal Workspace may initiate. Platform Operators, cross-community administrators, Coordinators and ordinary members cannot initiate. The access is read-only and limited to one Personal Workspace. Fresh reauthentication is required; the justification uses a closed reason category plus a minimum non-whitespace explanation. The CR-01 draft chooses a 15-minute default, 60-minute maximum initial grant, one independently approved 30-minute extension and 90-minute absolute lifetime. Owner notification, grantor/peer-admin revocation and immutable pre-access audit evidence are mandatory. The exact procedure needs product/security/backend sign-off before freeze.

Routine support, curiosity, performance monitoring, convenience or ordinary management review are not valid reasons. A separate formal legal process is required for legal/regulatory disclosure; break-glass is not a substitute.

---
