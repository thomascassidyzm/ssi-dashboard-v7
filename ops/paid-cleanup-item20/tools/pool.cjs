#!/usr/bin/env node
// Item 20 resume (cs #740·AI): English candidate pool for every todo basket of <course>, taken from eng_for_hin
// (repaired by #943·H; same English target side). A candidate is any eng_for_hin build/use row whose English
//  - contains the sister LEGO (course-builder containsLego) and is not the bare LEGO,
//  - uses only English the SISTER learner has been taught by this LEGO (checkVocabViolations, as build.cjs),
//  - is not already a row of this basket, and is not the English of another sister row whose known differs (ZUT risk flagged).
// Reads local JSON only (live sister dump + #717 QA-copy snapshot of eng_for_hin). No DB access.
// usage: node pool.cjs <course>  -> ../<course>/pool.json + summary
const fs = require('fs'); const path = require('path'); const os = require('os');
const L = require('./lib.cjs');
const course = process.argv[2];
const cdir = path.join(L.ITEM_DIR, course);
const hin = JSON.parse(fs.readFileSync(path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-717/snap/eng_for_hin.json'), 'utf8'));
const wl = JSON.parse(fs.readFileSync(path.join(cdir, 'worklist.json'), 'utf8'));
const todo = new Map(wl.todo.map(e => [e.lego, e]));
const seeds = L.loadLive(course);
const zk = (t) => L.normalizeForZUT(t, false);
const hrows = hin.phrases.filter(p => ['build', 'use'].includes(p.phrase_role)).map(p => ({ id: p.id.split(':')[1], seed: p.seed_number, hi: p.known_text, en: p.target_text }));
const enInCourse = new Map();
for (const s of seeds) for (const l of s.legos) for (const p of l.basket_phrases) enInCourse.set(zk(p.target_text), L.short(p.id));
const vocab = new Set(); const out = []; const quiet = console.log;
for (const s of seeds) {
  const vocabHere = new Set(vocab);
  for (const l of s.legos) {
    L.accumulate([l], vocabHere, false);
    const e = todo.get(l.lego_id); if (!e) continue;
    const have = new Set(l.basket_phrases.map(p => zk(p.target_text)));
    const cands = []; const seen = new Set();
    for (const h of hrows) {
      const k = zk(h.en); if (have.has(k) || seen.has(k)) continue;
      if (h.seed > s.seed_number + 0) continue; // a later seed's sentence leans on later English
      if (L.isBareLegoPhrase(h.en, l.target_text)) continue;
      if (!L.containsLego(course, s.seed_number, l.target_text, h.en)) continue;
      console.log = () => {};
      const v = L.checkVocabViolations([{ target: h.en }], vocabHere, course, { seedNumber: s.seed_number, extraTexts: [s.target_text] });
      console.log = quiet;
      if (v.length) continue;
      seen.add(k);
      cands.push({ ...h, en_elsewhere: enInCourse.get(k) || null, dist: s.seed_number - h.seed });
    }
    cands.sort((a, b) => (!!a.en_elsewhere - !!b.en_elsewhere) || a.dist - b.dist || a.en.length - b.en.length);
    out.push({ ...e, lego_known: l.known_text, cands: cands.slice(0, 8), n_cands: cands.length });
  }
  L.accumulate(s.legos, vocab, false);
}
fs.writeFileSync(path.join(cdir, 'pool.json'), JSON.stringify({ course, hin_snapshot: hin.at, baskets: out }, null, 0));
const fresh = (b) => b.cands.filter(c => !c.en_elsewhere).length;
const st = { baskets: out.length, need: out.reduce((a, b) => a + b.need, 0),
  covered_fresh: out.filter(b => fresh(b) >= b.need).length, covered_any: out.filter(b => b.cands.length >= b.need).length,
  none: out.filter(b => !b.cands.length).length };
console.log(course, JSON.stringify(st));
