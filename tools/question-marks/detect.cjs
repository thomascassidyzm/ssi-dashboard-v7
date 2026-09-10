/**
 * scan-course Check 21 — the missing-question-mark detector, as a pure function.
 *
 * Kept separate from the runner (as Check 18 keeps `presentation-drift.cjs` and
 * Check 19 keeps `distinctions/detect.cjs`) so the verdict logic can be unit-tested
 * without a database, and so the regression that killed the old Check 14 can be
 * pinned by a test rather than by a comment.
 *
 * FOUR NETS, AND EACH ONE REPORTS ITS OWN YIELD. A net that fires on everything is
 * an artefact; a net that fires on nothing is inert. Both are invisible if you only
 * print a total, so `classify()` returns a per-net breakdown and the runner prints it.
 *
 *   mismatch — one side ends in `?` and the other does not. Language-independent,
 *              needs no patterns, and is a defect class in its own right rather than
 *              a candidate: the two sides of one row disagree, and that is a fact,
 *              not an inference. On ita_for_eng this net was 48 for 48.
 *
 *   opener   — interrogative openers and inverted word order, run against EVERY side
 *              that has a pattern set, with the yield reported per side. Which side
 *              carries the signal is a property of the language pair, not a constant:
 *              English marks questions by word order, so on an English-known course
 *              the known side is the detector and the Italian target side produced
 *              3,029 candidates and ZERO real defects (Italian yes/no questions have
 *              statement word order). On eng_for_ita that is exactly reversed.
 *
 *   frame    — sibling frames. Group rows by their first three known-side words; if
 *              siblings sharing the frame end in `?` and this row does not, flag it.
 *              This is the only net that can reach an INTONATION question, where the
 *              word order is a statement's and the punctuation is the whole of the
 *              signal. It found the `you don't mind …` and `you're looking for …`
 *              ladders on ita_for_eng, which no opener pattern can ever match.
 *
 *   tail     — a question as the LAST sentence of a multi-sentence row
 *              ("I want to. Why not"). The opener nets only look at position 0.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO — it does not decide. Every net produces a
 * READING LIST. Kai's instruction, 2026-09-10: "a mix of regex (to get lists that it
 * then reads through FULLY to confirm - NEVER trust it on its own!)". The opener net
 * ran at 61% false positives on ita_for_eng and that is fine, because 464 lines is a
 * readable list and 15,632 is not. It stops being fine the moment someone applies the
 * output unread.
 *
 * THE `\b` TRAP, WHICH THIS FILE IS THE SECOND VICTIM OF. The old Check 14 wrote
 * `/^(…|perché|…)\b/i`. JavaScript's `\b` is ASCII-only, so it never matches after
 * `é`, and `perché`, `qué`, `cómo`, `dónde`, `quién` and `où` were all undetectable —
 * in a file that documents that exact trap 700 lines further down. Every boundary
 * here is `(?![\p{L}\p{M}])` under the `u` flag.
 */

// A trailing question mark, in every form the estate actually stores.
// Note it is TRAILING only: `?` inside the string is a sentence boundary, handled
// by the tail net, not by this.
const ENDS_Q = /[?？؟]\s*$/u;
const endsQ = (t) => ENDS_Q.test(String(t || '').trim());

// Word boundary that survives an accented letter. See the header.
const B = '(?![\\p{L}\\p{M}])';
const rx = (body) => new RegExp(body, 'iu');

/**
 * An alternation with a word boundary that is correct at BOTH ends of the problem.
 *
 * The old check used `\b`, which is ASCII-only and therefore dies after `é` or `'`.
 * The obvious repair — append `(?![\p{L}\p{M}])` to the whole group — fixes the
 * accents and then breaks the apostrophes, because French `qu'` is legitimately
 * followed by a letter: `qu'est-ce que`. The boundary belongs only after an
 * alternative that actually ENDS IN A LETTER. This bug was in the first version of
 * this file and was caught by its own test, which is the argument for the test.
 */
const alt = (words) => `(?:${words.map((w) => (/[\p{L}\p{M}]$/u.test(w) ? w + B : w)).join('|')})`;

