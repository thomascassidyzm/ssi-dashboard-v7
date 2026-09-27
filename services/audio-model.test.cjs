/**
 * TOM'S AUDIO MODEL, AS ASSERTIONS (2026-09-26 ~22:00Z, job #391).
 *
 *   "we have text that needs audio / what is the text - character by character
 *    / what language is it / … which voice is it … that's it / check to see if
 *    we have it … anywhere in the estate / … 1 voice for every known language
 *    … played at 1.0x … 1 target male and 1 target female … played at a slower
 *    speed by the app / SET ON A TARGET VOICE BASIS / as a configuration - per
 *    specific course"
 *
 * One describe per rule. The clip index and course_audio are in-memory
 * (clip-index.cjs memoryClipSource); the provider is Cartesia behind a stubbed
 * fetch, so every test COUNTS what would have been paid. No network, no DB.
 * Run: npx vitest run services/audio-model.test.cjs
 */
import { describe, it, expect, afterEach } from 'vitest'
const fs = require('fs')
const path = require('path')

const clipIndex = require('./shared/clip-index.cjs')
const clipLib = require('./shared/clip-library.cjs')
const castGate = require('./shared/voice-cast-gate.cjs')
const voiceCfg = require('./shared/course-voice-config.cjs')

const CHARLOTTE = '11111111-1111-4111-8111-111111111111'
const TOM = '22222222-2222-4222-8222-222222222222'
const GIULIA = '44444444-4444-4444-8444-444444444444'
const XIAO = '55555555-5555-4555-8555-555555555555'

let seq = 0
function row({ course, text, language, voice, role = 'target1', ...rest }) {
  seq++
  return {
    id: `row-${String(seq).padStart(4, '0')}`,
    course_code: course, text, text_normalized: text.toLowerCase(), language,
    voice_id: `cartesia_${voice}`, role, s3_key: `mastered/${seq}.mp3`, origin: 'tts', veracity_pass: null, ...rest,
  }
}

/** The index a backfill would build from these rows. */
const indexOf = rows => clipIndex.entriesFromRows(rows, 'test').entries

let restoreFetch = null
function door(rows, { index = indexOf(rows), courses = [] } = {}) {
  const lib = clipLib.indexedMemoryClipLibrary({ index, rows, courses }, r => Buffer.from(`bytes-of-${r.id}`))
  clipLib.useClipLibrary(lib)
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
  restoreFetch = () => { mod.exports = original; delete require.cache[require.resolve('./tts-service.cjs')] }
  return { svc, paid, source: lib.source }
}
afterEach(() => { if (restoreFetch) restoreFetch(); restoreFetch = null; castGate.useCastRows(null) })
const cfg = (voice, locale, d = {}) => ({ apiKey: 'k', voiceId: voice, locale, door: d })

describe('rule 1: a clip is language + exact text + voice; language is STORED, never inferred', () => {
  const facile = [
    row({ course: 'eng_for_x', text: 'facile', language: 'eng', voice: CHARLOTTE }),
    row({ course: 'ita_for_eng', text: 'facile', language: 'ita', voice: CHARLOTTE }),
    row({ course: 'fra_for_eng', text: 'facile', language: 'fra', voice: CHARLOTTE }),
  ]

  it('"facile" in English, Italian and French is three clips, even in one voice', () => {
    const keys = indexOf(facile).map(e => `${e.language}|${e.text_key}|${e.voice_id}`)
    expect(new Set(keys).size).toBe(3)
    expect(indexOf(facile).map(e => e.language).sort()).toEqual(['eng', 'fra', 'ita'])
  })

  it('an Italian request is answered by the Italian clip and never by the French one', async () => {
    const { svc, paid } = door(facile)
    const out = await svc.speak('facile', 'cartesia', cfg(CHARLOTTE, 'it-IT', { courseCode: 'ita_for_eng' }))
    expect(paid).toHaveLength(0)
    expect(out.existingClip.language).toBe('ita')
  })

  it('a row whose language cannot be named is counted, never guessed from its words', () => {
    const { entries, skipped } = clipIndex.entriesFromRows([row({ course: 'c', text: 'facile', language: 'auto', voice: CHARLOTTE })], 't')
    expect(entries).toHaveLength(0)
    expect(skipped['language-unnamed']).toBe(1)
  })

  it('"character by character": only the door\'s existing intake normalisation, a question is not its statement, accents are not folded', () => {
    expect(clipIndex.clipTextKey('  Voglio  parlare cinese. ')).toBe('voglio parlare cinese')
    expect(clipIndex.clipTextKey('you are coming?')).not.toBe(clipIndex.clipTextKey('you are coming'))
    expect(clipIndex.clipTextKey('ça va')).not.toBe(clipIndex.clipTextKey('ca va'))
  })

  it('two rows of one clip keep ONE canonical: human over TTS, then the lower id', () => {
    const a = row({ course: 'a', text: 'hello', language: 'eng', voice: TOM })
    const b = row({ course: 'b', text: 'hello', language: 'eng', voice: TOM, origin: 'human' })
    const { entries, collisions } = clipIndex.entriesFromRows([a, b], 't')
    expect(entries).toHaveLength(1)
    expect(collisions).toBe(1)
    expect(entries[0].audio_id).toBe(b.id)
  })
})

