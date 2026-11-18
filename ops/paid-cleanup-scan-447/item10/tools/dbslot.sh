#!/usr/bin/env bash
# item10 (cs #739·AI): run ONE DB-touching step (dump, baskets fetch, validate.py, dryrun.py) under the shared item-10
# lock, and only while the shared DB is quiet (<= 6 active backends in the db-watchdog's newest sample). Every item-10
# shard worker on this box queues here, so at most one of us touches the DB at a time (Kai's 18 Nov rule: <=3 DB writers).
# usage: tools/dbslot.sh <command...>     exits 75 if the DB stayed busy for 20 min (report it; do not loop by hand).
set -u
LOCK="$HOME/.cs-locks/item10-db.lock"; mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK"; flock 9
for i in $(seq 1 40); do
  f=$(ls -t "$HOME"/.local/state/db-watchdog/freezes/samples-*.jsonl 2>/dev/null | head -1)
  n=$( [ -n "$f" ] && tail -1 "$f" | python3 -I -c "import json,sys;d=json.load(sys.stdin);print(sum(a.get('count',1) for a in d.get('activity',[]) if a.get('state')=='active'))" || echo 0)
  [ "${n:-0}" -le 6 ] && { "$@"; exit $?; }
  echo "dbslot: $n active backends, waiting 30s ($i/40)" >&2; sleep 30
done
echo "dbslot: DB busy for 20 min, gave up" >&2; exit 75
