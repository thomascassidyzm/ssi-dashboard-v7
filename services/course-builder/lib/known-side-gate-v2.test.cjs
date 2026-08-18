/**
 * Unit tests for the script-aware known-side gate (2026-08-18).
 *
 * The defect these lock down: `tokenizeKnown` split on /[^a-z']+/, so every non-Latin known side
 * produced zero tokens, zero violations and a PASS — and every accented Latin word was silently
 * cut into fragments. 31 courses had no protection from this gate at all.
 *
 * Run: npx vitest run services/course-builder/lib/known-side-gate-v2
 */

import { describe, it, expect } from 'vitest'

const S = require('./known-side-script.cjs')
const { buildContext, checkKnownSideV2, STATUS, REASON } = require('./known-side-gate-v2.cjs')
const { tokenizeKnown } = require('./validation.cjs')

const inv = (pairs) => new Map(pairs.map(([w, s]) => [S.normalizeKnown(w), s]))
const contract = (over = {}) => ({
  course_code: '_test', known_lang: 'xxx', script: 'Latn', morphology: 'isolating',
  stemStrip: [], stemMinLen: 2, freeClass: [], npi: [], negation: [], ...over,
})

describe('the defect, demonstrated', () => {
  it('v1 saw zero tokens in every non-Latin script — which is why it reported PASS', () => {
    for (const t of ['मैं चाहता हूँ', '日本語を話す', '저는 배워요', 'أريد أن أتكلم', 'நான் பேச', 'මට කතා']) {
      expect(tokenizeKnown(t)).toEqual([])
      expect(S.segmentKnown(t).tokens.length).toBeGreaterThan(0)
    }
  })

  it('v1 mangled accented Latin into fragments that were never in the text', () => {
    expect(tokenizeKnown('mo ṣe é dáadáa')).toEqual(['mo', 'e', 'd', 'ad', 'a'])
    expect(S.segmentKnown('mo ṣe é dáadáa', { script: 'Latn' }).tokens).toEqual(['mo', 'ṣe', 'é', 'dáadáa'])

    expect(tokenizeKnown('ich möchte')).toEqual(['ich', 'm', 'chte'])
    expect(S.segmentKnown('ich möchte', { script: 'Latn' }).tokens).toEqual(['ich', 'möchte'])
  })

  it('plain English is untouched — the 76 English-known courses do not move', () => {
    for (const t of ['I want to speak', 'have you been able to do that yet', "I don't know if it's there"]) {
      expect(S.segmentKnown(t, { script: 'Latn', expandContractions: true }).tokens).toEqual(tokenizeKnown(t))
    }
  })
})

describe('requirement 1 — UNCHECKED is a distinct outcome, never a pass', () => {
  it('no contract ⇒ UNCHECKED(no_contract), not PASS', () => {
    const ctx = buildContext(null, inv([['x', 1]]), { courseCode: 'eng_for_zzz', knownLang: 'zzz' })
    const r = checkKnownSideV2('anything at all', 1, ctx)
    expect(r.status).toBe(STATUS.UNCHECKED)
    expect(r.unchecked[0].reason).toBe(REASON.NO_CONTRACT)
  })

  it('empty vocabulary inventory ⇒ UNCHECKED(no_vocab_inventory), not PASS', () => {
    const ctx = buildContext(contract(), new Map(), { courseCode: 'c', knownLang: 'xxx' })
    expect(checkKnownSideV2('hello', 1, ctx).unchecked.map((u) => u.reason)).toContain(REASON.NO_VOCAB_INVENTORY)
  })

  it("contract for the wrong known language ⇒ UNCHECKED, not a pass on someone else's grammar", () => {
    const ctx = buildContext(contract({ known_lang: 'hin' }), inv([['x', 1]]), { courseCode: 'c', knownLang: 'jpn' })
    expect(ctx.blockers[0].reason).toBe(REASON.CONTRACT_LANG_MISMATCH)
    expect(checkKnownSideV2('x', 1, ctx).status).toBe(STATUS.UNCHECKED)
  })

  it('text that segments to nothing ⇒ UNCHECKED(tokenizer_empty) — the original bug, now loud', () => {
    const seg = S.segmentKnown('!!! ... ???')
    expect(seg.tokens).toEqual([])
    expect(seg.unchecked.map((u) => u.reason)).toContain(REASON.EMPTY_TEXT)
  })

  it('every UNCHECKED reason carries a human-readable explanation', () => {
    for (const code of Object.values(REASON)) expect(S.REASON_TEXT[code]).toBeTruthy()
  })
})

describe('violations are found', () => {
  const c = contract({ script: 'Deva', morphology: 'isolating' })
  const ctx = buildContext(c, inv([['मैं', 1], ['चाहता', 1], ['कुर्सी', 200]]), { courseCode: 'c', knownLang: 'xxx' })

  it('a word introduced later is flagged at an earlier position', () => {
    const r = checkKnownSideV2('मैं कुर्सी', 5, ctx)
    expect(r.status).toBe(STATUS.VIOLATION)
    expect(r.violations[0]).toMatchObject({ token: 'कुर्सी', reason: 'not_introduced_until', firstPos: 200, confidence: 'high' })
  })

  it('a word never taught at all is flagged', () => {
    const r = checkKnownSideV2('मैं हवाईजहाज़', 5, ctx)
    expect(r.status).toBe(STATUS.VIOLATION)
    expect(r.violations[0].reason).toBe('unknown_gloss')
  })

  it('fully introduced text passes', () => {
    expect(checkKnownSideV2('मैं चाहता', 5, ctx).status).toBe(STATUS.PASS)
  })
})

