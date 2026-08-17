/**
 * known-side-language-contracts.test.cjs
 *
 * Two things are under test here, and they are different in kind.
 *
 * 1. CONTRACT RESOLUTION (loadPairContract) — the precedence rule introduced 2026-08-17:
 *      course-specific file WINS, _lang_<known> is the FALLBACK, _default_eng for English,
 *      null otherwise. These are exact assertions about which file resolves.
 *
 * 2. CALIBRATION — per script family, a deliberately PLANTED violation must be caught, and a
 *      prompt built only from introduced vocabulary must come back clean. This is the check
 *      that stops us trusting a per-course finding count from a gate that is silently doing
 *      nothing. Before the Unicode tokenizer fix, a non-Latin known side tokenised to ZERO
 *      tokens and every one of these plant tests would have "passed" the clean case while
 *      failing to catch a single plant — which is exactly why both halves are asserted.
 *
 * The plants are synthetic vocabulary in each script, not real course content: the point is
 * the MATCHER's sensitivity to a never-introduced token, not any course's correctness.
 */
import { describe, it, expect } from 'vitest'

const V = require('./validation.cjs')
const {
  loadPairContract, knownLangFromCourseCode, checkKnownSide, compileKnownContract,
  isMechanicalContract, tokenizeKnown, stemKnownGloss,
} = V

/**
 * Build a gate context from an "introduced inventory" — the known_text of legos the learner
 * has already been given. Tokenised by the SAME tokenizeKnown the gate uses, which is what
 * makes prompt and inventory comparable under segmentation (CJK) as well as spaces.
 */
function ctxFrom(inventory, contract = { known_lang: 'test' }, seed = 1) {
  const stemFirstPos = new Map()
  for (const line of inventory) {
    for (const t of tokenizeKnown(line)) {
      const k = stemKnownGloss(t)
      if (k && !stemFirstPos.has(k)) stemFirstPos.set(k, seed)
    }
  }
  return { ...compileKnownContract(contract), stemFirstPos, consPos: {}, unitPos: [] }
}

const unknowns = (probs) => probs.filter((p) => /^unknown gloss/.test(p))

// ─── 1. Contract resolution ───────────────────────────────────────────

describe('loadPairContract precedence', () => {
  it('a course-specific contract WINS over the language-level one', () => {
    // eng_for_tam has its own file AND tam has _lang_tam; the pair file must win.
    const c = loadPairContract('eng_for_tam', 'tam')
    expect(c.course_code).toBe('eng_for_tam')
  })

  it('the language-level contract is the FALLBACK for a pair with no file of its own', () => {
    // The whole point of the widening: kor_for_tam had NO contract and no check at all.
    const c = loadPairContract('kor_for_tam', 'tam')
    expect(c).toBeTruthy()
    expect(c.known_lang).toBe('tam')
  })

  it('resolves the SAME object for every course of one known language', () => {
    expect(loadPairContract('kor_for_tam', 'tam')).toBe(loadPairContract('zho_for_tam', 'tam'))
    expect(loadPairContract('kor_for_hin', 'hin')).toBe(loadPairContract('zho_for_hin', 'hin'))
  })

  it('English-known courses still resolve exactly as they did before the change', () => {
    expect(loadPairContract('fra_for_eng', 'eng').course_code).toBe('fra_for_eng')
    expect(loadPairContract('zho_for_eng', 'eng').course_code).toBe('zho_for_eng')
    // no own file → the shared English scaffold, as since 2026-07-27
    expect(loadPairContract('glg_for_eng', 'eng').known_lang).toBe('eng')
  })

  it('a versioned course inherits its base pair contract', () => {
    expect(loadPairContract('zho_for_eng_v2', 'eng').course_code).toBe('zho_for_eng')
  })

  it('returns null — never a wrong-language contract — when nothing resolves', () => {
    const c = loadPairContract('xxx_for_qqq', 'qqq')
    expect(c).toBeNull()
  })

  it('the resolved contract always matches the course known language', () => {
    for (const [code, known] of [['kor_for_tam', 'tam'], ['zho_for_hin', 'hin'], ['fra_for_eng', 'eng']]) {
      const c = loadPairContract(code, known)
      expect(c.known_lang).toBe(known)
    }
  })

  it('derives the known language from the course code when none is passed', () => {
    expect(knownLangFromCourseCode('kor_for_tam')).toBe('tam')
    expect(knownLangFromCourseCode('spa_mx_for_jpn')).toBe('jpn')   // regional TARGET variant
    expect(knownLangFromCourseCode('cym_anthem_for_jpn')).toBe('jpn')
    expect(knownLangFromCourseCode('zho_for_eng_v2')).toBe('eng')
    expect(knownLangFromCourseCode('eng_template')).toBeNull()      // no _for_ segment
  })

  it('every _lang_ contract declares the language it is filed under', () => {
    const fs = require('fs')
    const dir = require('path').join(__dirname, '../../../docs/pair-contracts')
    const files = fs.readdirSync(dir).filter((f) => /^_lang_[a-z]{3}\.contract\.cjs$/.test(f))
    expect(files.length).toBeGreaterThan(0)
    for (const f of files) {
      const iso = f.slice(6, 9)
      expect(require(`${dir}/${f}`).known_lang).toBe(iso)
    }
  })
})

