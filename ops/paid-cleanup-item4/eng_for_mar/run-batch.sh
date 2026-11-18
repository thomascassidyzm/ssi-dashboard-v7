#!/usr/bin/env bash
# fetch -> build -> validate -> dry -> apply one batch; stops at the first failure (cs #708·AI)
set -o pipefail; export ITEM4_OWNER=708
b=$1; f=$2; t=$3; c=eng_for_mar; ok=
for i in $(seq 1 20); do if ../tools/fetch.sh $c >/dev/null; then ok=1; break; fi; echo "fetch retry $i"; sleep 30; done
[ -n "$ok" ] || { echo "FETCH FAILED $b"; exit 1; }
set -e
node ../tools/build.cjs $c $b $f $t 2>&1 | grep --line-buffered -v language-code
node ../tools/post.cjs validate $c $b 2>&1 | grep --line-buffered -v language-code | grep -v pre-existing
node ../tools/post.cjs dry $c $b 2>&1 | grep --line-buffered -v language-code
node ../tools/post.cjs apply $c $b 2>&1 | grep --line-buffered -v language-code
