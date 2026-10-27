#!/usr/bin/env node
'use strict';
// READ-ONLY: who made these clips? For each course_audio id (a JSON file: ["<uuid>", ...] or [{audio_id}, ...])
// prints voice_id, origin, role, course, text and created_at (job #751: tells a clip that already existed from one rendered later), and groups the ids by voice. Built for job #98 (clips a text
// edit unlinked that sit on no booth voice's Re-record card). Reads by primary key through agent-db's door.
//   node tools/audio/clip-voices.cjs <ids.json> [--out result.json]
const fs = require('fs');
const { connect, clipsById } = require('../../services/shared/agent-db.cjs');

/** Group looked-up clips by voice_id; ids that returned no row are `missing`. Pure, for the test. */
function groupByVoice(ids, rows) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const voices = {};
  const missing = [];
  for (const id of [...new Set(ids)]) {
    const r = byId.get(id);
    if (!r) { missing.push(id); continue; }
    const v = r.voice_id || '(none)';
    (voices[v] ||= []).push({ id, origin: r.origin, role: r.role, course: r.course_code, language: r.language, text: r.text, s3_key: r.s3_key, created_at: r.created_at });
  }
  return { voices, missing };
}

async function main() {
  const args = process.argv.slice(2);
  const oi = args.indexOf('--out');
  const outPath = oi >= 0 ? args.splice(oi, 2)[1] : null;
  if (!args[0]) { console.error('usage: clip-voices.cjs <ids.json> [--out result.json]'); process.exit(64); }
  const raw = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  const ids = raw.map((x) => (typeof x === 'string' ? x : x.audio_id)).filter(Boolean);
  const pg = await connect({ app: 'agent:clip-voices' });
  let rows;
  try { rows = await clipsById(pg, ids); } finally { await pg.end(); }
  const res = groupByVoice(ids, rows);
  for (const [v, list] of Object.entries(res.voices)) console.log(v, list.length, 'origins:', [...new Set(list.map((c) => c.origin))].join(','));
  if (res.missing.length) console.log('missing rows:', res.missing.length);
  if (outPath) fs.writeFileSync(outPath, JSON.stringify(res, null, 1));
}
module.exports = { groupByVoice };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
