#!/bin/bash
# cs #696·AI — apply each chunk in order; stop the course at the first chunk that does not come back applied.
cd "$(dirname "$0")"
for c in "$@"; do
  for f in out/${c}_for_zho.chunk*.ops.json; do
    tag=$(basename $f .ops.json | sed 's/.*\.//')
    [ -f out/${c}_for_zho.$tag.apply.json ] && grep -q '"applied": true' out/${c}_for_zho.$tag.apply.json && continue
    python3 batch.py ${c}_for_zho $f apply $tag
    grep -q '"applied": true' out/${c}_for_zho.$tag.apply.json 2>/dev/null || { echo "STOP $c $tag"; break; }
  done
done
echo DONE
