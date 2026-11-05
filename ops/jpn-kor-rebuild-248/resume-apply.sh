#!/bin/bash
# Finish a band whose live apply was killed: fresh dump -> dry (resume) -> real (resume) only if the dry run is clean.
# usage: resume-apply.sh <course> <range>   (job #248; audio for the band must already be complete)
set -u
c=$1; R=$2; T=tools/course-optimization/jpn-kor-rebuild-248-2026-11-04.cjs; E=$HOME/ssi-evidence/ssi-dashboard-v7/ops/jpn-kor-rebuild-248
node tools/agent-admin/call.cjs --key kai --agent kai-248-rebuild GET "/api/admin/phrase-v4/course/${c}_for_eng?audio=1" > $E/$c-dump-resume.json || exit 1
DUMP=$E/$c-dump-resume.json node $T apply $c $R > $E/resume-dry-$c-$R.log 2>&1
if grep -q "errors 0" $E/resume-dry-$c-$R.log && grep -q "0 LEGOs wait for audio" $E/resume-dry-$c-$R.log; then
  DUMP=$E/$c-dump-resume.json APPLY_CONFIRM=1 node $T apply $c $R > $E/resume-$c-$R.log 2>&1
else echo "STOP $c $R: resume dry run not clean" > $E/resume-$c-$R.log; fi
