#!/bin/bash
# Recovery pass v2: re-run the failed batches from recovery v1, but with --bare
# to skip the buddy hook + auto-memory + plugin sync (which were eating into the
# inner Claude's output budget and chopping responses to 1 entry).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../temp/encouragement-migration" && pwd)"
RECOVERY_DIR="$ROOT/recovery"
LOGS="$RECOVERY_DIR/logs2"
mkdir -p "$LOGS"

# Find all recovery prompts that don't have a clean .json output
KEYS=()
for prompt in "$RECOVERY_DIR"/*.prompt.txt; do
  key=$(basename "$prompt" .prompt.txt)
  out="$RECOVERY_DIR/${key}.json"
  err="$RECOVERY_DIR/${key}.json.parse_error.txt"
  if [ -f "$out" ] && ! [ -f "$err" ]; then continue; fi  # already done cleanly
  KEYS+=("$key")
done

echo "[recovery2] retrying ${#KEYS[@]} failed batches with --bare"

run_one() {
  local key="$1"
  local prompt="$RECOVERY_DIR/${key}.prompt.txt"
  local raw="$RECOVERY_DIR/${key}.raw2.txt"
  local out="$RECOVERY_DIR/${key}.json"
  local err="$RECOVERY_DIR/${key}.json.parse_error.txt"
  local log="$LOGS/${key}.log"
  echo "[$(date +%H:%M:%S)] start $key (--bare)" >> "$log"
  unset CLAUDECODE; unset CLAUDE_CODE_ENTRYPOINT; unset ANTHROPIC_API_KEY

  cat "$prompt" | claude --print --bare --model sonnet --permission-mode bypassPermissions > "$raw" 2>> "$log"
  local ec=$?
  echo "[$(date +%H:%M:%S)] claude exit=$ec" >> "$log"
  if [ $ec -ne 0 ]; then echo "ERR $key exit=$ec" >&2; return 3; fi

  node - "$raw" "$out" "$err" "$log" "$key" <<'NODEJS'
const fs = require('fs');
const [, , raw, out, err, log, key] = process.argv;
const txt = fs.readFileSync(raw, 'utf8');
const clean = txt.replace(/```(?:json)?/g, '').trim();
const start = clean.indexOf('[');
const end = clean.lastIndexOf(']');
if (start < 0 || end < start) { console.error('no JSON array'); process.exit(4); }
const json = clean.slice(start, end + 1);
let arr;
try { arr = JSON.parse(json); }
catch (e) { console.error('parse err:', e.message); fs.writeFileSync(err, json); process.exit(6); }
fs.writeFileSync(out, JSON.stringify(arr, null, 2));
// If we wrote a clean JSON, remove the old parse_error file if present
try { fs.unlinkSync(err); } catch {}
fs.appendFileSync(log, `[${key}] wrote ${arr.length} entries (--bare)\n`);
console.log(`OK ${key}: ${arr.length} entries`);
NODEJS
}

PIDS=""
START_TS=$(date +%s)
for key in "${KEYS[@]}"; do
  run_one "$key" > "$LOGS/${key}.stdout" 2>&1 &
  PIDS="$PIDS $!:${key}"
done
echo "[recovery2] launched at $(date +%H:%M:%S)"

OK=0
FAIL=0
for entry in $PIDS; do
  pid="${entry%%:*}"; tag="${entry##*:}"
  if wait "$pid"; then OK=$((OK+1)); else FAIL=$((FAIL+1)); fi
done
echo "[recovery2] all done in $(($(date +%s) - START_TS))s — ok=$OK fail=$FAIL"
