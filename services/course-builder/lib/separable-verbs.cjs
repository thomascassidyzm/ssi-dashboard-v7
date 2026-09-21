/**
 * GERMAN SEPARABLE VERBS — Kai's ruling for deu_for_eng, 2026-09-21, as code.
 *
 * THE RULING, in effect (the numbers are Kai's clauses; the constants below
 * are where each one lives):
 *   1. Separable verbs appear JOINED by default everywhere in deu_for_eng.
 *   2. Exception: seed 42 ("Ich fing an, ...") keeps "fing an" SPLIT every
 *      time — until seed 92.
 *   3. Seed 83 ("Ich stimme dem zu, ...") is where the split is TAUGHT. Its
 *      LEGO is introduced JOINED with a short learner-facing explanation
 *      (LESSON_TEXT_TAUGHT_SEED below).
 *   4. Under the seed-83 LEGO the practice phrases carry BOTH forms: lots of
 *      very short split phrases, lots of very short joined phrases, plenty of
 *      USE phrases showcasing the pattern. Volume and contrast, not
 *      explanation.
 *   5. No explanation at seed 84 — same verb, negated; drilling does the work.
 *   6. Seed 92 OPENS THE DOORS with one line (DOORS_OPEN_TEXT below).
 *   7. From seed 92 any previously introduced separable verb may appear split
 *      or joined freely — including seed 42's.
 *   8. Every separable verb introduced after that is INTRODUCED JOINED —
 *      "cleaner and avoids duplicates". Joined is the one canonical shape.
 *   9. Split vs joined must be CONSISTENT so the learner induces the real
 *      pattern of when German splits. Inconsistency is the defect.
 *
 * WHY THIS FILE EXISTS MECHANICALLY. The containment gate (every phrase must
 * contain its LEGO's target) matched the LEGO's exact word string, so a phrase
 * with the verb split ("ich rufe dich ... zurück" under LEGO "zurückrufen")
 * failed and was discarded; and the vocabulary gate tiles a phrase from known
 * chunks, so a standalone prefix ("zurück") that no LEGO carries on its own was
 * an unknown word. Both gates now ask this module — and ONLY where the ruling
 * permits the other shape. Everywhere else they behave exactly as before.
 *
 * SCOPE. deu_for_eng (and its _vN successors) only. Other German-target courses
 * are not covered by the ruling and get the old exact-match behaviour; a
 * course's own ruling is a per-course decision (Kai: consistency decisions are
 * per-course), so this is keyed on the course code, not on the language.
 *
 * THE LEXICON IS CURATED, NOT GUESSED. A prefix scan of deu_for_eng surfaces
 * 116 joined-looking tokens of which 41 are nouns, adjectives and adverbs
 * (Antwort, anderen, zufrieden, aufgeregt, einfach, mitten, nachdem ...). So a
 * word is a separable verb here only if it is prefix + a form of a stem in
 * STEMS *and* prefix+stem is in VERBS. An unlisted verb is simply not
 * recognised, and the gates fall back to exact matching for it — the safe
 * direction. `separableVerbsIn()` and the test print what the lexicon covers.
 * Calibration: seed 524 "Ich rufe dich in drei oder vier Minuten zurück" reads
 * SPLIT (rufe ... zurück) and seed 16 "er will später mit allen anderen
 * zurückkommen" reads JOINED; both are asserted in separable-verbs.test.cjs.
 */

'use strict';

const { normalizeForContainment, checkWordContainment } = require('./text-normalization.cjs');

// ─── The seeds the ruling names ───────────────────────────────────────────

/** Clause 2: the one seed whose split form is sanctioned before the split is taught. */
const SPLIT_EXCEPTION_SEED = 42;
/** Clause 3: where the split is taught. Its LEGO carries TAUGHT_VERB. */
const TAUGHT_SEED = 83;
/** Clause 6/7: from here every introduced separable verb may split or join. */
const DOORS_OPEN_SEED = 92;
/** The verb of seeds 83/84 — "Ich stimme dem (nicht) zu". */
const TAUGHT_VERB = 'zustimmen';

/** Clause 4: a taught-seed basket must show BOTH shapes, this many times each. */
const CONTRAST_MIN_EACH = 2;

