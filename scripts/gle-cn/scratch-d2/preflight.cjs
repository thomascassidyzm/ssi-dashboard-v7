#!/usr/bin/env node
/**
 * preflight.cjs <file.md> [...] — run the /api/seed/complete gates locally, writing nothing.
 *
 * The API validates atomically and tells you everything at once, but each round trip costs a
 * minute and a rejected seed teaches nothing you could not have learned offline. This calls the
 * SAME lib functions the route calls, against the SAME vocabulary the route would load, so a
 * clean run here means the submission will not be rejected on tiling, vocab, containment,
 * BUILD-recombination, phrase counts, syllable cap, length ratio, or lego-level ZUT.
 *
 * The one gate it reports but cannot pre-empt is phrase-level ZUT against phrases another worker
 * lands between this run and the POST — that one holds out a phrase rather than failing the seed.
 */
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../../..');
const { sb } = require('../q.cjs');
const { parseMarkdownSeed } = require(path.join(ROOT, 'services/course-builder/lib/markdown-parser.cjs'));
const {
  checkTiling, checkVocabViolations, checkBuildRecombination, checkPhraseZUT, checkLegoConflict,
} = require(path.join(ROOT, 'services/course-builder/lib/validation.cjs'));
const { checkBuildUsePhrases, usesBuildUseFormat } = require(path.join(ROOT, 'services/course-builder/lib/phrase-structure.cjs'));
const { extractVocab, checkWordContainment, normalizeForContainment } = require(path.join(ROOT, 'services/course-builder/lib/text-normalization.cjs'));
const { checkLegoSyllables } = require(path.join(ROOT, 'services/course-builder/lib/language-config.cjs'));
// The KNOWN side is a controlled language too, and the route blocks on it. Until 2026-08-21 this
// file did not reproduce that gate, so a seed could pass every local check and still be rejected
// for an English prompt using a gloss the course has not introduced ("I won't be able …" at S253).
const {
  loadPairContract, checkKnownSide, isKnownVocabBreach, compileKnownContract,
  stemKnownGloss, tokenizeKnown,
} = require(path.join(ROOT, 'services/course-builder/lib/validation.cjs'));

const COURSE = 'gle_cn_for_eng';

// Mirror of vocab-cache.loadTranslationVocab: prior seed sentences (whole, as one chunk each)
// plus every prior lego target and component target.
async function loadTranslationVocab(upTo) {
  const set = new Set();
  const { data: seeds } = await sb.from('course_seeds').select('target_text')
    .eq('course_code', COURSE).lt('seed_number', upTo).not('target_text', 'is', null);
  for (const s of seeds || []) extractVocab(s.target_text, false).forEach(v => set.add(v));
  const { data: legos } = await sb.from('course_legos').select('target_text,type,components')
    .eq('course_code', COURSE).lt('seed_number', upTo).order('seed_number').order('lego_index');
  for (const l of legos || []) {
    extractVocab(l.target_text, false).forEach(v => set.add(v));
    if (l.type === 'M' && l.components) for (const c of l.components) extractVocab(c.target, false).forEach(v => set.add(v));
  }
  return set;
}

// Mirror of the route's buildKnownSideSeedCtx: gloss stems keyed by the seed that debuts them,
// from prior-seed legos folded with this submission's own legos.
async function buildKnownSideSeedCtx(currentSeed, currentLegos, contract) {
  const { data: prior } = await sb.from('course_legos')
    .select('target_text,known_text,components,seed_number')
    .eq('course_code', COURSE).lt('seed_number', currentSeed)
    .order('seed_number').order('lego_index');
  const cur = (currentLegos || []).map(l => ({
    target_text: l.target, known_text: l.known, components: l.components || [], seed_number: currentSeed,
  }));
  const all = [...(prior || []), ...cur];
  const stemFirstPos = new Map();
  const addStem = (s, seed) => {
    const k = stemKnownGloss(s);
    if (!k) return;
    if (!stemFirstPos.has(k) || stemFirstPos.get(k) > seed) stemFirstPos.set(k, seed);
  };
  for (const l of all) {
    for (const t of tokenizeKnown(l.known_text)) addStem(t, l.seed_number);
    for (const c of l.components || []) for (const t of tokenizeKnown(c.known)) addStem(t, l.seed_number);
  }
  const carrierSeed = (carrier) => {
    let min = Infinity;
    for (const l of all) {
      const hit = l.target_text === carrier || (l.components || []).some(c => c.target === carrier);
      if (hit && l.seed_number < min) min = l.seed_number;
    }
    return min;
  };
  for (const [carrier, syns] of Object.entries(contract.glossSynonyms || {})) {
    const seed = carrierSeed(carrier);
    if (seed < Infinity) for (const syn of syns) addStem(syn, seed);
  }
  const consPos = {};
  for (const con of contract.constructions || []) {
    consPos[con.id] = con.cluster
      ? (contract.clusterSeeds?.[con.cluster] ?? contract.clusterRounds?.[con.cluster] ?? Infinity)
      : carrierSeed(con.carrier);
  }
  const unitPos = (contract.glossUnits || []).map(u => ({ phrase: u.phrase, pos: carrierSeed(u.carrier) }));
  return { ...compileKnownContract(contract), stemFirstPos, consPos, unitPos };
}

