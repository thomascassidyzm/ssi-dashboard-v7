#!/bin/bash
# Job #557 (Aran 2026-10-29): the nv2/sv2 English clone fill, split across UTC days under the spend guard.
# Calls only tools/audio/aran-clone-english-fill.cjs (render = POST /api/audio/render, link = POST link-clip).
#   - at most DAY_MAX characters a UTC day from this run, and never past ESTATE_LIMIT for the whole estate that day
#     (the automatic cap is 1,000,000; the margin leaves the rest of the estate room);
#   - a guard refusal (any non-2xx render answer) STOPS the run and wakes the job — it is the answer, never retried;
#   - every day's clips are linked (fill-only) before it waits for the next UTC day.
# Usage: run-days.sh <popty checkout> <wake conv id> <wake conv token>
set -u
DIR="$1"; CONV="$2"; TOKEN="$3"
DAY_MAX=${DAY_MAX:-500000}; ESTATE_LIMIT=${ESTATE_LIMIT:-850000}
cd "$DIR" || exit 2
TOOL="node tools/audio/aran-clone-english-fill.cjs"
wake() { node ~/command-surface/tools/cs-wake-send.cjs "$CONV" "$TOKEN" "$1"; }
pending() { $TOOL status 2>/dev/null | grep '"pending"' | grep -oE '[0-9]+'; }
spent_today() { node tools/tts-cap.cjs status 2>/dev/null | grep -oE 'UTC day [0-9-]+: [0-9]+' | grep -oE '[0-9]+$'; }
for day in 1 2 3 4 5; do
  P=$(pending); [ "${P:-1}" = "0" ] && break
  S=$(spent_today); S=${S:-$ESTATE_LIMIT}
  B=$(( ESTATE_LIMIT - S )); [ $B -gt $DAY_MAX ] && B=$DAY_MAX
  if [ $B -gt 5000 ]; then
    OUT=$($TOOL render --max-chars $B 2>&1 | tail -3); echo "$(date -u +%FT%TZ) render budget $B: $OUT"
    $TOOL link 2>&1 | tail -4
    if echo "$OUT" | grep -q "STOP on"; then wake "557 clone fill STOPPED on a guard refusal: $OUT | $($TOOL status 2>/dev/null | tr -d '\n ')"; exit 1; fi
  else
    echo "$(date -u +%FT%TZ) estate already spent $S today; waiting for the next UTC day"
  fi
  P=$(pending); [ "${P:-1}" = "0" ] && break
  NEXT=$(( ( $(date -u +%s) / 86400 + 1 ) * 86400 + 600 )); sleep $(( NEXT - $(date -u +%s) ))
done
wake "557 clone fill finished its days: $($TOOL status 2>/dev/null | tr -d '\n ')"
