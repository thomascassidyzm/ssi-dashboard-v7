/**
 * The bulk filler's reuse step is VOICE-BOUND (Tom, 2026-10-31; 9 Oct: Alessandra's female clips relabelled into Lorenzo's
 * male Italian slots). Fixtures only: no database, no provider, no render.
 * Run: npx vitest run services/phases/phase8-reuse-voice-bound.test.cjs
 */
import { describe, it, expect, beforeAll } from 'vitest'
const { loadPhase8 } = require('./__fixtures__/phase8-sandbox.cjs')
const clipIndex = require('../shared/clip-index.cjs')

beforeAll(() => {
  process.env.SUPABASE_URL = 'http://127.0.0.1:9'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only'
  process.env.SUPABASE_SERVICE_KEY = 'test-only'
})

const LORENZO = 'cartesia_aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa' // the slot's cast voice (male, target2)
const ALESSANDRA = 'cartesia_bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb' // a different voice, same words
const TEXT = 'avrei fatto tutto per te'
const row = (o) => ({ id: 'x1', course_code: 'other_for_eng', text: TEXT, text_normalized: TEXT, language: 'ita', role: 'target1', voice_id: ALESSANDRA, s3_key: 'mastered/ALE.mp3', duration_ms: 1500, origin: 'tts', ...o })

function setup(rows) {
  const tables = { course_audio: rows.map(r => ({ ...r })) }
  const { phase8, supabase } = loadPhase8({ tables })
  phase8.useClipSource(clipIndex.memoryClipSource({ rows: tables.course_audio, courses: [] }))
  return { phase8, supabase, tables }
}
const ask = (phase8, extra = {}) => phase8.reuseSiblingIntoCourse({ courseCode: 'ita_for_eng', text: TEXT, language: 'ita', role: 'target2', voiceId: LORENZO, ...extra })

describe('bulk filler reuse is voice-bound', () => {
  it('only an other-voice clip exists → NOT reused, nothing written (falls through to a render via the single route)', async () => {
    const { phase8, tables } = setup([row()])
    const out = await ask(phase8)
    expect(out).toBeNull()
    expect(tables.course_audio.filter(r => r.course_code === 'ita_for_eng')).toEqual([])
  })

  it('the same lookup the fill passes make (lookupSiblingClip) answers a miss for a wrong-voice clip', async () => {
    const { phase8 } = setup([row()])
    const hit = await phase8.lookupSiblingClip('ita_for_eng', TEXT, 'ita', LORENZO, { includeOwnCourse: true })
    expect(hit.status).toBe('miss')
  })

  it('a clip in the slot\'s voice is reused, and the new row is labelled with the SLOT\'s voice', async () => {
    const { phase8, tables } = setup([row({ voice_id: ALESSANDRA }), row({ id: 'x2', voice_id: LORENZO, s3_key: 'mastered/LOR.mp3' })])
    const out = await ask(phase8)
    expect(out).toMatchObject({ s3Key: 'mastered/LOR.mp3' })
    const made = tables.course_audio.filter(r => r.course_code === 'ita_for_eng')
    expect(made).toHaveLength(1)
    expect(made[0].voice_id).toBe(LORENZO)
  })

  it('veracity_pass=false is still never reused, even in the right voice (the 25 Oct filter is kept)', async () => {
    const { phase8 } = setup([row({ voice_id: LORENZO, veracity_pass: false })])
    expect(await ask(phase8)).toBeNull()
  })
})
