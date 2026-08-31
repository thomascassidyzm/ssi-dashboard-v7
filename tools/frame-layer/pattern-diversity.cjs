#!/usr/bin/env node
/**
 * Pattern diversity of a phrase basket — the metric that supersedes
 * edges-per-syllable (which counted spending, not minting, and tied the good
 * and bad sets at 0.081 vs 0.083).
 *
 * SPEC PROVENANCE. The axes are Tom's, from the 2026-08-29 sitting: "pattern
 * diversity of the walk — positions (initial/medial/final), distinct neighbours
 * per side, junction diversity — weighted toward the pair's expensive mapping
 * class, floors per axis." Everything below marked [SPEC:worker] is my
 * definition of an under-specified part, made so it could be implemented.
 *
 * [SPEC:worker] Five axes, each normalised to 0..1, each with a floor:
 *   FRAME   distinct pattern-id sets fired by the phrase's MATRIX CLAUSE, over
 *           the number of distinct frames this basket COULD have exercised —
 *           min(phrase count, frames this course has attested by this seed).
 *           A fixed absolute denominator is unfair under a per-LEGO availability
 *           window: LEGO 1 of an early seed has a tiny pool, LEGO 4 of seed 600
 *           has almost the whole language, and dividing both by phrase count
 *           marks the early basket down for a poverty it did not choose. Scoring
 *           against what was instantiable makes a thin basket at seed 12 and a
 *           thin basket at seed 600 read the same. Where the pool is richer than
 *           the basket is long — every late seed — the denominator is the phrase
 *           count and this is exactly the old behaviour.
 *           Measured on the MATRIX CLAUSE, not the whole string, because
 *           swapping the tail of a phrase does not change the frame the LEGO is
 *           being taught in. This is what the first version of this file got
 *           wrong: whole-string matching scored the known-bad seed-600 basket
 *           0.62 and passed it, because its nine identical matrix clauses carried
 *           nine different tails.
 *   POS     distinct positions of the LEGO within its phrase (initial/medial/final) / 3
 *   NEIGH   (distinct left neighbours + distinct right neighbours) / (2 * phrases)
 *   JUNCT   distinct (leftNeighbour → rightNeighbour) junction pairs / phrase count
 *   SPLIT   fraction of the seed's applicable structural splits that the basket
 *           actually crosses. An outcome counts only if it appears in a clause
 *           in at least two distinct shapes — meeting one half of the split in a
 *           single copied clause is not teaching it.
 * Score = weighted mean, weights biased to the axis that carries the pair's
 * expensive mapping class: for a SPLIT pair (spa) FRAME is weighted double,
 * because a split lives in the frame, not in the words around the LEGO.
 * Floors [SPEC:worker]: FRAME >= 0.34, POS >= 0.34, NEIGH >= 0.30, JUNCT >= 0.50,
 * SPLIT >= 1.00 when the seed carries a split at all (crossing it is the seed's
 * teaching job; a basket that misses it has not taught the seed).
 * A basket that misses any floor FAILS regardless of its score — a high score on
 * three axes must not buy a set that stamps one shape nine times.
 *
 * THE UNIT IS THE LEGO BASKET, NOT THE SEED. Tom's ruling, 2026-08-29: "a SEED
 * is invisible to a learner, so they have no idea how much work is being done by
 * a SEED, the unit of learning for the learner is the LEGO, and the unit of
 * practice is the PHRASE." So one LEGO, one basket, one set of floors. `score()`
 * scores ONE basket; `scoreBaskets()` splits a seed's phrases by lego_index and
 * scores each independently. A seed passes only if EVERY basket under it passes.
 * The seed-level composite is context and must never be the thing that decides:
 * averaging four baskets lets three healthy ones carry a thin fourth, which on a
 * single-LEGO seed like 600 is invisible and on a four-LEGO seed like 599 is a
 * silent wrong answer.
 *
 * Usage: node tools/frame-layer/pattern-diversity.cjs spa_for_eng 599
 *        require(...).score(phrases, {lego, splits})          // one basket
 *        require(...).scoreBaskets(phrases, {legos, job})     // a whole seed
 */
