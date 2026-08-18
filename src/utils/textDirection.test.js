import { describe, it, expect } from 'vitest'
import { isRtlText, dirFor, isolateText } from './textDirection'

/**
 * Real rows copied out of Supabase on 2026-08-18, course `ara_lb_for_eng`.
 * Not invented Arabic — these are the exact strings the learner is served.
 */
const ARA_PHRASE_EXCLAMATION = 'أحكي عربي هلق!' // known: "speak Arabic now!"
const ARA_PHRASE_COMMA = 'بدي أحكي عربي، معك!' // known: "I want to speak Arabic, with you!"
const ARA_SEED_1 = 'بدي أحكي معك عربي هلق.' // known: "I want to speak Arabic with you now."
const ARA_SEED_1_KNOWN = 'I want to speak Arabic with you now.'

describe('isRtlText', () => {
  it('detects an Arabic sentence ending in the neutral "!" — the reported bug', () => {
    // `!` is bidi class ON; under an LTR paragraph it jumps to the visual
    // right. This is the case Deborah reported.
    expect(isRtlText(ARA_PHRASE_EXCLAMATION)).toBe(true)
    expect(dirFor(ARA_PHRASE_EXCLAMATION)).toBe('rtl')
  })

  it('detects the same sentence ending in the Arabic "؟" — which already looked right', () => {
    // `؟` U+061F is bidi class AL, so it renders correctly even today. The
    // helper must still claim the string, or the two marks would disagree.
    const withArabicQuestionMark = 'أحكي عربي هلق؟'
    expect(isRtlText(withArabicQuestionMark)).toBe(true)
    expect(dirFor(withArabicQuestionMark)).toBe('rtl')
  })

  it('detects Arabic carrying an interior neutral comma', () => {
    expect(dirFor(ARA_PHRASE_COMMA)).toBe('rtl')
  })

  it('detects an Arabic seed ending in a neutral full stop', () => {
    expect(dirFor(ARA_SEED_1)).toBe('rtl')
  })

  it('keeps the English known side LTR', () => {
    expect(isRtlText(ARA_SEED_1_KNOWN)).toBe(false)
    expect(dirFor(ARA_SEED_1_KNOWN)).toBe('ltr')
  })

  it('treats a mixed Arabic-plus-Latin string by its majority script', () => {
    // Arabic sentence with a Latin loanword embedded: still an Arabic run.
    expect(dirFor('بدي أحكي WhatsApp معك!')).toBe('rtl')
    // English sentence quoting one Arabic word: still an English paragraph.
    expect(dirFor('The Levantine word is بحكي in this course')).toBe('ltr')
  })

  it('does not claim a string that is only digits and punctuation', () => {
    expect(isRtlText('12345')).toBe(false)
    expect(isRtlText('!?.,;: ()[]')).toBe(false)
    expect(isRtlText('3 / 12')).toBe(false)
    // Arabic-Indic digits are Script=Arabic but bidi class AN (weak), so a
    // bare numeral must not be dragged into RTL layout.
    expect(isRtlText('٢٠٢٦')).toBe(false)
  })

  it('is safe on empty, whitespace, null and undefined', () => {
    expect(isRtlText('')).toBe(false)
    expect(isRtlText('   ')).toBe(false)
    expect(isRtlText(null)).toBe(false)
    expect(isRtlText(undefined)).toBe(false)
    expect(dirFor(null)).toBe('ltr')
    expect(dirFor(undefined)).toBe('ltr')
  })

  it('generalises to other RTL scripts, so future courses need no code change', () => {
    expect(dirFor('שלום עולם!')).toBe('rtl') // Hebrew
    expect(dirFor('من فارسی حرف می‌زنم!')).toBe('rtl') // Persian
    expect(dirFor('میں اردو بولتا ہوں!')).toBe('rtl') // Urdu
  })

  it('leaves other non-Latin LTR scripts alone', () => {
    expect(dirFor('日本語を話したい')).toBe('ltr')
    expect(dirFor('한국어를 배우고 싶어요')).toBe('ltr')
    expect(dirFor('Ελληνικά')).toBe('ltr')
    expect(dirFor('Русский язык')).toBe('ltr')
  })
})

describe('isolateText — the plaintext slots where no element can carry `dir`', () => {
  // An <option> holds text, not elements. There is nothing to bind `dir` on,
  // and directing the <option> itself would move the LTR "12. " index prefix.
  const LRI = '\u2066'
  const RLI = '\u2067'
  const PDI = '\u2069'

  it('wraps Arabic in a right-to-left isolate, so the trailing `!` stays at the end', () => {
    expect(isolateText(ARA_PHRASE_EXCLAMATION)).toBe(RLI + ARA_PHRASE_EXCLAMATION + PDI)
    expect(isolateText(ARA_PHRASE_COMMA)).toBe(RLI + ARA_PHRASE_COMMA + PDI)
  })

  it('wraps English in a left-to-right isolate, so it is unaffected either way', () => {
    expect(isolateText(ARA_SEED_1_KNOWN)).toBe(LRI + ARA_SEED_1_KNOWN + PDI)
  })

  it('picks the direction from the script, not from the first strong character', () => {
    // FSI (U+2068) would guess from the leading Latin word and get this wrong;
    // that first-strong guess is the bug class this module exists to avoid.
    const mixed = 'Beirut يعني بيروت!'
    expect(isolateText(mixed).startsWith(RLI)).toBe(true)
  })

  it('returns an empty string for empty, null and undefined — no stray controls', () => {
    expect(isolateText('')).toBe('')
    expect(isolateText(null)).toBe('')
    expect(isolateText(undefined)).toBe('')
  })

  it('leaves the visible characters of the string untouched', () => {
    const stripped = isolateText(ARA_SEED_1).replace(/[\u2066\u2067\u2069]/g, '')
    expect(stripped).toBe(ARA_SEED_1)
  })
})
