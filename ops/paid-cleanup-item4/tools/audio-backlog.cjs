#!/usr/bin/env node
// cs #358: the audio item 4 still owes for rows it changed BEFORE the night changesets (the 18 Nov batches, por_br
// queues a/b/c and eng_for_mar b01a). Their text went live on 18 Nov; the text-change trigger emptied the side(s)
// whose words changed and no audio pass ever followed, so on the 22 Nov copy those slots are silent.
// Reads FILES ONLY: the copy snapshot (ITEM4_LIVE_DIR, copy-live.cjs) and Popty's own undo files for item 4's
// events (actor cs-item4-filler, ~/ssi-evidence/ssi-dashboard-v7/ops/course-edit-undo/<course>/). No DB, no network.
// A slot is listed when the row still exists on the copy and that slot has no clip; its words are the copy's.
// usage: ITEM4_LIVE_DIR=<dir> node audio-backlog.cjs <course>   -> <course>/changesets/backlog-358.slots.json
const fs = require('fs');
const path = require('path');
const os = require('os');
const L = require('./lib.cjs');
const course = process.argv[2];
const U = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/ops/course-edit-undo', course);
const copy = JSON.parse(fs.readFileSync(path.join(process.env.ITEM4_LIVE_DIR, `${course}.json`), 'utf8'));
const rows = new Map();
for (const s of copy.seeds) for (const l of s.legos) for (const p of l.basket_phrases) rows.set(p.id, p);
const ids = new Set(), events = [];
for (const f of fs.readdirSync(U).sort()) {
  const u = JSON.parse(fs.readFileSync(path.join(U, f), 'utf8'));
  if (u.actor !== 'cs-item4-filler') continue;
  events.push(u.event_id);
  for (const o of u.undo_ops || []) { const id = o.phrase_id || (o.row && o.row.id); if (id) ids.add(id); }
}
const slots = []; let gone = 0;
for (const id of ids) {
  const p = rows.get(id);
  if (!p) { gone++; continue; }
  if (p.phrase_role === 'component') continue;
  for (const [role, col, text] of [['known', 'known_audio_id', p.known_text], ['target1', 'target1_audio_id', p.target_text], ['target2', 'target2_audio_id', p.target_text]]) {
    if (!p[col] && text) slots.push({ phraseId: id, id, role, text, key: `${id}|${role}`, seed: p.seed_number });
  }
}
slots.sort((a, b) => a.seed - b.seed || a.key.localeCompare(b.key));
const out = path.join(L.ITEM_DIR, course, 'changesets', 'backlog-358.slots.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ course, copy_db: copy.copy_db, events: events.length, rows_touched: ids.size, rows_gone: gone,
  chars_upper: slots.reduce((a, s) => a + s.text.length, 0), slots }, null, 0));
console.log(`${course}: ${events.length} item-4 events, ${ids.size} rows, ${gone} gone since, ${slots.length} silent slots, ${slots.reduce((a, s) => a + s.text.length, 0)} chars upper bound`);
