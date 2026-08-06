#!/bin/bash
# Translate paywall messages from English into 11 known languages.
# Spawns parallel claude --print --model opus calls (one per language).
# Reads prompts from temp/paywall-expansion/prompts/{lang}.prompt.txt
# Writes outputs to temp/paywall-expansion/output/{lang}.json
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../temp/paywall-expansion" && pwd)"
mkdir -p "$ROOT/logs" "$ROOT/output"

LANGS="ara deu fra hin ita jpn kor por spa tam zho"

run_one() {
  local lang="$1"
  local prompt="$ROOT/prompts/${lang}.prompt.txt"
  local raw="$ROOT/output/${lang}.raw.txt"
  local out="$ROOT/output/${lang}.json"
  local log="$ROOT/logs/${lang}.log"

  echo "[$(date +%H:%M:%S)] start $lang" >> "$log"
  unset CLAUDECODE
  unset CLAUDE_CODE_ENTRYPOINT
  unset ANTHROPIC_API_KEY  # use CLI subscription, not API key

  cat "$prompt" | claude --print --model opus --permission-mode bypassPermissions > "$raw" 2>> "$log"
  local exit_code=$?
  echo "[$(date +%H:%M:%S)] claude exit=$exit_code for $lang" >> "$log"
  if [ $exit_code -ne 0 ]; then
    echo "ERR: claude failed for $lang" >&2
    return 3
  fi

  # Parse first [...] (JSON array) block from output
  node - "$raw" "$out" "$log" "$lang" <<'NODEJS'
const fs = require('fs');
const [, , raw, out, log, lang] = process.argv;
const txt = fs.readFileSync(raw, 'utf8');
let clean = txt.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '');
let start = clean.indexOf('[');
if (start < 0) { console.error('no JSON array'); process.exit(4); }
let depth = 0, inStr = false, esc = false, end = -1;
for (let i = start; i < clean.length; i++) {
  const c = clean[i];
  if (inStr) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === '"') inStr = false; continue; }
  if (c === '"') { inStr = true; continue; }
  if (c === '[') depth++;
  else if (c === ']') { depth--; if (depth === 0) { end = i; break; } }
}
if (end < 0) { console.error('unbalanced JSON'); process.exit(5); }
const jsonStr = clean.slice(start, end + 1);
let arr;
try { arr = JSON.parse(jsonStr); } catch (e) {
  console.error('parse error:', e.message);
  fs.writeFileSync(out + '.parse_error.txt', jsonStr);
  process.exit(6);
}
fs.writeFileSync(out, JSON.stringify(arr, null, 2));
fs.appendFileSync(log, `[${lang}] wrote ${arr.length} entries\n`);
console.log(`OK ${lang}: ${arr.length} entries`);
NODEJS
}

PIDS=""
START_TS=$(date +%s)
for lang in $LANGS; do
  echo "[paywall] launching $lang"
  run_one "$lang" > "$ROOT/logs/${lang}.stdout" 2>&1 &
  PIDS="$PIDS $!:$lang"
done
echo "[paywall] launched 11 jobs at $(date +%H:%M:%S)"

for entry in $PIDS; do
  pid="${entry%%:*}"
  lang="${entry##*:}"
  if wait "$pid"; then
    echo "[paywall] $lang -> OK at $(date +%H:%M:%S)"
  else
    echo "[paywall] $lang -> FAIL at $(date +%H:%M:%S)"
  fi
done

END_TS=$(date +%s)
echo "[paywall] all done in $((END_TS - START_TS))s"
