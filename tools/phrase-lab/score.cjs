#!/usr/bin/env node
/**
 * ZUT CHECKER + EDGE SCORER — the acceptance test for the phrase prompt.
 *
 * ONE GATE, ONE FUNCTIONAL. That is the whole instrument, and it is deliberately
 * not gate number twelve on a stack of eleven.
 *
 *   THE GATE (binary, ZUT): does the learner know exactly which target words this
 *     prompt is asking them to say? Failures are named with the offending token
 *     and the reason. A phrase that fails scores nothing — you cannot buy edges
 *     with a phrase the learner cannot produce.
 *
 *     The gate reports in TWO LAYERS, and the split is load-bearing rather than
 *     a softening. LAYER 1 is what this builder did: target material that was
 *     never introduced, target material no tile accounts for, and target meaning
 *     the prompt never asks for. LAYER 2 is ambiguity the phrase INHERITS from
 *     the course's own mapping table — spa_for_eng glosses English "that" onto
 *     six different Spanish forms, so every phrase in the estate containing
 *     "that" is genuinely non-deterministic. That is real ZUT debt and it is
 *     counted and named per phrase and course-wide. It is not charged to the
 *     individual phrase, because a first draft of this checker did charge it and
 *     failed 100% of live content INCLUDING the set Tom hand-graded as the good
 *     one — a gate that fires on everything discriminates between nothing.
 *     Layer 1 is the pass/fail. Layer 2 is a reported rate. Both are compared
 *     across arms; neither is hidden.
 *
 *   THE FUNCTIONAL: NEW EDGES PER SYLLABLE OF LEARNER EFFORT. A phrase set is a
 *     walk from the new LEGO into the network the learner already owns. Its value
 *     is the connections drawn, priced against the syllables spent.
 *
 *     AN EDGE IS AN ADJACENCY, not a co-occurrence, and that correction was
 *     forced by the data. Counting every LEGO that happens to appear in the same
 *     phrase makes the numerator scale with phrase length exactly as the syllable
 *     denominator does, so every set in the estate lands near 0.32 and the metric
 *     separates nothing. What a learner connects the new LEGO to is what it
 *     TOUCHES — the bread either side of the filling.
 *
 *     AND THE FUNCTIONAL IS A VECTOR, NOT A SCALAR. Measured on Tom's two
 *     hand-graded sets, edges-per-syllable comes out 0.081 for the GOOD one and
 *     0.083 for the tail-swapped one: no separation. That is not a bug, it is the
 *     honest shape of the thing — spa 358 is rich in PATTERN and poor in
 *     POSITION, spa 600 the reverse, and a single number averages the diagnosis
 *     away. So `verdict()` reports FLOORS PER NAMED AXIS and the shortfalls carry
 *     the rewrite instruction. Several coarse floors are also far harder to
 *     Goodhart than one continuous score: you cannot tail-swap your way to three
 *     positions or to four varied axes.
 *
 * WHY EDGES AND NOT COUNTS. "At least 6 phrases" is satisfiable by writing
 * "I'd have driven ___" six times with the tail swapped — nine phrases, one edge,
 * maximum syllables (spa seed 600, live in the database today). "At least 6
 * distinct partner-LEGO x pattern combinations" is satisfiable only by doing the
 * pedagogical work. The metric is the value, not a proxy for it.
 *
 * THE THREE POSITIONS ARE TOM'S, verbatim (2026-08-27): "they can connect in only
 * 3 ways / either bread slice or filling / start / middle (with >= 1 connection
 * either side) / end". FILLING is the expensive one and is reported on its own,
 * because filling is the position you cannot reach by tail-swapping — it needs a
 * connection held on both sides at once.
 *
 * NO TYPE-BASED EXEMPTIONS. A normalisation for nouns ("they naturally sit at the
 * end") was proposed and Tom killed it: "the trouble with life at the top, is you
 * can only go one way / it's not that difficult". End-only is where a noun lands
 * if you only ever build by extending rightward from a verb. So a set scores
 * honestly short on position spread and the rewrite instruction writes itself.
 *
 * BLD AND USE ARE SCORED TO THEIR OWN BARS and reported separately, because a
 * LEGO can have rich builds and dead uses and the rewrite instruction differs.
 * A BLD phrase is allowed to be an honest fragment. A USE phrase carries a bar
 * BLD does not: it must stand alone as a complete deployable thought.
 *
 * MECHANICAL FIRST, JUDGEMENT ONLY ON THE RESIDUE. Everything above is computed.
 * The one thing that is not computable — "is this USE phrase worth having" — goes
 * to a model, through the Claude CLI wrapper, never the Anthropic SDK.
 *
 * READ-ONLY with respect to course content. Writes nothing to the database.
 *
 * Usage:
 *   node tools/phrase-lab/score.cjs spa_for_eng 358          # score what's in the DB
 *   node tools/phrase-lab/score.cjs --file set.json          # score a generated set
 *   node tools/phrase-lab/score.cjs spa_for_eng 206 --json out.json
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const { buildInventory, norm, surfaceKey } = require('./inventory.cjs');
const { countSyllables, hasSyllableCounter } = require('../lib/syllable-counters.cjs');
const { LAB_COUNTERS, APPROXIMATE } = require('./syllables-cjk.cjs');

// ---------------------------------------------------------------------------
// known-side free class — English glue a learner is never asked to "know"
// ---------------------------------------------------------------------------
// Kept SHORT on purpose. Every word in here is a word the check stops looking
// at, so a generous free class is a quiet way of disabling the gate.
const FREE_CLASS = new Set(['a', 'an', 'the', 'to', 'of', 'do', 'does', 'did', 'and', 'or', 'that']);

/**
 * The free class the SURFACE-FORM check uses comes from the pair contract, not
 * from this file. `docs/pair-contracts/{course}.contract.cjs` — falling back to
 * `_default_eng` for any English-known course without its own — is where the
 * estate has already declared which known-language words a learner is never
 * asked to "know": glue, the dummy auxiliaries, negation, and NPI items under
 * negation. The API validator's own known-side gate reads exactly that list
 * (`services/course-builder/lib/validation.cjs`), so reading it here means the
 * lab and the live gate agree about what is free instead of disagreeing by a
 * hard-coded eleven words. It is also known-language-specific: an English glue
 * list must never gate a non-English-known course.
 */
