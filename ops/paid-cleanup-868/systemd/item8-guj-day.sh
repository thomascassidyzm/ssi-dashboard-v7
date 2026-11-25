#!/bin/bash
# cs #868 item 8B eng_for_guj by day, 25 Nov: durable checkout, waits for the night runner to finish, stops 21:30 UTC.
cd "$HOME/.cs-long/868/popty/ops/paid-cleanup-868" || exit 1
TOK=$(cat "$HOME/.cs-long/868/.tok"); export CS_CONV_TOKEN=$TOK
while systemctl --user is-active -q cs-long-keep-868-night.service; do sleep 60; done
timeout $(( $(date -u -d 'today 21:30' +%s) - $(date -u +%s) )) node tools/item8.cjs eng_for_guj --cap 120000 --evidence ledger,date,pair; rc=$?
S=$(wc -l < item8/ledger-eng_for_guj.jsonl)
node "$HOME/command-surface/tools/cs-wake-send.cjs" 1a7af9ed-9077-4f45-9354-1a5218876914 "$TOK" "WAKE: item8 guj day run ended rc=$rc ($S takes in ~/.cs-long/868/popty ledger; commit it)"
