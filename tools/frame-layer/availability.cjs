#!/usr/bin/env node
/**
 * WHAT VOCABULARY IS AVAILABLE TO THIS BASKET? — the per-LEGO window.
 *
 * Tom's ruling, 2026-08-29: "the tool needs to know the LEGOs that any SEED has
 * been broken down into already, which means it can use all content up to SEED
 * N-1 PLUS any LEGOS in the SEED, that have already been introduced ... i.e.
 * LEGO 1 has none, but LEGO 2 has LEGO 1 to pull from as well as all the
 * previous SEEDS, and so on".
 *
 * So availability is CUMULATIVE WITHIN THE SEED and the window is PER BASKET,
 * not per seed. The generator used to hand every basket the whole seed's LEGO
 * list, which is too generous for LEGO 1 and correct only for the last one.
 *
 * COMPONENTS COUNT. A CMP row extends the available vocabulary without creating
 * a learning event, and it is exactly the connective glue — "si", "de manera",
 * "que" — that makes a phrase work on both sides. Excluding components starves
 * the builder and pushes it back to using whole M-LEGOs intact, which is the
 * stiffness the component layer exists to prevent.
 *
 * READ-ONLY: pure functions over rows somebody else read.
 */
const PATTERNS = require('./patterns.cjs');

const norm = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();

/**
 * The vocabulary LEGO `legoIndex` of seed `seed` may use.
 * Everything through seed N-1 (legos + components), plus legos 1..k-1 of seed N
 * and THEIR components. `legoIndex` null/0 means "the whole seed" (seed-level view).
 */
function availableVocab({ legos = [], components = [], seed, legoIndex = null }) {
  const within = (row) => row.seed_number < seed
    || (legoIndex == null ? row.seed_number <= seed : +row.lego_index < +legoIndex);
  const out = [];
  const seen = new Set();
  const push = (row, kind) => {
    const key = kind + '|' + norm(row.known_text) + '|' + norm(row.target_text);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ known_text: row.known_text, target_text: row.target_text, kind,
               seed_number: row.seed_number, lego_index: row.lego_index });
  };
  for (const l of legos) if (within(l)) push(l, 'lego');
  for (const c of components) if (within(c)) push(c, 'component');
  return out;
}

/**
 * PER COURSE, ALWAYS. Which frames has THIS course's own known side actually
 * attested at or before this seed?
 *
 * This replaces reading `first_seed` out of `english-pattern-inventory.json`,
 * which carries `"course": "spa_for_eng"` in its own header: those tallies were
 * computed from spa_for_eng's seed list and are meaningless for another pair.
 * The known side is NOT one canonical set across the estate — seed 1 has 116
 * distinct known texts across 130 courses, and cym_for_yor's known side is
 * Welsh — so any frame tally shared across the grid is simply wrong.
 */
function attestedFrames(priorSeeds = [], seedRow = null) {
  const first = new Map();
  const rows = seedRow ? [...priorSeeds, seedRow] : priorSeeds;
  for (const s of rows) {
    for (const p of PATTERNS) {
      if (!p.test(String(s.known_text || ''))) continue;
      const n = s.seed_number ?? Infinity;
      if (!first.has(p.id) || n < first.get(p.id)) first.set(p.id, n);
    }
  }
  return first; // Map<pattern id, first seed in THIS course>
}

/**
 * WHICH MAPPING CLASS IS EXPENSIVE FOR THIS PAIR? — per course, never shared.
 *
 * The diversity weights lean toward the axis the pair's expensive class lives
 * in. That class was hardcoded to SPLIT, which is true of spa_for_eng and false
 * of deu_for_eng (INVERSION) and zho_for_eng (DETERMINISTIC): a grid rendering a
 * German column with Spanish weights is the shared-tally bug in plain sight.
 * Returns null where the pair has no classes recorded, so the caller can say so
 * rather than quietly assuming Spanish.
 */
const PLACEHOLDER = /^NOT /;   // "NOT ATTESTED", "NOT YET EXTRACTED" — absence, not a class
function expensiveClassFor(course, mappingDoc) {
  const tally = {};
  for (const p of (mappingDoc && mappingDoc.patterns) || []) {
    const c = p.pairs && p.pairs[course] && p.pairs[course].class;
    if (!c || PLACEHOLDER.test(c)) continue;
    tally[c] = (tally[c] || 0) + 1;
  }
  const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  return ranked.length ? { class: ranked[0][0], counts: tally } : null;
}

module.exports = { availableVocab, attestedFrames, norm, expensiveClassFor };
