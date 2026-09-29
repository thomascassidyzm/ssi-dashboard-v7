/**
 * THE #382 LOOP, REPLAYED AT THE ONE TTS DOOR (job #425).
 *
 * #382: a driver re-posted /generate 37 times; each pass believed the same
 * 19,000 lines were missing because a truncated read hid the clips it had just
 * made, and the door paid Cartesia for them every time — the median line was
 * bought 15 times, "her name" 41. #383 fixed that read. These tests assume the
 * NEXT such bug: a caller that keeps asking for lines it already has, with the
 * clip library blind to them (an empty library here). The door must stop
 * paying on its own, whatever the caller thinks.
 *
 * Provider = Cartesia behind a stubbed fetch that COUNTS what would be paid.
 * Ledger = a temp file. No network, no DB.
 * Run: npx vitest run services/tts-spend-door.test.cjs
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const clipLib = require('./shared/clip-library.cjs')
const castGate = require('./shared/voice-cast-gate.cjs')
const guardMod = require('./shared/tts-spend-guard.cjs')

const KRITI = '33333333-3333-4333-8333-333333333333'
let restore = null
let dir

function door({ failFirst = 0 } = {}) {
  clipLib.useClipLibrary(clipLib.memoryClipLibrary([]))   // blind library: every line looks missing
  castGate.useCastRows([])
  const nodeFetch = require('node-fetch')
  const mod = require.cache[require.resolve('node-fetch')]
  const original = mod.exports
  const paid = []
  let failures = failFirst
  const stub = async (url, opts) => {
    paid.push(JSON.parse(opts.body).transcript)
    if (failures-- > 0) return { ok: false, status: 503, text: async () => 'overloaded' }
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

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spend-door-'))
  const budgetPath = path.join(dir, 'budgets.json')
  fs.writeFileSync(budgetPath, JSON.stringify({ repeat: { maxPerKey: 3, windowHours: 24 } }))
  guardMod.useSpendGuard(guardMod.createSpendGuard({
    ledgerPath: path.join(dir, 'ledger.jsonl'), budgetPath, notify() {}, logger: { warn() {}, error() {} },
  }))
})
afterEach(() => { if (restore) restore(); restore = null; castGate.useCastRows(null); guardMod.useSpendGuard(null) })

const cfg = { apiKey: 'k', voiceId: KRITI, locale: 'hi-IN', phonologyGate: false, door: { courseCode: 'eng_for_hin', job: 'replay-382' } }
const LINES = ['her name', 'मैं ठीक हूँ', 'मुझे लगता है कि यह बेवकूफ़ी है']

describe('a fill loop that keeps re-asking for lines it already holds', () => {
  it('37 passes over the same 3 lines pay for at most 3 renders a line — not 37 (the committed limit since job #677)', async () => {
    const { svc, paid } = door()
    let refused = 0
    for (let pass = 0; pass < 37; pass++) {
      for (const line of LINES) {
        try { await svc.speak(line, 'cartesia', cfg, 1) } catch (e) {
          expect(e.message).toMatch(/TTS spend guard \(402\) REPEAT/)
          refused++
        }
      }
    }
    // Old door: 111 paid renders. Guarded door: 9, then every call refused.
    expect(paid).toHaveLength(LINES.length * 3)
    expect(refused).toBe(LINES.length * (37 - 3))
  })

  it('every provider ATTEMPT is ledgered — a retry is billed, so it is counted', async () => {
    const { svc, paid } = door({ failFirst: 2 })
    await svc.speak('her name', 'cartesia', cfg, 3)
    expect(paid).toHaveLength(3)
    const lines = fs.readFileSync(path.join(dir, 'ledger.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter(l => l.kind === 'call')
    expect(lines.map(l => l.attempt)).toEqual([1, 2, 3])
    expect(lines.every(l => l.course === 'eng_for_hin' && l.job === 'replay-382' && l.provider === 'cartesia')).toBe(true)
    expect(svc.doorStats.providerCalls).toBe(3)
  })

  it('a refusal is never retried: one refused call, zero provider calls', async () => {
    fs.writeFileSync(path.join(dir, 'budgets.json'), JSON.stringify({ providers: { cartesia: { dailyCapChars: 5 } } }))
    const { svc, paid } = door()
    await expect(svc.speak('her name', 'cartesia', cfg, 3)).rejects.toThrow(/DAILY_CAP/)
    expect(paid).toHaveLength(0)
  })
})

describe('the caller is charged per ATTEMPT (job #430)', () => {
  it('door.onAttempt runs before every billed attempt, retries included', async () => {
    const { svc, paid } = door({ failFirst: 2 })
    const charged = []
    await svc.speak('her name', 'cartesia', { ...cfg, door: { ...cfg.door, onAttempt: (t, n) => charged.push(n) } }, 3)
    expect(paid).toHaveLength(3)
    expect(charged).toEqual([1, 2, 3])
  })

  it('an onAttempt that refuses (a pass out of budget) stops the call before the provider or the ledger is touched', async () => {
    const { svc, paid } = door()
    const onAttempt = () => { throw new Error('spend cap: render budget reached') }
    await expect(svc.speak('her name', 'cartesia', { ...cfg, door: { ...cfg.door, onAttempt } }, 3)).rejects.toThrow(/spend cap/)
    expect(paid).toHaveLength(0)
    expect(fs.existsSync(path.join(dir, 'ledger.jsonl'))).toBe(false)
  })
})
