#!/usr/bin/env node
/**
 * precheck.cjs <seedNNN.md> — run the /api/seed/complete hard gates locally.
 *
 * The submit endpoint is atomic: it validates everything and inserts nothing on failure. That is
 * the right behaviour but a slow feedback loop across twelve seeds, so this reproduces the gates
 * that actually reject — using the SERVER'S OWN library code, not a re-implementation, so a pass
 * here means the same code path passes there:
 *
 *   - tiling            (checkTiling)          seed target fully covered by lego/component words
 *   - target vocabulary (checkVocabViolations) every phrase target DP-tiles from whole taught chunks
 *   - lego containment  (checkWordContainment) every phrase carries all the lego's words
 *   - phrase counts     (checkBuildUsePhrases) 3 BUILD / 5 USE, no duplicates
 *   - build anti-template (checkBuildRecombination)
 *   - known side        (checkKnownSide)       English prompt uses only introduced glosses + free class
 *   - ZUT               same known → same target, against what is already live
 */
const path = require('path');
const fs = require('fs');
const CB = path.join(__dirname, '../../../services/course-builder');
const { parseMarkdownSeed } = require(path.join(CB, 'lib/markdown-parser.cjs'));
const {
  checkTiling, checkVocabViolations, checkBuildRecombination,
  loadPairContract, checkKnownSide, isKnownVocabBreach, compileKnownContract,
  stemKnownGloss, tokenizeKnown,
} = require(path.join(CB, 'lib/validation.cjs'));
const { checkBuildUsePhrases } = require(path.join(CB, 'lib/phrase-structure.cjs'));
// The 8-syllable LEGO cap. This gate was MISSING here until 21 Aug: a 13-syllable tile in seed 202
// passed this pre-checker clean and was then rejected by the server as `lego_too_large`, which is
// exactly the round trip the tool exists to prevent. preflight.cjs has always checked it; running
// only this one was enough to be caught. Both now check it, so either tool alone is sufficient.
const { checkLegoSyllables } = require(path.join(CB, 'lib/language-config.cjs'));
const { checkWordContainment, extractVocab, normalizeForZUT } = require(path.join(CB, 'lib/text-normalization.cjs'));
const { sb } = require('../q.cjs');

const COURSE = 'gle_cn_for_eng';

async function priorLegos(seedNumber) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('course_legos')
      .select('seed_number,lego_index,known_text,target_text,type,components')
      .eq('course_code', COURSE).lt('seed_number', seedNumber)
      .order('seed_number').order('lego_index').range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

// Mirrors loadTranslationVocab: prior seed targets + prior lego targets + their components.
async function translationVocab(seedNumber, legos) {
  const set = new Set();
  const { data: seeds } = await sb.from('course_seeds')
    .select('target_text').eq('course_code', COURSE)
    .lt('seed_number', seedNumber).not('target_text', 'is', null);
  for (const s of seeds || []) extractVocab(s.target_text, false).forEach(v => set.add(v));
  for (const l of legos) {
    extractVocab(l.target_text, false).forEach(v => set.add(v));
    if (l.type === 'M' && l.components) {
      for (const c of l.components) extractVocab(c.target, false).forEach(v => set.add(v));
    }
  }
  return set;
}

// Mirrors buildKnownSideSeedCtx (seed-complete.cjs) — lego + component GLOSSES only.
function knownCtx(prior, cur, seedNumber, contract) {
  const all = [
    ...prior.map(l => ({ known_text: l.known_text, components: l.components || [], seed_number: l.seed_number })),
    ...cur.map(l => ({ known_text: l.known, components: l.components || [], seed_number: seedNumber })),
  ];
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
  return { ...compileKnownContract(contract), stemFirstPos, consPos: {}, unitPos: [] };
}

