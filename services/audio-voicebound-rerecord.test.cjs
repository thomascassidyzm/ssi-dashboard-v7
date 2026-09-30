/**
 * VOICE-BOUND REGENERATE + RE-RECORD (job #741): a regenerate of the male slot never files the female clip of the
 * same words under it, and the render route can re-record a named clip in place.
 * No network, no DB. Run: npx vitest run services/audio-voicebound-rerecord.test.cjs
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
const { phraseRenderDoor } = require('./shared/phrase-render-door.cjs')

const KRITI = '33333333-3333-4333-8333-333333333333'
const KRITI_ID = `cartesia_${KRITI}`
let dir, restore = null

/** A course_audio row as the library holds it. */
const clip = (o) => ({ id: o.id, course_code: o.course || 'ita_for_eng', text: o.text, text_normalized: o.text, language: o.language || 'ita', voice_id: o.voice, s3_key: `mastered/${o.id}.mp3`, origin: 'tts', veracity_pass: true, ...o.extra })

/** tts-service with node-fetch replaced by a stub that COUNTS what would be paid. */
function door(rows = []) {
  clipLib.useClipLibrary(clipLib.memoryClipLibrary(rows))
  castGate.useCastRows([])
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


const FEMALE = '44444444-4444-4444-8444-444444444444'
const FEMALE_ID = `cartesia_${FEMALE}`
const MALE = KRITI
const MALE_ID = KRITI_ID
const female = () => clip({ id: 'FEM1', course: 'deu_for_eng', text: 'guten tag', language: 'deu', voice: FEMALE_ID })
const cfgMale = (d = {}) => ({ apiKey: 'k', voiceId: MALE, locale: 'de-DE', phonologyGate: false, door: { courseCode: 'deu_for_eng', language: 'deu', ...d } })

describe('regenerate-phrase asks for the requested voice only (job #741)', () => {
  it('REPRODUCTION: an any-voice door answers the male slot with the female clip (the 26 Sep swap)', async () => {
    const { svc, paid } = door([female()])
    const out = await svc.speak('guten tag', 'cartesia', cfgMale({ replacing: ['unrelated'] }), 1)
    expect(out.existingClip.voice_id).toBe(FEMALE_ID)   // female bytes handed back for a male request
    expect(paid).toEqual([])
  })

  it('the phrase door is voice-bound: the female clip is not handed back, the male voice is rendered once', async () => {
    const { svc, paid } = door([female()])
    const out = await svc.speak('guten tag', 'cartesia', cfgMale(phraseRenderDoor({ courseCode: 'deu_for_eng', role: 'target2', replacing: ['old'] })), 1)
    expect(out.existingClip).toBeNull()
    expect(paid).toEqual(['guten tag'])
  })

  it('a voice-bound door still reuses a clip that IS in the requested voice', async () => {
    const male = clip({ id: 'MAL1', course: 'deu_for_eng', text: 'guten tag', language: 'deu', voice: MALE_ID })
    const { svc, paid } = door([female(), male])
    const out = await svc.speak('guten tag', 'cartesia', cfgMale(phraseRenderDoor({ courseCode: 'deu_for_eng', role: 'target2' })), 1)
    expect(out.existingClip.id).toBe('MAL1')
    expect(paid).toEqual([])
  })

  it('every door and reuse lookup in the /regenerate-phrase handler goes through the voice-bound helper', () => {
    const src = fs.readFileSync(path.join(__dirname, 'phases/phase8-audio-v13.cjs'), 'utf8')
    const a = src.indexOf("app.post('/regenerate-phrase/"), b = src.indexOf("// Clones /regenerate-phrase's recipe")
    const handler = src.slice(a, b)
    expect(handler).not.toMatch(/door:\s*\{/)
    expect((handler.match(/door: phraseRenderDoor\(/g) || []).length).toBe(4)
    expect(handler).toMatch(/lookupOpts: PHRASE_REUSE_LOOKUP/)
  })
})

describe('every explicit regenerate route is voice-bound (job #741)', () => {
  it('no door literal that names `replacing` (regenerate-role/-single/-lego) omits voiceBound', () => {
    const src = fs.readFileSync(path.join(__dirname, 'phases/phase8-audio-v13.cjs'), 'utf8')
    // intro: true (regenerate-presentation) is own-course-only by the door itself, so it is already single-voice.
    const literals = (src.match(/door: \{[^}\n]*replacing:[^}\n]*\}/g) || []).filter(l => !/intro: true/.test(l))
    expect(literals.length).toBeGreaterThanOrEqual(12)
    expect(literals.filter(l => !/voiceBound: true/.test(l))).toEqual([])
  })
})

describe('the render route: voiceBound and re-record (job #741)', () => {
  const row = { id: 'MALE-ROW', course_code: 'deu_for_eng', role: 'target2', language: 'deu', voice_id: MALE_ID, s3_key: 'mastered/OLD.mp3', origin: 'tts', text: 'guten tag' }
  const rdeps = (svc, extra = {}) => {
    const calls = { replace: [], link: 0 }
    return { calls, deps: {
      resolve: async ({ voiceId }) => ({ language: 'deu', voiceId: voiceId || MALE_ID, provider: 'cartesia', providerConfig: cfgMale() }),
      link: async () => { calls.link++; return null },
      speak: (t, p, c, n) => svc.speak(t, p, c, n),
      loadClip: async () => row,
      replace: async (a) => { calls.replace.push(a); return { audioId: a.replaceAudioId, s3Key: a.s3Key || 'mastered/NEW.mp3', durationMs: 900, revision: 2 } },
      store: async () => { throw new Error('a re-record never inserts a new row') },
      ...extra,
    } }
  }
  const req = (o = {}) => ({ courseCode: 'deu_for_eng', role: 'target2', text: 'guten tag', purpose: 'test', requestedBy: 'tester', replaceAudioId: 'MALE-ROW', ...o })

  it('voiceBound reaches the door: a female clip of the same words does not answer', async () => {
    const { svc, paid } = door([female()])
    const stored = []
    const d = { resolve: async () => ({ language: 'deu', voiceId: MALE_ID, provider: 'cartesia', providerConfig: cfgMale() }),
      link: async () => null, speak: (t, p, c, n) => svc.speak(t, p, c, n),
      store: async (x) => { stored.push(x); return { audioId: 'n', s3Key: 'k', durationMs: 1 } } }
    const out = await renderClip({ courseCode: 'deu_for_eng', role: 'target2', text: 'guten tag', purpose: 'p', requestedBy: 't', voiceBound: true }, d)
    expect(out.source).toBe('rendered')
    expect(paid).toEqual(['guten tag'])
    expect(stored[0].voiceId).toBe(MALE_ID)
  })

  it('a re-record renders in the clip\'s own voice, skips the library, and swaps the named row in place', async () => {
    const { svc, paid } = door([clip({ id: 'OLD', course: 'deu_for_eng', text: 'guten tag', language: 'deu', voice: MALE_ID, extra: { s3_key: 'mastered/OLD.mp3' } })])
    const { deps, calls } = rdeps(svc)
    const out = await renderClip(req(), deps)
    expect(out).toMatchObject({ ok: true, source: 'rendered', audioId: 'MALE-ROW', revision: 2, replaceAudioId: 'MALE-ROW' })
    expect(paid).toEqual(['guten tag'])          // the old clip did not answer its own replacement
    expect(calls.link).toBe(0)
    expect(calls.replace).toHaveLength(1)
    expect(calls.replace[0].voiceId).toBe(MALE_ID)
  })

  it('spokenText is what the voice says; the stored text is untouched', async () => {
    const { svc, paid } = door([])
    const { deps, calls } = rdeps(svc)
    const out = await renderClip(req({ text: "qualcos'altro", spokenText: 'qualcosaltro' }), deps)
    expect(paid).toEqual(['qualcosaltro'])
    expect(out.spoken).toBe('qualcosaltro')
    expect(calls.replace[0].text).toBe("qualcos'altro")
  })

  it('spokenText without a re-record is refused', async () => {
    const { svc } = door([])
    await expect(renderClip(req({ replaceAudioId: undefined, spokenText: 'x' }), rdeps(svc).deps)).rejects.toThrow(/spokenText/)
  })

  it('refuses another course\'s row, a human recording, a different role and a different voice — nothing spent', async () => {
    const { svc, paid } = door([])
    for (const [over, code] of [[{ course_code: 'ita_for_eng' }, 'WRONG_COURSE'], [{ origin: 'human' }, 'HUMAN_CLIP'], [{ role: 'target1' }, 'WRONG_ROLE']]) {
      const { deps } = rdeps(svc, { loadClip: async () => ({ ...row, ...over }) })
      await expect(renderClip(req(), deps)).rejects.toMatchObject({ code })
    }
    await expect(renderClip(req({ voiceId: FEMALE_ID }), rdeps(svc).deps)).rejects.toMatchObject({ code: 'VOICE_MISMATCH' })
    expect(paid).toEqual([])
  })

  it('a re-record dry run spends nothing and replaces nothing', async () => {
    const { svc, paid } = door([])
    const { deps, calls } = rdeps(svc)
    const out = await renderClip(req({ dryRun: true }), deps)
    expect(out).toMatchObject({ ok: true, dryRun: true, source: 'would-render' })
    expect(paid).toEqual([]); expect(calls.replace).toEqual([])
  })

  it('a spend-guard refusal is not retried and nothing is replaced', async () => {
    const { svc } = door([])
    svc.speak = async () => { throw new Error('TTS spend guard (402) REPEAT') }
    const { deps, calls } = rdeps(svc)
    await expect(renderClip(req(), deps)).rejects.toThrow(/402/)
    expect(calls.replace).toEqual([])
  })
})

describe('voice identity is the DEFAULT on the render route (job #944)', () => {
  const { providerForVoice } = require('./shared/render-voice-provider.cjs')
  it('validate defaults voiceBound on; only an explicit false opts out', () => {
    const { validate } = require('./shared/audio-render-entry.cjs')
    const b = { courseCode: 'c', role: 'target1', text: 't', purpose: 'p', requestedBy: 'x' }
    expect(validate(b).voiceBound).toBe(true)
    expect(validate({ ...b, voiceBound: false }).voiceBound).toBe(false)
  })
  it('the default reaches the door: a female clip of the same words does not answer an unflagged request', async () => {
    const { svc, paid } = door([female()])
    const d = { resolve: async () => ({ language: 'deu', voiceId: MALE_ID, provider: 'cartesia', providerConfig: cfgMale() }),
      link: async () => null, speak: (t, p, c, n) => svc.speak(t, p, c, n),
      store: async () => ({ audioId: 'n', s3Key: 'k', durationMs: 1 }) }
    const out = await renderClip({ courseCode: 'deu_for_eng', role: 'target2', text: 'guten tag', purpose: 'p', requestedBy: 't' }, d)
    expect(out.source).toBe('rendered')
    expect(paid).toEqual(['guten tag'])
  })
  it('a bare Azure voice name is Azure, a UUID is Cartesia, a course role keeps its stored provider', () => {
    expect(providerForVoice('en-GB-SoniaNeural')).toBe('azure')
    expect(providerForVoice('zh-CN-XiaoxiaoMultilingualNeural')).toBe('azure')
    expect(providerForVoice(KRITI)).toBe('cartesia')
    expect(providerForVoice('Leni', { voiceId: 'Leni', provider: 'Azure' })).toBe('azure')
    expect(providerForVoice('Leni')).toBeUndefined()
  })
})
