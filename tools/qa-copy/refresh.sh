#!/usr/bin/env bash
# Refresh the read-only restored copy of the SSi database that the heavy nightly QA reads (Tom 2026-10-17: "Yes from backup").
#
# WHAT: take last night's backup (written 03:30 UTC by ~/ssi-backups/bin/ssi-db-dump.sh into s3://ssi-db-backups-popty/nightly/),
# restore it into a local Postgres 17 that listens on a UNIX SOCKET ONLY (no network), build the report indexes on the COPY only,
# and only then switch the one config file the QA units read:  $QA_COPY_HOME/qa-copy.env  (DATABASE_URL=...).
# WHY: the grouped scans over ~1M content rows / ~2.6M clips were stalling the live Supabase for everyone else; a day-old copy is
# exactly as good for a standing count and costs the live DB nothing.
# THE SWITCH: each QA unit has EnvironmentFile=-$QA_COPY_HOME/qa-copy.env (tools/qa-copy/systemd). Every QA tool already prefers
# process.env.DATABASE_URL to .env.psql, so no tool changes. Delete the file and they fall back to live; anything that must be
# live (the Popty services, learner paths) never reads it. Ad hoc: set -a; . ~/ssi-restore/qa-copy.env; set +a
# SAFE ORDER (make-before-break): build the new database beside the old one; the env file flips atomically only after the
# restore, indexes and row-count check pass; the old database is dropped last. Any failure leaves yesterday's copy serving
# and posts one notice to Watson's room.
#
# Run:  tools/qa-copy/refresh.sh            (timer: ssi-qa-copy-refresh at 03:40 UTC, waits for the dump to land)
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
QA_COPY_HOME="${QA_COPY_HOME:-$HOME/ssi-restore}"
PGBIN="${PGBIN:-$HOME/.local/pg17/bin}"
SOCK="$QA_COPY_HOME/sock"; PORT=5433; PGUSER_COPY=ssi_copy
STATUS_IN="${BACKUP_STATUS:-$HOME/ssi-backups/nightly-status.json}"
MIN_FREE_GB="${MIN_FREE_GB:-50}"           # a copy is ~15 GB, two coexist while we swap, plus the 1.1 GB dump
WAIT_MINUTES="${WAIT_MINUTES:-20}"         # how long to wait for tonight's dump to land
ENVFILE="$QA_COPY_HOME/qa-copy.env"; STATE="$QA_COPY_HOME/copy-state.json"
TODAY=$(date -u +%Y%m%d)
export LD_LIBRARY_PATH="$QA_COPY_HOME/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"   # libxml2.so.2 -> .so.16 shim (XML functions unused)
export PGHOST="$SOCK" PGPORT="$PORT" PGUSER="$PGUSER_COPY"

fail() {
  echo "qa-copy refresh FAILED: $1" >&2
  node "$HOME/command-surface/ops/watson-notice.js" "QA database copy refresh FAILED ($TODAY): $1 - yesterday's copy keeps serving; see journalctl --user -u ssi-qa-copy-refresh" ssi-qa-copy || true
  [ -n "${NEWDB:-}" ] && [ "${NEWDB:-}" != "${SERVING:-}" ] && "$PGBIN/dropdb" --if-exists "$NEWDB" 2>/dev/null
  rm -f "${DUMP:-/nonexistent}"
  exit 1
}

# 1. disk-check first
FREE_GB=$(df -P --output=avail -BG "$QA_COPY_HOME" | tail -1 | tr -dc 0-9)
[ "${FREE_GB:-0}" -ge "$MIN_FREE_GB" ] || fail "only ${FREE_GB}G free, need ${MIN_FREE_GB}G"

# 2. the server (unix socket only)
systemctl --user start ssi-qa-copy-pg.service 2>/dev/null || true
for i in $(seq 1 30); do "$PGBIN/pg_isready" -q && break; sleep 2; done
"$PGBIN/pg_isready" -q || fail "local postgres is not accepting connections on $SOCK"

# 3. wait for tonight's dump (the status file is written by the backup job at the end of its run)
KEY=""
for i in $(seq 1 $((WAIT_MINUTES * 2))); do
  if [ -f "$STATUS_IN" ]; then
    OK=$(grep -o '"ok":[a-z]*' "$STATUS_IN" | cut -d: -f2); AT=$(grep -o '"at":"[0-9]*' "$STATUS_IN" | cut -d'"' -f4)
    KEYNOW=$(grep -o '"key":"[^"]*"' "$STATUS_IN" | cut -d'"' -f4)
    if [ "$OK" = "true" ] && [ "$AT" = "$TODAY" ]; then KEY="$KEYNOW"; break; fi
  fi
  sleep 30
