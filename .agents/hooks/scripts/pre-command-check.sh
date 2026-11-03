#!/usr/bin/env bash
INPUT=$(cat || true)
if echo "$INPUT" | grep -E -q "git push.*--force|git reset --hard|rm -rf \.git"; then
  echo '{"decision": "deny", "reason": "[SAFETY HOOK] Destructive git/filesystem operation blocked by safety hook."}'
  exit 0
fi
echo '{"decision": "allow"}'
exit 0
