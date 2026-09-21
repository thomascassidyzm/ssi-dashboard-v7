/**
 * Kai's deu_for_eng separable-verb ruling (2026-09-21) — the tests ARE the rule.
 *
 * Run: npx vitest run services/course-builder/lib/separable-verbs
 *
 * Calibration first (a detector that has not been shown a known split and a
 * known joined is a prefix counter, not a detector): seed 524 "Ich rufe dich in
 * drei oder vier Minuten zurück" must read SPLIT, seed 16 "er will später mit
 * allen anderen zurückkommen" must read JOINED, and the prefix-shaped words the
 * two censuses discarded must read as nothing.
 *
 * Then each clause of the ruling, keyed by seed position, against the gate
 * functions the routes actually call. The pre-fix gate — exact word
 * containment — is asserted alongside as the CONTROL, so the file states both
 * what changed and what it changed from.
 */
import { describe, it, expect } from 'vitest';
import { checkWordContainment } from './text-normalization.cjs';
import * as SV from './separable-verbs.cjs';
import {
  SPLIT_EXCEPTION_SEED, TAUGHT_SEED, DOORS_OPEN_SEED, TAUGHT_VERB, CONTRAST_MIN_EACH,
  VERBS, separablePolicy, separableVerbsIn, checkSeparableContainment, phraseContainsLego,
  augmentVocabForSeparables, checkSeparableLegoShape, checkSeparableContrast, separableSection,
  HUMAN_AUTHORED_TEXT, EXPLANATION_SEEDS, NO_EXPLANATION_LINE, separableTilingPieces,
} from './separable-verbs.cjs';
import { checkTiling } from './validation.cjs';
import { checkBuildUsePhrases } from './phrase-structure.cjs';
import {
  STRUCTURAL_CHECK_TYPE, CHECK_TYPE_CHANGE_FILE, QUOTED_SEEDS, PRECEDENTS, FEATURES,
  featuresFor, closestPrecedent, structuralStop, buildStructuralFlag, raiseStructuralFlag,
} from './structural-features.cjs';
import { readFileSync } from 'node:fs';

const C = 'deu_for_eng';
const shapes = (t) => separableVerbsIn(t).map(v => `${v.lemma}:${v.realisation}`);

describe('calibration — the detector on cases whose answer is known', () => {
  it('seed 524 reads SPLIT (rufe … zurück)', () => {
    expect(shapes('Ich rufe dich in drei oder vier Minuten zurück')).toEqual(['zurückrufen:split']);
  });
  it('seed 16 reads JOINED (zurückkommen)', () => {
    expect(shapes('er will später mit allen anderen zurückkommen')).toEqual(['zurückkommen:joined']);
  });
  it('seed 42 reads SPLIT with a zero gap (fing an)', () => {
    expect(shapes('Ich fing an, mich besser zu fühlen als letzte Nacht')).toEqual(['anfangen:split']);
  });
  it('seed 122 reads BOTH (fängt an + anzufühlen)', () => {
    expect(shapes('es fängt an, sich leichter anzufühlen, und ich bin aufgeregt darüber, wie es läuft'))
      .toEqual(['anfangen:split', 'anfühlen:joined']);
  });
  it('seed 496: a prefix followed by "zu" is still clause-final (habe … vor zu verlieren)', () => {
    expect(shapes('Ich habe nicht vor zu verlieren, wenn es wirklich darauf ankommt')).toEqual(['vorhaben:split', 'ankommen:joined']);
  });
  it('the joined shapes: finite, infinitive, zu-infinitive, participle', () => {
    expect(shapes('bevor du anfängst')).toEqual(['anfangen:joined']);
    expect(shapes('dich anzurufen')).toEqual(['anrufen:joined']);
    expect(shapes('hast du ihr zugestimmt?')).toEqual(['zustimmen:joined']);
    expect(shapes('man lernt jemanden sehr gut kennen, wenn man zusammen arbeitet')).toEqual(['kennenlernen:split']);
  });
  it('does NOT fire on prefix-shaped non-verbs the censuses discarded', () => {
    for (const t of [
      'ich will mein Geld zurück',                 // bare adverb, no verb (seed 248)
      'ja, ich habe sie vor einer Weile im Büro gesehen', // "vor" the preposition (seed 184)
      'ich warte auf dich',                        // "auf" the preposition
      'mit allen anderen', 'die Antwort', 'ich bin sehr zufrieden damit', 'aufgeregt', 'einfach',
      'mitten in der Nacht', 'nachdem wir fertig sind', 'heute Nachmittag', 'zusammen',
      'ich gehe zu dir',
    ]) expect(shapes(t), t).toEqual([]);
  });
  it('every VERBS entry parses as prefix + stem (the lexicon is self-checking)', () => {
    expect(VERBS.length).toBeGreaterThan(40);
    for (const v of VERBS) expect(shapes(v), v).toEqual([`${v}:joined`]);
  });
});