/**
 * Clause 3: the learner-facing explanation that goes with the seed-83 LEGO's
 * presentation. "[word in English]" is the LEGO's known text. This is the
 * wording of record; the content pass that rewrites the seed-83 LEGO reads it
 * from here rather than retyping it.
 */
const LESSON_TEXT_TAUGHT_SEED =
  'Often in German, you will hear some kinds of words split into two pieces in sentences. ' +
  'Listen out for that in the phrases as you practice how to say';

/** Clause 6: the one line at seed 92. */
const DOORS_OPEN_TEXT =
  'As it happens, you already know quite a few words that can be split, ' +
  'so we will start throwing those into the mix from now on.';

// ─── Lexicon ──────────────────────────────────────────────────────────────

/** Longest first so "zurück" wins over "zu" and "heraus" over "her". */
const SEPARABLE_PREFIXES = [
  'zusammen', 'hinunter', 'hinüber', 'herüber', 'zurück', 'heraus', 'herein',
  'hinaus', 'hinein', 'weiter', 'kennen', 'vorbei', 'herum', 'hinauf', 'hinzu', 'statt',
  'fern', 'fest', 'fort', 'teil', 'weg', 'los', 'ab', 'an', 'auf', 'aus', 'bei',
  'ein', 'her', 'hin', 'mit', 'nach', 'vor', 'zu', 'um',
].sort((a, b) => b.length - a.length);

/** German "inseparable" prefixes — a stem starting with one takes no ge- in the participle. */
const NO_GE_PREFIX = /^(be|ge|er|ver|zer|ent|emp|miss)/;

/**
 * Regular (weak) conjugation from an infinitive: present, simple past,
 * participle. Enough to recognise a form; never used to generate prose.
 */
function regularForms(inf) {
  const stem = inf.replace(/en$/, '');
  const e = /[td]$/.test(stem) || /[^aeiouäöülrmn][mn]$/.test(stem) ? 'e' : '';
  const s2 = /[sßzx]$/.test(stem) ? 't' : 'st';
  const present = [stem + 'e', stem + e + s2, stem + e + 't', inf, stem + e + 't'];
  const past = ['te', 'test', 'te', 'ten', 'tet'].map(x => stem + e + x);
  const participle = (NO_GE_PREFIX.test(stem) ? '' : 'ge') + stem + e + 't';
  return { infinitive: inf, finite: new Set([...present, ...past]), participle };
}

/**
 * Strong / irregular stems present in deu_for_eng's separable verbs — the
 * finite forms listed in full (present + simple past), plus the participle.
 * Add a stem here when a new separable verb uses one; the test prints coverage.
 */
const IRREGULAR = {
  biegen:   { finite: 'biege biegst biegt biegen bog bogst bogen bogt', participle: 'gebogen' },
  bieten:   { finite: 'biete bietest bietet bieten bot botest boten botet', participle: 'geboten' },
  beziehen: { finite: 'beziehe beziehst bezieht beziehen bezog bezogst bezogen bezogt', participle: 'bezogen' },
  bringen:  { finite: 'bringe bringst bringt bringen brachte brachtest brachten brachtet', participle: 'gebracht' },
  denken:   { finite: 'denke denkst denkt denken dachte dachtest dachten dachtet', participle: 'gedacht' },
  fangen:   { finite: 'fange fängst fängt fangen fangt fing fingst fingen fingt', participle: 'gefangen' },
  finden:   { finite: 'finde findest findet finden fand fandest fanden fandet', participle: 'gefunden' },
  gehen:    { finite: 'gehe gehst geht gehen ging gingst gingen gingt', participle: 'gegangen' },
  haben:    { finite: 'habe hast hat haben habt hatte hattest hatten hattet', participle: 'gehabt' },
  halten:   { finite: 'halte hältst hält halten haltet hielt hieltest hielten hieltet', participle: 'gehalten' },
  kommen:   { finite: 'komme kommst kommt kommen kam kamst kamen kamt', participle: 'gekommen' },
  lassen:   { finite: 'lasse lässt lassen lasst ließ ließest ließen ließt', participle: 'gelassen' },
  nehmen:   { finite: 'nehme nimmst nimmt nehmen nehmt nahm nahmst nahmen nahmt', participle: 'genommen' },
  rufen:    { finite: 'rufe rufst ruft rufen rief riefst riefen rieft', participle: 'gerufen' },
  schlagen: { finite: 'schlage schlägst schlägt schlagen schlagt schlug schlugst schlugen schlugt', participle: 'geschlagen' },
  sehen:    { finite: 'sehe siehst sieht sehen seht sah sahst sahen saht', participle: 'gesehen' },
  wachsen:  { finite: 'wachse wächst wachsen wachst wuchs wuchsest wuchsen wuchst', participle: 'gewachsen' },
  ziehen:   { finite: 'ziehe ziehst zieht ziehen zog zogst zogen zogt', participle: 'gezogen' },
};

