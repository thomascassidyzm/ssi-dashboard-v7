#!/bin/bash
# Translate the 128 newly-added EN keys into 22 other languages in parallel.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../temp/ssi-xlsx" && pwd)"
PROMPTS="$ROOT/en-additions-prompts"
OUT="$ROOT/en-additions-output"
LOGS="$ROOT/en-additions-logs"
mkdir -p "$OUT" "$LOGS"

LANGS="ar bn cmn cy de es eu fi fr ga gu hi it ja ko nl pa pt si ta ur yo"

run_one() {
  local lang="$1"
  local prompt="$PROMPTS/${lang}.prompt.txt"
  local raw="$OUT/${lang}.raw.txt"
  local out="$OUT/${lang}.json"
  local log="$LOGS/${lang}.log"
  echo "[$(date +%H:%M:%S)] start $lang" >> "$log"
  unset CLAUDECODE; unset CLAUDE_CODE_ENTRYPOINT; unset ANTHROPIC_API_KEY

  cat "$prompt" | claude --print --model opus --permission-mode bypassPermissions > "$raw" 2>> "$log"
  local ec=$?
  echo "[$(date +%H:%M:%S)] claude exit=$ec" >> "$log"
  if [ $ec -ne 0 ]; then echo "ERR $lang" >&2; return 3; fi

  # Robust parser: strip fences, take first { to last }, JSON.parse
  node - "$raw" "$out" "$log" "$lang" <<'NODEJS'
const fs = require('fs');
const [, , raw, out, log, lang] = process.argv;
const txt = fs.readFileSync(raw, 'utf8');
const clean = txt.replace(/```(?:json)?/g, '').trim();
const start = clean.indexOf('{');
const end = clean.lastIndexOf('}');
if (start < 0 || end < start) { console.error('no JSON object'); process.exit(4); }
const json = clean.slice(start, end + 1);
let obj;
try { obj = JSON.parse(json); }
catch (e) { console.error('parse err:', e.message); fs.writeFileSync(out + '.parse_error.txt', json); process.exit(6); }
fs.writeFileSync(out, JSON.stringify(obj, null, 2));
fs.appendFileSync(log, `[${lang}] wrote ${Object.keys(obj).length} keys\n`);
console.log(`OK ${lang}: ${Object.keys(obj).length} keys`);
NODEJS
}

PIDS=""
START_TS=$(date +%s)
for lang in $LANGS; do
  echo "[en-additions] launching $lang"
  run_one "$lang" > "$LOGS/${lang}.stdout" 2>&1 &
  PIDS="$PIDS $!:$lang"
done
echo "[en-additions] launched 22 jobs at $(date +%H:%M:%S)"

for entry in $PIDS; do
  pid="${entry%%:*}"; lang="${entry##*:}"
  if wait "$pid"; then echo "[en-additions] $lang -> OK"; else echo "[en-additions] $lang -> FAIL"; fi
done

echo "[en-additions] all done in $(($(date +%s) - START_TS))s"
