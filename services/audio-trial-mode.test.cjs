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
  const paid = [], bodies = []
  const stub = async (url, opts) => {
    const b = JSON.parse(opts.body)
    paid.push(b.transcript || b.text)
    bodies.push({ url, body: b })
    const bytes = Buffer.alloc(8192, 1)
    return { ok: true, status: 200, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) }
  }
  Object.keys(nodeFetch).forEach(k => { stub[k] = nodeFetch[k] })
  mod.exports = stub
  delete require.cache[require.resolve('./tts-service.cjs')]
  const svc = require('./tts-service.cjs')
  restore = () => { mod.exports = original; delete require.cache[require.resolve('./tts-service.cjs')] }
  return { svc, paid, bodies }
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
// A trial names who started it (job #23), so every trial ask carries a starter unless the test says otherwise.
const ask = (o = {}) => ({ courseCode: 'deu_for_eng', role: 'presentation', text: 'Hello there', purpose: 'test', requestedBy: 'tester', ...(o.trial ? { startedBy: 'Kai' } : {}), ...o })

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

  it('a dated (non-standing) lane still closes after its expiry, before anything is paid; the standing lane does not', async () => {
    const dated = { expires: '2026-10-19' }
    expect(() => trialMode.assertTrialOpen(new Date('2026-10-20T00:00:00Z'), dated)).toThrow(expect.objectContaining({ code: 'TRIAL_EXPIRED' }))
    expect(() => trialMode.assertTrialOpen(new Date('2026-10-19T23:59:00Z'), dated)).not.toThrow()
    expect(() => trialMode.assertTrialOpen(new Date('2030-01-01T00:00:00Z'), { standing: true })).not.toThrow()
    // the live config is the standing lane (job #23): a render long after the old week is open
    const { svc, paid } = door()
    const late = () => new Date('2027-06-01T00:00:00Z')
    await expect(renderClip(ask({ trial: true }), deps(svc, { now: late }))).resolves.toMatchObject({ ok: true, trial: true })
    expect(paid).toEqual(['Hello there'])
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

// THE STANDING TRIAL LANE (job #23, Kai 2026-10-28).
const TAMARA = 'Zq8xdM7UEWBINjdZQdBE'
const eleven = async () => ({ language: 'deu', voiceId: `elevenlabs_${TAMARA}`, provider: 'elevenlabs', providerConfig: { apiKey: 'k', voiceId: TAMARA, speed: 1, door: {} } })

describe('standing trial lane (job #23)', () => {
  it('a trial names who started it — a person or a job — and is refused with neither, before anything is resolved', async () => {
    const { svc, paid } = door()
    const noResolve = { resolve: async () => { throw new Error('resolved before the starter check') } }
    await expect(renderClip(ask({ trial: true, startedBy: undefined }), deps(svc, noResolve))).rejects.toMatchObject({ code: 'TRIAL_NEEDS_STARTER' })
    await expect(renderClip(ask({ trial: true, startedBy: undefined, job: '#23' }), deps(svc))).resolves.toMatchObject({ ok: true, job: '#23' })
    await expect(renderClip(ask({ trial: true }), deps(svc))).resolves.toMatchObject({ ok: true, startedBy: 'Kai' })
    expect(paid).toEqual(['Hello there', 'Hello there'])
  })

  it('the per-call trial cap refuses a long text before anything is paid', async () => {
    const { svc, paid } = door()
    const long = 'Ein Satz. '.repeat(40)   // 400 chars
    expect(long.length).toBeGreaterThan(trialMode.maxCharsPerCall())
    await expect(renderClip(ask({ trial: true, text: long }), deps(svc))).rejects.toMatchObject({ code: 'TRIAL_CALL_CAP' })
    expect(paid).toEqual([])
    expect(trialMode.maxCharsPerCall()).toBe(300)
  })

  it('model, voiceSettings and startedBy are trial-only', async () => {
    const { svc } = door()
    for (const extra of [{ model: 'eleven_v3' }, { voiceSettings: { speed: 0.9 } }, { startedBy: 'Kai' }]) {
      await expect(renderClip(ask({ role: 'target1', ...extra }), deps(svc, { resolve: eleven }))).rejects.toMatchObject({ code: 'TRIAL_ONLY_OPTION' })
    }
  })

  it('model allow-list and voice_settings ranges are enforced; both are ElevenLabs-only', async () => {
    const { svc } = door()
    await expect(renderClip(ask({ trial: true, model: 'eleven_turbo_v2_5' }), deps(svc, { resolve: eleven }))).rejects.toMatchObject({ code: 'BAD_MODEL' })
    await expect(renderClip(ask({ trial: true, voiceSettings: { speed: 0.5 } }), deps(svc, { resolve: eleven }))).rejects.toMatchObject({ code: 'BAD_VOICE_SETTINGS' })
    await expect(renderClip(ask({ trial: true, voiceSettings: { stability: 2 } }), deps(svc, { resolve: eleven }))).rejects.toMatchObject({ code: 'BAD_VOICE_SETTINGS' })
    await expect(renderClip(ask({ trial: true, voiceSettings: { use_speaker_boost: false } }), deps(svc, { resolve: eleven }))).rejects.toMatchObject({ code: 'BAD_VOICE_SETTINGS' })
    await expect(renderClip(ask({ trial: true, model: 'eleven_v3' }), deps(svc))).rejects.toMatchObject({ code: 'MODEL_PROVIDER_UNSUPPORTED' })   // the Cartesia voice
    expect(trialMode.ELEVENLABS_TRIAL_MODELS).toEqual(['eleven_multilingual_v2', 'eleven_v3', 'eleven_v4', 'eleven_v4_turbo'])
  })

  it('ElevenLabs model and voice_settings reach the provider on a trial; the library is skipped; the answer echoes them', async () => {
    const { svc, bodies } = door()
    let seen = null
    const spy = { resolve: eleven, speak: (t, p, c, n) => { seen = c; return svc.speak(t, p, c, n) } }
    const out = await renderClip(ask({ trial: true, text: 'Wos wolln mia?', model: 'eleven_v4', voiceSettings: { stability: 0.4, similarity_boost: 0.8, speed: 0.85, style: 0.1 } }), deps(svc, spy))
    expect(bodies).toHaveLength(1)
    expect(bodies[0].url).toContain(`/text-to-speech/${TAMARA}`)
    expect(bodies[0].body.model_id).toBe('eleven_v4')
    expect(bodies[0].body.voice_settings).toMatchObject({ stability: 0.4, similarity_boost: 0.8, speed: 0.85, style: 0.1 })
    expect(seen.door.skipLibrary).toBe(true)
    expect(out).toMatchObject({ ok: true, trial: true, model: 'eleven_v4', voiceSettings: { speed: 0.85 }, provider: 'elevenlabs' })
  })

  it('an ElevenLabs trial defaults stability to 1.0 (Kai 2026-10-28) unless it names one; a plain trial keeps library-first', async () => {
    const { svc, bodies } = door()
    let seen = null
    const spy = { resolve: eleven, speak: (t, p, c, n) => { seen = c; return svc.speak(t, p, c, n) } }
    const plain = await renderClip(ask({ trial: true, text: 'rotn' }), deps(svc, spy))
    expect(bodies[0].body.voice_settings.stability).toBe(1)
    expect(seen.door.skipLibrary).toBe(false)
    expect(plain.voiceSettings).toEqual({ stability: 1 })
    await renderClip(ask({ trial: true, text: 'wolln', model: 'eleven_v4' }), deps(svc, spy))
    expect(bodies[1].body.voice_settings.stability).toBe(1)
    await renderClip(ask({ trial: true, text: 'siech', voiceSettings: { stability: 0.3 } }), deps(svc, spy))
    expect(bodies[2].body.voice_settings.stability).toBe(0.3)
    expect(trialMode.TRIAL_DEFAULT_STABILITY).toBe(1)
  })

  it('a course (non-trial) ElevenLabs render is unchanged: eleven_multilingual_v2, house settings', async () => {
    const { svc, bodies } = door()
    // straight through the door (the cast gate would refuse this uncast voice on the entry); trial door bypasses the gates only
    await require('./shared/chain-context.cjs').run('test', () => svc.speak('Servus', 'elevenlabs', { apiKey: 'k', voiceId: TAMARA, door: { courseCode: 'deu_at_for_eng', language: 'deu', trial: true } }, 1))
    expect(bodies[0].body.model_id).toBe('eleven_multilingual_v2')
    expect(bodies[0].body.voice_settings).toEqual({ stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true })
  })

  it('[audio tags] pass only on a trial naming an audio-tag model; other brackets stay refused', async () => {
    const { svc, paid } = door()
    const tagged = '[slowly] Wos wolln mia… essn?'
    await expect(renderClip(ask({ trial: true, text: tagged, model: 'eleven_v3' }), deps(svc, { resolve: eleven }))).resolves.toMatchObject({ ok: true })
    await expect(renderClip(ask({ trial: true, text: tagged, model: 'eleven_multilingual_v2' }), deps(svc, { resolve: eleven }))).rejects.toThrow(/not-an-example/)
    await expect(renderClip(ask({ trial: true, text: tagged }), deps(svc, { resolve: eleven }))).rejects.toThrow(/not-an-example/)
    await expect(renderClip(ask({ trial: true, text: '[calm, measured pace] {masc} rotn', model: 'eleven_v4' }), deps(svc, { resolve: eleven }))).rejects.toThrow(/not-an-example/)
    expect(paid).toEqual([tagged])
  })

  it('a different model is counted apart by the repeat limit; the house model keeps every existing key', () => {
    const { repeatKey } = require('./shared/tts-spend-guard.cjs')
    expect(repeatKey('elevenlabs', 'v', 'rotn', 1, 'eleven_v3')).not.toBe(repeatKey('elevenlabs', 'v', 'rotn', 1))
    expect(repeatKey('elevenlabs', 'v', 'rotn', 1, 'eleven_multilingual_v2')).toBe(repeatKey('elevenlabs', 'v', 'rotn', 1))
    expect(repeatKey('elevenlabs', 'v', 'rotn', 1, null)).toBe(repeatKey('elevenlabs', 'v', 'rotn'))
  })

  it('a trial render leaves ZERO course rows changed — no course_audio insert (so audio_autolink cannot fire), no link, no LEGO, no re-record', async () => {
    const { svc } = door()
    const writes = []
    const rec = name => async (...a) => { writes.push(name); throw new Error(`${name} called by a trial`) }
    const d = deps(svc, { resolve: eleven, store: rec('store'), link: rec('link'), linkLego: rec('linkLego'), replace: rec('replace'), adopt: rec('adopt'), loadClip: rec('loadClip'), immersionTurn: rec('immersionTurn'), spliceIntro: rec('spliceIntro'), humanIntro: rec('humanIntro') })
    for (const extra of [{}, { model: 'eleven_v3', text: '[slowly] rotn' }, { voiceSettings: { speed: 0.7 } }, { dryRun: true }]) {
      const out = await renderClip(ask({ trial: true, role: 'target1', courseCode: 'deu_at_for_eng', ...extra }), d)
      expect(out.trial).toBe(true)
      if (!extra.dryRun) expect(out.audioId).toMatch(/^trial_/)
    }
    expect(writes).toEqual([])
    // The production storeTrial (phase8) writes S3 under trial/ and NOTHING to the database: no course_audio row
    // (the only table audio_autolink fires on), no clip_index, no pointer.
    const src = fs.readFileSync(path.join(__dirname, 'phases/phase8-audio-v13.cjs'), 'utf8')
    const body = src.slice(src.indexOf('storeTrial: async'), src.indexOf('\n      store: async', src.indexOf('storeTrial: async')))
    expect(body).toContain('trialMode.trialKey(')
    expect(body).not.toMatch(/supabase|writePaidClipRow|clipIndex|clip_index|course_audio|\.insert\(|\.update\(|\.upsert\(/)
  })
})
