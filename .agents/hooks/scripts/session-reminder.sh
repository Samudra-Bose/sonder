#!/usr/bin/env bash
# Session start reminder
set -euo pipefail

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
echo "[Sonder Invariant Check] Active branch: $BRANCH. Canonical specs & decision register are authoritative. Frontend-only responsibility."
exit 0
