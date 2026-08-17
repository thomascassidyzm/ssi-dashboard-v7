/**
 * Unicode tokenisation of the KNOWN side (defect fixed 2026-08-17).
 *
 * THE BUG WAS ONE CHARACTER CLASS. `tokenizeKnown` split on `[^a-z']` and
 * `stemKnownGloss` stripped `[^a-z']`, which meant:
 *   1. every non-Latin known language tokenised to ZERO tokens, so checkKnownSide
 *      found no problems in ANY input and reported a clean pass — a silent all-clear,
 *      not a check;
 *   2. every Latin known language WITH DIACRITICS was shredded, because the accented
 *      letter acted as a separator ("danışmaq" -> dan|maq). Fragments can false-PASS
 *      (a fragment collides with an introduced stem) and false-FAIL, which is worse
 *      than silence.
 * This suite is what stops it coming back. It covers each script family measured in
 * the estate census, the ASCII-unchanged guarantee, and the diacritic regression.
 *
 * Run: npx vitest run services/course-builder/lib/known-side-tokenizer
 */

import { describe, it, expect } from 'vitest'

const {
  tokenizeKnown, stemKnownGloss, compileKnownContract, checkKnownSide,
  isKnownVocabBreach, isMechanicalContract, loadPairContract,
} = require('./validation.cjs')

