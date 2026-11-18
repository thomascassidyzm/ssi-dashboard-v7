#!/bin/bash
# cs #712·AI: the full fill, both courses, sequential. One render per slot, no retries of any answer (fill.cjs skips every
# slot already answered, refusals included). If Popty itself goes away mid-run (a service restart = fetch failed), the
# course is RESUMED up to 5 times once :3470 answers again; that re-asks only unanswered slots, never a refusal.
cd "$(dirname "$0")/../.."
P='cs #712·AI: fill a silent known prompt in the course own Azure voice (paid-course cleanup item 1, Kai approved 18 Nov)'
C="--dir ops/silent-fill-712 --roles known --who cs-712-tel-mar-fill --job #712·AI"
fill() { for a in 1 2 3 4 5; do
  node ops/silent-fill-694/fill.cjs run "$1" $C --voice "$2" --purpose "$P" && return 0
  echo "RESUME $1 attempt $a after crash"; for i in $(seq 1 40); do curl -sf -m5 http://localhost:3470/api/audio/voices >/dev/null && break; sleep 15; done
done; echo "GAVE UP $1"; }
fill eng_for_tel azure_te-IN-ShrutiNeural
fill eng_for_mar azure_mr-IN-ManoharNeural