async function main() {
  const file = process.argv[2];
  const parsed = parseMarkdownSeed(fs.readFileSync(file, 'utf8'), COURSE);
  const { seed_number, known_text, target_text, legos } = parsed;
  const fails = [];
  const notes = [];

  const { data: seedRow } = await sb.from('course_seeds')
    .select('known_text,target_text').eq('course_code', COURSE).eq('seed_number', seed_number).single();
  if (!seedRow) fails.push(`seed ${seed_number} not found in course_seeds`);
  else {
    if (normalizeForZUT(seedRow.known_text) !== normalizeForZUT(known_text)) {
      fails.push(`CANONICAL MISMATCH known: live "${seedRow.known_text}" vs md "${known_text}"`);
    }
    if (normalizeForZUT(seedRow.target_text) !== normalizeForZUT(target_text)) {
      fails.push(`CANONICAL MISMATCH target: live "${seedRow.target_text}" vs md "${target_text}"`);
    }
  }

  const prior = await priorLegos(seed_number);
  const vocabSet = await translationVocab(seed_number, prior);

  // ─── tiling ──────────────────────────────────────────────────────────────
  const tiling = checkTiling(target_text, legos, COURSE, vocabSet);
  if (!tiling.valid) fails.push(`TILING: ${tiling.message}`);

  // ─── ZUT against what is already live ────────────────────────────────────
  const liveKnown = new Map();
  for (const l of prior) liveKnown.set(normalizeForZUT(l.known_text), l.target_text);
  const phraseKnown = new Map();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('course_practice_phrases')
      .select('known_text,target_text,seed_number').eq('course_code', COURSE)
      .lt('seed_number', seed_number).order('seed_number').order('id').range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const p of data) phraseKnown.set(normalizeForZUT(p.known_text), p.target_text);
    if (data.length < 1000) break;
  }
  for (const l of legos) {
    const hit = liveKnown.get(normalizeForZUT(l.known));
    if (hit && normalizeForZUT(hit) !== normalizeForZUT(l.target)) {
      fails.push(`ZUT lego L${l.idx}: "${l.known}" already maps to "${hit}", you wrote "${l.target}"`);
    }
  }

  // ─── per-lego gates, with vocab accumulating in idx order ────────────────
  legos.sort((a, b) => a.idx - b.idx);
  const contract = loadPairContract(COURSE);
  const kctx = knownCtx(prior, legos, seed_number, contract);
  const seenKnown = new Map();

  for (const lego of legos) {
    const tag = `L${lego.idx}`;
    const priorVocab = new Set(vocabSet);

    const syl = checkLegoSyllables(lego.target, COURSE);
    if (!syl.ok) fails.push(`${tag} TOO LONG: "${lego.target}" is ${syl.syllables} syllables, cap is ${syl.max}`);

    const gate = checkBuildRecombination(lego, COURSE, seed_number, priorVocab);
    if (!gate.valid) {
      fails.push(`${tag} BUILD anti-template: ${gate.rejects.map(r => `[${r.class}] "${r.target}"`).join('; ')
        || `only ${gate.recombining} recombining rows, need ${gate.required}`}`);
    }

    extractVocab(lego.target, false).forEach(v => vocabSet.add(v));
    if (lego.type === 'M' && lego.components) {
      for (const c of lego.components) extractVocab(c.target, false).forEach(v => vocabSet.add(v));
    }

    const basket = [...(lego.build || []), ...(lego.use || [])];
    for (const v of checkVocabViolations(basket, vocabSet, COURSE)) {
      fails.push(`${tag} TARGET VOCAB: "${v.phrase}" — untileable from "${v.unknown}"`);
    }
    for (const p of basket) {
      if (!checkWordContainment(lego.target, p.target)) {
        fails.push(`${tag} CONTAINMENT: "${p.target}" is missing words of lego target "${lego.target}"`);
      }
    }
    const counts = checkBuildUsePhrases(lego, COURSE, seed_number);
    if (!counts.valid) fails.push(`${tag} COUNTS: ${counts.error}`);
    // The RUNNING server (the -prod checkout) is ahead of this tree: it also discards a phrase
    // whose target IS the bare lego, so a "debut row" no longer counts toward the minimum.
    // Reproduce that here or the local pass is a false pass.
    const bare = (p) => normalizeForZUT(p.target) === normalizeForZUT(lego.target);
    const nb = (arr) => (arr || []).filter(p => checkWordContainment(lego.target, p.target) && !bare(p)).length;
    const minB = seed_number <= 3 ? 1 : 3, minU = seed_number <= 3 ? 1 : 5;
    if (nb(lego.build) < minB) fails.push(`${tag} COUNTS (bare excluded): BUILD ${nb(lego.build)} < ${minB}`);
    if (nb(lego.use) < minU) fails.push(`${tag} COUNTS (bare excluded): USE ${nb(lego.use)} < ${minU}`);

    for (const p of basket) {
      const probs = checkKnownSide(p.known, seed_number, kctx).filter(isKnownVocabBreach);
      if (probs.length) fails.push(`${tag} KNOWN SIDE: "${p.known}" — ${probs.join('; ')}`);
      const k = normalizeForZUT(p.known);
      const clash = liveKnown.get(k) || phraseKnown.get(k) || seenKnown.get(k);
      if (clash && normalizeForZUT(clash) !== normalizeForZUT(p.target)) {
        notes.push(`${tag} ZUT phrase held-out: "${p.known}" already maps to "${clash}", you wrote "${p.target}"`);
      }
      seenKnown.set(k, p.target);
    }
    if (counts.valid) notes.push(`${tag} ok — ${counts.details.build} build / ${counts.details.use} use`);
  }

  console.log(`=== precheck seed ${seed_number} (${legos.length} legos) ===`);
  for (const n of notes) console.log('  · ' + n);
  if (!fails.length) { console.log('\nPASS — the hard gates are clean.'); return; }
  console.log(`\nFAIL — ${fails.length}:\n`);
  for (const f of fails) console.log('  ✗ ' + f);
  process.exitCode = 1;
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
