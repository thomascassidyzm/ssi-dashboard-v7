/**
 * AUDITION — the parts that must not be wrong.
 *
 * Two of them, and both are about money. The CACHE KEY decides whether the
 * second person to ask the same question pays for it again, and whether a clip
 * outlives the words it says. The REFUSALS decide whether a stuck finger can
 * spend past the ceiling or render a language nobody has written a paragraph
 * for. Everything here runs against a temp directory and an injected fake
 * runner — no TTS key, no network, and nothing that could accidentally spend.
 *
 * Run: npx vitest run services/voicelab/audition.test.js
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createRequire } from 'module'
import fs from 'fs'
import os from 'os'
import path from 'path'

const LAB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'voicelab-audition-test-'))
process.env.VOICELAB_LAB_DIR = LAB_DIR

const require_ = createRequire(import.meta.url)
const audition = require_('./audition.cjs')
const paragraphs = require_('./audition-paragraphs.cjs')
const store = require_('./store.cjs')
const lab = require_('./lab.cjs')

afterAll(() => { fs.rmSync(LAB_DIR, { recursive: true, force: true }) })

beforeEach(() => {
  fs.rmSync(LAB_DIR, { recursive: true, force: true })
  store.ensureDirs()
})

/** A runner that records what it was asked for and never touches a provider. */
function fakeRunner () {
  const calls = []
  return {
    calls,
    async renderOne ({ text, cfg }) {
      calls.push({ text, cfg })
      return { mastered: Buffer.from('fake-mp3-bytes'), durationMs: 12345, renderMs: 900, masterMs: 80 }
    },
  }
}

const ITA = { voiceId: '8fef4d59', provider: 'cartesia', language: 'ita' }

describe('the cache key — what makes the second ask free', () => {
  it('is stable for the same voice, language, paragraph version and settings', () => {
    const a = audition.cacheKey({ provider: 'cartesia', voiceId: 'v1', language: 'ita', version: 1 })
    const b = audition.cacheKey({ provider: 'cartesia', voiceId: 'v1', language: 'ita', version: 1 })
    expect(a).toBe(b)
  })

  it('is a 16-hex clip id, so the lab\'s existing clip route serves it', () => {
    const key = audition.cacheKey({ provider: 'cartesia', voiceId: 'v1', language: 'ita', version: 1 })
    expect(key).toMatch(store.ID_RE)
  })

  it('moves when the voice, the provider, the language or the paragraph version moves', () => {
    const base = { provider: 'cartesia', voiceId: 'v1', language: 'ita', version: 1 }
    const key = audition.cacheKey(base)
    expect(audition.cacheKey({ ...base, voiceId: 'v2' })).not.toBe(key)
    expect(audition.cacheKey({ ...base, provider: 'azure' })).not.toBe(key)
    expect(audition.cacheKey({ ...base, language: 'spa' })).not.toBe(key)
    // The one that matters most: rewrite the paragraph, bump the version, and
    // every cached clip for that language falls out on its own.
    expect(audition.cacheKey({ ...base, version: 2 })).not.toBe(key)
  })

  it('moves when the house render settings move, so a clip cannot outlive its mastering', () => {
    const base = { provider: 'cartesia', voiceId: 'v1', language: 'ita', version: 1 }
    const louder = { ...audition.renderSettings(), masterLufs: -14 }
    expect(audition.cacheKey({ ...base, settings: louder })).not.toBe(audition.cacheKey(base))
  })

  it('keeps a dialect apart from its parent — same voice, different clip', () => {
    const de = audition.cacheKey({ provider: 'cartesia', voiceId: 'v1', language: 'deu', version: 1 })
    const at = audition.cacheKey({ provider: 'cartesia', voiceId: 'v1', language: 'deu_at', version: 1 })
    expect(at).not.toBe(de)
  })
})

describe('cached() — half a cache entry is a miss, not a hit', () => {
  it('is a miss with neither half', () => {
    expect(audition.cached('a'.repeat(16))).toBeNull()
  })

  it('is a miss with bytes but no sidecar — a clip nobody can describe', () => {
    const key = 'b'.repeat(16)
    store.writeClip(key, Buffer.from('bytes'))
    expect(audition.cached(key)).toBeNull()
  })

  it('is a miss with a sidecar but no bytes — a hit that would serve a 404', () => {
    const key = 'c'.repeat(16)
    audition.writeMeta(key, { key, chars: 10 })
    expect(audition.cached(key)).toBeNull()
  })
})

