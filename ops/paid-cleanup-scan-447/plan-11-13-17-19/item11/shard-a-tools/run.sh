#!/bin/bash
# usage: run.sh <course>  — decisions -> plan -> validate -> control -> dryrun -> price
c=$1; D=$CS_SCRATCH/dumps/$c.json
python3 -I item11/decisions/$c.py || exit 1
python3 -I tools/plan.py item11 $c $D 2>&1 | grep -v "mein Herr\|gnädige Frau\|signor\|señor\|senhor\|monsieur\|madame" | tail -${2:-12}
python3 -I tools/validate.py item11 $c $D 2>&1 | tail -1
python3 -I item11/control.py item11 $c $D 2>&1 | grep "REAL\|issues added"
python3 -I tools/dryrun.py item11 $c --chunk 50 2>&1 | cut -c1-260
python3 -I tools/price.py item11 $c 2>&1 | tail -3
