#!/usr/bin/env bash
# Read one course LIVE through Popty's own read route (no DB code of ours).
# Writes ~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item9/live/<course>.json
set -euo pipefail
c="$1"; d="$HOME/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item9/live"; mkdir -p "$d"
curl -sf "http://localhost:3470/api/production/$c/seeds" -H 'x-agent-id: cs-713-item9' -o "$d/$c.json.tmp"
mv "$d/$c.json.tmp" "$d/$c.json"; echo "$d/$c.json $(stat -c %s "$d/$c.json") bytes $(date -u +%FT%TZ)"
