/**
 * Insert-path capitalisation tests (2026-08-11).
 *
 * The bug Kai hit building Pennsylvania Dutch (pdc_for_eng): the insert path
 * lowercased the FIRST word of every LEGO / phrase unless that exact word was in a
 * hard-coded allowlist. So "Deitsch schwetze" was stored as "deitsch schwetze", and
 * "I'm waiting" as "i'm waiting" ("I" was allowlisted, "I'm" was not). Pennsylvania
 * Dutch and German capitalise nouns, so this produced wrong text, not just cosmetics.
 *
 * The fix: decide from evidence in the submission itself. A word seen capitalised
 * mid-sentence is inherently capitalised and is never lowercased; a word seen
 * lowercase mid-sentence is safe to lowercase at position 0; with no evidence,
 * the author's capital stands.
 *
 * Run: npx vitest run services/course-builder/lib/text-normalization
 */

import { describe, it, expect } from 'vitest'

const {
  stripBookendPunctuation,
  collectCasingEvidence,
  normalizeSubmissionCasing,
} = require('./text-normalization.cjs')

// A realistic pdc_for_eng submission: the LEGO "Deitsch" plus its phrases.
const PDC_TARGETS = [
  'Deitsch',
  'Deitsch schwetze',
  'ich will Deitsch schwetze',
  'mit dir Deitsch schwetze',
  'ich will nau mit dir Deitsch schwetze',
]
const PDC_KNOWNS = [
  'Pennsylvania Dutch',
  'to speak Pennsylvania Dutch',
  "I'm going to speak Pennsylvania Dutch",
  'I want to speak Pennsylvania Dutch with you',
  "I'd like to speak Pennsylvania Dutch now",
]

describe('stripBookendPunctuation — the damage Kai reported', () => {
  it('no longer lowercases Deitsch at the start of a phrase', () => {
    const evidence = collectCasingEvidence(PDC_TARGETS)
    expect(stripBookendPunctuation('Deitsch schwetze', null, evidence)).toBe('Deitsch schwetze')
    expect(stripBookendPunctuation('Deitsch', null, evidence)).toBe('Deitsch')
  })

  it('no longer lowercases the I in I\'m / I\'ve / I\'d / I\'ll', () => {
    const evidence = collectCasingEvidence(PDC_KNOWNS)
    for (const text of ["I'm waiting", "I've waited", "I'd wait", "I'll wait"]) {
      expect(stripBookendPunctuation(text, null, evidence)).toBe(text)
    }
  })

  it('reproduces the old behaviour to prove the test would have caught it', () => {
    // The old code: lowercase the first char unless the exact first word is allowlisted.
    const oldBehaviour = (text, keepCapSet) => {
      let result = text.replace(/\.$/, '')
      if (result.length > 0 && result[0] >= 'A' && result[0] <= 'Z') {
        const firstWord = result.split(/\s+/)[0].replace(/[.,!?;:¿¡«»""'']+$/, '')
        if (!keepCapSet || !keepCapSet.has(firstWord)) {
          result = result[0].toLowerCase() + result.slice(1)
        }
      }
      return result
    }
    const oldAllowlist = new Set(['I', 'German', 'Deutsch'])
    expect(oldBehaviour('Deitsch schwetze', oldAllowlist)).toBe('deitsch schwetze')
    expect(oldBehaviour("I'm waiting", oldAllowlist)).toBe("i'm waiting")
  })
})

describe('stripBookendPunctuation — German noun capitalisation', () => {
  const DEU = [
    'Zeit',
    'Zeit verbringen',
    'ich will Zeit mit dir verbringen',
    'wir haben keine Zeit',
    'ich warte auf dich',
  ]

  it('keeps a German noun capitalised when it leads a phrase', () => {
    const evidence = collectCasingEvidence(DEU)
    expect(stripBookendPunctuation('Zeit verbringen', null, evidence)).toBe('Zeit verbringen')
  })

  it('still undoes accidental sentence-case on an ordinary word', () => {
    const evidence = collectCasingEvidence(DEU)
    // "ich" and "warte" both appear lowercase mid-sentence — the capital is accidental.
    expect(stripBookendPunctuation('Ich warte auf dich', null, evidence)).toBe('ich warte auf dich')
    expect(stripBookendPunctuation('Warte auf dich', null, evidence)).toBe('warte auf dich')
  })
})

