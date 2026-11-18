#!/bin/bash
# usage: run.sh <course> [fillfile...]
cd /home/tomcassidy/.cs-worktrees/ssi-dashboard-v7-clean/755-item20-plan-shard-urd-pan/ops/paid-cleanup-item20/tools
c=$1; shift
for f in "$@"; do node $CS_SCRATCH/apply.cjs $c $f || exit 1; done
node sheet2plans.cjs $c 2>&1 | grep -v language-code
node build.cjs $c plan 1 700 2>&1 | grep -v -e language-code -e "not this item"
