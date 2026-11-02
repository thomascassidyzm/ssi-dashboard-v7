#!/usr/bin/env bash
# Applies the two additive language_canonical rows for West Frisian (fry_for_eng).
#   sudo -u popty -H tools/migrations-20261102-language-canonical-fry.sh apply
#   sudo -u popty -H tools/migrations-20261102-language-canonical-fry.sh verify     prints canonical_language for fry and fy
#   sudo -u popty -H tools/migrations-20261102-language-canonical-fry.sh rollback
# Owner login read from /etc/popty/owner.env inside this process, passed as PG* env (never argv).
set -uo pipefail
cd "$(dirname "$0")/.."
MODE="${1:?apply|verify|rollback}"
M=database/migrations/20261102_language_canonical_fry
OWNER_ENV="${SSI_OWNER_ENV:-/etc/popty/owner.env}"
[ -r "$OWNER_ENV" ] || OWNER_ENV="$HOME/.config/ssi-db/owner.env"
url=$(sed -n 's/^DATABASE_URL=//p' "$OWNER_ENV" 2>/dev/null | head -1 | tr -d '\r')
[[ "$url" =~ ^postgres(ql)?://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/?([^?]*) ]] || { echo "cannot parse owner.env"; exit 64; }
urldecode() { local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }
export PGUSER="$(urldecode "${BASH_REMATCH[2]}")" PGPASSWORD="$(urldecode "${BASH_REMATCH[3]}")" PGHOST="${BASH_REMATCH[4]}"
export PGPORT="${BASH_REMATCH[5]:-5432}" PGDATABASE="${BASH_REMATCH[6]:-postgres}" PGAPPNAME=popty-migration-language-canonical-fry PGCONNECT_TIMEOUT=15
unset url
run() { psql -X -v ON_ERROR_STOP=1 -1 -f "$1"; }
case "$MODE" in
  apply)    run "$M.sql" ;;
  verify)   run "$M.VERIFY.sql" ;;
  rollback) run "$M.ROLLBACK.sql" ;;
  *) echo "unknown mode $MODE"; exit 64 ;;
esac