/**
 * Known-side interrogative pattern sets, per language.
 *
 * These are CANDIDATE GENERATORS, not definitions of a question. They are tuned for
 * recall against the course's own already-marked questions (see `calibrate()` in the
 * runner) and are expected to over-generate. A language absent from this table still
 * gets the mismatch, frame and tail nets — which are language-independent — and the
 * runner says so out loud rather than reporting a clean zero from an inert check.
 */
const OPENERS = {
  eng: {
    // Auxiliary-initial and wh-initial: the two ways English inverts for a question.
    open: rx('^\\s*' + alt(['what', 'where', 'when', 'why', 'who', 'whom', 'whose', 'which', 'how',
      'can', 'could', 'will', 'would', 'do', 'does', 'did', 'is', 'are', 'was', 'were', 'am',
      'have', 'has', 'had', 'should', 'shall', 'may', 'might', 'must'])),
    // Negative contractions — a whole class the old Check 14 could not see.
    neg: rx('^\\s*' + alt(["shouldn't", "couldn't", "wouldn't", "isn't", "aren't", "don't",
      "doesn't", "didn't", "won't", "can't", "haven't", "hasn't", "wasn't", "weren't", "mustn't"])),
    // A fronted discourse adverb before the inversion: "then what happened".
    front: rx('^\\s*' + alt(['then', 'so', 'and', 'but', 'ok', 'okay', 'well', 'alright', 'now'])
      + '\\s+' + alt(['what', 'where', 'when', 'why', 'who', 'how', 'which', 'do', 'does', 'did',
        'can', 'could', 'will', 'would', 'is', 'are', 'was', 'were', 'have', 'has', 'should', 'shall'])),
    // An inversion after a comma or semicolon: "tomorrow, can you come".
    embedded: rx('(?:^|[,;]\\s*)' + alt(['do', 'does', 'did', 'can', 'could', 'will', 'would',
      'are', 'is', 'was', 'were', 'have', 'has', 'should'])
      + '\\s+' + alt(['you', 'i', 'we', 'they', 'he', 'she', 'it'])),
  },
  spa: {
    open: rx('^\\s*¿?\\s*' + alt(['qué', 'cómo', 'cuándo', 'dónde', 'por qué', 'quién', 'quiénes',
      'cuál', 'cuáles', 'cuánto', 'cuánta', 'cuántos', 'cuántas', 'puedes', 'puede', 'podrías',
      'puedo', 'quieres', 'quiere', 'tienes', 'hay', 'sabes', 'te gusta'])),
  },
  fra: {
    open: rx('^\\s*' + alt(['qu\'', 'que', 'qui', 'où', 'quand', 'comment', 'pourquoi', 'quel',
      'quelle', 'quels', 'quelles', 'est-ce', 'peux-tu', 'peut-on', 'peux', 'y a-t-il', 'combien'])),
  },
  ita: {
    open: rx('^\\s*' + alt(['che', 'cosa', 'come', 'dove', 'quando', 'perché', 'chi', 'quale',
      'quali', 'quanto', 'quanta', 'quanti', 'quante', 'puoi', 'può', 'potresti', 'vuoi', 'vuole'])),
  },
  por: {
    open: rx('^\\s*' + alt(['o que', 'que', 'como', 'onde', 'quando', 'por que', 'porquê', 'quem',
      'qual', 'quais', 'quanto', 'quantos', 'quantas', 'pode', 'podes', 'podia', 'quer', 'queres'])),
  },
  deu: {
    open: rx('^\\s*' + alt(['was', 'wo', 'wann', 'warum', 'wer', 'wen', 'wem', 'wessen', 'welche',
      'welches', 'welcher', 'wie', 'wieviel', 'kannst', 'kann', 'könntest', 'bist', 'ist', 'hast',
      'hat', 'habt', 'würdest', 'darf', 'möchtest', 'willst'])),
  },
  cym: {
    open: rx('^\\s*' + alt(['beth', 'ble', 'pryd', 'pam', 'pwy', 'pa', 'sut', 'faint', 'oes',
      'ydw', 'ydy', 'wyt', 'oeddwn', 'wnei', 'alli', 'gaf'])),
  },
};

