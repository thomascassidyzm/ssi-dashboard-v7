import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { assertSpeakableExample } = require('./tts-service.cjs')

// tools/render-take-g.cjs cues xAI pod takes as 'Ja, [pause] natuurlijk.' (the xAI expressive-markup
// pause marker; audio-veracity.cjs counts 3,190 such clips) and sends them through generatePodAudio -> speak().
// The #195 "[bracket] is a label" door must not refuse that curated stage direction.
describe('speak() door vs the xAI [pause] cue', () => {
  it('does not refuse the [pause] markup cue as a label', () => {
    expect(() => assertSpeakableExample('Ja, [pause] natuurlijk.')).not.toThrow()
  })
})
