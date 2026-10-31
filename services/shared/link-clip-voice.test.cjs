/**
 * link-clip checks the VOICE as well as the words (Tom, 2026-10-31). Fixtures only.
 * Run: npx vitest run services/shared/link-clip-voice.test.cjs
 */
import { describe, it, expect, afterEach } from 'vitest'
const { linkClips } = require('./link-clip.cjs')
const resolveVoice = require('./resolve-voice.cjs')

const MALE = 'cartesia_aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const FEMALE = 'cartesia_bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'
const GOOD = '11111111-1111-4111-8111-111111111111'
const WRONG = '22222222-2222-4222-8222-222222222222'

function fakeDb(tables) {
  const writes = []
  return {
    writes,
    from(table) {
      const f = []; let patch = null
      const rows = () => (tables[table] || []).filter(r => f.every(([k, v]) => (v === null ? r[k] == null : String(r[k]) === String(v))))
      const b = {
        select() { if (patch) { const hit = rows(); hit.forEach(r => Object.assign(r, patch)); writes.push({ table, patch }); return Promise.resolve({ data: hit.map(r => ({ id: r.id })), error: null }) } return b },
        eq(k, v) { f.push([k, v]); return b }, is(k, v) { f.push([k, v]); return b }, filter(k, o, v) { f.push([k, v]); return b },
        update(p) { patch = p; return b },
        maybeSingle() { return Promise.resolve({ data: rows()[0] || null, error: null }) },
      }
      return b
    },
  }
}
const world = () => ({
  courses: [{ course_code: 'ita_for_eng', known_lang: 'eng', target_lang: 'ita', dialect: null, voice_pool_key: null, known_dialect: null }],
  course_seeds: [{ id: 's1', course_code: 'ita_for_eng', seed_number: 4, known_text: 'I want it', target_text: 'lo voglio', target2_audio_id: null }],
  course_legos: [], course_practice_phrases: [],
  course_audio: [
    { id: GOOD, text: 'lo voglio', voice_id: MALE, language: 'ita', origin: 'tts' },
    { id: WRONG, text: 'lo voglio', voice_id: FEMALE, language: 'ita', origin: 'tts' },
  ],
})
const bump = async () => '1.0.1'

afterEach(() => resolveVoice.useCast(null))

describe('link-clip voice check', () => {
  const castWith = () => resolveVoice.useCast({
    roles: [{ language: 'ita', gender: 'm', slot: 'phrase', rank: 0, voice_id: MALE, assigned_by: 'thomas.cassidy+ssi@gmail.com', notes: null }, { language: 'ita', gender: 'f', slot: 'phrase', rank: 0, voice_id: FEMALE, assigned_by: 'thomas.cassidy+ssi@gmail.com', notes: null }],
    voices: [{ voice_id: MALE, is_active: true, gender: 'm' }, { voice_id: FEMALE, is_active: true, gender: 'f' }],
  })

  it('REFUSES a words-correct clip in the wrong voice, naming slot, expected voice and clip voice; writes nothing', async () => {
    castWith(); const t = world(); const db = fakeDb(t)
    const out = await linkClips({ db, courseCode: 'ita_for_eng', links: [{ seedNumber: 4, role: 'target2', audioId: WRONG }], bump })
    expect(out.ok).toBe(false); expect(out.linked).toBe(0)
    expect(out.results[0].code).toBe('VOICE_MISMATCH')
    expect(out.results[0].error).toContain('S0004')
    expect(out.results[0].error).toContain(MALE)
    expect(out.results[0].error).toContain(FEMALE)
    expect(t.course_seeds[0].target2_audio_id).toBeNull()
    expect(db.writes).toEqual([])
  })

  it('links the same words in the slot\'s cast voice', async () => {
    castWith(); const t = world(); const db = fakeDb(t)
    const out = await linkClips({ db, courseCode: 'ita_for_eng', links: [{ seedNumber: 4, role: 'target2', audioId: GOOD }], bump })
    expect(out.ok).toBe(true); expect(out.linked).toBe(1)
    expect(t.course_seeds[0].target2_audio_id).toBe(GOOD)
  })

  it('an unreadable cast refuses (not knowing is not permission)', async () => {
    resolveVoice.useCast(null)
    const t = world(); const db = fakeDb(t) // no voice_language_roles table → cast unreadable
    const out = await linkClips({ db, courseCode: 'ita_for_eng', links: [{ seedNumber: 4, role: 'target2', audioId: GOOD }], bump })
    expect(out.ok).toBe(false); expect(out.results[0].code).toBe('VOICE_MISMATCH')
  })
})
