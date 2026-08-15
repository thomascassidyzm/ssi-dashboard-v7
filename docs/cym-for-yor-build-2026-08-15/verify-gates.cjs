/**
 * Runs the REAL server validation gates over the cym_for_yor golden
 * decompositions, replicating how services/course-builder/routes/seed-complete.cjs
 * accumulates vocab (LEGO targets + M-component targets, cumulative, in idx order).
 *
 * These gates all run on the WELSH (target) side.
 * The Yoruba known side is checked separately by verify-known-side.cjs.
 */
const V = require('../../services/course-builder/lib/validation.cjs');
const P = require('../../services/course-builder/lib/phrase-structure.cjs');
const N = require('../../services/course-builder/lib/text-normalization.cjs');
const seeds = require('./golden-decompositions-seeds-1-10.cjs');

const COURSE = 'cym_for_yor';
const vocabSet = new Set();
let fail = 0;

const addLego = (l) => {
  N.extractVocab(l.target, false).forEach(v => vocabSet.add(v));
  if (l.type === 'M' && l.components) {
    for (const c of l.components) N.extractVocab(c.target, false).forEach(v => vocabSet.add(v));
  }
};

for (const seed of seeds) {
  console.log(`\n═══ SEED ${seed.seed_number}  ${seed.target_text}`);

  const tiling = V.checkTiling(seed.target_text, seed.legos, COURSE, vocabSet);
  if (tiling && tiling.valid === false) {
    console.log(`  ✗ TILING FAIL: ${tiling.message}`);
    fail++;
  } else {
    console.log(`  ✓ tiling ok`);
  }

  for (const lego of seed.legos) {
    const priorVocab = new Set(vocabSet);
    addLego(lego);
    const phrases = [...(lego.build || []), ...(lego.use || [])];
    const tag = `L${lego.idx} "${lego.known}" → ${lego.target}`;
    if (!phrases.length) { console.log(`  · ${tag}  (no phrases)`); continue; }

    const problems = [];
    V.checkVocabViolations(phrases, vocabSet, COURSE)
      .forEach(v => problems.push(`UNTAUGHT in "${v.phrase}" ← ${v.unknown}`));

    const struct = P.checkBuildUsePhrases(lego, COURSE, seed.seed_number);
    if (struct && struct.valid === false) problems.push(`STRUCTURE: ${struct.error}`);

    const g = V.checkBuildRecombination(lego, COURSE, seed.seed_number, priorVocab);
    if (!g.valid) {
      g.rejects.forEach(r => problems.push(`BUILD-REJECT [${r.class}] "${r.target}" ${r.detail || ''}`));
      if (g.recombining < g.required) problems.push(`BUILD-RECOMB: ${g.recombining}/${g.required}`);
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
console.log(`cumulative Welsh vocab chunks: ${vocabSet.size}`);
console.log(fail ? `✗ ${fail} FAILURE(S)` : `✓ ALL TARGET-SIDE GATES PASS`);
if (process.argv.includes('--vocab')) [...vocabSet].sort().forEach(v => console.log('  ' + v));
process.exit(fail ? 1 : 0);
