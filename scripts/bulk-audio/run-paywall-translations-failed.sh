#!/bin/bash
# Re-run only the 4 failed paywall translations (deu, zho, lit, pan).
# Prompts now include the explicit "use typographic quotes, not ASCII" rule.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../temp/paywall-expansion" && pwd)"
mkdir -p "$ROOT/logs" "$ROOT/output"

LANGS="deu zho lit pan"

run_one() {
  local lang="$1"
  local prompt="$ROOT/prompts/${lang}.prompt.txt"
  local raw="$ROOT/output/${lang}.raw.txt"
  local out="$ROOT/output/${lang}.json"
  local log="$ROOT/logs/${lang}.log"

  echo "[$(date +%H:%M:%S)] start $lang (retry)" >> "$log"
  unset CLAUDECODE; unset CLAUDE_CODE_ENTRYPOINT; unset ANTHROPIC_API_KEY

  cat "$prompt" | claude --print --model opus --permission-mode bypassPermissions > "$raw" 2>> "$log"
  local exit_code=$?
  echo "[$(date +%H:%M:%S)] claude exit=$exit_code for $lang" >> "$log"
  if [ $exit_code -ne 0 ]; then echo "ERR: claude failed for $lang" >&2; return 3; fi

  # Robust parser: strip fences, take first [ to last ], then JSON.parse
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
  echo "[paywall-retry] launching $lang"
  run_one "$lang" > "$ROOT/logs/${lang}.stdout" 2>&1 &
  PIDS="$PIDS $!:$lang"
done
echo "[paywall-retry] launched 4 jobs at $(date +%H:%M:%S)"

for entry in $PIDS; do
  pid="${entry%%:*}"; lang="${entry##*:}"
  if wait "$pid"; then echo "[paywall-retry] $lang -> OK"; else echo "[paywall-retry] $lang -> FAIL"; fi
done

echo "[paywall-retry] all done in $(($(date +%s) - START_TS))s"
