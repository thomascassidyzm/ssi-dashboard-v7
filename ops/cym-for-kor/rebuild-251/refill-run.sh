#!/usr/bin/env bash
# cs #251·AL: day pass, files only (no DB): dry-run plan each band against the snapshot, refill baskets left under the floor,
# then a whole-course dry-run plan + the extras/sample report into evidence; commit ko/, wake the job.
set -u
cd "$(dirname "$0")/../../.."
export PATH=$HOME/.local/bin:$PATH
T=tools/course-optimization/cym-for-kor-rebuild-251.cjs; D=ops/cym-for-kor/rebuild-251
EV="$HOME/ssi-evidence/ssi-dashboard-v7/ops/cym-for-kor/rebuild-251"; SNAP="$EV/cym_for_kor.json"
for R in 101-200 201-300 301-467 468-668; do
  node $T plan $R "$SNAP" 2>&1 | grep -v language-code
  node $T refill $R 2>&1 | grep -v language-code | tail -3
  node $T plan $R "$SNAP" 2>&1 | grep -v language-code
  mv $D/plan-$R.json "$EV/dry-plan-$R.json"
done
node $T plan 1-668 "$SNAP" 2>&1 | grep -v language-code; mv $D/plan-1-668.json "$EV/dry-plan-1-668.json"
python3 $D/report.py "$EV/dry-plan-1-668.json" "$EV/assign.json" "$EV/report.json" > "$EV/report-counts.txt" 2>&1
git add $D/ko && git commit -qm "cym-for-kor rebuild-251 (cs #251·AL): refill passes 101-668" && git push -q origin HEAD:cs/251-run
node ~/command-surface/tools/cs-wake-send.cjs ae1f934c-2a29-4efa-b1a3-e69bf78b6492 "$(cat ~/.cs-long/251/.tok)" "WAKE: cs251 refill + whole-course dry plan done; $(tr '\n' ' ' < "$EV/report-counts.txt" | cut -c1-600)"
