#!/usr/bin/env bash
# A-158 full per-course sequence, in the order the ruling requires:
#   snapshot -> dry run -> verify PRE (clips alive on served bytes)
#            -> apply (one drift-guarded txn) -> reconcile to zero -> verify POST
#
# Metadata only: this moves the learner's ADDRESS for a clip, never its bytes.
# Nothing here can trigger a render. If any step suggests one is needed, stop.
#
#   ./course-sequence.sh <course>           # stops after the dry run
#   APPLY=1 ./course-sequence.sh <course>   # runs the whole sequence
set -euo pipefail
COURSE="${1:?course}"; APPLY="${APPLY:-0}"
DIR="${A158_DIR:-/tmp/a158-run}"; mkdir -p "$DIR"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH=$HOME/.local/pg17/bin:$PATH
set -a; . /home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql; set +a
SNAP="$DIR/$COURSE-snapshot.csv"

echo "######## [$COURSE] 1. SNAPSHOT"
sed "s#:'out'#'$SNAP'#" "$HERE/snapshot.sql" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v course="$COURSE" -f -
BEFORE=$(( $(wc -l < "$SNAP") - 1 ))
echo "######## [$COURSE] exposed BEFORE = $BEFORE"
[ "$BEFORE" -gt 0 ] || { echo "######## [$COURSE] nothing exposed — done"; exit 0; }

echo "######## [$COURSE] 2. DRY RUN"
DRY_RUN=1 "$HERE/bump.sh" "$COURSE" "$SNAP"

echo "######## [$COURSE] 3. VERIFY PRE (sampled clips must be alive)"
"$HERE/verify.sh" pre "$COURSE" "$SNAP" "${SAMPLE:-3}"

[ "$APPLY" = 1 ] || { echo "######## [$COURSE] dry run only; APPLY=1 to write"; exit 0; }

echo "######## [$COURSE] 4. APPLY"
DRY_RUN=0 "$HERE/bump.sh" "$COURSE" "$SNAP"

echo "######## [$COURSE] 5. RECONCILE (must be 0)"
sed "s#:'out'#'$DIR/$COURSE-residue.csv'#" "$HERE/snapshot.sql" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v course="$COURSE" -f -
AFTER=$(( $(wc -l < "$DIR/$COURSE-residue.csv") - 1 ))
echo "######## [$COURSE] residue AFTER = $AFTER"
[ "$AFTER" -eq 0 ] || { echo "######## [$COURSE] RECONCILE FAILED (residue $AFTER) — STOPPING"; exit 1; }

echo "######## [$COURSE] 6. VERIFY POST (served bytes, old and new ref)"
"$HERE/verify.sh" post "$COURSE" "$SNAP"

LEDGER=$(psql "$DATABASE_URL" -At -c "select count(*) from course_audio_revisions where source='a158-stale-cache-remediation' and course_code='$COURSE'")
echo "######## [$COURSE] DONE: bumped=$BEFORE residue=$BEFORE->$AFTER ledger_rows=$LEDGER"
printf '%s\t%s\t%s\t%s\n' "$COURSE" "$BEFORE" "$AFTER" "$LEDGER" >> "$DIR/results.tsv"