describe('policy — clauses 1, 2, 3, 6, 7 keyed by seed', () => {
  it('is off for every other course, including other German-target courses', () => {
    expect(separablePolicy('deu_for_jpn', 200).applies).toBe(false);
    expect(separablePolicy('spa_for_eng', 200).applies).toBe(false);
    expect(separablePolicy('deu_for_eng_v2', 200).applies).toBe(true);
  });
  it('before the taught seed: the LEGO shape only (clause 1), seed 42 flagged as the exception (clause 2)', () => {
    expect(separablePolicy(C, 16).mode).toBe('lego-shape');
    expect(separablePolicy(C, SPLIT_EXCEPTION_SEED)).toMatchObject({ mode: 'lego-shape', splitException: true });
    expect(separablePolicy(C, 82).mode).toBe('lego-shape');
  });
  it('seed 83 admits both with the contrast floor (clauses 3, 4); 84–91 free the taught verb only (clause 5)', () => {
    expect(separablePolicy(C, TAUGHT_SEED)).toMatchObject({ mode: 'both', contrastRequired: true, freeVerbs: [TAUGHT_VERB] });
    expect(separablePolicy(C, 84)).toMatchObject({ mode: 'taught-verb', freeVerbs: [TAUGHT_VERB] });
    expect(separablePolicy(C, 91).mode).toBe('taught-verb');
  });
  it('from seed 92 everything is free (clauses 6, 7)', () => {
    expect(separablePolicy(C, DOORS_OPEN_SEED)).toMatchObject({ mode: 'free', freeVerbs: 'all' });
    expect(separablePolicy(C, 668).mode).toBe('free');
  });
});