const PATTERNS = require('./patterns.cjs');

/**
 * THE MERGED MATCHER LIST. `frameSig` used to see the 31 seed frames only, so a
 * basket that put the LEGO into a greeting, a bare polar response and a thanks
 * produced the SAME signature three times ("∅") and read as one shape. Adding
 * the 12 D-frames is what lets the conversational register register at all.
 *
 * P-frames stay FIRST so a signature that fires no D-frame is byte-identical to
 * what this file produced before — every existing reading is preserved, and a
 * signature only ever grows a suffix.
 *
 * X-frames are deliberately absent: an exchange spans a turn boundary and
 * cannot be matched against one phrase. A generator reaches them through their
 * `sentence_projection`.
 */
const { allSentenceMatchers } = require('./dialogue-patterns.cjs');
const MERGED = allSentenceMatchers();

const WORD = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean);

/** [SPEC:worker] the matrix clause: everything before the first subordinator or coordinator. */
const SUBORD = /\b(if|but|because|when|while|before|after|until|although|so that|and|that|though|unless)\b/i;
function matrixClause(known) {
  const m = SUBORD.exec(String(known || ''));
  const head = m ? known.slice(0, m.index) : known;
  return head.trim() || known;
}

/**
 * `matchers` defaults to the merged list. It is an argument, not a constant, so
 * a caller comparing before/after (or scoring a corpus that predates the
 * dialogue inventory) can hand in `PATTERNS` and get exactly the old reading.
 */
function frameSig(known, matchers = MERGED) {
  const ids = matchers.filter(p => p.test(known)).map(p => p.id);
  return ids.join('+') || '∅';
}

/** Where does the LEGO sit, and what are its immediate neighbours? */
function walk(known, lego) {
  const w = WORD(known), l = WORD(lego);
  let at = -1;
  for (let i = 0; i + l.length <= w.length; i++) if (l.every((x, j) => w[i + j] === x)) { at = i; break; }
  if (at === -1) return { pos: 'absent', left: null, right: null };
  const left = at === 0 ? '^' : w[at - 1];
  const right = at + l.length >= w.length ? '$' : w[at + l.length];
  const pos = at === 0 ? 'initial' : (at + l.length >= w.length ? 'final' : 'medial');
  return { pos, left, right };
}

const FLOORS = { frame: 0.34, pos: 0.34, neigh: 0.30, junct: 0.50, split: 1.0 };

/**
 * Split crossing. `split` = { id, name, outcomes: [{form, target_re}] }.
 *
 * [SPEC:worker] An outcome is CARRIED by a phrase when its target-side matcher
 * fires. The split counts as CROSSED only when every outcome is carried by at
 * least two DISTINCT known-side skeletons — first three words of the matrix
 * clause, plus first three words of whatever follows the subordinator. One
 * skeleton means the learner met that half of the split in exactly one shape,
 * which is the tail-swap failure written as a number. `crossed_weak` reports the
 * laxer test (each outcome present at least once) so the two can be compared.
 */
const first3 = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
function skeleton(known) {
  const m = SUBORD.exec(String(known || ''));
  return m ? `${first3(known.slice(0, m.index))} | ${m[0].toLowerCase()} ${first3(known.slice(m.index + m[0].length))}`
           : `${first3(known)} |`;
}

function crossesSplit(phrases, split) {
  const hit = split.outcomes.map(o => {
    const re = new RegExp(o.target_re, 'i');
    const matches = phrases.filter(p => re.test(p.target_text || ''));
    const skeletons = [...new Set(matches.map(p => skeleton(p.known_text)))];
    return { form: o.form, phrases: matches.length, distinct_skeletons: skeletons.length, skeletons };
  });
  return { id: split.id, name: split.name, outcomes: hit,
           crossed_weak: hit.every(h => h.phrases > 0),
           crossed: hit.every(h => h.distinct_skeletons >= 2) };
}

