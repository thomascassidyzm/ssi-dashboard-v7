#!/usr/bin/env bash
# Re-vendor the pod composition engine from its canonical @ssi/core/pods source.
#
# Why this exists: Popty deploys single-repo on Vercel, so its SPA build cannot
# resolve the `@ssi/core` file: link (which points into the sibling learning-app
# repo) at build time. We therefore vendor a VERBATIM copy of the engine source
# into src/lib/podEngine and keep it in lockstep with this script. The Pod Lab
# (and any future dashboard consumer) then runs the exact same composition code
# the learner's main flow runs — one engine, no re-implementation.
#
# Proper long-term fix: publish @ssi/core to a registry and depend on it
# normally; then this vendor + script can be deleted.
#
# Usage:  bash tools/sync-pod-engine.sh   (run from the repo root)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/../../ssi-learning-app/packages/core/src/pods"
DST="$HERE/../src/lib/podEngine"

if [ ! -d "$SRC" ]; then
  echo "ERROR: canonical source not found at $SRC" >&2
  echo "       (the ssi-learning-app repo must sit alongside this one)" >&2
  exit 1
fi

read -r -d '' BANNER <<'BANNER_EOF' || true
// ─────────────────────────────────────────────────────────────────────────────
// GENERATED — DO NOT EDIT BY HAND.
// Canonical source: @ssi/core/pods (ssi-learning-app/packages/core/src/pods).
// Vendored here because Popty's Vercel build is single-repo and can't resolve
// the @ssi/core file: link at build time. This is a VERBATIM copy of the one
// engine the learner runs — not a re-implementation. Re-sync after any change
// to the canonical source with:  bash tools/sync-pod-engine.sh
// ─────────────────────────────────────────────────────────────────────────────
BANNER_EOF

mkdir -p "$DST"
for f in stage0Sequence.ts podStageComposition.ts; do
  { printf '%s\n\n' "$BANNER"; cat "$SRC/$f"; } > "$DST/$f"
  echo "synced $f"
done
echo "podEngine re-vendored from $SRC"
