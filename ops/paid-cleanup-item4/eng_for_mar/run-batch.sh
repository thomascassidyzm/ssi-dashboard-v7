#!/usr/bin/env bash
# fetch -> build -> validate -> dry -> apply one batch; stops at the first failure (cs #708·AI)
set -o pipefail; export ITEM4_OWNER=708
b=$1; f=$2; t=$3; c=eng_for_mar; ok=
# Under DB load the seeds route times out; #700·AI ruled (18 Nov): build on the 12:52Z snapshot for seeds not applied since,
# expect guards abort on any re-worded row; validate + dry stay live.
for i in 1 2; do if ../tools/fetch.sh $c >/dev/null 2>&1; then ok=1; break; fi; sleep 5; done
[ -n "$ok" ] && echo "$b: fresh fetch" || echo "$b: fetch failed, building on snapshot $(stat -c %y ~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item4/live/$c.json | cut -c1-19)"
set -e; date -u +%T
node ../tools/build.cjs $c $b $f $t 2>&1 | grep --line-buffered -v language-code
node ../tools/post.cjs validate $c $b 2>&1 | grep --line-buffered -v language-code | grep -v pre-existing
node ../tools/post.cjs dry $c $b 2>&1 | grep --line-buffered -v language-code
node ../tools/post.cjs apply $c $b 2>&1 | grep --line-buffered -v language-code