const _freeCache = new Map();
function contractFreeClass(courseCode) {
  if (_freeCache.has(courseCode)) return _freeCache.get(courseCode);
  let set = new Set(FREE_CLASS);
  try {
    const { loadPairContract } = require('../../services/course-builder/lib/validation.cjs');
    const c = loadPairContract(courseCode);
    if (c) {
      for (const w of [...(c.freeGlue || []), ...(c.npiTokens || []), ...(c.negationWords || [])]) {
        for (const t of tokens(String(w))) set.add(t);
      }
      for (const w of ['do', 'does', 'did']) set.add(w);
    }
  } catch { /* no contract: the eleven-word default stands, and the check is stricter, never looser */ }
  _freeCache.set(courseCode, set);
  return set;
}

const tokens = (s) => norm(s).split(' ').filter(Boolean);

/**
 * SURFACE-EXACT, and the stemmer that used to live here is gone.
 *
 * TOM'S RULING, 2026-08-28: "agents think that inflections are basically ok, so
 * they use them. they are not OK in this methodology. if I say: I drink / he
 * drinks / is drinking / drinking more — do I have zero uncertainty about the
 * target language I am being asked to produce? the answer is no, unless each of
 * these has been introduced separately as their own distinct LEGO."
 *
 * This file used to hold `stem = w => w.replace(/(ing|ed|es|s)$/, '')` and run
 * every known-side comparison through it. That is the inflection hole: teach
 * "drink" and "drinks", "drinking", "drank" all match, because to a language
 * model they are one word. They are not one word to a learner — each English
 * form points at a DIFFERENT target form nobody has ever shown them — so the
 * determinism condition genuinely fails while the gate reports green.
 *
 * The gate never inflects and never derives. It only ever asks: HAS THIS EXACT
 * FORM APPEARED? The one suffix table left in this file is `lemmaLabel`, and it
 * decides nothing — it is used solely to NAME a failure that has already been
 * called, so the report can say "derived inflection of an introduced form"
 * rather than "unknown word".
 */
const LABEL_SUFFIXES = ['ing', 'ed', 'es', 's', 'ies', 'en', 'ly'];
function lemmaLabel(w) {
  for (const suf of LABEL_SUFFIXES) {
    if (w.length > suf.length + 2 && w.endsWith(suf)) return w.slice(0, -suf.length);
  }
  return w;
}

/**
 * How trustworthy is this course's syllable denominator?
 *   'exact'       — a real counter for the language
 *   'approximate' — a counter with a stated approximation (jpn kanji morae)
 *   'fallback'    — no counter; vowel-group guess. NOT COMPARABLE across courses.
 * Any axis divided by syllables must be reported with this basis attached.
 */
function syllableBasis(lang) {
  if (LAB_COUNTERS[lang]) return APPROXIMATE.has(lang) ? 'approximate' : 'exact';
  if (hasSyllableCounter(lang)) return 'exact';
  return 'fallback';
}

/** Target languages whose orthography has no word boundaries. */
const SPACELESS = new Set(['jpn', 'zho', 'tha', 'lao', 'mya', 'khm', 'yue']);

