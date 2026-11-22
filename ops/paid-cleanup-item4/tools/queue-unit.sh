#!/usr/bin/env bash
# Run one serial apply queue and wake the owning conversation when it ends (cs #759·AI).
# usage (inside a systemd-run unit with --setenv=CS_CONV_TOKEN): queue-unit.sh <course> <seedList> <tag> <convId>
cd "$(dirname "$0")/.." || exit 1
c=$1; list=$2; tag=$3; conv=$4
log="$c/queue-759-$tag.log"
node tools/run-queue.cjs "$c" "$list" 50 > "$log" 2>&1
M="WAKE: $c queue $tag ($list) finished: $(tail -1 "$log")"
node ~/command-surface/tools/cs-wake-send.cjs "$conv" "$CS_CONV_TOKEN" "$M"
