/**
 * STRUCTURAL FEATURES THAT NEED A STAGED INTRODUCTION — the builder FLAGS,
 * it does not decide.
 *
 * Kai's ruling, 2026-09-21 (job #491), on the back of the German separable-verb
 * ruling encoded in separable-verbs.cjs: "this kind of decision isn't something
 * for the build agent to make for new courses, it's something to bring to me
 * (ideally with suggestions based on past decisions!) for us to scope out
 * together on a case-by-case basis." And: "The build agent shouldn't be
 * writing explanations... it should be something to flag to a human for now."
 *
 * So when a build meets a feature of the target language whose FIRST SHOWING
 * to the learner is a pedagogy decision — when the split form is first heard,
 * where the one human-written line goes, when the doors open — the build STOPS
 * and raises a flag. The flag carries the four things Kai asked for, because a
 * bare "this language has X" is half the deliverable:
 *   (a) what the feature is, in plain English;
 *   (b) the seeds where it first appears, quoted in full, target and known, in
 *       seed order;
 *   (c) the closest prior ruling and what it did — PRECEDENTS below, the
 *       German staged introduction being #1;
 *   (d) a recommendation drawn from that precedent, for Kai to confirm, move,
 *       or reject.
 * Nothing here composes learner-facing text. The precedent's human wording is
 * referenced as a record (separable-verbs.cjs HUMAN_AUTHORED_TEXT); the
 * recommendation says WHERE a human would write a line, never what it says.
 *
 * THE MECHANISM IS course_qa_flags — the table this repo already uses to put
 * a finding in front of a human (its comment: "QA issues flagged by monitor
 * agent for human review"; written by the phrase monitor and the QA routes,
 * read by the dashboard's QA Review view). A flag of check_type
 * 'structural_feature' at severity 'error' is one row there, with this
 * module's flag object as its details. No parallel queue was built. The
 * table's check_type constraint needs the value added — see
 * database/changes/20260921_course_qa_flags_structural_feature.sql — and until
 * it is, raising a flag fails LOUDLY with the file named, never silently.
 *
 * GROWING IT. A new feature is a FEATURES entry (a plain-English description,
 * the languages its reader covers, and a reader that returns the occurrences
 * in one sentence). A new ruling is a PRECEDENTS entry in the same shape as
 * #1. closestPrecedent() matches on feature first, then language; a flag with
 * no precedent says so and recommends nothing, which is also an honest flag.
 */

'use strict';

const {
  rulingApplies, separableVerbsIn, HUMAN_AUTHORED_TEXT,
  SPLIT_EXCEPTION_SEED, TAUGHT_SEED, DOORS_OPEN_SEED, TAUGHT_VERB,
} = require('./separable-verbs.cjs');

/** The check_type this flag is filed under in course_qa_flags. */
const STRUCTURAL_CHECK_TYPE = 'structural_feature';
/** The DB change that admits it; named in the error when it has not been applied. */
const CHECK_TYPE_CHANGE_FILE = 'database/changes/20260921_course_qa_flags_structural_feature.sql';
/** How many first occurrences a flag quotes in full. */
const QUOTED_SEEDS = 6;

/** 'deu_at_for_eng' → 'deu' (the language key's base; regional variants share a grammar). */
function targetLanguageBase(courseCode) {
  return String(courseCode || '').split('_for_')[0].split('_')[0];
}

// ─── The precedents: every ruling of this kind, newest last ────────────────

const PRECEDENTS = Object.freeze([
  Object.freeze({
    number: 1,
    id: 'deu_for_eng/separable-verbs/2026-09-21',
    feature: 'separable-verbs',
    language: 'deu',
    course: 'deu_for_eng',
    ruledBy: 'Kai',
    ruled: '2026-09-21',
    shape: 'staged introduction: introduced-shape only, one sanctioned exception, one taught seed with a human-written line, one doors-open seed with a human-written line, then free',
    stages: Object.freeze([
      { seed: SPLIT_EXCEPTION_SEED, role: `sanctioned exception — the one LEGO met split before the split is taught ("fing an") keeps that exact split shape every time, until seed ${DOORS_OPEN_SEED}` },
      { seed: TAUGHT_SEED, role: `taught — the LEGO (${TAUGHT_VERB}) is introduced JOINED, a human writes the one-line explanation on its presentation, and its phrases carry BOTH shapes: many very short split, many very short joined, USE phrases showcasing the pattern (a gate requires at least 2 of each)` },
      { seed: TAUGHT_SEED + 1, role: 'no explanation — same verb negated; the drilling does the work' },
      { seed: DOORS_OPEN_SEED, role: 'doors open — a human writes one line; from here any separable verb already introduced may appear split or joined, seed 42\'s included' },
    ]),
    whatItDid: Object.freeze([
      'Every separable verb appears in its INTRODUCED shape (joined) everywhere before the taught seed; a split phrase before then fails the gate.',
      'One early seed that is naturally split stays split, exactly, as the sole exception — the learner meets the shape without being told about it.',
      'The split is TAUGHT once, at one seed: LEGO introduced joined, a human-written line, phrases in both shapes, volume and contrast rather than explanation.',
      'The doors open a few seeds later with one human-written line; after that split and joined are both admitted, and every later separable verb is introduced joined ("cleaner and avoids duplicates").',
      'Split vs joined must be CONSISTENT with where German actually splits, so the learner induces the real rule; inconsistency is the defect.',
      'The build agent writes none of the learner-facing text; both lines are Kai\'s and are applied by a human at the fixes stage.',
    ]),
    humanText: HUMAN_AUTHORED_TEXT,
    encodedIn: 'services/course-builder/lib/separable-verbs.cjs',
    source: 'Kai, 2026-09-21, in the room; encoded by job #486, made precedent #1 by job #491',
  }),
]);

