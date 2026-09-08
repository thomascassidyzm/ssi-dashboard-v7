/**
 * ONE PRESS, SIX SLOTS, AND NO REFUSAL SWALLOWED.
 *
 * Tom, 2026-09-08: "not to have to repeat it 4/5 times … I want to be able to
 * satisfy that whole language in one go". Casting is staged and saved once, so
 * the thing worth pinning is what ONE press actually sends and what it does
 * with a slot the server refuses — because the worst outcome on this screen is
 * a page that reports success while a PUT 409'd behind it.
 *
 * Before this landed there was nothing to test: every tap fired its own PUT.
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { planCast, commitCast, saveSentence } from './stagedCast'

const KEYS = ['eng:phrase:m:1', 'eng:phrase:m:2', 'eng:phrase:f:1', 'eng:phrase:f:2', 'eng:guide:-:1', 'eng:guide:-:2']

const slot = (s, gender, rank) => ({ slot: s, gender, rank })

/** A language mid-edit: two casts, one clear, staged in a deliberately odd order. */
function staged () {
  return {
    'eng:guide:-:1': { action: 'cast', slot: slot('guide', undefined, 1), voiceId: 'gemma', voiceName: 'Gemma', label: 'guide · primary' },
    'eng:phrase:f:1': { action: 'cast', slot: slot('phrase', 'f', 1), voiceId: 'bella', voiceName: 'Bella', label: 'female · primary' },
    'eng:phrase:m:2': { action: 'clear', slot: slot('phrase', 'm', 2), label: 'male · backup' },
  }
}

describe('planCast', () => {
  it('clears first, then casts, each in the page\'s reading order', () => {
    const plan = planCast(staged(), KEYS)
    expect(plan.map((s) => `${s.action}:${s.key}`)).toEqual([
      'clear:eng:phrase:m:2',
      'cast:eng:phrase:f:1',
      'cast:eng:guide:-:1',
    ])
  })

  it('never drops a staged change whose key is not in the order', () => {
    const plan = planCast({ ...staged(), 'zzz:phrase:m:1': { action: 'cast', slot: slot('phrase', 'm', 1), voiceId: 'x', label: 'x' } }, KEYS)
    expect(plan).toHaveLength(4)
  })
})

describe('commitCast', () => {
  it('makes exactly the expected calls on one press, and no more', async () => {
    const castSlot = vi.fn().mockResolvedValue({ skipped: [] })
    const clearSlot = vi.fn().mockResolvedValue({})
    const out = await commitCast(planCast(staged(), KEYS), { castSlot, clearSlot })

    expect(clearSlot).toHaveBeenCalledTimes(1)
    expect(clearSlot).toHaveBeenCalledWith({ slot: 'phrase', gender: 'm', rank: 2 })
    expect(castSlot.mock.calls.map((c) => c[0])).toEqual([
      { slot: 'phrase', gender: 'f', rank: 1, voiceId: 'bella' },
      { slot: 'guide', gender: undefined, rank: 1, voiceId: 'gemma' },
    ])
    expect(out.landed).toHaveLength(3)
    expect(out.failed).toEqual([])
  })

  it('reports a refused slot by name instead of swallowing it, and finishes the rest', async () => {
    // The human-recorded guard and the consent block both answer as a 409 here.
    const castSlot = vi.fn()
      .mockRejectedValueOnce(new Error('every course on this role is human-recorded'))
      .mockResolvedValue({ skipped: [] })
    const clearSlot = vi.fn().mockResolvedValue({})
    const out = await commitCast(planCast(staged(), KEYS), { castSlot, clearSlot })

    expect(out.failed).toHaveLength(1)
    expect(out.failed[0]).toMatchObject({ key: 'eng:phrase:f:1', label: 'female · primary' })
    expect(out.failed[0].message).toMatch(/human-recorded/)
    // The refusal did not stop the guide cast behind it.
    expect(out.landed.map((l) => l.key)).toEqual(['eng:phrase:m:2', 'eng:guide:-:1'])
    expect(saveSentence(out)).toMatch(/2 slots saved · 1 refused: female · primary — every course/)
  })

  it('keeps the courses the server said a cast did not reach', async () => {
    const castSlot = vi.fn().mockResolvedValue({ skipped: [{ course: 'cym_n_for_eng', roles: ['known'] }] })
    const out = await commitCast(planCast(staged(), KEYS), { castSlot, clearSlot: vi.fn().mockResolvedValue({}) })
    expect(out.skipped).toHaveLength(2)
    expect(out.skipped[0].course).toBe('cym_n_for_eng')
  })
})

/**
 * The panel must actually USE this. A per-tap write that came back would give
 * the "repeat it 4/5 times" page back without failing anything above.
 */
describe('LanguagesPanel wiring', () => {
  const src = readFileSync(fileURLToPath(new URL('./LanguagesPanel.vue', import.meta.url)), 'utf8')

  it('saves the language on one press rather than writing on every tap', () => {
    expect(src).toMatch(/commitCast\(/)
    expect(src).toMatch(/@click="saveCast\(lang\)"/)
    // No immediate per-slot write survives: casting and clearing only stage.
    expect(src).not.toMatch(/@cast="cast\(lang, slot/)
    expect(src).not.toMatch(/@click="clear\(lang, slot\)"/)
  })

  it('draws the candidate list once for the language, not once per slot', () => {
    expect(src.match(/<CandidateVoices/g) || []).toHaveLength(1)
  })
})