describe('containment gate — what the rule admits that the old gate did not, and only where', () => {
  const admit = (seed, lego, phrase) => phraseContainsLego({ courseCode: C, seedNumber: seed, legoTarget: lego, phraseTarget: phrase });

  it('CONTROL: the pre-fix gate rejects every split of a joined LEGO', () => {
    expect(checkWordContainment('zurückrufen', 'ich rufe dich morgen zurück')).toBe(false);
    expect(checkWordContainment('hinlegen', 'ich lege mich im Garten hin')).toBe(false);
  });
  it('seed 16 (before the lesson): joined only — a split is REJECTED', () => {
    expect(admit(16, 'zurückkommen', 'er will morgen zurückkommen')).toBe(true);
    expect(admit(16, 'zurückkommen', 'er kommt morgen zurück')).toBe(false);
    const v = checkSeparableContainment({ courseCode: C, seedNumber: 16, legoTarget: 'zurückkommen', phraseTarget: 'er kommt morgen zurück' });
    expect(v.reason).toMatch(/split here but at seed 16 only joined/);
  });
  it('seed 42: "fing an" stays split, exactly — joined "anfangen" is REJECTED, and so is another split form', () => {
    expect(admit(42, 'fing an', 'ich fing an, mich besser zu fühlen')).toBe(true);
    expect(admit(42, 'fing an', 'ich will anfangen')).toBe(false);
    expect(admit(42, 'fing an', 'es fängt an')).toBe(false);
  });
  it('seed 83: the taught verb is admitted split AND joined', () => {
    expect(admit(83, 'zustimmen', 'ich stimme dem zu')).toBe(true);
    expect(admit(83, 'zustimmen', 'ich will dem zustimmen')).toBe(true);
    expect(admit(83, 'zustimmen', 'ich stimme nicht zu')).toBe(true);
    // the LEGO as it stands today (split, multi-word): joined is admitted, its other words still required
    expect(admit(83, 'ich stimme dem zu', 'ich will dem zustimmen')).toBe(true);
    expect(admit(83, 'ich stimme dem zu', 'kannst du dem zustimmen?')).toBe(false);
  });
  it('seeds 84–91: only the taught verb is free; every other LEGO keeps its shape', () => {
    expect(admit(88, 'aufhören', 'ich höre jetzt auf')).toBe(false);
    expect(admit(88, 'aufhören', 'ich will jetzt aufhören')).toBe(true);
  });
  it('seed 92 onward: split or joined, freely — including seed 42\'s verb (clause 7)', () => {
    expect(admit(524, 'rufe zurück', 'ich rufe dich morgen zurück')).toBe(true);
    expect(admit(524, 'rufe zurück', 'ich will dich morgen zurückrufen')).toBe(true);
    expect(admit(595, 'hinlegen', 'ich lege mich im Garten hin')).toBe(true);
    expect(admit(595, 'hinlegen', 'ich muss mich hinlegen')).toBe(true);
    expect(admit(200, 'anfangen', 'ich fange jetzt an')).toBe(true);
    expect(admit(200, 'anfangen', 'wann fängst du an?')).toBe(true);
  });
  it('never admits a phrase that lacks the verb altogether', () => {
    expect(admit(524, 'rufe zurück', 'ich rufe dich morgen')).toBe(false);
    expect(admit(595, 'hinlegen', 'ich lege mich im Garten')).toBe(false);
  });
  it('never refuses a phrase the old exact gate admitted (the ruling only adds admissions)', () => {
    // live seed-122 USE phrase: no comma before the infinitive clause, so "an" is not clause-final to the reader
    expect(checkWordContainment('es fängt an', 'Es fängt an so viel besser zu funktionieren')).toBe(true);
    expect(admit(122, 'es fängt an', 'Es fängt an so viel besser zu funktionieren')).toBe(true);
    expect(admit(288, 'sehen gern fern', 'Sie sehen gern fern zusammen')).toBe(true);
  });
  it('is byte-for-byte the old gate for a LEGO without a separable verb, and for other courses', () => {
    for (const [lego, phrase] of [['letzte Nacht', 'ich habe letzte Nacht gut geschlafen'], ['letzte Nacht', 'gestern Nacht']]) {
      expect(admit(300, lego, phrase)).toBe(checkWordContainment(lego, phrase));
    }
    expect(phraseContainsLego({ courseCode: 'deu_for_jpn', seedNumber: 524, legoTarget: 'zurückrufen', phraseTarget: 'ich rufe dich zurück' })).toBe(false);
  });
});

describe('vocabulary gate — the pieces the learner has heard', () => {
  const heard = ['ich', 'komme', 'dich', 'morgen', 'zurückkommen', 'kommt', 'ich bin aufgewacht', 'rufe zurück'];
  it('before seed 92 nothing is derived', () => {
    expect([...augmentVocabForSeparables(new Set(heard), C, 60)].sort()).toEqual([...heard].sort());
  });
  it('from seed 92: prefix and rest of each heard joined form, the joined form of heard finite pieces, no split of a participle', () => {
    const out = augmentVocabForSeparables(new Set(heard), C, 300);
    for (const w of ['zurück', 'kommen', 'zurückkomme', 'zurückkommt', 'auf', 'rufe', 'zurückrufe']) expect(out.has(w), w).toBe(true);
    expect(out.has('gewacht')).toBe(false);   // "ich bin aufgewacht" yields only its prefix
    expect(out.has('wache')).toBe(false);     // never heard
  });
  it('seed 83: the taught verb is heard joined and its seed carries the finite form', () => {
    const out = augmentVocabForSeparables(new Set(['ich', 'dem', 'zu', 'was', 'zustimmen']), C, TAUGHT_SEED,
      { extraTexts: ['Ich stimme dem zu, was du über deinen Freund gesagt hast'] });
    for (const w of ['stimme', 'zu', 'stimmen', 'zustimmen', 'zustimme']) expect(out.has(w), w).toBe(true);
    expect(out.has('stimmst')).toBe(false);   // not heard
  });
  it('never mutates the caller\'s set and returns the same members for another course', () => {
    const set = new Set(heard);
    const out = augmentVocabForSeparables(set, 'deu_for_jpn', 300);
    expect(set.size).toBe(heard.length);
    expect(out.size).toBe(heard.length);
  });
});

