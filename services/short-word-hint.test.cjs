// What applyShortWordHint can and cannot reach.
//
// The helper exists because Azure's neural voices read a token they don't
// recognise as a word out as LETTER NAMES ("übn" → "ü-be-en"). Its remedy is a
// trailing comma on the TTS input, which coaxes the engine into treating the
// input as a sentence fragment and speaking it.
//
// Deborah's 2026-09-08 check of deu_at_for_eng / deu_ch_for_eng found the
// defect alive, and these tests say why the helper misses it. The words she
// confirmed BY EAR appear in 1,735 clips; do not trust a larger number derived
// from clip durations, which cannot separate a spelled-out word from an
// ordinary short one (clean spa/ita courses score worse on that measure than
// these two do). Two structural gaps, both visible from the signature alone:
//
//   1. It looks at the WHOLE clip text, so a short word inside a longer phrase
//      is never hinted — and that is where most of the defect lives
//      ("mi" 568 clips and "di" 432 in deu_at alone, both confirmed by ear).
//   2. Its Latin threshold is 2 characters, so a 3-letter dialect token is
//      never hinted even when the clip IS just that word — "übn" (376 clips)
//      and "oda" are the confirmed cases.
//
// Azure DOES support a per-word remedy (<phoneme>/<sub alias>), and
// tts-service.cjs already passes inline SSML through unescaped via
// buildAzureSSMLBody — but nothing in the schema stores a spoken-text override,
// so there is nowhere to put the tag that isn't the learner-visible target_text.
//
// Run: npx vitest run services/short-word-hint.test.cjs
import { describe, it, expect } from 'vitest'
const { applyShortWordHint } = require('./azure-tts-service.cjs')

describe('applyShortWordHint — what it reaches', () => {
  it('hints a standalone 1-2 character Latin word', () => {
    expect(applyShortWordHint('mi')).toBe('mi,')
    expect(applyShortWordHint('z')).toBe('z,')
  })

  it('leaves text that already ends in punctuation alone', () => {
    expect(applyShortWordHint('mi,')).toBe('mi,')
  })
})

describe('applyShortWordHint — the two gaps behind the deu_at/deu_ch defect', () => {
  it('GAP 1: cannot reach a short word embedded in a phrase', () => {
    // The whole string is longer than the threshold, so no hint fires and "mi"
    // is still exposed to the letter-name fallback mid-phrase.
    expect(applyShortWordHint('i frei mi drauf')).toBe('i frei mi drauf')
    expect(applyShortWordHint('ich versuech z rede')).toBe('ich versuech z rede')
  })

  it('GAP 2: the Latin threshold stops at 2 chars, so 3-letter tokens are never hinted', () => {
    expect(applyShortWordHint('übn')).toBe('übn')
    expect(applyShortWordHint('oda')).toBe('oda')
    expect(applyShortWordHint('obn')).toBe('obn')
  })
})
