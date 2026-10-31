import { describe, it, expect } from 'vitest'
import S from './as-in-store.cjs'
const { buildStore, planIntro, summarise } = S

// Records as the #794/#836 plans + ledgers hand them in: the APPLIED keepAsIn, the score, the Tom-006 clip.
const rec = (o) => ({ ctx: null, score: null, job: '#836', gradedAt: '2026-10-12', text: 't', ...o })
const store = buildStore([
  rec({ x: 'I want', ctx: 'I want to speak German with you', keep: true, score: 4, course: 'deu_for_eng', lego_id: 'S0001L01', clipId: 'clip-want-ctx' }),
  rec({ x: 'I want', ctx: 'I want to speak Chinese with you now', keep: true, score: 3, course: 'zho_for_eng', lego_id: 'S0001L01', clipId: 'clip-want-zho' }),
  rec({ x: 'Chinese', ctx: 'I want to speak Chinese', keep: false, score: 2, course: 'zho_for_eng', lego_id: 'S0001L03', clipId: 'clip-chinese-bare' }),
  // a conflict: one course kept, one stripped => tie => strip (Tom: as-in only when the context needs it)
  rec({ x: 'now', ctx: 'I want to speak now', keep: true, score: 3, course: 'fra_for_eng', lego_id: 'S0002L01', clipId: 'clip-now-ctx' }),
  rec({ x: 'Now', ctx: 'now I want', keep: false, score: 1, course: 'ita_for_eng', lego_id: 'S0002L01', clipId: 'clip-now-bare' }),
])

describe('as-in intro reuse (job #294)', () => {
  it('a graded English prompt yields its decision and a spliced plan with zero TTS; an ungraded one is TTS-needed', () => {
    const keep = planIntro(store, { lego_id: 'S0001L01', known_text: 'I want', ctx: 'I want to speak German with you' }, 'Finnish')
    expect(keep).toMatchObject({ match: 'keep', recipe: 'splice', donor: { id: 'clip-want-ctx' }, ttsChars: 0 })
    expect(keep.newText).toBe(`The Finnish for: 'I want', as in — 'I want to speak German with you', is: <break time="300ms"/>`)
    expect(keep.avoidedChars).toBe(keep.newText.length)

    const strip = planIntro(store, { lego_id: 'S0001L03', known_text: 'chinese', ctx: 'I want to speak Chinese' }, 'Finnish')
    expect(strip).toMatchObject({ match: 'strip', recipe: 'splice', donor: { id: 'clip-chinese-bare' }, ttsChars: 0, newText: `The Finnish for: 'chinese', is: <break time="300ms"/>` })

    const none = planIntro(store, { lego_id: 'S0009L01', known_text: 'the sauna', ctx: 'I like the sauna' }, 'Finnish')
    expect(none).toMatchObject({ match: null, recipe: 'tts', ttsText: `'the sauna', is:` })
    expect(none.ttsChars).toBe(`'the sauna', is:`.length)
  })

  it('a disagreement is recorded, defaults to strip on a tie, and is counted in the report', () => {
    expect(store.entries.now).toMatchObject({ decision: 'strip', conflict: true, votes: { keep: 1, strip: 1 } })
    expect(store.conflicts).toBe(1)
    const p = planIntro(store, { lego_id: 'S0003L01', known_text: 'now', ctx: 'now we speak' }, 'Finnish')
    expect(p).toMatchObject({ match: 'strip', conflict: true, recipe: 'splice', donor: { id: 'clip-now-bare' } })
    // keep with a context no course recorded: the LEGO's own intro already says it => zero TTS, no change
    const own = planIntro(store, { lego_id: 'S0005L01', known_text: 'I want', ctx: 'I want to go', currentText: `The Finnish for: 'I want', as in — 'I want to go', is:`, currentAudioId: 'fin-own' }, 'Finnish')
    expect(own).toMatchObject({ recipe: 'keep-own', ttsChars: 0, donor: { id: 'fin-own' } })
    const r = summarise([p, own, planIntro(store, { lego_id: 'S0009L01', known_text: 'the sauna' }, 'Finnish')], { lang: 'Finnish', frameInLibrary: false })
    expect(r).toMatchObject({ intros: 3, matched: 2, unmatched: 1, conflicts: 1, frame: { text: 'The Finnish for', inLibrary: false, chars: 15 } })
    expect(r.ttsChars).toBe(`'the sauna', is:`.length + 15)
  })
})
