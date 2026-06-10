// Contract tests for the reconciled provenance adapter: the upload seam
// writes the aligner context as JSON inside quality_notes (live table has no
// course/voice/chunks columns) — see services/recording-upload-helpers.cjs
// buildProvenanceContext. These rows are the engine's real input.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const adapter = require('../provenance-adapter.cjs')

const CTX = {
  course_code: 'mkd_for_fra',
  mode: 'script',
  role: 'target1',
  cadence: 'slow',
  text: 'Сакам да зборувам македонски',
  seed_number: 3,
  chunks_string: 'Сакам|да зборувам|македонски',
  s3_key: 'mastered/AAAA-1111.mp3',
  voice_id: 'human_richard_mkd',
}

function liveRow(ctxOverrides = {}, rowOverrides = {}) {
  return {
    audio_uuid: 'AAAA-1111',
    recorded_by: 'richard@example.org',
    recorded_at: '2026-06-10T12:00:00Z',
    quality_notes: JSON.stringify({ ...CTX, ...ctxOverrides }),
    ...rowOverrides,
  }
}

function fakeSupabase(rows) {
  return { from: () => ({ select: async () => ({ data: rows, error: null }) }) }
}

describe('fromProvenanceRow (live quality_notes JSON shape)', () => {
  it('maps the upload seam writer shape to a canonical take', () => {
    const take = adapter.fromProvenanceRow(liveRow())
    expect(take.id).toBe('AAAA-1111')
    expect(take.courseCode).toBe('mkd_for_fra')
    expect(take.s3Key).toBe('mastered/AAAA-1111.mp3')
    expect(take.phraseText).toBe('Сакам да зборувам македонски')
    expect(take.chunksString).toBe('Сакам|да зборувам|македонски')
    expect(take.voiceId).toBe('human_richard_mkd')
    expect(take.role).toBe('target1')
    expect(take.cadence).toBe('slow')
    expect(take.method).toBe('take') // absence of method = a real take
    expect(take.recordedBy).toBe('richard@example.org')
  })

  it('survives plain-text quality_notes (pre-seam legacy rows)', () => {
    const take = adapter.fromProvenanceRow({ audio_uuid: 'X', quality_notes: 'sounded great' })
    expect(take.id).toBe('X')
    expect(take.courseCode).toBe(null)
    expect(take.phraseText).toBe(null)
  })

  it('marks engine outputs via ctx.method=spliced', () => {
    const take = adapter.fromProvenanceRow(liveRow({ method: 'spliced' }))
    expect(take.method).toBe('spliced')
  })
})

describe('fetchProvenanceRows filtering', () => {
  const rows = [
    liveRow(), // matching course + voice
    liveRow({ course_code: 'cym_for_eng' }, { audio_uuid: 'OTHER-COURSE' }),
    liveRow({ voice_id: 'human_anna_mkd', role: 'target2' }, { audio_uuid: 'OTHER-VOICE' }),
    // pre-M2 row: no voice_id stamped, role only
    liveRow({ voice_id: undefined }, { audio_uuid: 'ROLE-ONLY' }),
  ]

  it('filters by parsed course_code and voice_id, role fallback for unstamped rows', async () => {
    const { rows: takes, error } = await adapter.fetchProvenanceRows(fakeSupabase(rows), {
      courseCode: 'mkd_for_fra', voiceId: 'human_richard_mkd', role: 'target1',
    })
    expect(error).toBe(null)
    expect(takes.map(t => t.id).sort()).toEqual(['AAAA-1111', 'ROLE-ONLY'])
  })

  it('without role, only voice-stamped rows match', async () => {
    const { rows: takes } = await adapter.fetchProvenanceRows(fakeSupabase(rows), {
      courseCode: 'mkd_for_fra', voiceId: 'human_richard_mkd',
    })
    expect(takes.map(t => t.id)).toEqual(['AAAA-1111'])
  })

  it('role fallback only claims unstamped rows of the same slot', async () => {
    const { rows: takes } = await adapter.fetchProvenanceRows(fakeSupabase(rows), {
      courseCode: 'mkd_for_fra', voiceId: 'human_anna_mkd', role: 'target2',
    })
    expect(takes.map(t => t.id)).toEqual(['OTHER-VOICE'])
  })

  it('no voiceId → every take for the course', async () => {
    const { rows: takes } = await adapter.fetchProvenanceRows(fakeSupabase(rows), {
      courseCode: 'mkd_for_fra',
    })
    expect(takes).toHaveLength(3)
  })
})