describe('requirement 2 — the known side may run ahead, within reason', () => {
  it('E1 free class is never a violation', () => {
    const ctx = buildContext(contract({ script: 'Deva', freeClass: ['के', 'साथ'] }), inv([['मैं', 1]]), { courseCode: 'c', knownLang: 'xxx' })
    expect(checkKnownSideV2('मैं के साथ', 1, ctx).status).toBe(STATUS.PASS)
  })

  it('E2 an inflection of an introduced lemma is not new vocabulary, where stemStrip licenses it', () => {
    const c = contract({ script: 'Beng', morphology: 'fusional', stemStrip: ['টা', 'কে'] })
    const ctx = buildContext(c, inv([['বই', 1]]), { courseCode: 'c', knownLang: 'xxx' })
    expect(checkKnownSideV2('বইটা', 5, ctx).status).toBe(STATUS.PASS)
  })

  it('E3 an NPI is licensed under negation and only borderline without it', () => {
    const c = contract({ script: 'Deva', npi: ['कुछ'], negation: ['नहीं'] })
    const ctx = buildContext(c, inv([['मैं', 1]]), { courseCode: 'c', knownLang: 'xxx' })
    expect(checkKnownSideV2('मैं कुछ नहीं', 1, ctx).status).toBe(STATUS.PASS)
    const positive = checkKnownSideV2('मैं कुछ', 1, ctx)
    expect(positive.status).toBe(STATUS.VIOLATION)
    // Reported for adjudication, NOT asserted as real — this is the कुछ भी class the pilot
    // calibrated on, and it must never enter the high-confidence count.
    expect(positive.violations[0].confidence).toBe('borderline')
  })
})

describe('inflecting known sides refuse rather than guess', () => {
  const c = contract({ script: 'Taml', morphology: 'agglutinative', stemStrip: [] })
  const ctx = buildContext(c, inv([['பேச', 1]]), { courseCode: 'c', knownLang: 'xxx' })

  it('a token containing an introduced stem is UNCHECKED, not a pass and not a violation', () => {
    const r = checkKnownSideV2('பேசுகிறேன்', 5, ctx)
    expect(r.status).toBe(STATUS.UNCHECKED)
    expect(r.unchecked[0].reason).toBe(REASON.MORPHOLOGY_UNRESOLVED)
  })

  it('a token sharing no introduced stem at all IS a high-confidence violation', () => {
    const r = checkKnownSideV2('கணினி', 5, ctx)
    expect(r.status).toBe(STATUS.VIOLATION)
    expect(r.violations[0].confidence).toBe('high')
  })
})

describe('no-space scripts', () => {
  it('Japanese tiles against the introduced inventory rather than trusting word boundaries', () => {
    const c = contract({ known_lang: 'jpn', script: 'Jpan', segmentation: 'dictionary', morphology: 'agglutinative' })
    const ctx = buildContext(c, inv([['日本語', 1], ['を', 1], ['話す', 1]]), { courseCode: 'c', knownLang: 'jpn' })
    expect(checkKnownSideV2('日本語を話す', 5, ctx).status).toBe(STATUS.PASS)
    expect(checkKnownSideV2('日本語を勉強', 5, ctx).status).not.toBe(STATUS.PASS)
  })

  it('Thai segments without spaces', () => {
    expect(S.segmentKnown('ผมอยากพูดภาษาไทย').tokens).toEqual(['ผม', 'อยาก', 'พูด', 'ภาษา', 'ไทย'])
  })
})

describe('script detection', () => {
  it('identifies the estate scripts, and keeps Japanese apart from Chinese', () => {
    expect(S.detectScript('日本語です')).toBe('Jpan')   // kana present
    expect(S.detectScript('我想说中文')).toBe('Hani')   // Han only
    expect(S.detectScript('저는')).toBe('Hang')
    expect(S.detectScript('मैं')).toBe('Deva')
    expect(S.detectScript('আমি')).toBe('Beng')
    expect(S.detectScript('نعم')).toBe('Arab')
    expect(S.detectScript('hello')).toBe('Latn')
  })

  it('keeps contrastive diacritics and drops only cosmetic marks', () => {
    // Accents are contrastive on this estate (Irish fada, Yoruba tone) — never stripped.
    expect(S.normalizeKnown('Tá sé')).toBe('tá sé')
    expect(S.normalizeKnown('ṣé')).toBe('ṣé')
    // Arabic tashkeel is cosmetic and is stripped, matching normalizeForContainment.
    expect(S.normalizeKnown('كَتَبَ')).toBe('كتب')
    // Apostrophes survive: l'homme ≠ le homme, and mangling them breaks German "geht's".
    expect(S.segmentKnown("geht's", { script: 'Latn' }).tokens).toEqual(["geht's"])
  })
})
