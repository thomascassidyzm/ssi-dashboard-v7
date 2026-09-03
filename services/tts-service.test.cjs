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
  isKnownSideOfHumanVoiceCourse,
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

// ─── Cartesia, wired forward-only 2026-08-27 ──────────────────────────────────
//
// These pin the three things that are easy to get wrong and impossible to see
// afterwards: that generate() actually routes the provider, that the request
// steers with `locale` rather than `language`, and that speed is pinned by
// default rather than left to the provider's own drift.

describe('generate() routes cartesia', () => {
  const CLONE = '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2'

  /** Stand in for the network, and hand back the request we would have sent. */
  function withStubbedFetch (run) {
    const nodeFetch = require('node-fetch')
    const mod = require.cache[require.resolve('node-fetch')]
    const original = mod.exports
    const calls = []
    const stub = async (url, opts) => {
      calls.push({ url, opts, body: JSON.parse(opts.body) })
      // 8 KB — comfortably over the audible floor, so the empty-response gate
      // passes and we are testing routing, not the gate.
      const bytes = Buffer.alloc(8192, 1)
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
      }
    }
    Object.keys(nodeFetch).forEach(k => { stub[k] = nodeFetch[k] })
    mod.exports = stub
    // tts-service captured `fetch` at require time, so it must be re-required
    // under the stub for the swap to reach it.
    delete require.cache[require.resolve('./tts-service.cjs')]
    const svc = require('./tts-service.cjs')
    return Promise.resolve(run(svc, calls)).finally(() => {
      mod.exports = original
      delete require.cache[require.resolve('./tts-service.cjs')]
    })
  }

  it('reaches Cartesia rather than throwing Unknown TTS provider', async () => {
    await withStubbedFetch(async (svc, calls) => {
      const out = await svc.generate('a five word English line', 'cartesia', {
        apiKey: 'test-key', voiceId: CLONE, locale: 'en-GB',
      })
      expect(calls).toHaveLength(1)
      expect(calls[0].url).toBe('https://api.cartesia.ai/tts/bytes')
      expect(calls[0].opts.headers['Cartesia-Version']).toBeTruthy()
      expect(calls[0].opts.headers.Authorization).toBe('Bearer test-key')
      expect(out.audioBuffer.length).toBe(8192)
      // Bytes, not timings — the same as xAI. Component splicing stays on Azure.
      expect(out.wordBoundaries).toBeNull()
    })
  })

  it('steers with locale, never with language, and names the voice by id', async () => {
    await withStubbedFetch(async (svc, calls) => {
      await svc.generate('venga, vamos a ver', 'cartesia', {
        apiKey: 'k', voiceId: CLONE, locale: 'es-ES',
      })
      const body = calls[0].body
      expect(body.locale).toBe('es-ES')
      expect(body.language).toBeUndefined()
      expect(body.voice).toEqual({ mode: 'id', id: CLONE })
      expect(body.model_id).toBe('sonic-3.6')
      expect(body.output_format.container).toBe('mp3')
    })
  })

  // Tom's ear ruling, 2026-08-27: sonic-3.6 is the better model, and the
  // full-quality and compressed renders of it are indistinguishable to him — so
  // the model moves forward and the small file STAYS. These two assertions are
  // one decision, and they belong in the same test: raising the sample rate
  // "for quality" is the failure this guards against.
  it('asks for sonic-3.6 at the small course format, not Cartesia 44.1 kHz default', async () => {
    await withStubbedFetch(async (svc, calls) => {
      await svc.generate('I am James. Pleased to meet you.', 'cartesia', {
        apiKey: 'k', voiceId: CLONE, locale: 'en-GB',
      })
      const body = calls[0].body
      expect(body.model_id).toBe('sonic-3.6')
      expect(body.output_format).toEqual({ container: 'mp3', sample_rate: 24000, bit_rate: 128000 })
      // A caller may still override, per voice — the defaults are not a cage.
      await svc.generate('again', 'cartesia', {
        apiKey: 'k', voiceId: CLONE, locale: 'en-GB', sampleRate: 44100,
      })
      expect(calls[1].body.output_format.sample_rate).toBe(44100)
    })
  })

  it('pins generation_config.speed by default, and lets a voice override it', async () => {
    // Not a preference: unpinned, take-to-take duration wander on a three-word
    // LEGO measured 104%; pinned, 38%. Cartesia has no seed parameter, so this
    // default is the only thing holding the drift down.
    await withStubbedFetch(async (svc, calls) => {
      await svc.generate('tri gair', 'cartesia', { apiKey: 'k', voiceId: CLONE, locale: 'cy-GB' })
      expect(calls[0].body.generation_config.speed).toBe(svc.CARTESIA_DEFAULT_SPEED)
      await svc.generate('tri gair', 'cartesia', { apiKey: 'k', voiceId: CLONE, locale: 'cy-GB', speed: 0.9 })
      expect(calls[1].body.generation_config.speed).toBe(0.9)
    })
  })

  it('refuses without a key or a voice rather than posting a nameless request', async () => {
    await withStubbedFetch(async (svc, calls) => {
      await expect(svc.generate('x', 'cartesia', { voiceId: CLONE, locale: 'en-GB' }))
        .rejects.toThrow(/API key/)
      await expect(svc.generate('x', 'cartesia', { apiKey: 'k', locale: 'en-GB' }))
        .rejects.toThrow(/voice id/)
      expect(calls).toHaveLength(0)
    })
  })
})

