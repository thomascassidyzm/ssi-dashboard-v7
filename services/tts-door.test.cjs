/**
 * TOM'S AUDIO RULINGS, AS ASSERTIONS ON THE ONE TTS DOOR (tts-service.speak).
 *
 * Tom, 2026-09-26: "when I say something I expect it to be turned into code and
 * used." Each describe below is one ruling; if the door ever stops honouring
 * it, this file fails and names the ruling.
 *
 * The provider is Cartesia behind a stubbed fetch, so every test can COUNT what
 * would have been paid for. The clip library is an in-memory table standing in
 * for course_audio across every course. No network, no DB.
 * Run: npx vitest run services/tts-door.test.cjs
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

const clipLib = require('./shared/clip-library.cjs')
const castGate = require('./shared/voice-cast-gate.cjs')

const CHARLOTTE = '11111111-1111-4111-8111-111111111111'
const TOM = '22222222-2222-4222-8222-222222222222'
const KRITI = '33333333-3333-4333-8333-333333333333'

let seq = 0
function clip({ course, text, language = 'eng', voice = CHARLOTTE, role = 'known', ...rest }) {
  seq++
  return {
    id: `clip-${seq}`,
    course_code: course,
    text,
    text_normalized: text.toLowerCase(),
    language,
    voice_id: `cartesia_${voice}`,
    role,
    s3_key: `audio/${course}/${seq}.mp3`,
    origin: 'tts',
    veracity_pass: null,
    ...rest,
  }
}

/** The door with the provider stubbed: returns { svc, paid } where paid lists every provider call. */
let restoreFetch = null
function door(rows, castRows = null) {
  clipLib.useClipLibrary(clipLib.memoryClipLibrary(rows, (row) => Buffer.from(`bytes-of-${row.id}`)))
  // A staged cast is Tom's cast (cast gate v2 counts only Tom-authored, non-draft rows).
  castGate.useCastRows(castRows && castRows.map(r => ({ assigned_by: 'thomas.cassidy+ssi@gmail.com', ...r })))
  const nodeFetch = require('node-fetch')
  const mod = require.cache[require.resolve('node-fetch')]
  const original = mod.exports
  const paid = []
  const stub = async (url, opts) => {
    paid.push({ url, text: JSON.parse(opts.body).transcript })
    const bytes = Buffer.alloc(8192, 1)
    return { ok: true, status: 200, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) }
  }
  Object.keys(nodeFetch).forEach(k => { stub[k] = nodeFetch[k] })
  mod.exports = stub
  delete require.cache[require.resolve('./tts-service.cjs')]
  const svc = require('./tts-service.cjs')
  restoreFetch = () => { mod.exports = original; delete require.cache[require.resolve('./tts-service.cjs')] }
  return { svc, paid }
}
afterEach(() => { if (restoreFetch) restoreFetch(); restoreFetch = null; castGate.useCastRows(null) })

const cfg = (voice = CHARLOTTE, locale = 'en-GB', door = {}) => ({ apiKey: 'k', voiceId: voice, locale, door })

describe('ruling: recordings are per LANGUAGE; courses point at them by id (Tom, 2026-09-13)', () => {
  it("answers course B's line with course A's clip — no render, 0 characters, and the id to point at", async () => {
    const existing = clip({ course: 'eng_for_hin', text: 'I want to speak' })
    const { svc, paid } = door([existing])
    const out = await svc.speak('I want to speak', 'cartesia', cfg(CHARLOTTE, 'en-GB', { courseCode: 'eng_for_tam' }))
    expect(paid).toHaveLength(0)
    expect(out.charsSpent).toBe(0)
    expect(out.existingClip.id).toBe(existing.id)
    expect(out.audioBuffer.toString()).toBe(`bytes-of-${existing.id}`)
  })

  it('a known clip answers a target request — role is not part of the take', async () => {
    const existing = clip({ course: 'hin_for_eng', text: 'thank you', role: 'known' })
    const { svc, paid } = door([existing])
    const out = await svc.speak('thank you', 'cartesia', cfg(CHARLOTTE, 'en', { courseCode: 'eng_for_hin' }))
    expect(paid).toHaveLength(0)
    expect(out.existingClip.id).toBe(existing.id)
  })

  it('the words must match exactly: a question is not its statement', async () => {
    const { svc, paid } = door([clip({ course: 'eng_for_hin', text: 'you are coming' })])
    await svc.speak('you are coming?', 'cartesia', cfg())
    expect(paid.map(p => p.text)).toEqual(['you are coming?'])
  })

  it('the language must match: the same spelling in another language is another take', async () => {
    const { svc, paid } = door([clip({ course: 'spa_for_eng', text: 'hotel', language: 'spa' })])
    await svc.speak('hotel', 'cartesia', cfg(CHARLOTTE, 'en-GB'))
    expect(paid).toHaveLength(1)
  })
})

