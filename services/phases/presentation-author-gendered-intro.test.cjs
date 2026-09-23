/**
 * Gendered known languages: the intro quotes BOTH forms, female first
 * (Kai's ruling 2026-09-23 20:23Z, job #941·H).
 * Run: npx vitest run services/phases/presentation-author-gendered-intro
 */
import { describe, it, expect } from 'vitest'
const { renderIntro, expandGenderedKnownSlot, stripSeedClause } = require('./presentation-author.cjs')
const { genderedChunkForms, buildKnownGenderContext } = require('../shared/known-voice-gender.cjs')

// the live Hindi template (presentation_templates, known_lang='hin')
const HIN = "{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :"
const forms = { f: 'मैं चाहती हूँ', m: 'मैं चाहता हूँ' }

describe('expandGenderedKnownSlot', () => {
  it("turns the quoted {known} slot into '{known}' या '{known_m}' with the template's own quotes", () => {
    expect(expandGenderedKnownSlot(HIN, 'hin')).toBe("{target_lang_name} में — '{known}' या '{known_m}' — जैसे — '{seed}' — में :")
  })
  it('keeps Japanese-style brackets and falls back to a slash for an unlisted language', () => {
    expect(expandGenderedKnownSlot('「{known}」は', 'xxx')).toBe('「{known}」 / 「{known_m}」は')
  })
  it('leaves a template with no {known} slot alone', () => {
    expect(expandGenderedKnownSlot('nothing here', 'hin')).toBe('nothing here')
  })
})

describe('renderIntro with chunkForms', () => {
  it('Frame A: both forms, female first, in the female voice line', () => {
    expect(renderIntro({ frame: 'A', template: HIN, targetLangName: 'अंग्रेज़ी', chunk: forms.f, seed: '', chunkForms: forms, knownLang: 'hin' }))
      .toBe("अंग्रेज़ी में — 'मैं चाहती हूँ' या 'मैं चाहता हूँ' — में :")
  })
  it('Frame B keeps the "as in" context after both forms', () => {
    expect(renderIntro({ frame: 'B', template: HIN, targetLangName: 'अंग्रेज़ी', chunk: forms.f, seed: 'मैं अब बात करना चाहती हूँ।', chunkForms: forms, knownLang: 'hin' }))
      .toBe("अंग्रेज़ी में — 'मैं चाहती हूँ' या 'मैं चाहता हूँ' — जैसे — 'मैं अब बात करना चाहती हूँ।' — में :")
  })
  it('without chunkForms every existing course renders byte-identically to before', () => {
    expect(renderIntro({ frame: 'A', template: HIN, targetLangName: 'अंग्रेज़ी', chunk: 'अभी', seed: '' }))
      .toBe(stripSeedClause(HIN).replace('{target_lang_name}', 'अंग्रेज़ी').replace('{known}', 'अभी'))
    expect(renderIntro({ frame: 'A', template: HIN, targetLangName: 'अंग्रेज़ी', chunk: 'अभी', seed: '', chunkForms: null, knownLang: 'hin' }))
      .toBe("अंग्रेज़ी में — 'अभी' — में :")
  })
})

describe('genderedChunkForms', () => {
  const voices = { known: { voiceId: 'k', byGender: { m: { voiceId: 'm1' }, f: { voiceId: 'f1' } } } }
  const pairs = [{ expanded_m: forms.m, expanded_f: forms.f }]
  it('returns both forms for a pair side on a two-voice course, null for a neutral text', () => {
    const ctx = buildKnownGenderContext({ courseCode: 'eng_for_hin', voices, pairs })
    expect(genderedChunkForms(ctx, forms.f)).toEqual(forms)
    expect(genderedChunkForms(ctx, forms.m)).toEqual(forms)
    expect(genderedChunkForms(ctx, 'अभी')).toBeNull()
  })
  it('returns null on a one-voice course even for a pair side — intros there are unchanged', () => {
    const ctx = buildKnownGenderContext({ courseCode: 'eng_for_hin', voices: { known: { voiceId: 'k' } }, pairs })
    expect(genderedChunkForms(ctx, forms.f)).toBeNull()
    expect(genderedChunkForms(null, forms.f)).toBeNull()
  })
})
