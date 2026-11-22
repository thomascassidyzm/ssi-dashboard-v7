#!/usr/bin/env bash
# cs #233: POST one batch body to Popty's edit door. usage: post.sh <body.json> <answer.json> [apply]
# Refuses unless production /health shows dbLoadGate governed + green.
set -euo pipefail
G=$(curl -s localhost:3470/health | python3 -c "import json,sys;g=json.load(sys.stdin)['dbLoadGate'];print('ok' if g.get('governed') and g.get('level')=='green' else 'red')")
[ "$G" = ok ] || { echo "load gate not green+governed; not posting"; exit 3; }
B="$1"
if [ "${3:-}" = apply ]; then B="$1.apply"; python3 -c "import json,sys;b=json.load(open(sys.argv[1]));b['apply']=True;json.dump(b,open(sys.argv[2],'w'),ensure_ascii=False)" "$1" "$B"; fi
curl -s -X POST http://localhost:3470/api/production/fra_for_eng/edit-batch -H 'Content-Type: application/json' -H 'x-agent-id: kai-233-fra-held' -H 'x-agent-role: worker' --data-binary @"$B" -o "$2" -w '%{http_code}\n'
python3 -c "import json,sys;a=json.load(open(sys.argv[1]));print({k:a.get(k) for k in ('ok','dryRun','applied','event_id','error','code')}); [print('  ',r.get('index'),r.get('op'),r.get('error') or r.get('code')) for r in a.get('results',[]) if r.get('error') or r.get('ok') is False]" "$2"
