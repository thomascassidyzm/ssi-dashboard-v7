#!/usr/bin/env node
// Print seeds' baskets for an author, marking scan rows and today's edits, and
// record what was SEEN (seen/S####.json) so build.cjs refuses rows that moved since.
// usage: node dump.cjs <course> <from> [to]
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const [course, from, to] = process.argv.slice(2);
const lo = Number(from), hi = Number(to || from);
const seeds = L.loadLive(course);
const scan = L.scanRows(course);
const seenDir = path.join(L.ITEM_DIR, course, 'seen');
fs.mkdirSync(seenDir, { recursive: true });
for (const s of seeds) {
  if (s.seed_number < lo || s.seed_number > hi) continue;
  const seen = { seed: s.seed_number, at: new Date().toISOString(), rows: {} };
  console.log(`\nSEED ${s.seed_number}: ${s.known_text} | ${s.target_text}`);
  for (const l of s.legos) {
    console.log(` ${l.lego_id.slice(5)} ${l.is_new ? 'NEW' : 'old'} ${l.type}  ${l.known_text} | ${l.target_text}` +
      (l.components && l.components.length ? `   [${l.components.map(c => `${c.known}=${c.target}`).join('; ')}]` : ''));
    for (const p of l.basket_phrases) {
      const id = L.short(p.id);
      const f = scan.get(id);
      const tags = [f ? `*${f.family.split(' ')[0]}` : '', p.updated_at >= L.TODAY ? 'TODAY' : '',
        L.isBareLegoPhrase(p.target_text, l.target_text) ? 'bare' : '',
        p.target1_audio_id ? '' : 'noaudio'].filter(Boolean).join(',');
      console.log(`   ${id.slice(8).padEnd(4)} ${String(p.phrase_role).slice(0, 1)} ${tags.padEnd(14)} ${p.known_text} | ${p.target_text}`);
      seen.rows[id] = { known: p.known_text, target: p.target_text, updated_at: p.updated_at };
    }
  }
  fs.writeFileSync(path.join(seenDir, `S${String(s.seed_number).padStart(4, '0')}.json`), JSON.stringify(seen, null, 1));
}
