#!/usr/bin/env bash
# ops/deborah-lens/dispatch-reader.sh N OF FROM TO PHRASES "NOTEBOOK_NOTE"   (env: CS_TOKEN, CS_PARENT; edit the constants per run)
set -euo pipefail
COURSE=cym_n_for_eng; COURSE_NAME="North Welsh for English speakers"; BRANCH=cs/785-deborah-lens-reader-calibration-
COURSE_KIND=${COURSE_KIND:-hand-built}
DIR=ops/deborah-lens/calibration-cym-n-100-200; VOCAB=1-200
here=$(cd "$(dirname "$0")" && pwd)
node -e '
const fs=require("fs");const [tpl,N,OF,FROM,TO,PHRASES,NOTE,COURSE,NAME,BRANCH,DIR,VOCAB,PARENT,KIND]=process.argv.slice(1);
let p=fs.readFileSync(tpl,"utf8");const m={N,OF,FROM,TO,PHRASES,NOTEBOOK_NOTE:NOTE,COURSE,COURSE_NAME:NAME,BRANCH,DIR,VOCAB,COURSE_KIND:KIND};
for(const k in m)p=p.split("{"+k+"}").join(m[k]);
console.log(JSON.stringify({cwd:"/home/tomcassidy/SSi/ssi-dashboard-v7-clean",label:`Deborah-lens relay ${N}/${OF}: ${COURSE} ${FROM}-${TO}`,prompt:p,parent:PARENT}))' \
  "$here/reader-dispatch-prompt.txt" "$1" "$2" "$3" "$4" "$5" "$6" "$COURSE" "$COURSE_NAME" "$BRANCH" "$DIR" "$VOCAB" "$CS_PARENT" "$COURSE_KIND" |
curl -s -X POST http://localhost:4317/api/dispatch -H 'Content-Type: application/json' -H "x-cs-conv: $CS_TOKEN" -d @-
