#!/usr/bin/env bash
# cs #128·AL (Aran's fine-tuning editor): applies or rolls back database/migrations/20261124_hand_edit_lock.sql — the hand-edit
# lock on course_legos / course_practice_phrases (columns + the a0_hand_edit_lock trigger). NOT RUN by #128: Tom's go.
# Popty's editor copes with it absent ("lock not set up yet"), so the code may land first.
#   sudo -u popty -H tools/migrations-20261124-hand-edit-lock.sh apply
#   sudo -u popty -H tools/migrations-20261124-hand-edit-lock.sh rollback
# Owner login read from /etc/popty/owner.env inside this process and passed as PG* env (never argv), as
# tools/migrations-20261119-lego-relink-index.sh does. SSI_OWNER_ENV=<file> points it at the nightly QA copy for a rehearsal.
set -uo pipefail
cd "$(dirname "$0")/.."
MODE="${1:?apply|rollback}"
M=database/migrations/20261124_hand_edit_lock
OWNER_ENV="${SSI_OWNER_ENV:-/etc/popty/owner.env}"
[ -r "$OWNER_ENV" ] || OWNER_ENV="$HOME/.config/ssi-db/owner.env"
url=$(sed -n 's/^DATABASE_URL=//p' "$OWNER_ENV" 2>/dev/null | head -1 | tr -d '\r"'"'")
export PGAPPNAME=popty-migration-20261124-hand-edit-lock PGCONNECT_TIMEOUT=15
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
