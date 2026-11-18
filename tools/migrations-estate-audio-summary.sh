#!/usr/bin/env bash
# Applies the estate_map() precompute (database/changes/20261030_estate_map_precomputed_totals_*).
#   sudo -u popty -H tools/migrations-estate-audio-summary.sh tables     step 1: additive tables + refresh functions
#   sudo -u popty -H tools/migrations-estate-audio-summary.sh populate   one refresh per course, each capped at the app role's 8 s
#   sudo -u popty -H tools/migrations-estate-audio-summary.sh swap       step 2: estate_map() reads the summary
#   sudo -u popty -H tools/migrations-estate-audio-summary.sh rollback   restore the 20260913 estate_map(), drop the tables
# Owner login read from /etc/popty/owner.env inside this process, passed as PG* env (never argv).
set -uo pipefail
cd "$(dirname "$0")/.."
MODE="${1:?tables|populate|swap|rollback}"
D=database/changes/20261030_estate_map_precomputed_totals
OWNER_ENV="${SSI_OWNER_ENV:-/etc/popty/owner.env}"
[ -r "$OWNER_ENV" ] || OWNER_ENV="$HOME/.config/ssi-db/owner.env"
url=$(sed -n 's/^DATABASE_URL=//p' "$OWNER_ENV" 2>/dev/null | head -1 | tr -d '\r')
[[ "$url" =~ ^postgres(ql)?://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/?([^?]*) ]] || { echo "cannot parse owner.env"; exit 64; }
urldecode() { local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }
export PGUSER="$(urldecode "${BASH_REMATCH[2]}")" PGPASSWORD="$(urldecode "${BASH_REMATCH[3]}")" PGHOST="${BASH_REMATCH[4]}"
export PGPORT="${BASH_REMATCH[5]:-5432}" PGDATABASE="${BASH_REMATCH[6]:-postgres}" PGAPPNAME=popty-migration-estate-audio PGCONNECT_TIMEOUT=15
unset url
run() { psql -X -v ON_ERROR_STOP=1 -1 -f "$1"; }
case "$MODE" in
  tables)   run "${D}_1_tables.sql" ;;
  swap)     run "${D}_2_swap.sql" ;;
  rollback) run "${D}.ROLLBACK.sql" ;;
  populate)
    # The 8 s cap is the app role's limit: if a course fits here it fits there.
    export PGOPTIONS="-c statement_timeout=8000"
    fail=0
    for c in $(psql -X -At -c "select course_code from courses order by 1"); do
      out=$(psql -X -At -c "select refresh_estate_audio_course('$c')" 2>&1) || { echo "FAIL $c: $out"; fail=1; continue; }
      echo "ok $c"
    done
    psql -X -At -c "select refresh_estate_audio_dead_stubs()" || fail=1
    exit $fail ;;
  *) echo "unknown mode $MODE"; exit 64 ;;
esac
