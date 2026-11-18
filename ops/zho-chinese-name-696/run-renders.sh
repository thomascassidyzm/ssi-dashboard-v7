#!/bin/bash
# cs #696·AI — serial real renders, one course after another (never fanned out); cap tracked across courses.
cd "$(dirname "$0")"
for c in "$@"; do
  spent=$(python3 -c "import json,glob;print(sum(x.get('chars',0) for f in glob.glob('*.audio-real.json') for x in json.load(open(f)) if x.get('source')=='rendered'))")
  left=$((10000 - spent)); echo "== $c spent-so-far $spent left $left"
  [ $left -le 0 ] && { echo CAP_REACHED; break; }
  python3 audio.py $c real $left $PRES_VOICE
done
echo DONE
