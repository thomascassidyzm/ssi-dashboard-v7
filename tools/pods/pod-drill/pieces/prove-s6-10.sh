#!/bin/bash
# A worktree carries no packages/player-vue/node_modules: symlink the shared checkout's first. PLAY_ONLY=1 skips the clip audit.
# Served proof of scenes 6-10 on staging (job #299): wait for the deploy, audit every clip, then play one scene per course, one browser at a time.
# Usage: tools/pods/pod-drill/pieces/prove-s6-10.sh <ssi-learning-app checkout> (the play probe lives in the app; the clip audit is Popty's).
AUDIT_JS="$(cd "$(dirname "$0")" && pwd)/clip-audit.cjs"
[ -n "$1" ] && [ -d "$1/packages/player-vue" ] || { echo "usage: $0 <ssi-learning-app checkout>"; exit 2; }
cd "$1" || exit 1
ROOT=$PWD; OUT=$HOME/.tmpbig/p299; mkdir -p "$OUT"
ID=$(node -e "const t=require('./packages/player-vue/src/data/podDrillPieces/spa_for_eng.json').turns;console.log(Object.values(t).at(-1)[0][2])")
for i in $(seq 1 90); do
  s=$(curl -s -m 15 -o /dev/null -w '%{http_code}' -H 'Range: bytes=0-0' "https://staging.saysomethingin.app/api/audio/$ID")
  [ "$s" = 200 ] || [ "$s" = 206 ] && break; sleep 20
done
echo "deploy check: $s"; [ "$s" = 200 ] || [ "$s" = 206 ] || exit 4
[ -n "$PLAY_ONLY" ] || { node "$AUDIT_JS" > "$OUT/clip-audit.log" 2>&1 & }
AUDIT=$!
cd packages/player-vue
play() { echo "== $1 scene $2 ${4:-chromium}"; OUT_DIR=$OUT OPEN_PLAN=1 COURSES=$1 START_SCENE=$2 END_SCENE=$2 RUN_MS=$3 BROWSER=${4:-} timeout $(( $3 / 1000 + 150 )) node e2e/_252-drill-pieces-probe.mjs 2>&1 | tail -4 | cut -c1-400; }
play spa_for_eng 9 420000
play zho_for_eng 6 300000
play ara_for_eng 6 300000
play ita_for_eng 7 240000
play eng_for_deu 8 300000
play eng_for_urd 10 300000
play zho_for_eng 7 240000 webkit
[ -n "$PLAY_ONLY" ] && exit 0
wait $AUDIT; echo "clip audit exit $?"; tail -1 "$OUT/clip-audit.log"
