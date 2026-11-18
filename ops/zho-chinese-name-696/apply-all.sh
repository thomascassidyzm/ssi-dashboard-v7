#!/bin/bash
# cs #696·AI — apply the four make-before-break text batches, one after another, then check each after-state.
cd "$(dirname "$0")"
for c in "$@"; do
  python3 batch.py ${c}_for_zho ${c}_for_zho.apply.ops.json apply text
  python3 checkdry.py ${c}_for_zho out/${c}_for_zho.text.apply.json
done
echo DONE
