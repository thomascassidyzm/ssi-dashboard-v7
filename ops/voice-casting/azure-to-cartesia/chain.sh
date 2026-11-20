#!/usr/bin/env bash
# PACE FIX (cs #95, Kai 19 Nov). Measured on day 1's log: 93% of asks are PAID renders, each ~4.6 s whatever its length,
# ~589 asks/h. Credit burned before the Cartesia reset (23 Nov 00:00Z) is therefore asks/h x chars/ask, and the day lists
# differ ~4x in chars/ask: eng_for_tam ~38, por_for_eng ~29, day 1's jpn/kor ~11. Run in that order as ONE sequential
# writer (never two at once), each list longest-ask-first, stopping at the reset; the day-2/day-4 timers are retired.
#   bash ops/voice-casting/azure-to-cartesia/chain.sh <wake conversation id> [day order, default "2 4 1"]
# A list that ends on anything but "list complete" halts the chain: a quota/402/limit stop is never re-tried by the
# next list, and "until ... reached" is the reset. CS_CONV_TOKEN comes from the environment (systemd-run --setenv).
set -u
CONV="$1"; ORDER="${2:-2 4 1}"
cd "$(git rev-parse --show-toplevel)"
HERE=ops/voice-casting/azure-to-cartesia
EVID="$HOME/ssi-evidence/ssi-dashboard-v7/$HERE"
# The lists stop 15 min before the reset so the timed-out tam asks get their one try before it (Kai 20 Nov).
export A2C_RUN_ARGS="--order chars-desc --until ${A2C_UNTIL:-2026-11-22T23:45:00Z} --wait-day-cap"
for D in $ORDER; do
  echo "$(date -u +%FT%TZ) chain: day $D ($A2C_RUN_ARGS)"
  ENDS() { grep -c '"kind":"end"' "$EVID/day$D-results.jsonl" 2>/dev/null || echo 0; }
  BEFORE=$(ENDS)
  bash $HERE/day.sh "$D" "$CONV" >> "$EVID/day$D-unit.log" 2>&1
  if [ "$(ENDS)" = "$BEFORE" ]; then
    # day.sh stopped before the runner (wait, audio stop, census/build failure): nothing was sent, it already woke; next list.
    echo "$(date -u +%FT%TZ) chain: day $D did not reach the runner (see day$D-unit.log); next list"; continue
  fi
  STOP=$(python3 -I -c "import json,sys;r=[json.loads(l) for l in open(sys.argv[1]) if l.strip()];print([x for x in r if x.get('kind')=='end'][-1]['stop'])" "$EVID/day$D-results.jsonl")
  echo "$(date -u +%FT%TZ) chain: day $D ended: $STOP"
  case "$STOP" in "list complete") ;; until*) echo "$(date -u +%FT%TZ) chain: lists stopped at their until"; break;; *) echo "chain halted"; exit 0;; esac
done
echo "$(date -u +%FT%TZ) chain: lists done"
# ONE more try for eng_for_tam's 120 s timeouts (Kai 20 Nov), before the reset. Only after a clean finish or the until,
# never after a quota/402/limit stop (that exited above).
node $HERE/run-day.cjs --day 2 --requeue-timeouts --until 2026-11-23T00:00:00Z >> "$EVID/day2-unit.log" 2>&1
R=$(tail -1 "$EVID/day2-results.jsonl")
echo "$(date -u +%FT%TZ) chain: tam timeout re-try: $R" | cut -c1-400
node "$HOME/command-surface/tools/cs-wake-send.cjs" "$CONV" "$CS_CONV_TOKEN" "WAKE: azure-to-cartesia chain finished; tam timeout re-try: $R"
