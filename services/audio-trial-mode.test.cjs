/**
 * AUDIO TRIAL MODE (job #748, Tom 2026-10-12): trial:true skips the voice gates and stores apart from every course;
 * a trial clip can never be linked; the daily cap still applies; after config expiry trial is refused.
 * No network, no DB. Run: npx vitest run services/audio-trial-mode.test.cjs
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const clipLib = require('./shared/clip-library.cjs')
const castGate = require('./shared/voice-cast-gate.cjs')
const guardMod = require('./shared/tts-spend-guard.cjs')
const trialMode = require('./shared/audio-trial-mode.cjs')
const { renderClip } = require('./shared/audio-render-entry.cjs')

const UNCAST = '44444444-4444-4444-8444-444444444444'
let dir, restore = null

function door() {
  clipLib.useClipLibrary(clipLib.memoryClipLibrary([]))
  castGate.useCastRows([])   // NOTHING is cast: every voice is "uncast" to the real gate
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

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trial-'))
  const budgetPath = path.join(dir, 'budgets.json')
  fs.writeFileSync(budgetPath, JSON.stringify({}))
  guardMod.useSpendGuard(guardMod.createSpendGuard({ ledgerPath: path.join(dir, 'ledger.jsonl'), budgetPath, notify() {}, logger: { warn() {}, error() {} } }))
})
afterEach(() => { if (restore) restore(); restore = null; castGate.useCastRows(null); clipLib.useClipLibrary(null); guardMod.useSpendGuard(null) })

const deps = (svc, extra = {}) => ({
  resolve: async () => ({ language: 'deu', voiceId: `cartesia_${UNCAST}`, provider: 'cartesia', providerConfig: { apiKey: 'k', voiceId: UNCAST, locale: 'de-DE', phonologyGate: false, door: {} } }),
  link: async () => { throw new Error('a trial render must not look at the course library link') },
  linkLego: async () => { throw new Error('a trial render must not link a LEGO') },
  speak: (t, p, c, n) => svc.speak(t, p, c, n),
  store: async () => { throw new Error('a trial render must not write a course row') },
  storeTrial: async ({ audioBuffer }) => ({ audioId: 'trial_ABC', s3Key: 'trial/ABC.mp3', durationMs: 1000, bytes: audioBuffer.length }),
  ...extra,
})
const ask = (o = {}) => ({ courseCode: 'deu_for_eng', role: 'presentation', text: 'Hello there', purpose: 'test', requestedBy: 'tester', ...o })

describe('audio trial mode', () => {
  it('the same uncast voice is REFUSED without trial (proves the gate is live in this setup)', async () => {
    const { svc } = door()
    await expect(renderClip(ask({ role: 'target1' }), deps(svc))).rejects.toThrow()
  })

  it('a trial render of an uncast voice succeeds and is stored as a trial clip, touching no course', async () => {
    const { svc, paid } = door()
    const out = await renderClip(ask({ trial: true }), deps(svc))
    expect(out).toMatchObject({ ok: true, trial: true, source: 'rendered', audioId: 'trial_ABC' })
    expect(paid).toEqual(['Hello there'])
  })

  it('a trial render may not name links', async () => {
    const { svc } = door()
    await expect(renderClip(ask({ trial: true, legoId: 'S0001L01' }), deps(svc))).rejects.toThrow(/connects to nothing/)
    await expect(renderClip(ask({ trial: true, replaceAudioId: 'x' }), deps(svc))).rejects.toThrow(/connects to nothing/)
  })

  it('a trial clip can never be repointed into a course', async () => {
    expect(() => trialMode.assertNotTrial('trial_0F0F0F0F-0F0F-4F0F-8F0F-0F0F0F0F0F0F')).toThrow(/TRIAL clip/)
    expect(() => trialMode.assertNotTrial('mastered/X.mp3', 'trial/ABC.mp3')).toThrow(/TRIAL clip/)
    expect(() => trialMode.assertNotTrial('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', 'mastered/ABC.mp3')).not.toThrow()
    const { swapClipInPlace } = require('./shared/audio-revision-swap.cjs')
    await expect(swapClipInPlace({ supabase: {}, audioId: 'a', newS3Key: 'trial/ABC.mp3', acceptedBy: 'x' })).rejects.toThrow(/TRIAL clip/)
    // the presentation bind in the entry refuses a trial id even if a dep returned one
    const { svc } = door()
    const d = deps(svc, { link: async () => ({ audioId: 'trial_ABC', s3Key: 'trial/ABC.mp3' }), linkLego: async () => ({ linked: true }) })
    await expect(renderClip(ask({ legoId: 'S0001L01' }), d)).rejects.toThrow(/TRIAL clip/)
  })

  it('the daily cap still applies to trial renders', async () => {
    const { svc } = door()
    const store = guardMod.memorySpendStore(); store.totalCapChars = 5; store.totalCeilingChars = 5
    guardMod.useSpendGuard(guardMod.createSpendGuard({ ledgerPath: path.join(dir, 'l2.jsonl'), budgetPath: null, store, notify() {}, logger: { warn() {}, error() {} } }))
    await expect(renderClip(ask({ trial: true, text: 'This text is longer than five characters' }), deps(svc))).rejects.toThrow(/DAILY_TOTAL_CAP/)
  })

  it('after the config expiry a trial render is refused, before anything is paid', async () => {
    const { svc, paid } = door()
    const late = () => new Date('2026-10-20T00:00:00Z')
    await expect(renderClip(ask({ trial: true }), deps(svc, { now: late }))).rejects.toMatchObject({ code: 'TRIAL_EXPIRED' })
    expect(paid).toEqual([])
    expect(() => trialMode.assertTrialOpen(new Date('2026-10-19T23:59:00Z'))).not.toThrow()
  })

  it('trial speed: reaches the provider, skips the library, is trial-only and range-checked, and keys apart', async () => {
    const { svc } = door()
    let seen = null
    const spy = { speak: (t, p, c, n) => { seen = c; return svc.speak(t, p, c, n) } }
    const keys = []
    const out = await renderClip(ask({ trial: true, speed: 0.8 }), deps(svc, { ...spy, storeTrial: async a => { keys.push(a.speed); return { audioId: 'trial_ABC', s3Key: 'trial/ABC.mp3', durationMs: 1, bytes: 1 } } }))
    expect(seen.speed).toBe(0.8)
    expect(seen.door.skipLibrary).toBe(true)
    expect(out.speed).toBe(0.8)
    expect(keys).toEqual([0.8])
    expect(trialMode.trialKey('abc', 0.8)).toBe('trial/ABC_x80.mp3')
    expect(trialMode.trialKey('abc')).toBe('trial/ABC.mp3')
    expect(trialMode.keyFromTrialId(trialMode.trialIdFromKey(trialMode.trialKey('abc', 0.9)))).toBe('trial/ABC_x90.mp3')
    // the phase8 /trial-audio/:id route must accept a speed-tagged id or the clip can never be played
    expect(require('fs').readFileSync(require('path').join(__dirname, 'phases/phase8-audio-v13.cjs'), 'utf8')).toContain('(_x\\d+)?$/i.test(req.params.id)')
    await expect(renderClip(ask({ trial: true, speed: 0.5 }), deps(svc))).rejects.toThrow(/between/)
    await expect(renderClip(ask({ trial: true, speed: 1.2 }), deps(svc))).rejects.toThrow(/between/)
    await expect(renderClip(ask({ speed: 0.8 }), deps(svc))).rejects.toThrow(/trial-only/)
  })

  it('trial speed: explicit 1 overrides the voice\'s own speed; non-Cartesia providers refuse explicit speed', async () => {
    const { svc } = door()
    let seen = null
    const spy = { speak: (t, p, c, n) => { seen = c; return svc.speak(t, p, c, n) } }
    const slowVoice = async () => ({ language: 'deu', voiceId: `cartesia_${UNCAST}`, provider: 'cartesia', providerConfig: { apiKey: 'k', voiceId: UNCAST, locale: 'de-DE', phonologyGate: false, speed: 0.8, door: {} } })
    await renderClip(ask({ trial: true, speed: 1 }), deps(svc, { ...spy, resolve: slowVoice }))
    expect(seen.speed).toBe(1)
    expect(seen.door.skipLibrary).toBe(true)
    seen = null
    await renderClip(ask({ trial: true }), deps(svc, { ...spy, resolve: slowVoice }))
    expect(seen.speed).toBe(0.8)
    expect(seen.door.skipLibrary).toBe(false)
    const eleven = async () => ({ language: 'deu', voiceId: 'el_x', provider: 'elevenlabs', providerConfig: { apiKey: 'k', voiceId: 'x', door: {} } })
    await expect(renderClip(ask({ trial: true, speed: 0.8 }), deps(svc, { resolve: eleven }))).rejects.toThrow(/Cartesia-only/)
  })
})
