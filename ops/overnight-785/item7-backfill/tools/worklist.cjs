#!/usr/bin/env node
// cs #791·AK (overnight #785 item 7): re-count the item-9 THIN-BASKETS worklist (#972·AI, copy of 19 Nov) on the
// snapshot copy-live.cjs rebuilt from a NEWER nightly copy, so authors fill what is still short today and nothing
// another job already filled. Reads JSON only (no DB). Counts the way phraseFloor/checkBuildUsePhrases do:
// a row counts when it contains the whole LEGO and is not the bare LEGO.
// usage: ITEM9_LIVE_DIR=<snapshot dir> node worklist.cjs [course …]   → <course>/worklist.json + stdout table
const fs = require('fs');
const path = require('path');
const L = require('../../../paid-cleanup-item9/tools/lib.cjs');
const { phraseFloor } = require('../../../../services/course-builder/lib/phrase-structure.cjs');
const HERE = path.resolve(__dirname, '..');
const thin = JSON.parse(fs.readFileSync(path.join(L.ROOT, 'ops/paid-cleanup-item9/THIN-BASKETS.json'), 'utf8'));
const courses = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(thin.courses);
const tot = { listed: 0, short: 0, now_at_floor: 0, gone: 0, need_build: 0, need_use: 0 };
for (const course of courses) {
  const seeds = L.loadLive(course);
  const legos = new Map(seeds.flatMap((s) => s.legos.map((l) => [l.lego_id, { s, l }])));
  const listed = [...(thin.courses[course].below_floor_above_zero || []), ...(thin.courses[course].at_floor || [])];
  const out = [];
  for (const x of thin.courses[course].below_floor_above_zero || []) {
    tot.listed++;
    const hit = legos.get(x.lego);
    if (!hit) { tot.gone++; out.push({ lego: x.lego, state: 'gone' }); continue; }
    const { s, l } = hit;
    const real = (role) => l.basket_phrases.filter((p) => p.phrase_role === role && !L.isBareLegoPhrase(p.target_text, l.target_text)
      && L.containsLego(course, s.seed_number, l.target_text, p.target_text)).length;
    const b = real('build'), u = real('use');
    const { minBuild, minUse } = phraseFloor(s.seed_number, l.lego_index);
    const nb = Math.max(0, minBuild - b), nu = Math.max(0, minUse - u);
    const textChanged = l.known_text !== x.known || l.target_text !== x.target;
    const row = { lego: x.lego, seed: s.seed_number, is_new: l.is_new, known: l.known_text, target: l.target_text, build: b, use: u,
      need_build: nb, need_use: nu, ...(textChanged ? { was: { known: x.known, target: x.target } } : {}) };
    if (!l.is_new || nb + nu === 0) { tot.now_at_floor++; row.state = l.is_new ? 'at_floor' : 'not_new'; }
    else { tot.short++; tot.need_build += nb; tot.need_use += nu; row.state = 'short'; }
    out.push(row);
  }
  fs.mkdirSync(path.join(HERE, course), { recursive: true });
  const snapMeta = JSON.parse(fs.readFileSync(path.join(L.LIVE_DIR, `${course}.json`), 'utf8'));
  fs.writeFileSync(path.join(HERE, course, 'worklist.json'), JSON.stringify({ course, copy_db: snapMeta.copy_db, copy_built: snapMeta.copy_built,
    from: 'ops/paid-cleanup-item9/THIN-BASKETS.json (#972·AI)', legos: out }, null, 1));
  const sh = out.filter((r) => r.state === 'short');
  console.log(`${course}: listed ${out.length}, short ${sh.length} (need ${sh.reduce((a, r) => a + r.need_build, 0)}B/${sh.reduce((a, r) => a + r.need_use, 0)}U), at floor ${out.filter((r) => r.state === 'at_floor').length}, gone ${out.filter((r) => r.state === 'gone').length}, text changed ${out.filter((r) => r.was).length}`);
}
console.log('TOTAL', JSON.stringify(tot));