describe('clause 4 — the contrast floor at the taught seed', () => {
  const ph = (...ts) => ts.map(target => ({ target }));
  it('passes with both shapes present at least CONTRAST_MIN_EACH times', () => {
    const r = checkSeparableContrast(C, TAUGHT_SEED, 'zustimmen',
      ph('ich stimme zu', 'ich stimme dem zu', 'ich will dem zustimmen', 'kannst du dem zustimmen?'));
    expect(r).toMatchObject({ checked: true, pass: true, split: 2, joined: 2, required: CONTRAST_MIN_EACH });
  });
  it('fails a set that only ever splits — the live seed-83 basket today', () => {
    const r = checkSeparableContrast(C, TAUGHT_SEED, 'ich stimme dem zu', ph('ich stimme dem zu, was du gesagt hast', 'ich stimme dem zu'));
    expect(r).toMatchObject({ checked: true, pass: false, joined: 0 });
  });
  it('is not checked anywhere else', () => {
    expect(checkSeparableContrast(C, 84, 'über meinen Freund', ph('x')).checked).toBe(false);
    expect(checkSeparableContrast(C, 524, 'rufe zurück', ph('x')).checked).toBe(false);
  });
});

describe('clause 8 — a separable-verb LEGO is introduced joined', () => {
  it('flags a split LEGO anywhere but seed 42', () => {
    expect(checkSeparableLegoShape(C, 524, 'rufe zurück')).toMatchObject({ verbs: ['zurückrufen'] });
    expect(checkSeparableLegoShape(C, 42, 'fing an')).toBeNull();
    expect(checkSeparableLegoShape(C, 16, 'zurückkommen')).toBeNull();
    expect(checkSeparableLegoShape('deu_for_jpn', 524, 'rufe zurück')).toBeNull();
  });
});

describe('the prompt says what the gate checks', () => {
  it('is empty off-course and for a plain LEGO before the doors open', () => {
    expect(separableSection('spa_for_eng', 524, { target_text: 'llamar' })).toBe('');
    expect(separableSection(C, 30, { target_text: 'letzte Nacht' })).toBe('');
  });
  it('tells a pre-lesson basket to keep the verb joined, and seed 42 to keep it split', () => {
    expect(separableSection(C, 16, { target_text: 'zurückkommen' })).toMatch(/JOINED, exactly as the LEGO writes it/);
    expect(separableSection(C, 42, { target_text: 'fing an' })).toMatch(/Keep it SPLIT exactly/);
  });
  it('still says a human has written the line at 83, and keeps the consistency rule from 92', () => {
    expect(separableSection(C, TAUGHT_SEED, { target_text: 'zustimmen', known_text: 'to agree' })).toMatch(/A human has written the one-line explanation/);
    expect(separableSection(C, 300, { target_text: 'hinlegen' })).toMatch(/human-written line/);
    expect(separableSection(C, 300, { target_text: 'hinlegen' })).toMatch(/Never split for variety/);
  });
});

// ─── Kai, 2026-09-21 (job #491): the build agent does not write explanations ──

// tolerant of the pre-#491 module so the fail-without run counts failures rather than crashing at load
const HUMAN_LINES = Object.values(HUMAN_AUTHORED_TEXT?.bySeed || {}).map(t => t.text);
const PROMPT_CASES = [
  [16, { target_text: 'zurückkommen' }], [SPLIT_EXCEPTION_SEED, { target_text: 'fing an' }],
  [TAUGHT_SEED, { target_text: 'zustimmen', known_text: 'to agree' }], [88, { target_text: 'aufhören' }],
  [DOORS_OPEN_SEED, { target_text: 'anrufen' }], [300, { target_text: 'hinlegen' }], [300, { target_text: 'letzte Nacht' }],
];