describe('the phonology gate covers cartesia, not just xai', () => {
  const { phonologySuspects, PHONOLOGY_GATED_PROVIDERS } = require('./tts-service.cjs')

  // The gate was `provider !== 'xai'` — a string equality. Wiring a second
  // English-dominant multilingual provider in without widening it would have
  // switched the gate off for that provider silently: no error, no warning, an
  // unguarded render path. The 2026-07-10 Italian pilot ('come stai' read with
  // English phonology) is what the gate is for; Cartesia has the same exposure.
  it('guards a Cartesia render steered to a non-English language', () => {
    const suspects = phonologySuspects('cartesia', { locale: 'it-IT' })
    expect(suspects).not.toBeNull()
    expect(suspects.has('en')).toBe(true)
  })

  it('reads the steer from locale as well as language', () => {
    // A gate that only looked at `language` would find nothing to guard on the
    // Cartesia path, which steers with `locale`.
    expect(phonologySuspects('cartesia', { locale: 'it-IT' })).not.toBeNull()
    expect(phonologySuspects('xai', { language: 'it-IT' })).not.toBeNull()
  })

  it('still does not apply to Azure, and still stands down on English', () => {
    expect(phonologySuspects('azure', { language: 'it-IT' })).toBeNull()
    expect(phonologySuspects('cartesia', { locale: 'en-GB' })).toBeNull()
    expect(phonologySuspects('cartesia', { locale: 'it-IT', phonologyGate: false })).toBeNull()
  })

  it('names both gated providers so a third cannot be added by forgetting', () => {
    expect([...PHONOLOGY_GATED_PROVIDERS].sort()).toEqual(['cartesia', 'xai'])
  })
})

/**
 * The same steering ruling as generateXai's, applied to the second provider
 * with the same exposure. Added when Cartesia was wired, 2026-08-27: main had
 * already turned the xAI warn into a hard fail on 2026-08-24, and shipping a
 * new provider with the older, softer behaviour would have quietly reopened the
 * hole for every Cartesia course.
 */
describe('generateCartesia locale steering', () => {
  const { generateCartesia } = require('./tts-service.cjs')
  const cfg = (extra) => ({ apiKey: 'k', voiceId: '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2', ...extra })

  it('throws when no locale is passed at all', async () => {
    await expect(generateCartesia('come stai', cfg())).rejects.toThrow(/explicit BCP-47 locale/)
  })

  it('throws on an empty-string locale', async () => {
    await expect(generateCartesia('come stai', cfg({ locale: '' }))).rejects.toThrow(/explicit BCP-47 locale/)
  })

  it('accepts the language field as a steer, for the call sites that name it that', async () => {
    // Must not throw the locale error — it gets as far as the network, which is
    // where this test stops caring.
    await expect(generateCartesia('come stai', cfg({ language: 'it-IT', apiKey: '' })))
      .rejects.toThrow(/API key/)
  })
})


/**
 * THE HUMAN-VOICE GATE, narrowed (Tom, 2026-09-03: "the English lines will be
 * TTS, because it is fast and cheap").
 *
 * A human-voice course may synthesise its KNOWN side and nothing else. These
 * pin the only question that matters: can a Welsh clip get through? The
 * dangerous case is the one that used to look safe — isHumanVoiceLang speaks
 * database codes ('cym') and a TTS config speaks BCP-47 ('cy'), so the guard
 * must never be written as "is this language human-voiced".
 */
describe('a human-voice course may synthesise its known side only', () => {
  it('lets the English gloss of a Welsh course through', () => {
    expect(isKnownSideOfHumanVoiceCourse('cym_n_for_eng', 'en')).toBe(true)
    expect(isKnownSideOfHumanVoiceCourse('cym_n_for_eng', 'en-GB')).toBe(true)
    expect(isKnownSideOfHumanVoiceCourse('cym_n_for_eng', 'eng')).toBe(true)
  })

  it('NEVER lets Welsh through, in any spelling', () => {
    for (const tag of ['cy', 'cy-GB', 'cym', 'cym_n', 'welsh']) {
      expect(isKnownSideOfHumanVoiceCourse('cym_n_for_eng', tag)).toBe(false)
      expect(isKnownSideOfHumanVoiceCourse('cym_s_for_eng', tag)).toBe(false)
    }
  })

  it('refuses when no language is stated — silence is not permission', () => {
    expect(isKnownSideOfHumanVoiceCourse('cym_n_for_eng', null)).toBe(false)
    expect(isKnownSideOfHumanVoiceCourse('cym_n_for_eng', '')).toBe(false)
    expect(isKnownSideOfHumanVoiceCourse('cym_n_for_eng', undefined)).toBe(false)
  })

  it('holds for the other human-voice courses on their own known sides', () => {
    expect(isKnownSideOfHumanVoiceCourse('bre_for_fra', 'fr')).toBe(true)
    expect(isKnownSideOfHumanVoiceCourse('bre_for_fra', 'br')).toBe(false)
    expect(isKnownSideOfHumanVoiceCourse('pdc_for_eng', 'en')).toBe(true)
    expect(isKnownSideOfHumanVoiceCourse('pdc_for_eng', 'de')).toBe(false)
  })

  it('reads the known side off the COURSE CODE, including non-English ones', () => {
    // 'jpn' does not start with 'ja' — a prefix test passes this file and
    // fails here, which is why the table is explicit.
    expect(isKnownSideOfHumanVoiceCourse('cym_anthem_for_jpn', 'ja')).toBe(true)
    expect(isKnownSideOfHumanVoiceCourse('cym_anthem_for_jpn', 'cy')).toBe(false)
    expect(isKnownSideOfHumanVoiceCourse('cym_for_yor', 'yo')).toBe(true)
    expect(isKnownSideOfHumanVoiceCourse('cym_for_yor', 'cy')).toBe(false)
  })

  it('refuses a course code it cannot parse', () => {
    expect(isKnownSideOfHumanVoiceCourse('cym_n', 'en')).toBe(false)
    expect(isKnownSideOfHumanVoiceCourse('', 'en')).toBe(false)
  })
})
