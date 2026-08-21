/**
 * Filing a RE-RECORD, as opposed to a first take.
 *
 * Both used to go through the same bare upsert, which repointed the clip's
 * s3_key with no revision bump and no ledger row. audio_revision is the
 * learner's cache key (<uuid>.v<rev>, served immutable and held in the player's
 * IndexedDB), so without the bump a learner who had already played the bad take
 * went on hearing it: the superseded take survived as the take that gets used.
 *
 * Kai's rule is that a redone take is SUPERSEDED, never deleted — so these hold
 * both halves of that sentence, plus the boundary that a first take of a line
 * must NOT be versioned (a swap needs something to swap off).
 *
 * The fake below is a real object graph rather than a module mock: it mimics
 * the subset of postgrest-js the module uses, so "which chain did it call" is
 * an assertion about behaviour and not about mocking.
 */
import { describe, it, expect } from 'vitest'
const { fileScriptTake, planScriptTakeFiling } = require('./script-take-filing.cjs')

const COURSE = { target_lang: 'deu', known_lang: 'eng' }
const quiet = { log: () => {}, error: () => {}, warn: () => {} }
const LINE = 'i wü iatz wos auf Deitsch sogn'

/**
 * @param existing  what the pre-filing lookup finds (null = first take)
 * @param revisions rows written to course_audio_revisions (the swap ledger)
 */
function fakeSupabase({ existing = null, upserts = [], revisions = [], updates = [], fail = null } = {}) {
  // The row is MUTABLE here on purpose. swapClipInPlace re-reads the row after
  // writing it and refuses unless the new key and revision actually took — a
  // fake that ignored its own update would pass a swap that silently no-opped,
  // which is the very bug this change removes.
  let row = existing ? { ...existing, course_code: 'deu_at_for_eng' } : null
  const selectChain = {
    eq: () => selectChain,
    maybeSingle: async () => (fail === 'lookup'
      ? { data: null, error: { message: 'lookup exploded' } }
      : { data: row, error: null }),
    single: async () => ({
      data: row,
      error: row ? null : { message: 'no row' },
    }),
  }
  return {
    upserts, revisions, updates,
    from(table) {
      if (table === 'course_audio_revisions') {
        return {
          upsert: async (row) => {
            revisions.push(row)
            return fail === 'ledger' ? { error: { message: 'ledger down' } } : { error: null }
          },
        }
      }
      return {
        select: () => selectChain,
        upsert: (row) => {
          upserts.push(row)
          return { select: () => ({ single: async () => ({ data: { id: 'NEW-ROW-ID' }, error: null }) }) }
        },
        update: (patch) => ({
          eq: async () => {
            updates.push(patch)
            if (row) row = { ...row, ...patch }
            return { error: null }
          },
        }),
      }
    },
  }
}

const plan = () => planScriptTakeFiling({
  metadata: { role: 'target2', cadence: 'natural', text: LINE },
  voiceId: 'human_sasha_wanasky_deu_at',
  course: COURSE,
})

const file = (supabase, over = {}) => fileScriptTake({
  supabase, courseCode: 'deu_at_for_eng', plan: plan(),
  s3Key: 'mastered/NEW.mp3', durationMs: 2400,
  recordedBy: 'sasha.wanasky@gmail.com', logger: quiet, ...over,
})

describe('the first take of a line', () => {
  it('is a plain upsert — there is nothing to supersede yet', async () => {
    const db = fakeSupabase({ existing: null })
    const r = await file(db)
    expect(r.filed).toBe(true)
    expect(r.courseAudioId).toBe('NEW-ROW-ID')
    expect(db.upserts).toHaveLength(1)
    expect(db.revisions).toHaveLength(0)
  })
})

describe('a re-record of a line that already has a clip', () => {
  const EXISTING = { id: 'ROW-1', s3_key: 'mastered/OLD.mp3', audio_revision: 1 }

  it('goes through the versioned swap, not the bare upsert', async () => {
    const db = fakeSupabase({ existing: EXISTING })
    const r = await file(db)
    expect(r.filed).toBe(true)
    expect(r.courseAudioId).toBe('ROW-1')
    expect(db.upserts).toHaveLength(0)
    expect(db.revisions).toHaveLength(1)
  })

  it('bumps the revision, so the retake can actually reach a learner', async () => {
    const db = fakeSupabase({ existing: EXISTING })
    await file(db)
    expect(db.revisions[0].revision).toBe(2)
    expect(db.revisions[0].previous_revision).toBe(1)
    expect(db.updates.some(u => u.audio_revision === 2)).toBe(true)
  })

  it('DELETES NOTHING — the ledger names the previous object so it stays findable', async () => {
    const db = fakeSupabase({ existing: EXISTING })
    await file(db)
    expect(db.revisions[0].previous_s3_key).toBe('mastered/OLD.mp3')
    expect(db.revisions[0].new_s3_key).toBe('mastered/NEW.mp3')
  })

  it('names who accepted it and why — the ledger is the rollback', async () => {
    const db = fakeSupabase({ existing: EXISTING })
    await file(db)
    expect(db.revisions[0].accepted_by).toBe('sasha.wanasky@gmail.com')
    expect(db.revisions[0].source).toBe('recordist-retake')
    expect(String(db.revisions[0].reason)).toContain('mastered/OLD.mp3')
  })

  it('falls back to an honest identity rather than failing the swap', async () => {
    // accepted_by is NOT NULL. Dropping back to an unversioned overwrite
    // because nobody sent a name would be strictly worse than 'recordist'.
    const db = fakeSupabase({ existing: EXISTING })
    await file(db, { recordedBy: null })
    expect(db.revisions[0].accepted_by).toBe('recordist')
  })

  it('does not swap a take onto itself when the very same key is re-filed', async () => {
    const db = fakeSupabase({ existing: { id: 'ROW-1', s3_key: 'mastered/NEW.mp3', audio_revision: 3 } })
    await file(db)
    expect(db.revisions).toHaveLength(0)
    expect(db.upserts).toHaveLength(1)
  })
})

describe('when something goes wrong', () => {
  it('reports loudly instead of throwing — the bytes are already safe', async () => {
    const db = fakeSupabase({ existing: { id: 'ROW-1', s3_key: 'mastered/OLD.mp3', audio_revision: 1 }, fail: 'ledger' })
    const r = await file(db)
    expect(r.filed).toBe(false)
    expect(r.reason).toBe('write_failed')
    expect(r.deliberate).toBe(false)
  })

  it('reports a failed lookup rather than silently overwriting unversioned', async () => {
    // Guessing "first take" on a failed lookup would resurrect the exact bug
    // this change exists to remove.
    const db = fakeSupabase({ fail: 'lookup' })
    const r = await file(db)
    expect(r.filed).toBe(false)
    expect(r.reason).toBe('write_failed')
    expect(db.upserts).toHaveLength(0)
  })
})
