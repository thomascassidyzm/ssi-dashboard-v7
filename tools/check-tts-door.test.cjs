/**
 * The TTS door gate (tools/check-tts-door.cjs) as a test, so the nightly run
 * fails the moment any tracked file calls a Cartesia/Azure TTS API outside
 * services/tts-service.cjs — and so the gate itself cannot quietly go blind.
 * Run: npx vitest run tools/check-tts-door.test.cjs
 */
import { describe, it, expect } from 'vitest'

const { findBypasses, scanRepo, DOOR } = require('./check-tts-door.cjs')

describe('the one TTS door has no bypass', () => {
  it('no tracked code file outside the door calls a TTS provider', () => {
    const offenders = scanRepo()
    expect(offenders.map(o => `${o.file}:${o.line} [${o.kind}]`)).toEqual([])
  })

  it('catches every shape of direct call the estate has actually used', () => {
    const hits = findBypasses({
      'tools/a.cjs': "const r = await fetch('https://api.cartesia.ai/tts/bytes', {",
      'tools/b.cjs': 'await fetch(`${CARTESIA_BASE}/tts/sse`, {',
      'tools/c.cjs': 'fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {',
      'tools/d.cjs': 'const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);',
      'tools/e.py': 'import azure.cognitiveservices.speech as speechsdk',
      'tools/f.js': "import Cartesia from '@cartesia/cartesia-js'",
    })
    expect(new Set(hits.map(h => h.file)).size).toBe(6)
  })

  it('does not flag voice listing, cloning, docs links or the door itself', () => {
    expect(findBypasses({
      'tools/list.cjs': 'fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`)',
      'tools/clone.cjs': 'fetch(`${CARTESIA_BASE}/voices/clone`, {',
      'tools/doc.cjs': ' *   https://docs.cartesia.ai/api-reference/tts/bytes',
      [DOOR]: "const endpoint = 'https://api.cartesia.ai/tts/bytes'",
    })).toEqual([])
  })
})