// ─── 2. Calibration: plants must be caught, clean prompts must pass ────
//
// Each case: an introduced inventory, a CLEAN prompt drawn only from it, and a PLANT — the
// same prompt with one never-introduced word substituted in. Assert both directions.

const FAMILIES = [
  {
    family: 'Latin (English)',
    inventory: ['i want', 'to speak', 'welsh', 'a little'],
    clean: 'i want to speak welsh',
    plant: 'i want to speak portuguese',
    plantWord: 'portuguese',
  },
  {
    family: 'Latin with diacritics (Welsh)',
    inventory: ['dw i eisiau', 'siarad', 'Cymraeg', 'tipyn bach'],
    clean: 'dw i eisiau siarad Cymraeg',
    plant: 'dw i eisiau siarad Ffrangeg',
    plantWord: 'ffrangeg',
  },
  {
    family: 'Latin with tone marks (Yoruba)',
    // stemKnownGloss keeps \p{M}, so the tone marks must survive and the words stay distinct.
    inventory: ['mo fẹ́', 'sọ', 'èdè Yorùbá'],
    clean: 'mo fẹ́ sọ èdè Yorùbá',
    plant: 'mo fẹ́ sọ èdè Faransé',
    plantWord: 'faransé',
  },
  {
    family: 'Devanagari (Hindi/Marathi)',
    inventory: ['मैं चाहता हूं', 'बोलना', 'अंग्रेज़ी'],
    clean: 'मैं चाहता हूं अंग्रेज़ी बोलना',
    plant: 'मैं चाहता हूं फ़्रांसीसी बोलना',
    plantWord: 'फ़्रांसीसी',
  },
  {
    family: 'Tamil (abugida, agglutinative)',
    inventory: ['நான் விரும்புகிறேன்', 'பேச', 'ஆங்கிலம்'],
    clean: 'நான் ஆங்கிலம் பேச விரும்புகிறேன்',
    plant: 'நான் பிரெஞ்சு பேச விரும்புகிறேன்',
    plantWord: 'பிரெஞ்சு',
  },
  {
    family: 'Kannada',
    inventory: ['ನಾನು ಬಯಸುತ್ತೇನೆ', 'ಮಾತನಾಡಲು', 'ಇಂಗ್ಲಿಷ್'],
    clean: 'ನಾನು ಇಂಗ್ಲಿಷ್ ಮಾತನಾಡಲು ಬಯಸುತ್ತೇನೆ',
    plant: 'ನಾನು ಫ್ರೆಂಚ್ ಮಾತನಾಡಲು ಬಯಸುತ್ತೇನೆ',
    plantWord: 'ಫ್ರೆಂಚ್',
  },
  {
    family: 'Telugu',
    inventory: ['నేను కోరుకుంటున్నాను', 'మాట్లాడటానికి', 'ఇంగ్లీష్'],
    clean: 'నేను ఇంగ్లీష్ మాట్లాడటానికి కోరుకుంటున్నాను',
    plant: 'నేను ఫ్రెంచ్ మాట్లాడటానికి కోరుకుంటున్నాను',
    plantWord: 'ఫ్రెంచ్',
  },
  {
    family: 'Arabic (RTL, unvowelled)',
    inventory: ['أريد', 'أن أتكلم', 'الإنجليزية'],
    clean: 'أريد أن أتكلم الإنجليزية',
    plant: 'أريد أن أتكلم الفرنسية',
    plantWord: 'الفرنسية',
  },
  {
    family: 'Hangul (Korean, spaced but agglutinative)',
    inventory: ['저는', '영어를', '말하고 싶어요'],
    clean: '저는 영어를 말하고 싶어요',
    plant: '저는 프랑스어를 말하고 싶어요',
    plantWord: '프랑스어를',
  },
  {
    family: 'Japanese (no word spaces — Intl.Segmenter path)',
    inventory: ['私は', '英語を', '話したいです'],
    clean: '私は英語を話したいです',
    plant: '私はフランス語を話したいです',
    plantWord: 'フランス語',
  },
  {
    family: 'Chinese (no word spaces — Intl.Segmenter path)',
    inventory: ['我想', '说', '英语'],
    clean: '我想说英语',
    plant: '我想说法语',
    plantWord: '法语',
  },
]

