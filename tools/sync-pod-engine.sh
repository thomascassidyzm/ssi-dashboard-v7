#!/usr/bin/env bash
# Re-vendor the pod composition engine from its canonical @ssi/core/pods source.
#
# Why this exists: Popty deploys single-repo on Vercel, so its SPA build cannot
# resolve the `@ssi/core` file: link (which points into the sibling learning-app
# repo) at build time. We therefore vendor a VERBATIM copy of the engine source
# into src/lib/podEngine and keep it in lockstep with this script. The Pod Lab,
# the Pod Drill player (src/components/pods/PodDrillPlayer.vue) and any future
# dashboard consumer then run the exact same composition code the learner runs —
# one engine, no re-implementation.
#
# Two kinds of file:
#   - @ssi/core/pods files            → src/lib/podEngine/<file>
#   - pure player-vue composables/playback the Drill player needs (sentence split,
#     slate, the plain t·k·t·t modal queue)
#                                     → src/lib/podEngine/player/<file>
#     These live in player-vue, not core, so they carry a banner naming that
#     path. They are pure (no imports), so a verbatim copy runs unchanged.
#
# Source: by default the learning-app checkout beside this repo. Set
#   SSI_APP=<path to ssi-learning-app>   to point elsewhere, and
#   SSI_APP_REF=origin/staging           to copy from a git ref instead of the
#                                        working tree (the drill composer of
#                                        job #836 lives on staging first).
#
# Proper long-term fix: publish @ssi/core to a registry and depend on it
# normally; then this vendor + script can be deleted.
#
# Usage:  bash tools/sync-pod-engine.sh   (run from the repo root)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
APP="${SSI_APP:-$HERE/../../ssi-learning-app}"
REF="${SSI_APP_REF:-}"
DST="$HERE/../src/lib/podEngine"

if [ ! -d "$APP" ]; then
  echo "ERROR: learning-app checkout not found at $APP (set SSI_APP)" >&2
  exit 1
fi

read_src () { # repo-relative path → stdout
  if [ -n "$REF" ]; then git -C "$APP" show "$REF:$1"; else cat "$APP/$1"; fi
}

banner () { # $1 = canonical path
cat <<BANNER_EOF
// ─────────────────────────────────────────────────────────────────────────────
// GENERATED — DO NOT EDIT BY HAND.
// Canonical source: ssi-learning-app/$1${REF:+ (at $REF $(git -C "$APP" rev-parse --short "$REF"))}
// Vendored here because Popty's Vercel build is single-repo and can't resolve
// the @ssi/core file: link at build time. This is a VERBATIM copy of the code
// the learner runs — not a re-implementation. Re-sync after any change to the
// canonical source with:  bash tools/sync-pod-engine.sh
// ─────────────────────────────────────────────────────────────────────────────
BANNER_EOF
}

mkdir -p "$DST/player"
CORE=packages/core/src/pods
for f in atomMap.ts podStageComposition.ts fusionDrill.ts; do
  { banner "$CORE/$f"; printf '\n'; read_src "$CORE/$f"; } > "$DST/$f"
  echo "synced $f"
done
PV=packages/player-vue/src
for f in composables/podSentenceSplit.ts composables/podSlate.ts playback/podModalQueue.ts; do
  { banner "$PV/$f"; printf '\n'; read_src "$PV/$f"; } > "$DST/player/$(basename "$f")"
  echo "synced player/$(basename "$f")"
done
echo "podEngine re-vendored from $APP${REF:+ @ $REF}"