describe('ruling: a recast applies to NEW content only — reuse is ANY voice (Tom, 2026-09-26, r-2026-09-26-a-recast-applies-to-new-content)', () => {
  it('another voice saying the same words IS the clip — no render, 0 characters (supersedes E1)', async () => {
    const existing = clip({ course: 'eng_for_hin', text: 'good morning', voice: TOM })
    const { svc, paid } = door([existing])
    const out = await svc.speak('good morning', 'cartesia', cfg(CHARLOTTE))
    expect(paid).toHaveLength(0)
    expect(out.charsSpent).toBe(0)
    expect(out.existingClip.id).toBe(existing.id)
    expect(out.existingClip.voice_id).toBe(`cartesia_${TOM}`)
  })

  it('a recast course whose lines exist in OLD voices renders nothing — the cast voice is only for lines never said', async () => {
    // eng_for_hin recast to Charlotte; its English was said by Tom and Kriti,
    // neither of whom is cast any more.
    const said = Array.from({ length: 40 }, (_, i) => `recast english line ${i}`)
    const rows = said.map((text, i) => clip({ course: i % 3 ? 'eng_for_hin' : 'eng_for_tam', text, voice: i % 2 ? TOM : KRITI, role: i % 2 ? 'target1' : 'target2' }))
    const before = JSON.stringify(rows)
    const { svc, paid } = door(rows, [{ language: 'eng', voice_id: `cartesia_${CHARLOTTE}` }])
    let chars = 0
    for (const text of said) chars += (await svc.speak(text, 'cartesia', cfg(CHARLOTTE, 'en-GB', { courseCode: 'eng_for_hin' }))).charsSpent
    expect(paid).toHaveLength(0)
    expect(chars).toBe(0)
    expect(JSON.stringify(rows)).toBe(before)
    // …and a line nobody has said is rendered in the cast voice.
    await svc.speak('a line nobody has said', 'cartesia', cfg(CHARLOTTE, 'en-GB', { courseCode: 'eng_for_hin' }))
    expect(paid.map(p => p.text)).toEqual(['a line nobody has said'])
  })

  it('among several voices, a clip already in the requested voice wins (widening only adds hits)', async () => {
    const tom = clip({ course: 'eng_for_hin', text: 'good night', voice: TOM, role: 'target1' })
    const charlotte = clip({ course: 'eng_for_tam', text: 'good night', voice: CHARLOTTE, role: 'known' })
    const { svc } = door([tom, charlotte])
    const out = await svc.speak('good night', 'cartesia', cfg(CHARLOTTE, 'en-GB', { courseCode: 'eng_for_mar' }))
    expect(out.existingClip.id).toBe(charlotte.id)
  })

  it('a pod line (voiceBound) is answered only in its own speaker\'s voice — speakers are told apart by voice', async () => {
    const { svc, paid } = door([clip({ course: 'eng_for_hin', text: 'good morning', voice: TOM })])
    const out = await svc.speak('good morning', 'cartesia', cfg(CHARLOTTE, 'en-GB', { voiceBound: true }))
    expect(paid).toHaveLength(1)
    expect(out.existingClip).toBeNull()
  })

  it('the same voice spelt bare or prefixed is ONE identity (voice-bound lookups)', async () => {
    const existing = clip({ course: 'eng_for_hin', text: 'good morning', voice: TOM })
    const { svc, paid } = door([existing])
    const out = await svc.speak('good morning', 'cartesia', cfg(`cartesia_${TOM}`, 'en-GB', { voiceBound: true }))
    expect(paid).toHaveLength(0)
    expect(out.existingClip.id).toBe(existing.id)
  })
})

