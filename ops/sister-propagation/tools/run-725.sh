#!/bin/bash
# cs #725·AI: finish #702·AI one course at a time: live -> audio real (resume) -> ops -> dry -> apply -> readback.
# Stops a course at its first failure and moves on; never applies a course whose dry run is not all ok.
cd "$(dirname "$0")/.."
export SP_LEDGER=$PWD/budget-725.json SP_CAP=45000 SP_SLEEP=1.5
dbload() { f=$(ls -t ~/.local/state/db-watchdog/freezes/samples-*.jsonl 2>/dev/null | head -1); [ -z "$f" ] && echo 0 && return
  tail -1 "$f" | python3 -c "import json,sys;d=json.loads(sys.stdin.read());print(sum(a.get('count',0) for a in d.get('activity',[]) if a.get('state')=='active'))"; }
gate() { for i in $(seq 1 60); do n=$(dbload); [ "$n" -le 6 ] && return 0; echo "DB busy ($n active), waiting"; sleep 60; done; echo "DB busy for 1h"; return 1; }
okdry() { python3 -c "import json,sys;D=json.load(open('$1/$2.json'));sys.exit(0 if D and all(b['status']==200 and b['result'].get('ok') for b in D) else 1)"; }
for d in "$@"; do
  echo "=== $d $(date -u +%T)"
  gate || { echo "STOP $d db"; continue; }
  python3 tools/sp.py live $d || { echo "STOP $d live"; continue; }
  python3 tools/sp.py audio $d real || { echo "STOP $d audio"; continue; }
  python3 tools/sp.py ops $d || { echo "STOP $d ops (missing clip)"; continue; }
  python3 tools/sp.py post $d dry; okdry $d dry || { echo "STOP $d dry not clean"; continue; }
  gate || { echo "STOP $d db"; continue; }
  python3 tools/sp.py post $d apply; okdry $d apply || echo "WARN $d apply not all ok"
  python3 tools/sp.py readback $d
  echo "DONE $d"
done