// ── The pre-fix implementations, kept verbatim as the regression oracle ──────
const oldExpand = (s) => (s || '').toLowerCase()
  .replace(/n['’]t\b/g, ' not')
  .replace(/['’]ve\b/g, ' have').replace(/['’]re\b/g, ' are').replace(/['’]m\b/g, ' am')
  .replace(/['’]ll\b/g, ' will').replace(/['’]d\b/g, ' would').replace(/['’]s\b/g, ' is')
const oldTokenize = (s) => oldExpand(s).split(/[^a-z']+/).filter(Boolean)
const oldStem = (tok) => (tok || '').toLowerCase().replace(/[^a-z']/g, '')

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE ASCII PATH MUST NOT MOVE
// ─────────────────────────────────────────────────────────────────────────────
describe('ASCII known sides tokenize exactly as they did before the fix', () => {
  const ENGLISH = [
    'I want to speak Welsh',
    "I don't want to speak Welsh",
    "that's what I've got and I'll do it",
    'Yes I want to speak',
    'have you been to the shop',
    "it's a bit of a problem, isn't it?",
    'we would like to go there at 5 o\'clock',
    'A B C — one; two: three!  (four)',
    "the dogs' bones",
    '',
    '   ',
    'I',
  ]

  it.each(ENGLISH)('token-identical: %j', (s) => {
    expect(tokenizeKnown(s)).toEqual(oldTokenize(s))
  })

  it.each(ENGLISH)('stem-identical: %j', (s) => {
    for (const tok of oldTokenize(s)) expect(stemKnownGloss(tok)).toBe(oldStem(tok))
  })

  it('digits are still separators, so no new "unknown gloss 5" appears', () => {
    // \p{N} was deliberately NOT admitted to the class — see the comment on tokenizeKnown.
    expect(tokenizeKnown("at 5 o'clock")).toEqual(oldTokenize("at 5 o'clock"))
    expect(tokenizeKnown("at 5 o'clock")).not.toContain('5')
  })

  it('English contraction expansion is untouched', () => {
    expect(tokenizeKnown("I shouldn't have")).toEqual(['i', 'should', 'not', 'have'])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. NON-LATIN SCRIPTS PRODUCE TOKENS AT ALL
//    (each of these returned [] before the fix — the false-pass families)
// ─────────────────────────────────────────────────────────────────────────────
describe('non-Latin known sides no longer tokenize to nothing', () => {
  const SCRIPTS = [
    ['tam Tamil',        'நான் பேச விரும்புகிறேன்', 3],
    ['hin Devanagari',   'मैं बोलना चाहता हूँ', 4],
    ['mar Devanagari',   'मला बोलायचे आहे', 3],
    ['ben Bengali',      'আমি বলতে চাই', 3],
    ['guj Gujarati',     'મારે બોલવું છે', 3],
    ['pan Gurmukhi',     'ਮੈਂ ਬੋਲਣਾ ਚਾਹੁੰਦਾ ਹਾਂ', 4],
    ['tel Telugu',       'నేను మాట్లాడాలనుకుంటున్నాను', 2],
    ['kan Kannada',      'ನಾನು ಮಾತನಾಡಲು ಬಯಸುತ್ತೇನೆ', 3],
    ['sin Sinhala',      'මට කතා කරන්න ඕනේ', 4],
    ['urd Arabic-script','میں بولنا چاہتا ہوں', 4],
    ['ara Arabic',       'أريد أن أتكلم', 3],
    ['kor Hangul',       '저는 말하고 싶어요', 3],
    ['heb Hebrew',       'אני רוצה לדבר', 3],
    ['ell Greek',        'θέλω να μιλήσω', 3],
    ['rus Cyrillic',     'я хочу говорить', 3],
  ]

  it.each(SCRIPTS)('%s yields tokens (was 0)', (_label, text, expected) => {
    expect(oldTokenize(text)).toEqual([])          // the defect, reproduced
    const toks = tokenizeKnown(text)
    expect(toks.length).toBe(expected)
    expect(toks.join('')).not.toBe('')
  })

  it.each(SCRIPTS)('%s survives stemming (was empty string)', (_label, text) => {
    for (const t of tokenizeKnown(text)) {
      expect(oldStem(t)).toBe('')                  // the defect: stemmed to nothing
      expect(stemKnownGloss(t)).not.toBe('')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. SCRIPTS WITHOUT WORD SPACES — the explicit ruling
//    Whitespace/letter-run splitting is meaningless here: the sentence is ONE
//    letter-run, so the gate would emit one bogus "unknown gloss <whole sentence>".
//    RULING: segment with Intl.Segmenter, do not let them pass silently.
// ─────────────────────────────────────────────────────────────────────────────
describe('scriptless (no word spaces) known sides are segmented, not passed and not swallowed whole', () => {
  const CASES = [
    ['jpn', '私は日本語を話したいです'],
    ['zho', '我想说中文'],
    ['tha', 'ฉันอยากพูดภาษาไทย'],
    ['khm', 'ខ្ញុំចង់និយាយ'],
  ]

  it.each(CASES)('%s: more than one token, none of them the whole sentence', (_lang, text) => {
    const toks = tokenizeKnown(text)
    expect(toks.length).toBeGreaterThan(1)
    expect(toks).not.toContain(text)
    expect(toks.join('').length).toBeGreaterThan(0)
  })

  it('jpn segments into recognisable units', () => {
    expect(tokenizeKnown('私は日本語を話したいです')).toContain('日本語')
  })

  it('zho segments into recognisable units', () => {
    expect(tokenizeKnown('我想说中文')).toContain('中文')
  })

  it('a mixed Japanese/Latin prompt still segments', () => {
    const toks = tokenizeKnown('Welshで話したい')
    expect(toks.some(t => /話/.test(t))).toBe(true)
  })

  it('punctuation is dropped, not turned into tokens', () => {
    expect(tokenizeKnown('你好吗？我很好。')).not.toContain('？')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. THE DIACRITIC-SHREDDING REGRESSION (aze / yor — the measured cases)
// ─────────────────────────────────────────────────────────────────────────────
describe('Latin-with-diacritics is no longer shredded into fragments', () => {
  const DIACRITIC = [
    ['aze', 'Mən danışmaq istəyirəm', ['mən', 'danışmaq', 'istəyirəm']],
    ['yor', 'Mo fẹ́ sọ èdè Yorùbá', ['mo', 'fẹ́', 'sọ', 'èdè', 'yorùbá']],
    ['fra', 'Je voudrais parler français', ['je', 'voudrais', 'parler', 'français']],
    ['spa', 'Quiero hablar español mañana', ['quiero', 'hablar', 'español', 'mañana']],
    ['por', 'Eu não posso ir à reunião', ['eu', 'não', 'posso', 'ir', 'à', 'reunião']],
    ['cym', 'Dw i eisiau siarad Cymraeg yfory', ['dw', 'i', 'eisiau', 'siarad', 'cymraeg', 'yfory']],
    ['gle', 'Tá mé ag iarraidh Gaeilge a labhairt', ['tá', 'mé', 'ag', 'iarraidh', 'gaeilge', 'a', 'labhairt']],
  ]

  it.each(DIACRITIC)('%s: one token per word', (_lang, text, expected) => {
    expect(tokenizeKnown(text)).toEqual(expected)
  })

  it.each(DIACRITIC)('%s: the old class produced MORE, SHORTER pieces', (_lang, text, expected) => {
    const before = oldTokenize(text)
    expect(before.length).toBeGreaterThanOrEqual(expected.length)
    // the giveaway signature: ≤2-char rubble the old tokenizer manufactured
    const rubbleBefore = before.filter(t => t.length <= 2).length
    const rubbleAfter = tokenizeKnown(text).filter(t => t.length <= 2).length
    expect(rubbleAfter).toBeLessThanOrEqual(rubbleBefore)
  })

  it('aze: the measured shredding case', () => {
    expect(oldTokenize('Mən danışmaq istəyirəm')).toEqual(['m', 'n', 'dan', 'maq', 'ist', 'yir', 'm'])
    expect(tokenizeKnown('Mən danışmaq istəyirəm')).toHaveLength(3)
  })

  it('yor: tone marks stay attached to their letter, they do not split the word', () => {
    // Yoruba has no precomposed dot-below+tone codepoint, so the tone mark is a
    // separate combining codepoint. \p{M} keeps it inside the token; dropping it
    // would silently merge distinct words.
    const toks = tokenizeKnown('Mo fẹ́ sọ')
    expect(toks).toHaveLength(3)
    expect(toks[1]).toMatch(/\p{M}/u)
  })

  it('a decomposed and a precomposed accent stem to the same key', () => {
    expect(stemKnownGloss('café')).toBe(stemKnownGloss('café'))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. THE GATE ITSELF: it used to pass ANYTHING on a non-Latin known side
// ─────────────────────────────────────────────────────────────────────────────
describe('checkKnownSide on a non-Latin known side', () => {
  const contract = loadPairContract('eng_for_tam')

  function ctxFor(glosses, seedOf) {
    const stemFirstPos = new Map()
    for (const [text, seed] of glosses) {
      for (const tok of tokenizeKnown(text)) {
        const s = stemKnownGloss(tok)
        if (s && (!stemFirstPos.has(s) || stemFirstPos.get(s) > seed)) stemFirstPos.set(s, seed)
      }
    }
    return { ...compileKnownContract(contract), stemFirstPos, consPos: {}, unitPos: [], seedOf }
  }

  const GLOSSES = [['நான் பேச விரும்புகிறேன்', 1], ['மேடம்', 42]]
  const ctx = ctxFor(GLOSSES)

  it('passes a prompt built only from introduced glosses', () => {
    expect(checkKnownSide('நான் பேச விரும்புகிறேன்', 1, ctx)).toEqual([])
  })

  it('FLAGS a gloss that has not debuted yet — the calibration case', () => {
    const probs = checkKnownSide('நான் பேச விரும்புகிறேன் மேடம்', 1, ctx)
    expect(probs.some(p => /மேடம்/.test(p) && /not introduced until 42/.test(p))).toBe(true)
    expect(probs.filter(isKnownVocabBreach).length).toBeGreaterThan(0)
  })

  it('stops flagging it once its seed is reached', () => {
    expect(checkKnownSide('நான் பேச விரும்புகிறேன் மேடம்', 42, ctx).filter(isKnownVocabBreach)).toEqual([])
  })

  it('FLAGS a word that is in the course nowhere at all', () => {
    const probs = checkKnownSide('நான் பேச விரும்புகிறேன் புத்தகம்', 1, ctx)
    expect(probs.some(p => /^unknown gloss/.test(p))).toBe(true)
  })

  it('THE DEFECT: with the old tokenizer every one of those returned a clean pass', () => {
    for (const s of ['நான் பேச விரும்புகிறேன் மேடம்', 'நான் பேச விரும்புகிறேன் புத்தகம்']) {
      expect(oldTokenize(s)).toEqual([])   // → the loop body never ran → probs stayed []
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. THE TWO CONTRACT DIALECTS — a brief must never read as a mechanical all-clear
// ─────────────────────────────────────────────────────────────────────────────
describe('mechanical contracts vs agent briefs', () => {
  it('the *_for_eng contracts are mechanical', () => {
    expect(isMechanicalContract(loadPairContract('fra_for_eng'))).toBe(true)
    expect(isMechanicalContract(loadPairContract('glg_for_eng'))).toBe(true)   // _default_eng
  })

  it('the eng_for_<Indic> contracts are agent briefs, NOT regex gate configs', () => {
    for (const c of ['eng_for_tam', 'eng_for_hin', 'eng_for_ben', 'eng_for_guj', 'eng_for_pan', 'eng_for_sin', 'eng_for_urd']) {
      expect(isMechanicalContract(loadPairContract(c))).toBe(false)
    }
  })

  it('a brief contract still contributes its free class (freeClass/npi/negation aliases)', () => {
    const compiled = compileKnownContract(loadPairContract('eng_for_tam'))
    expect(compiled.glue.size).toBeGreaterThan(0)
    expect(compiled.npi.size).toBeGreaterThan(0)
    expect(compiled.mechanical).toBe(false)
    expect(compiled.glue.has(stemKnownGloss('நான்'))).toBe(true)
  })

  it('negation is detected by substring where the contract has no marker regex', () => {
    const compiled = compileKnownContract(loadPairContract('eng_for_tam'))
    const ctx = { ...compiled, stemFirstPos: new Map(), consPos: {}, unitPos: [] }
    // இல்லை is in the contract's negation list; the NPI எதுவும் is then licensed.
    expect(checkKnownSide('எதுவும் இல்லை', 1, ctx).some(p => /NPI/.test(p))).toBe(false)
    expect(checkKnownSide('எதுவும்', 1, ctx).some(p => /NPI/.test(p))).toBe(true)
  })
})
