/**
 * PHRASE GATE — the real /api/seed/complete gates, replayed read-only over a
 * GENERATED phrase set, as a callable function.
 *
 * WHY THIS FILE EXISTS. Tom's ruling on A-294 (2026-08-28): "What we should be
 * doing is making sure that we do have the gate on these, so they can't even
 * come to me without having passed the gate conditions, whatever ones we kept,
 * as well as have the new scoring." A precondition is a machine check the
 * generator cannot route around — not a line in a prompt asking a model to be
 * careful. This module is that machine check, and it is COMMITTED: the earlier
 * replay lived at scripts/v3-verify/check-gates.cjs, and `scripts/` is
 * gitignored, so it existed only as an untracked file in one worktree. A
 * precondition that exists in one worktree is not a precondition.
 *
 * WHAT IT REPLAYS. services/course-builder/routes/seed-complete.cjs,
 * section-by-section, using that route's own library functions rather than
 * re-implementations — bareLego, buildUseFloors, containment, vocab,
 * buildRecombination, zut, knownSide. That route is the reference for argument
 * order, vocab scoping and what counts as a failure; read it before changing
 * this file. Two deliberate differences, both stated rather than hidden:
 *   - the live route escalates a 3rd-strike buildRecombination failure to Opus
 *     for a re-roll. Here a failure is reported as a failure; the RETRY lives
 *     one level up, in the door, where it can regenerate the whole set.
 *   - the tokenizer-blindness detection that wraps the known-side check in the
 *     live route (known-side-script.cjs) is not replayed.
 *
 * PLUS ONE GATE THE LIVE ROUTE DOES NOT HAVE: buildCountSpec. Tom, same ruling —
 * "three or four build phrases, just to give a sense of ... LEGO plus one
 * previous, LEGO plus two previous". The shared validator's floor stays at 3
 * (lowering it would let thin sets through elsewhere in the estate); this is a
 * v3-door spec check that a generated set actually obeys the new count.
 *
 * READ-ONLY. No writes, no LLM calls, no TTS. It SELECTs prior LEGOs and seeds.
 */

const { isChinese } = require('../../services/course-builder/lib/language-config.cjs');
const {
  extractVocab, normalizeForContainment, checkWordContainment,
} = require('../../services/course-builder/lib/text-normalization.cjs');
const {
  checkBuildUsePhrases, partitionBareLegoPhrases,
} = require('../../services/course-builder/lib/phrase-structure.cjs');
const {
  checkVocabViolations, checkBuildRecombination, checkPhraseZUT,
  checkKnownSide, isKnownVocabBreach, loadPairContract, compileKnownContract,
  stemKnownGloss, tokenizeKnown,
} = require('../../services/course-builder/lib/validation.cjs');

/** Tom's BUILD count, 2026-08-28. Four is the target; three is accepted. */
const BUILD_MIN = 3;
const BUILD_MAX = 4;

const GATE_NAMES = [
  'bareLego', 'buildCountSpec', 'buildUseFloors', 'containment',
  'vocab', 'buildRecombination', 'zut', 'knownSide',
];

// ─── Known-side seed context ────────────────────────────────────────────
// buildKnownSideSeedCtx is route-local in seed-complete.cjs, so this is a
// faithful copy: same DB read, same stem/carrier/construction position maps.
async function buildKnownSideSeedCtx(supabase, courseCode, currentSeed, currentLegos, contract) {
  const prior = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('course_legos')
      .select('target_text,known_text,components,seed_number')
      .eq('course_code', courseCode).lt('seed_number', currentSeed)
      .order('seed_number').order('lego_index').range(from, from + 999);
    if (error) throw new Error(error.message);
    prior.push(...data);
    if (data.length < 1000) break;
  }
  const cur = (currentLegos || []).map(l => ({
    target_text: l.target, known_text: l.known, components: l.components || [], seed_number: currentSeed,
  }));
  const all = [...prior, ...cur];
  const stemFirstPos = new Map();
  const addStem = (s, seed) => { const k = stemKnownGloss(s); if (!k) return; if (!stemFirstPos.has(k) || stemFirstPos.get(k) > seed) stemFirstPos.set(k, seed); };
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
    consPos[con.id] = con.cluster ? (contract.clusterSeeds?.[con.cluster] ?? contract.clusterRounds?.[con.cluster] ?? Infinity) : carrierSeed(con.carrier);
  }
  const unitPos = (contract.glossUnits || []).map(u => ({ phrase: u.phrase, pos: carrierSeed(u.carrier) }));
  return { ...compileKnownContract(contract), stemFirstPos, consPos, unitPos };
}

