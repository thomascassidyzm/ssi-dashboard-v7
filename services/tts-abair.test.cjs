/**
 * ABAIR (Trinity's Irish TTS) is a Voice Lab TRIAL provider only — job #525, Kai 2026-11-09.
 * No network, no key: node-fetch is stubbed and hands back the request we would have sent.
 * Run: npx vitest run services/tts-abair.test.cjs
 */
import { describe, it, expect } from 'vitest'

const clipLibraryModule = require('./shared/clip-library.cjs')
clipLibraryModule.useClipLibrary(clipLibraryModule.memoryClipLibrary([]))
const { canonicalVoiceId } = require('./shared/clip-identity.cjs')

/** A 1-second 16 kHz mono 16-bit WAV, base64 — what ABAIR's JSON answer carries in audioContent. */
function wav (seconds = 1, rate = 16000) {
  const pcm = Buffer.alloc(rate * 2 * seconds, 1)
  return require('./tts-service.cjs').pcm16ToWav(pcm, rate, 1)
}

function withStubbedFetch (answer, run) {
  const nodeFetch = require('node-fetch')
  const mod = require.cache[require.resolve('node-fetch')]
  const original = mod.exports
  const calls = []
  const stub = async (url, opts = {}) => { calls.push({ url, opts, body: opts.body ? JSON.parse(opts.body) : null }); return answer(url, opts) }
  Object.keys(nodeFetch).forEach(k => { stub[k] = nodeFetch[k] })
  mod.exports = stub
  delete require.cache[require.resolve('./tts-service.cjs')]
  const svc = require('./tts-service.cjs')
  return Promise.resolve(run(svc, calls)).finally(() => {
    mod.exports = original
    delete require.cache[require.resolve('./tts-service.cjs')]
  })
}

const ok = () => ({ ok: true, status: 200, json: async () => ({ audioContent: wav().toString('base64'), normalised_text: 'x' }) })
const trialCfg = (extra = {}) => ({ apiKey: 'secret-abair-key', voiceId: 'neasa', language: 'gle', door: { trial: true, language: 'gle' }, ...extra })

describe('ABAIR trial provider', () => {
  it('an abair_ voice id is its own identity, never read as another provider', () => {
    expect(canonicalVoiceId('abair_neasa')).toBe('abair_neasa')
    expect(canonicalVoiceId('nnc.piper', { provider: 'abair' })).toBe('abair_nnc.piper')
  })

  it('a trial render sends one POST to /v4/synthesis with the key in the abair-api-key header, WAV in JSON', async () => {
    await withStubbedFetch(ok, async (svc, calls) => {
      const out = await svc.generate('Tá mé tuirseach', 'abair', trialCfg(), 1)
      expect(calls).toHaveLength(1)
      expect(calls[0].url).toBe('https://api.abair.ie/v4/synthesis?outputType=JSON&audioEncoding=WAV')
      expect(calls[0].opts.headers['abair-api-key']).toBe('secret-abair-key')
      expect(calls[0].body).toEqual({ input: 'Tá mé tuirseach', voice: 'neasa' })
      expect(out.audioBuffer.toString('ascii', 0, 4)).toBe('RIFF')
    })
  })

  it('refuses a NON-trial render before any request is sent — ABAIR is never a course voice', async () => {
    await withStubbedFetch(ok, async (svc, calls) => {
      await expect(svc.generate('Tá mé tuirseach', 'abair', trialCfg({ door: { language: 'gle' } }), 1)).rejects.toThrow(/trial provider only/)
      expect(calls).toHaveLength(0)
    })
  })

  it('never echoes the key in an error, and a 4xx is not retried', async () => {
    const bad = () => ({ ok: false, status: 403, text: async () => '{"code":"VOICE_RESTRICTED","echo":"secret-abair-key"}' })
    await withStubbedFetch(bad, async (svc, calls) => {
      const err = await svc.generate('Is mian liom', 'abair', trialCfg(), 3).catch(e => e)
      expect(err.message).toMatch(/\(403\)/)
      expect(err.message).not.toContain('secret-abair-key')
      expect(calls).toHaveLength(1)
    })
  })

  it('reads the WAV byte rate from the header for the empty-response gate', () => {
    const { wavByteRate } = require('./tts-service.cjs')
    expect(wavByteRate(wav(1, 22050))).toBe(44100)
    expect(wavByteRate(Buffer.from('not a wav'))).toBe(32000)
  })
})
