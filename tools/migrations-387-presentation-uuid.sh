#!/usr/bin/env bash
# Job #387: run the course_legos.presentation_audio_id text->uuid migration overnight, unattended.
#   tools/migrations-387-presentation-uuid.sh canary     rehearse on a copy (reads live, writes canary_387 only)
#   tools/migrations-387-presentation-uuid.sh migrate    wait for the SSi promotion (#306·Q) to finish,
#                                                        then apply, retrying a busy lock up to 6 times
#   tools/migrations-387-presentation-uuid.sh rollback   put the column back to text
# Owner login from ~/.config/ssi-db/owner.env, read inside this process and passed to psql as PG*
# env (never argv). Logs to the journal of whatever unit runs it.
set -uo pipefail
cd "$(dirname "$0")/.."
MODE="${1:?canary|migrate|rollback}"
M=database/migrations/20261014b_course_legos_presentation_audio_id_uuid
PROMO_JOB=aa54c9b9-9601-444c-bc1d-29dbfba1af49   # #306·Q, woken 22:30 UTC 2026-10-14 to promote SSi
SURFACE_DB=/home/tomcassidy/command-surface/command-surface.db

url=$(sed -n 's/^DATABASE_URL=//p' "$HOME/.config/ssi-db/owner.env" | head -1 | tr -d '\r')
[[ "$url" =~ ^postgres(ql)?://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/?([^?]*) ]] || { echo "cannot parse owner.env"; exit 64; }
urldecode() { local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }
export PGUSER="$(urldecode "${BASH_REMATCH[2]}")" PGPASSWORD="$(urldecode "${BASH_REMATCH[3]}")" PGHOST="${BASH_REMATCH[4]}"
export PGPORT="${BASH_REMATCH[5]:-5432}" PGDATABASE="${BASH_REMATCH[6]:-postgres}" PGAPPNAME=popty-migration-387 PGCONNECT_TIMEOUT=15
unset url

run() { psql -X -v ON_ERROR_STOP=1 -f "$1"; }

case "$MODE" in
  canary)   run "$M.CANARY.sql" ;;
  rollback) run "$M.ROLLBACK.sql" ;;
  migrate)
    # Do not overlap the promotion: wait until #306·Q's turn that started after 22:30 UTC has ended.
    since=$(date -u -d '2026-10-14 22:30:00' +%s)000
    for i in $(seq 1 60); do
      row=$(sqlite3 -readonly "$SURFACE_DB" "select status||'|'||coalesce(ended,0) from jobs where id='$PROMO_JOB'")
      st=${row%%|*}; en=${row##*|}
      if [ "$st" != "running" ] && [ "$en" -gt "$since" ]; then echo "promotion finished (status $st)"; break; fi
      if [ "$i" = 60 ]; then echo "promotion still not finished after 3h of waiting; NOT migrating"; exit 3; fi
      echo "waiting for the promotion (#306·Q status $st)"; sleep 180
    done
    for a in 1 2 3 4 5 6; do
      out=$(run "$M.sql" 2>&1); rc=$?
      echo "$out"
      [ $rc -eq 0 ] && { echo "MIGRATION COMMITTED on attempt $a"; exit 0; }
      echo "$out" | grep -q "ALREADY-UUID" && { echo "already uuid"; exit 0; }
      echo "$out" | grep -q "lock timeout" || { echo "MIGRATION FAILED (not a lock wait), nothing committed"; exit 1; }
      echo "lock busy, retry in 5 min"; sleep 300
    done
    echo "MIGRATION NOT APPLIED: lock busy 6 times"; exit 2 ;;
  *) echo "unknown mode $MODE"; exit 64 ;;
esac
