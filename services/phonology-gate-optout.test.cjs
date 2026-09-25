/**
 * THE PHONOLOGY GATE'S OPT-OUT, AND THE THING THAT MUST STAY TRUE ABOUT IT.
 *
 * The gate (services/tts-service.cjs) runs whisper over every Cartesia and xAI
 * render and re-rolls one whose detected spoken language is English. It exists
 * for English-dominant multilingual clones handed a cross-language line — xAI
 * reading Italian 'come stai' as English 'come', 2026-07-10 — and it is a real
 * defence, not ceremony.
 *
 * It is also a hard throughput ceiling: measured on watson-1 (4 cores) on
 * 2026-09-10, whisper-small at two-at-a-time is about seven clips a minute, so
 * a role-wide re-voice of a 12,000-clip course is ~30 hours of a shared box.
 * phase8's /regenerate-role therefore lets a caller who is putting a vendor's
 * OWN catalogue voice for a language onto that language say so.
 *
 * What this file pins is that the opt-out is ASKED FOR BY NAME. `phonologyGate`
 * absent, undefined, or true leaves the gate exactly where it was: a default
 * that drifted to "off" would switch the guard off for every caller in the
 * estate at once, silently, which is the failure mode the gate itself was
 * written to prevent.
 */
import { describe, it, expect } from 'vitest'

const { phonologySuspects } = require('./tts-service.cjs')

/** What phase 8's Cartesia arm sends for a deu_at target render. */
const AUSTRIAN_RENDER = { locale: 'de-AT', voiceId: '40e0f496-a220-46bb-975a-7ef465b3d92b' }

describe('phonologySuspects — the gate is on unless a caller says otherwise', () => {
  it('guards a steered Cartesia render by default', () => {
    expect(phonologySuspects('cartesia', AUSTRIAN_RENDER)).toEqual(new Set(['en']))
  })

  it('is still on when phonologyGate is explicitly true — the route default', () => {
    expect(phonologySuspects('cartesia', { ...AUSTRIAN_RENDER, phonologyGate: true }))
      .toEqual(new Set(['en']))
  })

  it('is still on for any value that is not exactly false', () => {
    // A truthy string off a JSON body, or an undefined from a destructured
    // default, must not read as "off". Only `false` switches it off.
    for (const v of [undefined, null, 'false', 0, 1]) {
      expect(phonologySuspects('cartesia', { ...AUSTRIAN_RENDER, phonologyGate: v }),
        `phonologyGate=${JSON.stringify(v)} must not disable the gate`).toEqual(new Set(['en']))
    }
  })

  it('switches off only on an explicit false', () => {
    expect(phonologySuspects('cartesia', { ...AUSTRIAN_RENDER, phonologyGate: false })).toBeNull()
  })

  it('never guards an English-steered render either way — nothing to be suspicious of', () => {
    expect(phonologySuspects('cartesia', { locale: 'en-GB' })).toBeNull()
  })

  it('leaves Azure alone: it is not a multilingual clone', () => {
    expect(phonologySuspects('azure', { language: 'de-AT' })).toBeNull()
  })
})

describe('/generate carries the same per-request opt-out (Kai 2026-09-25, job #283)', () => {
  // The handler is a 900-line closure over a live Supabase client, so this pins
  // the wiring at source level: the flag is read per request, defaults ON, and
  // reaches BOTH gated provider arms of THIS route — not /regenerate-role's.
  const fs = require('fs')
  const path = require('path')
  const src = fs.readFileSync(path.join(__dirname, 'phases/phase8-audio-v13.cjs'), 'utf8')
  const handler = src.slice(src.indexOf("app.post('/generate/:courseCode'"), src.indexOf("app.post('/regenerate-role/:courseCode'"))

  it('reads the flag per request and only an explicit false turns it off', () => {
    expect(handler).toMatch(/const phonologyGate = req\.body\.phonologyGate !== false/)
  })

  it('passes it to the Cartesia and the xAI render calls', () => {
    const cartesia = handler.slice(handler.indexOf("generateWithRetry(textForTTS, 'cartesia'"))
    const xai = handler.slice(handler.indexOf("generateWithRetry(textForTTS, 'xai'"))
    expect(cartesia.slice(0, cartesia.indexOf('}))'))).toMatch(/phonologyGate/)
    expect(xai.slice(0, xai.indexOf('}))'))).toMatch(/phonologyGate/)
  })

  it('records every clip it publishes ungated, for the check-after pass', () => {
    expect(handler).toMatch(/if \(!phonologyGate && \(provider === 'cartesia' \|\| provider === 'xai'\)\) \{\s*recordPhonologyDeferred\(/)
  })
})