describe('the prompt never carries learner-facing text (Kai: "the build agent shouldn\'t be writing explanations")', () => {
  it('quotes neither of Kai\'s two lines, nor any fragment of them, in any mode', () => {
    for (const [seed, lego] of PROMPT_CASES) {
      const section = separableSection(C, seed, lego);
      for (const line of HUMAN_LINES) {
        expect(section, `seed ${seed}`).not.toContain(line);
        // a fragment is as bad as the whole: the two distinctive clauses
        expect(section, `seed ${seed}`).not.toMatch(/split into two pieces|throwing those into the mix/);
      }
    }
  });
  it('tells the model, in every non-empty section, that it writes phrases only and never an explanation', () => {
    for (const [seed, lego] of PROMPT_CASES) {
      const section = separableSection(C, seed, lego);
      if (section === '') continue;
      expect(section, `seed ${seed}`).toContain(NO_EXPLANATION_LINE);
    }
    expect(NO_EXPLANATION_LINE).toMatch(/a human writes that/);
  });
  it('the policy records WHERE a line is needed (83 and 92) and never the text', () => {
    expect(EXPLANATION_SEEDS).toEqual([TAUGHT_SEED, DOORS_OPEN_SEED]);
    expect(separablePolicy(C, TAUGHT_SEED).explanationNeeded).toBe(true);
    expect(separablePolicy(C, DOORS_OPEN_SEED).explanationNeeded).toBe(true);
    for (const seed of [16, 42, 84, 91, 93, 300]) expect(separablePolicy(C, seed).explanationNeeded, `seed ${seed}`).toBe(false);
    for (const seed of [TAUGHT_SEED, DOORS_OPEN_SEED]) {
      for (const v of Object.values(separablePolicy(C, seed))) expect(String(v)).not.toMatch(/split into two pieces|throwing those into the mix/);
    }
  });
  it('holds Kai\'s two wordings as a frozen record for deu_for_eng, keyed by seed, applied by a human', () => {
    expect(HUMAN_AUTHORED_TEXT).toMatchObject({ author: 'Kai', ruled: '2026-09-21', course: 'deu_for_eng' });
    expect(HUMAN_AUTHORED_TEXT.appliedBy).toMatch(/human/);
    expect(Object.keys(HUMAN_AUTHORED_TEXT.bySeed).map(Number)).toEqual([TAUGHT_SEED, DOORS_OPEN_SEED]);
    expect(HUMAN_AUTHORED_TEXT.bySeed[TAUGHT_SEED].text).toMatch(/^Often in German, you will hear some kinds of words split into two pieces/);
    expect(HUMAN_AUTHORED_TEXT.bySeed[DOORS_OPEN_SEED].text).toMatch(/throwing those into the mix from now on\.$/);
    expect(Object.isFrozen(HUMAN_AUTHORED_TEXT.bySeed)).toBe(true);
  });
  it('the old prompt-facing constants are gone, so nothing can import the text into a prompt by its old name', () => {
    expect(SV.LESSON_TEXT_TAUGHT_SEED).toBeUndefined();
    expect(SV.DOORS_OPEN_TEXT).toBeUndefined();
  });
});

// ─── The flag path: an unruled course STOPS and asks, citing the precedent ──

const SEEDS = [
  { seed_number: 83, target_text: 'Ich stimme dem zu, was du über deinen Freund gesagt hast', known_text: 'I agree with what you said about your friend' },
  { seed_number: 5, target_text: 'ich bin müde', known_text: 'I am tired' },
  { seed_number: 42, target_text: 'Ich fing an, mich besser zu fühlen als letzte Nacht', known_text: 'I was starting to feel better than last night' },
  { seed_number: 16, target_text: 'er will später mit allen anderen zurückkommen', known_text: 'he wants to come back later with everyone else' },
  { seed_number: 67, target_text: 'ich will aufhören', known_text: 'I want to stop' },
  { seed_number: 122, target_text: 'es fängt an, sich leichter anzufühlen', known_text: 'it is starting to feel easier' },
  { seed_number: 200, target_text: 'wann fängst du an?', known_text: 'when do you start?' },
  { seed_number: 524, target_text: 'Ich rufe dich in drei oder vier Minuten zurück', known_text: 'I will call you back in three or four minutes' },
];
const UNRULED = ['deu_at_for_eng', 'deu_ch_for_eng', 'deu_for_cym', 'deu_for_jpn', 'deu_for_zho'];