async function run(file) {
  const md = fs.readFileSync(file, 'utf8');
  const parsed = parseMarkdownSeed(md);
  const { seed_number, known_text, target_text, legos } = parsed;
  const errs = [];
  const warns = [];

  // The canonical seed row: the API refuses a reworded seed, and our band is translate-free.
  const { data: seedRow } = await sb.from('course_seeds').select('known_text,target_text')
    .eq('course_code', COURSE).eq('seed_number', seed_number).single();
  if (!seedRow) errs.push(`seed ${seed_number} has no row`);
  else {
    const norm = s => (s || '').toLowerCase().trim().replace(/[.?!]+$/, '');
    if (norm(seedRow.known_text) !== norm(known_text)) errs.push(`CANONICAL MISMATCH known: db="${seedRow.known_text}" md="${known_text}"`);
    if (norm(seedRow.target_text) !== norm(target_text)) errs.push(`TARGET DRIFT: db="${seedRow.target_text}" md="${target_text}"`);
  }

  const vocabSet = await loadTranslationVocab(seed_number);

  for (const l of legos) {
    const c = checkLegoSyllables(l.target, COURSE);
    if (!c.ok) errs.push(`L${l.idx} syllable cap: "${l.target}" = ${c.syllables} > ${c.max}`);
    const conflict = await checkLegoConflict(sb, COURSE, l.known, l.target, seed_number);
    if (conflict.conflict === 'zut') errs.push(`L${l.idx} LEGO ZUT: ${conflict.error}`);
    if (conflict.conflict === 'duplicate') warns.push(`L${l.idx} duplicate of ${conflict.legoId} — its phrase basket will be dropped`);
  }

  const tiling = checkTiling(target_text, legos, COURSE, vocabSet);
  if (!tiling.valid) errs.push(`TILING: ${tiling.message}`);

  legos.sort((a, b) => a.idx - b.idx);
  for (const lego of legos) {
    const prior = new Set(vocabSet);
    if (usesBuildUseFormat(lego)) {
      const gate = checkBuildRecombination(lego, COURSE, seed_number, prior);
      if (!gate.valid) errs.push(`L${lego.idx} BUILD gate: recombining ${gate.recombining}/${gate.required}` +
        (gate.rejects.length ? ` rejects=${JSON.stringify(gate.rejects)}` : ''));
    }
    extractVocab(lego.target, false).forEach(v => vocabSet.add(v));
    if (lego.type === 'M' && lego.components) for (const c of lego.components) extractVocab(c.target, false).forEach(v => vocabSet.add(v));

    const all = usesBuildUseFormat(lego) ? [...(lego.build || []), ...(lego.use || [])] : (lego.phrases || []);
    for (const v of checkVocabViolations(all, vocabSet, COURSE)) errs.push(`L${lego.idx} VOCAB: "${v.phrase}" — untileable: [${v.unknown}]`);
    for (const p of all) {
      if (!checkWordContainment(lego.target, p.target)) errs.push(`L${lego.idx} CONTAINMENT: "${p.target}" lacks "${lego.target}"`);
      const r = Math.max(p.known.length, p.target.length) / Math.min(p.known.length, p.target.length);
      if (r > 2.5) errs.push(`L${lego.idx} LENGTH ${r.toFixed(1)}x: "${p.known}" / "${p.target}"`);
    }
    if (usesBuildUseFormat(lego)) {
      const r = checkBuildUsePhrases(lego, COURSE, seed_number);
      if (!r.valid) errs.push(`L${lego.idx} COUNTS: ${r.error}`);
      if ((lego.build || []).length + (lego.use || []).length > 13) errs.push(`L${lego.idx} over 13 phrases`);
    }
  }

  // KNOWN-SIDE GATE — blocks at the route, so it must block here.
  const contract = loadPairContract(COURSE);
  if (!contract) {
    warns.push('known-side gate did NOT run: no pair contract for this course — its silence is not a pass');
  } else {
    const knownCtx = await buildKnownSideSeedCtx(seed_number, legos, contract);
    for (const lego of legos) {
      const basket = usesBuildUseFormat(lego) ? [...(lego.build || []), ...(lego.use || [])] : (lego.phrases || []);
      for (const p of basket) {
        if (!p.known) continue;
        const probs = checkKnownSide(p.known, seed_number, knownCtx);
        const breaches = probs.filter(isKnownVocabBreach);
        if (breaches.length) errs.push(`L${lego.idx} KNOWN-VOCAB: "${p.known}" — ${breaches.slice(0, 2).join('; ')}`);
        const advisories = probs.filter(p2 => !isKnownVocabBreach(p2));
        if (advisories.length) warns.push(`L${lego.idx} known-side advisory: "${p.known}" — ${advisories[0]}`);
      }
    }
  }

  const allPhrases = legos.flatMap(l => [...(l.build || []), ...(l.use || [])]);
  for (const c of await checkPhraseZUT(sb, COURSE, allPhrases, seed_number)) {
    errs.push(`PHRASE ZUT (held out): "${c.known}" → you "${c.new_target}" vs S${c.existing_seed} "${c.existing_target}"`);
  }
  // Within-seed known collisions: two phrases with the same English and different Irish.
  const byKnown = new Map();
  for (const p of allPhrases) {
    const k = p.known.toLowerCase().trim().replace(/[.?!]+$/, '');
    if (byKnown.has(k) && byKnown.get(k) !== p.target) errs.push(`INTERNAL ZUT: "${p.known}" → "${byKnown.get(k)}" and "${p.target}"`);
    byKnown.set(k, p.target);
  }

  console.log(`\n=== ${path.basename(file)} — seed ${seed_number}, ${legos.length} legos, ${allPhrases.length} phrases`);
  warns.forEach(w => console.log(`  ⚠ ${w}`));
  if (errs.length === 0) console.log('  ✓ CLEAN — all local gates pass');
  else errs.forEach(e => console.log(`  ✗ ${e}`));
  return errs.length === 0;
}

(async () => {
  let ok = true;
  for (const f of process.argv.slice(2)) ok = (await run(f)) && ok;
  process.exit(ok ? 0 : 1);
})();
