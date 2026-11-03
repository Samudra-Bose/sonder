# Security & Privacy Rules

- Server Authority: Frontend permissions are purely presentation hints. Backend RLS and middleware authorize all requests.
- Personal Workspace Privacy: Personal workspaces are strictly private to the user; community administrators must not be given access.
- Secret Hygiene: Zero credentials, tokens, cookies, or secrets in repository code, Git history, or shell commands.
- Fail-Closed CSRF: CSRF token retrieval must be verified before submitting state-changing mutations.