describe.each(FAMILIES)('calibration: $family', ({ inventory, clean, plant, plantWord }) => {
  it('the gate produces tokens at all (not a silent all-clear)', () => {
    // The pre-fix failure mode: zero tokens, so nothing could ever be flagged.
    expect(tokenizeKnown(clean).length).toBeGreaterThan(0)
  })

  it('a prompt built only from introduced vocabulary passes clean', () => {
    expect(checkKnownSide(clean, 1, ctxFrom(inventory))).toEqual([])
  })

  it('a PLANTED never-introduced word is caught', () => {
    const probs = checkKnownSide(plant, 1, ctxFrom(inventory))
    const u = unknowns(probs)
    expect(u.length).toBeGreaterThan(0)
    // and it names the planted word, not some unrelated fragment
    expect(u.join(' ')).toContain(plantWord)
  })

  it('a word introduced LATER is caught as not-yet-introduced, not as unknown', () => {
    const ctx = ctxFrom(inventory, { known_lang: 'test' }, 1)
    for (const t of tokenizeKnown(plant)) {
      const k = stemKnownGloss(t)
      if (k && !ctx.stemFirstPos.has(k)) ctx.stemFirstPos.set(k, 99)
    }
    const probs = checkKnownSide(plant, 1, ctx)
    expect(probs.some((p) => /not introduced until 99/.test(p))).toBe(true)
    expect(unknowns(probs)).toEqual([])
  })
})

describe('calibration: the plant is found because of the tokenizer, not by luck', () => {
  it('CJK inventory and prompt are segmented by the same rule, so they compare like for like', () => {
    // 英語 appears in the inventory as part of 英語を and in the prompt bare — segmentation
    // must yield the same unit on both sides or the clean case would false-fail.
    const ctx = ctxFrom(['私は', '英語を', '話したいです'])
    expect(checkKnownSide('私は英語を話したいです', 1, ctx)).toEqual([])
  })

  it('a diacritic is not a word boundary (the pre-fix shredding bug)', () => {
    // "danışmaq istəyirəm" used to shred to dan|maq|ist|yir|m under the ASCII-only class.
    expect(tokenizeKnown('danışmaq istəyirəm')).toEqual(['danışmaq', 'istəyirəm'])
  })

  it('Yoruba tone marks survive stemming, so toned words stay distinct', () => {
    expect(stemKnownGloss('fẹ́')).not.toBe(stemKnownGloss('fẹ'))
    expect(stemKnownGloss('fẹ́')).toContain('ẹ')
  })
})

