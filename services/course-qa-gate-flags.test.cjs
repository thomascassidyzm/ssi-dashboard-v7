// raiseDetectorFlags — the approval gate's one machine-write.
//
// The gate's governing law is "machines may flag audio; only humans may pass it".
// Raising a flag is the one thing a machine IS allowed to do here, because a flag
// is an annotation: it puts a clip in a human's field of view and touches nothing.
// These tests hold the edges of that permission — especially the two places where
// a careless implementation would let a machine overrule a person or drown them.
import { describe, it, expect } from 'vitest'
import { createGate, GateError } from './course-qa-gate.cjs'

/** A supabase double narrow enough to read: only what raiseDetectorFlags touches. */
function makeDb ({ existingFlags = [] } = {}) {
  const inserted = []
  const client = {
    from (table) {
      if (table !== 'audio_clip_flags') throw new Error(`unexpected table ${table}`)
      const q = {
        _rows: existingFlags,
        select () { return q },
        eq (col, val) { q._rows = q._rows.filter(r => r[col] === val); return q },
        in (col, vals) { q._rows = q._rows.filter(r => vals.includes(r[col])); return q },
        insert (rows) { inserted.push(...rows); q._insert = rows; return q },
        then (resolve) {
          if (q._insert) return resolve({ data: q._insert.map((r, i) => ({ id: `f${i}`, audio_id: r.audio_id })), error: null })
          return resolve({ data: q._rows, error: null })
        },
      }
      // `.select()` after `.insert()` must resolve to the inserted rows, and the
      // fake reaches that through the same thenable, so both orders work.
      return q
    },
  }
  return { client, inserted }
}

const gateOn = (db) => createGate({ getDb: () => db.client, logger: { log () {}, warn () {}, error () {} } })

const row = (over = {}) => ({
  audio_id: 'a1', course_code: 'deu_for_eng', audio_revision: 1,
  source: 'detector', detector: 'edge-shape', severity: 'suspect',
  reason: 'the shape of a trim, not an ending', detector_precision: 0.8,
  metrics: { fallRate: 1.23, zeroPadPct: 85.8 },
  ...over,
})

describe('raiseDetectorFlags', () => {
  it('refuses without an actor — a machine flag still needs a person to answer for it', async () => {
    const db = makeDb()
    await expect(gateOn(db).raiseDetectorFlags({ courseCode: 'deu_for_eng', rows: [row()] }))
      .rejects.toThrow(/actor is required/i)
    expect(db.inserted).toEqual([])
  })

  it('refuses to write a row claiming to be human', async () => {
    // The whole audit trail rests on being able to tell a machine's opinion from a
    // person's. A route that could smuggle source='human' through here would destroy
    // that distinction silently.
    const db = makeDb()
    await expect(gateOn(db).raiseDetectorFlags({
      courseCode: 'deu_for_eng', rows: [row({ source: 'human' })], actor: 'kai',
    })).rejects.toThrow(/only writes source='detector'/i)
    expect(db.inserted).toEqual([])
  })

  it('refuses rows belonging to another course', async () => {
    const db = makeDb()
    await expect(gateOn(db).raiseDetectorFlags({
      courseCode: 'deu_for_eng', rows: [row({ course_code: 'fra_for_eng' })], actor: 'kai',
    })).rejects.toThrow(/must belong to the course/i)
  })

  it('attributes to BOTH the detector and the person who pressed it', async () => {
    const db = makeDb()
    const out = await gateOn(db).raiseDetectorFlags({
      courseCode: 'deu_for_eng', rows: [row()], actor: 'kai@ssi.com',
    })
    expect(out.raised).toBe(1)
    expect(db.inserted[0].raised_by).toBe('edge-shape via kai@ssi.com')
    expect(db.inserted[0].source).toBe('detector')
    // The precision travels with the flag, so a reviewer reading it knows how far to trust it.
    expect(db.inserted[0].detector_precision).toBe(0.8)
  })

  it('does not double-raise a flag that is already open — a scan is re-runnable', async () => {
    // Without this, run the scan twice and every open flag doubles; three times and the
    // queue is noise nobody trusts.
    const db = makeDb({ existingFlags: [
      { audio_id: 'a1', audio_revision: 1, detector: 'edge-shape', resolution: null, course_code: 'deu_for_eng', source: 'detector' },
    ] })
    const out = await gateOn(db).raiseDetectorFlags({
      courseCode: 'deu_for_eng', rows: [row(), row({ audio_id: 'a2' })], actor: 'kai',
    })
    expect(out.raised).toBe(1)
    expect(out.alreadyOpen).toBe(1)
    expect(db.inserted.map(r => r.audio_id)).toEqual(['a2'])
  })

  it('will NOT reopen a flag a human already cleared at that revision', async () => {
    // A person listened, decided this clip was fine, and said so with their name on it.
    // The detector re-flagging the same bytes is the detector being overruled, not new
    // information — so it is counted and reported, never re-inserted.
    const db = makeDb({ existingFlags: [
      { audio_id: 'a1', audio_revision: 1, detector: 'edge-shape', resolution: 'cleared_by_human', course_code: 'deu_for_eng', source: 'detector' },
    ] })
    const out = await gateOn(db).raiseDetectorFlags({
      courseCode: 'deu_for_eng', rows: [row()], actor: 'kai',
    })
    expect(out.raised).toBe(0)
    expect(out.clearedAlready).toBe(1)
    expect(db.inserted).toEqual([])
  })

  it('DOES flag a new revision, because that is different audio', async () => {
    // The human cleared revision 1. Revision 2 is bytes nobody has heard.
    const db = makeDb({ existingFlags: [
      { audio_id: 'a1', audio_revision: 1, detector: 'edge-shape', resolution: 'cleared_by_human', course_code: 'deu_for_eng', source: 'detector' },
    ] })
    const out = await gateOn(db).raiseDetectorFlags({
      courseCode: 'deu_for_eng', rows: [row({ audio_revision: 2 })], actor: 'kai',
    })
    expect(out.raised).toBe(1)
    expect(db.inserted[0].audio_revision).toBe(2)
  })

  it('does not insert the same clip twice from one scan', async () => {
    const db = makeDb()
    const out = await gateOn(db).raiseDetectorFlags({
      courseCode: 'deu_for_eng', rows: [row(), row()], actor: 'kai',
    })
    expect(out.raised).toBe(1)
    expect(db.inserted.length).toBe(1)
  })

  it('writes nothing, and says so, when there is nothing to write', async () => {
    const db = makeDb()
    const out = await gateOn(db).raiseDetectorFlags({ courseCode: 'deu_for_eng', rows: [], actor: 'kai' })
    expect(out).toMatchObject({ raised: 0, alreadyOpen: 0, clearedAlready: 0 })
    expect(db.inserted).toEqual([])
  })
})