/**
 * COMPONENT ROWS ARE NOT PRACTICE. They are per-sentence literal tiling glosses,
 * skipped at runtime and never reviewed, and an M-LEGO's own components by
 * definition do not contain the whole M-LEGO ("been" does not contain "been
 * happy"). Scoring them as practice phrases inflated POS above 1.0 by counting
 * "absent" as a fourth position. They are carried through for display and
 * excluded from every axis.
 */
const isPractice = (p) => p.phrase_role !== 'component';

/**
 * `instantiableFrames` is now the size of the §3 POOL — seed frames this course
 * has attested PLUS pod frames whose fixed material this basket owns — where it
 * used to be `attestedFrames(...).size` alone. The denominator therefore rises
 * exactly where the conversational register becomes reachable, which is early,
 * because "yes"/"no"/"thank you"/"please" are cut early in essentially every
 * pair.
 *
 * THE CONSEQUENCE IS FACED, NOT SOFTENED. Early baskets score LOWER against the
 * bigger pool. That is the design working: an early basket that stamps nine
 * statements reads as thin because it IS thin against what the corpus attests.
 * The floors below are unchanged at 0.34 etc. on purpose — per-band relaxation
 * is a later decision on lab evidence, not a calibration made here to keep the
 * numbers looking nice. Late baskets are untouched: `min(phrase count, pool)`
 * already caps at the phrase count long before the pool runs out.
 */
function score(all, { lego, expensiveClass = 'SPLIT', splits = [], instantiableFrames = null, matchers = MERGED } = {}) {
  const phrases = (all || []).filter(isPractice);
  const n = phrases.length;
  if (!n) return null;
  const sigs = new Set(), poss = new Set(), lefts = new Set(), rights = new Set(), juncts = new Set();
  const detail = phrases.map(p => {
    const s = frameSig(matrixClause(p.known_text), matchers);
    const w = walk(p.known_text, lego);
    sigs.add(s);
    // "absent" is not a position — it is a containment failure, counted separately.
    if (w.pos !== 'absent') { poss.add(w.pos); juncts.add(`${w.left}→${w.right}`); }
    if (w.left) lefts.add(w.left); if (w.right) rights.add(w.right);
    return { ...p, frame: s, ...w };
  });
  // the ceiling this basket could actually reach: you cannot exercise more
  // distinct frames than you have phrases, or than the course has attested.
  const frameCeiling = Math.max(1, Math.min(n, instantiableFrames == null ? n : instantiableFrames));
  const axes = {
    frame: Math.min(1, sigs.size / frameCeiling),
    pos: poss.size / 3,
    neigh: (lefts.size + rights.size) / (2 * n),
    junct: juncts.size / n,
  };
  const splitReport = splits.map(sp => crossesSplit(phrases, sp));
  axes.split = splits.length ? splitReport.filter(s => s.crossed).length / splits.length : 1;
  // [SPEC:worker] weight the axis the pair's expensive class lives in
  const W = expensiveClass === 'SPLIT' ? { frame: 2, pos: 1, neigh: 1, junct: 1, split: 3 }
          : expensiveClass === 'INVERSION' ? { frame: 1, pos: 2, neigh: 1, junct: 1, split: 2 }
          : { frame: 1, pos: 1, neigh: 1, junct: 2, split: 2 };
  const tw = Object.values(W).reduce((a, b) => a + b, 0);
  const composite = Object.entries(axes).reduce((a, [k, v]) => a + v * W[k], 0) / tw;
  const floorFails = Object.entries(FLOORS)
    .filter(([k, f]) => (k !== 'split' || splits.length) && axes[k] < f).map(([k]) => k);
  return {
    phrase_count: n, components_excluded: (all || []).length - n,
    frame_ceiling: frameCeiling, instantiable_frames: instantiableFrames,
    lego_absent: detail.filter(d => d.pos === 'absent').length,
    distinct_frames: sigs.size, positions: [...poss], axes, weights: W,
    composite: +composite.toFixed(3), floors: FLOORS, floor_failures: floorFails, splits: splitReport,
    pass: floorFails.length === 0, detail,
  };
}