// ─── 2b. Negation detection under a brief contract ────────────────────
//
// A brief has no negationMarkers regex, so "is this prompt negated?" is decided from a bare
// list of negator strings. The test was `known.includes(n)` — the negator ANYWHERE in the
// string — which read 48% of cym_for_yor prompts as negated against a true rate of 5%,
// because Yoruba `má` is a proper prefix of the future particle `máa`. A wrongly-negated
// prompt silently licenses every NPI in it.
//
// The rule is now: a negator counts if it IS a token, or ENDS one. Both arms are load-bearing.

describe('brief-contract negation detection', () => {
  const negCtx = (negation) => ({
    ...compileKnownContract({ known_lang: 'test', npi: ['ANY'], negation }),
    stemFirstPos: new Map(), consPos: {}, unitPos: [],
  })
  // An unlicensed NPI is the observable: it appears iff the prompt did NOT read as negated.
  const readsAsNegated = (prompt, negation) => {
    const ctx = negCtx(negation)
    ctx.stemFirstPos.set(stemKnownGloss('ANY'), 1)
    return !checkKnownSide(`${prompt} ANY`, 1, ctx).some((p) => /NPI token/.test(p))
  }

  it('a negator standing as its own token is negation', () => {
    expect(readsAsNegated('kò lọ', ['kò'])).toBe(true)
  })

  it('a negator that ENDS a word is negation — Dravidian negation is a bound suffix', () => {
    // விரும்பவில்லை = "don't want": the negator வில்லை is fused onto the verb.
    expect(readsAsNegated('நான் விரும்பவில்லை', ['வில்லை'])).toBe(true)
  })

  it('a negator at the START of a longer word is NOT negation', () => {
    // Yoruba má vs the future particle máa — the single biggest source of the old overreach.
    expect(readsAsNegated('máa lọ', ['má'])).toBe(false)
  })

  it('a negator buried MID-word is not negation', () => {
    expect(readsAsNegated('xxlaxx yy', ['la'])).toBe(false)
  })

  it('an empty or whitespace-only negation list never licenses anything', () => {
    expect(readsAsNegated('anything at all', [])).toBe(false)
    expect(readsAsNegated('anything at all', ['  '])).toBe(false)
  })

  it('a MECHANICAL contract never reaches the fallback — its regex decides', () => {
    // _default_eng carries negationMarkers; the token/suffix rule must not touch that path.
    const eng = require('../../../docs/pair-contracts/_default_eng.contract.cjs')
    expect(eng.negationMarkers).toBeTruthy()
    expect(isMechanicalContract(eng)).toBe(true)
  })
})

// ─── 3. Brief-vs-mechanical: findings must not be able to fail a build ─

describe('language-level contracts are advisory by construction', () => {
  const fs = require('fs')
  const dir = require('path').join(__dirname, '../../../docs/pair-contracts')
  const files = fs.readdirSync(dir).filter((f) => /^_lang_[a-z]{3}\.contract\.cjs$/.test(f))

  it.each(files.filter((f) => f !== '_lang_eng.contract.cjs'))(
    '%s is an AGENT BRIEF, so its findings are triage and never block a submission', (f) => {
      // Kai's ruling 2026-08-17: for these languages exact-form matching is TRIAGE, not
      // pass/fail. isMechanicalContract() true would make checkKnownSide's vocab breaches
      // push ERRORS in seed-complete.cjs and hard-fail the submit.
      expect(isMechanicalContract(require(`${dir}/${f}`))).toBe(false)
    },
  )

  it('_lang_eng stays mechanical — English is the one calibrated, ratified known side', () => {
    expect(isMechanicalContract(require(`${dir}/_lang_eng.contract.cjs`))).toBe(true)
  })
})
