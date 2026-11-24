#!/usr/bin/env bash
# night-apply.sh (cs #253·AL) — applies the two S0328L01B06 deletes in the night window, gated:
#   load gate: production /health must show "governed":true; writers: < 3 changeset appliers already running
#   (cap of 3 DB writers counting Kai's 22:20Z paid-cleanup run — ours makes the third at most);
#   live pre-check of row + LEGO + seed (s0328.cjs precheck) — any mismatch HOLDS, never forced.
# Prints one RESULT line last.
cd "$(dirname "$0")/../.." || exit 1
D=ops/welsh-nonsense-253
for i in $(seq 1 45); do
  gov=$(curl -s -m 30 http://localhost:3470/health | grep -c '"governed":true')
  writers=$(ps -C node -o args= | awk '$2 ~ /apply-changeset\.cjs$/' | wc -l)  # real node processes only (worker prompts quote the command)
  echo "$(date -u +%FT%TZ) try $i governed=$gov writers=$writers"
  if [ "$gov" = 1 ] && [ "${writers:-0}" -lt 3 ]; then break; fi
  [ "$i" = 45 ] && { echo "RESULT: HELD — load gate/writer cap never cleared in 90 min (governed=$gov writers=$writers)"; exit 4; }
  sleep 120
done
node $D/s0328.cjs precheck || { echo "RESULT: HELD — live pre-check mismatch (see lines above); nothing applied"; exit 3; }
rc_all=0
for c in cym_s_for_eng cym_sv2_for_eng; do
  node tools/changeset/apply-changeset.cjs $D/changeset-s0328-$c.jsonl --key kai --agent kai-253; rc=$?
  echo "$c applier exit $rc"; [ $rc -ne 0 ] && rc_all=$rc
  [ -f $D/changeset-s0328-$c.jsonl.applied.jsonl ] && cat $D/changeset-s0328-$c.jsonl.applied.jsonl
done
echo "RESULT: applier exits done (rc=$rc_all) — read the .applied.jsonl lines above for each op's fate and undo file"
exit $rc_all