// ─── Vocab, scoped exactly as seed-complete.cjs scopes it ────────────────
async function loadTranslationVocab(supabase, courseCode, upToSeedNumber) {
  const chinese = isChinese(courseCode);
  const vocabSet = new Set();

  const { data: seeds } = await supabase.from('course_seeds')
    .select('target_text').eq('course_code', courseCode)
    .lt('seed_number', upToSeedNumber).not('target_text', 'is', null);
  for (const seed of seeds || []) extractVocab(seed.target_text, chinese).forEach(v => vocabSet.add(v));

  const { data: legos } = await supabase.from('course_legos')
    .select('target_text, type, components').eq('course_code', courseCode)
    .lt('seed_number', upToSeedNumber).order('seed_number').order('lego_index');
  for (const lego of legos || []) {
    extractVocab(lego.target_text, chinese).forEach(v => vocabSet.add(v));
    if (lego.type === 'M' && lego.components) {
      for (const c of lego.components) extractVocab(c.target, chinese).forEach(v => vocabSet.add(v));
    }
  }
  return vocabSet;
}

async function loadSameSeedSiblingVocab(supabase, courseCode, seedNumber, chinese) {
  const vocab = new Set();
  const { data: siblingLegos } = await supabase.from('course_legos')
    .select('target_text, type, components').eq('course_code', courseCode).eq('seed_number', seedNumber);
  for (const sl of siblingLegos || []) {
    extractVocab(sl.target_text, chinese).forEach(v => vocab.add(v));
    if (sl.type === 'M' && sl.components) {
      for (const c of sl.components) extractVocab(c.target, chinese).forEach(v => vocab.add(v));
    }
  }
  return vocab;
}

/**
 * One context per course_code — pair-contract, known language, and the per-seed
 * caches. Hold it across a run; a fresh one per LEGO would re-read the whole
 * prior-LEGO table each time.
 */
function makeCourseCtx(supabase, courseCode) {
  const knownLang = courseCode.replace(/_v\d+$/, '').split('_for_')[1];
  return {
    supabase,
    knownLang,
    contract: loadPairContract(courseCode),
    vocabCache: new Map(),
    knownCtxCache: new Map(),
  };
}

/**
 * Run every gate over ONE generated LEGO set.
 *
 * @param {object} entry {courseCode, seedNumber, legoIndex, legoId, legoKnown,
 *                        legoTarget, components?, phrases:[{role,known,target}]}
 *                       — or {build:[], use:[]} instead of `phrases`.
 * @param {object} ctx   from makeCourseCtx
 * @returns {object} {overallPass, failingGates:[], gates:{}}
 */
