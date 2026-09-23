/**
 * The known-side voice-gender rule (Kai's design, 2026-09-23; job #883·H).
 *
 * Locks the two halves of the rule: neutral lines split by a stable hash,
 * gendered lines bound to the voice of their grammar; and that a course with
 * no byGender block is untouched.
 *
 * Run: npx vitest run services/shared/known-voice-gender
 */
import { describe, it, expect } from 'vitest'
const kvg = require('./known-voice-gender.cjs')

const PAIRS = [
  { original_text: 'मैं चाहता हूँ', expanded_m: 'मैं चाहता हूँ', expanded_f: 'मैं चाहती हूँ', text_side: 'known' },
  { original_text: 'मैं कोशिश कर रहा हूँ।', expanded_m: 'मैं कोशिश कर रहा हूँ।', expanded_f: 'मैं कोशिश कर रही हूँ।', text_side: 'known' },
  // not a pair: identical forms
  { original_text: 'अब', expanded_m: 'अब', expanded_f: 'अब', text_side: 'known' },
]

const VOICES = {
  known: {
    name: 'Kriti', voiceId: 'cartesia_5283efe8-07d1-4e3a-b615-2ae4a81c1b73', provider: 'cartesia', gender: 'f',
    byGender: {
      m: { name: 'Rehan', voiceId: 'cartesia_205fc552-2cce-4307-baa1-598b9dc3dd01', provider: 'cartesia' },
      f: { name: 'Kriti', voiceId: 'cartesia_5283efe8-07d1-4e3a-b615-2ae4a81c1b73', provider: 'cartesia' },
    },
  },
  presentation: { name: 'Kriti', voiceId: 'cartesia_5283efe8-07d1-4e3a-b615-2ae4a81c1b73', provider: 'cartesia' },
}

describe('gendered lines bind to the voice of their grammar', () => {
  const index = kvg.buildKnownGenderIndex(PAIRS)

  it('indexes BOTH forms of a stored pair and skips identical forms', () => {
    expect(index.size).toBe(4)
    expect(kvg.knownGenderForText('मैं चाहता हूँ', index).gender).toBe('m')
    expect(kvg.knownGenderForText('मैं चाहती हूँ', index).gender).toBe('f')
    expect(kvg.knownGenderForText('अब', index).source).toBe('hash')
  })

  it('matches through trailing danda / case / whitespace differences', () => {
    expect(kvg.knownGenderForText('मैं कोशिश कर रही हूँ', index)).toMatchObject({ gender: 'f', source: 'pair' })
    expect(kvg.knownGenderForText('  मैं  चाहता हूँ। ', index)).toMatchObject({ gender: 'm', source: 'pair' })
  })

  it('names the counterpart form, and null for a neutral line', () => {
    expect(kvg.counterpartForText('मैं चाहता हूँ', index)).toEqual({ gender: 'f', text: 'मैं चाहती हूँ' })
    expect(kvg.counterpartForText('मैं चाहती हूँ', index)).toEqual({ gender: 'm', text: 'मैं चाहता हूँ' })
    expect(kvg.counterpartForText('अब', index)).toBeNull()
  })

  it('the male form renders on the male voice and the female form on the female voice — never crossed', () => {
    const m = kvg.resolveKnownVoiceForText({ voices: VOICES, text: 'मैं चाहता हूँ', index, salt: 'eng_for_hin' })
    const f = kvg.resolveKnownVoiceForText({ voices: VOICES, text: 'मैं चाहती हूँ', index, salt: 'eng_for_hin' })
    expect(m.voice.name).toBe('Rehan')
    expect(f.voice.name).toBe('Kriti')
    expect(m.source).toBe('pair')
  })
})

describe('neutral lines split by a stable hash', () => {
  const index = kvg.buildKnownGenderIndex(PAIRS)

  it('is deterministic for the same text and salt', () => {
    for (const t of ['अब', 'आपके साथ', 'अंग्रेज़ी में बात करना', 'क्या आप जानते हैं?']) {
      expect(kvg.hashGender(t, 'eng_for_hin')).toBe(kvg.hashGender(t, 'eng_for_hin'))
      expect(kvg.hashGender(t, 'eng_for_hin')).toBe(kvg.hashGender(`${t}।`, 'eng_for_hin'))
    }
  })

  it('splits a corpus of distinct neutral lines roughly in half', () => {
    let m = 0, f = 0
    for (let i = 0; i < 4000; i++) {
      const g = kvg.hashGender(`neutral line number ${i} with some words`, 'eng_for_hin')
      if (g === 'm') m++; else f++
    }
    const share = m / (m + f)
    expect(share).toBeGreaterThan(0.45)
    expect(share).toBeLessThan(0.55)
  })

  it('a neutral line resolves to a byGender voice, tagged as hash-decided', () => {
    const r = kvg.resolveKnownVoiceForText({ voices: VOICES, text: 'आपके साथ', index, salt: 'eng_for_hin' })
    expect(['Rehan', 'Kriti']).toContain(r.voice.name)
    expect(r.source).toBe('hash')
    expect(r.voice.name).toBe(r.gender === 'm' ? 'Rehan' : 'Kriti')
  })
})

