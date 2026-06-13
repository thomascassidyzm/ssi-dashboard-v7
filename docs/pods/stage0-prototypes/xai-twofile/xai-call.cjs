#!/usr/bin/env node
/**
 * xai-call.cjs — thin reusable wrapper around xAI /v1/tts for the two-file experiment.
 *
 * Loads XAI_API_KEY from the repo .env, calls the API exactly the way
 * services/tts-service.cjs generateXai() does, and writes the result mp3.
 *
 * Usage:
 *   node xai-call.cjs '<text>' <outfile.mp3> [extraJsonFields]
 *   extraJsonFields = a JSON object string merged into the request body
 *                     (used to EMPIRICALLY probe undocumented params like speed/rate).
 *
 * Read-only w.r.t. DB/repo. Costs ONE xAI call per invocation. Probe-then-retry.
 */
const fs = require('fs');
const path = require('path');

// --- load .env (XAI_API_KEY) without extra deps ---
const ENV_PATH = path.resolve(__dirname, '../../../.env');
function loadKey() {
  const raw = fs.readFileSync(ENV_PATH, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*XAI_API_KEY\s*=\s*(.+?)\s*$/);
    if (m) return m[1].replace(/^['"]|['"]$/g, '');
  }
  throw new Error('XAI_API_KEY not found in .env');
}

const VOICE_ID = 'yis75yfp'; // Manuel, Spanish (es) clone
const LANGUAGE = 'es';

async function xaiTts(text, outPath, extra = {}) {
  const apiKey = loadKey();
  const body = {
    text,
    voice_id: VOICE_ID,
    language: LANGUAGE,
    output_format: { codec: 'mp3', sample_rate: 24000, bit_rate: 128000 },
    ...extra,
  };
  const t0 = Date.now();
  const res = await fetch('https://api.x.ai/v1/tts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`xAI ${res.status}: ${errText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  const ms = Date.now() - t0;
  console.log(`OK  ${outPath}  (${buf.length} bytes, ${ms}ms)  body=${JSON.stringify(body)}`);
  return outPath;
}

if (require.main === module) {
  const [, , text, outPath, extraRaw] = process.argv;
  if (!text || !outPath) {
    console.error("usage: node xai-call.cjs '<text>' <out.mp3> [extraJson]");
    process.exit(2);
  }
  let extra = {};
  if (extraRaw) {
    try { extra = JSON.parse(extraRaw); }
    catch (e) { console.error('bad extraJson:', e.message); process.exit(2); }
  }
  xaiTts(text, outPath, extra).catch((e) => { console.error('FAIL', e.message); process.exit(1); });
}

module.exports = { xaiTts, VOICE_ID, LANGUAGE };
