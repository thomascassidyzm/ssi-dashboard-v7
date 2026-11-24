#!/bin/bash
# cs #868 L5 item 8B resume after Popty restarts (12:31/12:35Z, 24 Nov) killed the run. Resumable ledger; on rc=1
# (Popty unreachable) wait for /health, then resume; at most 6 attempts per course. Stops 21:30 UTC.
cd /home/tomcassidy/.cs-worktrees/ssi-dashboard-v7-clean/868-paid-cleanup-limbo-finish-item5-/ops/paid-cleanup-868 || exit 1
export CS_CONV_TOKEN=$(cat ~/.cs-long/868/.tok)
out=""
for c in eng_for_pan eng_for_urd eng_for_guj; do
  for a in 1 2 3 4 5 6; do
    [ "$(date -u +%H%M)" -ge 2130 ] && { out="$out stopped for the night at $c;"; break 2; }
    timeout $(( $(date -u -d 'today 21:30' +%s) - $(date -u +%s) )) node tools/item8.cjs $c --cap 120000 --evidence ledger,date,pair; rc=$?
    [ $rc -ne 1 ] && break
    for i in $(seq 1 30); do curl -sf -m 10 http://localhost:3470/health >/dev/null && break; sleep 30; done; sleep 60
  done
  out="$out $c rc=$rc attempts=$a ($(wc -l < item8/ledger-$c.jsonl) takes);"
  [ $rc -eq 3 ] && break
done
node ~/command-surface/tools/cs-wake-send.cjs 1a7af9ed-9077-4f45-9354-1a5218876914 "$CS_CONV_TOKEN" "WAKE: item8 8B resume ended:$out"
