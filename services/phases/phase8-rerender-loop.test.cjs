/**
 * The eng_for_hin re-render loop must be impossible (job #383, after #382).
 *
 * On 2026-09-25/26 a driver re-posted /generate/eng_for_hin 37 times and paid
 * Cartesia for 265,957 renders to voice 19,225 clips. Two faults compounded:
 *   - the linker read course_audio with `.limit(100000)` and PostgREST handed
 *     back 60,000 rows, so clips past the cap were never linked; and
 *   - the one reuse path (findSiblingCourseClip) asked only OTHER courses, so
 *     the course's own clip of the same words in the same voice was invisible
 *     and every pass rendered it again.
 *
 * These drive the SHIPPED POST /generate route against the in-memory PostgREST
 * double (with its max-rows truncation switched on) and count every call that
 * reaches the TTS provider. Zero live DB, zero S3, zero spend.
 */
import { describe, it, expect, beforeAll } from 'vitest'
const http = require('http')
const { loadPhase8 } = require('./__fixtures__/phase8-sandbox.cjs')

// Lazily-required post-pass helpers (envelope backfill, batch gate) build their
// OWN Supabase client after the sandbox's interception has been lifted. Point
// them at nothing so a test can never reach the live project.
beforeAll(() => {
  process.env.SUPABASE_URL = 'http://127.0.0.1:9'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only'
  process.env.SUPABASE_SERVICE_KEY = 'test-only'
})

const COURSE_CODE = 'zzz_for_hin'
const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121'
const TOM_001 = 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2'
const KRITI = 'cartesia_5283efe8-07d1-4e3a-b615-2ae4a81c1b73'
const REHAN = 'cartesia_205fc552-2cce-4307-baa1-598b9dc3dd01'

function voiceConfig({ genderedKnown }) {
  const known = { voiceId: KRITI, provider: 'cartesia', name: 'Kriti' }
  if (genderedKnown) {
    known.byGender = {
      f: { voiceId: KRITI, provider: 'cartesia', name: 'Kriti' },
      m: { voiceId: REHAN, provider: 'cartesia', name: 'Rehan' },
    }
  }
  return {
    voices: {
      known,
      target1: { voiceId: CHARLOTTE, provider: 'cartesia', name: 'Charlotte' },
      target2: { voiceId: TOM_001, provider: 'cartesia', name: 'tom_001' },
    },
  }
}

const TEXTS = ['heard', 'we heard it', 'you heard?', 'I have heard', 'they heard', 'she heard']

/**
 * The eng_for_hin state: every target slot NULL; every one of those lines
 * ALREADY rendered in this course in the configured voice — but stored after
 * more rows than the server will return in one select.
 */
function engForHinState({ genderedKnown = true, filler = 8 } = {}) {
  const course = { course_code: COURSE_CODE, known_lang: 'hin', target_lang: 'eng', seed_count: 1, voice_config: voiceConfig({ genderedKnown }) }
  const audio = []
  let n = 0
  const row = (text, role, voice) => ({
    id: `aud-${++n}`, course_code: COURSE_CODE, text, text_normalized: text.toLowerCase(),
    language: 'eng', role, voice_id: voice, origin: 'tts', s3_key: `mastered/${n}.mp3`,
    lego_id: null, created_at: `2026-09-25T00:00:${String(n).padStart(2, '0')}Z`,
  })
  for (let i = 0; i < filler; i++) audio.push(row(`filler line ${i}`, 'target1', CHARLOTTE))
  for (const t of TEXTS) { audio.push(row(t, 'target1', CHARLOTTE)); audio.push(row(t, 'target2', TOM_001)) }
  const phrases = TEXTS.map((t, i) => ({
    id: `ph-${i}`, course_code: COURSE_CODE, seed_number: 1, known_text: `hindi ${i}`, target_text: t,
    known_audio_id: `known-${i}`, target1_audio_id: null, target2_audio_id: null,
  }))
  return { courses: [course], course_audio: audio, course_practice_phrases: phrases, course_legos: [], course_seeds: [] }
}

function ttsDouble() {
  const tts = {
    calls: [],
    chars: 0,
    async generateWithRetry(text) {
      tts.calls.push(text)
      tts.chars += String(text).length
      return { audioBuffer: Buffer.from('not really audio'), wordBoundaries: null }
    },
  }
  return tts
}

