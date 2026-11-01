# Workspace Task Hierarchy Policy — DEC-OPEN-09

**Status:** OWNER CONFIRMED — 31 October 2026. **API:** 0.3.20-draft.

The root task has depth 0. The default Workspace maximum is 1, allowing a task and one subtask level. The Workspace Owner may increase the maximum to 2, enabling one additional nested subtask level. No unbounded recursive hierarchy is supported.

A requested reduction is accepted only when every current task tree is already within the new limit. If not, reject atomically with `422 MAX_SUBTASK_DEPTH_BELOW_CURRENT_TREE`; do not silently reparent, archive, delete or detach tasks. Members must restructure the affected tree first. Backend validation is authoritative; frontend controls are advisory.
