#!/usr/bin/env bash
# Read one course LIVE through Popty's own read route (no DB code of ours).
# Writes ~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item4/live/<course>.json
set -euo pipefail
# cs #968·AI: a live read; refused unless  fetch.sh <course> --live-ok '<why>'  AND 22:00-07:00 UK (exit 77)
node "$(dirname "$(readlink -f "$0")")/../../paid-cleanup-livegate.cjs" "item4 fetch.sh ${1:-}" "${@:2}"
c="$1"; d="$HOME/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item4/live"; mkdir -p "$d"
curl -sf "http://localhost:3470/api/production/$c/seeds" -H 'x-agent-id: cs-item4-filler' -o "$d/$c.json.tmp"
mv "$d/$c.json.tmp" "$d/$c.json"; echo "$d/$c.json $(stat -c %s "$d/$c.json") bytes $(date -u +%FT%TZ)"
