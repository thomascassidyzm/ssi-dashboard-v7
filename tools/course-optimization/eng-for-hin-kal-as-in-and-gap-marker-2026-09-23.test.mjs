/**
 * eng_for_hin कल / gap-marker sweep (job #845·H, 2026-09-23) — the rule as a test.
 *
 * Pre-fix rows (as the redo agent left them on 2026-09-11/13) FAIL the seed-words rule
 * (canon L26 / K11); the planned rows PASS it, and each कल introduction quotes its own
 * seed as the "as in" context (L24) without naming the sister sense (PR2 / K23(c)).
 * No DB, no network.
 */
import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const requireCjs = createRequire(import.meta.url)
const t = requireCjs('./eng-for-hin-kal-as-in-and-gap-marker-2026-09-23.cjs')

const SEEDS = [
  { seed_number: 15, known_text: 'और मैं चाहता हूँ कि आप कल मेरे साथ अंग्रेज़ी बोलें।', approved_at: '2026-09-23T12:14:29Z' },
  { seed_number: 30, known_text: 'मैं कल आपसे कुछ पूछना चाहता था।', approved_at: '2026-09-23T12:14:31Z' },
  { seed_number: 132, known_text: 'यह उससे कम रोमांचक है जो वह कह रही थी।', approved_at: '2026-09-13T12:39:45Z' },
]
// The live rows before the sweep — the redo agent's glosses and marker.
const PRE_FIX = [
  { lego_id: 'S0015L03', known_text: '(आने वाला) कल', target_text: 'tomorrow', version: 1, presentation_audio_id: null },
  { lego_id: 'S0030L03', known_text: '(बीता हुआ) कल', target_text: 'yesterday', version: 2, presentation_audio_id: 'stale-eve' },
  { lego_id: 'S0132L02', known_text: 'उससे ( ) जो वह कह रही थी', target_text: 'than what she was saying', version: 2, presentation_audio_id: 'stale-xai-eve' },
]

describe('L26: a LEGO carries only words its own seed says', () => {
  it('the pre-fix glosses and marker fail', () => {
    for (const l of PRE_FIX) {
      const seed = SEEDS.find((s) => t.EDITS.find((e) => e.lego_id === l.lego_id).seed === s.seed_number)
      expect(t.legoWordsInSeed(l.known_text, seed.known_text), l.lego_id).toBe(false)
    }
  })
  it('the planned texts pass', () => {
    const plan = t.planEdits({ legos: PRE_FIX, seeds: SEEDS })
    expect(plan.map((p) => p.after)).toEqual(['कल', 'कल', 'उससे जो वह कह रही थी'])
    for (const p of plan) expect(t.legoWordsInSeed(p.after, p.seed_known), p.lego_id).toBe(true)
  })
})

describe('L24 / K23: the sense lives in an "as in" introduction, not in the LEGO', () => {
  const plan = t.planEdits({ legos: PRE_FIX, seeds: SEEDS })
  it('both कल LEGOs get a Frame B line quoting their own seed', () => {
    expect(plan[0].intro_text).toBe("अंग्रेज़ी में — 'कल' — जैसे — 'और मैं चाहता हूँ कि आप कल मेरे साथ अंग्रेज़ी बोलें।' — में :")
    expect(plan[1].intro_text).toBe("अंग्रेज़ी में — 'कल' — जैसे — 'मैं कल आपसे कुछ पूछना चाहता था।' — में :")
  })
  it('phase8 would judge those rows fresh (they quote the current chunk)', () => {
    for (const p of plan.filter((p) => p.intro_text)) expect(t.introQuotesChunk(p.intro_text, p.after)).toBe(true)
  })
  it('neither line names the sister sense (PR2)', () => {
    for (const p of plan.filter((p) => p.intro_text)) expect(t.namesSister(p.intro_text)).toBe(false)
    expect(t.namesSister("अंग्रेज़ी में — 'आने वाला कल' — में :")).toBe(true)
  })
  it('the gap-marker LEGO gets no introduction here (the Kriti re-author pass decides its frame)', () => {
    expect(plan[2].intro_text).toBeNull()
  })
})

describe('the plan refuses when the live row is not what it expects', () => {
  it('a LEGO already changed under it', () => {
    const moved = PRE_FIX.map((l) => (l.lego_id === 'S0015L03' ? { ...l, known_text: 'कल' } : l))
    expect(() => t.planEdits({ legos: moved, seeds: SEEDS })).toThrow(/S0015L03: live known_text/)
  })
  it('a target that moved', () => {
    const moved = PRE_FIX.map((l) => (l.lego_id === 'S0030L03' ? { ...l, target_text: 'the day before' } : l))
    expect(() => t.planEdits({ legos: moved, seeds: SEEDS })).toThrow(/S0030L03: live target_text/)
  })
})
