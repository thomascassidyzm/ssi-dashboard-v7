#!/usr/bin/env node
/**
 * cym_for_kor source-phrase reuse (cs #232) — OFFLINE. Reads two saved Popty snapshots
 * (GET /api/production/<course>/seeds?status=all), touches no database, writes one JSON.
 *
 *   node ops/cym-for-kor/reuse/match.cjs <cym_for_kor.json> <cym_nv2_for_eng.json> <out.json> [maxSeed]
 *
 * The checks are Popty's own, called directly, not re-implemented:
 *   - vocabulary (P1/P2): checkVocabViolations (services/course-builder/lib/validation.cjs), fed a
 *     vocab set assembled exactly as POST /api/seed/complete does it (routes/seed-complete.cjs
 *     ~1254-1346 + lib/vocab-cache.cjs loadTranslationVocab): every earlier seed's target_text,
 *     every earlier LEGO target + M components, then this seed's LEGOs in lego_index order up to
 *     and including the LEGO the phrase sits under.
 *   - LEGO-in-phrase (P17): phraseContainsLego (lib/separable-verbs.cjs) with the word-containment
 *     baseline seed-complete uses for space-delimited languages (Welsh mutation/elision via
 *     welshContainsLego).
 *   - P25: only is_new LEGOs are homes (a not-new basket is never played).
 * Home rule: a source phrase goes under the FIRST new cym_for_kor LEGO (course order) that it
 * contains and at which it passes the vocab check — the point its last needed piece is taught.
 * Each source Welsh text is placed once (duplicates across source baskets fold to one).
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { checkVocabViolations } = require(path.join(ROOT, 'services/course-builder/lib/validation.cjs'));
const { phraseContainsLego } = require(path.join(ROOT, 'services/course-builder/lib/separable-verbs.cjs'));
const { extractVocab, checkWordContainment } = require(path.join(ROOT, 'services/course-builder/lib/text-normalization.cjs'));

const COURSE = 'cym_for_kor';
const [korPath, srcPath, outPath, maxArg] = process.argv.slice(2);
const MAX = maxArg ? Number(maxArg) : 668;
const INCLUDE_OLD = process.env.INCLUDE_OLD !== '0';

// Same normalisation as ops/cym-for-kor/build/report.py norm(), plus end punctuation.
const norm = (t) => String(t || '').replace(/[’‘`´]/g, "'").toLowerCase().replace(/[.,!?;:]+/g, ' ').split(/\s+/).filter(Boolean).join(' ');
const ROLES = new Set(['build', 'use']);

const kor = JSON.parse(fs.readFileSync(korPath, 'utf8')).seeds.sort((a, b) => a.seed_number - b.seed_number);
const src = JSON.parse(fs.readFileSync(srcPath, 'utf8')).seeds;

// Source phrases from S1001-S1668 (= cym_for_kor seeds 1-668), folded by Welsh text.
const srcByText = new Map();
let srcRows = 0, srcComponentRows = 0, srcNewLegos = 0;
for (const s of src) {
  // Pool "hc": S1001-S1668 (= cym_for_kor seeds 1-668). Pool "old": S0001-S0316 — the source's
  // older seeds, where many LEGOs that S1001+ marks not-new were taught (so their baskets live there).
  const pool = s.seed_number >= 1001 ? 'hc' : 'old';
  if (pool === 'hc' && s.seed_number > 1000 + MAX) continue;
  if (pool === 'old' && !INCLUDE_OLD) continue;
  for (const l of s.legos || []) {
    if (l.is_new && pool === 'hc') srcNewLegos++;
    for (const p of l.basket_phrases || []) {
      if (!ROLES.has(p.phrase_role)) { srcComponentRows++; continue; }
      srcRows++;
      const k = norm(p.target_text);
      const t12 = !!(p.target1_audio_id && p.target2_audio_id);
      const any = !!(p.target1_audio_id || p.target2_audio_id);
      const prev = srcByText.get(k);
      const row = { k, text: p.target_text, pool, srcSeed: pool === 'hc' ? s.seed_number - 1000 : s.seed_number, srcLego: l.lego_id, srcLegoNew: !!l.is_new, role: p.phrase_role, t12, any, rows: 1 };
      if (!prev) srcByText.set(k, row);
      else { prev.rows++; if ((t12 && !prev.t12) || (pool === 'hc' && prev.pool === 'old' && t12 === prev.t12)) Object.assign(prev, { ...row, rows: prev.rows }); else prev.any = prev.any || any; }
    }
  }
}

const baseline = (lt, pt) => checkWordContainment(lt, pt);
const contains = (seedNumber, legoTarget, phraseTarget) =>
  phraseContainsLego({ courseCode: COURSE, seedNumber, legoTarget, phraseTarget, baseline });

const unplaced = new Map(srcByText); // k -> row
const placed = new Map();
const vocab = new Set();
const legosOut = [];
const genVocabFails = [];
const addLego = (l) => {
  extractVocab(l.target_text).forEach(v => vocab.add(v));
  if (l.type === 'M' && Array.isArray(l.components)) for (const c of l.components) extractVocab(c.target).forEach(v => vocab.add(v));
};

for (const s of kor) {
  if (s.seed_number > MAX) break;
  const legos = (s.legos || []).slice().sort((a, b) => a.lego_index - b.lego_index);
  for (const l of legos) {
    addLego(l);
    const gen = (l.basket_phrases || []).filter(p => ROLES.has(p.phrase_role));
    const rec = { seed: s.seed_number, lego_id: l.lego_id, idx: l.lego_index, is_new: !!l.is_new, target: l.target_text,
      gen: gen.map(p => ({ id: p.id, text: p.target_text, k: norm(p.target_text), role: p.phrase_role })), reuse: [] };
    // Calibration: the generated phrases must pass the same check (they went through seed/complete).
    if (gen.length) {
      const v = checkVocabViolations(gen.map(p => ({ target: p.target_text })), vocab, COURSE, { seedNumber: s.seed_number, extraTexts: [s.target_text] });
      for (const x of v) genVocabFails.push({ lego_id: l.lego_id, ...x });
    }
    if (l.is_new) {
      const cands = [];
      for (const r of unplaced.values()) if (contains(s.seed_number, l.target_text, r.text)) cands.push(r);
      if (cands.length) {
        const v = checkVocabViolations(cands.map(r => ({ target: r.text })), vocab, COURSE, { seedNumber: s.seed_number, extraTexts: [s.target_text] });
        const bad = new Set(v.map(x => x.phrase));
        for (const r of cands) if (!bad.has(r.text)) { rec.reuse.push(r); unplaced.delete(r.k); placed.set(r.k, r); }
      }
      // Every LATER new LEGO a placed phrase contains is also a valid home (vocab only grows), so the
      // fill step (bands.py) may move it there to even baskets out. Recorded, never assumed.
      rec.alsoHome = [];
      for (const r of placed.values()) if (!rec.reuse.includes(r) && contains(s.seed_number, l.target_text, r.text)) rec.alsoHome.push(r.k);
    }
    legosOut.push(rec);
  }
  // seed sentence joins the vocab for LATER seeds only (loadTranslationVocab is exclusive of N)
  extractVocab(s.target_text).forEach(v => vocab.add(v));
}

// Why the unplaced ones failed: no new LEGO contains them at all, or contained but never vocab-valid.
const unplacedOut = [];
for (const r of unplaced.values()) unplacedOut.push({ k: r.k, text: r.text, pool: r.pool, srcSeed: r.srcSeed, t12: r.t12, any: r.any });

fs.writeFileSync(outPath, JSON.stringify({ maxSeed: MAX, srcRows, srcComponentRows, srcNewLegos, srcDistinct: srcByText.size,
  legos: legosOut, unplaced: unplacedOut, genVocabFails }, null, 0));
console.log(`seeds<=${MAX}: source rows ${srcRows} (distinct Welsh ${srcByText.size}), placed ${srcByText.size - unplaced.size}, unplaced ${unplaced.size}; kor LEGOs ${legosOut.length}; generated vocab fails ${genVocabFails.length}`);
