# Permission and Security Model

**Baseline:** v1.5.0 · **API:** 0.3.20-draft (not frozen)



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


---

# 11. Authentication, application security and data protection

## 11.1 Authentication requirements — CR-13 engineering draft

- Email/password and Google OIDC authentication.
- Google uses authorization code + PKCE S256, state and nonce validation, exact redirect URI and verified email.
- Do not auto-merge identities merely because email strings match. Linking/unlinking providers requires authenticated step-up; never remove the last verified login method.
- Password hashing uses Argon2id with parameters finalized by the security owner; the current CR-13 draft's minimum and the older synthesis contain different work factors, so use one approved value only after review.
- Email verification and password reset use generic responses to prevent account enumeration, expiring one-time hashed tokens and appropriate session revocation.
- Session listing/revocation, rotation, CSRF protection and exact Origin checks.
- Rate limit sensitive auth endpoints and avoid revealing whether an email/account exists.
- MFA/passkeys and additional IdPs are not Phase 1 requirements unless separately approved.

## 11.2 Authorization layers

1. Global account/session validity.
2. Community membership and community-scoped administration.
3. Workspace membership and workspace role.
4. Personal Workspace privacy and break-glass state.
5. Task visibility and relationship-based grants (creator/assigner/assignee).
6. Per-field/per-action capability and task policy.
7. Preview role mask, which may only reduce the real permission set.

The backend enforces this chain; frontend flags are advisory. All list/search/query endpoints must apply authorization before aggregation/counting to prevent side-channel leakage.

## 11.3 Security engineering controls

- Use parameterized queries, strict DTO allow-lists, size limits, safe Markdown AST rendering and exact URL scheme allow-lists.
- Enforce per-tenant composite constraints and RLS; test both with ordinary and elevated role contexts.
- Never trust client-supplied user IDs for the current principal, task assigner, notification recipient or audit actor.
- Revalidate authorization on idempotency replay, cursor continuation, offline mutation replay, task-key alias resolution and WebSocket catch-up.
- Sensitive DTOs use private/no-store caching; cache keys include principal and permission revision where caching is justified.
- Do not place bearer tokens, refresh credentials or session values in browser localStorage, URL query strings, logs or telemetry.
- Include dependency and secret scanning in CI; separate runtime and migration database identities.

---


---

## 4.5 Task edit and execution permissions

Default task policy is `CREATOR_COORDINATOR_STRICT` in the CR-05 engineering draft:

- Workspace Owners and Coordinators can manage task definitions, subject to security floors.
- Task creator retains the defined creator rights while they remain an authorized active member.
- An active task assigner can retain definition/assignment rights for the assignments they created, subject to current membership and assignment rules.
- Assignees can update execution status, comment and manage/create permitted subtasks within the assigned task scope.
- Workspace Owners configure the maximum additional field groups that may be delegated to assignees and the default grant set for newly created tasks. Both default to empty; the default must be a subset of the allowed ceiling.
- The Task Creator chooses the additional assignee field groups for each task from the Workspace-approved ceiling. The same task-level grant set applies to every active assignee on that task; per-assignee differences are not part of this contract.
- An active Workspace Owner may override per-task assignee grants for governance and continuity. Coordinators and Task Assigners do not receive this permission solely from their role.
- Members can create tasks, comment, watch and use views; other editing depends on configured task policy.
- `COLLABORATIVE_MEMBER` is an Owner-controlled alternative under which active non-Viewer members receive broader collaboration rights, but not governance, move/archive/purge or Workspace administration rights.
- Viewers remain read-only apart from any explicitly allowed watch behavior.

The Option A delegation ownership model is OWNER CONFIRMED under DEC-OPEN-02. The exact field-group catalog and implementation controls are engineering-defined and remain subject to joint Backend/Frontend/Security contract review. A relationship grant does not bypass community/workspace membership, Personal Workspace privacy, disabled/suspended membership or resource visibility. Mixed-field PATCH requests are all-or-nothing. Server-side permission checks are performed afresh for every operation. DTO `effectivePermissions` are UI hints only—not bearer authority.

---
