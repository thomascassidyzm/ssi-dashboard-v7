/**
 * A bad take_quality mark in recording_provenance must reach the recordist
 * queue as an outstanding rerecord_wanted.target — see the header of
 * propagate-take-quality-wants.cjs for the full incident (Catrin's page
 * still reading "4 of 154" after three takes were marked bad).
 */
import { describe, it, expect } from 'vitest'
const { parseNotes, resolveIdentity, run } = require('./propagate-take-quality-wants.cjs')

function badMark(over = {}) {
  return {
    course_code: 'cym_n_for_eng', mode: 'pod', sentence_id: 'cym_n_for_eng:pod-0:SC01-S004',
    kind: 'target', voice_id: 'human_catrinlliar_cym_n',
    take_quality: { verdict: 'bad', status: 'superseded-pending-rerecord', reason: 'no speech in the take' },
    ...over,
  }
}

describe('resolveIdentity — reading a bad mark out of either observed provenance shape', () => {
  it('reads the top-level (mode:pod) shape', () => {
    const id = resolveIdentity(badMark())
    expect(id).toEqual({
      sentenceId: 'cym_n_for_eng:pod-0:SC01-S004', voiceId: 'human_catrinlliar_cym_n',
      kind: 'target', reason: 'no speech in the take',
    })
  })

  it('reads the older mark-aran-clipped-takes shape (identity nested under take_quality.evidence)', () => {
    const ctx = {
      sentence_id: 'cym_n_for_eng:pod-0:SC04-S003', text: '...',
      take_quality: {
        verdict: 'bad', status: 'superseded-pending-rerecord', reason: 'clipped at the boundary',
        evidence: { pod_sentence_id: 'cym_n_for_eng:pod-0:SC04-S003', pod_side: 'target', voice_id: 'human_aran_cym_n_2' },
      },
    }
    expect(resolveIdentity(ctx)).toEqual({
      sentenceId: 'cym_n_for_eng:pod-0:SC04-S003', voiceId: 'human_aran_cym_n_2',
      kind: 'target', reason: 'clipped at the boundary',
    })
  })

  it('ignores a row with no take_quality at all', () => {
    expect(resolveIdentity({ course_code: 'cym_n_for_eng' })).toBe(null)
  })

  it('ignores a take_quality mark that is not bad', () => {
    expect(resolveIdentity(badMark({ take_quality: { verdict: 'good' } }))).toBe(null)
  })

  it('still resolves on status alone, without a verdict field', () => {
    const id = resolveIdentity(badMark({ take_quality: { status: 'superseded-pending-rerecord', reason: 'x' } }))
    expect(id.sentenceId).toBe('cym_n_for_eng:pod-0:SC01-S004')
  })
})

describe('parseNotes', () => {
  it('parses a JSON string', () => {
    expect(parseNotes('{"a":1}')).toEqual({ a: 1 })
  })
  it('returns null for malformed JSON rather than throwing', () => {
    expect(parseNotes('not json')).toBe(null)
  })
  it('returns null for a plain string note (pre-JSON legacy rows)', () => {
    expect(parseNotes('some legacy free-text note')).toBe(null)
  })
})

/** A stub of the two tables this tool reads/writes, recording every write. */
function stubDb({ provenanceRows, sentenceRows }) {
  const writes = []
  const sentences = new Map(sentenceRows.map((s) => [s.id, { ...s }]))
  return {
    writes,
    from(table) {
      if (table === 'recording_provenance') {
        return {
          select: () => ({
            like: async () => ({ data: provenanceRows, error: null }),
          }),
        }
      }
      if (table === 'listening_pod_sentences') {
        return {
          select: () => ({
            eq: (_col, id) => ({
              maybeSingle: async () => ({ data: sentences.has(id) ? { ...sentences.get(id) } : null, error: null }),
            }),
          }),
          update(patch) {
            return {
              eq: async (_col, id) => {
                writes.push({ id, patch })
                sentences.set(id, { ...sentences.get(id), ...patch })
                return { error: null }
              },
            }
          },
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  }
}

describe('run — end to end against a stubbed db', () => {
  it('a bad-marked line with no prior want gets rerecord_wanted.target set, is NOT counted recorded, and keeps its old take linked', async () => {
    const db = stubDb({
      provenanceRows: [{ audio_uuid: 'BAD-1', quality_notes: JSON.stringify(badMark()) }],
      sentenceRows: [{ id: 'cym_n_for_eng:pod-0:SC01-S004', rerecord_wanted: null }],
    })
    process.env.DRY_RUN = '0'
    await run({ db })
    expect(db.writes.length).toBe(1)
    expect(db.writes[0].id).toBe('cym_n_for_eng:pod-0:SC01-S004')
    expect(db.writes[0].patch.rerecord_wanted.target).toBe('human_catrinlliar_cym_n')
  })

  it('a line whose target want is already set is left untouched (idempotent)', async () => {
    const db = stubDb({
      provenanceRows: [{ audio_uuid: 'BAD-1', quality_notes: JSON.stringify(badMark()) }],
      sentenceRows: [{ id: 'cym_n_for_eng:pod-0:SC01-S004', rerecord_wanted: { target: 'human_catrinlliar_cym_n' } }],
    })
    process.env.DRY_RUN = '0'
    await run({ db })
    expect(db.writes.length).toBe(0)
  })

  it('a known-track bad mark is left out of scope, never written', async () => {
    const db = stubDb({
      provenanceRows: [{ audio_uuid: 'BAD-KNOWN', quality_notes: JSON.stringify(badMark({ kind: 'known' })) }],
      sentenceRows: [{ id: 'cym_n_for_eng:pod-0:SC01-S004', rerecord_wanted: { known: 'someone-else' } }],
    })
    process.env.DRY_RUN = '0'
    await run({ db })
    expect(db.writes.length).toBe(0)
  })
})
