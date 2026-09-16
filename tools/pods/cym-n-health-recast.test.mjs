/**
 * The rule this recast exists to enforce: NO EXCHANGE IN THE POD PUTS TWO
 * PEOPLE OF THE SAME SEX FACING EACH OTHER, and no female-marked reference to
 * the ward patient survives.
 *
 * Both fixtures are the real pod's own words. The `before` one is what was
 * stored on 2026-09-16 — two speaker labels, a woman called Peggy talking to a
 * woman called Siân — and it must FAIL both checks, because a test that passes
 * on the broken state proves nothing about the fixed one.
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const R = createRequire(import.meta.url)('./cym-n-health-recast.cjs')

// scene 2, flow-01, the four turns that name the ward patient.
const BEFORE = [
  { id: 'a', scene_number: 2, variant_key: 'flow-01', speaker: 'HW', english_text: "Hello, my name's Siân, I'm one of the nurses.", target_text: 'Helô — Siân dw i.' },
  { id: 'b', scene_number: 2, variant_key: 'flow-01', speaker: 'P', english_text: 'Margaret. But everyone calls me Peggy.', target_text: 'Margaret. Ond Peggy mae pawb yn fy ngalw i.' },
  { id: 'c', scene_number: 3, variant_key: 'flow-02', speaker: 'P', english_text: 'My husband wants to come this evening.', target_text: 'Mae fy ngŵr i isio dod heno.' },
  { id: 'd', scene_number: 3, variant_key: 'flow-02', speaker: 'HW', english_text: 'Visiting is two till eight.', target_text: "Mae'r oriau ymweld o ddau tan wyth." },
]

// The same four turns after the recast: four labels, a man called Wil, a wife.
const AFTER = [
  { ...BEFORE[0], speaker: R.NURSE },
  { ...BEFORE[1], speaker: R.WARD_PATIENT, english_text: 'William. But everyone calls me Wil.', target_text: 'William. Ond Wil mae pawb yn fy ngalw i.' },
  { ...BEFORE[2], speaker: R.WARD_PATIENT, english_text: 'My wife wants to come this evening.', target_text: 'Mae fy ngwraig i isio dod heno.' },
  { ...BEFORE[3], speaker: R.NURSE },
]

describe('cym_n health recast', () => {
  it('the two-label script has no casting that avoids same-sex exchanges', () => {
    // HW and P are not in the cast at all — two labels cannot carry four people,
    // which is the structural half of the failure.
    expect(R.sameSexExchanges(BEFORE).length).toBeGreaterThan(0)
  })

  it('the female ward patient is detectable in the pre-rewrite words', () => {
    expect(R.femaleResidue(BEFORE).length).toBeGreaterThan(0)
  })

  it('after the recast, zero same-sex exchanges and zero female residue', () => {
    expect(R.sameSexExchanges(AFTER)).toEqual([])
    expect(R.femaleResidue(AFTER)).toEqual([])
  })

  it('splits the one HW label into the nurse and the doctor at the Part 2 seam', () => {
    expect(R.speakerFor(12, 'HW')).toBe(R.NURSE)
    expect(R.speakerFor(13, 'HW')).toBe(R.DOCTOR)
    expect(R.speakerFor(12, 'P')).toBe(R.WARD_PATIENT)
    expect(R.speakerFor(13, 'P')).toBe(R.GP_PATIENT)
  })

  it('casts both men to Aran and both women to Catrin Lliar', () => {
    expect(R.CAST[R.WARD_PATIENT].voiceId).toBe('human_aran_cym_n')
    expect(R.CAST[R.GP_PATIENT].voiceId).toBe('human_aran_cym_n')
    expect(R.CAST[R.NURSE].voiceId).toBe('human_catrinlliar_cym_n')
    expect(R.CAST[R.DOCTOR].voiceId).toBe('human_catrinlliar_cym_n')
  })
})
