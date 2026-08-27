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
const { buildInventory, norm, zutKey } = require('./inventory.cjs');
const { countSyllables, hasSyllableCounter } = require('../lib/syllable-counters.cjs');

// ---------------------------------------------------------------------------
// known-side free class — English glue a learner is never asked to "know"
// ---------------------------------------------------------------------------
// Kept SHORT on purpose. Every word in here is a word the check stops looking
// at, so a generous free class is a quiet way of disabling the gate.
const FREE_CLASS = new Set(['a', 'an', 'the', 'to', 'of', 'do', 'does', 'did', 'and', 'or', 'that']);

const tokens = (s) => norm(s).split(' ').filter(Boolean);
const stem = (w) => w.replace(/(ing|ed|es|s)$/, '');

function targetLangOf(courseCode) {
  return String(courseCode || '').split('_')[0];
}

function syllablesOf(text, lang) {
  if (hasSyllableCounter(lang)) return countSyllables(text, lang);
  // No counter for this language: fall back to vowel-groups rather than to zero.
  // A missing counter must not silently make every phrase look infinitely cheap.
  return (norm(text).match(/[aeiouáéíóúüàèìòùâêîôûäëïöü]+/g) || []).length || tokens(text).length;
}

// ---------------------------------------------------------------------------
// THE GATE
// ---------------------------------------------------------------------------

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
    const declared = zutKey(t.known || '');
    const exact = declared ? candidates.find((c) => zutKey(c.known) === declared) : null;
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
  const tiled = norm(tiles.map((t) => t.target).join(' '));
  const actual = norm(phrase.target);
  if (tiled !== actual) {
    const tiledSet = tokens(tiled);
    const extra = tokens(actual).filter((w) => {
      const i = tiledSet.indexOf(w);
      if (i === -1) return true;
      tiledSet.splice(i, 1);
      return false;
    });
    if (extra.length) {
      failures.push({
        code: 'untiled-target',
        token: extra.join(' '),
        why: `target carries "${extra.join(' ')}" which no tile accounts for — the learner cannot produce it from this prompt`
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
  const phraseKnown = tokens(zutKey(phrase.known)).map(stem);
  const tileKnown = resolved.flatMap((r) => tokens(zutKey(r.known || ''))).map(stem);

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
const FLOORS = {
  build: { phrases: 4, edgeCombos: 4, distinctAdjacencies: 2, positionSpread: 2, axesVaried: 2, recencyMass: 0.25 },
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
  printReport,
  AXES
};

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
