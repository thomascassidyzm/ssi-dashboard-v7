#!/usr/bin/env bash
# cs #950 night run, inside Kai's window 22:00-22:20 UTC (Kai's ita tile repair starts 22:20).
# Started by a systemd timer at 22:00:00 UTC; wakes the job with a summary when done.
#   usage: night.sh <conversation id>     (CS_CONV_TOKEN in the environment, never on argv)
# Order (re-link fix first: it is what sizes Kai's chunks; the GIN build runs alongside from the start):
#   GIN build in background ──────────────────────────────────────────────┐ (cancelled at 22:19:30)
#   save-old → measure BEFORE → verify BEFORE → apply → status → measure AFTER → verify AFTER → Popty dry runs
# Every index build is cancelled at DEADLINE_UTC rather than overlap; an INVALID re-link index is rolled back,
# an INVALID GIN index is dropped (and reported, not retried past the window).
set -uo pipefail
CONV="${1:?conversation id}"
cd "$(dirname "$0")/../.."
R="sudo -n -u popty -H tools/migrations-20261119-lego-relink-index.sh"
E="$HOME/ssi-evidence/ssi-dashboard-v7/ops/950/night-$(date -u +%Y%m%dT%H%M%SZ)"; mkdir -p "$E"
export DEADLINE_UTC=22:19:30
t() { date -u +%H:%M:%S; }
log() { echo "$(t) $*" | tee -a "$E/summary.txt"; }
step() { local name="$1"; shift; local s=$(date +%s.%N); "$@" > "$E/$name.txt" 2>&1; local rc=$?
         log "$name rc=$rc $(awk -v a="$s" -v b="$(date +%s.%N)" 'BEGIN{printf "%.1f", b-a}')s"; return $rc; }
wake() { node "$HOME/command-surface/tools/cs-wake-send.cjs" "$CONV" "$CS_CONV_TOKEN" "$1 — evidence $E (summary.txt)"; exit 0; }

# Kai's run must not be going (it is scheduled for 22:20; this is a belt-and-braces check).
if pgrep -af 'apply-changeset' | grep -v -e night.sh -e pgrep >/dev/null; then wake "NIGHT RUN NOT STARTED at $(t) UTC: an apply-changeset process is running"; fi
log "start; deadline $DEADLINE_UTC UTC"

# GIN build in the background from the first second (it does not affect the LEGO trigger measurements).
( step gin $R gin; DEADLINE_UTC= step gin-status $R status ) &
GIN_PID=$!

step save-old   $R save-old
step measure-before $R measure
step verify-before  $R verify
if step apply $R apply && DEADLINE_UTC= step status-after-apply $R status && grep -Eq 'idx_course_audio_course_role_normtext +\| t' "$E/status-after-apply.txt"; then
  log "re-link index VALID"
  step measure-after $R measure
  step verify-after  $R verify
  grep -v -e '^Time:' "$E/verify-before.txt" > "$E/verify-before.cmp"; grep -v -e '^Time:' "$E/verify-after.txt" > "$E/verify-after.cmp"
  if diff "$E/verify-before.cmp" "$E/verify-after.cmp" > "$E/verify.diff"; then log "verify: before/after IDENTICAL"
  else log "verify: DIFFERS — rolling back the re-link index"; DEADLINE_UTC= step rollback $R rollback; fi
else
  log "re-link index NOT valid/built — rolling back"; DEADLINE_UTC= step rollback $R rollback
fi

# One real end-to-end check through Popty's own edit door: DRY RUNS (rolled back), timed.
P=http://localhost:3470/api/production/ita_for_eng/edit-batch
op() { printf '{"op":"lego.update","lego_id":"%s","set":{"target_text":"%s prova950"}}' "$1" "$2"; }
ONE="{\"ops\":[$(op S0117L02 'abbiamo parlato')]}"
TEN="{\"ops\":[$(op S0117L02 'abbiamo parlato'),$(op S0117L03 "l'ultima volta"),$(op S0118L01 eravamo),$(op S0118L02 'mi sentivo'),$(op S0118L03 'al pub'),$(op S0119L01 'prima che tu vada via'),$(op S0120L01 'in autobus'),$(op S0121L01 usare),$(op S0121L02 tua),$(op S0121L03 insolito)]}"
popty() { local name="$1" body="$2"
  if [ "$(date -u +%s)" -ge "$(date -u -d "today $DEADLINE_UTC" +%s)" ]; then log "popty $name SKIPPED: past the window"; return; fi
  local s; s=$(curl -s -o "$E/popty-$name.json" -w '%{http_code} %{time_total}' -X POST "$P" -H 'Content-Type: application/json' -H 'x-agent-id: cs-950' --max-time 180 -d "$body")
  log "popty $name: http/time_s $s $(head -c 160 "$E/popty-$name.json" | tr '\n' ' ')"; }
popty 1op-a "$ONE"
popty 1op-b "$ONE"
popty 10op "$TEN"

wait "$GIN_PID"
if grep -Eq 'idx_cpp_decomposition_path +\| t' "$E/gin-status.txt" 2>/dev/null; then
  log "GIN index VALID"
  popty 10op-previewTiles "${TEN%\}},\"previewTiles\":true}"
else
  log "GIN index NOT valid (cancelled at the deadline or failed) — dropping the invalid build"
  DEADLINE_UTC= step gin-drop $R gin-drop
fi
log "done"
wake "NIGHT RUN DONE at $(t) UTC: $(grep -c . "$E/summary.txt") log lines"