/**
 * Split a seed's phrases into one basket per LEGO and score each on its own.
 *
 * Grouping key is `lego_index`, NOT `lego_id`: lego_id is null on every one of
 * spa_for_eng's 16,328 phrase rows (0 populated; 17,909 of 849,445 estate-wide),
 * whereas lego_index is populated on every row and is the field the deterministic
 * phrase id itself is built from (spa_for_eng:S0599L01B03 → lego_index 1).
 *
 * Phrases whose lego_index matches no lego of this seed are returned as an
 * `unattributed` basket: scored for information, EXCLUDED from the seed verdict.
 * A row nobody can attribute is a data question, not a quality failure, and it
 * must not be able to fail a basket that is actually fine.
 *
 * Each basket is given only the split sides ITS OWN lego admits (from the derived
 * job) — asking the "to drive" basket to cross a conditional split it has nothing
 * to do with would be the per-seed error in a new costume.
 */
function scoreBaskets(phrases, { legos = [], job = null, expensiveClass = 'SPLIT', instantiableFrames = null, matchers = MERGED } = {}) {
  const { splitsForBasket } = require('./derive-seed-job.cjs');
  const byIndex = new Map();
  for (const p of phrases || []) {
    const k = p.lego_index == null ? null : +p.lego_index;
    if (!byIndex.has(k)) byIndex.set(k, []);
    byIndex.get(k).push(p);
  }
  const known = new Set(legos.map(l => +l.lego_index));
  const baskets = legos.map(l => {
    const idx = +l.lego_index;
    const mine = withIds(byIndex.get(idx) || [], idx);
    const splits = job ? splitsForBasket(job, idx) : [];
    return { lego_index: idx, lego: l, splits, phrases: mine,
             score: score(mine, { lego: l.known_text, splits, expensiveClass, instantiableFrames, matchers }) };
  });
  const strays = [...byIndex.entries()].filter(([k]) => k === null || !known.has(k)).flatMap(([, v]) => v);
  const unattributed = strays.length
    ? { phrases: withIds(strays, 0), score: score(withIds(strays, 0), { lego: '', splits: [], expensiveClass, instantiableFrames, matchers }) }
    : null;
  const scored = baskets.filter(b => b.score);
  return {
    baskets, unattributed,
    // context only — never the pass/fail
    seed_composite: scored.length ? +(scored.reduce((a, b) => a + b.score.composite, 0) / scored.length).toFixed(3) : null,
    seed_pass: baskets.length > 0 && baskets.every(b => b.score && b.score.pass),
    failing_baskets: baskets.filter(b => !b.score || !b.score.pass)
      .map(b => ({ lego_index: b.lego_index, lego: b.lego.known_text,
                   floors: b.score ? b.score.floor_failures : ['no phrases'] })),
  };
}

/**
 * LAB-SIDE PHRASE IDS. `L01-3` = the third phrase in the first lego's basket.
 * PER-INSTANCE, not a permalink: regenerate the basket and the same id points at
 * a different phrase. Nothing is written to the database and no production
 * schema is touched — course_practice_phrases has no phrase_id column and gains
 * none. (Live rows DO carry a real deterministic id in their primary key,
 * "spa_for_eng:S0599L01B03"; where present it is passed through as `db_id` for
 * display, but the short id is what a verdict points at.)
 */
function withIds(phrases, legoIndex) {
  return [...phrases].sort(sortForId).map((p, i) => ({
    ...p, lab_id: `L${String(legoIndex).padStart(2, '0')}-${i + 1}`, db_id: p.id || null,
  }));
}
const ID_ROLE = { component: 0, build: 1, use: 2 };
const sortForId = (a, b) => (ID_ROLE[a.phrase_role] ?? 9) - (ID_ROLE[b.phrase_role] ?? 9)
  || ((a.position ?? 0) - (b.position ?? 0));