// The veracity gate re-renders a failing clip; `attempts` lets a scenario make
// the render path spend more than it planned. Mastering fake bytes fails in
// ffmpeg, which is fine: the provider call — the money — happens before it.
function veracityDouble(attempts = 1) {
  return (real) => ({
    ...real,
    announceStatus() {},
    startCourse() { return { rate: 0, step_clips: 1 } },
    verdictColumns() { return {} },
    async renderChecked(o) {
      for (let i = 0; i < attempts; i++) {
        try { await o.render() } catch (e) { if (/spend cap/.test(e.message)) throw e }
      }
      return { published: true, attempts, buffer: Buffer.from('x'), durationMs: 100, wordBoundaries: null, verdict: null }
    },
  })
}

async function postGenerate(app, body) {
  const server = app.listen(0, '127.0.0.1')
  await new Promise(r => server.once('listening', r))
  try {
    const { port } = server.address()
    return await new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, method: 'POST', path: `/generate/${COURSE_CODE}`, headers: { 'Content-Type': 'application/json' } }, (res) => {
        let buf = ''
        res.on('data', c => { buf += c })
        res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(buf) }) } catch (e) { reject(new Error(buf)) } })
      })
      req.on('error', reject)
      req.end(JSON.stringify(body))
    })
  } finally {
    server.close()
  }
}

// maxRows 6: below the 20 course_audio rows (the truncation under test), and
// not below the 6 phrase rows, whose reads page at 1,000 exactly as live
// PostgREST's 60,000 cap never truncates them.
function load({ tables, maxRows = null, attempts = 1 }) {
  const tts = ttsDouble()
  // Every stored clip is really in the bucket (the needs pass HEADs linkable ones).
  const s3Objects = new Set(tables.course_audio.map(a => a.s3_key))
  const { phase8, db } = loadPhase8({ tables, tts, maxRows, s3Objects, doubles: { '/audio-veracity.cjs': veracityDouble(attempts) } })
  return { app: phase8, tts, db }
}

const FILL = { roles: ['known', 'target1', 'target2'], authorScope: 'none', concurrency: 4, phonologyGate: false }
const nullSlots = (db) => db.tables.course_practice_phrases.filter(p => !p.target1_audio_id || !p.target2_audio_id).length

describe('replay of the eng_for_hin state renders NOTHING', () => {
  it('clips past the 60k-style cap, gendered known voices (the JS linker path): zero TTS calls, every slot attached', async () => {
    const { app, tts, db } = load({ tables: engForHinState(), maxRows: 6 })
    const r = await postGenerate(app, FILL)
    expect(r.status).toBe(200)
    expect(tts.calls).toEqual([])
    expect(tts.chars).toBe(0)
    expect(nullSlots(db)).toBe(0)
  })

  it('a second pass over the same state still renders nothing and reports attached: 0 (the driver stop signal)', async () => {
    const tables = engForHinState()
    const first = load({ tables, maxRows: 6 })
    await postGenerate(first.app, FILL)
    const second = load({ tables, maxRows: 6 })
    const r = await postGenerate(second.app, FILL)
    expect(second.tts.calls).toEqual([])
    expect(r.body.attached).toBe(0)
  })
})

describe('the linker and the needs pass read every course_audio row (paging)', () => {
  it('getAudioNeeds sees a clip stored past the server row cap as linkable, not missing', async () => {
    const tables = engForHinState()
    const { app } = load({ tables, maxRows: 6 })
    const course = tables.courses[0]
    const needs = await app.getAudioNeeds(COURSE_CODE, 999, course, false, null)
    expect(needs.toGenerate).toEqual([])
    expect(needs.toLink).toBe(TEXTS.length * 2)
  })
})