/** Every stem a VERBS entry uses. Regular unless listed in IRREGULAR. */
const STEM_LIST = [
  'bauen', 'bewahren', 'fühlen', 'fügen', 'hören', 'legen', 'lernen', 'machen',
  'passen', 'ruhen', 'schwirren', 'setzen', 'spielen', 'stellen', 'stimmen',
  'wachen', ...Object.keys(IRREGULAR),
];

const STEMS = new Map(STEM_LIST.map(inf => {
  const irr = IRREGULAR[inf];
  const forms = irr
    ? { infinitive: inf, finite: new Set(irr.finite.split(' ')), participle: irr.participle }
    : regularForms(inf);
  forms.finite.add(inf); // the infinitive is also the wir/sie/Sie present form
  return [inf, forms];
}));

/**
 * The separable verbs of deu_for_eng, verified against the live LEGOs and
 * seeds on 2026-09-21 (the two published censuses, #455 and its follow-up).
 * Alphabetical. An entry is prefix + a STEM_LIST infinitive.
 */
const VERBS = [
  'abbiegen', 'anbauen', 'anbieten', 'anfangen', 'anfühlen', 'anhalten', 'ankommen',
  'anrufen', 'aufbauen', 'aufbewahren', 'aufhören', 'aufnehmen', 'aufpassen',
  'aufwachen', 'aufwachsen', 'ausgehen', 'ausmachen', 'ausruhen', 'einbeziehen',
  'einschlagen', 'fernsehen', 'herausfinden', 'herumschwirren', 'hinbringen',
  'hinlegen', 'hinsetzen', 'hinstellen', 'hinzufügen', 'kennenlernen', 'mitbringen',
  'nachdenken', 'umziehen', 'vorbeikommen', 'vorhaben', 'vorstellen', 'weggehen', 'wegkommen',
  'weitermachen', 'weiterspielen', 'zurückkommen', 'zurücklassen', 'zurückrufen',
  'zusehen', 'zustimmen',
];

function splitLemma(lemma) {
  for (const prefix of SEPARABLE_PREFIXES) {
    if (lemma.startsWith(prefix) && STEMS.has(lemma.slice(prefix.length))) {
      return { prefix, stem: lemma.slice(prefix.length) };
    }
  }
  throw new Error(`separable-verbs: VERBS entry "${lemma}" is not prefix + a STEM_LIST stem`);
}

/** lemma → {lemma, prefix, stem, forms} */
const LEXICON = new Map(VERBS.map(lemma => {
  const { prefix, stem } = splitLemma(lemma);
  return [lemma, { lemma, prefix, stem, forms: STEMS.get(stem) }];
}));

/** prefix → the lemmas that use it */
const BY_PREFIX = new Map();
for (const v of LEXICON.values()) {
  if (!BY_PREFIX.has(v.prefix)) BY_PREFIX.set(v.prefix, []);
  BY_PREFIX.get(v.prefix).push(v);
}

/** finite form → the lemmas whose stem has that form (via any prefix) */
const BY_FINITE = new Map();
for (const v of LEXICON.values()) {
  for (const f of v.forms.finite) {
    if (!BY_FINITE.has(f)) BY_FINITE.set(f, []);
    BY_FINITE.get(f).push(v);
  }
}

const PREFIX_SET = new Set(SEPARABLE_PREFIXES);

const tokens = (text) => normalizeForContainment(text).split(' ').filter(Boolean);

/**
 * Where a clause ends. A split prefix stands at the END of its clause — that
 * is the whole grammatical fact — so the detector needs clause boundaries,
 * which normalizeForContainment strips. Punctuation bounds a clause; a prefix
 * followed by a coordinating conjunction or by "zu" also counts as clause-final
 * ("ich rufe dich zurück und ...", "ich habe nicht vor zu verlieren", seed 496).
 */
