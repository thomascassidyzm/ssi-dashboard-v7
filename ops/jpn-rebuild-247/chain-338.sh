#!/usr/bin/env bash
# cs #338·AL chain runner for the jpn/kor rebuild, from the durable checkout ~/.cs-long/247/popty (never a worktree).
#   chain-338.sh gen   <jpn|kor> <band>...   generate each band in turn (UNPACED=1 → tool's --unpaced, 90% guard);
#                                             commits gen files to cs/247-run, leaves $EV/gen-<c>-<band>.done, wakes.
#   chain-338.sh apply <jpn|kor> <band>...   for each band in order: wait for its .done, then night-band.sh until the
#                                             band is applied (<c>/<band>.done); window-closed nights simply resume.
# One apply at a time by construction (audio.json is per course). Wake target + token file come from the environment
# (CS_WAKE_CONV, CS_WAKE_TOKFILE); the token is read from the file here, never put on argv.
set -u
MODE=$1; C=$2; shift 2
DIR="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$DIR/../.." && pwd)"; cd "$ROOT"
T=tools/course-optimization/jpn-kor-rebuild-247.cjs
EV="$HOME/ssi-evidence/ssi-dashboard-v7/ops/jpn-rebuild-247"; mkdir -p "$EV"
: "${CS_WAKE_CONV:?}" "${CS_WAKE_TOKFILE:?}"
wake() { node ~/command-surface/tools/cs-wake-send.cjs "$CS_WAKE_CONV" "$(cat "$CS_WAKE_TOKFILE")" "$1" >/dev/null 2>&1 && echo "WAKE SENT: $1" || echo "WAKE FAILED: $1"; }
gitpush() { for t in 1 2 3; do git add "$@" && { git diff --cached --quiet || git commit -q -m "$MSG"; } && git push -q origin HEAD:cs/247-run && return 0; sleep 20; done; return 1; }

if [ "$MODE" = gen ]; then
  if [ ! -s "$EV/$C-copy.json" ]; then # copy dump from the nightly QA copy (read-only, never live)
    ( set -a; . ~/ssi-restore/qa-copy.env; set +a; node tools/course-optimization/course-dump-readonly-2026-10-14.cjs ${C}_for_eng "$EV/$C-copy.json" ) \
      || { wake "WAKE: cs338 $C copy dump FAILED; nothing generated"; exit 1; }
  fi
  for R in "$@"; do
    [ -s "$EV/$C-copy-$R.json" ] || cp "$EV/$C-copy.json" "$EV/$C-copy-$R.json"
    L="$EV/gen-$C-$R.log"; FL=""; [ "${UNPACED:-0}" = 1 ] && FL=--unpaced
    for pass in 1 2 3; do # a transport/500 leaves a LEGO unsaved; the next pass picks up only those
      node $T gen $C $R "$EV/$C-copy-$R.json" 3 $FL >> "$L" 2>&1; rc=$?
      tail -n 400 "$L" | grep -q "transport/500" || break
      echo "$(date -u +%FT%TZ) chain: pass $pass had transport errors — one more pass" >> "$L"
    done
    MSG="jpn-rebuild-247 (cs #338·AL): $C $R generated"; gitpush "$DIR/$C/gen" || echo "commit/push failed (files stay on disk)"
    S=$(grep -cE ' (PASS|FLOORS-ONLY) ' "$L"); B=$(grep -c ' BLOCKED ' "$L"); P=$(grep -c WEEKLY_PACE "$L")
    [ $rc = 0 ] || { wake "WAKE: cs338 gen $C $R FAILED (exit $rc): $S kept, $B blocked; log $L"; exit 1; }
    date -u +%FT%TZ > "$EV/gen-$C-$R.done"
    wake "WAKE: cs338 gen $C $R done: $S kept, $B blocked (held, old basket stays), $P pace sleeps; log $L"
  done
  exit 0
fi

if [ "$MODE" = apply ]; then
  for R in "$@"; do
    while [ ! -f "$EV/gen-$C-$R.done" ]; do sleep 600; done
    while [ ! -f "$DIR/$C/$R.done" ]; do
      CS_AGENT=${CS_AGENT:-kai-338} bash "$DIR/night-band.sh" $C $R; rc=$?
      [ -f "$DIR/$C/$R.done" ] && break
      [ $rc = 0 ] || { echo "night-band exit $rc"; exit 1; }  # night-band already woke with the reason
      # exit 0 without .done: either the window closed (resume next night) or audio was refused (stop, never retry)
      if tail -1 "$DIR/$C/audio-runs.jsonl" 2>/dev/null | grep -q '"stop":"'; then echo "audio refused — chain stops"; exit 3; fi
      sleep 300
    done
  done
  wake "WAKE: cs338 apply $C $* — every band applied"
  exit 0
fi
echo "mode: gen|apply"; exit 64
