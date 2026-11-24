#!/usr/bin/env node
// cs #236·AL readback: for every op a changeset's ledger marks "applied", read the row back through Popty's own read
// route (GET /api/production/<course>/script-view, seeds in windows of ≤50) and confirm live holds what the op wrote:
// phrase.insert → the row exists with its words (and, with --audio, all three slots linked); phrase.delete → the row is
// gone; phrase.update → the text it set; lego.update → its is_new; audio.link → the slot holds that clip.
// No DB code, no write. Prints a one-line tally; mismatches to <file>.verify.json.
//   node verify.cjs <file.changeset.jsonl> [--audio]   exit 0 = all match · 4 = a mismatch · 1 = could not read live
'use strict';
const fs = require('fs');
const cs = require('../../../services/shared/changeset.cjs');
const { loadLedger } = require('../../../tools/changeset/apply-changeset.cjs');
const [file, ...rest] = process.argv.slice(2);
const AUDIO = rest.includes('--audio');
const { header, ops } = cs.read(file);
const course = header.course;
const led = loadLedger(`${file}.applied.jsonl`);
const seedOf = (id) => Number(/S(\d{4})/.exec(String(id))[1]);
const slotCol = { known: 'known_audio_uuid', target1: 'target1_audio_uuid', target2: 'target2_audio_uuid' };
(async () => {
  const todo = ops.map((o, i) => [o, i]).filter(([, i]) => led.get(i) === 'applied');
  const nums = [...new Set(todo.map(([o]) => seedOf(o.op === 'phrase.insert' ? o.row.id : (o.phrase_id || o.lego_id))))].sort((a, b) => a - b);
  const phrases = new Map(), legos = new Map();
  try {
    for (let i = 0; i < nums.length;) {
      let j = i; while (j + 1 < nums.length && nums[j + 1] - nums[i] < 50) j++;
      const url = `http://localhost:3470/api/production/${course}/script-view?seedStart=S${String(nums[i]).padStart(4, '0')}&seedEnd=S${String(nums[j]).padStart(4, '0')}`;
      const r = await fetch(url, { headers: { 'x-agent-id': 'kai-236-verify' }, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error(`${url} -> ${r.status}`);
      for (const s of (await r.json()).seeds || []) for (const l of s.legos || []) {
        legos.set(l.lego_id, l);
        for (const p of l.phrases || []) phrases.set(p.id, p);
      }
      i = j + 1;
    }
  } catch (e) { console.error(`verify ${header.id}: could not read live (${e.message})`); process.exit(1); }
  const bad = []; let ok = 0;
  const short = (id) => String(id).split(':').slice(1).join(':');
  const getP = (id) => phrases.get(id) || phrases.get(short(id));
  for (const [o, i] of todo) {
    let why = null;
    if (o.op === 'phrase.insert') {
      const p = getP(o.row.id);
      if (!p) why = 'inserted row not served';
      else if (p.known_text !== o.row.known_text || p.target_text !== o.row.target_text) why = 'inserted row text differs';
      else if (AUDIO && (!p.known_audio_uuid || !p.target1_audio_uuid || !p.target2_audio_uuid)) why = 'inserted row has a silent slot';
    } else if (o.op === 'phrase.delete') { if (getP(o.phrase_id)) why = 'deleted row still served'; }
    else if (o.op === 'phrase.update') {
      const p = getP(o.phrase_id);
      if (!p) why = 'updated row not served';
      else for (const [k, v] of Object.entries(o.set)) if (p[k] !== undefined && p[k] !== v) why = `${k} is "${p[k]}"`;
    } else if (o.op === 'lego.update') {
      const l = legos.get(o.lego_id);
      if (!l) why = 'LEGO not served';
      else if ('is_new' in o.set && l.is_new !== o.set.is_new) why = `is_new is ${l.is_new}`;
    } else if (o.op === 'audio.link') {
      const p = getP(o.phrase_id);
      if (!p) why = 'linked row not served';
      else if (p[slotCol[o.slot]] !== o.audio_id) why = `${o.slot} holds ${p[slotCol[o.slot]]}`;
    }
    if (why) bad.push({ i, op: o.op, id: o.phrase_id || o.lego_id || (o.row && o.row.id), why }); else ok++;
  }
  fs.writeFileSync(`${file}.verify.json`, JSON.stringify({ at: new Date().toISOString(), checked: todo.length, ok, bad }, null, 1));
  console.log(`verify ${header.id}: ${todo.length} applied op(s) read back, ${ok} match, ${bad.length} mismatch`);
  process.exit(bad.length ? 4 : 0);
})();
