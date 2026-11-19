#!/usr/bin/env bash
# item10 (cs #739·AI): run ONE DB-touching step (dump, baskets fetch, validate.py, dryrun.py) under the shared item-10
# lock, and only while the shared DB is quiet (<= 6 active backends in the db-watchdog's newest sample). Every item-10
# shard worker on this box queues here, so at most one of us touches the DB at a time (Kai's 18 Nov rule: <=3 DB writers).
# usage: tools/dbslot.sh <command...>     exits 75 if the DB stayed busy for 20 min (report it; do not loop by hand).
set -u
# cs #968·AI (19 Nov INCIDENT 3): REFUSED unless the FIRST two arguments are  --live-ok '<why>'  AND it is 22:00-07:00
# Europe/London (ops/paid_cleanup_livegate.py; exit 77, before any curl or lock). Only this refusal was added; the rest of
# dbslot is unchanged. The step it runs carries its own --live-ok:  dbslot.sh --live-ok '<why>' python3 -I tools/dryrun.py <course> --live-ok '<why>'
if [ "${1:-}" = "--live-ok" ]; then __why="${2:-}"; shift; [ $# -gt 0 ] && shift; else __why=""; fi
python3 -I "$(dirname "$(readlink -f "$0")")/../../../paid_cleanup_livegate.py" "dbslot.sh ${*:-}" ${__why:+--live-ok "$__why"} || exit $?
LOCK="$HOME/.cs-locks/item10-db.lock"; mkdir -p "$(dirname "$LOCK")"
# Tom 18 Nov 19:57Z: never hammer the shared store. Nothing passes until Popty's load gate is governed AND Tom's Watson
# has said writers may resume (recorded by a person as the file below). Until then every step is refused with 75.
g=$(curl -s -m 10 http://localhost:3470/health | python3 -I -c "import json,sys;print((json.load(sys.stdin).get('dbLoadGate') or {}).get('governed'))" 2>/dev/null)
if [ "$g" != "True" ] || [ ! -f "$HOME/.cs-locks/item10-writers-may-resume" ]; then
  echo "dbslot: REFUSED — store paused (Tom 18 Nov 19:57Z); load gate governed=$g; no go-file. Record the step as pending." >&2; exit 75
fi
exec 9>"$LOCK"; flock 9
for i in $(seq 1 40); do
  f=$(ls -t "$HOME"/.local/state/db-watchdog/freezes/samples-*.jsonl 2>/dev/null | head -1)
  n=$( [ -n "$f" ] && tail -1 "$f" | python3 -I -c "import json,sys;d=json.load(sys.stdin);print(sum(a.get('count',1) for a in d.get('activity',[]) if a.get('state')=='active'))" || echo 0)
  [ "${n:-0}" -le 6 ] && { "$@"; exit $?; }
  echo "dbslot: $n active backends, waiting 30s ($i/40)" >&2; sleep 30
done
echo "dbslot: DB busy for 20 min, gave up" >&2; exit 75
