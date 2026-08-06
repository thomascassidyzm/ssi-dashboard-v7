#!/bin/bash
# Run all 56 micro-batch translations in parallel via claude --print sonnet.
# After all complete, merge each lang's 4 enc parts + 4 inst parts into one {lang}.json.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../temp/encouragement-migration" && pwd)"
PROMPTS="$ROOT/prompts-micro"
OUT="$ROOT/output-micro"
LOGS="$ROOT/logs-micro"
FINAL_OUT="$ROOT/output"
mkdir -p "$OUT" "$LOGS"

LANGS="deu fil fin msa nld pan pol"
TYPES="enc inst"
PARTS="1 2 3 4"

run_one() {
  local lang="$1"
  local type="$2"
  local part="$3"
  local prompt="$PROMPTS/${lang}.${type}.${part}.prompt.txt"
  local raw="$OUT/${lang}.${type}.${part}.raw.txt"
  local out="$OUT/${lang}.${type}.${part}.json"
  local log="$LOGS/${lang}.${type}.${part}.log"
  echo "[$(date +%H:%M:%S)] start $lang/$type/$part" >> "$log"
  unset CLAUDECODE; unset CLAUDE_CODE_ENTRYPOINT; unset ANTHROPIC_API_KEY

  cat "$prompt" | claude --print --model sonnet --permission-mode bypassPermissions > "$raw" 2>> "$log"
  local ec=$?
  echo "[$(date +%H:%M:%S)] claude exit=$ec" >> "$log"
  if [ $ec -ne 0 ]; then echo "ERR $lang/$type/$part exit=$ec" >&2; return 3; fi

  node - "$raw" "$out" "$log" "$lang" "$type" "$part" <<'NODEJS'
const fs = require('fs');
const [, , raw, out, log, lang, type, part] = process.argv;
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
fs.appendFileSync(log, `[${lang}/${type}/${part}] wrote ${arr.length} entries\n`);
console.log(`OK ${lang}/${type}/${part}: ${arr.length} entries`);
NODEJS
}

PIDS=""
START_TS=$(date +%s)
for lang in $LANGS; do
  for type in $TYPES; do
    for part in $PARTS; do
      run_one "$lang" "$type" "$part" > "$LOGS/${lang}.${type}.${part}.stdout" 2>&1 &
      PIDS="$PIDS $!:${lang}/${type}/${part}"
    done
  done
done
echo "[micro-mig] launched 56 jobs at $(date +%H:%M:%S)"

OK_COUNT=0
FAIL_COUNT=0
for entry in $PIDS; do
  pid="${entry%%:*}"; tag="${entry##*:}"
  if wait "$pid"; then OK_COUNT=$((OK_COUNT+1)); else FAIL_COUNT=$((FAIL_COUNT+1)); fi
done

echo "[micro-mig] all done in $(($(date +%s) - START_TS))s — ok=$OK_COUNT fail=$FAIL_COUNT"

# Merge each lang's 4 enc parts + 4 inst parts
echo "[micro-mig] merging..."
for lang in $LANGS; do
  node - "$OUT" "$FINAL_OUT" "$lang" <<'NODEJS'
const fs = require('fs');
const path = require('path');
const [, , outDir, finalDir, lang] = process.argv;

let enc = [], inst = [];
let encOK = true, instOK = true;
for (let i = 1; i <= 4; i++) {
  const encFile = path.join(outDir, `${lang}.enc.${i}.json`);
  if (fs.existsSync(encFile)) enc = enc.concat(JSON.parse(fs.readFileSync(encFile, 'utf8'))); else encOK = false;
  const instFile = path.join(outDir, `${lang}.inst.${i}.json`);
  if (fs.existsSync(instFile)) inst = inst.concat(JSON.parse(fs.readFileSync(instFile, 'utf8'))); else instOK = false;
}
const merged = [...enc, ...inst];
if (encOK && instOK && merged.length === 96) {
  fs.writeFileSync(path.join(finalDir, `${lang}.json`), JSON.stringify(merged, null, 2));
  console.log(`MERGED ${lang}: ${enc.length} enc + ${inst.length} inst = ${merged.length} entries`);
} else {
  console.log(`PARTIAL ${lang}: encOK=${encOK} instOK=${instOK} merged=${merged.length}/96`);
}
NODEJS
done
