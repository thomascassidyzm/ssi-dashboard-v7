#!/usr/bin/env bash
# cs #516·AK (for Kai's Indic a2c round): applies or rolls back ops/sql/20261122-tts-spend-job-holds.sql (cs #502·AK's job holds).
# NOT RUN by #516: per Tom's HARD RULE 2026-10-14 a tool is landed (merged to main) before anyone runs it against the DB.
# Order on the day: (1) the code that reads the new functions is on main and deployed, (2) this `apply`, (3) the flag stays off
# until Kai turns it on. The SQL is one transaction with lock_timeout 5s and a guard that refuses if the live
# tts_spend_reserve / tts_spend_totals are not the 20261025 rollup text. With no hold rows, both answer exactly as before.
# Since cs #761 (Fable review #756·AK fix 5) that guard compares md5(pg_get_functiondef) to two constants that are NOT YET
# FILLED: the first `apply` anywhere refuses and prints the md5s it found. Rehearse on the nightly QA copy first
# (SSI_OWNER_ENV=<qa-copy env> … apply), put the printed md5s into the guard after checking that copy's text is the
# 20261025 rollup, land that, rehearse again, and only then apply on live.
#   sudo -u popty -H tools/migrations-20261122-tts-spend-job-holds.sh apply
#   sudo -u popty -H tools/migrations-20261122-tts-spend-job-holds.sh rollback
# Owner login read from /etc/popty/owner.env inside this process and passed as PG* env (never argv), as
# tools/migrations-20261119-lego-relink-index.sh does. SSI_OWNER_ENV=<file> points it at the nightly QA copy for a rehearsal.
set -uo pipefail
cd "$(dirname "$0")/.."
MODE="${1:?apply|rollback}"
M=ops/sql/20261122-tts-spend-job-holds
OWNER_ENV="${SSI_OWNER_ENV:-/etc/popty/owner.env}"
[ -r "$OWNER_ENV" ] || OWNER_ENV="$HOME/.config/ssi-db/owner.env"
url=$(sed -n 's/^DATABASE_URL=//p' "$OWNER_ENV" 2>/dev/null | head -1 | tr -d '\r"'"'")
export PGAPPNAME=popty-migration-20261122-tts-spend-job-holds PGCONNECT_TIMEOUT=15
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
  apply)    psql -X "${DB_ARG[@]}" -v ON_ERROR_STOP=1 -f "$M.sql" ;;
  rollback) psql -X "${DB_ARG[@]}" -v ON_ERROR_STOP=1 -f "$M.ROLLBACK.sql" ;;
  *) echo "unknown mode $MODE"; exit 64 ;;
esac
