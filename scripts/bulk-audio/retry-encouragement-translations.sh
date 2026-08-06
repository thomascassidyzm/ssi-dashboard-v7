#!/bin/bash
# Retry translation for the 8 langs that failed (rate-limited or empty response).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../temp/encouragement-migration" && pwd)"
PROMPTS="$ROOT/prompts"
OUT="$ROOT/output"
LOGS="$ROOT/logs"
mkdir -p "$OUT" "$LOGS"

LANGS="ara deu fil fin msa nld pan pol"

run_one() {
  local lang="$1"
  local prompt="$PROMPTS/${lang}.prompt.txt"
  local raw="$OUT/${lang}.raw.txt"
  local out="$OUT/${lang}.json"
  local log="$LOGS/${lang}.retry.log"
  echo "[$(date +%H:%M:%S)] retry start $lang" >> "$log"
  unset CLAUDECODE; unset CLAUDE_CODE_ENTRYPOINT; unset ANTHROPIC_API_KEY

  cat "$prompt" | claude --print --model opus --permission-mode bypassPermissions > "$raw" 2>> "$log"
  local ec=$?
  echo "[$(date +%H:%M:%S)] claude exit=$ec" >> "$log"
  if [ $ec -ne 0 ]; then echo "ERR $lang exit=$ec" >&2; return 3; fi

  node - "$raw" "$out" "$log" "$lang" <<'NODEJS'
const fs = require('fs');
const [, , raw, out, log, lang] = process.argv;
const txt = fs.readFileSync(raw, 'utf8');
const clean = txt.replace(/```(?:json)?/g, '').trim();
const start = clean.indexOf('[');
const end = clean.lastIndexOf(']');
if (start < 0 || end < start) { console.error('no JSON array'); process.exit(4); }
const json = clean.slice(start, end + 1);
let arr;
try { arr = JSON.parse(json); }
catch (e) { console.error('parse err:', e.message); fs.writeFileSync(out + '.parse_error.txt', json); process.exit(6); }
fs.writeFileSync(out, JSON.stringify(arr, null, 2));
fs.appendFileSync(log, `[${lang}] wrote ${arr.length} entries\n`);
console.log(`OK ${lang}: ${arr.length} entries`);
NODEJS
}

PIDS=""
START_TS=$(date +%s)
for lang in $LANGS; do
  echo "[enc-mig-retry] launching $lang"
  run_one "$lang" > "$LOGS/${lang}.retry.stdout" 2>&1 &
  PIDS="$PIDS $!:$lang"
done
echo "[enc-mig-retry] launched 8 jobs at $(date +%H:%M:%S)"

for entry in $PIDS; do
  pid="${entry%%:*}"; lang="${entry##*:}"
  if wait "$pid"; then echo "[enc-mig-retry] $lang -> OK"; else echo "[enc-mig-retry] $lang -> FAIL"; fi
done

echo "[enc-mig-retry] all done in $(($(date +%s) - START_TS))s"