const CLAUSE_PUNCT = /[.,!?;:¿¡«»""''„“”‘’()…—–]+/g;
const CLAUSE_CONJ = new Set([
  'und', 'oder', 'aber', 'denn', 'sondern', // coordinating
  'wenn', 'dass', 'weil', 'ob', 'bevor', 'nachdem', 'obwohl', 'als', 'während', 'damit', 'bis', 'falls', 'sobald', // a new clause starts
]);
function clauseEndFlags(text) {
  const raw = String(text || '').toLowerCase().replace(CLAUSE_PUNCT, ' | ').split(/\s+/).filter(Boolean);
  const flags = []; // parallel to tokens(text): true when the token ends its clause
  const ws = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '|') { if (flags.length) flags[flags.length - 1] = true; continue; }
    ws.push(raw[i]); flags.push(false);
  }
  if (flags.length) flags[flags.length - 1] = true;
  return { ws: ws.map(w => normalizeForContainment(w)).filter(Boolean), flags };
}

/**
 * Read one token as a JOINED separable verb, or null.
 * Shapes: prefix+finite ("anfängst", "zurückkommen"), prefix+zu+infinitive
 * ("anzurufen"), prefix+participle ("angefangen", "kennengelernt").
 */
function parseJoined(token) {
  for (const prefix of SEPARABLE_PREFIXES) {
    if (!token.startsWith(prefix) || token.length <= prefix.length + 1) continue;
    const rest = token.slice(prefix.length);
    for (const v of BY_PREFIX.get(prefix) || []) {
      if (v.forms.finite.has(rest)) {
        return { lemma: v.lemma, prefix, stem: v.stem, token, shape: rest === v.stem ? 'infinitive' : 'finite', rest };
      }
      if (rest === `zu${v.stem}`) return { lemma: v.lemma, prefix, stem: v.stem, token, shape: 'zu-infinitive', rest: v.stem };
      if (rest === v.forms.participle) return { lemma: v.lemma, prefix, stem: v.stem, token, shape: 'participle', rest };
    }
  }
  return null;
}

/**
 * Every separable verb realised in a text, joined or split, in order.
 * A SPLIT is a finite form followed later in the text by its prefix standing
 * alone ("fing ... an", "rufe ... zurück"). The prefix must come AFTER the
 * finite verb — that is what clause-final means, and it is what keeps "an" the
 * preposition in "an der Ecke" from being read as a prefix.
 */
function separableVerbsIn(text) {
  const { ws, flags } = clauseEndFlags(text);
  const out = [];
  const usedPrefixAt = new Set();
  for (let i = 0; i < ws.length; i++) {
    const joined = parseJoined(ws[i]);
    if (joined) { out.push({ ...joined, realisation: 'joined', at: i }); continue; }
    const candidates = BY_FINITE.get(ws[i]);
    if (!candidates) continue;
    for (let j = i + 1; j < ws.length; j++) {
      if (flags[j - 1] && j - 1 >= i) break; // left the finite verb's clause
      if (usedPrefixAt.has(j) || !PREFIX_SET.has(ws[j])) continue;
      const clauseFinal = flags[j] || ws[j + 1] === 'zu' || CLAUSE_CONJ.has(ws[j + 1]);
      if (!clauseFinal) continue;
      const v = candidates.find(c => c.prefix === ws[j]);
      if (!v) continue;
      usedPrefixAt.add(j);
      out.push({ lemma: v.lemma, prefix: v.prefix, stem: v.stem, realisation: 'split', finite: ws[i], token: `${ws[i]} … ${ws[j]}`, at: i, prefixAt: j });
      break;
    }
  }
  return out;
}

// ─── Policy: which shapes a basket at seed N admits ───────────────────────

const RULED_COURSE = /^deu_for_eng(_v\d+)?$/;

function rulingApplies(courseCode) {
  return RULED_COURSE.test(String(courseCode || ''));
}

/**
 * The shape policy for the phrases of a LEGO at seed N of deu_for_eng.
 *   { applies:false }                        — not a ruled course
 *   { mode:'lego-shape' }                    — clauses 1, 2: the LEGO's own shape, exactly
 *   { mode:'both', taughtVerbOnly:true }     — clause 3/4: seed 83 — both shapes, contrast required
 *   { mode:'taught-verb', ... }              — 84..91: the taught verb may show either shape;
 *                                              everything else keeps its LEGO shape
 *   { mode:'free' }                          — clause 7: seed >= 92
 */
