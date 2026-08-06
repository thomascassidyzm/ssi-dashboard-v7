#!/bin/bash
# Run the 7-lang × 2-type split-prompt translations in parallel (14 jobs).
# After all complete, merge each lang's enc + inst outputs into one {lang}.json.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../temp/encouragement-migration" && pwd)"
PROMPTS="$ROOT/prompts-split"
OUT="$ROOT/output-split"
LOGS="$ROOT/logs-split"
FINAL_OUT="$ROOT/output"
mkdir -p "$OUT" "$LOGS"

LANGS="deu fil fin msa nld pan pol"
TYPES="enc inst"

run_one() {
  local lang="$1"
  local type="$2"
  local prompt="$PROMPTS/${lang}.${type}.prompt.txt"
  local raw="$OUT/${lang}.${type}.raw.txt"
  local out="$OUT/${lang}.${type}.json"
  local log="$LOGS/${lang}.${type}.log"
  echo "[$(date +%H:%M:%S)] start $lang/$type" >> "$log"
  unset CLAUDECODE; unset CLAUDE_CODE_ENTRYPOINT; unset ANTHROPIC_API_KEY

  cat "$prompt" | claude --print --model sonnet --permission-mode bypassPermissions > "$raw" 2>> "$log"
  local ec=$?
  echo "[$(date +%H:%M:%S)] claude exit=$ec" >> "$log"
  if [ $ec -ne 0 ]; then echo "ERR $lang/$type exit=$ec" >&2; return 3; fi

  node - "$raw" "$out" "$log" "$lang" "$type" <<'NODEJS'
const fs = require('fs');
const [, , raw, out, log, lang, type] = process.argv;
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
fs.appendFileSync(log, `[${lang}/${type}] wrote ${arr.length} entries\n`);
console.log(`OK ${lang}/${type}: ${arr.length} entries`);
NODEJS
}

PIDS=""
START_TS=$(date +%s)
for lang in $LANGS; do
  for type in $TYPES; do
    echo "[split-mig] launching $lang/$type"
    run_one "$lang" "$type" > "$LOGS/${lang}.${type}.stdout" 2>&1 &
    PIDS="$PIDS $!:${lang}/${type}"
  done
done
echo "[split-mig] launched 14 jobs at $(date +%H:%M:%S)"

for entry in $PIDS; do
  pid="${entry%%:*}"; tag="${entry##*:}"
  if wait "$pid"; then echo "[split-mig] $tag -> OK"; else echo "[split-mig] $tag -> FAIL"; fi
done

echo "[split-mig] all done in $(($(date +%s) - START_TS))s"

# Merge each lang's enc + inst into one {lang}.json under output/
echo "[split-mig] merging..."
for lang in $LANGS; do
  if [ -f "$OUT/${lang}.enc.json" ] && [ -f "$OUT/${lang}.inst.json" ]; then
    node - "$OUT/${lang}.enc.json" "$OUT/${lang}.inst.json" "$FINAL_OUT/${lang}.json" "$lang" <<'NODEJS'
const fs = require('fs');
const [, , encPath, instPath, outPath, lang] = process.argv;
const enc = JSON.parse(fs.readFileSync(encPath, 'utf8'));
const inst = JSON.parse(fs.readFileSync(instPath, 'utf8'));
const merged = [...enc, ...inst];
fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));
console.log(`MERGED ${lang}: ${enc.length} enc + ${inst.length} inst = ${merged.length} entries`);
NODEJS
  else
    echo "[split-mig] $lang: missing enc or inst, skipping merge"
  fi
done
