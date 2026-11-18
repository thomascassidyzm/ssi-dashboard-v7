/**
 * NO OPT-OUT FROM VOICE IDENTITY (job #303, Tom 2026-11-02: "no slot may play another slot's voice").
 * Pre-fix the route took voiceBound:false: the door then answered a male slot with the female clip of the same words, the
 * route's voice-bound re-link missed, and store() filed the FEMALE BYTES as a new row labelled with the MALE voice — the 9 Oct
 * Italian fault, made invisible to any check that compares files or voice labels. The route is voice-bound for every caller.
 * No network, no DB. Run: npx vitest run services/audio-render-voicebound-always.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { renderClip, validate } = require('./shared/audio-render-entry.cjs')

const ask = { courseCode: 'ita_for_eng', role: 'target2', text: 'sono stanco', purpose: 'test', requestedBy: 'test', voiceBound: false }

describe('the render route is voice-bound for every caller', () => {
  it('validate never lets voiceBound:false through', () => {
    expect(validate(ask).voiceBound).toBe(true)
  })
  it('the door is asked voice-bound even when the caller asked for any voice', async () => {
    const doors = []
    const deps = {
      resolve: async () => ({ language: 'ita', voiceId: 'cartesia_lorenzo', provider: 'cartesia', providerConfig: {} }),
      link: async () => null,
      speak: async (_t, _p, cfg) => { doors.push(cfg.door); return { audioBuffer: Buffer.from('x'), existingClip: null, charsSpent: 11 } },
      store: async () => ({ audioId: 'a1', s3Key: 'mastered/a1.mp3' }),
    }
    await renderClip(ask, deps)
    expect(doors.map(d => d.voiceBound)).toEqual([true])
  })
})