/** The comparison unit for a spaceless script: one character, punctuation dropped. */
function charPieces(text) {
  return Array.from(String(text || '')).filter((c) => !/[\s\u3000-\u303f\uff01-\uff0f\uff1a-\uff20.,!?;:'"()\u2010-\u201f]/.test(c));
}

function targetLangOf(courseCode) {
  return String(courseCode || '').split('_')[0];
}

function syllablesOf(text, lang) {
  // Lab-local counters first: jpn and zho are spaceless, have no counter in the
  // global registry, and would otherwise fall through to a Latin-vowel count that
  // matches nothing and then to a whitespace token count of ~1 per phrase — which
  // would be reported as a finding about Japanese when it is a finding about the
  // tool. Registered here, not globally, on purpose (see syllables-cjk.cjs).
  if (LAB_COUNTERS[lang]) return LAB_COUNTERS[lang](text);
  if (hasSyllableCounter(lang)) return countSyllables(text, lang);
  // No counter for this language: fall back to vowel-groups rather than to zero.
  // A missing counter must not silently make every phrase look infinitely cheap.
  return (norm(text).match(/[aeiouáéíóúüàèìòùâêîôûäëïöü]+/g) || []).length || tokens(text).length;
}

// ---------------------------------------------------------------------------
// THE GATE
// ---------------------------------------------------------------------------

/**
 * THE ATTESTED SET — every known-side surface form the learner has actually met.
 *
 * Tom's rule, 2026-08-28, in three parts:
 *
 *   (1) AVAILABILITY IS KEYED ON THE EXACT SURFACE FORM. No stemming, no
 *       lemmatisation, no morphological expansion, no fuzzy matching. The gate
 *       never inflects and never derives; it only asks whether this exact form
 *       has appeared.
 *
 *   (2) THE TEST IS ATTESTATION, NOT INTRODUCTION. "we DO allow components of an
 *       M-LEGO that might NOT have been introduced as their own LEGOs, but they
 *       DO become available as legitimate vocab for the phrase generation." A
 *       form counts if it was SEEN — as a LEGO in its own right or as a component
 *       of an M-LEGO. A component was on screen and in their ears; an inflection
 *       produced by rule was never shown to anyone.
 *
 *   (3) SEEDS GIVE THE COMPUTATION ITS BOUNDS. "if a LEGO is from SEED 300, i.e.
 *       S0300L01, then all content up to SEED N-1 is legit content." That is what
 *       makes this a QUERY OVER THE COURSE rather than a judgement made by a
 *       model — and `buildInventory` has already applied it, taking every LEGO of
 *       seeds 1..N-1 plus the EARLIER LEGOs of seed N.
 *
 * Note this indexes the BLOCKED items too, not only the available ones. A form
 * that is attested but non-deterministic is a different failure with a different
 * fix (it is already caught as inherited ambiguity, layer 2); calling it
 * "never introduced" would be a lie about what the learner has met.
 */
function attestedKnownIndex(inv) {
  const forms = new Set();
  const byLemma = new Map();
  const add = (text) => {
    for (const w of tokens(surfaceKey(text))) {
      if (!w) continue;
      forms.add(w);
      const l = lemmaLabel(w);
      if (!byLemma.has(l)) byLemma.set(l, new Set());
      byLemma.get(l).add(w);
    }
  };
  for (const it of inv.items) add(it.known);
  if (inv.targetLego) add(inv.targetLego.known_text);
  return { forms, byLemma };
}

/**
 * Adjudicate one phrase against the inventory.
 *
 * A phrase declares its own tiling: [{known, target, legoId}]. That declaration
 * is not bureaucracy — it is the phrase showing its work, and it is what makes
 * both the gate and the edge derivation exact rather than guessed. Existing
 * database rows already carry it in `decomposition`, so live content and
 * generated content are adjudicated by identical code.
 */
function checkPhraseZut(inv, phrase) {
  const lang = targetLangOf(inv.courseCode);
  const failures = [];   // LAYER 1 — this builder's own doing
  const inherited = [];  // LAYER 2 — ambiguity the course already had
  const warnings = [];
  const tiles = (phrase.tiles || []).filter((t) => t && norm(t.target));

  if (!tiles.length) {
    failures.push({ code: 'no-tiling', token: null, why: 'phrase declares no tiling, so nothing about it can be verified' });
    return { pass: false, failures, inherited, warnings, resolved: [] };
  }

  // index the introduced inventory by normalised target
  const byTarget = new Map();
  for (const it of inv.items) {
    const k = norm(it.target);
    if (!byTarget.has(k)) byTarget.set(k, []);
    byTarget.get(k).push(it);
  }

  const resolved = [];
  for (const t of tiles) {
    const tn = norm(t.target);
    const isTheNewLego = inv.targetLego && norm(inv.targetLego.target_text) === tn;
    if (isTheNewLego) {
      resolved.push({ tile: t, item: null, isNew: true, known: t.known || inv.targetLego.known_text });
      continue;
    }
    const candidates = byTarget.get(tn) || [];
    if (!candidates.length) {
      failures.push({
        code: 'not-introduced',
        token: t.target,
        why: `"${t.target}" has not been introduced by seed ${inv.seedNumber} — the learner has no mapping for it at all`
      });
      resolved.push({ tile: t, item: null, isNew: false, known: t.known });
      continue;
    }
    // Prefer the candidate whose known gloss matches the tile's declared known.
    // A tile with no declared known (live rows carry a few) is not an offence —
    // fall back to the course's own gloss and note it, rather than inventing a
    // remap that never happened.
    // SURFACE-EXACT (Tom, 2026-08-28). This used to compare folded ZUT keys, so a
    // tile declaring "explain" matched a course that introduced "to explain" and
    // was scored as an exact hit. Two different English forms, one of which the
    // learner has never been shown: that is the hole, not a match.
    const declared = surfaceKey(t.known || '');
    const exact = declared ? candidates.find((c) => surfaceKey(c.known) === declared) : null;
    const item = exact || candidates[0];
    if (!declared) {
      warnings.push({ code: 'unglossed-tile', token: t.target, why: `tile for "${t.target}" declares no known gloss; read as the course's own "${item.known}"` });
    } else if (!exact) {
      warnings.push({
        code: 'gloss-remap',
        token: t.target,
        why: `tile glosses "${t.target}" as "${t.known}", but the course introduced it as "${item.known}"`
      });
    }
    if (!item.deterministic) {
      // LAYER 2. The learner genuinely cannot be certain here — but this phrase
      // did not create the collision, the course's own mapping table did. It is
      // named, counted and reported; it does not zero this phrase's edges,
      // because a gate that fires on every phrase in the estate discriminates
      // between nothing and is a gate people learn to ignore.
      inherited.push({ code: item.reason, token: item.known, why: item.detail, unlock: item.unlock });
    }
    resolved.push({ tile: t, item, isNew: false, known: item.known });
  }

  // --- target coverage: the tiling must reconstruct the target exactly.
  //
  // TWO SCRIPTS, TWO UNITS, SAME SEMANTICS. The check is "does the declared tiling
  // account for every piece of the target, allowing for order" — a multiset
  // subtraction. In a whitespace language the piece is a word. In a SPACELESS one
  // (jpn, zho) the whole phrase is a single whitespace token, no tile ever equals
  // it, and the word path reports every correctly-tiled phrase as untiled: the
  // smoke probe on jpn/zho seed 358 came back 100% gate failure on sets whose
  // tiles reconstructed the target exactly. That would have been published as a
  // finding about Japanese when it is a finding about the tool. So for spaceless
  // scripts the piece is the CHARACTER, and the identical multiset subtraction
  // runs over characters. This is the same move the 2026-07-04 ZUT rescope was
  // forced into for French inversion and elision: when whitespace is not where the
  // boundaries are, stop pretending it is.
  const tiled = norm(tiles.map((t) => t.target).join(' '));
  const actual = norm(phrase.target);
  if (tiled !== actual) {
    const pieces = SPACELESS.has(lang) ? charPieces : tokens;
    const tiledSet = pieces(tiled);
    const extra = pieces(actual).filter((w) => {
      const i = tiledSet.indexOf(w);
      if (i === -1) return true;
      tiledSet.splice(i, 1);
      return false;
    });
    if (extra.length) {
      failures.push({
        code: 'untiled-target',
        token: extra.join(SPACELESS.has(lang) ? '' : ' '),
        why: `target carries "${extra.join(SPACELESS.has(lang) ? '' : ' ')}" which no tile accounts for — the learner cannot produce it from this prompt`
      });
    } else {
      warnings.push({ code: 'tiling-order', token: null, why: 'tiles cover the target but not in the order given' });
    }
  }

  // --- known correspondence.
  //
  // The discriminator that matters here, and it took a wrong first draft to find
  // it: an unmatched gloss token is NOT automatically an offence. Two different
  // things produce one:
  //
  //   DRIFT     the prompt asked for this slot, in a different word. spa 358
  //             "to reach the top" tiles llegar, whose course gloss is "arrive".
  //             One tile token unmatched, one prompt token unmatched — a
  //             substitution. A ZUT hazard worth counting, not a phrase that
  //             cannot be produced. Tom grades this set as the GOOD specimen, so
  //             an instrument that fails it is the instrument that is wrong.
  //
  //   SMUGGLE   the target carries content the prompt has no slot for at all.
  //             spa 206 B03 "I enjoy doing interesting things" ->
  //             "Disfruto haciendo cosas interesantes con mis amigos": tiles
  //             deliver "with"/"my friends" against nothing. Excess, not
  //             substitution. The learner cannot produce this phrase from this
  //             prompt, and this is exactly the species Tom named.
  //
  // So: excess unmatched gloss tokens over unmatched prompt tokens = smuggling,
  // and that is the hard failure. The balanced remainder is counted as drift.
  const phraseKnown = tokens(surfaceKey(phrase.known));
  const tileKnown = resolved.flatMap((r) => tokens(surfaceKey(r.known || '')));

  const pool = [...phraseKnown];
  const unmatchedTile = [];
  for (const w of tileKnown) {
    if (FREE_CLASS.has(w)) continue;
    const i = pool.indexOf(w);
    if (i === -1) unmatchedTile.push(w);
    else pool.splice(i, 1);
  }
  const unmatchedPrompt = pool.filter((w) => !FREE_CLASS.has(w));

  // CALIBRATION, stated rather than tuned in silence: the alignment above is a
  // bag of words with no positional information, so a phrase carrying several
  // legitimate drifts accumulates one token of slack. Smuggling is called at an
  // excess of TWO or more. Checked against both hand-graded specimens: spa 206
  // B03 "con mis amigos" scores excess 3 and FAILS; spa 358's pro-drop USE rows
  // score excess 1 and are reported as drift. A one-token excess is reported,
  // never silently dropped.
  const excess = unmatchedTile.length - unmatchedPrompt.length;
  if (excess >= 2) {
    failures.push({
      code: 'target-not-asked-for',
      token: unmatchedTile.slice(-excess).join(' '),
      why: `the target delivers "${unmatchedTile.join(' ')}" against ${unmatchedPrompt.length} unasked slot(s) in the prompt — ${excess} token(s) of meaning the learner is never asked for`
    });
  } else if (unmatchedTile.length) {
    warnings.push({
      code: 'gloss-drift',
      token: unmatchedTile.join(' '),
      why: `prompt says "${unmatchedPrompt.join(' ')}" where the course's own gloss is "${unmatchedTile.join(' ')}" — a substitution the learner has not been taught`
    });
  }

  // --- SURFACE-FORM ATTESTATION. LAYER 1, and the reason this file was changed.
  //
  // Every known-side form in the prompt must be a form the learner has actually
  // met. Not a form of a word they have met — THAT form. "he drinks" is not
  // "drink" plus a rule; it is a prompt pointing at a Spanish word the learner
  // has never seen, and there is no way for them to know which one it is.
  //
  // The suffix table below never licenses anything. The failure is already
  // called by the time it runs; it only decides whether the report says
  // "derived-inflection" (an introduced form shares its shape, so the fix is to
  // write the introduced form, or to teach this one) or "unattested-known-form"
  // (nothing like it was ever taught).
  //
  // SAID PLAINLY: that split is SHAPE-ONLY and it is advisory. English shape
  // cannot tell "thing"/"things" from "even"/"evening" — both look like a stem
  // and a stem plus a suffix — and no regex in this estate is allowed to make a
  // language judgement. The FAILURE is a fact (the form was never attested);
  // only the label is a guess, and it is never allowed to decide a pass.
  const att = inv.attestedKnown || (inv.attestedKnown = attestedKnownIndex(inv));
  const free = contractFreeClass(inv.courseCode);
  const seenBad = new Set();
  for (const w of tokens(surfaceKey(phrase.known))) {
    if (!w || free.has(w) || att.forms.has(w) || seenBad.has(w)) continue;
    seenBad.add(w);
    const kin = att.byLemma.get(lemmaLabel(w));
    if (kin && kin.size) {
      failures.push({
        code: 'derived-inflection',
        token: w,
        why: `"${w}" was never introduced. The course taught ${[...kin].map((f) => `"${f}"`).join(' / ')}, which shares its shape — an inflection of a taught form is not a taught form, and the learner has no idea which target word "${w}" is asking for.`
      });
    } else {
      failures.push({
        code: 'unattested-known-form',
        token: w,
        why: `"${w}" has not appeared anywhere in seeds 1..${inv.seedNumber} — not as a LEGO and not as a component of one`
      });
    }
  }

  return { pass: failures.length === 0, failures, inherited, warnings, resolved };
}

// ---------------------------------------------------------------------------
// EDGES, POSITION, PATTERN
// ---------------------------------------------------------------------------

/**
 * Position of the new LEGO among its partners, in Tom's three-way taxonomy.
 * Computed from CONNECTIONS, not from character offsets: filling means at least
 * one partner on each side.
 */
function positionOf(resolved) {
  const idx = resolved.findIndex((r) => r.isNew);
  if (idx === -1) return 'absent';
  const before = resolved.slice(0, idx).some((r) => !r.isNew);
  const after = resolved.slice(idx + 1).some((r) => !r.isNew);
  if (!before && !after) return 'bare';
  if (before && after) return 'filling';
  return before ? 'end' : 'start';
}

const RE = {
  first_s: /\b(i|me|my|mine)\b/,
  first_p: /\b(we|us|our)\b/,
  second: /\b(you|your|yours)\b/,
  third_s: /\b(he|she|him|her|his|it|its)\b/,
  third_p: /\b(they|them|their)\b/,
  neg: /\b(not|never|no|nothing|nobody|none)\b|n't/,
  wh: /^(what|where|when|why|how|who|which)\b/,
  auxq: /^(do|does|did|can|could|will|would|is|are|am|was|were|have|has|had|should|must)\b/,
  embed: /\b(that|because|if|when|while|although|though|before|after|which|so)\b/,
  cond: /\b(would|could|'d)\b/,
  past: /\b(was|were|had|did|said|told|went|used to)\b|\w+ed\b/,
  fut: /\b(will|going to|'ll)\b/
};

/**
 * PATTERN is what happens AROUND the new LEGO — a separate axis from position,
 * which is only WHERE it sits. Five coarse axes, deliberately coarse: a
 * continuous novelty score would be gameable, three or four honest buckets are
 * much harder to game. Detected on the KNOWN side, because the known side is the
 * controlled language and is the thing the learner actually reads.
 */
function patternOf(knownText) {
  const s = ' ' + norm(knownText) + ' ';
  const raw = String(knownText || '').trim().toLowerCase();
  let person = 'none';
  if (RE.first_s.test(s)) person = '1s';
  else if (RE.first_p.test(s)) person = '1p';
  else if (RE.second.test(s)) person = '2';
  else if (RE.third_s.test(s)) person = '3s';
  else if (RE.third_p.test(s)) person = '3p';

  const polarity = RE.neg.test(s) ? 'neg' : 'pos';
  const mood = /\?\s*$/.test(raw) || RE.wh.test(raw) || RE.auxq.test(raw) ? 'q' : 's';
  const embed = RE.embed.test(s) ? 'emb' : 'flat';
  const tense = RE.cond.test(s) ? 'cond' : RE.fut.test(s) ? 'fut' : RE.past.test(s) ? 'past' : 'pres';

  return { person, polarity, mood, embed, tense, signature: [person, polarity, mood, embed, tense].join('|') };
}

const AXES = ['person', 'polarity', 'mood', 'embed', 'tense'];

/**
 * USE completeness — the bar BLD does not carry. Tom: "a USE phrase can stand as
 * an isolated entity and be used as a unit".
 *
 * DELIBERATELY ALMOST EMPTY, and this is the second time the data corrected this
 * file. A richer version demanded a pronoun subject and rejected any sentence
 * opening on an adverbial or conjunction. It then flagged "let's talk about the
 * top on Friday night", "on Sunday morning I enjoy speaking with you" and "my
 * mother was going to tell me the same thing" as fragments — all of them perfectly
 * standalone — and it flagged them precisely because the new prompt asks builders
 * to vary how a sentence opens. A proxy that punishes the virtue it was hired to
 * protect is worse than no proxy: it made the new arms look like a regression
 * against the live course on this axis when they are not.
 *
 * Mechanical English standalone-detection is not reliable, so this now asserts
 * only the one thing that is — a three-word USE phrase is not a thought — and the
 * real judgement goes to tools/phrase-lab/judge-use.cjs, which asks a model.
 */
function useCompleteness(knownText) {
  const s = norm(knownText);
  const ws = tokens(s);
  const reasons = [];
  if (ws.length < 4) reasons.push('too short to stand alone');
  return { complete: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------------
// THE SCORE
// ---------------------------------------------------------------------------

function scoreRole(inv, phrases, role, lang, recentThreshold) {
  const rows = [];
  for (const p of phrases) {
    const zut = checkPhraseZut(inv, p);
    const position = positionOf(zut.resolved);
    const pattern = patternOf(p.known);
    const syllables = syllablesOf(p.target, lang);
    const partners = [];
    for (const r of zut.resolved) {
      if (r.isNew || !r.item) continue;
      partners.push({ key: norm(r.item.target), seedNumber: r.item.seedNumber, known: r.item.known, target: r.item.target });
    }
    // ADJACENCY — what the new LEGO actually TOUCHES. See the note on the
    // functional in the header: co-occurrence scales with phrase length and so
    // cancels against the syllable price; adjacency does not.
    const ni = zut.resolved.findIndex((r) => r.isNew);
    const adjItem = (k) => (zut.resolved[k] && !zut.resolved[k].isNew && zut.resolved[k].item ? norm(zut.resolved[k].item.target) : null);
    const adjacent = ni === -1 ? { left: null, right: null } : { left: adjItem(ni - 1), right: adjItem(ni + 1) };
    rows.push({
      id: p.id || null,
      known: p.known,
      target: p.target,
      role,
      zut,
      position,
      pattern,
      syllables,
      partners,
      adjacent,
      completeness: role === 'use' ? useCompleteness(p.known) : null
    });
  }

  // Only phrases that PASS the gate earn edges. You cannot buy value with a
  // phrase the learner cannot produce.
  const valid = rows.filter((r) => r.zut.pass && r.position !== 'bare' && r.position !== 'absent');

  const partnerKeys = new Set();
  const combos = new Set();
  const partnerSeeds = [];
  let syllables = 0;
  const adjacencies = new Set();
  for (const r of valid) {
    syllables += r.syllables;
    for (const pt of r.partners) {
      if (!partnerKeys.has(pt.key)) partnerSeeds.push(pt.seedNumber);
      partnerKeys.add(pt.key);
    }
    const adjKey = `${r.adjacent.left || '_'}|${r.adjacent.right || '_'}`;
    adjacencies.add(adjKey);
    combos.add(`${adjKey}::${r.pattern.signature}`);
  }

  const positions = { start: 0, filling: 0, end: 0, bare: 0 };
  for (const r of rows) if (positions[r.position] !== undefined) positions[r.position]++;
  const positionSpread = ['start', 'filling', 'end'].filter((k) => positions[k] > 0).length;

  const signatures = new Set(valid.map((r) => r.pattern.signature));
  const axisCoverage = {};
  for (const a of AXES) axisCoverage[a] = new Set(valid.map((r) => r.pattern[a])).size;

  const recentPartners = partnerSeeds.filter((s) => s >= recentThreshold).length;
  const sortedSeeds = [...partnerSeeds].sort((a, b) => a - b);
  const medianPartnerSeed = sortedSeeds.length ? sortedSeeds[Math.floor(sortedSeeds.length / 2)] : null;

  // ONE-DISTINCTION ASCENT: ordered shortest-first (the order a learner meets
  // them in practice), each step should add at most one new distinction.
  const ordered = [...valid].sort((a, b) => a.syllables - b.syllables);
  let steps = 0;
  let goodSteps = 0;
  for (let i = 1; i < ordered.length; i++) {
    steps++;
    const diff = AXES.filter((a) => ordered[i].pattern[a] !== ordered[i - 1].pattern[a]).length;
    if (diff <= 1) goodSteps++;
  }

  const complete = role === 'use' ? valid.filter((r) => r.completeness.complete).length : null;
  const inheritedHits = rows.reduce((n, r) => n + r.zut.inherited.length, 0);
  const inheritedPhrases = rows.filter((r) => r.zut.inherited.length).length;
  const driftPhrases = rows.filter((r) => r.zut.warnings.some((w) => w.code === 'gloss-drift')).length;

  return {
    role,
    phrases: rows.length,
    gatePassed: rows.filter((r) => r.zut.pass).length,
    gateFailed: rows.filter((r) => !r.zut.pass).length,
    inheritedAmbiguityHits: inheritedHits,
    inheritedAmbiguityPhrases: inheritedPhrases,
    inheritedAmbiguityShare: rows.length ? Number((inheritedPhrases / rows.length).toFixed(2)) : 0,
    glossDriftPhrases: driftPhrases,
    scoredPhrases: valid.length,
    syllables,
    distinctPartners: partnerKeys.size,
    distinctAdjacencies: adjacencies.size,
    edgeCombos: combos.size,
    newEdgesPerSyllable: syllables ? Number((combos.size / syllables).toFixed(4)) : 0,
    positions,
    positionSpread,
    fillingShare: rows.length ? Number((positions.filling / rows.length).toFixed(2)) : 0,
    distinctPatterns: signatures.size,
    axisCoverage,
    axesVaried: AXES.filter((a) => axisCoverage[a] > 1).length,
    recencyMass: partnerKeys.size ? Number((recentPartners / partnerKeys.size).toFixed(2)) : 0,
    medianPartnerSeed,
    ascent: steps ? Number((goodSteps / steps).toFixed(2)) : null,
    useComplete: complete,
    useCompleteShare: role === 'use' && valid.length ? Number((complete / valid.length).toFixed(2)) : null,
    rows
  };
}

/**
 * @param {object} inv     inventory from buildInventory
 * @param {Array}  phrases [{role:'build'|'use', known, target, tiles:[{known,target,legoId}]}]
 */
/**
 * FLOORS PER AXIS. Tom set the first one himself — "at least 6 distinct
 * partner-LEGO x pattern combinations" — and the rest are calibrated so that his
 * GOOD specimen clears what he praised it for and falls short exactly where he
 * said it falls short. They are a starting calibration, not his ruling, and they
 * are in one object so they can be argued with in one place.
 */
// BUILD floors scaled to Tom's 2026-08-28 ruling on A-294: BUILD is three or four
// phrases, not six — "just to give a sense of, you know, LEGO plus one previous,
// LEGO plus two previous". With four phrases an edgeCombos floor of 4 demanded that
// every single BUILD be a distinct neighbour x pattern combo and made a three-phrase
// set unscoreable, so it comes down to 3 with the count. The USE half of every axis
// is untouched — he rated the USE phrases good as they stand.
const FLOORS = {
  build: { phrases: 3, edgeCombos: 3, distinctAdjacencies: 2, positionSpread: 2, axesVaried: 2, recencyMass: 0.25 },
  use: { phrases: 5, edgeCombos: 6, distinctAdjacencies: 2, positionSpread: 2, axesVaried: 3, recencyMass: 0.25, useCompleteShare: 1 }
};

const REWRITE = {
  phrases: 'too few phrases — fewer phrases is a fail, variety never substitutes for volume',
  edgeCombos: 'not enough distinct connections — the same move is being repeated with the tail swapped',
  distinctAdjacencies: 'the new LEGO touches the same neighbour every time — give it a different thing to sit next to',
  positionSpread: 'the new LEGO only ever sits in one place — put it at the start, and in the filling',
  axesVaried: 'every phrase is the same shape — change person, add a negation, ask a question, embed it',
  recencyMass: 'every partner is the ancient safe core — reach for LEGOs from recent seeds',
  useCompleteShare: 'a USE phrase must stand alone as a complete thought, not hang off something unsaid'
};

/** Named shortfalls, so a checker can reject with the axis named rather than a score. */
function verdict(role, r) {
  const f = FLOORS[role];
  const shortfalls = [];
  if (r.gateFailed > 0) shortfalls.push({ axis: 'gate', got: r.gateFailed, floor: 0, instruction: 'phrases the learner cannot produce from their prompt — fix or cut them' });
  for (const [axis, floor] of Object.entries(f)) {
    const got = r[axis];
    if (got === null || got === undefined) continue;
    if (got < floor) shortfalls.push({ axis, got, floor, instruction: REWRITE[axis] });
  }
  return { pass: shortfalls.length === 0, shortfalls };
}

function scoreSet(inv, phrases) {
  const lang = targetLangOf(inv.courseCode);
  const seeds = [...new Set(inv.items.map((i) => i.seedNumber))].sort((a, b) => a - b);
  const recentThreshold = seeds.length ? seeds[Math.floor(seeds.length * 0.75)] : 0;

  const build = scoreRole(inv, phrases.filter((p) => p.role === 'build'), 'build', lang, recentThreshold);
  const use = scoreRole(inv, phrases.filter((p) => p.role === 'use'), 'use', lang, recentThreshold);

  return {
    courseCode: inv.courseCode,
    seedNumber: inv.seedNumber,
    legoIndex: inv.legoIndex,
    lego: inv.targetLego
      ? { legoId: inv.targetLego.lego_id, type: inv.targetLego.type, known: inv.targetLego.known_text, target: inv.targetLego.target_text }
      : null,
    recentThreshold,
    build,
    use,
    verdict: { build: verdict('build', build), use: verdict('use', use) },
    headline: {
      gateFailures: build.gateFailed + use.gateFailed,
      inheritedAmbiguityPhrases: build.inheritedAmbiguityPhrases + use.inheritedAmbiguityPhrases,
      edgeCombos: build.edgeCombos + use.edgeCombos,
      syllables: build.syllables + use.syllables,
      newEdgesPerSyllable:
        build.syllables + use.syllables
          ? Number(((build.edgeCombos + use.edgeCombos) / (build.syllables + use.syllables)).toFixed(4))
          : 0
    }
  };
}

// ---------------------------------------------------------------------------
// reading the live database as one arm of the comparison
// ---------------------------------------------------------------------------

/** Turn live course_practice_phrases rows into the scorer's phrase shape. */
async function fetchLivePhrases(supabase, courseCode, seedNumber, legoIndex) {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id,phrase_role,known_text,target_text,decomposition')
    .eq('course_code', courseCode)
    .eq('seed_number', seedNumber)
    .eq('lego_index', legoIndex)
    .order('id');
  if (error) throw new Error(`course_practice_phrases read failed: ${error.message}`);
  return (data || [])
    .filter((r) => r.phrase_role === 'build' || r.phrase_role === 'use')
    .map((r) => ({
      id: r.id,
      role: r.phrase_role,
      known: r.known_text,
      target: r.target_text,
      tiles: (r.decomposition || []).map((d) => ({ known: d.known, target: d.target, legoId: d.legoId }))
    }));
}

function printReport(s) {
  const l = s.lego;
  console.log(`\n${s.courseCode} seed ${s.seedNumber} L${s.legoIndex}${l ? `  "${l.known}" -> "${l.target}" [${l.type}]` : ''}`);
  for (const r of [s.build, s.use]) {
    console.log(`  ${r.role.toUpperCase().padEnd(5)} ${r.phrases} phrases | gate: ${r.gatePassed} pass / ${r.gateFailed} fail`);
    console.log(`        edges: ${r.distinctPartners} co-occurring partners, ${r.distinctAdjacencies} distinct adjacencies, ${r.edgeCombos} adjacency x pattern combos, ${r.syllables} syllables -> ${r.newEdgesPerSyllable} new edges/syllable`);
    console.log(`        position: start ${r.positions.start} / filling ${r.positions.filling} / end ${r.positions.end} / bare ${r.positions.bare}  (spread ${r.positionSpread}/3)`);
    console.log(`        pattern: ${r.distinctPatterns} distinct signatures, ${r.axesVaried}/5 axes varied ${JSON.stringify(r.axisCoverage)}`);
    console.log(`        recency mass: ${r.recencyMass} (median partner seed ${r.medianPartnerSeed}, recent = seed >= ${s.recentThreshold})`);
    console.log(`        ascent: ${r.ascent === null ? 'n/a' : r.ascent}${r.role === 'use' ? ` | standalone: ${r.useCompleteShare}` : ''}`);
    const v = s.verdict[r.role];
    console.log(`        VERDICT: ${v.pass ? 'clears every floor' : v.shortfalls.map((x) => `${x.axis} ${x.got}<${x.floor}`).join(', ')}`);
    for (const x of v.shortfalls) console.log(`           ${x.axis}: ${x.instruction}`);
    console.log(`        inherited ambiguity: ${r.inheritedAmbiguityPhrases}/${r.phrases} phrases (${r.inheritedAmbiguityHits} hits) | gloss drift: ${r.glossDriftPhrases}`);
    const fails = r.rows.filter((x) => !x.zut.pass);
    for (const f of fails.slice(0, 6)) {
      console.log(`        GATE FAIL: "${f.known}" -> "${f.target}"`);
      for (const e of f.zut.failures) console.log(`           [${e.code}] ${e.why}`);
    }
  }
  console.log(`  HEADLINE: ${s.headline.edgeCombos} edge-combos / ${s.headline.syllables} syllables = ${s.headline.newEdgesPerSyllable} | layer-1 gate failures ${s.headline.gateFailures} | layer-2 inherited-ambiguity phrases ${s.headline.inheritedAmbiguityPhrases}`);
}

async function main() {
  const argv = process.argv.slice(2);
  const jsonOut = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
  const { supabase } = require('../../services/supabase-client.cjs');
  if (!supabase) throw new Error('no Supabase client — SUPABASE_URL / SUPABASE_SERVICE_KEY missing from .env');

  if (argv[0] === '--file') {
    const payload = JSON.parse(fs.readFileSync(argv[1], 'utf8'));
    const sets = Array.isArray(payload) ? payload : [payload];
    const out = [];
    for (const set of sets) {
      const inv = await buildInventory(supabase, set.courseCode, set.seedNumber, set.legoIndex || 1);
      const s = scoreSet(inv, set.phrases);
      s.arm = set.arm || null;
      printReport(s);
      out.push(s);
    }
    if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(out, null, 2));
    return;
  }

  const [courseCode, seedArg] = argv;
  if (!courseCode || !seedArg) {
    console.error('usage: node tools/phrase-lab/score.cjs <course> <seed> [--json out]  |  --file set.json');
    process.exit(1);
  }
  const seedNumber = Number(seedArg);
  const { data: legos } = await supabase
    .from('course_legos')
    .select('lego_index')
    .eq('course_code', courseCode)
    .eq('seed_number', seedNumber)
    .order('lego_index');
  const out = [];
  for (const { lego_index } of legos || []) {
    const inv = await buildInventory(supabase, courseCode, seedNumber, lego_index);
    const phrases = await fetchLivePhrases(supabase, courseCode, seedNumber, lego_index);
    const s = scoreSet(inv, phrases);
    s.arm = 'live';
    printReport(s);
    out.push(s);
  }
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(out, null, 2));
}

module.exports = {
  FLOORS,
  verdict,
  checkPhraseZut,
  positionOf,
  patternOf,
  useCompleteness,
  scoreSet,
  scoreRole,
  fetchLivePhrases,
  syllablesOf,
  syllableBasis,
  printReport,
  AXES
};

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
