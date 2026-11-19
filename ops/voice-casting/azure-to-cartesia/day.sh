#!/usr/bin/env bash
# One day of the Azure → Cartesia plan v2 (cs #59), run by a systemd timer from a Popty checkout on main:
#   bash ops/voice-casting/azure-to-cartesia/day.sh N <wake conversation id>
# Order: wait for an earlier day still running → Tom's audio stop → day-of re-census on the QA copy (days 2+) →
# build that day's list → commit + push it to main → run-day.cjs → wake the conversation with the day's numbers.
# Day 1's list is the committed v2 list as it stands; day 3 has no replacement courses (kept for fixes) and is never armed.
# CS_CONV_TOKEN must be in the environment (systemd-run --setenv=CS_CONV_TOKEN, never on a command line).
set -u
DAY="$1"; CONV="$2"
cd "$(git rev-parse --show-toplevel)"
HERE=ops/voice-casting/azure-to-cartesia
EVID="$HOME/ssi-evidence/ssi-dashboard-v7/$HERE"; mkdir -p "$EVID"
WAKE() { node "$HOME/command-surface/tools/cs-wake-send.cjs" "$CONV" "$CS_CONV_TOKEN" "$1"; }
ts() { date -u +%FT%TZ; }
echo "$(ts) day $DAY starting in $(pwd) at $(git rev-parse --short HEAD)"

# An earlier day still running: wait for it (bounded 18 h: day 1 is ~34k sequential asks at ~2.3 s each), never run two at once.
for i in $(seq 1 1080); do
  busy=""
  for d in 1 2 4; do [ "$d" -lt "$DAY" ] && [ "$(systemctl --user is-active cs-long-keep-a2c-day$d.service 2>/dev/null)" = active ] && busy=$d; done
  [ -z "$busy" ] && break
  [ "$i" = 1 ] && echo "$(ts) day $busy still running; waiting"
  sleep 60
done
if [ -n "$busy" ]; then WAKE "WAKE: azure-to-cartesia day $DAY NOT run: day $busy still running after 18 h"; exit 1; fi

# Tom's audio stop. NOTE: from a cs-long unit this reads the nightly QA copy (db shim), so it is the copy's view;
# the live stop is enforced by the render route itself (STOPPED_BY_TOM stops the runner at the first ask).
STOP=$(node tools/tts-stop.cjs status 2>/dev/null | grep -m1 "stop is")
echo "$(ts) tts-stop (QA copy view): $STOP"
case "$STOP" in *"IS ON"*) WAKE "WAKE: azure-to-cartesia day $DAY NOT run: Tom's audio stop is on ($STOP)"; exit 1;; esac

if [ "$DAY" != 1 ]; then
  git fetch -q origin main && git merge -q --no-edit origin/main || { WAKE "WAKE: azure-to-cartesia day $DAY NOT run: could not merge origin/main"; exit 1; }
  OUT="$EVID/day$DAY-census"; mkdir -p "$OUT"
  COURSES=$(python3 -I -c "import re,sys;s=open('$HERE/build-days.py').read();print(','.join(sorted(set(re.findall(r\"'((?:[a-z]{3}_for_[a-z]{3}))'\",s)))))")
  ( set -a; . "$HOME/ssi-restore/qa-copy.env"; set +a; node $HERE/azure-census.cjs --courses "$COURSES" --out "$OUT/census.json" ) || { WAKE "WAKE: azure-to-cartesia day $DAY NOT run: census failed (see journal)"; exit 1; }
  python3 -I $HERE/build-days.py "$OUT/census.json" "$OUT" --batch-day "$DAY" || { WAKE "WAKE: azure-to-cartesia day $DAY NOT run: build-days failed (cap assert?)"; exit 1; }
  cp "$OUT/day$DAY-batch.jsonl" "$HERE/day$DAY-batch.jsonl"
  git add "$HERE/day$DAY-batch.jsonl"
  git commit -q -m "azure-to-cartesia day $DAY list from the day-of QA-copy census ($(python3 -I -c "import json;print(json.load(open('$OUT/census.json')).get('db'))")) (cs #59)" || true
  PUSH="pushed"
  git push -q origin HEAD:main || PUSH="PUSH FAILED (list committed locally only)"
  git push -q origin HEAD:cs/59-azure-to-cartesia-render-runner- || true
  echo "$(ts) day $DAY list: $(wc -l < $HERE/day$DAY-batch.jsonl) asks, $PUSH"
fi

# A2C_RUN_ARGS (cs #95): extra run-day.cjs options set by chain.sh (--order chars-desc --until ... --wait-day-cap).
node $HERE/run-day.cjs --day "$DAY" ${A2C_RUN_ARGS:-}
END=$(tail -1 "$EVID/day$DAY-results.jsonl")
EXTRA=""
if [ "$DAY" = 2 ]; then
  EXTRA=" | FIX AUDIO OWED (count only, published prices from fixes.json, not re-measured): $(python3 -I -c "import json;f=json.load(open('$HERE/fixes.json'))['fixes'];print('; '.join('%s %s %d'%(x['id'],x['status'],x['chars']) for x in f), '| awaiting total', sum(x['chars'] for x in f if x['status']=='awaiting'))")"
fi
WAKE "WAKE: azure-to-cartesia day $DAY finished: $END$EXTRA"
