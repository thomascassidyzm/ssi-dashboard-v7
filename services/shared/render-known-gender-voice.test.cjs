import { describe, it, expect } from 'vitest'
const kv = require('./known-voice-gender.cjs')
const { knownGenderVoiceId } = require('./render-known-gender-voice.cjs')

const KRITI = 'cartesia_5283efe8-07d1-4e3a-b615-2ae4a81c1b73', REHAN = 'cartesia_205fc552-2cce-4307-baa1-598b9dc3dd01'
const voices = { known: { voiceId: KRITI, provider: 'cartesia', byGender: { f: { voiceId: KRITI, provider: 'cartesia' }, m: { voiceId: REHAN, provider: 'cartesia' } } } }
const M_LINE = 'मैं उससे बेहतर कर रहा हूँ जो मैं कल था', F_LINE = 'मैं उससे बेहतर कर रही हूँ जो मैं कल थी'
const ctx = kv.buildKnownGenderContext({ courseCode: 'eng_for_hin', voices, pairs: [{ expanded_m: M_LINE, expanded_f: F_LINE }] })
const loadCtx = async () => ({ ...ctx, voices }) // as knownGenderContextFor returns it
const ask = (o) => knownGenderVoiceId({ courseCode: 'eng_for_hin', voices, role: 'known', loadCtx, ...o })

describe('render route: gendered known line takes its own gender voice', () => {
  it('a male-form line asked for with no voiceId is Rehan, the female form Kriti', async () => {
    expect(await ask({ text: M_LINE })).toBe(REHAN)
    expect(await ask({ text: F_LINE })).toBe(KRITI)
  })
  it('never overrides a voice the caller named, a trial render, or a non-known role', async () => {
    expect(await ask({ text: M_LINE, voiceId: KRITI })).toBe(KRITI)
    expect(await ask({ text: M_LINE, trial: true })).toBe(null)
    expect(await ask({ text: M_LINE, role: 'target1' })).toBe(null)
  })
  it('is inert on a course with no byGender block', async () => {
    const plain = kv.buildKnownGenderContext({ courseCode: 'x', voices: { known: { voiceId: KRITI } }, pairs: [] })
    expect(await ask({ text: M_LINE, loadCtx: async () => ({ ...plain, voices: { known: { voiceId: KRITI } } }) })).toBe(null)
    expect(await ask({ text: M_LINE, loadCtx: async () => null })).toBe(null)
  })
})
