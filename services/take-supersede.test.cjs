/**
 * Superseding a redone take — the marking half.
 *
 * Kai's rule: a redone take is SUPERSEDED, never deleted. So these cover both
 * halves of that sentence — the earlier take stops being the one that counts,
 * and nothing about it is removed.
 */
import { describe, it, expect } from 'vitest'
const { supersedeEarlierTakes, isSameSlot } = require('./take-supersede.cjs')

const COURSE = 'deu_at_for_eng'
const LINE = 'i wü iatz wos auf Deitsch sogn'

function ctx(over = {}) {
  return {
    course_code: COURSE, mode: 'script', role: 'target', voice_id: 'sascha',
    cadence: 'slow', text: LINE, s3_key: 'mastered/OLD.mp3', ...over
  }
}

/** A stub of the two PostgREST chains this module uses, recording its writes. */
function stubDb(rows) {
  const updates = []
  return {
    updates,
    from() {
      return {
        select: () => ({
          like: async () => ({
            data: rows.map(r => ({ audio_uuid: r.audio_uuid, quality_notes: JSON.stringify(r.ctx) })),
            error: null
          })
        }),
        update(patch) {
          return {
            eq: async (_col, val) => {
              updates.push({ audioUuid: val, patch })
              return { error: null }
            }
          }
        }
      }
    }
  }
}

describe('which earlier takes count as the same line', () => {
  const target = { courseCode: COURSE, textNorm: LINE.toLowerCase(), cadence: 'slow', voiceId: 'sascha', role: 'target' }

  it('matches the same line, cadence and voice', () => {
    expect(isSameSlot(ctx(), target)).toBe(true)
  })

  it('does not cross cadences — the slow read is not the natural one', () => {
    expect(isSameSlot(ctx({ cadence: 'natural' }), target)).toBe(false)
  })

  it('does not cross voices — another speaker’s good take is not superseded', () => {
    expect(isSameSlot(ctx({ voice_id: 'someone-else' }), target)).toBe(false)
  })

  it('does not cross courses', () => {
    expect(isSameSlot(ctx({ course_code: 'cym_n_for_eng' }), target)).toBe(false)
  })

  it('never supersedes a spliced engine output — that is not a take', () => {
    expect(isSameSlot(ctx({ method: 'spliced' }), target)).toBe(false)
  })

  it('refuses to guess on a row with neither voice nor a matching role', () => {
    expect(isSameSlot(ctx({ voice_id: null, role: 'known' }), target)).toBe(false)
  })
})

describe('marking the redone take', () => {
  const args = {
    courseCode: COURSE, text: LINE, cadence: 'slow',
    voiceId: 'sascha', role: 'target', audioUuid: 'NEW-TAKE'
  }

  it('marks the earlier take as superseded by the new one', async () => {
    const db = stubDb([{ audio_uuid: 'OLD-TAKE', ctx: ctx() }])
    const r = await supersedeEarlierTakes(db, args)
    expect(r.superseded).toEqual(['OLD-TAKE'])
    const written = JSON.parse(db.updates[0].patch.quality_notes)
    expect(written.superseded_by).toBe('NEW-TAKE')
    expect(written.superseded_at).toBeTruthy()
  })

  it('DELETES NOTHING — every field the take had survives, including its bytes', async () => {
    const db = stubDb([{ audio_uuid: 'OLD-TAKE', ctx: ctx() }])
    await supersedeEarlierTakes(db, args)
    const written = JSON.parse(db.updates[0].patch.quality_notes)
    // The pointer to the audio is untouched, so the object is still findable.
    expect(written.s3_key).toBe('mastered/OLD.mp3')
    for (const [k, v] of Object.entries(ctx())) expect(written[k]).toEqual(v)
    // The only writes are quality_notes rewrites — no delete call exists.
    expect(db.updates.every(u => Object.keys(u.patch).length === 1)).toBe(true)
  })

  it('never marks the take that was just uploaded', async () => {
    const db = stubDb([{ audio_uuid: 'NEW-TAKE', ctx: ctx() }])
    const r = await supersedeEarlierTakes(db, args)
    expect(r.superseded).toEqual([])
  })

  it('leaves an already-superseded take alone — the first decision stands', async () => {
    const db = stubDb([{ audio_uuid: 'OLD-TAKE', ctx: ctx({ superseded_by: 'MIDDLE-TAKE' }) }])
    const r = await supersedeEarlierTakes(db, args)
    expect(r.superseded).toEqual([])
    expect(db.updates).toEqual([])
  })

  it('retires every earlier take of the line, not just the last one', async () => {
    const db = stubDb([
      { audio_uuid: 'T1', ctx: ctx() },
      { audio_uuid: 'T2', ctx: ctx() },
      { audio_uuid: 'OTHER-LINE', ctx: ctx({ text: 'wia ma so oft wia möglich redt' }) }
    ])
    const r = await supersedeEarlierTakes(db, args)
    expect(r.superseded.sort()).toEqual(['T1', 'T2'])
  })

  it('does nothing, quietly, when the upload carried no text to match on', async () => {
    const db = stubDb([{ audio_uuid: 'OLD-TAKE', ctx: ctx() }])
    const r = await supersedeEarlierTakes(db, { ...args, text: null })
    expect(r.skipped).toBe('no text')
    expect(db.updates).toEqual([])
  })

  it('does nothing when there is no voice and no role — never guess across speakers', async () => {
    const db = stubDb([{ audio_uuid: 'OLD-TAKE', ctx: ctx() }])
    const r = await supersedeEarlierTakes(db, { ...args, voiceId: null, role: null })
    expect(r.skipped).toBe('no voice or role')
  })

  it('reports a database failure instead of throwing — an upload must never fail for this', async () => {
    const db = { from: () => ({ select: () => ({ like: async () => ({ data: null, error: { message: 'boom' } }) }) }) }
    const r = await supersedeEarlierTakes(db, args)
    expect(r.error).toBe('boom')
    expect(r.superseded).toEqual([])
  })
})