module.exports = { score, scoreBaskets, withIds, frameSig, walk, matrixClause, skeleton, crossesSplit, FLOORS, MERGED };

if (require.main === module) {
  require('dotenv').config({ quiet: true });
  const { createClient } = require('@supabase/supabase-js');
  const { loadCorpus } = require('./corpus.cjs');
  const { deriveJob } = require('./derive-seed-job.cjs');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const [course = 'spa_for_eng', seed = '599'] = process.argv.slice(2);
  (async () => {
    const { seedRow, ownLegos, priorSeeds, priorLegos, priorComponents, phrases } = await loadCorpus(sb, course, +seed);
    const job = deriveJob({ course, seedRow, ownLegos, priorSeeds, priorLegos, priorComponents });
    const { attestedFrames, availableVocab, instantiableFrameSet } = require('./availability.cjs');
    // The denominator is now the POOL, per basket — but the CLI scores a whole
    // seed at once, so it uses the widest window of the seed (its last lego),
    // which is the same window the generator's base vocabulary is built from.
    const vocab = availableVocab({ legos: priorLegos.concat(ownLegos), components: priorComponents,
                                   seed: seedRow.seed_number, legoIndex: null });
    const pool = instantiableFrameSet({ vocab, priorSeeds, seedRow });
    const attestedOnly = attestedFrames(priorSeeds, seedRow).size;
    const r = scoreBaskets(phrases, { legos: ownLegos, job, instantiableFrames: pool.length });
    const before = scoreBaskets(phrases, { legos: ownLegos, job,
      instantiableFrames: attestedOnly, matchers: PATTERNS });
    console.log(`${course} seed ${seed} — ${seedRow.known_text}`);
    console.log(`FRAME pool: ${attestedOnly} seed-attested → ${pool.length} instantiable ` +
      `(+${pool.filter(p => p.provenance === 'pod').length} pod: ${pool.filter(p => p.provenance === 'pod').map(p => p.id).join(' ') || 'none'})`);
    console.log(`JOB: ${job.verdict} — ${job.sentence}\n`);
    for (const b of r.baskets) {
      const s = b.score;
      console.log(`— L${String(b.lego_index).padStart(2, '0')} "${b.lego.known_text}" / "${b.lego.target_text}"  ${b.phrases.length} phrases`);
      if (!s) { console.log('   no phrases'); continue; }
      console.log(`   ${Object.entries(s.axes).map(([k, v]) => `${k} ${v.toFixed(3)}`).join('  ')}`);
      const b0 = before.baskets.find(x => x.lego_index === b.lego_index);
      console.log(`   composite ${s.composite}  ${s.pass ? 'PASS' : 'FAIL: ' + s.floor_failures.join(', ')}`
        + (b0 && b0.score ? `   [before this change: frame ${b0.score.axes.frame.toFixed(3)}, composite ${b0.score.composite}, ${b0.score.pass ? 'PASS' : 'FAIL'}]` : ''));
      b.phrases.forEach(d => console.log(`     ${d.lab_id.padEnd(7)} ${d.phrase_role.padEnd(9)} ${d.known_text}`));
    }
    if (r.unattributed) console.log(`\nUNATTRIBUTED (not gating): ${r.unattributed.phrases.length} phrase(s)`);
    console.log(`\nSEED: ${r.seed_pass ? 'PASS — every basket passes' : 'FAIL — ' + r.failing_baskets.map(f => `L${String(f.lego_index).padStart(2, '0')} (${f.floors.join(', ')})`).join(', ')}`);
    console.log(`seed composite (context only, never the verdict): ${r.seed_composite}`);
  })().catch(e => { console.error(e.message); process.exit(1); });
}