describe('ruling: a voice change never re-renders existing audio (Tom, 2026-09-20)', () => {
  it('asking for a line in its OLD voice returns the old clip, even after that voice is no longer cast', async () => {
    const old = clip({ course: 'eng_for_hin', text: 'see you tomorrow', voice: TOM })
    const { svc, paid } = door([old], [{ language: 'eng', voice_id: `cartesia_${CHARLOTTE}` }])
    const out = await svc.speak('see you tomorrow', 'cartesia', cfg(TOM))
    expect(paid).toHaveLength(0)
    expect(out.existingClip.id).toBe(old.id)
  })

  it('the new cast voice asking for a line the OLD voice said gets the old clip; the old clips are left exactly as they are', async () => {
    const rows = [clip({ course: 'eng_for_hin', text: 'see you tomorrow', voice: TOM })]
    const before = JSON.stringify(rows)
    const { svc, paid } = door(rows, [{ language: 'eng', voice_id: `cartesia_${CHARLOTTE}` }])
    const out = await svc.speak('see you tomorrow', 'cartesia', cfg(CHARLOTTE))
    expect(paid).toHaveLength(0)
    expect(out.existingClip.id).toBe(rows[0].id)
    expect(JSON.stringify(rows)).toBe(before)
  })

  it('a voice that is not cast for the language may not render NEW audio', async () => {
    const { svc, paid } = door([], [{ language: 'eng', voice_id: `cartesia_${CHARLOTTE}` }])
    await expect(svc.speak('a brand new line', 'cartesia', cfg(TOM))).rejects.toThrow(/not cast for eng/)
    expect(paid).toHaveLength(0)
  })

  it('an audition may hear an uncast voice (that is how a voice gets cast)', async () => {
    const { svc, paid } = door([], [{ language: 'eng', voice_id: `cartesia_${CHARLOTTE}` }])
    await svc.speak('a brand new line', 'cartesia', cfg(TOM, 'en-GB', { audition: true }))
    expect(paid).toHaveLength(1)
  })

  // Tom 2026-10-10 (r-2026-10-10-no-clip-is-rendered-in-any): until then a language
  // with no cast rows was ungated, which is how eng_for_sin / eng_for_urd got 669
  // Azure known clips under job #355. Now: no Cartesia cast, no render, any provider.
  it('a language with no Cartesia cast renders nothing (was: ungated)', async () => {
    const { svc, paid } = door([], [{ language: 'eng', voice_id: `cartesia_${CHARLOTTE}` }])
    await expect(svc.speak('नमस्ते', 'cartesia', cfg(KRITI, 'hi-IN'))).rejects.toMatchObject({ code: 'VOICE_NOT_CAST', reason: 'uncast' })
    expect(paid).toHaveLength(0)
  })

  it('a language with no Cartesia cast still answers from the library (existing clips are never gated)', async () => {
    const rows = [clip({ course: 'eng_for_hin', text: 'नमस्ते', language: 'hin', voice: KRITI })]
    const { svc, paid } = door(rows, [{ language: 'eng', voice_id: `cartesia_${CHARLOTTE}` }])
    const out = await svc.speak('नमस्ते', 'cartesia', cfg(KRITI, 'hi-IN'))
    expect(out.existingClip.id).toBe(rows[0].id)
    expect(paid).toHaveLength(0)
  })
})

describe('ruling: a new course needs new audio only for its course-specific lines', () => {
  it('100 lines, 99 already said somewhere in the language: exactly one render, for the one new line', async () => {
    const shared = Array.from({ length: 99 }, (_, i) => `shared english line number ${i}`)
    const rows = shared.map((text, i) => clip({ course: i % 2 ? 'eng_for_hin' : 'eng_for_tam', text }))
    const { svc, paid } = door(rows)
    const lines = [...shared, 'a line only the new course has']
    let chars = 0
    let resolved = 0
    for (const text of lines) {
      const out = await svc.speak(text, 'cartesia', cfg(CHARLOTTE, 'en-GB', { courseCode: 'eng_for_mar' }))
      chars += out.charsSpent
      if (out.existingClip) resolved++
    }
    expect(resolved).toBe(99)
    expect(paid.map(p => p.text)).toEqual(['a line only the new course has'])
    expect(chars).toBe('a line only the new course has'.length)
  })

  it('a dry run spends nothing and reports what WOULD be paid for', async () => {
    const { svc, paid } = door([clip({ course: 'eng_for_hin', text: 'already here' })])
    const hit = await svc.speak('already here', 'cartesia', cfg(CHARLOTTE, 'en-GB', { dryRun: true }))
    const miss = await svc.speak('not yet said', 'cartesia', cfg(CHARLOTTE, 'en-GB', { dryRun: true }))
    expect(paid).toHaveLength(0)
    expect(hit.existingClip).not.toBeNull()
    expect(hit.audioBuffer).toBeNull()
    expect(miss.wouldSpendChars).toBe('not yet said'.length)
  })
})