function separablePolicy(courseCode, seedNumber) {
  if (!rulingApplies(courseCode)) return { applies: false, mode: 'off' };
  const n = Number(seedNumber);
  if (n >= DOORS_OPEN_SEED) return { applies: true, mode: 'free', freeVerbs: 'all' };
  if (n === TAUGHT_SEED) return { applies: true, mode: 'both', freeVerbs: [TAUGHT_VERB], contrastRequired: true };
  if (n > TAUGHT_SEED) return { applies: true, mode: 'taught-verb', freeVerbs: [TAUGHT_VERB] };
  return { applies: true, mode: 'lego-shape', freeVerbs: [], splitException: n === SPLIT_EXCEPTION_SEED };
}

function verbIsFree(policy, lemma) {
  return policy.freeVerbs === 'all' || (Array.isArray(policy.freeVerbs) && policy.freeVerbs.includes(lemma));
}

// ─── The containment gate ─────────────────────────────────────────────────

/**
 * Does a phrase contain its LEGO, under the ruling?
 *
 * Falls through to `baseline(legoTarget, phraseTarget)` — the caller's existing
 * check — unless the course is ruled AND the LEGO carries a recognised
 * separable verb. Then: every non-verb word of the LEGO must still be present,
 * and the verb must be realised in the phrase in a shape the policy admits.
 *
 * Returns {pass, reason?, verb?, wanted?, found?} so a gate can say WHY.
 */
function checkSeparableContainment({ courseCode, seedNumber, legoTarget, phraseTarget, baseline = checkWordContainment }) {
  const policy = separablePolicy(courseCode, seedNumber);
  if (!policy.applies) return { pass: !!baseline(legoTarget, phraseTarget), applies: false };
  const legoVerbs = separableVerbsIn(legoTarget);
  if (legoVerbs.length === 0) return { pass: !!baseline(legoTarget, phraseTarget), applies: false };
  // THE RULING ONLY ADDS ADMISSIONS. A phrase the exact gate admits carries the
  // LEGO in the LEGO's own shape, and every mode admits the LEGO's own shape —
  // so it passes here whatever the clause-boundary reader makes of it (live
  // phrases drop the comma before an infinitive clause: "es fängt an so viel
  // besser zu funktionieren"). Refusing those would be a new gate, not this one.
  if (baseline(legoTarget, phraseTarget)) return { pass: true, applies: true, verbs: legoVerbs.map(v => v.lemma), exact: true };

  const legoWords = tokens(legoTarget);
  const verbIdx = new Set(legoVerbs.flatMap(v => v.realisation === 'split' ? [v.at, v.prefixAt] : [v.at]));
  const otherWords = legoWords.filter((_, i) => !verbIdx.has(i));
  if (otherWords.length && !checkWordContainment(otherWords.join(' '), phraseTarget)) {
    return { pass: false, applies: true, reason: 'other LEGO words missing', wanted: otherWords.join(' ') };
  }

  const found = separableVerbsIn(phraseTarget);
  for (const lv of legoVerbs) {
    const hits = found.filter(f => f.lemma === lv.lemma);
    const allowed = verbIsFree(policy, lv.lemma) ? ['joined', 'split'] : [lv.realisation];
    // Under lego-shape the exact token must match, not merely the lemma:
    // "anfangen" is not "angefangen", and "fing an" is not "fängt an".
    const ok = hits.some(h => allowed.includes(h.realisation)
      && (allowed.length === 2 || h.token === lv.token));
    if (!ok) {
      return {
        pass: false, applies: true, verb: lv.lemma, wanted: allowed, legoShape: lv.realisation,
        found: hits.map(h => h.realisation),
        reason: hits.length === 0
          ? `"${lv.lemma}" not found in any shape`
          : `"${lv.lemma}" is ${hits[0].realisation} here but at seed ${seedNumber} only ${allowed.join('/')} (as "${lv.token}") is admitted`,
      };
    }
  }
  return { pass: true, applies: true, verbs: legoVerbs.map(v => v.lemma) };
}

/** Convenience for the filter-shaped call sites: a boolean. */
function phraseContainsLego(args) {
  return checkSeparableContainment(args).pass;
}

// ─── The vocabulary gate ──────────────────────────────────────────────────

