#!/usr/bin/env bash
# Pre-command safety check: warns against destructive operations
set -euo pipefail

# In Antigravity hooks, tool arguments are passed via stdin or environment
INPUT=$(cat || true)

if echo "$INPUT" | grep -E -q "git push.*--force|git reset --hard|rm -rf \.git"; then
  echo "[SAFETY HOOK ERROR] Destructive git/filesystem operation blocked by safety hook." >&2
  exit 1
fi

exit 0