describe('precedents — the German ruling is #1, in a shape the next language is compared against', () => {
  it('precedent #1 is deu_for_eng separable verbs, Kai, 2026-09-21, with its stages at 42 / 83 / 92', () => {
    const p = PRECEDENTS[0];
    expect(p).toMatchObject({ number: 1, feature: 'separable-verbs', language: 'deu', course: 'deu_for_eng', ruledBy: 'Kai', ruled: '2026-09-21' });
    expect(p.stages.map(s => s.seed)).toEqual([SPLIT_EXCEPTION_SEED, TAUGHT_SEED, TAUGHT_SEED + 1, DOORS_OPEN_SEED]);
    expect(p.whatItDid.length).toBeGreaterThanOrEqual(4);
    expect(p.humanText).toEqual(HUMAN_AUTHORED_TEXT);
  });
  it('closestPrecedent matches feature then language, and returns null for a feature never ruled on', () => {
    expect(closestPrecedent('separable-verbs', 'deu_at_for_eng').number).toBe(1);
    expect(closestPrecedent('separable-verbs', 'nld_for_eng').number).toBe(1); // same feature, other language: still the closest
    expect(closestPrecedent('noun-classes', 'swa_for_eng')).toBeNull();
  });
  it('the feature reader covers German only, so a Spanish course sees no feature and a German one sees separable verbs', () => {
    expect(featuresFor('spa_for_eng')).toEqual([]);
    for (const c of UNRULED) expect(featuresFor(c), c).toEqual(['separable-verbs']);
    expect(FEATURES['separable-verbs'].description).toMatch(/prefix detaches/);
  });
});

describe('structuralStop — the builder stops for an unruled course and never for a ruled one', () => {
  it('stops every unruled German-target course whose LEGO or seed carries a separable verb', () => {
    for (const c of UNRULED) {
      expect(structuralStop(c, { target_text: 'zurückkommen' }, null), c).toMatchObject({ feature: 'separable-verbs' });
      expect(structuralStop(c, { target_text: 'später' }, { target_text: 'er will später zurückkommen' }), `${c} seed-only`).toMatchObject({ feature: 'separable-verbs' });
    }
  });
  it('does not stop deu_for_eng (ruled), a plain German LEGO and seed, or another language', () => {
    expect(structuralStop(C, { target_text: 'zurückkommen' }, SEEDS[3])).toBeNull();
    expect(structuralStop('deu_for_jpn', { target_text: 'letzte Nacht' }, { target_text: 'ich habe letzte Nacht gut geschlafen' })).toBeNull();
    expect(structuralStop('spa_for_eng', { target_text: 'llamar' }, { target_text: 'quiero llamar' })).toBeNull();
  });
});