describe('audition() — renders once, then never again', () => {
  it('renders on the first ask and reports it was not cached', async () => {
    const runner = fakeRunner()
    const out = await audition.audition({ ...ITA, runner })
    expect(runner.calls).toHaveLength(1)
    expect(out.cached).toBe(false)
    expect(out.url).toBe(`/api/voicelab/clip/${out.key}.mp3`)
    expect(out.durationMs).toBe(12345)
  })

  it('serves the second ask from disk without calling the renderer at all', async () => {
    const first = fakeRunner()
    const a = await audition.audition({ ...ITA, runner: first })
    const second = fakeRunner()
    const b = await audition.audition({ ...ITA, runner: second })
    expect(second.calls).toHaveLength(0)
    expect(b.cached).toBe(true)
    expect(b.key).toBe(a.key)
  })

  it('renders the language\'s own fixed paragraph, not something typed', async () => {
    const runner = fakeRunner()
    await audition.audition({ ...ITA, runner })
    expect(runner.calls[0].text).toBe(paragraphs.find('ita').text)
  })

  it('steers a dialect to its parent locale while saying the dialect\'s own words', async () => {
    const runner = fakeRunner()
    await audition.audition({ voiceId: 'v1', provider: 'cartesia', language: 'deu_at', runner })
    expect(runner.calls[0].text).toBe(paragraphs.find('deu_at').text)
    expect(runner.calls[0].text).not.toBe(paragraphs.find('deu').text)
    expect(runner.calls[0].cfg.language).toBe('deu')
  })

  it('never asks for the consent side door — an audition uses the ordinary gate', async () => {
    const runner = fakeRunner()
    await audition.audition({ ...ITA, runner })
    expect(runner.calls[0].cfg.consentAudition).toBeUndefined()
  })

  it('bills the ledger the moment the money is spent, and not on a cache hit', async () => {
    await audition.audition({ ...ITA, runner: fakeRunner() })
    const afterFirst = store.readLedger().filter((r) => r.audition)
    expect(afterFirst).toHaveLength(1)
    expect(afterFirst[0].chars).toBe(paragraphs.find('ita').text.length)

    await audition.audition({ ...ITA, runner: fakeRunner() })
    expect(store.readLedger().filter((r) => r.audition)).toHaveLength(1)
  })
})

describe('the refusals', () => {
  it('refuses a language with no paragraph, and says why rather than guessing one', () => {
    expect(() => audition.planFor({ voiceId: 'v1', provider: 'cartesia', language: 'ara_lb' }))
      .toThrow(/Lebanese/)
  })

  it('refuses a language that does not exist here at all', () => {
    expect(() => audition.planFor({ voiceId: 'v1', provider: 'cartesia', language: 'klingon' }))
      .toThrow(/No audition language/)
  })

  it('refuses a provider this lab cannot render', () => {
    expect(() => audition.planFor({ voiceId: 'v1', provider: 'xai', language: 'ita' }))
      .toThrow(/not one this lab can render/)
  })

  it('refuses to render past the daily character ceiling, and still plays cached clips', async () => {
    // Spend the day, then ask for one more.
    store.appendLedger({ chars: lab.LIMITS.dailyCharCeiling })
    await expect(audition.audition({ ...ITA, runner: fakeRunner() })).rejects.toThrow(/ceiling/)

    // A clip already paid for is served regardless — the ceiling guards the
    // spending, not the listening.
    const key = audition.cacheKey({
      provider: 'cartesia', voiceId: ITA.voiceId, language: 'ita', version: paragraphs.find('ita').version,
    })
    store.writeClip(key, Buffer.from('bytes'))
    audition.writeMeta(key, { key, chars: 1 })
    const out = await audition.audition({ ...ITA, runner: fakeRunner() })
    expect(out.cached).toBe(true)
  })
})

describe('the paragraphs themselves', () => {
  it('gives every dialect its own text, never its parent\'s', () => {
    const byCode = new Map(paragraphs.list().map((p) => [p.code, p]))
    for (const p of paragraphs.list()) {
      if (!p.dialectOf || !p.text) continue
      expect(p.text).not.toBe(byCode.get(p.dialectOf)?.text)
    }
  })

  it('has no two languages sharing one paragraph', () => {
    const texts = paragraphs.list().map((p) => p.text).filter(Boolean)
    expect(new Set(texts).size).toBe(texts.length)
  })

  it('says why every empty slot is empty, so a gap reads as a gap', () => {
    for (const p of paragraphs.list()) {
      if (p.available) continue
      expect(String(p.gap || '').length).toBeGreaterThan(20)
    }
  })

  it('gives every paragraph a language the render path can actually steer', () => {
    const params = require_('./params.cjs')
    for (const p of paragraphs.list()) {
      expect(params.findLanguage(p.steer), `${p.code} steers as ${p.steer}`).toBeTruthy()
    }
  })
})
