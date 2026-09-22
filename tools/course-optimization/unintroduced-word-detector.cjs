#!/usr/bin/env node
// unintroduced-word-detector.cjs — a TARGET-side word used in a seed sentence or practice phrase
// before any LEGO (or M-LEGO component) introduces it. Read-only. Word-level, so LOOSER than the
// course-builder gate (which tiles by LEGO chunk): it under-reports rather than over-reports.
//
// Why it exists (job #696, 2026-09-22): eng_for_hin used "but" at seeds 23 and 39 while its LEGO
// sat at seed 41. Cause: seed 19 (the real debut) was redo-wiped on 10 Sept, its redo agent was refused
// by the gate because seed 12 was wiped at the same time, and NOTHING re-checks the seeds downstream
// of a deletion. The gate polices writes; this polices the course as it stands.
//
// Usage:  DATABASE_URL=... node tools/course-optimization/unintroduced-word-detector.cjs [course,course] 
//         OUT=/path/result.json to keep the full JSON (hits, buckets, coverage) — else summary only.
// Buckets per hit: introduced-later (a LEGO teaches it at a LATER seed — the "but" shape),
//   never-no-related-form (no LEGO ever has it or a ≥4-letter-prefix relative introduced earlier),
//   never-related-form (probable inflection / elision / mutation / particle — LOW confidence),
//   same-seed (phrase under L1 uses a word its own seed introduces at L2+; reported, not counted).
// Coverage is printed per course; character-based targets (zho/jpn/yue/hak/nan/tha…) are SKIPPED
// and named — they need the gate's chunk DP, not a word split.
// Word-level (a lexeme-form), not chunk-level, so it is LOOSER than the gate: fewer hits, fewer false positives.
const { Client } = require('pg');
const { normalizeForContainment } = require('../../services/course-builder/lib/text-normalization.cjs');
const { isChinese } = require('../../services/course-builder/lib/language-config.cjs');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
// tokenizer: the gate's normaliser, plus the marks it leaves attached (Armenian ։, Devanagari/Bengali danda । ॥, curly quotes → straight, dashes as separators)
const words = t => normalizeForContainment((t || '').replace(/[’‘]/g, "'").replace(/[։।॥…"“”„]/g, ' ').replace(/[–—]/g, ' ')).replace(/(^|\s)'+|'+(\s|$)/g, ' ').split(' ').filter(Boolean);
// "related form" proxy: an earlier-introduced word sharing a ≥4-char prefix, or equal after dropping an elided/mutated leading piece — bucketed as probable inflection/elision/mutation, NOT counted as the defect
const stem = w => w.replace(/^[a-z]{1,2}'/, '').replace(/^(dd|ff|ngh|ng|mh|nh|ch|th|ph|b|d|g|f|l|m|r|w|h)/, '');
const before = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query(`set statement_timeout = '180s'`);
  const st = (await c.query('show statement_timeout')).rows[0].statement_timeout;
  const only = process.argv[2] ? process.argv[2].split(',') : null;
  const courses = (await c.query(`select course_code, count(*)::int seeds from course_seeds group by 1 order by 1`)).rows;
  const out = { statement_timeout: st, run_at: new Date().toISOString(), courses: {}, skipped: [] };
  for (const { course_code, seeds: nSeeds } of courses) {
    if (only && !only.includes(course_code)) continue;
    if (isChinese(course_code)) { out.skipped.push({ course_code, why: 'character-based target, no word boundaries; needs chunk DP not word split' }); continue; }
    const cnt = (await c.query(`select (select count(*) from course_legos where course_code=$1)::int l, (select count(*) from course_practice_phrases where course_code=$1)::int p`, [course_code])).rows[0];
    if (cnt.l === 0) { out.skipped.push({ course_code, why: 'no LEGOs at all (course not decomposed)' }); continue; }
    const seeds = (await c.query(`select seed_number, target_text from course_seeds where course_code=$1 order by 1`, [course_code])).rows;
    const legos = (await c.query(`select seed_number, lego_index, target_text, type, components, is_new from course_legos where course_code=$1 order by 1,2`, [course_code])).rows;
    const phrases = (await c.query(`select id, seed_number, lego_index, position, phrase_role, target_text from course_practice_phrases where course_code=$1 order by 2,3,4`, [course_code])).rows;
    const cut = seeds.length !== nSeeds || legos.length !== cnt.l || phrases.length !== cnt.p; // silent-cancellation check
    // first introduction of each word: (seed, lego_index) of the earliest LEGO (or M-component) containing it
    const first = new Map();
    for (const l of legos) {
      const texts = [l.target_text];
      if (l.type === 'M' && Array.isArray(l.components)) for (const comp of l.components) if (comp && comp.target) texts.push(comp.target);
      for (const t of texts) for (const w of words(t)) { const pos = [l.seed_number, l.lego_index]; if (!first.has(w) || before(pos, first.get(w))) first.set(w, pos); }
    }
    const legoSeeds = new Set(legos.map(l => l.seed_number));
    const introducedByPrefix = (w, seedNo) => { const cands = [w, stem(w), w.replace(/^[a-z]{1,2}'/, '')].filter(x => x.length >= 4); for (const [k, pos] of first) { if (pos[0] > seedNo) continue; for (const c of cands) if (k.length >= 4 && (k.startsWith(c.slice(0, 4)) || c.startsWith(k.slice(0, 4)))) return k; } return null; };
    const hits = [];
    let seedsExamined = 0, seedsEmpty = 0, seedsNoLegos = 0, phrasesExamined = 0, phrasesEmpty = 0;
    for (const s of seeds) {
      if (!s.target_text || !words(s.target_text).length) { seedsEmpty++; continue; }
      if (!legoSeeds.has(s.seed_number)) { seedsNoLegos++; continue; } // undecomposed seed: nothing to judge against
      seedsExamined++;
      const bad = words(s.target_text).filter(w => !first.has(w) || first.get(w)[0] > s.seed_number);
      if (bad.length) hits.push({ kind: 'seed', cls: 'cross-seed', seed: s.seed_number, text: s.target_text, words: bad.map(w => ({ w, intro: first.has(w) ? first.get(w)[0] : null, related: first.has(w) ? null : introducedByPrefix(w, s.seed_number) })) });
    }
    for (const p of phrases) {
      const ws = words(p.target_text);
      if (!ws.length) { phrasesEmpty++; continue; }
      phrasesExamined++;
      const pos = [p.seed_number, p.lego_index];
      const bad = ws.filter(w => !first.has(w) || before(pos, first.get(w)));
      if (bad.length) { const wd = bad.map(w => ({ w, intro: first.has(w) ? first.get(w)[0] : null, related: first.has(w) ? null : introducedByPrefix(w, p.seed_number) })); hits.push({ kind: 'phrase', cls: wd.some(x => x.intro == null || x.intro > p.seed_number) ? 'cross-seed' : 'same-seed', id: p.id, seed: p.seed_number, lego: p.lego_index, role: p.phrase_role, text: p.target_text, words: wd }); }
    }
    for (const h of hits) h.bucket = h.cls !== 'cross-seed' ? 'same-seed' : h.words.some(x => x.intro != null && x.intro > h.seed) ? 'introduced-later' : h.words.some(x => x.intro == null && !x.related) ? 'never-no-related-form' : 'never-related-form';
    const byWord = {};
    for (const h of hits.filter(h => h.cls === 'cross-seed')) for (const { w, intro } of h.words) { byWord[w] = byWord[w] || { n: 0, intro, kinds: {} }; byWord[w].n++; byWord[w].kinds[h.kind] = (byWord[w].kinds[h.kind] || 0) + 1; }
    out.courses[course_code] = {
      cut_off: cut, seeds_total: nSeeds, seeds_examined: seedsExamined, seeds_empty_text: seedsEmpty, seeds_undecomposed: seedsNoLegos,
      legos: legos.length, phrases_total: cnt.p, phrases_examined: phrasesExamined, phrases_empty: phrasesEmpty,
      hits_seed: hits.filter(h => h.kind === 'seed').length, hits_phrase_cross: hits.filter(h => h.kind === 'phrase' && h.cls === 'cross-seed').length, hits_phrase_same_seed: hits.filter(h => h.cls === 'same-seed').length,
      b_later: hits.filter(h => h.bucket === 'introduced-later').length, b_never_norel: hits.filter(h => h.bucket === 'never-no-related-form').length, b_never_rel: hits.filter(h => h.bucket === 'never-related-form').length,
      distinct_words: Object.keys(byWord).length, top_words: Object.entries(byWord).sort((a, b) => b[1].n - a[1].n).slice(0, 25).map(([w, v]) => ({ w, ...v })),
      hits: hits.filter(h => h.cls === 'cross-seed').slice(0, 600), same_seed_sample: hits.filter(h => h.cls === 'same-seed').slice(0, 20),
    };
    const r = out.courses[course_code];
    console.log(`${course_code.padEnd(20)} seeds ${String(r.seeds_examined).padStart(3)}/${nSeeds} phrases ${String(r.phrases_examined).padStart(6)}/${cnt.p}  seed-hits ${r.hits_seed}  cross-seed phrase-hits ${r.hits_phrase_cross}  same-seed ${r.hits_phrase_same_seed}  [later ${r.b_later} | never/no-related ${r.b_never_norel} | never/related-form ${r.b_never_rel}]  words ${r.distinct_words}${cut ? '  !!CUT-OFF' : ''}`);
    await sleep(400);
  }
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
