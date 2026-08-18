#!/usr/bin/env bash
# A-158 served-bytes verification. Proves the bump is ADDRESS-ONLY: the object
# must be alive before we move a ref onto it, and after the bump both the old
# bare-uuid ref and the new <uuid>.vN ref must return 200 with the SAME md5.
#
# Verifying on the row would prove nothing — this reads what the CDN actually
# serves a learner.
#
#   ./verify.sh pre  <course> <snapshot.csv> [n]   # capture pre-bump md5s
#   ./verify.sh post <course> <snapshot.csv>       # re-check the same clips
set -euo pipefail
MODE="${1:?pre|post}"; COURSE="${2:?course}"; SNAP="${3:?snapshot csv}"; N="${4:-3}"
DIR="${A158_DIR:-/tmp/a158-run}"
BASE="${A158_BASE:-https://saysomethingin.app}"
CAP="$DIR/$COURSE-verify.tsv"
mkdir -p "$DIR"

fetch() { # url -> "status md5 bytes"
  local f; f=$(mktemp)
  local st; st=$(curl -sSL --max-time 60 -o "$f" -w '%{http_code}' "$1" || echo 000)
  echo "$st $(md5sum "$f" | cut -d' ' -f1) $(stat -c%s "$f")"
  rm -f "$f"
}

if [ "$MODE" = pre ]; then
  : > "$CAP"
  # Spread the sample across the file rather than taking the head: the snapshot
  # is ordered by uuid, so head-only would sample one arbitrary corner of it.
  tail -n +2 "$SNAP" | awk -v n="$N" 'BEGIN{srand(7)} {a[NR]=$0} END{for(i=1;i<=n && i<=NR;i++) print a[int((i-0.5)*NR/n)+0]}' \
  | while IFS=, read -r id s3 rev win last; do
      r=$(fetch "$BASE/api/audio/$id")
      set -- $r
      echo "clip $id rev=$rev bare: status=$1 md5=$2 bytes=$3"
      [ "$1" = 200 ] || { echo "!! clip not alive BEFORE bump — refusing to move its address"; exit 1; }
      printf '%s\t%s\t%s\t%s\t%s\n' "$id" "$rev" "$1" "$2" "$3" >> "$CAP"
    done
  echo "captured $(wc -l < "$CAP") clips -> $CAP"
else
  fail=0
  while IFS=$'\t' read -r id rev st md5 bytes; do
    newrev=$((rev+1))
    b=$(fetch "$BASE/api/audio/$id");        set -- $b; bst=$1; bmd5=$2; bbytes=$3
    v=$(fetch "$BASE/api/audio/$id.v$newrev"); set -- $v; vst=$1; vmd5=$2; vbytes=$3
    ok=OK
    [ "$bst" = 200 ] && [ "$vst" = 200 ] && [ "$bmd5" = "$md5" ] && [ "$vmd5" = "$md5" ] || { ok=FAIL; fail=1; }
    echo "$ok $id pre=$md5 bare=$bst/$bmd5 v$newrev=$vst/$vmd5 bytes=$bytes/$bbytes/$vbytes"
  done < "$CAP"
  [ "$fail" -eq 0 ] || { echo "VERIFICATION FAILED for $COURSE"; exit 1; }
  echo "verified $COURSE: address-only, nothing went silent"
fi