// ─── The features a build can recognise ───────────────────────────────────

const FEATURES = Object.freeze({
  'separable-verbs': Object.freeze({
    description:
      'Separable verbs: a verb whose prefix detaches and moves to the end of the clause in a main clause ' +
      '(German "anfangen" → "ich fange … an"), but stays joined after a modal, with "zu", as a participle, ' +
      'or verb-final in a subordinate clause. A learner who has only ever heard the joined form does not ' +
      'recognise the split as the same word, so WHEN the split is first shown, WHERE a human explains it, ' +
      'and from which seed both shapes are free is a staged-introduction decision, not a builder\'s call.',
    /** Languages whose forms the reader below can actually read. Dutch etc. need a lexicon first. */
    languages: Object.freeze(['deu']),
    /** Occurrences in one sentence: [{lemma, realisation:'split'|'joined', token}]. */
    read: (text) => separableVerbsIn(text).map(v => ({ lemma: v.lemma, realisation: v.realisation, token: v.token })),
    /** Courses for which a human has ALREADY ruled — no flag, the ruling applies. */
    ruledFor: (courseCode) => rulingApplies(courseCode),
  }),
});

/** Which features' readers cover this course's target language. */
function featuresFor(courseCode) {
  const base = targetLanguageBase(courseCode);
  return Object.entries(FEATURES).filter(([, f]) => f.languages.includes(base)).map(([name]) => name);
}

/** The closest prior ruling: same feature and language, else same feature; null if none. */
function closestPrecedent(feature, courseCode) {
  const base = targetLanguageBase(courseCode);
  const same = PRECEDENTS.filter(p => p.feature === feature);
  return same.find(p => p.language === base) || same[same.length - 1] || null;
}

/**
 * Should the builder STOP here rather than generate? Non-null when the course
 * is NOT ruled for a feature its target language has, and the LEGO or the seed
 * in hand carries an occurrence. Pure; the caller then builds and raises the flag.
 */
function structuralStop(courseCode, lego, seed) {
  const texts = [lego && (lego.target_text || lego.target), seed && (seed.target_text || seed.target)].filter(Boolean);
  for (const name of featuresFor(courseCode)) {
    const f = FEATURES[name];
    if (f.ruledFor(courseCode)) continue;
    const hits = texts.flatMap(t => f.read(t));
    if (hits.length) return { feature: name, occurrences: hits };
  }
  return null;
}

/** Every seed of the course carrying the feature, in seed order, with its shapes. */
function occurrencesInCourse(feature, seeds) {
  const f = FEATURES[feature];
  const out = [];
  for (const s of [...seeds].sort((a, b) => a.seed_number - b.seed_number)) {
    const hits = f.read(s.target_text || s.target || '');
    if (hits.length) out.push({ seed_number: s.seed_number, target: s.target_text || s.target, known: s.known_text || s.known || null, shapes: hits.map(h => `${h.lemma}:${h.realisation}`) });
  }
  return out;
}

/**
 * The recommendation, drawn from the precedent and the course's own seeds.
 * It proposes WHERE, in this course, the precedent's stages would fall; it
 * names no learner-facing wording, and every seed it names is a suggestion.
 */
