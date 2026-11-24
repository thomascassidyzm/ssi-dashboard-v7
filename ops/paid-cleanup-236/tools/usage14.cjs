#!/usr/bin/env node
// cs #236·AL item 14: WHO ELSE USES EACH CLIP a fix would re-record. Kai's Watson, 24 Nov (before 22:20): "do NOT
// re-record a clip in place when any row linked to it is not one of the ?-fix rows (a shared clip would give question
// intonation to non-question rows)". Reads the QA-copy snapshots of EVERY course (P717_SNAP; clips are shared across up
// to 28 courses) and writes item14/<course>/clip-users.json: { <clip id>: [{course, kind, id, slot, text, q}] }, every
// seed / LEGO / phrase slot on the copy that points at a clip named in an item-14 op's `rerecord` list. `q` = that row's
// own text on that side already ends in a question mark (so question intonation is already right for it).
// audio14.cjs decides per clip at night from this plus the item-14 ledgers. No DB code.
//   P717_SNAP=<snap dir> node usage14.cjs
'use strict';
const fs = require('fs');
const path = require('path');
const cs = require('../../../services/shared/changeset.cjs');
const SNAP = path.resolve(process.env.P717_SNAP || '');
const ITEM = path.resolve(__dirname, '../item14');
const QM = /[?？؟]\s*$/;
const want = new Map();   // clip → course dir that needs it
for (const c of fs.readdirSync(ITEM)) {
  const f = path.join(ITEM, c, 'item14.changeset.jsonl');
  if (!fs.existsSync(f)) continue;
  for (const o of cs.read(f).ops) for (const s of o.rerecord || []) if (s.audio_id) want.set(s.audio_id, c);
}
const users = new Map([...want.keys()].map((k) => [k, []]));
const side = { ka: ['known', 'known_text'], t1: ['target1', 'target_text'], t2: ['target2', 'target_text'], pres: ['presentation', null] };
for (const f of fs.readdirSync(SNAP).filter((x) => x.endsWith('.json'))) {
  const d = JSON.parse(fs.readFileSync(path.join(SNAP, f), 'utf8'));
  const add = (kind, id, row) => { for (const [k, [slot, col]] of Object.entries(side)) { const a = row[k]; if (a && users.has(a)) users.get(a).push({ course: d.course, kind, id, slot, text: col ? row[col] : null, q: !!col && QM.test(String(row[col] || '').trim()) }); } };
  for (const s of d.seeds) add('seed', s.seed_number, s);
  for (const l of d.legos) add('lego', l.lego_id, l);
  for (const p of d.phrases) add('phrase', p.id, p);
}
const byCourse = {};
for (const [clip, u] of users) (byCourse[want.get(clip)] ||= {})[clip] = u;
for (const [c, m] of Object.entries(byCourse)) fs.writeFileSync(path.join(ITEM, c, 'clip-users.json'), JSON.stringify(m));
const shared = [...users.values()].filter((u) => u.length > 1).length;
console.log(`usage14: ${users.size} clips, ${shared} used by more than one slot, snapshots ${fs.readdirSync(SNAP).length}`);
