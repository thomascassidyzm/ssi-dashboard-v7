/**
 * The reading half of superseding a redone take.
 *
 * groupTakesByPhrase decides which take the engine actually uses. It has always
 * done that by recency — "latest per (phrase, cadence) wins" — ordered by
 * `recorded_at`, which is stamped by the RECORDIST'S PHONE and sent up with the
 * upload. That is a clock we do not own, and if it is wrong the take the
 * recordist rejected wins.
 *
 * So an explicit supersede decision (services/take-supersede.cjs) has to beat
 * the clock, and it has to do so without changing what happens to the many
 * thousands of takes recorded before the flag existed.
 */
import { describe, it, expect } from 'vitest'
const { fromProvenanceRow, groupTakesByPhrase } = require('./provenance-adapter.cjs')

const LINE = 'i wü iatz wos auf Deitsch sogn'

function take({ uuid, recordedAt, s3Key, supersededBy = null, cadence = 'slow' }) {
  return {
    audio_uuid: uuid,
    recorded_at: recordedAt,
    quality_notes: JSON.stringify({
      course_code: 'deu_at_for_eng', text: LINE, cadence,
      voice_id: 'sascha', role: 'target', s3_key: s3Key,
      ...(supersededBy ? { superseded_by: supersededBy } : {})
    })
  }
}

const rows = (...r) => r.map(fromProvenanceRow)

describe('a superseded take is never the take that gets used', () => {
  it('carries the supersede mark off the row', () => {
    const t = fromProvenanceRow(take({ uuid: 'OLD', recordedAt: '2026-08-19T10:00:00Z', s3Key: 'a.mp3', supersededBy: 'NEW' }))
    expect(t.supersededBy).toBe('NEW')
  })

  it('picks the redo even when the rejected take claims the LATER clock time', () => {
    // The whole point: the bad take's phone said it was recorded last.
    const groups = groupTakesByPhrase(rows(
      take({ uuid: 'BAD', recordedAt: '2026-08-19T23:59:00Z', s3Key: 'bad.mp3', supersededBy: 'GOOD' }),
      take({ uuid: 'GOOD', recordedAt: '2026-08-19T09:00:00Z', s3Key: 'good.mp3' })
    ))
    expect([...groups.values()][0].slow.id).toBe('GOOD')
  })

  it('still falls back to recency for takes that carry no mark at all', () => {
    // Every take recorded before 2026-08-21 is in this state, so this is the
    // behaviour for almost the entire estate and it must not have changed.
    const groups = groupTakesByPhrase(rows(
      take({ uuid: 'FIRST', recordedAt: '2026-08-19T09:00:00Z', s3Key: 'first.mp3' }),
      take({ uuid: 'SECOND', recordedAt: '2026-08-19T10:00:00Z', s3Key: 'second.mp3' })
    ))
    expect([...groups.values()][0].slow.id).toBe('SECOND')
  })

  it('supersedes per cadence — retiring the slow read leaves the natural one standing', () => {
    const groups = groupTakesByPhrase(rows(
      take({ uuid: 'SLOW-BAD', recordedAt: '2026-08-19T09:00:00Z', s3Key: 'sb.mp3', supersededBy: 'SLOW-GOOD' }),
      take({ uuid: 'SLOW-GOOD', recordedAt: '2026-08-19T09:30:00Z', s3Key: 'sg.mp3' }),
      take({ uuid: 'NAT', recordedAt: '2026-08-19T09:10:00Z', s3Key: 'n.mp3', cadence: 'natural' })
    ))
    const g = [...groups.values()][0]
    expect(g.slow.id).toBe('SLOW-GOOD')
    expect(g.natural.id).toBe('NAT')
  })

  it('leaves the phrase with nothing rather than reaching for a rejected take', () => {
    // If every take of a line was superseded, the honest answer is "no usable
    // take", not "use the one they threw away".
    const groups = groupTakesByPhrase(rows(
      take({ uuid: 'BAD', recordedAt: '2026-08-19T09:00:00Z', s3Key: 'bad.mp3', supersededBy: 'GONE' })
    ))
    expect([...groups.values()][0]?.slow ?? null).toBeNull()
  })
})