describe('a course without byGender is untouched', () => {
  it('every text resolves to the single role voice, whatever its gender', () => {
    const index = kvg.buildKnownGenderIndex(PAIRS)
    const single = { known: { name: 'Sonia', voiceId: 'azure_en-GB-SoniaNeural', provider: 'azure' } }
    for (const t of ['मैं चाहता हूँ', 'मैं चाहती हूँ', 'अब']) {
      expect(kvg.resolveKnownVoiceForText({ voices: single, text: t, index }).voice.name).toBe('Sonia')
    }
    expect(kvg.roleHasGenderedVoices(single, 'known')).toBe(false)
    expect(kvg.roleHasGenderedVoices(VOICES, 'known')).toBe(true)
  })

  it('a presentation role with no byGender keeps its one voice even when known has two', () => {
    const index = kvg.buildKnownGenderIndex(PAIRS)
    const r = kvg.resolveKnownVoiceForText({ voices: VOICES, role: 'presentation', text: 'मैं चाहता हूँ', index })
    expect(r.voice.name).toBe('Kriti')
    expect(r.gender).toBe('m') // the gender is still reported, the voice is the role's only one
  })

  it('voiceIdsForRole lists default plus byGender without duplicates', () => {
    expect(kvg.voiceIdsForRole(VOICES, 'known')).toEqual([
      'cartesia_5283efe8-07d1-4e3a-b615-2ae4a81c1b73',
      'cartesia_205fc552-2cce-4307-baa1-598b9dc3dd01',
    ])
    expect(kvg.voiceIdsForRole(VOICES, 'presentation')).toEqual(['cartesia_5283efe8-07d1-4e3a-b615-2ae4a81c1b73'])
    expect(kvg.voiceIdsForRole({}, 'known')).toEqual([])
  })
})

describe('per-clip resolution — what phase8 asks', () => {
  const ctx = {
    ...kvg.buildKnownGenderContext({
      courseCode: 'eng_for_hin', voices: VOICES, pairs: PAIRS,
      legos: [{ lego_id: 'S0001L02', known_text: 'मैं चाहता हूँ' }, { lego_id: 'S0001L03', known_text: 'अब' }],
    }),
    voices: VOICES,
  }

  it('a known clip takes the canonical id of the voice its text resolves to', () => {
    expect(kvg.knownVoiceIdForClip(ctx, { role: 'known', text: 'मैं चाहता हूँ' })).toBe('cartesia_205fc552-2cce-4307-baa1-598b9dc3dd01')
    expect(kvg.knownVoiceIdForClip(ctx, { role: 'known', text: 'मैं चाहती हूँ।' })).toBe('cartesia_5283efe8-07d1-4e3a-b615-2ae4a81c1b73')
  })

  it('target clips and unknown roles fall through (null)', () => {
    expect(kvg.knownVoiceIdForClip(ctx, { role: 'target1', text: 'I want' })).toBeNull()
    expect(kvg.knownVoiceIdForClip(ctx, { role: 'encouragement', text: 'x' })).toBeNull()
    expect(kvg.knownVoiceIdForClip(null, { role: 'known', text: 'मैं चाहता हूँ' })).toBeNull()
  })

  it('presentation falls through while the presentation role has one voice, even with a LEGO to follow', () => {
    expect(ctx.wantsPres).toBe(false)
    expect(kvg.knownVoiceIdForClip(ctx, { role: 'presentation', text: 'अंग्रेज़ी में — …', legoId: 'S0001L02' })).toBeNull()
  })

  it('with presentation byGender, an intro follows its LEGO\'s gender, and falls through with no LEGO', () => {
    const voices = { ...VOICES, presentation: { ...VOICES.presentation, byGender: VOICES.known.byGender } }
    const c2 = { ...kvg.buildKnownGenderContext({ courseCode: 'eng_for_hin', voices, pairs: PAIRS, legos: [{ lego_id: 'S0001L02', known_text: 'मैं चाहता हूँ' }] }), voices }
    expect(kvg.knownVoiceIdForClip(c2, { role: 'presentation', text: 'अंग्रेज़ी में — …', legoId: 'S0001L02' })).toBe('cartesia_205fc552-2cce-4307-baa1-598b9dc3dd01')
    expect(kvg.knownVoiceIdForClip(c2, { role: 'presentation', text: 'अंग्रेज़ी में — …', legoId: 'S9999L99' })).toBeNull()
    expect(kvg.knownVoiceIdForClip(c2, { role: 'presentation', text: 'अंग्रेज़ी में — …' })).toBeNull()
  })

  it('LEGO and seed texts are anchored female unless their grammar binds them (split is for practice phrases only)', () => {
    const c4 = { ...kvg.buildKnownGenderContext({ courseCode: 'eng_for_hin', voices: VOICES, pairs: PAIRS, legos: [{ lego_id: 'S0001L03', known_text: 'अब' }], seeds: [{ known_text: 'मैं कोशिश कर रहा हूँ।' }] }), voices: VOICES }
    expect(kvg.knownVoiceEntryForClip(c4, { role: 'known', text: 'अब' })).toMatchObject({ gender: 'f', source: 'anchor' })
    expect(kvg.knownVoiceEntryForClip(c4, { role: 'known', text: 'मैं कोशिश कर रहा हूँ।' })).toMatchObject({ gender: 'm', source: 'pair' })
    expect(kvg.knownVoiceEntryForClip(c4, { role: 'known', text: 'आपके साथ' }).source).toBe('hash')
  })

  it('a course with no byGender builds a context that wants nothing', () => {
    const c3 = kvg.buildKnownGenderContext({ courseCode: 'spa_for_eng', voices: { known: { voiceId: 'azure_x', provider: 'azure' } }, pairs: [], legos: [] })
    expect(c3).toMatchObject({ wantsKnown: false, wantsPres: false })
  })
})
