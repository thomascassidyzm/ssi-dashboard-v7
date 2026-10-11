/**
 * NO RE-RECORDING WITHOUT TOM'S PERMISSION (Tom 2026-10-11): the TTS door refuses any render that would
 * replace a working clip of the same words unless Tom's permission covers the course; filling an empty slot,
 * rendering edited words, and replacing a dead stub are unaffected.
 * No network, no DB. Run: npx vitest run services/rerecord-gate.test.cjs
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const clipLib = require('./shared/clip-library.cjs')
const castGate = require('./shared/voice-cast-gate.cjs')
const guardMod = require('./shared/tts-spend-guard.cjs')
const gate = require('./shared/rerecord-gate.cjs')
const { renderClip } = require('./shared/audio-render-entry.cjs')

const LAYLA = 'azure_ar-LB-LaylaNeural'
const HUDA = '002622d8-19d0-4567-a16a-f99c7397c062'
const HUDA_ID = `cartesia_${HUDA}`
const COURSE = 'ara_lb_for_eng'
const WORDS = 'كيفك'
let dir, restore = null

/** A course_audio row as both the library and the gate see it. */
const row = (o) => ({ id: o.id, course_code: o.course || COURSE, role: o.role || 'target1', text: o.text || WORDS, text_normalized: o.text || WORDS,
  language: 'ara', voice_id: o.voice || LAYLA, s3_key: `mastered/${o.id}.mp3`, origin: 'tts', veracity_pass: true, file_size_bytes: o.bytes ?? 24000, linked: !!o.linked })
const permit = (o = {}) => ({ id: 7, course_code: COURSE, roles: null, by: 'Tom (in chat)', why: 'yes, re-record the Lebanese target clips',
  at: new Date(Date.now() - 3600e3).toISOString(), until: new Date(Date.now() + 86400e3).toISOString(), max_clips: null, revoked_at: null, ...o })

/** tts-service with the provider stubbed so we can COUNT what would be paid; `clips` feed the library AND the gate. */
function door(clips = [], permissions = []) {
  clipLib.useClipLibrary(clipLib.memoryClipLibrary([]))   // the library answers nothing: every request reaches the render decision
  castGate.useCastRows(null)
  const store = gate.memoryRerecordStore({ clips, permissions })
  gate.useRerecordStore(store)
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
  return { svc, paid, store }
}
const cfg = (d = {}) => ({ apiKey: 'k', voiceId: HUDA, locale: 'ar-LB', phonologyGate: false, door: { courseCode: COURSE, language: 'ara', voiceBound: true, ...d } })

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rerecord-gate-'))
  const budgetPath = path.join(dir, 'budgets.json')
  fs.writeFileSync(budgetPath, JSON.stringify({}))
  guardMod.useSpendGuard(guardMod.createSpendGuard({ ledgerPath: path.join(dir, 'ledger.jsonl'), budgetPath, notify() {}, logger: { warn() {}, error() {} } }))
})
afterEach(() => { if (restore) restore(); restore = null; castGate.useCastRows(null); clipLib.useClipLibrary(null); guardMod.useSpendGuard(null); gate.useRerecordStore(null) })

describe('the door refuses a re-record without Tom\'s permission', () => {
  it('a regenerate replacing a working clip of the same words is refused, nothing is paid, the refusal is logged', async () => {
    const { svc, paid, store } = door([row({ id: '11111111-1111-4111-8111-111111111111' })])
    await expect(svc.speak(WORDS, 'cartesia', cfg({ replacing: ['mastered/11111111-1111-4111-8111-111111111111.mp3'] }), 1))
      .rejects.toMatchObject({ code: 'RERECORD_NOT_PERMITTED' })
    expect(paid).toEqual([])
    expect(store.logged).toMatchObject([{ kind: 'refused', course_code: COURSE, role: 'target1', replaced_audio_ids: ['11111111-1111-4111-8111-111111111111'] }])
  })

  it('a dry run is refused the same way, so a plan shows the refusal before anyone pays', async () => {
    const { svc } = door([row({ id: 'a1' })])
    await expect(svc.speak(WORDS, 'cartesia', cfg({ replacing: ['mastered/a1.mp3'], dryRun: true }), 1)).rejects.toMatchObject({ code: 'RERECORD_NOT_PERMITTED' })
  })

  it('with Tom\'s permission for the course it renders once and logs the permission it used', async () => {
    const { svc, paid, store } = door([row({ id: 'a1' })], [permit()])
    await svc.speak(WORDS, 'cartesia', cfg({ replacing: ['mastered/a1.mp3'] }), 1)
    expect(paid).toEqual([WORDS])
    expect(store.logged).toMatchObject([{ kind: 'permitted', permission_id: 7 }])
  })

  it('a permission that has used its max_clips stops covering', async () => {
    const { svc, paid } = door([row({ id: 'a1' }), row({ id: 'a2', text: 'مرحبا' })], [permit({ max_clips: 1 })])
    await svc.speak(WORDS, 'cartesia', cfg({ replacing: ['mastered/a1.mp3'] }), 1)
    await expect(svc.speak('مرحبا', 'cartesia', cfg({ replacing: ['mastered/a2.mp3'] }), 1)).rejects.toMatchObject({ code: 'RERECORD_NOT_PERMITTED' })
    expect(paid).toEqual([WORDS])
  })
})

