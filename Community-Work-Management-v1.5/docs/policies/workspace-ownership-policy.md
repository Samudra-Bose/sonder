# Workspace Ownership and Transfer Policy — DEC-OPEN-15

**Status:** OWNER CONFIRMED — 31 October 2026. **API:** 0.3.20-draft.

- Shared Workspaces may have multiple active Owners.
- At least one active Owner must remain at every transaction commit.
- Owner promotion/transfer uses the dedicated `owner-transfer` operation, not generic member-role patching.
- The target must be an eligible existing Workspace member with active Community membership. Promotion and the caller's optional demotion/leave disposition are one atomic transaction.
- A last active Owner cannot leave, be suspended, be removed or be demoted without a replacement becoming Owner in the same transaction.
- Personal Workspaces are single-owner and do not support multi-owner transfer.
- Community Admin recovery remains separate, audited and explicit; it does not create routine silent takeover authority.
