#!/usr/bin/env bash
# cs #950 (Tom's go via Watson, relay of #945·AI, 2026-11-19): the decomposition GIN index and the index that
# makes the LEGO text-edit audio re-link lookup (audio_id_for_text_same_voice) indexable. Quiet hours only.
#   sudo -u popty -H tools/migrations-20261119-lego-relink-index.sh save-old  > database/migrations/20261119b_lego_relink_live_defs_before.sql
#   ... measure    BEFORE/AFTER numbers: EXPLAIN of the lookup + rolled-back LEGO text edits (writes nothing)
#   ... verify     re-link results for a fixed sample, diffable before vs after (writes nothing)
#   ... gin        20261119_cpp_decomposition_gin_idx.sql (CREATE INDEX CONCURRENTLY) + validity
#   ... gin-drop   drop an INVALID GIN index so the build can be retried once
#   ... apply      the re-link index (CONCURRENTLY) + ANALYZE course_audio
#   ... rollback   drop the re-link index (no function was changed)
#   ... status     both indexes: present / valid / size; any running index build
# Owner login read from /etc/popty/owner.env inside this process, passed as PG* env (never argv).
# SSI_OWNER_ENV=<file> points it at another DATABASE_URL (the nightly QA copy) for a daytime rehearsal.
# No psql -1 anywhere: CREATE/DROP INDEX CONCURRENTLY refuse a transaction; the files carry their own.
set -uo pipefail
cd "$(dirname "$0")/.."
MODE="${1:?save-old|measure|verify|gin|gin-drop|apply|rollback|status}"
M=database/migrations/20261119b_lego_relink_normtext_idx
OWNER_ENV="${SSI_OWNER_ENV:-/etc/popty/owner.env}"
[ -r "$OWNER_ENV" ] || OWNER_ENV="$HOME/.config/ssi-db/owner.env"
url=$(sed -n 's/^DATABASE_URL=//p' "$OWNER_ENV" 2>/dev/null | head -1 | tr -d '\r"'"'")
[[ "$url" =~ ^postgres(ql)?://([^:]+):([^@]+)@([^:/]+):?([0-9]*)/?([^?]*) ]] || { echo "cannot parse $OWNER_ENV"; exit 64; }
urldecode() { local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }
export PGUSER="$(urldecode "${BASH_REMATCH[2]}")" PGPASSWORD="$(urldecode "${BASH_REMATCH[3]}")" PGHOST="${BASH_REMATCH[4]}"
export PGPORT="${BASH_REMATCH[5]:-5432}" PGDATABASE="${BASH_REMATCH[6]:-postgres}" PGAPPNAME=popty-migration-20261119-lego-relink PGCONNECT_TIMEOUT=15
unset url
run() { psql -X -v ON_ERROR_STOP=1 -f "$1"; }
case "$MODE" in
  save-old) run "$M.SAVE_OLD.sql" ;;
  measure)  run "$M.MEASURE.sql" ;;
  verify)   run "$M.VERIFY.sql" ;;
  gin)      run "$M.GIN.sql" ;;
  gin-drop) run "$M.GIN_DROP.sql" ;;
  apply)    run "$M.sql" ;;
  rollback) run "$M.ROLLBACK.sql" ;;
  status)   run "$M.STATUS.sql" ;;
  *) echo "unknown mode $MODE"; exit 64 ;;
esac