describe('what the door refuses to hand back', () => {
  it("never another course's intro (Tom, 2026-08-07: intros ALWAYS rendered fresh)", async () => {
    const { svc, paid } = door([clip({ course: 'eng_for_tam', text: 'the english for', role: 'presentation' })])
    await svc.speak('the english for', 'cartesia', cfg(CHARLOTTE, 'en', { courseCode: 'eng_for_hin', intro: true }))
    expect(paid).toHaveLength(1)
  })

  it("but a course's OWN intro answers its own request", async () => {
    const own = clip({ course: 'eng_for_hin', text: 'the english for', role: 'presentation' })
    const { svc, paid } = door([own])
    const out = await svc.speak('the english for', 'cartesia', cfg(CHARLOTTE, 'en', { courseCode: 'eng_for_hin', intro: true }))
    expect(paid).toHaveLength(0)
    expect(out.existingClip.id).toBe(own.id)
  })

  it('never the clip a regenerate is replacing', async () => {
    const bad = clip({ course: 'eng_for_hin', text: 'a bad take' })
    const { svc, paid } = door([bad])
    await svc.speak('a bad take', 'cartesia', cfg(CHARLOTTE, 'en', { replacing: [bad.s3_key] }))
    expect(paid).toHaveLength(1)
  })

  it('never a clip a veracity check failed, nor a pending placeholder', async () => {
    const { svc, paid } = door([
      clip({ course: 'eng_for_hin', text: 'checked', veracity_pass: false }),
      clip({ course: 'eng_for_tam', text: 'checked', s3_key: 'pending/x' }),
    ])
    await svc.speak('checked', 'cartesia', cfg())
    expect(paid).toHaveLength(1)
  })
})

describe('the door never renders blind', () => {
  it('a failed lookup refuses the render — an outage is not "no clip exists"', async () => {
    const { svc, paid } = door([])
    clipLib.useClipLibrary({ name: 'down', candidates: async () => { throw new Error('TTS door: clip lookup failed (timeout) — refusing to render blind') } })
    await expect(svc.speak('anything', 'cartesia', cfg())).rejects.toThrow(/refusing to render blind/)
    expect(paid).toHaveLength(0)
  })

  it('a request it cannot name (no language) is refused, not rendered', async () => {
    const { svc, paid } = door([])
    await expect(svc.speak('anything', 'elevenlabs', { apiKey: 'k', voiceId: 'abc' })).rejects.toThrow(/cannot name this clip/)
    expect(paid).toHaveLength(0)
  })

  it('the per-provider renderers are not exported — speak is the only way in', () => {
    const svc = require('./tts-service.cjs')
    for (const name of ['generateCartesia', 'generateAzure', 'generateXai', 'generateElevenLabs', 'renderOnce', 'renderWithRetry']) {
      expect(svc[name]).toBeUndefined()
    }
    expect(svc.generate).toBeTypeOf('function')
    expect(svc.generateWithRetry).toBe(svc.speak)
  })
})

