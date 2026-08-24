/**
 * Runs the REAL server validation gates over the golden decompositions,
 * replicating exactly how services/course-builder/routes/seed-complete.cjs
 * assembles vocabSet (LEGO targets + M-component targets, cumulative by seed).
 */
const path = require('path');
const V = require('../../services/course-builder/lib/validation.cjs');
const P = require('../../services/course-builder/lib/phrase-structure.cjs');
const N = require('../../services/course-builder/lib/text-normalization.cjs');
const seeds = require('./golden-decompositions-seeds-1-10.cjs');

const COURSE = 'yor_for_eng';
const vocabSet = new Set();          // cumulative, mirrors loadTranslationVocab
let fail = 0;

const addLego = (l) => {
  N.extractVocab(l.target, false).forEach(v => vocabSet.add(v));
  if (l.type === 'M' && l.components) {
    for (const c of l.components) N.extractVocab(c.target, false).forEach(v => vocabSet.add(v));
  }
};

for (const seed of seeds) {
  console.log(`\n═══ SEED ${seed.seed_number}: ${seed.known_text}`);
  console.log(`    ${seed.target_text}`);

  // Gate 1 — tiling: the LEGOs must reconstruct the seed target exactly.
  const tiling = V.checkTiling(seed.target_text, seed.legos, COURSE, vocabSet);
  if (tiling && tiling.valid === false) {
    console.log(`  ✗ TILING FAIL: ${tiling.message}`);
    fail++;
  } else {
    console.log(`  ✓ tiling ok`);
  }

  // Gate 2 — untaught-word rule, per LEGO, in idx order.
  // Server semantics: the new LEGO's own vocab is added BEFORE its phrases are checked.
  for (const lego of seed.legos) {
    const priorVocab = new Set(vocabSet);   // snapshot BEFORE this lego, as the server does
    addLego(lego);
    const phrases = [...(lego.build || []), ...(lego.use || [])];
    const tag = `L${lego.idx} "${lego.known}" → ${lego.target}`;
    if (!phrases.length) { console.log(`  · ${tag}  (no phrases yet)`); continue; }

    const problems = [];

    // Untaught-word rule
    V.checkVocabViolations(phrases, vocabSet, COURSE)
      .forEach(v => problems.push(`UNTAUGHT in "${v.phrase}" ← ${v.unknown}`));

    // BUILD/USE counts + structure
    const struct = P.checkBuildUsePhrases(lego, COURSE, seed.seed_number);
    if (struct && struct.valid === false) problems.push(`STRUCTURE: ${struct.error}`);

    // BUILD anti-template / recombination
    const g = V.checkBuildRecombination(lego, COURSE, seed.seed_number, priorVocab);
    if (!g.valid) {
      g.rejects.forEach(r => problems.push(`BUILD-REJECT [${r.class}] "${r.target}" ${r.detail || ''}`));
      if (g.recombining < g.required) problems.push(`BUILD-RECOMB: ${g.recombining}/${g.required} phrases recombine with prior vocab`);
    }

    if (problems.length) {
      console.log(`  ✗ ${tag}`);
      problems.forEach(p => console.log(`      ${p}`));
      fail += problems.length;
    } else {
      console.log(`  ✓ ${tag}  (${lego.build?.length || 0} build, ${lego.use?.length || 0} use)`);
    }
  }
}

console.log(`\n────────────────────────────────────────`);
console.log(`cumulative vocab units: ${vocabSet.size}`);
console.log(fail ? `✗ ${fail} FAILURE(S)` : `✓ ALL GATES PASS`);
if (process.argv.includes('--vocab')) {
  console.log('\nAVAILABLE VOCAB:');
  [...vocabSet].sort().forEach(v => console.log('  ' + v));
}
process.exit(fail ? 1 : 0);
