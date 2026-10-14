/**
 * ONE ROUTE FOR AUDIO (job #702, Tom 2026-09-29): a provider call outside the Popty chain is
 * refused; a request through the chain works end to end (library first, one render, write-back).
 * No network, no DB. Run: npx vitest run services/audio-render-chain.test.cjs
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const clipLib = require('./shared/clip-library.cjs')
const castGate = require('./shared/voice-cast-gate.cjs')
const guardMod = require('./shared/tts-spend-guard.cjs')
const chain = require('./shared/chain-context.cjs')
const { renderClip, RenderRequestError } = require('./shared/audio-render-entry.cjs')

const KRITI = '33333333-3333-4333-8333-333333333333'
const KRITI_ID = `cartesia_${KRITI}`
let dir, restore = null

/** A course_audio row as the library holds it. */
const clip = (o) => ({ id: o.id, course_code: o.course || 'ita_for_eng', text: o.text, text_normalized: o.text, language: o.language || 'ita', voice_id: o.voice, s3_key: `mastered/${o.id}.mp3`, origin: 'tts', veracity_pass: true, ...o.extra })

/** tts-service with node-fetch replaced by a stub that COUNTS what would be paid. */
function door(rows = []) {
  clipLib.useClipLibrary(clipLib.memoryClipLibrary(rows))
  castGate.useCastRows(null)  // the cast gate is not what this file tests
  const nodeFetch = require('node-fetch')
  const mod = require.cache[require.resolve('node-fetch')]
  const original = mod.exports
  const paid = []
  const stub = async (url, opts) => {
    paid.push(JSON.parse(opts.body).transcript)
    const bytes = Buffer.alloc(8192, 1)
    return { ok: true, status: 200, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) }
  }
  Object.keys(nodeFetch).forEach(k => { stub[k] = nodeFetch[k] })
  mod.exports = stub
  delete require.cache[require.resolve('./tts-service.cjs')]
  const svc = require('./tts-service.cjs')
  restore = () => { mod.exports = original; delete require.cache[require.resolve('./tts-service.cjs')] }
  return { svc, paid }
}

const ledger = () => {
  const p = path.join(dir, 'ledger.jsonl')
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim().split('\n').map(JSON.parse).filter(e => e.kind === 'call') : []
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'library-first-'))
  const budgetPath = path.join(dir, 'budgets.json')
  fs.writeFileSync(budgetPath, JSON.stringify({}))   // the committed baseline, nothing lowered or raised
  guardMod.useSpendGuard(guardMod.createSpendGuard({
    ledgerPath: path.join(dir, 'ledger.jsonl'), budgetPath, notify() {}, logger: { warn() {}, error() {} },
  }))
})
afterEach(() => { if (restore) restore(); restore = null; castGate.useCastRows(null); clipLib.useClipLibrary(null); guardMod.useSpendGuard(null) })


const cartesia = (door = {}) => ({ apiKey: 'k', voiceId: KRITI, locale: 'hi-IN', phonologyGate: false, door: { courseCode: 'eng_for_hin', ...door } })

/** The route's deps, with the provider and the DB in memory; `rows` is the library the course rows land in. */
function deps(svc, rows, stored = []) {
  return {
    resolve: async () => ({ language: 'hin', voiceId: KRITI_ID, provider: 'cartesia', providerConfig: cartesia() }),
    link: async ({ text }) => {
      const hit = rows.find(r => r.text === text)
      return hit ? { audioId: hit.id, s3Key: hit.s3_key } : null
    },
    speak: (t, p, c, n) => svc.speak(t, p, c, n),
    store: async ({ text, audioBuffer }) => {
      const id = `new${rows.length + 1}`
      const row = clip({ id, course: 'eng_for_hin', text, language: 'hin', voice: KRITI_ID })
      rows.push(row); stored.push({ ...row, bytes: audioBuffer.length })
      return { audioId: id, s3Key: row.s3_key, durationMs: 1000 }
    },
  }
}
const ask = (o = {}) => ({ courseCode: 'eng_for_hin', role: 'target1', text: 'नया वाक्य', purpose: 'test', requestedBy: 'kai-watson', ...o })

describe('one route for audio (job #702)', () => {
  it('a direct render outside the chain is refused before any provider is called', async () => {
    const rows = []
    const { svc, paid } = door(rows)
    await chain.outside(async () => {
      await expect(svc.speak('नया वाक्य', 'cartesia', cartesia(), 1)).rejects.toThrow(/NOT_IN_CHAIN/)
    })
    expect(paid).toEqual([])
    expect(ledger()).toEqual([])
  })

  it('a chain request works end to end: miss → one render → written back; the same ask again is free', async () => {
    const rows = [], stored = []
    const { svc, paid } = door(rows)
    const d = deps(svc, rows, stored)
    const first = await renderClip(ask(), d)
    expect(first).toMatchObject({ ok: true, source: 'rendered', audioId: 'new1', charsSpent: 'नया वाक्य'.length, requestedBy: 'kai-watson' })
    expect(paid).toEqual(['नया वाक्य'])         // ONE provider call, no retry
    expect(stored).toHaveLength(1)              // course row + index write-back happened
    const again = await renderClip(ask(), d)
    expect(again).toMatchObject({ ok: true, source: 'library', charsSpent: 0, audioId: 'new1' })
    expect(paid).toHaveLength(1)
  })

  it('a refusal from the guard is not retried and nothing is stored', async () => {
    const rows = [], stored = []
    const { svc, paid } = door(rows)
    svc.speak = async () => { throw new Error('TTS spend guard (402) DAILY_TOTAL_CAP') }
    await expect(renderClip(ask(), deps(svc, rows, stored))).rejects.toThrow(/402/)
    expect(paid).toEqual([])
    expect(stored).toEqual([])
  })

  it('a request that says neither why nor who is refused before anything is looked up', async () => {
    const rows = []
    const { svc } = door(rows)
    await expect(renderClip(ask({ purpose: '' }), deps(svc, rows))).rejects.toBeInstanceOf(RenderRequestError)
    await expect(renderClip(ask({ requestedBy: undefined }), deps(svc, rows))).rejects.toThrow(/requestedBy/)
  })

  it('dryRun asks the door and spends nothing', async () => {
    const rows = []
    const { svc, paid } = door(rows)
    const out = await renderClip(ask({ dryRun: true }), deps(svc, rows))
    expect(out).toMatchObject({ ok: true, dryRun: true, source: 'would-render', charsSpent: 0 })
    expect(paid).toEqual([])
  })
})
