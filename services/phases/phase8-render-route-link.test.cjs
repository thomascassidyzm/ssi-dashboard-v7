/**
 * Job #708: the one audio route's library step. A real request for text+voice
 * the course already holds LINKS that clip (no store, no write); a dry run writes
 * nothing at all. Run: npx vitest run services/phases/phase8-render-route-link.test.cjs
 */
import { describe, it, expect, beforeAll } from 'vitest'
const { loadPhase8 } = require('./__fixtures__/phase8-sandbox.cjs')
const clipIndex = require('../shared/clip-index.cjs')

beforeAll(() => {
  process.env.SUPABASE_URL = 'http://127.0.0.1:9'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only'
  process.env.SUPABASE_SERVICE_KEY = 'test-only'
})

const VOICE = 'azure_it-IT-ElsaNeural'
const TEXT = 'avrei fatto tutto per te'
const row = (o) => ({ id: 'a1', course_code: 'ita_for_eng', text: TEXT, text_normalized: TEXT, language: 'ita', role: 'target1', voice_id: VOICE, s3_key: 'mastered/OWN.mp3', duration_ms: 1500, origin: 'tts', ...o })
const ident = (o = {}) => ({ courseCode: 'ita_for_eng', text: TEXT, language: 'ita', role: 'target1', voiceId: VOICE, ...o })

function setup(rows) {
  const tables = { course_audio: rows.map(r => ({ ...r })) }
  const { phase8, supabase, s3 } = loadPhase8({ tables })
  const src = clipIndex.memoryClipSource({ rows: tables.course_audio, courses: [] })
  const writes = []
  // The clip-index source's write() is a write too (production upserts clip_index).
  const srcWrite = src.write.bind(src)
  src.write = async (r) => { writes.push('clip_index.write'); return srcWrite(r) }
  phase8.useClipSource(src)
  const orig = supabase.from.bind(supabase)
  supabase.from = (t) => {
    const q = orig(t)
    for (const m of ['upsert', 'insert', 'update', 'delete']) {
      const f = q[m]; if (f) q[m] = (...a) => { writes.push(`${t}.${m}`); return f.apply(q, a) }
    }
    return q
  }
  return { phase8, s3, writes }
}

describe('render route library step (#708)', () => {
  it('own-course exact hit → the existing clip, no write, no S3 put', async () => {
    const { phase8, s3, writes } = setup([row()])
    const out = await phase8.linkClipForRender(ident())
    expect(out).toMatchObject({ audioId: 'a1', s3Key: 'mastered/OWN.mp3' })
    expect(writes).toEqual([])
    expect(s3.putCalls).toEqual([])
  })

  it('dry run against another course\'s clip writes nothing', async () => {
    const { phase8, writes } = setup([row({ id: 'b1', course_code: 'other_for_eng', s3_key: 'mastered/SIB.mp3' })])
    const out = await phase8.linkClipForRender(ident({ dryRun: true }))
    expect(out).toMatchObject({ s3Key: 'mastered/SIB.mp3' })
    expect(writes).toEqual([])
  })

  it('a real request against another course\'s clip still links it (one upsert)', async () => {
    const { phase8, writes } = setup([row({ id: 'b1', course_code: 'other_for_eng', s3_key: 'mastered/SIB.mp3' })])
    const out = await phase8.linkClipForRender(ident())
    expect(out).toMatchObject({ s3Key: 'mastered/SIB.mp3' })
    expect(writes).toEqual(['clip_index.write', 'course_audio.upsert'])
  })
})