describe('the flag carries the four things Kai asked for', () => {
  const flag = buildStructuralFlag('deu_for_jpn', 'separable-verbs', SEEDS);
  it('(a) the feature in plain English', () => {
    expect(flag).toMatchObject({ kind: 'structural-feature', feature: 'separable-verbs', courseCode: 'deu_for_jpn', language: 'deu' });
    expect(flag.description).toMatch(/^Separable verbs: /);
  });
  it('(b) the first seeds, quoted in full, target and known, in seed order, capped at QUOTED_SEEDS with the total counted', () => {
    expect(flag.firstSeeds.map(s => s.seed_number)).toEqual([16, 42, 67, 83, 122, 200]);
    expect(flag.firstSeeds.length).toBe(QUOTED_SEEDS);
    expect(flag.totalSeedsWithFeature).toBe(7);
    expect(flag.firstSeeds[1]).toEqual({ seed_number: 42, target: SEEDS[2].target_text, known: SEEDS[2].known_text, shapes: ['anfangen:split'] });
  });
  it('(c) the closest prior ruling and what it did', () => {
    expect(flag.precedents).toHaveLength(1);
    expect(flag.precedents[0]).toMatchObject({ number: 1, course: 'deu_for_eng', ruledBy: 'Kai' });
    expect(flag.precedents[0].whatItDid.join(' ')).toMatch(/introduced joined/i);
  });
  it('(d) a recommendation drawn from the precedent that names this course\'s candidate seeds and decides nothing', () => {
    expect(flag.recommendation).toMatch(/precedent #1/);
    expect(flag.recommendation).toMatch(/Seed 42 is the first seed whose sentence is itself split/);
    expect(flag.recommendation).toMatch(/Seed 83 is the next split sentence/);
    expect(flag.recommendation).toMatch(/until Kai has ruled/);
    expect(flag.decidedBy).toMatch(/Kai/);
  });
  it('composes no learner-facing text anywhere the builder could read it back', () => {
    for (const field of [flag.description, flag.recommendation, flag.builderMustNot]) {
      expect(field).not.toMatch(/split into two pieces|throwing those into the mix/);
    }
  });
  it('with no precedent the flag says so instead of inventing one', () => {
    const none = { ...flag, precedents: [] };
    expect(none.precedents).toEqual([]);
    expect(closestPrecedent('separable-verbs', 'deu_for_jpn')).not.toBeNull();
  });
});

/** A chainable fake of the two Supabase calls raiseStructuralFlag makes. */
function fakeSupabase({ open = [], insertError = null } = {}) {
  const inserted = [];
  const q = (result) => {
    const chain = new Proxy({}, { get: (_, k) => k === 'then' ? (res, rej) => Promise.resolve(result).then(res, rej) : () => chain });
    return chain;
  };
  return {
    inserted,
    from: (table) => ({
      select: () => q({ data: open, error: null }),
      insert: (row) => { inserted.push({ table, row }); return q(insertError ? { data: null, error: insertError } : { data: { id: 'flag-1', ...row }, error: null }); },
    }),
  };
}

describe('raiseStructuralFlag — one course_qa_flags row, the repo\'s existing human-review mechanism', () => {
  const flag = buildStructuralFlag('deu_for_zho', 'separable-verbs', SEEDS);
  it('inserts one row: check_type structural_feature, severity error, the flag as details, the first seed as seed_number', async () => {
    const sb = fakeSupabase();
    const r = await raiseStructuralFlag(sb, flag);
    expect(r.raised).toBe(true);
    expect(sb.inserted).toHaveLength(1);
    expect(sb.inserted[0]).toMatchObject({ table: 'course_qa_flags', row: { course_code: 'deu_for_zho', check_type: STRUCTURAL_CHECK_TYPE, severity: 'error', seed_number: 16 } });
    expect(sb.inserted[0].row.details).toBe(flag);
    expect(sb.inserted[0].row.issue).toMatch(/needs Kai's ruling/);
  });
  it('does not duplicate an open flag for the same course and feature', async () => {
    const sb = fakeSupabase({ open: [{ id: 'already', flagged_at: 'x' }] });
    const r = await raiseStructuralFlag(sb, flag);
    expect(r).toMatchObject({ raised: false, existing: { id: 'already' } });
    expect(sb.inserted).toHaveLength(0);
  });
  it('throws LOUDLY, naming the change file, when the DB does not yet admit the check_type', async () => {
    const sb = fakeSupabase({ insertError: { code: '23514', message: 'violates check constraint "course_qa_flags_check_type_check"' } });
    await expect(raiseStructuralFlag(sb, flag)).rejects.toThrow(CHECK_TYPE_CHANGE_FILE);
  });
});

describe('the v3 door stops before the model is called', () => {
  it('phrase-generation.cjs consults structuralStop before its first claudeChat call and returns blocked with the flag', () => {
    const src = readFileSync(new URL('./phrase-generation.cjs', import.meta.url), 'utf8');
    const stopAt = src.indexOf('structuralStop(courseCode, lego, seed)');
    const modelAt = src.indexOf('await claudeChat(');
    expect(stopAt).toBeGreaterThan(-1);
    expect(modelAt).toBeGreaterThan(stopAt);
    expect(src.slice(stopAt, modelAt)).toMatch(/blocked: true, stoppedFor: flag/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE TILING GATE (job #497, applying Kai's clause 3 to the live seed-83 LEGO).
//
// Clause 3 says seed 83 introduces the verb JOINED. The seed sentence realises
// it SPLIT. checkTiling asks "is every word of the seed covered by its LEGOs?",
// so the moment S0083L01 becomes "zustimmen" the words "stimme" and "zu" are
// untiled and the gate refuses the very seed the ruling is for. These assertions
// fail against the pre-#497 checkTiling (no opts argument, no derived pieces)
// and pass after it — run both ways before believing them.
// ─────────────────────────────────────────────────────────────────────────────
describe('tiling — a joined LEGO tiles its own split seed, but only where the policy says so', () => {
  const SEED_83 = 'Ich stimme dem zu, was du über deinen Freund gesagt hast';
  // Everything seed 83 needs except the verb, as prior vocabulary.
  const prior = ['ich', 'dem', 'was', 'du', 'gesagt', 'hast'];
  const legos = [{ target: 'zustimmen', type: 'A' }, { target: 'über deinen Freund', type: 'A' }];

  it('seed 83 tiles from the JOINED lego, because the split pieces are derived', () => {
    const r = checkTiling(SEED_83, legos, C, prior, { seedNumber: 83 });
    expect(r).toEqual({ valid: true });
  });

  it('the derived pieces are the prefix, the lemma and the stem\'s finite forms', () => {
    const pieces = separableTilingPieces(C, 83, ['zustimmen']);
    expect(pieces.has('zu')).toBe(true);
    expect(pieces.has('stimme')).toBe(true);
    expect(pieces.has('stimmt')).toBe(true);
    expect(pieces.has('zustimmen')).toBe(true);
  });

  it('WITHOUT a seed number the old behaviour stands — the caller opted out', () => {
    const r = checkTiling(SEED_83, legos, C, prior);
    expect(r.valid).toBe(false);
    expect(r.untiled).toContain('stimme');
  });

  it('a seed the ruling has NOT reached lends nothing: same LEGO at seed 60 still fails', () => {
    expect([...separableTilingPieces(C, 60, ['zustimmen'])]).toEqual([]);
    expect(checkTiling(SEED_83, legos, C, prior, { seedNumber: 60 }).valid).toBe(false);
  });

  it('another German-target course is untouched — no ruling, no pieces', () => {
    expect([...separableTilingPieces('deu_for_spa', 83, ['zustimmen'])]).toEqual([]);
  });

  it('only the verbs the policy frees: at seed 83 that is zustimmen alone', () => {
    expect([...separableTilingPieces(C, 83, ['zurückrufen'])]).toEqual([]);
    expect(separableTilingPieces(C, 92, ['zurückrufen']).has('zurück')).toBe(true);
  });
});

describe('a relative clause opener ends the clause, so the prefix in front of it is split', () => {
  // Live rows S0083L01U01 / U06 drop the comma German requires before "was".
  // Without the opener list the prefix reads as mid-clause and the split is
  // invisible to the gate — the two phrases would fail containment under the
  // reshaped LEGO even though they are the drilling the ruling asks for.
  it('"ich stimme dem zu was du gesagt hast" reads SPLIT', () => {
    expect(shapes('Ich stimme dem zu was du gestern darüber gesagt hast')).toEqual(['zustimmen:split']);
  });
  it('and so does the comma-ed form it should have been', () => {
    expect(shapes('Ich stimme dem zu, was du gestern darüber gesagt hast')).toEqual(['zustimmen:split']);
  });
  it('an ARTICLE after a prefix is still not a clause end — "an der Ecke" stays silent', () => {
    expect(shapes('wir biegen an der Ecke links ab')).toEqual(['abbiegen:split']);
    expect(shapes('ich denke an der Ecke')).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE FLOOR COUNTER (job #497). checkBuildUsePhrases decides what IS a BUILD or
// USE phrase by asking whether it contains the LEGO — its own containment test,
// separate from the gate's. Without the same admission, every split phrase at
// the taught seed is counted as a "component phrase" and excluded, so the basket
// the ruling asks for fails its own 3-BUILD floor. Red before #497, green after.
// ─────────────────────────────────────────────────────────────────────────────
describe('phrase-count floors count a split realisation as a real BUILD phrase', () => {
  const basket = {
    idx: 1, type: 'A', known: 'to agree', target: 'zustimmen',
    build: [
      { known: 'I agree', target: 'ich stimme zu' },
      { known: "I don't agree", target: 'ich stimme nicht zu' },
      { known: 'I want to agree', target: 'ich will zustimmen' },
    ],
    use: [
      { known: 'I agree with you', target: 'Ich stimme dir zu' },
      { known: "I don't agree with you", target: 'Ich stimme dir nicht zu' },
      { known: 'I think I agree with you', target: 'Ich denke, ich stimme dir zu' },
      { known: 'I want to agree with you', target: 'Ich will dir zustimmen' },
      { known: 'I can agree with you today', target: 'Ich kann dir heute zustimmen' },
    ],
  };
  it('at seed 83 the split phrases count: 3 BUILD, 5 USE, no components', () => {
    const r = checkBuildUsePhrases(basket, C, TAUGHT_SEED);
    expect(r.valid).toBe(true);
    expect(r.details).toMatchObject({ build: 3, use: 5, components: 0 });
  });
  it('at a seed the ruling has not reached they are excluded, exactly as before', () => {
    const r = checkBuildUsePhrases(basket, C, 60);
    expect(r.valid).toBe(false);
    expect(r.details.components).toBe(5);
  });
});