/**
 * The chunks the ruling adds to a vocabulary set at seed N. The vocab gate
 * tiles a phrase from known chunks; a split verb needs the finite form and the
 * prefix as chunks of their own, and a joined verb needs the joined token.
 * Only pieces the learner has actually HEARD are derived: from a heard joined
 * form P+R, the pieces P and R; from a heard split f … P, the pieces f and P
 * and the joined P+f; and P + any finite form of the stem already known as a
 * chunk on its own. Participles never split, so they yield only their prefix.
 *
 * Returns a NEW Set; the caller's set is untouched. Unruled course or no
 * admitted verb → the same members back.
 */
function augmentVocabForSeparables(vocabSet, courseCode, seedNumber, extra = {}) {
  const policy = separablePolicy(courseCode, seedNumber);
  const out = new Set(vocabSet);
  if (!policy.applies || policy.mode === 'lego-shape') return out;

  const heard = [...vocabSet, ...(extra.extraTexts || [])];
  const singleChunks = new Set(heard.map(c => tokens(c)).filter(w => w.length === 1).map(w => w[0]));
  const introduced = new Map(); // lemma → verb
  const add = (s) => { if (s) out.add(s); };

  for (const chunk of heard) {
    for (const v of separableVerbsIn(chunk)) {
      if (!verbIsFree(policy, v.lemma)) continue;
      introduced.set(v.lemma, LEXICON.get(v.lemma));
      add(v.prefix);
      if (v.realisation === 'split') { add(v.finite); add(v.prefix + v.finite); }
      else if (v.shape !== 'participle') add(v.rest);
    }
  }
  // Clause 3: the taught verb is introduced joined at seed 83, so its
  // infinitive, its joined infinitive and the finite form the seed itself
  // carries are all heard there.
  if (policy.mode === 'both' || policy.mode === 'taught-verb') {
    const v = LEXICON.get(TAUGHT_VERB);
    introduced.set(v.lemma, v);
    add(v.prefix); add(v.stem); add(v.lemma);
  }
  for (const v of introduced.values()) {
    for (const f of v.forms.finite) if (singleChunks.has(f) || out.has(f)) add(v.prefix + f);
  }
  return out;
}

// ─── Clause 8: the shape a NEW LEGO may take ──────────────────────────────

/**
 * Reported, not gated: a separable-verb LEGO introduced anywhere but seed 42
 * should be JOINED (clauses 1 and 8; seed 83's LEGO is joined by clause 3).
 * Returns null when fine, else a finding naming the LEGO.
 */
function checkSeparableLegoShape(courseCode, seedNumber, legoTarget) {
  if (!rulingApplies(courseCode)) return null;
  const split = separableVerbsIn(legoTarget).filter(v => v.realisation === 'split');
  if (split.length === 0 || Number(seedNumber) === SPLIT_EXCEPTION_SEED) return null;
  return {
    seedNumber: Number(seedNumber), legoTarget, verbs: split.map(v => v.lemma),
    finding: `LEGO "${legoTarget}" introduces ${split.map(v => v.lemma).join(', ')} SPLIT; the ruling introduces every separable verb JOINED (seed 42 is the one exception)`,
  };
}

// ─── Clause 4: the contrast floor at the taught seed ──────────────────────

/**
 * At seed 83 the basket must show the taught verb in BOTH shapes, at least
 * CONTRAST_MIN_EACH times each, across BUILD + USE. Elsewhere: not checked.
 */
function checkSeparableContrast(courseCode, seedNumber, legoTarget, phrases) {
  const policy = separablePolicy(courseCode, seedNumber);
  if (!policy.contrastRequired) return { checked: false };
  const lemmas = separableVerbsIn(legoTarget).map(v => v.lemma);
  if (lemmas.length === 0) return { checked: false, reason: 'LEGO carries no separable verb' };
  let split = 0, joined = 0;
  for (const p of phrases) {
    for (const v of separableVerbsIn(p.target)) {
      if (!lemmas.includes(v.lemma)) continue;
      if (v.realisation === 'split') split++; else joined++;
    }
  }
  const pass = split >= CONTRAST_MIN_EACH && joined >= CONTRAST_MIN_EACH;
  return { checked: true, pass, split, joined, required: CONTRAST_MIN_EACH, verbs: lemmas };
}

// ─── The prompt: what the builder is told ─────────────────────────────────

