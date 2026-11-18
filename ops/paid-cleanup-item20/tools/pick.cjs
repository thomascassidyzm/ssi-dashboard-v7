#!/usr/bin/env node
// Item 20 resume (cs #740·AI): turn <course>/pool.json into the translation SHEET a planner fills.
// Per thin basket: take `need` English rows from the eng_for_hin pool (fresh English first, never one English twice in the
// course), slot them onto the basket's bare BUILD rows first (rewrite in place: the player skips a bare row anyway) and
// insert the rest; whatever the pool cannot cover is an `author` slot (planner writes English + known, both taught).
// The planner fills `known` (sister language, from the Hindi `hi`) and `gender` ('m'|'f'|null) on every line.
// usage: node pick.cjs <course>  -> ../<course>/sheet.json (never overwrites a filled sheet: writes sheet.new.json then)
const fs = require('fs'); const path = require('path');
const L = require('./lib.cjs');
const course = process.argv[2]; const cdir = path.join(L.ITEM_DIR, course);
const pool = JSON.parse(fs.readFileSync(path.join(cdir, 'pool.json'), 'utf8'));
const zk = (t) => L.normalizeForZUT(t, false);
const used = new Set(); const lines = [];
for (const b of pool.baskets) {
  const bare = [...(b.bare || [])];
  const take = [];
  for (const c of b.cands) { if (take.length >= b.need) break; if (c.en_elsewhere || used.has(zk(c.en))) continue; used.add(zk(c.en)); take.push(c); }
  let k = 0;
  for (const c of take) lines.push({ lego: b.lego, seed: b.seed, lego_en: b.target, lego_known: b.lego_known, slot: bare.length ? `update:${bare.shift()}` : 'insert',
    en: c.en, hi: c.hi, hin_row: c.id, known: null, gender: null, n: ++k });
  for (let i = take.length; i < b.need; i++) lines.push({ lego: b.lego, seed: b.seed, lego_en: b.target, lego_known: b.lego_known, slot: bare.length ? `update:${bare.shift()}` : 'insert',
    en: null, hi: null, hin_row: null, author: true, known: null, gender: null, n: ++k });
}
const f = path.join(cdir, fs.existsSync(path.join(cdir, 'sheet.json')) ? 'sheet.new.json' : 'sheet.json');
fs.writeFileSync(f, JSON.stringify({ course, from_pool: pool.hin_snapshot, lines }, null, 0).replace(/\},\{"lego"/g, '},\n{"lego"'));
console.log(course, 'lines', lines.length, 'from hin', lines.filter(l => !l.author).length, 'author', lines.filter(l => l.author).length,
  'rewrite bare', lines.filter(l => l.slot.startsWith('update')).length, '->', path.basename(f));