async function checkPhraseSet(entry, ctx) {
  const { courseCode, seedNumber, legoIndex, legoId, legoKnown, legoTarget } = entry;
  const supabase = ctx.supabase;
  const chinese = isChinese(courseCode);
  const build = entry.phrases ? entry.phrases.filter(p => p.role === 'build') : (entry.build || []);
  const use = entry.phrases ? entry.phrases.filter(p => p.role === 'use') : (entry.use || []);

  const gates = {};
  const failingGates = [];
  const fail = (name, detail) => { gates[name] = { pass: false, ...detail }; failingGates.push(name); };
  const pass = (name, detail) => { gates[name] = { pass: true, ...(detail || {}) }; };

  // ── bare-LEGO ban ──
  const buildBare = partitionBareLegoPhrases(build, legoTarget);
  const useBare = partitionBareLegoPhrases(use, legoTarget);
  const bareCount = buildBare.bare.length + useBare.bare.length;
  if (bareCount > 0) {
    fail('bareLego', {
      dropped: bareCount,
      detail: `${buildBare.bare.length} bare BUILD + ${useBare.bare.length} bare USE row(s) are copies of the LEGO itself and teach nothing`,
    });
  } else pass('bareLego');

  // ── BUILD count spec (Tom 2026-08-28): three or four, never five ──
  if (build.length < BUILD_MIN || build.length > BUILD_MAX) {
    fail('buildCountSpec', {
      build: build.length,
      required: `${BUILD_MIN}-${BUILD_MAX}`,
      detail: build.length > BUILD_MAX
        ? `${build.length} BUILD phrases — BUILD is a sense of the pattern, not coverage; write ${BUILD_MAX}`
        : `${build.length} BUILD phrases — below the ${BUILD_MIN} the validator itself requires`,
    });
  } else pass('buildCountSpec', { build: build.length });

  // ── BUILD/USE floors ──
  const buResult = checkBuildUsePhrases({ idx: legoIndex, build, use, target: legoTarget }, courseCode, seedNumber);
  if (!buResult.valid) fail('buildUseFloors', { error: buResult.error, details: buResult.details });
  else pass('buildUseFloors', { details: buResult.details });

  // ── LEGO containment (seed-complete.cjs §3) ──
  {
    const legoTargetNorm = normalizeForContainment(legoTarget);
    const containmentFails = [...build, ...use].filter(p => (chinese
      ? !normalizeForContainment(p.target).includes(legoTargetNorm)
      : !checkWordContainment(legoTarget, p.target)));
    if (containmentFails.length > 0) {
      fail('containment', { failing: containmentFails.length, examples: containmentFails.slice(0, 3).map(p => p.target) });
    } else pass('containment');
  }

  // ── vocab set: prior seeds + DB siblings of this seed + this LEGO's own ──
  const vocabSet = ctx.vocabCache.get(seedNumber) || await (async () => {
    const v = await loadTranslationVocab(supabase, courseCode, seedNumber);
    const sib = await loadSameSeedSiblingVocab(supabase, courseCode, seedNumber, chinese);
    sib.forEach(w => v.add(w));
    ctx.vocabCache.set(seedNumber, v);
    return v;
  })();

  // Snapshot BEFORE this LEGO's own vocab is folded in — the anti-template gate
  // needs "previously introduced", not "including this LEGO".
  const priorVocab = new Set(vocabSet);
  const withLego = new Set(vocabSet);
  extractVocab(legoTarget, chinese).forEach(v => withLego.add(v));
  // Fold in so a later entry in the same seed sees it as an earlier LEGO,
  // matching seed-complete.cjs's in-order accumulation.
  withLego.forEach(v => vocabSet.add(v));

  {
    const allPhrases = [...build, ...use];
    const violations = allPhrases.length ? checkVocabViolations(allPhrases, withLego, courseCode) : [];
    if (violations.length > 0) fail('vocab', { violations: violations.slice(0, 5), total: violations.length });
    else pass('vocab', { vocabSize: withLego.size });
  }

  // ── BUILD anti-template / recombination ──
  {
    const gate = checkBuildRecombination({ idx: legoIndex, target: legoTarget, build, use }, courseCode, seedNumber, priorVocab);
    if (!gate.valid) fail('buildRecombination', { rejects: gate.rejects, recombining: gate.recombining, required: gate.required });
    else pass('buildRecombination', { recombining: gate.recombining, required: gate.required });
  }

  // ── phrase-level ZUT against prior seeds ──
  {
    const allPhrases = [...build, ...use].filter(p => p.known && p.target);
    const collisions = allPhrases.length ? await checkPhraseZUT(supabase, courseCode, allPhrases, seedNumber) : [];
    if (collisions.length > 0) fail('zut', { collisions: collisions.slice(0, 5), total: collisions.length });
    else pass('zut');
  }

  // ── known-side reconstructability ──
  {
    const contract = ctx.contract;
    const contractUsable = contract && (!contract.known_lang || contract.known_lang === ctx.knownLang);
    if (!contractUsable) {
      gates.knownSide = { pass: null, unchecked: true, reason: contract ? 'contract known_lang mismatch' : 'no pair-contract found' };
    } else {
      const knownCtx = ctx.knownCtxCache.get(seedNumber) || await (async () => {
        const c = await buildKnownSideSeedCtx(supabase, courseCode, seedNumber, [{ known: legoKnown, target: legoTarget, components: entry.components }], contract);
        ctx.knownCtxCache.set(seedNumber, c);
        return c;
      })();
      const breaches = [];
      const advisories = [];
      for (const phrase of [...build, ...use]) {
        if (!phrase.known) continue;
        for (const p of checkKnownSide(phrase.known, seedNumber, knownCtx)) {
          (isKnownVocabBreach(p) ? breaches : advisories).push({ known: phrase.known, target: phrase.target, problem: p });
        }
      }
      if (breaches.length > 0) fail('knownSide', { breaches: breaches.slice(0, 5), total: breaches.length, advisories: advisories.length });
      else pass('knownSide', { advisories: advisories.length });
    }
  }

  const overallPass = failingGates.length === 0 && gates.knownSide.pass !== false;

  return {
    legoId: legoId || `S${String(seedNumber).padStart(4, '0')}L${String(legoIndex).padStart(2, '0')}`,
    courseCode, seedNumber, legoIndex, legoKnown, legoTarget,
    buildCount: build.length, useCount: use.length,
    overallPass, failingGates, gates,
  };
}

/**
 * A one-line, human-readable reason per failing gate — this is what gets fed
 * back into a regeneration retry, so it has to name the offending phrase.
 */
function failureFeedback(result) {
  const lines = [];
  for (const name of result.failingGates || []) {
    const g = result.gates[name] || {};
    switch (name) {
      case 'buildCountSpec':
        lines.push(`buildCountSpec: ${g.detail}`); break;
      case 'knownSide':
        lines.push(`knownSide: ${g.total} phrase(s) use English the learner has not been given. ${(g.breaches || []).map(b => `"${b.known}" (${b.problem})`).join('; ')}`); break;
      case 'vocab':
        lines.push(`vocab: ${g.total} phrase(s) use target words not yet introduced: ${JSON.stringify(g.violations)}`); break;
      case 'zut':
        lines.push(`zut: ${g.total} phrase(s) collide with an existing known->target mapping: ${JSON.stringify(g.collisions)}`); break;
      case 'containment':
        lines.push(`containment: ${g.failing} phrase(s) do not contain the LEGO's target: ${(g.examples || []).join(' | ')}`); break;
      case 'bareLego':
        lines.push(`bareLego: ${g.detail}`); break;
      case 'buildUseFloors':
        lines.push(`buildUseFloors: ${g.error}`); break;
      case 'buildRecombination':
        lines.push(`buildRecombination: only ${g.recombining} of the BUILD phrases recombine with previously-taught material (${g.required} required)`); break;
      default:
        lines.push(`${name}: failed`);
    }
  }
  return lines;
}

module.exports = {
  GATE_NAMES, BUILD_MIN, BUILD_MAX,
  makeCourseCtx, checkPhraseSet, failureFeedback,
};
