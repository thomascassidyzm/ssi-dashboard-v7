#!/usr/bin/env bash
# cs #343 — chain the cym_for_kor option-D bands inside ONE night (Kai 25 Nov ~12:38Z: "Yes, go for it, but I'm happy for
# it to go faster if possible. Like, more in one night."). night-chain.sh [--dry-run]
# Runs night-band.sh per band, in order. The next band starts ONLY when the previous one read back clean (clean_readback
# below). Every guard of night-band.sh stays: its gate (UK 22:00-07:00, /health governed:true, <3 other DB writers, never on
# top of a kai-247 apply) is checked before every plan and every apply; the live pre-check holds mismatched LEGOs; the
# applier sets drifted rows aside and keeps the undo ledger. NO AUDIO, ever: so the brief's "render refusal" stop is a no-op.
# Window closes mid-chain → the band's ledger is committed, one wake, exit 0; the daily 22:25Z timer resumes next night.
# Any STOP (held, drift, unclean readback, --check failure, applier 3 strikes, crash) → wake, write chain.STOPPED and disarm
# the timer: a stopped chain never resumes by itself. To resume after a fix: rm "$EV/chain.STOPPED" and re-arm the timer.
# After 468-668 reads back clean the chain disarms its own timer.
# Wakes go to CS251_CONV with the token in CS251_TOK (600), never on argv.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
EV="$HOME/ssi-evidence/ssi-dashboard-v7/ops/cym-for-kor/rebuild-251"
BANDS=(1-100 101-200 201-300 301-467 468-668)
TIMER=cs-long-keep-251-chain.timer
CONV=${CS251_CONV:?set CS251_CONV}; TOK=${CS251_TOK:?set CS251_TOK}
DRY=; [ "${1:-}" = --dry-run ] && DRY=1
export CHAIN=1 STARTED=1 CS251_CONV CS251_TOK   # STARTED=1: the band's gate returns "closed" instead of sleeping till night
[ -n "$DRY" ] && export DRY_RUN=1
wake() { if [ -n "$DRY" ]; then echo "DRY WAKE (not sent): $1"; return; fi
  node ~/command-surface/tools/cs-wake-send.cjs "$CONV" "$(cat "$TOK")" "$1" >/dev/null 2>&1 && echo "WAKE SENT: $1" || echo "WAKE FAILED: $1"; }
disarm() { [ -n "$DRY" ] && { echo "DRY: would disarm $TIMER"; return; }; systemctl --user stop "$TIMER" 2>/dev/null; echo "disarmed $TIMER"; }
stopchain() { [ -z "$DRY" ] && echo "$(date -u +%FT%TZ) $1" > "$EV/chain.STOPPED"; wake "WAKE: cs251 chain STOPPED — $1. Timer disarmed; nothing further runs until a human clears $EV/chain.STOPPED."; disarm; exit 1; }
ukh() { TZ=Europe/London date +%H | sed 's/^0//'; }
night() { local h; h=$(ukh); [ "$h" -ge 22 ] || [ "$h" -lt 7 ]; }
jq_() { jq -r "$1" "$2" 2>/dev/null; }

# READS BACK CLEAN: verify (tool mode "verify") prints one JSON line
#   {"range","planned_inserts","inserts_missing","planned_deletes","deletes_left","fixes_not_live"}
# Clean = every planned insert is live (inserts_missing 0), every planned delete is gone (deletes_left 0 — this also
# catches LEGOs whose door rows were KEPT because an insert drifted), every Korean fix is live (fixes_not_live 0), AND the
# plan held nothing (plan.held empty: a held LEGO = live differed from the snapshot) AND the applier set no row aside
# (no chain-drift-<band>.txt). Anything else stops the chain.
clean_readback() { local R=$1 v="$EV/verify-$1.json"
  [ -s "$v" ] || return 1
  [ "$(jq_ '[.inserts_missing,.deletes_left,.fixes_not_live]|map(.==0)|all' "$v")" = true ] || return 1
  [ "$(jq_ '.held|length' "$DIR/plan-$R.json")" = 0 ] || return 1
  [ ! -s "$EV/chain-drift-$R.txt" ]; }
counts() { local R=$1 i d
  i=$(jq -s '[.[]|select(.status=="applied")|.ops|length]|add//0' "$DIR/$R.insert.changeset.jsonl.applied.jsonl" 2>/dev/null || echo 0)
  d=$(jq -s '[.[]|select(.status=="applied")|.ops|length]|add//0' "$DIR/$R.delete.changeset.jsonl.applied.jsonl" 2>/dev/null || echo 0)
  echo "insert-changeset ops applied $i (phrase inserts + Korean fixes), deletes applied $d, held $(jq_ '.held|length' "$DIR/plan-$R.json"), thin $(jq_ '.thin|length' "$DIR/plan-$R.json"), chars 0 (no audio); verify $(cat "$EV/verify-$R.json" 2>/dev/null)"; }

[ -f "$EV/chain.STOPPED" ] && [ -z "$DRY" ] && { wake "WAKE: cs251 chain refused to start: $EV/chain.STOPPED exists ($(cat "$EV/chain.STOPPED")). Timer disarmed."; disarm; exit 1; }
for R in "${BANDS[@]}"; do
  [ -z "$DRY" ] && [ -f "$EV/chain-$R.clean" ] && continue
  if ! night; then
    if [ -n "$DRY" ]; then echo "DRY: outside the window by day — the night run would start band $R here"; else
      wake "WAKE: cs251 chain: window closed before band $R; resumes next night 22:25Z"; exit 0; fi
  fi
  echo "$(date -u +%FT%TZ) chain: band $R"
  bash "$DIR/night-band.sh" "$R"; rc=$?
  msg=$(cat "$EV/${DRY:+dryrun-}chain-last-$R.txt" 2>/dev/null)
  if [ -n "$DRY" ]; then echo "DRY: band $R exit $rc. ${msg}"; echo "DRY: next band would be the one after $R, once verify-$R reads back clean"; exit $rc; fi
  case $rc in
    0)  if clean_readback "$R"; then touch "$EV/chain-$R.clean"; wake "WAKE: cs251 band $R DONE clean — $(counts "$R")"
        else stopchain "band $R did not read back clean — $(counts "$R")$( [ -s "$EV/chain-drift-$R.txt" ] && echo "; applier drift: $(tr '\n' ' ' < "$EV/chain-drift-$R.txt")")"; fi ;;
    10) wake "WAKE: cs251 chain stopped at band $R (${msg:-window closed}); resumes from the ledger next night 22:25Z"; exit 0 ;;
    *)  stopchain "band $R exit $rc: ${msg:-crash, see journalctl --user -u cs-long-keep-251-chain}" ;;
  esac
done
wake "WAKE: cs251 chain ALL FIVE BANDS DONE clean (1-668). Timer disarmed."
disarm
