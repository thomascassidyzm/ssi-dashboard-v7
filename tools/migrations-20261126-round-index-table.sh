#!/usr/bin/env bash
# cs #533·AL: applies or rolls back ops/sql/20261126-round-index-table.sql — course_round_index becomes a table
# rebuilt one course at a time, so a content write no longer rebuilds the round map for every course.
# Per Tom's HARD RULE 2026-10-14 this runner is landed (merged to main) before anyone runs it; the live apply is
# Tom's go. services/shared/round-index-refresh.cjs works before and after, so code and schema can land in any order.
#   sudo -u popty -H tools/migrations-20261126-round-index-table.sh dry           # whole apply, then ROLLBACK
#   sudo -u popty -H tools/migrations-20261126-round-index-table.sh apply
#   sudo -u popty -H tools/migrations-20261126-round-index-table.sh rollback-dry
#   sudo -u popty -H tools/migrations-20261126-round-index-table.sh rollback
# Owner login read from /etc/popty/owner.env inside this process and passed as PG* env (never argv), as
# tools/migrations-20261122-tts-spend-job-holds.sh does. SSI_OWNER_ENV=<file> points it at the nightly QA copy for a rehearsal.
set -uo pipefail
cd "$(dirname "$0")/.."
MODE="${1:?dry|apply|rollback-dry|rollback}"
M=ops/sql/20261126-round-index-table
OWNER_ENV="${SSI_OWNER_ENV:-/etc/popty/owner.env}"
[ -r "$OWNER_ENV" ] || OWNER_ENV="$HOME/.config/ssi-db/owner.env"
url=$(sed -n 's/^DATABASE_URL=//p' "$OWNER_ENV" 2>/dev/null | head -1 | tr -d '\r"'"'")
export PGAPPNAME=popty-migration-20261126-round-index-table PGCONNECT_TIMEOUT=15
DB_ARG=()
if [[ "$url" =~ ^postgres(ql)?://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/?([^?]*) ]]; then
  urldecode() { local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }
  export PGUSER="$(urldecode "${BASH_REMATCH[2]}")" PGPASSWORD="$(urldecode "${BASH_REMATCH[3]}")" PGHOST="${BASH_REMATCH[4]}"
  export PGPORT="${BASH_REMATCH[5]:-5432}" PGDATABASE="${BASH_REMATCH[6]:-postgres}"
elif [[ "$url" =~ ^postgres(ql)?://[^:@/]*@ ]]; then
  DB_ARG=(-d "$url")   # password-less socket URI (the QA copy): nothing secret on argv
else
  echo "cannot parse $OWNER_ENV"; exit 64
fi
unset url
case "$MODE" in
  dry)          psql -X "${DB_ARG[@]}" -v ON_ERROR_STOP=1 -f "$M.sql" ;;
  apply)        psql -X "${DB_ARG[@]}" -v ON_ERROR_STOP=1 -v finish=COMMIT -f "$M.sql" ;;
  rollback-dry) psql -X "${DB_ARG[@]}" -v ON_ERROR_STOP=1 -f "$M.ROLLBACK.sql" ;;
  rollback)     psql -X "${DB_ARG[@]}" -v ON_ERROR_STOP=1 -v finish=COMMIT -f "$M.ROLLBACK.sql" ;;
  *) echo "unknown mode $MODE"; exit 64 ;;
esac
