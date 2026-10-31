import { describe, it, expect } from 'vitest'
import S from './as-in-store.cjs'
const { buildStore, planTwoPart, summariseTwoPart } = S

// Records as the #794/#836 plans + ledgers hand them in: the APPLIED keepAsIn, the score, the Tom-006 whole-intro clip.
const rec = (o) => ({ ctx: null, score: null, job: '#836', gradedAt: '2026-10-12', text: 't', ...o })
const store = buildStore([
  rec({ x: 'I want', ctx: 'I want to speak German with you', keep: true, score: 4, course: 'deu_for_eng', lego_id: 'S0001L01', clipId: 'clip-want-ctx' }),
  rec({ x: 'Chinese', ctx: 'I want to speak Chinese', keep: false, score: 2, course: 'zho_for_eng', lego_id: 'S0001L03', clipId: 'clip-chinese-bare' }),
  rec({ x: 'now', ctx: 'I want to speak now', keep: true, score: 3, course: 'fra_for_eng', lego_id: 'S0002L01', clipId: 'clip-now-ctx' }),
  rec({ x: 'Now', ctx: 'now I want', keep: false, score: 1, course: 'ita_for_eng', lego_id: 'S0002L01', clipId: 'clip-now-bare' }),
])

describe('two-part intro reuse (job #299, ruling r-2026-10-31 "intros are TWO separate audio files")', () => {
  it('plans part 2 as a pointer to an existing clip — a cut of a whole intro or a standalone clip — never a splice, and TTS only where no clip exists', () => {
    const keep = planTwoPart(store, { lego_id: 'S0001L01', known_text: 'I want', ctx: 'I want to speak German with you' })
    expect(keep.secondText).toBe(`'I want', as in — 'I want to speak German with you', is:`)
    expect(keep.part2).toMatchObject({ source: 'split-existing-whole', clip: 'clip-want-ctx', donorCourse: 'deu_for_eng', ttsChars: 0, cut: { afterWord: 3 } })

    const strip = planTwoPart(store, { lego_id: 'S0001L03', known_text: 'chinese', ctx: 'I want to speak Chinese' })
    expect(strip.secondText).toBe(`'chinese', is:`)
    expect(strip.part2).toMatchObject({ source: 'split-existing-whole', clip: 'clip-chinese-bare', ttsChars: 0 })

    // once a standalone second half exists it wins: nothing to cut
    const alone = planTwoPart(store, { lego_id: 'S0001L03', known_text: 'chinese' }, { [S.norm("'chinese', is:")]: 'standalone-1' })
    expect(alone.part2).toMatchObject({ source: 'existing-second-part', clip: 'standalone-1', ttsChars: 0 })

    // the LEGO's own current intro already says exactly this: cut its own
    const own = planTwoPart(store, { lego_id: 'S0005L01', known_text: 'I want', ctx: 'I want to go', currentText: `The Finnish for: 'I want', as in — 'I want to go', is:`, currentAudioId: 'fin-own' })
    expect(own.part2).toMatchObject({ source: 'split-own-whole', clip: 'fin-own', ttsChars: 0 })

    const none = planTwoPart(store, { lego_id: 'S0009L01', known_text: 'the sauna', ctx: 'I like the sauna' })
    expect(none.part2).toMatchObject({ source: 'new-recording', ttsText: `'the sauna', is:`, ttsChars: `'the sauna', is:`.length })

    for (const p of [keep, strip, alone, own, none]) { expect(p.part2.source).not.toBe('splice'); expect(p.recipe).toBeUndefined() }
  })

  it('a tie is stripped and flagged; the report counts LEGOs and distinct second halves per source and carries the one per-course prefix', () => {
    const p = planTwoPart(store, { lego_id: 'S0003L01', known_text: 'now', ctx: 'now we speak' })
    expect(p).toMatchObject({ match: 'strip', conflict: true, secondText: `'now', is:`, part2: { source: 'split-existing-whole', clip: 'clip-now-bare' } })
    const dup = planTwoPart(store, { lego_id: 'S0004L01', known_text: 'now', ctx: 'we say now' })
    const none = planTwoPart(store, { lego_id: 'S0009L01', known_text: 'the sauna' })
    const r = summariseTwoPart([p, dup, none], { lang: 'Finnish', prefix: { inLibrary: false } })
    expect(r).toMatchObject({ intros: 3, matched: 2, unmatched: 1, conflicts: 2, splice: 0, bySource: { 'split-existing-whole': 2, 'new-recording': 1 }, distinctBySource: { 'split-existing-whole': 1, 'new-recording': 1 }, prefix: { text: 'The Finnish for', inLibrary: false } })
    expect(r.ttsChars).toBe(`'the sauna', is:`.length)
  })
})