/**
 * Suppressions: shapes that a wh-opener matches and that are NEVER a direct question.
 * A wh-word followed by an infinitive is a noun clause — "how to speak", "what to do".
 * Measured on ita_for_eng: 20 candidates, 0 of them real.
 *
 * Every suppressed row is COUNTED AND RETURNED, never silently dropped (canon A3,
 * WC-F3 — any matcher with a quiet `continue` is a silent-skip machine). If a
 * suppression is ever wrong, the number sitting next to the verdict is what makes it
 * findable.
 */
const SUPPRESS = {
  eng: rx('^\\s*' + alt(['what', 'where', 'when', 'why', 'who', 'whose', 'which', 'how']) + '\\s+to\\s+\\p{L}'),
};
const suppressed = (text, lang) => Boolean(SUPPRESS[lang] && SUPPRESS[lang].test(String(text || '').trim()));

/**
 * Paired marks: languages that open a question as well as close it.
 *
 * Spanish is the only one in this estate. This was a CLASS OF ITS OWN in the old
 * Check 14 and it is kept as one here — it is not a missing question mark, it is a
 * missing HALF of one, it is detectable with certainty, and it has nothing to do with
 * word order or with any opener pattern.
 *
 * IT IS REPORTED WITH ITS OWN DENOMINATOR, and that is the whole care in it. On
 * spa_for_eng the Spanish side reads 24 missing out of 1,297 that end in `?` — a real
 * defect list. On cat_for_spa the Spanish KNOWN side reads 5 of 5. A detector that
 * fires on 100% of a class has found a house style, not a defect population (WC-F1,
 * WC-F7: uniformity is the signature of an artefact), and that is Kai's call about
 * the course, not an agent's about a row. The ratio is what tells the two apart, so
 * the ratio is printed next to the count and never the count alone.
 *
 * It is also side-aware: the rule applies to the SPANISH side, whichever side that
 * is. The old check applied it to whichever field happened to be Spanish, which was
 * right; a naive both-sides version flags 1,268 perfectly correct English rows on
 * spa_for_eng.
 *
 * AND THE OPENING MARK IS NOT AT POSITION 0. This is the trap the first version of
 * this rule fell into, caught by reading its own output: the `¿` opens the
 * INTERROGATIVE CLAUSE, not the string. All of these are correct Spanish —
 *
 *     "Si tienes un poco más de tiempo, ¿puedo preguntarte algo?"
 *     "No estoy seguro, así que ¿podrías explicarlo de nuevo?"
 *     "no voy a esperarte. ¿Por qué no?"
 *
 * — and an anchored `/^\s*¿/` calls every one of them a defect. Anchoring took the
 * count from 12 real to 24 reported, i.e. 50% false, on the first course it ran on.
 * The rule is therefore ABSENCE: the row closes with `?` and carries no `¿` anywhere.
 * The old Check 14 used the anchored form (`startsSpanishQmark`), so this is a defect
 * inherited from it and fixed here rather than a new one.
 */
const PAIRED_OPEN = { spa: { open: '¿', re: /¿/u } };
const needsPairedOpen = (text, lang) => {
  const cfg = PAIRED_OPEN[lang];
  return Boolean(cfg && endsQ(text) && !cfg.re.test(String(text || '')));
};
const closesQ = (text, lang) => Boolean(PAIRED_OPEN[lang] && endsQ(text));

const hasOpenerSet = (lang) => Object.prototype.hasOwnProperty.call(OPENERS, lang);

function openerHits(text, lang) {
  const set = OPENERS[lang];
  if (!set) return [];
  const t = String(text || '').trim();
  return Object.entries(set).filter(([, re]) => re.test(t)).map(([name]) => name);
}