describe('a max_clips grant is spent atomically (#229)', () => {
  it('two concurrent re-records under max_clips:1: exactly one is accepted', async () => {
    const mem = gate.memoryRerecordStore({ clips: [row({ id: 'a1' }), row({ id: 'a2', text: 'مرحبا' })], permissions: [permit({ max_clips: 1 })] })
    // database latency: the count is read, then time passes before the use is written — the window the race lives in
    const store = { ...mem, async permissions(c) { const r = await mem.permissions(c); await new Promise(res => setTimeout(res, 20)); return r } }
    const ask = (text, key) => gate.assertMayRerecord({ text, language: 'ara', courseCode: COURSE, replacing: [key] }, store)
    const results = await Promise.allSettled([ask(WORDS, 'mastered/a1.mp3'), ask('مرحبا', 'mastered/a2.mp3')])
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.find(r => r.status === 'rejected').reason).toMatchObject({ code: 'RERECORD_NOT_PERMITTED' })
    expect(mem.logged.filter(l => l.kind === 'permitted')).toHaveLength(1)
  })
})

describe('new audio is unaffected', () => {
  it('filling an empty slot (nothing replaced) renders', async () => {
    const { svc, paid } = door([])
    await svc.speak(WORDS, 'cartesia', cfg(), 1)
    expect(paid).toEqual([WORDS])
  })

  it('edited words: the replaced clip speaks other words, so this is new audio', async () => {
    const { svc, paid } = door([row({ id: 'a1', text: 'old words' })])
    await svc.speak(WORDS, 'cartesia', cfg({ replacing: ['mastered/a1.mp3'] }), 1)
    expect(paid).toEqual([WORDS])
  })

  it('a clip still linked in its slot is current even when the spoken words differ from its label (gender expansion, overrides)', async () => {
    const { svc, paid } = door([row({ id: 'a1', text: 'كيفك (m)', linked: true })])
    await expect(svc.speak(WORDS, 'cartesia', cfg({ replacing: ['mastered/a1.mp3'] }), 1)).rejects.toMatchObject({ code: 'RERECORD_NOT_PERMITTED' })
    expect(paid).toEqual([])
  })

  it('a dead stub (<2000 bytes) is not a working clip', async () => {
    const { svc, paid } = door([row({ id: 'a1', bytes: 44 })])
    await svc.speak(WORDS, 'cartesia', cfg({ replacing: ['mastered/a1.mp3'] }), 1)
    expect(paid).toEqual([WORDS])
  })
})

describe('the render route (/api/audio/render)', () => {
  const deps = (svc, clip) => ({
    resolve: async () => ({ language: 'ara', voiceId: HUDA_ID, provider: 'cartesia', providerConfig: cfg() }),
    link: async () => null,
    speak: (t, p, c, n) => svc.speak(t, p, c, n),
    loadClip: async () => clip,
    replace: async (a) => ({ audioId: a.replaceAudioId, s3Key: 'mastered/NEW.mp3', durationMs: 900, revision: 2 }),
    store: async () => ({ audioId: 'new', s3Key: 'k', durationMs: 1 }),
  })
  const ask = (o = {}) => ({ courseCode: COURSE, role: 'target1', text: WORDS, purpose: 'test', requestedBy: 'tester', ...o })

  it('a named re-record is refused without permission, even when only the spoken words differ', async () => {
    const clip = row({ id: 'a1' })
    const { svc, paid } = door([clip])
    await expect(renderClip(ask({ replaceAudioId: 'a1', spokenText: 'كيفَك' }), deps(svc, clip))).rejects.toMatchObject({ code: 'RERECORD_NOT_PERMITTED' })
    expect(paid).toEqual([])
  })

  it('a re-voice — the same words already in this course role in another voice — is refused', async () => {
    const { svc, paid } = door([row({ id: 'a1', voice: LAYLA })])
    await expect(renderClip(ask(), deps(svc, null))).rejects.toMatchObject({ code: 'RERECORD_NOT_PERMITTED' })
    expect(paid).toEqual([])
  })

  it('the other voice of a two-voice phrase (a different role) is new audio, not a re-voice', async () => {
    const { svc, paid } = door([row({ id: 'a1', role: 'target2', voice: LAYLA })])
    const out = await renderClip(ask(), deps(svc, null))
    expect(out.source).toBe('rendered')
    expect(paid).toEqual([WORDS])
  })
})