describe('the one reuse path includes the course itself', () => {
  it('a slot whose clip exists in THIS course in this voice is attached, never rendered — even when the linker links nothing', async () => {
    // Non-gendered known: linking goes through the SQL RPC, which the double
    // answers with nothing. getAudioNeeds then sees "linkable" slots that
    // did not link and reclassifies them all as to-generate (Step B2) — the
    // render path is the last line, and it must find the course's own clip.
    const { app, tts, db } = load({ tables: engForHinState({ genderedKnown: false }) })
    const r = await postGenerate(app, FILL)
    expect(r.status).toBe(200)
    expect(tts.calls).toEqual([])
    expect(nullSlots(db)).toBe(0)
    expect(r.body.reuse.ownCourse).toBe(TEXTS.length * 2)
  })

  it('findSiblingCourseClip answers from the own course when asked to, and never matches a question to a statement', async () => {
    const tables = engForHinState({ genderedKnown: false })
    const { app } = load({ tables })
    const own = await app.findSiblingCourseClip(COURSE_CODE, 'heard', 'eng', CHARLOTTE, { includeOwnCourse: true })
    expect(own && own.course_code).toBe(COURSE_CODE)
    const otherOnly = await app.findSiblingCourseClip(COURSE_CODE, 'heard', 'eng', CHARLOTTE)
    expect(otherOnly).toBeNull()
    const question = await app.findSiblingCourseClip(COURSE_CODE, 'heard?', 'eng', CHARLOTTE, { includeOwnCourse: true })
    expect(question).toBeNull()
  })

  it('a recast course whose clips exist only in OLD voices renders nothing (r-2026-09-26-a-recast-applies-to-new-content)', async () => {
    // Recast both English roles to a voice that has never said a word; every
    // line exists in this course in the old Charlotte / tom_001 voices.
    const tables = engForHinState({ genderedKnown: false })
    const recast = { voiceId: 'cartesia_62ae83ad-4f6a-430b-af41-a9bede9286ca', provider: 'cartesia', name: 'New' }
    tables.courses[0].voice_config.voices.target1 = recast
    tables.courses[0].voice_config.voices.target2 = recast
    const { app, tts, db } = load({ tables })
    const r = await postGenerate(app, FILL)
    expect(r.status).toBe(200)
    expect(tts.calls).toEqual([])
    expect(nullSlots(db)).toBe(0)
  })

  it('findSiblingCourseClip answers in any voice, preferring the asked voice; voiceBound keeps the old same-voice key', async () => {
    const tables = engForHinState({ genderedKnown: false })
    const { app } = load({ tables })
    const NEW = 'cartesia_62ae83ad-4f6a-430b-af41-a9bede9286ca'
    const any = await app.findSiblingCourseClip(COURSE_CODE, 'heard', 'eng', NEW, { includeOwnCourse: true })
    // A hit in an old voice; which of the course's two old takes is decided by
    // id, never by role (Tom, 2026-09-26 21:45Z: NO ROLE).
    expect([CHARLOTTE, TOM_001]).toContain(any && any.voice_id)
    const asCharlotte = await app.findSiblingCourseClip(COURSE_CODE, 'heard', 'eng', CHARLOTTE, { includeOwnCourse: true })
    expect(asCharlotte.voice_id).toBe(CHARLOTTE)
    const asTom = await app.findSiblingCourseClip(COURSE_CODE, 'heard', 'eng', TOM_001, { includeOwnCourse: true })
    expect(asTom.voice_id).toBe(TOM_001)
    const bound = await app.findSiblingCourseClip(COURSE_CODE, 'heard', 'eng', NEW, { includeOwnCourse: true, voiceBound: true })
    expect(bound).toBeNull()
  })
})

describe('spend cap: a pass never spends more than 1.5x what it planned', () => {
  it('a render path that keeps re-rendering is stopped before the provider call that would breach the cap', async () => {
    const long = 'a'.repeat(1500)
    const tables = engForHinState({ genderedKnown: false })
    tables.course_practice_phrases = [{ id: 'ph-long', course_code: COURSE_CODE, seed_number: 1, known_text: 'k', target_text: long, known_audio_id: 'k1', target1_audio_id: null, target2_audio_id: 'x' }]
    const { app, tts } = load({ tables, attempts: 5 })
    const r = await postGenerate(app, FILL)
    // planned 1,500 chars → budget 2,250: the first render is paid, the second refused.
    expect(tts.calls.length).toBe(1)
    expect(r.body.status).toBe('spend-capped')
    expect(r.body.spend.spentChars).toBe(1500)
  })
})
