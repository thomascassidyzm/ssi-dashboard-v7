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
import {
  SPLIT_EXCEPTION_SEED, TAUGHT_SEED, DOORS_OPEN_SEED, TAUGHT_VERB, CONTRAST_MIN_EACH,
  VERBS, separablePolicy, separableVerbsIn, checkSeparableContainment, phraseContainsLego,
  augmentVocabForSeparables, checkSeparableLegoShape, checkSeparableContrast, separableSection,
} from './separable-verbs.cjs';

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
  it('carries the lesson wording at seed 83 and the doors-open line from 92', () => {
    expect(separableSection(C, TAUGHT_SEED, { target_text: 'zustimmen', known_text: 'to agree' })).toMatch(/Often in German, you will hear some kinds of words split/);
    expect(separableSection(C, 300, { target_text: 'hinlegen' })).toMatch(/you already know quite a few words that can be split/);
    expect(separableSection(C, 300, { target_text: 'hinlegen' })).toMatch(/Never split for variety/);
  });
});