describe('what counts as Tom\'s permission', () => {
  const at = { courseCode: COURSE, role: 'target1' }
  it('covers only its own course, in date, signed by Tom with his words, unrevoked, in its roles', () => {
    expect(gate.permissionCovers(permit(), at)).toBe(true)
    expect(gate.permissionCovers(permit({ course_code: 'ara_eg_for_eng' }), at)).toBe(false)
    expect(gate.permissionCovers(permit({ by: 'watson' }), at)).toBe(false)
    expect(gate.permissionCovers(permit({ why: '  ' }), at)).toBe(false)
    expect(gate.permissionCovers(permit({ until: new Date(Date.now() - 1000).toISOString() }), at)).toBe(false)
    expect(gate.permissionCovers(permit({ until: new Date(Date.now() + 40 * 86400e3).toISOString() }), at)).toBe(false)
    expect(gate.permissionCovers(permit({ revoked_at: new Date().toISOString() }), at)).toBe(false)
    expect(gate.permissionCovers(permit({ roles: ['known'] }), at)).toBe(false)
    expect(gate.permissionCovers(permit({ roles: ['target1', 'target2'] }), at)).toBe(true)
  })
})

describe('every route that names what it replaces reaches the gate', () => {
  it('the door calls the cast gate BEFORE assertMayRerecord (which reserves a grant use), and both before any render', () => {
    const src = fs.readFileSync(path.join(__dirname, 'tts-service.cjs'), 'utf8')
    const speak = src.slice(src.indexOf('async function speak('), src.indexOf('/** What this process\'s door has done'))
    expect(speak.indexOf('assertCastVoice(')).toBeGreaterThan(0)
    expect(speak.indexOf('assertCastVoice(')).toBeLessThan(speak.indexOf('assertMayRerecord('))
    expect(speak.indexOf('assertMayRerecord(')).toBeGreaterThan(0)
    expect(speak.indexOf('assertCastVoice(')).toBeLessThan(speak.indexOf('renderWithRetry('))
    expect(speak.indexOf('assertMayRerecord(')).toBeLessThan(speak.indexOf('renderWithRetry('))
  })
  it('an existing same-words clip stored under a 2-letter code (de) is still seen when the render says deu', async () => {
    const old = { ...row({ id: '33333333-3333-4333-8333-333333333333', course: 'deu_for_eng', role: 'target2', text: 'Hallo', voice: 'azure_de-DE-ConradNeural', linked: true }), text_normalized: 'hallo', language: 'de' }
    const store = gate.memoryRerecordStore({ clips: [old], permissions: [] })
    await expect(gate.assertMayRerecord({ courseCode: 'deu_for_eng', slotRole: 'target2', voiceBound: true, language: 'deu', voiceId: 'cartesia_nico', text: 'Hallo' }, store))
      .rejects.toMatchObject({ code: 'RERECORD_NOT_PERMITTED' })
  })
  it('every phase8 /regenerate-* door names what it replaces', () => {
    const src = fs.readFileSync(path.join(__dirname, 'phases/phase8-audio-v13.cjs'), 'utf8')
    const routes = [...src.matchAll(/app\.post\('\/(regenerate-[a-z-]+)\//g)].map(m => m[1])
    expect(routes.sort()).toEqual(['regenerate-lego', 'regenerate-phrase', 'regenerate-presentation', 'regenerate-presentations', 'regenerate-role', 'regenerate-single'])
    for (const r of ['regenerate-role', 'regenerate-single', 'regenerate-presentation', 'regenerate-phrase', 'regenerate-lego']) {
      const a = src.indexOf(`app.post('/${r}/`)
      const b = src.indexOf('app.post(', a + 10)
      expect(src.slice(a, b), r).toMatch(/replacing:/)
    }
  })
})
