/**
 * The Cartesia arm of buildTTSConfig, and the one thing it must NOT do.
 *
 * Written 2026-08-27 when production moved to sonic-3.6. On sonic-3 the `locale`
 * steer may or may not have been read — Cartesia's API reference says locale
 * needs 3.6+, and the API accepts it silently either way, so nothing in a log
 * would ever have told us. On 3.6 it is a supported parameter that shapes the
 * phonology, which makes an unsteered render a real defect rather than a
 * theoretical one: an English-dominant multilingual clone, handed a Spanish
 * line with nothing said about language, reads it with English phonology and
 * writes a perfectly correct-looking row behind it.
 *
 * generateCartesia already treats that case as a hard fail. This file guards
 * the layer above, which used to manufacture an 'auto' out of a config that
 * simply never said — turning the hard fail into a warning nobody reads.
 */
import { describe, it, expect } from 'vitest'

const { buildTTSConfig } = require('./voice-config-service.cjs')

const CLONE = '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2'
const CADENCES = { natural: { speedMultiplier: 1.0 } }

describe('buildTTSConfig — Cartesia locale steer', () => {
  it('passes an explicit locale straight through', () => {
    const cfg = buildTTSConfig(
      { provider: 'cartesia', voiceId: CLONE, locale: 'en-GB' }, 'natural', CADENCES
    )
    expect(cfg).toMatchObject({ provider: 'cartesia', voiceId: CLONE, locale: 'en-GB' })
  })

  it('falls back to `language` when only that is set — same value, older field name', () => {
    const cfg = buildTTSConfig(
      { provider: 'cartesia', voiceId: CLONE, language: 'es-ES' }, 'natural', CADENCES
    )
    expect(cfg.locale).toBe('es-ES')
  })

  it('does NOT invent a steer when the config never said', () => {
    // The whole point. undefined reaches generateCartesia, which throws; 'auto'
    // would have reached it and merely warned.
    const cfg = buildTTSConfig({ provider: 'cartesia', voiceId: CLONE }, 'natural', CADENCES)
    expect(cfg.locale).toBeUndefined()
  })

  it("keeps 'auto' when a caller deliberately asks for it", () => {
    const cfg = buildTTSConfig(
      { provider: 'cartesia', voiceId: CLONE, locale: 'auto' }, 'natural', CADENCES
    )
    expect(cfg.locale).toBe('auto')
  })
})
