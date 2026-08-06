#!/bin/bash
# Recovery pass for the 339 missing encouragement entries (Sonnet kept hitting the
# output token cliff on inst batches even at 12 entries). Use 6-entry chunks.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../temp/encouragement-migration" && pwd)"
RECOVERY_DIR="$ROOT/recovery"
LOGS="$RECOVERY_DIR/logs"
mkdir -p "$RECOVERY_DIR" "$LOGS"

# 1. Build all recovery prompts (in node — it's easier than bash for this)
node - "$ROOT" "$RECOVERY_DIR" <<'NODEJS' || exit 1
const fs = require('fs');
const path = require('path');
const [, , root, recoveryDir] = process.argv;
const SUB_BATCH = 6;
const needs = JSON.parse(fs.readFileSync(path.join(root, 'recovery-needs.json'), 'utf8'));
const source = JSON.parse(fs.readFileSync(path.join(root, 'eng-source.json'), 'utf8'));
const encSource = source.filter(s => s.audio_type === 'encouragement');
const instSource = source.filter(s => s.audio_type === 'instruction');

const LANGS = {
  deu: { name: 'German', style: '- Standard Hochdeutsch. Match du / Sie convention from existing de.json.' },
  fil: { name: 'Filipino (Tagalog)', style: '- Filipino/Tagalog. Polite po/opo register.' },
  fin: { name: 'Finnish', style: '- Neutral-polite Finnish.' },
  msa: { name: 'Malay (Standard)', style: '- Bahasa Melayu (standard). Polite "anda" register.' },
  nld: { name: 'Dutch', style: '- Dutch. je form (informal/warm).' },
  pan: { name: 'Punjabi', style: '- Gurmukhi script. Polite ਤੁਸੀਂ form.' },
  pol: { name: 'Polish', style: '- Standard Polish. Polite formal register (Pan/Pani).' },
};

function buildPrompt(langName, style, audioType, entries) {
  const typeLabel = audioType === 'encouragement'
    ? 'SHORT motivational lines played randomly between exercises'
    : 'LONGER pedagogical clips played in sequence at fixed points in the course';
  return `You are translating Aran's spoken-audio scripts from English to ${langName} for the SaySomethingin (SSi) language-learning mobile app. These are ${typeLabel} (${entries.length} entries — recovery pass), spoken by Aran (the founder). His tone is warm, slightly self-deprecating, encouraging — an unusually likeable presenter who talks to learners like an old friend who genuinely cares.${audioType === 'instruction' ? ' These instructions are mini-lectures.' : ''}

## Style rules
${style}

- Brand "SaySomethingin" stays in English.
- "SSi" stays as-is.
- "Aran" (founder name) stays as-is.
- Capture Aran's voice: warm, conversational, never preachy.
- Translate the FEEL, not just the words.

CRITICAL: inside JSON string values, NEVER use the ASCII straight double-quote ("). Use the language's natural typographic quotes:
- German: „ ... "
- Dutch / Polish / Finnish / Filipino / Malay: " ... "
- Punjabi: " ... " or no quotes

## Source (${entries.length} entries — JSON array)
\`\`\`json
${JSON.stringify(entries, null, 2)}
\`\`\`

## Output instructions
Output ONLY a JSON array of { sequence_within_type, audio_type, text } where each entry's sequence_within_type and audio_type match the source and text is the ${langName} translation. No prose, no markdown fences, no commentary. Every input entry must appear exactly once.
`;
}

let total = 0;
for (const [code, info] of Object.entries(LANGS)) {
  for (const type of ['enc', 'inst']) {
    const missing = needs[code]?.[type] || [];
    if (missing.length === 0) continue;
    const sourceArr = type === 'enc' ? encSource : instSource;
    const entries = missing.map(seq => sourceArr.find(e => e.sequence_within_type === seq)).filter(Boolean);

    // Chunk into SUB_BATCH-sized groups
    for (let i = 0; i < entries.length; i += SUB_BATCH) {
      const chunk = entries.slice(i, i + SUB_BATCH);
      const batchN = Math.floor(i / SUB_BATCH) + 1;
      const fname = `${code}.${type}.r${batchN}.prompt.txt`;
      fs.writeFileSync(path.join(recoveryDir, fname), buildPrompt(info.name, info.style, type === 'enc' ? 'encouragement' : 'instruction', chunk));
      total++;
    }
  }
}
console.log(`Wrote ${total} recovery prompts to ${recoveryDir}`);
NODEJS

# 2. Run all recovery prompts in parallel
LANG_TYPE_BATCHES=$(ls "$RECOVERY_DIR"/*.prompt.txt 2>/dev/null | xargs -n1 basename | sed 's/\.prompt\.txt$//')
echo "[recovery] launching $(echo "$LANG_TYPE_BATCHES" | wc -l | tr -d ' ') jobs"

run_one() {
  local key="$1"  # e.g. deu.inst.r3
  local prompt="$RECOVERY_DIR/${key}.prompt.txt"
  local raw="$RECOVERY_DIR/${key}.raw.txt"
  local out="$RECOVERY_DIR/${key}.json"
  local log="$LOGS/${key}.log"
  echo "[$(date +%H:%M:%S)] start $key" >> "$log"
  unset CLAUDECODE; unset CLAUDE_CODE_ENTRYPOINT; unset ANTHROPIC_API_KEY

  cat "$prompt" | claude --print --model sonnet --permission-mode bypassPermissions > "$raw" 2>> "$log"
  local ec=$?
  echo "[$(date +%H:%M:%S)] claude exit=$ec" >> "$log"
  if [ $ec -ne 0 ]; then echo "ERR $key exit=$ec" >&2; return 3; fi

  node - "$raw" "$out" "$log" "$key" <<'NODEJS'
const fs = require('fs');
const [, , raw, out, log, key] = process.argv;
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
fs.appendFileSync(log, `[${key}] wrote ${arr.length} entries\n`);
console.log(`OK ${key}: ${arr.length} entries`);
NODEJS
}

PIDS=""
START_TS=$(date +%s)
for key in $LANG_TYPE_BATCHES; do
  run_one "$key" > "$LOGS/${key}.stdout" 2>&1 &
  PIDS="$PIDS $!:${key}"
done
echo "[recovery] launched at $(date +%H:%M:%S)"

OK=0
FAIL=0
for entry in $PIDS; do
  pid="${entry%%:*}"; tag="${entry##*:}"
  if wait "$pid"; then OK=$((OK+1)); else FAIL=$((FAIL+1)); fi
done
echo "[recovery] all done in $(($(date +%s) - START_TS))s — ok=$OK fail=$FAIL"
