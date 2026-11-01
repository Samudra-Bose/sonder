# Task Trash and Permanent Purge Policy — DEC-OPEN-11

**Status:** OWNER CONFIRMED — 31 October 2026. **API:** 0.3.20-draft. **Purge operation:** specified but feature-disabled until DEC-OPEN-03 is approved.

1. Archiving a task moves the task and any archived descendant subtree into Trash; the normal recovery window is exactly 30 days from archive time.
2. During the window, an authorized Workspace Owner or member with `task:restore` may restore the task/tree, subject to current membership, visibility and structural validation.
3. Expiry of 30 days does not itself delete data. Automatic hard purge is disabled.
4. Permanent purge is a separate explicit action, requires an active Workspace Owner and `task:delete_permanent`, typed `PURGE` confirmation and an audit record. Purge applies to the archived task and descendants atomically.
5. Historical keys remain immutable aliases; minimal content-free lineage/tombstone metadata remains for non-disclosing key resolution and authorized 410 behavior.
6. The purge API is present in the draft contract but remains disabled until audit retention, legal-hold authority and purge operations are resolved under DEC-OPEN-03. While disabled, it returns `403 PURGE_POLICY_NOT_ENABLED` and performs no mutation.
7. Audit log retention is separate from task Trash retention. No numeric audit retention or audit purge is implied by this task Trash decision.
