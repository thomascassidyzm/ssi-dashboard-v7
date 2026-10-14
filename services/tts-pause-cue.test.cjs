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
  it('still refuses other brackets/braces and cue-only text', () => {
    for (const t of ['[progressive]', 'she {masc} goes', 'Ja, [pause] [atom] x', '[pause]']) {
      expect(() => assertSpeakableExample(t)).toThrow(/not-an-example/)
    }
  })
  it('shares one cue list with audio-veracity', () => {
    const v = require('./audio-veracity.cjs')
    expect(v.stripSynthesisCues('Ja, [pause] natuurlijk.')).toBe('Ja, natuurlijk.')
  })
  it('phase8 /generate returns NOT_SPEAKABLE rows; ara-lb sweep appends to an open audio request', () => {
    const fs = require('fs')
    const p8 = fs.readFileSync(require.resolve('./phases/phase8-audio-v13.cjs'), 'utf8')
    expect(p8).toMatch(/dataErrors: results\.dataErrors,/)
    expect(p8).toMatch(/results\.errors\.push\(\{[^}]*DATA ERROR \(NOT_SPEAKABLE\)/)
    const ara = fs.readFileSync(require.resolve('../tools/course-optimization/ara-lb-progressive-label-2026-10-11.cjs'), 'utf8')
    expect(ara).toMatch(/append: true, metadataKey: SWEEP/)
  })
})