// The last sentence of a multi-sentence row, or null when the row is one sentence.
// Split on `. ! ?` followed by whitespace — the estate stores "I want to. Why not?"
// as one row, and only the tail of it is the question.
function lastSentence(text) {
  const t = String(text || '').trim();
  const parts = t.split(/(?<=[.!?])\s+/u);
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

// First N words of the known side, punctuation and case folded away, used as the
// sibling-frame key. Three words is what separated a real frame from noise on
// ita_for_eng: two collapses "you want"/"I want" families together, four splits
// ladders that should group.
const FRAME_WORDS = 3;
function frameKey(text) {
  const w = String(text || '').toLowerCase().replace(/[^\p{L}\p{M}'\s]/gu, '').split(/\s+/u).filter(Boolean);
  return w.length >= FRAME_WORDS ? w.slice(0, FRAME_WORDS).join(' ') : null;
}

/**
 * Build the frame index from rows that ARE marked as questions.
 *
 * Only single-sentence rows contribute a frame. Without that guard the row
 * "I want to. Why not?" donates the frame "i want to" and every declarative in the
 * course starting "I want to" becomes a candidate — measured, that one contamination
 * took the frame net from 243 candidates to 912.
 */
function buildFrames(rows) {
  const q = new Map(), d = new Map();
  for (const r of rows) {
    const k = frameKey(r.known_text);
    if (!k) continue;
    if (lastSentence(r.known_text)) continue;
    const bucket = endsQ(r.known_text) ? q : d;
    bucket.set(k, (bucket.get(k) || 0) + 1);
  }
  return { q, d };
}

/**
 * Classify every row of one course.
 *
 * `rows` are {id, kind, seed_number, known_text, target_text, is_fragment}. A fragment
 * — a LEGO or a component tile — is counted and named, never silently dropped: those
 * are chunks by construction and do not carry terminal punctuation. On ita_for_eng
 * exactly one LEGO in 1,457 carried a question mark, and it was correct.
 */
/**
 * Reading order. Kai's complaint is SPEED, and a list is only fast if its strongest
 * evidence is at the top: the reader works down and stops when the yield dies.
 * The tiers are measured, not guessed — the numbers are the ita_for_eng hand read,
 * 2026-09-10, 834 rows read in full.
 *
 *   A  the row's own two sides disagree                          48/48   true
 *   B  a known-side opener fired — the side that inverts word order  ~1 in 3 true
 *   C  a sibling frame that is mostly marked (>= half the family)  the intonation
 *      ladders; the only tier that reaches a question in statement word order
 *   D  target-side opener only, or a weak frame                   0/511 on this pair
 *
 * Tier D is not dead weight in general — on a course whose KNOWN side is the language
 * that marks questions by intonation, D and B swap places. It is dead weight on THIS
 * pair, and the tier is what lets a reader see that instead of discovering it at row
 * 500.
 */
function tierOf(nets) {
  if (nets.some((n) => n.startsWith('known:'))) return 'B';
  const f = nets.find((n) => n.startsWith('frame:'));
  if (f) {
    const [m, t] = f.slice(6).split('/').map(Number);
    if (t && m / t >= 0.5) return 'C';
  }
  if (nets.includes('tail')) return 'B';
  return 'D';
}

const TIER_ORDER = { B: 0, C: 1, D: 2 };

function classify(rows, { knownLang, targetLang } = {}) {
  const judged = rows.filter((r) => !r.is_fragment);
  const fragments = rows.length - judged.length;
  const frames = buildFrames(judged);

  const mismatches = [], candidates = [], suppressedRows = [], pairedOpen = [];
  let pairedClosers = 0;
  const netYield = { mismatch: 0, opener_known: 0, opener_target: 0, frame: 0, tail: 0 };

  for (const r of judged) {
    const kq = endsQ(r.known_text), tq = endsQ(r.target_text);

    // The paired-mark class is independent of everything else: a row can be correct
    // on every other net and still be missing the half of the mark that opens it.
    for (const [side, text, lang] of [['known', r.known_text, knownLang], ['target', r.target_text, targetLang]]) {
      if (closesQ(text, lang)) pairedClosers++;
      if (needsPairedOpen(text, lang)) pairedOpen.push({ ...r, side, lang, mark: PAIRED_OPEN[lang].open });
    }

    if (kq !== tq) {
      // A fact, not a candidate: the row's own two sides disagree.
      mismatches.push({ ...r, side: kq ? 'target_missing' : 'known_missing' });
      netYield.mismatch++;
      continue;
    }
    if (kq && tq) continue; // both marked — nothing to ask

    const nets = [];
    const ko = openerHits(r.known_text, knownLang);
    if (ko.length) { nets.push(...ko.map((n) => `known:${n}`)); netYield.opener_known++; }
    const to = openerHits(r.target_text, targetLang);
    if (to.length) { nets.push(...to.map((n) => `target:${n}`)); netYield.opener_target++; }

    const fk = frameKey(r.known_text);
    if (fk && frames.q.get(fk)) {
      const marked = frames.q.get(fk), unmarked = frames.d.get(fk) || 0;
      // Report the ratio with the hit. A frame that is 14-of-20 marked is a ladder
      // with holes in it; a frame that is 1-of-23 is a declarative family with one
      // question that happens to share three words. The reader needs to see which.
      nets.push(`frame:${marked}/${marked + unmarked}`);
      netYield.frame++;
    }

    const tailText = lastSentence(r.known_text);
    if (tailText && openerHits(tailText, knownLang).length) { nets.push('tail'); netYield.tail++; }

    if (!nets.length) continue;
    if (suppressed(r.known_text, knownLang)) { suppressedRows.push({ ...r, nets, reason: 'wh + infinitive is a noun clause, not a question' }); continue; }
    candidates.push({ ...r, nets, tier: tierOf(nets) });
  }

  candidates.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.seed_number - b.seed_number);

  const byTier = {};
  for (const c of candidates) byTier[c.tier] = (byTier[c.tier] || 0) + 1;

  return {
    rows: rows.length,
    fragments,
    byTier,
    judged: judged.length,
    knownLang, targetLang,
    knownOpeners: hasOpenerSet(knownLang),
    targetOpeners: hasOpenerSet(targetLang),
    mismatches,
    candidates,
    pairedOpen,
    pairedClosers,
    pairedLang: [knownLang, targetLang].find((l) => PAIRED_OPEN[l]) || null,
    suppressed: suppressedRows,
    netYield,
  };
}

/**
 * Self-calibration: the course's own already-marked questions are a free set of known
 * positives. Strip the `?` off one of them, re-run, and see whether the nets find it.
 * That number is RECALL, measured on this course's real text, and it is the only thing
 * that makes a defect count mean anything (canon A3; WC-F2, the check that reported
 * clean because it could not read the alphabet).
 *
 * IT IS LEAVE-ONE-OUT, AND THAT IS NOT A DETAIL. The first version stripped all 956
 * marked questions at once and read 97.7%, because stripping a whole family destroys
 * the sibling evidence the frame net runs on — every `you don't mind …` row lost its
 * mark together, so no sibling was left to point at the gap. That is not the situation
 * the check ever faces: in a real course the ladder is marked and one rung is not.
 * So each known positive is planted ALONE, against a course that is otherwise intact,
 * with its own contribution to the frame index removed so it cannot vouch for itself.
 *
 * On ita_for_eng the first opener set scored 919/957 this way, and the 38 misses named
 * their own classes: intonation questions, negative contractions, and second-sentence
 * questions. Adding those three nets took it to 100%. That loop — measure, read the
 * misses, extend, re-measure — is the method, and it costs one run.
 */
function calibrate(rows, opts) {
  const judged = rows.filter((r) => !r.is_fragment);
  const frames = buildFrames(judged);
  const strip = (t) => String(t || '').trim().replace(ENDS_Q, '').trim();
  const marked = judged.filter((r) => endsQ(r.known_text) && endsQ(r.target_text));

  const missed = [];
  let caught = 0;
  for (const r of marked) {
    const known = strip(r.known_text), target = strip(r.target_text);
    // The row's siblings are the evidence. Its own contribution is removed first:
    // a row must never be its own witness.
    const fk = frameKey(known);
    const single = !lastSentence(r.known_text);
    const selfMarked = fk && single ? 1 : 0;
    const siblingQ = fk ? (frames.q.get(fk) || 0) - selfMarked : 0;

    const fired = openerHits(known, opts.knownLang).length
      || openerHits(target, opts.targetLang).length
      || siblingQ > 0
      || (lastSentence(known) && openerHits(lastSentence(known), opts.knownLang).length);
    if (fired) caught++;
    else missed.push({ ...r, known_text: known, target_text: target });
  }
  return {
    knownPositives: marked.length,
    caught,
    missed,
    recall: marked.length ? +((100 * caught) / marked.length).toFixed(1) : 100,
  };
}

module.exports = { OPENERS, SUPPRESS, PAIRED_OPEN, needsPairedOpen, suppressed, tierOf, endsQ, openerHits, lastSentence, frameKey, buildFrames, classify, calibrate, hasOpenerSet, FRAME_WORDS };
