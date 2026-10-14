// The practice-phrase vocabulary rule for EVERY language (Aran, methodology lead, confirmed by
// Tom, 2026-10-13; job #587): any word taught earlier may be used, even one met only inside a
// bigger chunk; an exact other form is still new (Tom 2026-10-09: "we hoped" vs "to hope").
// Welsh keeps its own soft-mutation folding; no-space scripts keep whole-chunk tiling.
//
// Run: npx vitest run services/course-builder/lib/taught-words
import { describe, it, expect } from 'vitest'

const { checkVocabViolations } = require('./validation.cjs');
const { exactFormCheck } = require('../../../tools/frame-layer/v4/exact-form.cjs');
const { wordLevelApplies, tokensOf, piecesOf, vocabRulePrompt } = require('./taught-words.cjs');

const vocab = (course, taught, target) => checkVocabViolations([{ target }], new Set(taught), course, { seedNumber: 300 });

describe('English: a word met only inside a chunk is taught', () => {
  const E = 'eng_for_spa';
  const taught = ['to find out', 'I want', 'the truth', 'it'];
  it('"find" may be used after "to find out" (builder gate and v4 exact-form)', () => {
    expect(vocab(E, taught, 'I want to find it')).toEqual([]);
    expect(exactFormCheck('I want to find it', taught, { courseCode: E }).ok).toBe(true);
  });
  it('"out" too, in another meaning', () => {
    expect(vocab(E, taught, 'I want it out')).toEqual([]);
  });
  it('"hope" is not taught by "we hoped", nor "hoped" by "to hope"', () => {
    expect(vocab(E, ['we hoped', 'it'], 'we hope it')).toEqual([{ phrase: 'we hope it', unknown: 'hope' }]);
    expect(exactFormCheck('we hope it', ['we hoped', 'it'], { courseCode: E }).offending).toEqual(['hope']);
    expect(exactFormCheck('we hoped to sell it', ['we', 'to sell it', 'to hope'], { courseCode: E }).offending).toEqual(['hoped']);
  });
  it('a contraction is its own form: "it\'s" is not "it" + "let\'s"', () => {
    expect(vocab(E, ['it', "let's go"], "it's")).toHaveLength(1);
    expect(vocab(E, ["it's late", 'here'], "it's here")).toEqual([]);
  });
});

describe('elision and hyphens', () => {
  it('French l\' / j\' split from their word; an untaught conjugation is still named', () => {
    const F = 'fra_for_eng';
    expect(tokensOf("J’espère que l’ami viendra.")).toEqual(["j'espère", 'que', "l'ami", 'viendra']);
    expect(piecesOf("l'ami", 'fra')).toEqual(["l'", 'ami']);
    expect(vocab(F, ["l'eau", 'un ami', 'je vois'], "je vois l'ami")).toEqual([]);
    expect(exactFormCheck("j'espérais", ["j'aime", 'espérer'], { courseCode: F }).offending).toEqual(['espérais']);
    expect(exactFormCheck("j'espère", ["j'espere"], { courseCode: F }).ok).toBe(false); // accents not folded
  });
  it('Italian dell\' splits; "po\'" keeps its apostrophe', () => {
    const I = 'ita_for_eng';
    expect(piecesOf("dell'acqua", 'ita')).toEqual(["dell'", 'acqua']);
    expect(vocab(I, ["dell'uomo", "l'acqua", 'un bicchiere'], "un bicchiere dell'acqua")).toEqual([]);
    expect(tokensOf("un po'")).toEqual(['un', "po'"]);
  });
  it('English keeps the apostrophe inside its word (no elision split)', () => {
    expect(piecesOf("don't", 'eng')).toEqual(["don't"]);
  });
  it('a hyphenated token is taught when every part is', () => {
    expect(vocab('fra_for_eng', ['il peut', 'être là'], 'peut-être')).toEqual([]);
    expect(vocab('fra_for_eng', ['il peut'], 'peut-être')).toEqual([{ phrase: 'peut-être', unknown: 'être' }]);
  });
});

describe('Spanish: the rule applies, with no mutation folding', () => {
  it('a chunk-internal word passes; a form never met fails', () => {
    const S = 'spa_for_eng';
    expect(vocab(S, ['quiero saber', 'la verdad'], 'saber la verdad')).toEqual([]);
    expect(vocab(S, ['quiero saber', 'la verdad'], 'quería saber la verdad')).toEqual([{ phrase: 'quería saber la verdad', unknown: 'quería' }]);
    expect(vocab(S, ['cael'], 'gael')).toHaveLength(1);
  });
});

describe('scripts without spaces keep the whole-chunk behaviour', () => {
  it('Chinese is untouched', () => {
    expect(wordLevelApplies('zho_for_eng')).toBe(false);
    expect(wordLevelApplies('jpn_for_eng')).toBe(false);
    expect(vocab('zho_for_eng', ['我想', '去'], '我想去')).toEqual([]);
    expect(vocab('zho_for_eng', ['我想', '去'], '我要去')).toHaveLength(1);
    expect(vocab('zho_for_eng', ['我想去北京'], '想去')).toHaveLength(1); // chunk-internal: still NOT licensed here
    expect(exactFormCheck('想', ['我想'], { courseCode: 'zho_for_eng', noSpace: true }).ok).toBe(false);
    expect(vocabRulePrompt('zho_for_eng')).toBe('');
  });
});

describe('generator prompt', () => {
  it('every space-separated course gets the rule; the soft-mutation note is Welsh only', () => {
    expect(vocabRulePrompt('spa_for_eng')).toMatch(/ANY Spanish word taught earlier/);
    expect(vocabRulePrompt('spa_for_eng')).toMatch(/to find out/);
    expect(vocabRulePrompt('spa_for_eng')).not.toMatch(/mutat|Welsh/);
    expect(vocabRulePrompt('cym_sv2_for_eng')).toMatch(/ANY Welsh word taught earlier/);
    expect(vocabRulePrompt('cym_sv2_for_eng')).toMatch(/soft-mutated/);
  });
});