/**
 * The section merged into the v3 phrase prompt for a ruled course. Empty for
 * everything else, and empty for a LEGO without a separable verb before seed
 * 92 (nothing to say). Same policy object as the gates, so the instruction and
 * the check cannot drift apart.
 */
function separableSection(courseCode, seedNumber, lego) {
  const policy = separablePolicy(courseCode, seedNumber);
  if (!policy.applies) return '';
  const legoVerbs = separableVerbsIn(lego.target_text || lego.target || '');
  const names = legoVerbs.map(v => `${v.lemma} (${v.realisation} here as "${v.token}")`).join(', ');
  const L = ['', '---', '', '## GERMAN SEPARABLE VERBS — the rule at this point in the course', ''];

  if (policy.mode === 'lego-shape') {
    if (legoVerbs.length === 0) return '';
    if (policy.splitException) {
      L.push(`This LEGO carries ${names}. Keep it SPLIT exactly as the LEGO has it, in every phrase: "${legoVerbs[0].token}". Never the joined form. The learner has not yet been told that German splits verbs; this seed is the one sanctioned exception before that lesson, and it must look the same every time.`);
    } else {
      L.push(`This LEGO carries ${names}. Use it JOINED, exactly as the LEGO writes it, in every phrase — after a modal, with zu, as a participle, or verb-final in a subordinate clause. Do NOT split it (no "ich ... an", no "wir ... zurück"). The learner has not yet been told that German splits verbs; that is taught at seed ${TAUGHT_SEED}. A split phrase here fails the gate.`);
    }
  } else if (policy.mode === 'both') {
    L.push(`THIS IS THE SEED WHERE THE SPLIT IS TAUGHT. The LEGO is ${names || 'the taught verb ' + TAUGHT_VERB}. The learner has just been told: "${LESSON_TEXT_TAUGHT_SEED} [${lego.known_text || lego.known || ''}]".`);
    L.push('');
    L.push(`Write BOTH shapes, and lots of each: VERY SHORT split phrases ("ich stimme zu", "ich stimme dem zu", "ich stimme nicht zu"), VERY SHORT joined phrases wherever the build range allows (after a modal, with zu), and USE phrases that showcase the pattern. Volume and contrast teach this, not explanation — put no explanation in a phrase. At least ${CONTRAST_MIN_EACH} split and ${CONTRAST_MIN_EACH} joined across the set, or the gate refuses it.`);
    L.push('');
    L.push('Every OTHER separable verb stays JOINED, as before.');
  } else if (policy.mode === 'taught-verb') {
    L.push(`"${TAUGHT_VERB}" was taught split at seed ${TAUGHT_SEED} and may appear split or joined — keep drilling it, short and often, in both shapes. Every other separable verb stays JOINED exactly as its LEGO writes it; the doors open at seed ${DOORS_OPEN_SEED}.`);
    if (legoVerbs.length && !legoVerbs.every(v => v.lemma === TAUGHT_VERB)) {
      L.push(`This LEGO carries ${names} — keep that shape exactly.`);
    }
  } else {
    L.push(`From seed ${DOORS_OPEN_SEED} the learner has been told: "${DOORS_OPEN_TEXT}" Any separable verb already introduced may now appear SPLIT or JOINED${legoVerbs.length ? ` — including this LEGO's ${names}` : ''}.`);
    L.push('');
    L.push('CONSISTENCY IS THE WHOLE POINT: split it where German splits it (finite verb in a main clause, prefix at the end) and keep it joined where German joins it (after a modal, with zu, as a participle, verb-final in a subordinate clause). The learner is inducing the real rule from your phrases; a split or a join in the wrong place teaches a false one. Never split for variety.');
  }
  L.push('');
  return L.join('\n');
}

module.exports = {
  SPLIT_EXCEPTION_SEED, TAUGHT_SEED, DOORS_OPEN_SEED, TAUGHT_VERB, CONTRAST_MIN_EACH,
  LESSON_TEXT_TAUGHT_SEED, DOORS_OPEN_TEXT,
  SEPARABLE_PREFIXES, VERBS, LEXICON,
  rulingApplies, separablePolicy, parseJoined, separableVerbsIn,
  checkSeparableContainment, phraseContainsLego, augmentVocabForSeparables,
  checkSeparableLegoShape, checkSeparableContrast, separableSection,
};
