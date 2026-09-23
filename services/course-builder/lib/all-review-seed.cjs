'use strict';
/**
 * ALL-REVIEW SEEDS: RE-HOME, NEVER PAD.
 *
 * Kai's ruling, 2026-09-23 19:40Z (job #932·H), verbatim: "we shouldn't include a big block just to stop a seed
 * from being empty. We can try to include bits from the seed under other legos in the area to make sure they're
 * not fully lost and even make sure we include the seed itself somewhere (if it is completely taught by a certain
 * point in the course before the seed, then there must be a point where the final needed lego is taught - that's
 * where it can go)."
 *
 * Why this file exists. The seed lists recombine earlier seeds by design, so some seeds teach nothing new. The app
 * plays only seeds with an is_new LEGO (course_round_index is built from is_new = true rows), so such a seed is
 * silently skipped. Before this rule the builder had two behaviours, chosen seed by seed by whoever tiled it:
 *   (a) tile with existing chunks → every LEGO a duplicate → the seed vanishes and its sentence is never heard;
 *   (b) glue the taught pieces into one bigger "new" string → a padded block that teaches nothing, so the seed plays.
 * Both are wrong. The rule: a seed with nothing new keeps NO block of its own; its sentence becomes ONE extra 'use'
 * practice phrase under the LEGO whose debut completes its coverage — the latest-taught piece it needs — which the
 * phrase must contain on both sides. If the seed is not fully covered by earlier LEGOs the builder says so and
 * writes nothing: that is a content question for the course builder, not something to paper over.
 *
 * The old rescue (three copies, in seed-complete.cjs, v2.cjs and drafts.cjs) keyed its "newest word" lookup on
 * extractVocab(), which returns the WHOLE normalised string, so it could only ever match a seed whose English equals
 * one entire LEGO — and the v2 copy then skipped exactly that case as a bare-LEGO phrase. It also swallowed its
 * insert error. That is why eng_for_hin had zero seed_sentence phrases after the 2 Sept 2026 rebuild (d/aa26b755).
 *
 * Pieces are LEGO PAIRS, not words: the learner has a piece when a LEGO taught it on both sides. Word-level
 * coverage ("every English word was in some earlier LEGO") is not coverage — that is how padded blocks were argued
 * into existence (d/73be2767).
 */

const { makePhraseId, computeLegoPosition, isBareLegoPhrase } = require('./phrase-structure.cjs');

const MAX_PIECES = 8;
const MAX_TILINGS = 400;

