#!/bin/bash
# fresh-apply.sh <course> NN... : fresh read-only dump, then apply those chunks' answers (expect-guarded). Job #272.
set -e
cd "$(dirname "$0")/../.."
c=$1; shift
D=~/ssi-evidence/ssi-dashboard-v7/ops/roman-fill-272/dump
node tools/course-optimization/course-dump-readonly-2026-10-14.cjs $c $D/$c.json
for i in 1 2 3 4 5 6; do curl -s "http://localhost:3470/api/production/$c/seeds?status=all" -o $D/$c.seeds.json; grep -q '"seeds"' $D/$c.seeds.json && break; sleep 3; done
python3 ops/roman-fill-272/apply.py $D $c "$@" --apply
