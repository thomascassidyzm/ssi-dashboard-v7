/**
 * Unit tests for the TTS empty-response gate and the xAI degradation pacing.
 * Pure functions only — no network, no provider keys, no DB.
 * Run: npx vitest run services/tts-service
 *
 * Why these exist: the 2026-08-03 French batch wrote 567 target2 + ~75 known
 * clips that were 2,016-byte MP3 stubs of pure silence, because `response.ok`
 * was the only gate on the TTS response and the mastering chain laundered the
 * empty buffer into a well-formed playable file. These tests pin the gate that
 * makes that impossible.
 */

import { describe, it, expect } from 'vitest'

const {
  assertAudibleResponse,
  isRetriableTtsError,
  recordXaiOutcome,
  getXaiHealth,
  generateXai,
  TTS_MIN_AUDIO_MS,
} = require('./tts-service.cjs')

/** xAI's default output format: 128 kbps mp3. */
const XAI_BPS = 16000
/** Azure's Audio16Khz32KBitRateMonoMp3. */
const AZURE_BPS = 4000

const xai = (bytes) => () => assertAudibleResponse(Buffer.alloc(bytes), {
  provider: 'xai', bytesPerSecond: XAI_BPS, text: 'tout', voiceId: 'leo',
})

describe('assertAudibleResponse', () => {
  it('rejects the exact 2,016-byte stub the French batch produced', () => {
    expect(xai(2016)).toThrow(/empty-response gate/)
  })

  it('rejects a completely empty body', () => {
    expect(xai(0)).toThrow(/empty-response gate/)
    expect(() => assertAudibleResponse(null, {
      provider: 'xai', bytesPerSecond: XAI_BPS, text: 'tout', voiceId: 'leo',
    })).toThrow(/empty-response gate/)
  })

  it('passes the shortest real French renders measured off xAI/leo', () => {
    // "tout" 7,296 B, "ma" 7,680 B, "oui" 9,216 B — measured 2026-08-04.
    for (const bytes of [7296, 7680, 9216, 41088]) {
      expect(xai(bytes)).not.toThrow()
    }
  })

  it('scales the floor to the provider bitrate rather than a fixed byte count', () => {
    // 1,600 B is 400 ms of Azure audio — legitimate — but only 100 ms of xAI.
    expect(() => assertAudibleResponse(Buffer.alloc(1600), {
      provider: 'azure', bytesPerSecond: AZURE_BPS, text: 'oui', voiceId: 'fr-FR-X',
    })).not.toThrow()
    expect(xai(1600)).toThrow(/empty-response gate/)
  })

  it('puts the floor between the stub band and real speech on every provider', () => {
    for (const bps of [XAI_BPS, AZURE_BPS]) {
      const floor = Math.round((TTS_MIN_AUDIO_MS / 1000) * bps)
      const stubBytes = Math.round((0.192 * bps))   // the 192 ms worst-case stub
      const realBytes = Math.round((0.456 * bps))   // the 456 ms shortest real clip
      expect(stubBytes).toBeLessThan(floor)
      expect(realBytes).toBeGreaterThan(floor)
    }
  })

  it('names the byte count and the text so the failure is self-diagnosing', () => {
    expect(xai(2016)).toThrow(/2016 bytes/)
    expect(xai(2016)).toThrow(/tout/)
  })
})

describe('gate failures route through the existing retry budget', () => {
  it('is classified retriable, so generateWithRetry re-rolls it', () => {
    let err
    try { xai(2016)() } catch (e) { err = e }
    expect(isRetriableTtsError(err)).toBe(true)
  })

  it('is not mistaken for a fatal 4xx client error', () => {
    // The "(503)" marker must be the status the classifier reads — a stray
    // 3-digit number appearing first would silently turn this into a hard fail.
    let err
    try { xai(2016)() } catch (e) { err = e }
    expect(err.message.match(/\((\d{3})\)/)[1]).toBe('503')
  })
})

describe('xAI degradation pacing', () => {
  it('counts stubs against total requests for the batch report', () => {
    const before = getXaiHealth()
    recordXaiOutcome(true)
    recordXaiOutcome(false)
    const after = getXaiHealth()
    expect(after.requests).toBe(before.requests + 2)
    expect(after.stubs).toBe(before.stubs + 1)
    expect(after.stubRate).toBeGreaterThan(0)
  })

  it('trips a cooldown when the stub rate over a full window spikes', () => {
    const before = getXaiHealth().cooldowns
    // A healthy run must not trip it...
    for (let i = 0; i < 200; i++) recordXaiOutcome(true)
    expect(getXaiHealth().cooldowns).toBe(before)
    // ...but the 08-03 signature (rates climbing past 4%) must.
    for (let i = 0; i < 200; i++) recordXaiOutcome(false)
    expect(getXaiHealth().cooldowns).toBeGreaterThan(before)
  })
})


/**
 * A MISSING language on an xAI render is a hard fail, not a warn-and-default.
 * Until 2026-08-24 `generateXai` defaulted `language` to 'auto' and only
 * console.warn'd — and the multilingual voices are English-dominant, so an
 * unsteered render can speak Italian text with English phonology and still
 * look perfectly correct in the database. An explicit 'auto' is still allowed:
 * that is deliberate, Tom-validated tuning for pod explainers.
 */
describe('generateXai language steering', () => {
  const cfg = (extra) => ({ apiKey: 'k', voiceId: 'ara', ...extra })

  it('throws when no language is passed at all', async () => {
    await expect(generateXai('come stai', cfg())).rejects.toThrow(/explicit BCP-47 language/)
  })

  it('throws on an empty-string language', async () => {
    await expect(generateXai('come stai', cfg({ language: '' }))).rejects.toThrow(/explicit BCP-47 language/)
  })

  it('does not throw on an explicit auto (deliberate explainer tuning)', async () => {
    // Kept off the network by handing it an over-length text: the request is
    // refused by the length guard AFTER the language guard has already let
    // 'auto' through. If the language guard fired, this message would differ.
    await expect(generateXai('x'.repeat(15001), cfg({ language: 'auto' })))
      .rejects.toThrow(/limited to 15000 characters/)
  })
})