/** Word tokens on either side: lower-cased, punctuation (incl. the Hindi danda) stripped, curly apostrophes flattened. */
function tokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[.,!?;:।"“”¿¡«»。，！？؟،؛、：；]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}
const key = (words) => words.join(' ');
const normalizedEnglish = (text) => key(tokens(text));

function sortedBag(words) { return [...words].sort(); }
function bagEqual(a, b) {
  if (a.length !== b.length) return false;
  const sa = sortedBag(a), sb = sortedBag(b);
  return sa.every((w, i) => w === sb[i]);
}
function bagMinus(a, b) {
  const rest = [...a];
  for (const w of b) { const i = rest.indexOf(w); if (i >= 0) rest.splice(i, 1); }
  return rest;
}

/** LEGO rows come in two shapes across the write paths: {known_text,target_text} (DB) and {known,target} (submission). */
function legoSides(l) {
  return { known: l.known_text ?? l.known ?? '', target: l.target_text ?? l.target ?? '' };
}
function legoId(l) {
  if (l.lego_id) return l.lego_id;
  return `S${String(l.seed_number).padStart(4, '0')}L${String(l.lego_index ?? l.idx).padStart(2, '0')}`;
}
const later = (a, b) => (a.seed_number - b.seed_number) || ((a.lego_index ?? a.idx ?? 0) - (b.lego_index ?? b.idx ?? 0));

/**
 * Every way to tile the English of `target` CONTIGUOUSLY with the English of the given LEGOs (in sentence order).
 * Returns a list of LEGO lists. Capped so a long sentence over a big course cannot explode.
 */
function tileEnglish(target, legos) {
  const words = tokens(target);
  const cands = legos.map(l => ({ lego: l, words: tokens(legoSides(l).target) })).filter(c => c.words.length);
  const out = [];
  const rec = (i, acc) => {
    if (out.length >= MAX_TILINGS || acc.length > MAX_PIECES) return;
    if (i === words.length) { out.push([...acc]); return; }
    for (const c of cands) {
      const n = c.words.length;
      if (n > words.length - i) continue;
      let ok = true;
      for (let k = 0; k < n; k++) if (words[i + k] !== c.words[k]) { ok = false; break; }
      if (!ok) continue;
      acc.push(c.lego); rec(i + n, acc); acc.pop();
    }
  };
  rec(0, []);
  return out;
}

/** The Hindi (known) side of a tiling: the LEGOs' known words as a multiset against the seed's. */
function knownSideOf(tiling, known) {
  const seedWords = tokens(known);
  const legoWords = tiling.flatMap(l => tokens(legoSides(l).known));
  return {
    exact: bagEqual(seedWords, legoWords),
    missing: bagMinus(seedWords, legoWords),   // seed words no piece supplies
    extra: bagMinus(legoWords, seedWords),     // piece words the seed does not have (a variant form, e.g. gender)
  };
}

/** Does the phrase contain the LEGO — English contiguous and in order; Hindi every word in order, gaps allowed? */
function containsInOrder(hay, needle, gapsAllowed) {
  const h = tokens(hay), n = tokens(needle);
  if (!n.length) return false;
  if (!gapsAllowed) return ` ${h.join(' ')} `.includes(` ${n.join(' ')} `);
  let i = 0;
  for (const w of h) if (w === n[i]) i++;
  return i === n.length;
}
function phraseContainsLego(lego, phrase) {
  const l = legoSides(lego), p = legoSides(phrase);
  return containsInOrder(p.target, l.target, false) && containsInOrder(p.known, l.known, true);
}

/**
 * Where an all-review seed's sentence goes: the latest-taught LEGO among the pieces that cover it.
 *
 * `priorLegos` are the course's is_new LEGOs taught BEFORE this seed. `knownVocab` (optional) is the set of known-side
 * words the learner has met in earlier LEGOs, used only to accept a seed whose Hindi carries a form the tiling does
 * not supply verbatim (या नहीं met inside an earlier LEGO; a feminine agreement) — the known side may outrun its
 * introductions, the English may not.
 *
 * Returns { host, tiling, coverage } with coverage 'both' (Hindi multiset exact) or 'english' (English tiled, the
 * Hindi differences all previously met), or { host: null, reason, ... } when the seed is not fully covered.
 */
function findRehomeHost(seed, priorLegos, opts = {}) {
  const { known, target } = legoSides(seed);
  const tilings = tileEnglish(target, priorLegos);
  if (!tilings.length) return { host: null, reason: 'the English is not tiled by earlier LEGOs — the seed teaches something new', tilings: 0 };
  const knownVocab = opts.knownVocab || new Set(priorLegos.flatMap(l => tokens(legoSides(l).known)));
  const scored = tilings.map(t => {
    const k = knownSideOf(t, known);
    const hindiAllMet = k.missing.every(w => knownVocab.has(w));
    const coverage = k.exact ? 'both' : (hindiAllMet ? 'english' : null);
    return { tiling: t, knownSide: k, coverage };
  }).filter(s => s.coverage);
  if (!scored.length) {
    const best = tilings[0];
    const k = knownSideOf(best, known);
    return { host: null, reason: `the Hindi has words no earlier LEGO gave the learner: ${k.missing.join(' ')}`, tilings: tilings.length };
  }
  scored.sort((a, b) => (a.coverage === b.coverage ? a.tiling.length - b.tiling.length : (a.coverage === 'both' ? -1 : 1)));
  const best = scored[0];
  // The host is the last-taught piece — and the phrase must contain it on both sides. If the last piece is present
  // only as a variant form on the Hindi side, the next-latest contained piece hosts, and we say so.
  const byDebut = [...best.tiling].sort((a, b) => later(b, a));
  const host = byDebut.find(l => phraseContainsLego(l, { known, target })) || null;
  if (!host) return { host: null, reason: 'no covering LEGO is contained in the sentence on both sides', tilings: tilings.length };
  return {
    host,
    hostIsLastPiece: host === byDebut[0],
    tiling: best.tiling,
    coverage: best.coverage,
    knownSide: best.knownSide,
  };
}

/**
 * A PADDED BLOCK: a "new" LEGO that is nothing but earlier LEGO pairs glued together — both sides tile exactly from
 * pieces the learner already has. Under Kai's rule it is not a LEGO; when it is the only non-duplicate LEGO of its
 * seed it exists only to keep the seed alive, and the seed is re-homed instead. Returns the pieces, or null.
 */
function paddedBlockPieces(lego, priorLegos) {
  const { known, target } = legoSides(lego);
  const tilings = tileEnglish(target, priorLegos);
  for (const t of tilings) {
    if (t.length < 2) continue; // one piece = a duplicate, which dedup already handles
    if (knownSideOf(t, known).exact) return t;
  }
  return null;
}

/**
 * The seed's "new vs reuse" decision, applied to a submission: given the LEGOs of one seed and which of them the
 * dedup already marked duplicate, return the ids of any LEGO that must be DEMOTED to a duplicate because it is a
 * padded block and the seed's only non-duplicate LEGO.
 */
function paddedBlocksToDemote(legos, duplicateIds, priorLegos) {
  const nonDup = legos.filter(l => !duplicateIds.has(legoId(l)));
  if (nonDup.length !== 1) return [];
  const pieces = paddedBlockPieces(nonDup[0], priorLegos);
  return pieces ? [{ lego_id: legoId(nonDup[0]), pieces: pieces.map(legoId) }] : [];
}

/** Tom's rule: the same English is never practised twice. */
function alreadyPractised(target, existingTargets) {
  const t = normalizedEnglish(target);
  return (existingTargets || []).find(e => normalizedEnglish(e) === t) || null;
}

/** The row a re-homed sentence becomes: one more 'use' phrase, last in its host's basket. */
function seedSentenceRow({ course_code, seed_number, known_text, target_text, host, existingPhrases, eventId }) {
  const maxPos = (existingPhrases || []).reduce((m, p) => Math.max(m, p.position || 0), 0);
  const useCount = (existingPhrases || []).filter(p => p.phrase_role === 'use').length;
  const h = legoSides(host);
  return {
    id: makePhraseId(course_code, host.seed_number, host.lego_index, 'use', useCount + 1),
    course_code,
    seed_number: host.seed_number,
    lego_index: host.lego_index,
    position: maxPos + 1,
    known_text,
    target_text,
    word_count: target_text.length,
    lego_count: (known_text.match(/\s+/g) || []).length + 1,
    phrase_role: 'use',
    connected_lego_ids: [],
    lego_position: computeLegoPosition(target_text, h.target),
    metadata: { format: 'build_use', source: 'seed_sentence', source_seed: seed_number, score: 8 },
    introduce: true,
    status: 'draft',
    version: 1,
    last_edit_event_id: eventId || null,
  };
}

async function loadPriorNewLegos(supabase, course_code, seed_number) {
  const { data, error } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, lego_id, known_text, target_text')
    .eq('course_code', course_code)
    .eq('is_new', true)
    .lt('seed_number', seed_number)
    .order('seed_number')
    .order('lego_index');
  if (error) throw new Error(`all-review seed: could not load earlier LEGOs: ${error.message}`);
  return data || [];
}

/**
 * Re-home an all-review seed's sentence. Called by every write path once it knows every LEGO of the seed is a
 * duplicate. Never pads. Throws on a failed insert (a rescue that fails silently is how 2 Sept went unnoticed).
 *
 * Outcomes: 'rehomed' (row inserted), 'bare-lego' (the sentence IS the host LEGO, met at its debut),
 * 'already-practised' (the same English is a phrase already), 'not-covered' (left for the course builder).
 */
async function rehomeAllReviewSeed(supabase, { course_code, seed_number, known_text, target_text, eventId, log = console.log }) {
  const prior = await loadPriorNewLegos(supabase, course_code, seed_number);
  const found = findRehomeHost({ known_text, target_text }, prior);
  if (!found.host) {
    log(`  ⚠ Seed ${seed_number} teaches nothing new but is NOT covered by earlier LEGOs (${found.reason}). Nothing written — a content decision, not a padding job.`);
    return { outcome: 'not-covered', reason: found.reason };
  }
  const host = found.host;
  const hostId = legoId(host);
  if (isBareLegoPhrase(target_text, host.target_text)) {
    log(`  Seed ${seed_number} IS the LEGO ${hostId} — the learner meets it at that debut; no phrase added`);
    return { outcome: 'bare-lego', host: hostId };
  }
  const pattern = `%${tokens(target_text).join('%')}%`;
  const { data: sameEnglish, error: sameErr } = await supabase
    .from('course_practice_phrases').select('id, target_text').eq('course_code', course_code).ilike('target_text', pattern);
  if (sameErr) throw new Error(`all-review seed ${seed_number}: phrase lookup failed: ${sameErr.message}`);
  const dup = alreadyPractised(target_text, (sameEnglish || []).map(p => p.target_text));
  if (dup) {
    const row = sameEnglish.find(p => p.target_text === dup);
    log(`  Seed ${seed_number} is already practised as ${row.id} — the same English is never practised twice`);
    return { outcome: 'already-practised', host: hostId, phraseId: row.id };
  }
  const { data: existingPhrases, error: exErr } = await supabase
    .from('course_practice_phrases').select('position, phrase_role')
    .eq('course_code', course_code).eq('seed_number', host.seed_number).eq('lego_index', host.lego_index);
  if (exErr) throw new Error(`all-review seed ${seed_number}: host basket lookup failed: ${exErr.message}`);
  const row = seedSentenceRow({ course_code, seed_number, known_text, target_text, host, existingPhrases, eventId });
  const { error: insErr } = await supabase.from('course_practice_phrases').insert(row);
  if (insErr) throw new Error(`all-review seed ${seed_number}: could not re-home its sentence under ${hostId}: ${insErr.message}`);
  log(`  ✓ Seed ${seed_number} re-homed → use phrase ${row.id} under ${hostId} (${host.target_text}); coverage ${found.coverage}${found.hostIsLastPiece ? '' : ' (host is the latest piece the sentence contains on both sides)'}`);
  return { outcome: 'rehomed', host: hostId, phraseId: row.id, row, coverage: found.coverage, pieces: found.tiling.map(legoId) };
}

module.exports = {
  tokens, normalizedEnglish, tileEnglish, knownSideOf, containsInOrder, phraseContainsLego,
  findRehomeHost, paddedBlockPieces, paddedBlocksToDemote, alreadyPractised, seedSentenceRow,
  loadPriorNewLegos, rehomeAllReviewSeed, legoId,
};