describe('rule 2: the lookup asks the index across the estate; another voice is reused; 0 rendered', () => {
  it('a course whose voice has no clip reuses the same words in another voice — one index read, no course_audio scan, no render', async () => {
    const existing = row({ course: 'eng_for_tam', text: 'I want to speak', language: 'eng', voice: TOM, role: 'known' })
    const { svc, paid, source } = door([existing])
    const out = await svc.speak('I want to speak', 'cartesia', cfg(CHARLOTTE, 'en-GB', { courseCode: 'eng_for_hin' }))
    expect(paid).toHaveLength(0)
    expect(out.charsSpent).toBe(0)
    expect(out.existingClip.id).toBe(existing.id)
    expect(source.calls.indexed).toBe(1)
  })

  it('the requested voice wins when the index holds it — answered without the fallback', async () => {
    const tom = row({ course: 'a', text: 'we heard it', language: 'eng', voice: TOM })
    const charlotte = row({ course: 'b', text: 'we heard it', language: 'eng', voice: CHARLOTTE })
    const { svc, paid, source } = door([tom, charlotte])
    const out = await svc.speak('we heard it', 'cartesia', cfg(CHARLOTTE, 'en-GB', { courseCode: 'c' }))
    expect(paid).toHaveLength(0)
    expect(out.existingClip.id).toBe(charlotte.id)
    expect(source.calls.fallback).toBe(0)
  })

  it('an index that does not yet hold a clip never turns a hit into a render: the fallback finds it and writes it through', async () => {
    const existing = row({ course: 'eng_for_hin', text: 'they heard', language: 'eng', voice: CHARLOTTE })
    const { svc, paid, source } = door([existing], { index: [] })
    const out = await svc.speak('they heard', 'cartesia', cfg(CHARLOTTE, 'en-GB', { courseCode: 'eng_for_tam' }))
    expect(paid).toHaveLength(0)
    expect(out.existingClip.id).toBe(existing.id)
    expect(source.index.map(e => e.audio_id)).toEqual([existing.id])
  })

  it('genuinely new words render once, in the cast voice', async () => {
    const { svc, paid } = door([])
    const out = await svc.speak('something new', 'cartesia', cfg(CHARLOTTE, 'en-GB', { courseCode: 'c' }))
    expect(paid).toEqual(['something new'])
    expect(out.charsSpent).toBe('something new'.length)
  })

  it('phase8 findSiblingCourseClip asks the same index (no row cap, no per-course scan)', async () => {
    const src = fs.readFileSync(path.join(__dirname, 'phases/phase8-audio-v13.cjs'), 'utf8')
    const fn = src.slice(src.indexOf('async function findSiblingCourseClip'), src.indexOf('let clipSource = null'))
    expect(fn).toMatch(/clipIndex\.resolveClip\(/)
    expect(fn).not.toMatch(/SIBLING_LOOKUP_LIMIT|\.limit\(/)
  })
})

describe('rule 3: one known + one target female + one target male; speed per target voice, applied by the app, never baked', () => {
  const vc = (extra = {}) => ({
    voices: {
      known: { voiceId: `cartesia_${CHARLOTTE}`, gender: 'f', settings: { speed: 1 } },
      target1: { voiceId: `cartesia_${GIULIA}`, gender: 'f', settings: { speed: 0.85 }, ...(extra.t1 || {}) },
      target2: { voiceId: `cartesia_${TOM}`, gender: 'm', settings: { speed: 0.9 }, ...(extra.t2 || {}) },
    },
  })

  it('reads the course as exactly one known, one target female, one target male', () => {
    const shape = voiceCfg.courseVoiceShape(vc({ t1: { playbackSpeed: 0.8 }, t2: { playbackSpeed: 0.85 } }))
    expect(shape.errors).toEqual([])
    expect(shape.known.playbackSpeed).toBe(1.0)
    expect(shape.targetFemale).toMatchObject({ slot: 'target1', playbackSpeed: 0.8 })
    expect(shape.targetMale).toMatchObject({ slot: 'target2', playbackSpeed: 0.85 })
  })

  it('flags two target voices of one gender, and a second known voice', () => {
    const two = vc({ t2: { gender: 'f' } })
    two.voices.known.byGender = { f: {}, m: {} }
    const { errors } = voiceCfg.courseVoiceShape(two)
    expect(errors).toContain('2 target female voices (want exactly 1)')
    expect(errors).toContain('0 target male voices (want exactly 1)')
    expect(errors).toContain('more than one known voice (known.byGender)')
  })

  it('a course on app-played speed renders EVERY voice at 1.0 — the playback speed never reaches the provider', () => {
    const c = vc({ t1: { playbackSpeed: 0.8 } })
    for (const role of ['known', 'target1', 'target2', 'presentation']) expect(voiceCfg.renderSpeedFor(c, role)).toBe(1.0)
  })

  it('a legacy course keeps its baked render speed (its clips are already slowed)', () => {
    expect(voiceCfg.renderSpeedFor(vc(), 'target1')).toBe(0.85)
    expect(voiceCfg.playbackSpeedFor(vc(), 'target1')).toBe(null)
  })

  it('known has no playback speed to set; a target speed outside [0.7, 1.0] is refused', () => {
    expect(() => voiceCfg.withPlaybackSpeed(vc(), 'known', 0.8)).toThrow(/TARGET/)
    expect(() => voiceCfg.withPlaybackSpeed(vc(), 'target1', 0.5)).toThrow()
    expect(voiceCfg.withPlaybackSpeed(vc(), 'target2', 0.85).voices.target2.playbackSpeed).toBe(0.85)
  })

  it('no phase8 render site reads settings.speed directly — every one asks renderSpeedFor', () => {
    const src = fs.readFileSync(path.join(__dirname, 'phases/phase8-audio-v13.cjs'), 'utf8')
    const code = src.split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n')
    expect(code).not.toMatch(/settings\?\.speed/)
    expect((code.match(/renderSpeedFor\(/g) || []).length).toBeGreaterThanOrEqual(7)
  })
})

describe('rule 4: the ~1% course-specific known line is new per course; its target side is the one shared clip', () => {
  it('zho_for_ita renders "voglio parlare cinese" and resolves 我想说中文 to the zho_for_eng clip', async () => {
    const target = row({ course: 'zho_for_eng', text: '我想说中文', language: 'zho', voice: XIAO })
    const known = row({ course: 'zho_for_eng', text: 'I want to speak Chinese', language: 'eng', voice: CHARLOTTE, role: 'known' })
    const { svc, paid } = door([target, known])

    const k = await svc.speak('voglio parlare cinese', 'cartesia', cfg(GIULIA, 'it-IT', { courseCode: 'zho_for_ita' }))
    const t = await svc.speak('我想说中文', 'cartesia', cfg(XIAO, 'zh-CN', { courseCode: 'zho_for_ita' }))

    expect(paid).toEqual(['voglio parlare cinese'])
    expect(k.charsSpent).toBe('voglio parlare cinese'.length)
    expect(t.charsSpent).toBe(0)
    expect(t.existingClip.id).toBe(target.id)
  })

  it('the Spanish course\'s known line is its own clip too — never the English or Italian one', async () => {
    const rows = [
      row({ course: 'zho_for_eng', text: 'I want to speak Chinese', language: 'eng', voice: CHARLOTTE }),
      row({ course: 'zho_for_ita', text: 'voglio parlare cinese', language: 'ita', voice: GIULIA }),
    ]
    const { svc, paid } = door(rows)
    await svc.speak('quiero hablar chino', 'cartesia', cfg(GIULIA, 'es-ES', { courseCode: 'zho_for_spa' }))
    expect(paid).toEqual(['quiero hablar chino'])
  })
})

describe('rule 5: region is a different language (Tom, 2026-09-26: "north/south welsh have very different accents, as does Mexican spanish")', () => {
  // Region is stated on the COURSE, exactly as the voice cast reads it
  // (cast-language-key.cjs): voice_pool_key, dialect, known_dialect.
  const course = (course_code, known_lang, target_lang, extra = {}) => ({ course_code, known_lang, target_lang, voice_pool_key: null, dialect: 'standard', known_dialect: null, ...extra })
  const COURSES = [
    course('spa_for_eng', 'eng', 'spa'),
    course('spa_mx_for_eng', 'eng', 'spa', { voice_pool_key: 'spa_mx' }),
    course('spa_mx_for_jpn', 'jpn', 'spa', { voice_pool_key: 'spa_mx' }),
    course('cym_n_for_eng', 'eng', 'cym', { dialect: 'north' }),
    course('cym_s_for_eng', 'eng', 'cym', { dialect: 'south' }),
    course('spa_for_cym', 'cym', 'spa', { known_dialect: 'north' }),
  ]
  const courseOf = code => COURSES.find(c => c.course_code === code) || null
  const castilian = row({ course: 'spa_for_eng', text: 'quiero hablar', language: 'spa', voice: GIULIA })
  const northern = row({ course: 'cym_n_for_eng', text: 'dw i isio siarad', language: 'cym', voice: TOM })
  const english = row({ course: 'spa_mx_for_eng', text: 'I want to speak', language: 'eng', voice: CHARLOTTE, role: 'known' })

  it('the index keys a clip by its course\'s region: spa, spa_mx, cym_north, cym_south — and a known side by known_dialect', () => {
    expect(clipIndex.clipLanguageKey('spa', courseOf('spa_for_eng'))).toBe('spa')
    expect(clipIndex.clipLanguageKey('es-MX', courseOf('spa_mx_for_eng'))).toBe('spa_mx')
    expect(clipIndex.clipLanguageKey('eng', courseOf('spa_mx_for_eng'))).toBe('eng')
    expect(clipIndex.clipLanguageKey('cym', courseOf('cym_n_for_eng'))).toBe('cym_north')
    expect(clipIndex.clipLanguageKey('cy', courseOf('cym_s_for_eng'))).toBe('cym_south')
    expect(clipIndex.clipLanguageKey('cym', courseOf('spa_for_cym'))).toBe('cym_north')
    expect(clipIndex.entriesFromRows([castilian, northern], 't', courseOf).entries.map(e => e.language).sort()).toEqual(['cym_north', 'spa'])
  })

  it('a Castilian clip is NOT held for a Mexican course — in any voice — so the Mexican line is new', async () => {
    const { svc, paid } = door([castilian], { index: clipIndex.entriesFromRows([castilian], 't', courseOf).entries, courses: COURSES })
    const out = await svc.speak('quiero hablar', 'cartesia', cfg(GIULIA, 'es-MX', { courseCode: 'spa_mx_for_eng' }))
    expect(out.existingClip).toBeNull()
    expect(paid).toEqual(['quiero hablar'])
  })

  it('North Welsh is not held for South Welsh, and South is not held for North', async () => {
    const southern = row({ course: 'cym_s_for_eng', text: 'dw i isio siarad', language: 'cym', voice: TOM })
    let d = door([northern], { index: clipIndex.entriesFromRows([northern], 't', courseOf).entries, courses: COURSES })
    expect((await d.svc.speak('dw i isio siarad', 'cartesia', cfg(TOM, 'cy-GB', { courseCode: 'cym_s_for_eng' }))).existingClip).toBeNull()
    restoreFetch()
    d = door([southern], { index: clipIndex.entriesFromRows([southern], 't', courseOf).entries, courses: COURSES })
    expect((await d.svc.speak('dw i isio siarad', 'cartesia', cfg(TOM, 'cy-GB', { courseCode: 'cym_n_for_eng' }))).existingClip).toBeNull()
  })

  it('a stale region-free index entry (as #391 wrote them) and the course_audio fallback both refuse the other region', async () => {
    // The pre-fix index filed the Castilian row under 'spa'; the Mexican
    // request must not see it via that entry nor via the fallback read.
    const stale = [{ language: 'spa_mx', text_key: 'quiero hablar', voice_id: `cartesia_${GIULIA}`, audio_id: castilian.id }]
    const { svc, source } = door([castilian], { index: stale, courses: COURSES })
    const out = await svc.speak('quiero hablar', 'cartesia', cfg(GIULIA, 'es-MX', { courseCode: 'spa_mx_for_eng' }))
    expect(out.existingClip).toBeNull()
    expect(source.calls.fallback).toBe(1)
    // …and what the fallback wrote through is keyed by the row's own region.
    expect(source.index.filter(e => e.audio_id === castilian.id).map(e => e.language)).toContain('spa')
  })

  it('the same region still reuses across courses, and English known lines are unaffected by the target\'s region', async () => {
    const mexican = row({ course: 'spa_mx_for_eng', text: 'quiero hablar', language: 'spa', voice: GIULIA })
    const rows = [castilian, mexican, english]
    const { svc, paid } = door(rows, { index: clipIndex.entriesFromRows(rows, 't', courseOf).entries, courses: COURSES })
    const t = await svc.speak('quiero hablar', 'cartesia', cfg(GIULIA, 'es-MX', { courseCode: 'spa_mx_for_jpn' }))
    const k = await svc.speak('I want to speak', 'cartesia', cfg(CHARLOTTE, 'en-GB', { courseCode: 'spa_for_eng' }))
    expect(paid).toHaveLength(0)
    expect(t.existingClip.id).toBe(mexican.id)
    expect(k.existingClip.id).toBe(english.id)
  })
})