describe('stripBookendPunctuation — general behaviour', () => {
  it('undoes accidental sentence-case in English when the corpus proves it', () => {
    const evidence = collectCasingEvidence(['I want to go', 'do you want to go'])
    expect(stripBookendPunctuation('Want to go', null, evidence)).toBe('want to go')
  })

  it('keeps the capital when there is no evidence either way', () => {
    const evidence = collectCasingEvidence(['something unrelated'])
    expect(stripBookendPunctuation('Deitsch schwetze', null, evidence)).toBe('Deitsch schwetze')
  })

  it('keeps the capital when the corpus is contradictory', () => {
    const evidence = collectCasingEvidence(['ein Buch lesen', 'das buch lesen'])
    expect(stripBookendPunctuation('Buch lesen', null, evidence)).toBe('Buch lesen')
  })

  it('honours the legacy backstop list without any evidence', () => {
    const keep = new Set(['Deitsch'])
    const evidence = collectCasingEvidence(['ich will deitsch schwetze'])
    expect(stripBookendPunctuation('Deitsch schwetze', keep, evidence)).toBe('Deitsch schwetze')
  })

  it('still strips a trailing period and keeps ! and ?', () => {
    const evidence = collectCasingEvidence(['ich will gehen'])
    expect(stripBookendPunctuation('Ich will gehen.', null, evidence)).toBe('ich will gehen')
    expect(stripBookendPunctuation('Ich will gehen!', null, evidence)).toBe('ich will gehen!')
    expect(stripBookendPunctuation('Ich will gehen?', null, evidence)).toBe('ich will gehen?')
  })

  it('handles empty and undefined input', () => {
    expect(stripBookendPunctuation('')).toBe('')
    expect(stripBookendPunctuation(undefined)).toBe('')
  })

  it('reads accented capitals too, which the ASCII-only check missed', () => {
    const evidence = collectCasingEvidence(['je veux étudier', 'nous allons étudier'])
    expect(stripBookendPunctuation('Étudier avec toi', null, evidence)).toBe('étudier avec toi')
  })
})

describe('normalizeSubmissionCasing — a whole pdc_for_eng submission', () => {
  // What Kai would submit for the LEGO "Deitsch": the LEGO itself is a bare word with
  // no context, and only its sibling phrases can prove the capital belongs to it.
  const submission = () => ([{
    known: 'Pennsylvania Dutch',
    target: 'Deitsch',
    build: [
      { known: 'to speak Pennsylvania Dutch', target: 'Deitsch schwetze.' },
      { known: 'I want to speak Pennsylvania Dutch', target: 'ich will Deitsch schwetze' },
      { known: "I'm speaking Pennsylvania Dutch", target: 'ich schwetz Deitsch' },
    ],
    use: [
      { known: 'I want to speak Pennsylvania Dutch with you', target: 'ich will mit dir Deitsch schwetze' },
      { known: "I'd like to speak Pennsylvania Dutch now", target: 'ich will nau Deitsch schwetze' },
      { known: 'Do you want to speak Pennsylvania Dutch?', target: 'witt du Deitsch schwetze?' },
    ],
  }])

  it('leaves Deitsch, Pennsylvania Dutch and the I-contractions alone', () => {
    const legos = submission()
    normalizeSubmissionCasing(legos, { keepCapSet: new Set(['I']) })
    const lego = legos[0]
    expect(lego.target).toBe('Deitsch')
    expect(lego.known).toBe('Pennsylvania Dutch')
    expect(lego.build[0].target).toBe('Deitsch schwetze')          // trailing period gone
    expect(lego.build[2].known).toBe("I'm speaking Pennsylvania Dutch")
    expect(lego.use[1].known).toBe("I'd like to speak Pennsylvania Dutch now")
    for (const row of [...lego.build, ...lego.use]) {
      expect(row.target).toContain('Deitsch')
      expect(row.target).not.toContain('deitsch')
    }
  })

  it('still undoes accidental sentence-case on the known side', () => {
    const legos = submission()
    legos[0].use.push({ known: 'what do you want to speak?', target: 'was witt du schwetze?' })
    normalizeSubmissionCasing(legos, { keepCapSet: new Set(['I']) })
    // "do" and "witt" now appear lowercase mid-sentence elsewhere in the submission,
    // so the leading capitals on the sibling rows are provably accidental.
    expect(legos[0].use[2].known).toBe('do you want to speak Pennsylvania Dutch?')
    expect(legos[0].use[2].target).toBe('witt du Deitsch schwetze?')
  })

  it('skips casing entirely for languages with no capitalisation concept', () => {
    const legos = [{ known: 'I want', target: '欲しい', use: [{ known: 'I want it', target: 'それが欲しい' }] }]
    normalizeSubmissionCasing(legos, { skipTarget: true })
    expect(legos[0].target).toBe('欲しい')
  })

  it('tolerates missing phrase arrays and empty input', () => {
    expect(() => normalizeSubmissionCasing(null)).not.toThrow()
    expect(() => normalizeSubmissionCasing([{ known: 'a', target: 'b' }])).not.toThrow()
  })
})

describe('collectCasingEvidence', () => {
  it('takes no signal from a capital in first position', () => {
    const { inherentlyCapitalised, seenLowercase } = collectCasingEvidence(['Deitsch schwetze'])
    expect(inherentlyCapitalised.has('deitsch')).toBe(false)
    expect(seenLowercase.has('deitsch')).toBe(false)
    expect(seenLowercase.has('schwetze')).toBe(true)
  })

  it('does take a signal from a lowercase word in first position', () => {
    const { seenLowercase } = collectCasingEvidence(['ich will gehen'])
    expect(seenLowercase.has('ich')).toBe(true)
  })

  it('records a clitic apostrophe stem as well as the whole word', () => {
    const { inherentlyCapitalised } = collectCasingEvidence(['what do I want', "yes I'm here"])
    expect(inherentlyCapitalised.has('i')).toBe(true)
    expect(inherentlyCapitalised.has("i'm")).toBe(true)
  })

  it('strips edge punctuation before recording a word', () => {
    const { inherentlyCapitalised } = collectCasingEvidence(['ich will Deitsch, gell?'])
    expect(inherentlyCapitalised.has('deitsch')).toBe(true)
  })
})