done
[ -n "$KEY" ] || fail "no successful backup dated $TODAY in $STATUS_IN after ${WAIT_MINUTES} min"

# 4. fetch + restore into a fresh database beside the serving one
SERVING=$(grep -o '^QA_COPY_DB=.*' "$ENVFILE" 2>/dev/null | cut -d= -f2)
STAMP="${KEY##*/ssi-db-}"; STAMP="${STAMP%.dump}"; NEWDB="ssi_copy_$(echo "$STAMP" | tr 'A-Z' 'a-z')"
[ "$NEWDB" != "$SERVING" ] || NEWDB="${NEWDB}_b"
DUMP="$QA_COPY_HOME/$(basename "$KEY")"
set -a; . "$HOME/SSi/ssi-dashboard-v7-clean/.env"; set +a
node "$HERE/fetch-dump.cjs" "$KEY" "$DUMP" || fail "download of $KEY"
"$PGBIN/dropdb" --if-exists "$NEWDB" 2>/dev/null
"$PGBIN/psql" -q -d postgres -f "$HERE/roles.sql" || fail "creating roles"
"$PGBIN/createdb" "$NEWDB" || fail "createdb $NEWDB"
# pg_restore 18 (the dump's version) into the 17 server. ~150 role/extension/policy errors are expected and harmless
# (pg_cron, pg_net, uuid-ossp are not in this build); a table that fails to load is caught below, and by the row-count check.
/usr/bin/pg_restore --no-owner --no-privileges -j4 -d "$NEWDB" "$DUMP" > "$QA_COPY_HOME/restore.log" 2>&1
if grep "COPY failed" "$QA_COPY_HOME/restore.log" | grep -qv learner_lego_pairings; then fail "a table failed to load (see $QA_COPY_HOME/restore.log)"; fi
rm -f "$DUMP"

# 5. indexes the reports need - on the COPY only
for f in 20261017b_slot_pointer_covering_idx.sql 20261017_cpp_sibling_identity_covering_idx.sql; do
  "$PGBIN/psql" -q -d "$NEWDB" -f "$REPO/database/migrations/$f" || fail "index migration $f"
done
"$PGBIN/vacuumdb" --analyze-only -j4 -d "$NEWDB" >/dev/null 2>&1 || fail "analyze"

# 6. sanity: row counts present and not collapsed against the previous copy
COUNTS=$("$PGBIN/psql" -At -F$'\t' -d "$NEWDB" -f "$HERE/counts.sql") || fail "counting rows"
echo "$COUNTS"
cnt() { echo "$COUNTS" | awk -F'\t' -v t="$1" '$1==t{print $2}'; }
prev() { [ -f "$STATE" ] && grep -o "\"$1\":[0-9]*" "$STATE" | cut -d: -f2; }
for t in course_seeds course_legos course_practice_phrases course_audio courses; do
  n=$(cnt $t); p=$(prev $t)
  [ "${n:-0}" -gt 0 ] || fail "$t restored empty"
  if [ -n "${p:-}" ] && [ "$n" -lt $((p * 95 / 100)) ]; then fail "$t shrank from $p to $n (>5%)"; fi
done

# 7. freeze read-only, flip the switch atomically, then drop every older copy
"$PGBIN/psql" -q -d postgres -v dbname="$NEWDB" -f "$HERE/freeze.sql" || fail "setting read-only default"
printf 'DATABASE_URL="postgres://%s@/%s?host=%s&port=%s"\nQA_COPY_DB=%s\nQA_COPY_BACKUP_KEY=%s\n' "$PGUSER_COPY" "$NEWDB" "$SOCK" "$PORT" "$NEWDB" "$KEY" > "$ENVFILE.tmp" && mv "$ENVFILE.tmp" "$ENVFILE"
printf '{"db":"%s","key":"%s","built":"%s"%s}\n' "$NEWDB" "$KEY" "$(date -u +%FT%TZ)" "$(echo "$COUNTS" | awk -F'\t' '{printf ",\"%s\":%s",$1,$2}')" > "$STATE"
for d in $("$PGBIN/psql" -At -d postgres -f "$HERE/list-copies.sql"); do [ "$d" = "$NEWDB" ] || "$PGBIN/dropdb" --if-exists "$d"; done
echo "qa-copy ready: $NEWDB from $KEY"
