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

/**
 * WHICH FRAMES MAY THIS BASKET ACTUALLY INSTANTIATE? — the pool, and the gate.
 *
 * Two clauses, and only the first has teeth.
 *
 * 1. OWNED — the safety gate. Every chunk of at least one alternate of the
 *    frame's `fixed_material` must resolve WHOLE-CHUNK against the vocabulary
 *    this basket owns: some available row's KNOWN side IS that chunk, which is
 *    what gives it an owned target realisation. Same discipline as the
 *    validator — no re-conjugation, no invention, no substring luck.
 *    Seed frames (`P*`) pass trivially by construction: a prior seed attested
 *    them, and a prior seed's material arrived through cuts. So for them
 *    `attestedFrames(priorSeeds, seedRow)` remains the whole test, unchanged.
 *
 * 2. HEARD — a RANKING signal, never a gate. A frame attested in pod content
 *    delivered at or before this position is nicer to practise; a frame that
 *    is not is still safe. Making heard a gate would couple generation to the
 *    pod delivery schedule, which is per-enrolment runtime state
 *    (`corpus.cjs`, `deliveredPodRows`), and seeds were never heard-gated
 *    either. `heardFrameIds` is therefore optional and affects only `heard`.
 *
 * THE POINT OF THE WHOLE DESIGN, stated as code: PODS CONTRIBUTE FRAME
 * ATTESTATION AND ZERO VOCABULARY. Production material comes wholly from cuts.
 * A frame whose fixed material no LEGO has cut is ABSENT from the pool and
 * absent from the FRAME denominator — never "scored low". Scoring it would
 * punish a basket for not doing the impossible, and offering it would ask a
 * learner to produce target material the curriculum has never minted.
 *
 * The worked case, and the acceptance test: X1/D6 "and you?" is attested four
 * times in pod-0. `spa_for_eng` has cut no "and you", no target containing
 * "y tú", and no lego whose target is the bare word "tú". So this function must
 * refuse D6 for spa at EVERY position — and must admit it the day a cut mints
 * the material, with no config change anywhere.
 */
function instantiableFrameSet({
  vocab = [], priorSeeds = [], seedRow = null,
  dialogueFrames = null, heardFrameIds = null,
} = {}) {
  const attested = attestedFrames(priorSeeds, seedRow);
  // The owned known side, normalised. A chunk is owned iff it IS one of these —
  // "tú" being a substring of "estúpido" is not ownership, and normalising to
  // whole strings is what makes that impossible to confuse.
  const known = new Set(vocab.map(v => norm(v.known_text)).filter(Boolean));
  const owns = (alternate) => alternate.length > 0 && alternate.every(c => known.has(norm(c)));
  const pool = [];
  for (const [id, firstSeed] of attested) {
    pool.push({ id, provenance: 'seed', grain: 'sentence', first_seed: firstSeed,
                heard: heardFrameIds ? heardFrameIds.has(id) : null });
  }
  const frames = dialogueFrames || loadDialogueFrames();
  for (const f of frames) {
    const alt = (f.fixed_material || []).find(owns);
    if (!alt) continue;                                  // OWNED failed → not in the pool at all
    pool.push({
      id: f.id, provenance: 'pod', grain: f.grain || 'sentence',
      name: f.name, position: f.position || (f.positions || []).join(' → ') || 'either',
      register: f.register || [], owned_via: alt,
      sentence_projection: f.sentence_projection || null,
      heard: heardFrameIds ? heardFrameIds.has(f.id) : null,
    });
  }
  return pool;
}

/**
 * The dialogue frames, read from the mined inventory when it exists and falling
 * back to the matcher definitions when it does not. The inventory is preferred
 * because it carries the mechanically-derived `register` and the attestation
 * counts; the matchers are the same `fixed_material` either way, so the gate's
 * verdict never depends on which one was available.
 */
let _dialogueCache;
function loadDialogueFrames() {
  if (_dialogueCache) return _dialogueCache;
  const path = require('path'), fs = require('fs');
  const at = path.join(__dirname, '..', '..', 'docs', 'frame-layer', 'dialogue-frame-inventory.json');
  try {
    const inv = JSON.parse(fs.readFileSync(at, 'utf8'));
    _dialogueCache = [...(inv.sentence_frames || []), ...(inv.exchange_frames || [])];
  } catch {
    const { SENTENCE_FRAMES, EXCHANGE_FRAMES } = require('./dialogue-patterns.cjs');
    _dialogueCache = [...SENTENCE_FRAMES, ...EXCHANGE_FRAMES];
  }
  return _dialogueCache;
}

module.exports = { availableVocab, attestedFrames, instantiableFrameSet, loadDialogueFrames, norm, expensiveClassFor };
