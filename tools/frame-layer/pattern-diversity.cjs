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
 *   FRAME   distinct pattern-id sets fired by the phrase's MATRIX CLAUSE / phrase
 *           count. Measured on the matrix clause, not the whole string, because
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
 * Usage: node tools/frame-layer/pattern-diversity.cjs spa_for_eng 600
 *        require(...).score(phrases, {lego, expensiveClass})
 */
const PATTERNS = require('./patterns.cjs');

const WORD = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean);

/** [SPEC:worker] the matrix clause: everything before the first subordinator or coordinator. */
const SUBORD = /\b(if|but|because|when|while|before|after|until|although|so that|and|that|though|unless)\b/i;
function matrixClause(known) {
  const m = SUBORD.exec(String(known || ''));
  const head = m ? known.slice(0, m.index) : known;
  return head.trim() || known;
}

function frameSig(known) {
  const ids = PATTERNS.filter(p => p.test(known)).map(p => p.id);
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

function score(phrases, { lego, expensiveClass = 'SPLIT', splits = [] } = {}) {
  const n = phrases.length;
  if (!n) return null;
  const sigs = new Set(), poss = new Set(), lefts = new Set(), rights = new Set(), juncts = new Set();
  const detail = phrases.map(p => {
    const s = frameSig(matrixClause(p.known_text));
    const w = walk(p.known_text, lego);
    sigs.add(s); poss.add(w.pos); if (w.left) lefts.add(w.left); if (w.right) rights.add(w.right);
    juncts.add(`${w.left}→${w.right}`);
    return { ...p, frame: s, ...w };
  });
  const axes = {
    frame: sigs.size / n,
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
    phrase_count: n, distinct_frames: sigs.size, positions: [...poss], axes, weights: W,
    composite: +composite.toFixed(3), floors: FLOORS, floor_failures: floorFails, splits: splitReport,
    pass: floorFails.length === 0, detail,
  };
}

module.exports = { score, frameSig, walk, matrixClause, skeleton, crossesSplit, FLOORS };

if (require.main === module) {
  require('dotenv').config({ quiet: true });
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const [course = 'spa_for_eng', seed = '600'] = process.argv.slice(2);
  (async () => {
    const { data: legos } = await sb.from('course_legos').select('lego_id,known_text,target_text')
      .eq('course_code', course).eq('seed_number', +seed);
    const { data: ph } = await sb.from('course_practice_phrases').select('phrase_role,known_text,target_text')
      .eq('course_code', course).eq('seed_number', +seed);
    const SPLITS_FOR_SEED = require('./seed-splits.cjs');
    const r = score(ph, { lego: legos[0].known_text, splits: SPLITS_FOR_SEED[`${course}:${seed}`] || [] });
    console.log(`${course} seed ${seed} — LEGO "${legos[0].known_text}" / "${legos[0].target_text}"`);
    console.log(JSON.stringify({ ...r, detail: undefined }, null, 2));
    r.detail.forEach(d => console.log(` ${d.phrase_role.padEnd(6)} [${d.frame}] ${d.pos} ${d.left}→${d.right}  ${d.known_text}`));
  })();
}
