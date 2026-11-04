#!/bin/bash
# Fresh dumps, then the plan for one band: plan-band.sh <range> ["jpn"|"kor"|"jpn kor"]   (job #248)
set -u
R=$1; T=tools/course-optimization/jpn-kor-rebuild-248-2026-11-04.cjs; E=$HOME/ssi-evidence/ssi-dashboard-v7/ops/jpn-kor-rebuild-248
for c in ${2:-jpn kor}; do
  node tools/agent-admin/call.cjs --key kai --agent kai-248-rebuild GET "/api/admin/phrase-v4/course/${c}_for_eng?audio=1" > $E/$c-dump.json || exit 1
  for t in 1 2 3 4; do curl -s -m 180 localhost:3470/api/production/${c}_for_eng/seeds > $E/$c-seeds.json; [ $(stat -c%s $E/$c-seeds.json) -gt 100000 ] && break; sleep 30; done
  node $T plan $c $R $E/$c-dump.json $E/$c-seeds.json || exit 1
done