describe('ruling: NO ROLE — known and target are not distinguished at all (Tom, 2026-09-26 21:45Z)', () => {
  // "target and known voices are not distinguished AT ALL — a voice's phrase is
  // matched to the voice and the text and the language and NO ROLE; the app
  // plays the voices at different speeds."
  it('a line recorded as KNOWN in one course fills a TARGET slot in another — 0 characters', async () => {
    const known = clip({ course: 'eng_for_tam', text: 'where is the station', role: 'known' })
    const { svc, paid } = door([known])
    const out = await svc.speak('where is the station', 'cartesia', cfg(CHARLOTTE, 'en-GB', { courseCode: 'eng_for_hin' }))
    expect(paid).toHaveLength(0)
    expect(out.charsSpent).toBe(0)
    expect(out.existingClip.id).toBe(known.id)
  })

  it('a line recorded as TARGET in one course fills a KNOWN slot in another — 0 characters', async () => {
    const target = clip({ course: 'eng_for_hin', text: 'where is the station', role: 'target2' })
    const { svc, paid } = door([target])
    const out = await svc.speak('where is the station', 'cartesia', cfg(CHARLOTTE, 'en-GB', { courseCode: 'fra_for_eng' }))
    expect(paid).toHaveLength(0)
    expect(out.charsSpent).toBe(0)
    expect(out.existingClip.id).toBe(target.id)
  })

  it('tie-break is the preferred voice, never the role', () => {
    const want = { text: 'hello', language: 'eng', voiceId: `cartesia_${CHARLOTTE}`, courseCode: 'eng_for_hin' }
    const sameRoleOtherVoice = clip({ course: 'eng_for_tam', text: 'hello', role: 'target1', voice: TOM })
    const otherRoleInVoice = clip({ course: 'eng_for_tam', text: 'hello', role: 'known' })
    expect(clipLib.pickExistingClip([sameRoleOtherVoice, otherRoleInVoice], { ...want, role: 'target1' }).id).toBe(otherRoleInVoice.id)
    // A role on the request changes nothing — the answer is the same with or without it.
    for (const role of ['known', 'target1', 'target2', undefined]) {
      expect(clipLib.pickExistingClip([sameRoleOtherVoice, otherRoleInVoice], { ...want, role }).id).toBe(otherRoleInVoice.id)
    }
  })

  it('the intro exception is keyed on the SLOT (door.intro), not on what a row was recorded as', async () => {
    // Another course's intro row answers a non-intro slot saying the same words…
    const intro = clip({ course: 'eng_for_tam', text: 'the english for', role: 'presentation' })
    const { svc, paid } = door([intro])
    await svc.speak('the english for', 'cartesia', cfg(CHARLOTTE, 'en', { courseCode: 'eng_for_hin' }))
    expect(paid).toHaveLength(0)
    // …while an intro slot is answered only by its own course, whatever role the row carries.
    const own = clip({ course: 'eng_for_hin', text: 'the word for', role: 'known' })
    const other = clip({ course: 'eng_for_tam', text: 'the word for', role: 'presentation' })
    expect(clipLib.pickExistingClip([other, own], { text: 'the word for', language: 'eng', courseCode: 'eng_for_hin', ownCourseOnly: true }).id).toBe(own.id)
    expect(clipLib.pickExistingClip([other], { text: 'the word for', language: 'eng', courseCode: 'eng_for_hin', ownCourseOnly: true })).toBeNull()
  })

  it('no reuse lookup, filter or tie-break reads a role', () => {
    const fs = require('fs')
    const path = require('path')
    // The source of one named function, comments and .select('…') column lists
    // stripped (selecting a column to write a pointer row is not matching on it).
    const fnSource = (file, name) => {
      const text = fs.readFileSync(path.join(__dirname, file), 'utf8')
      const start = text.search(new RegExp(`(?:async )?function ${name}\\(`))
      if (start < 0) throw new Error(`${name} not found in ${file}`)
      const end = text.indexOf('\n}\n', start)
      return text.slice(start, end + 2)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')
        .replace(/\.select\(\s*(['"`])[^'"`]*\1\s*\)/g, '.select()')
    }
    const noRoleAtAll = [
      ['shared/clip-library.cjs', 'pickExistingClip'],
      ['shared/clip-library.cjs', 'findExistingClip'],
      ['shared/clip-library.cjs', 'memoryClipLibrary'],
      ['shared/clip-library.cjs', 'supabaseClipLibrary'],
      ['tts-service.cjs', 'speak'],
      ['phases/phase8-audio-v13.cjs', 'findSiblingCourseClip'],
      ['phases/phase8-audio-v13.cjs', 'lookupSiblingClip'],
      ['phases/phase8-audio-v13.cjs', 'findAudioRowForClip'],
      ['phases/phase8-audio-v13.cjs', 'reuseOptsFromRequest'],
    ]
    for (const [file, name] of noRoleAtAll) {
      expect(fnSource(file, name), `${file} ${name}`).not.toMatch(/\brole\b|crossRole|isSpeedTrustedVoice/i)
    }
    // The batch planner names SLOTS by role (freshRoles: intros are never
    // borrowed), but never compares a candidate row's role.
    const decide = fnSource('audio-reuse-planner.cjs', 'decideClip')
    expect(decide).not.toMatch(/row\.role|crossRole|isSpeedTrustedVoice/)
  })
})
