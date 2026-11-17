#!/usr/bin/env bash
# Applies database/changes/20261111_human_authored_presentations_soft_guard.sql (Tom's go, 2026-11-17, cs #434).
#   sudo -u popty -H tools/migrations-20261111-human-authored-soft-guard.sh count      row count by guard (read-only)
#   sudo -u popty -H tools/migrations-20261111-human-authored-soft-guard.sh apply      the change, its own BEGIN..COMMIT
#   sudo -u popty -H tools/migrations-20261111-human-authored-soft-guard.sh verify     probe inside BEGIN..ROLLBACK
#   sudo -u popty -H tools/migrations-20261111-human-authored-soft-guard.sh rollback   the shipped ROLLBACK
# Owner login read from /etc/popty/owner.env inside this process, passed as PG* env (never argv).
# No psql -1: each file carries its own transaction.
set -uo pipefail
cd "$(dirname "$0")/.."
MODE="${1:?count|apply|verify|rollback}"
M=database/changes/20261111_human_authored_presentations_soft_guard
OWNER_ENV="${SSI_OWNER_ENV:-/etc/popty/owner.env}"
[ -r "$OWNER_ENV" ] || OWNER_ENV="$HOME/.config/ssi-db/owner.env"
url=$(sed -n 's/^DATABASE_URL=//p' "$OWNER_ENV" 2>/dev/null | head -1 | tr -d '\r')
[[ "$url" =~ ^postgres(ql)?://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/?([^?]*) ]] || { echo "cannot parse owner.env"; exit 64; }
urldecode() { local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }
export PGUSER="$(urldecode "${BASH_REMATCH[2]}")" PGPASSWORD="$(urldecode "${BASH_REMATCH[3]}")" PGHOST="${BASH_REMATCH[4]}"
export PGPORT="${BASH_REMATCH[5]:-5432}" PGDATABASE="${BASH_REMATCH[6]:-postgres}" PGAPPNAME=popty-migration-20261111-soft-guard PGCONNECT_TIMEOUT=15
unset url
run() { psql -X -v ON_ERROR_STOP=1 -f "$1"; }
case "$MODE" in
  count)    run "$M.COUNT.sql" ;;
  apply)    run "$M.sql" ;;
  verify)   run "$M.VERIFY.sql" ;;
  rollback) run "$M.ROLLBACK.sql" ;;
  *) echo "unknown mode $MODE"; exit 64 ;;
esac