function recommend(feature, precedent, occurrences) {
  if (!precedent) {
    return `No prior ruling covers "${feature}". Nothing to recommend from precedent; Kai scopes this from scratch with the seeds quoted above.`;
  }
  if (precedent.feature !== 'separable-verbs') return `Consider whether precedent #${precedent.number} (${precedent.id}) transfers: ${precedent.shape}.`;
  const firstSplit = occurrences.find(o => o.shapes.some(s => s.endsWith(':split')));
  const firstJoined = occurrences.find(o => o.shapes.some(s => s.endsWith(':joined')));
  const later = occurrences.filter(o => firstSplit && o.seed_number > firstSplit.seed_number && o.shapes.some(s => s.endsWith(':split')));
  const secondSplit = later[0];
  const L = [
    `Follow the shape of precedent #${precedent.number} (${precedent.course}, ${precedent.ruledBy} ${precedent.ruled}): introduced shape only until one taught seed, one sanctioned early exception, one doors-open seed, then free.`,
    firstJoined ? `Joined-only from the first occurrence, seed ${firstJoined.seed_number}, exactly as deu_for_eng does from seed 16.` : 'No joined occurrence found: the precedent\'s "joined-only first" stage has nothing to attach to here.',
    firstSplit ? `Seed ${firstSplit.seed_number} is the first seed whose sentence is itself split; the precedent kept such a seed split as the sole early exception (its seed ${SPLIT_EXCEPTION_SEED}). Candidate for the same treatment.` : 'No split seed found before any joined one; no early exception is needed.',
    secondSplit ? `Seed ${secondSplit.seed_number} is the next split sentence; the precedent taught the split at its second such seed (${TAUGHT_SEED}) with a human-written line and both shapes in the phrases. Candidate taught seed.` : 'Only one split sentence found; the taught seed would have to be a joined one, which the precedent did not do — Kai\'s call.',
    `The doors-open seed then falls a few seeds after the taught one (the precedent used ${DOORS_OPEN_SEED}, nine after ${TAUGHT_SEED}); a human writes that line too.`,
    'The build agent writes neither line, chooses none of these seeds, and generates nothing for this course until Kai has ruled; the ruling is then encoded as the German one was and added to PRECEDENTS.',
  ];
  return L.join(' ');
}

/**
 * The flag: everything Kai asked a flag to carry. `seeds` is the course's
 * seeds (seed_number, target_text, known_text); only the first QUOTED_SEEDS
 * occurrences are quoted in full, the rest are counted.
 */
function buildStructuralFlag(courseCode, feature, seeds) {
  const f = FEATURES[feature];
  if (!f) throw new Error(`structural-features: unknown feature "${feature}"`);
  const occurrences = occurrencesInCourse(feature, seeds);
  const precedent = closestPrecedent(feature, courseCode);
  return {
    kind: 'structural-feature',
    feature,
    courseCode,
    language: targetLanguageBase(courseCode),
    description: f.description,
    firstSeeds: occurrences.slice(0, QUOTED_SEEDS),
    totalSeedsWithFeature: occurrences.length,
    precedents: precedent ? [{
      number: precedent.number, id: precedent.id, course: precedent.course, ruledBy: precedent.ruledBy, ruled: precedent.ruled,
      shape: precedent.shape, stages: precedent.stages, whatItDid: precedent.whatItDid, humanText: precedent.humanText, encodedIn: precedent.encodedIn,
    }] : [],
    recommendation: recommend(feature, precedent, occurrences),
    decidedBy: 'Kai, case by case, with the room — not the build agent',
    builderMustNot: 'choose the seeds or stages, write any learner-facing explanation, or generate phrases for this course until the ruling exists',
    raisedBy: 'services/course-builder/lib/structural-features.cjs',
    raisedAt: new Date().toISOString(),
  };
}

/** Seeds of a course, the three columns a flag quotes. */
async function loadCourseSeeds(supabase, courseCode) {
  const { data, error } = await supabase
    .from('course_seeds').select('seed_number, target_text, known_text')
    .eq('course_code', courseCode).order('seed_number', { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Put the flag in front of a human: one course_qa_flags row per course per
 * feature. A second raise while the first is still open returns the existing
 * row rather than a duplicate. A DB that does not yet admit the check_type
 * (the change file not applied) throws with the file named — the flag is
 * still in the caller's hands as an object, and the caller reports it.
 */
async function raiseStructuralFlag(supabase, flag) {
  const existing = await supabase
    .from('course_qa_flags').select('id, flagged_at')
    .eq('course_code', flag.courseCode).eq('check_type', STRUCTURAL_CHECK_TYPE).eq('status', 'open')
    .contains('details', { feature: flag.feature }).limit(1);
  if (existing.error) throw existing.error;
  if (existing.data && existing.data.length) return { raised: false, existing: existing.data[0] };

  const { data, error } = await supabase
    .from('course_qa_flags')
    .insert({
      course_code: flag.courseCode,
      seed_number: flag.firstSeeds[0] ? flag.firstSeeds[0].seed_number : null,
      check_type: STRUCTURAL_CHECK_TYPE,
      severity: 'error',
      issue: `${flag.feature}: how this is first shown to the learner needs Kai's ruling (${flag.totalSeedsWithFeature} seeds carry it; precedent: ${flag.precedents[0] ? flag.precedents[0].id : 'none'}). The build stopped here.`,
      details: flag,
    })
    .select().single();
  if (error) {
    if (error.code === '23514' || /check_type/.test(String(error.message))) {
      throw new Error(`course_qa_flags does not yet admit check_type '${STRUCTURAL_CHECK_TYPE}': apply ${CHECK_TYPE_CHANGE_FILE} (${error.message})`);
    }
    throw error;
  }
  return { raised: true, row: data };
}

module.exports = {
  STRUCTURAL_CHECK_TYPE, CHECK_TYPE_CHANGE_FILE, QUOTED_SEEDS,
  PRECEDENTS, FEATURES,
  targetLanguageBase, featuresFor, closestPrecedent, structuralStop, occurrencesInCourse,
  buildStructuralFlag, loadCourseSeeds, raiseStructuralFlag,
};
