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

describe('job #430: every paid provider, and every guarded door calls the guard', () => {
  const { GUARDED_DOORS, BAKEOFF_ADAPTERS } = require('./check-tts-door.cjs')
  const fs = require('fs')
  const path = require('path')
  const ROOT = path.resolve(__dirname, '..')

  it('catches ElevenLabs, xAI, Google, OpenAI, MiniMax, Polly, Deepgram and an unnamed api.* TTS host — and not a provider name', () => {
    const hits = findBypasses({
      'tools/el.cjs': 'await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {',
      'tools/el2.js': "const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js')",
      'tools/el3.py': 'audio = client.text_to_speech.convert(voice_id=v, text=t)',
      'tools/xai.cjs': "const res = await fetch('https://api.x.ai/v1/tts', {",
      'tools/g.cjs': "const tts = require('@google-cloud/text-to-speech')",
      'tools/g2.sh': 'curl -X POST "https://texttospeech.googleapis.com/v1/text:synthesize" -d @req.json',
      'tools/oa.py': 'client.audio.speech.create(model="gpt-4o-mini-tts", voice="alloy", input=t)',
      'tools/mm.cjs': "fetch('https://api-uw.minimax.io/v1/t2a_v2', {",
      'tools/polly.js': "import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly'",
      'tools/dg.sh': 'curl https://api.deepgram.com/v1/speak?model=aura -d "{}"',
      'tools/new.cjs': "fetch('https://api.somevoice.example/v2/text-to-speech', {",
    })
    expect(new Set(hits.map(h => h.file)).size).toBe(11)
    // …and the widened patterns do not flag provider NAMES, voice listings or docs links.
    expect(findBypasses({
      'tools/a.cjs': "if (provider === 'elevenlabs') return { apiKey: process.env.ELEVENLABS_API_KEY, voiceId }",
      'tools/b.cjs': ' *     GET https://api.x.ai/v1/tts/voices/{voice_id}',
      'tools/c.cjs': " *   https://elevenlabs.io/docs/api-reference/text-to-speech/convert",
    })).toEqual([])
  })

  it('every guarded door calls the spend guard before its provider call', () => {
    for (const f of GUARDED_DOORS) expect(fs.readFileSync(path.join(ROOT, f), 'utf8'), f).toMatch(/beforeProviderCall\(/)
  })

  it('the bake-off adapters describe requests but never send one themselves', () => {
    const dir = path.join(ROOT, 'tools/tts-bakeoff/adapters')
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.cjs'))) {
      expect(BAKEOFF_ADAPTERS.test(`tools/tts-bakeoff/adapters/${f}`)).toBe(true)
      expect(fs.readFileSync(path.join(dir, f), 'utf8'), f).not.toMatch(/\bfetch\(|axios|https?\.request\(|child_process/)
    }
  })
})
