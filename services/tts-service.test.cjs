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
  TTS_MIN_AUDIO_MS,
  isKnownSideOfHumanVoiceCourse,
  generate,
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

/**
 * CARTESIA (2026-09-03). xAI is being wound down, and until this landed the
 * chokepoint could only reach azure / elevenlabs / xai — so the only Cartesia
 * audio in the estate was made by one-off scripts talking to the API directly,
 * skipping mastering, the audible-response floor and the veracity gate. These
 * pin the vendor details that were verified against a live 200, not read off
 * the docs, plus the two guards the first probe actually tripped.
 */
describe('cartesia is a first-class provider at the chokepoint', () => {
  const { buildCartesiaRequest } = require('./tts-service.cjs')

  const base = {
    apiKey: 'k',
    voiceId: 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2',
    language: 'en-GB',
  }
  const req = (over = {}) => buildCartesiaRequest('Good afternoon.', { ...base, ...over })

  it('strips the estate prefix — the vendor wants the bare uuid', () => {
    expect(req().body.voice).toEqual({ mode: 'id', id: '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2' })
    expect(req().url).toBe('https://api.cartesia.ai/tts/bytes')
  })

  it('accepts a voice already stored bare, so both spellings are one voice', () => {
    expect(req({ voiceId: '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2' }).body.voice.id)
      .toBe('8fef4d59-0a7e-4ad2-a261-6a3bb50734d2')
  })

  it('sends the primary subtag only — "en-GB" is not a Cartesia language', () => {
    expect(req().body.language).toBe('en')
    expect(req({ language: 'pt-BR' }).body.language).toBe('pt')
  })

  it('pins BOTH versions — model snapshot and the date-versioned API header', () => {
    expect(req().body.model_id).toBeTruthy()
    expect(req().headers['Cartesia-Version']).toBeTruthy()
  })

  it('refuses an unstated language rather than letting the voice guess', () => {
    expect(() => req({ language: 'auto' })).toThrow(/explicit language/)
    expect(() => req({ language: undefined })).toThrow(/explicit language/)
  })

  it('refuses a missing key or voice before it can spend anything', () => {
    expect(() => req({ apiKey: '' })).toThrow(/API key/)
    expect(() => req({ voiceId: '' })).toThrow(/voice id/)
  })

  it('is a provider generate() dispatches on, so pods and courses share one door', async () => {
    // Reaching the dispatch is enough: a real call needs the network, and the
    // request it would send is pinned above.
    await expect(generate('hi', 'not-a-vendor', {})).rejects.toThrow(/Unknown TTS provider/)
    expect(require('./tts-service.cjs').generateCartesia).toBeTypeOf('function')
  })

  it('still refuses Welsh on a human-voice course — the guard is provider-blind', () => {
    expect(isKnownSideOfHumanVoiceCourse('cym_n_for_eng', 'en')).toBe(true)
    expect(isKnownSideOfHumanVoiceCourse('cym_n_for_eng', 'cy')).toBe(false)
  })
})

/**
 * The identity step is where the first live Cartesia probe died: the clip was
 * synthesised and mastered, then thrown away with "unknown provider hint"
 * because clip-identity.cjs did not know the vendor that voice-personhood.cjs
 * and the `voices` registry both already knew.
 */
describe('clip identity knows the cartesia vendor', () => {
  const { canonicalVoiceId, PROVIDERS } = require('./shared/clip-identity.cjs')

  it('canonicalises a prefixed cartesia voice with an explicit hint', () => {
    expect(canonicalVoiceId('cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2', { provider: 'cartesia' }))
      .toBe('cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2')
  })

  it('carries the vendor in the accepted provider list', () => {
    expect(PROVIDERS).toContain('cartesia')
  })
})
