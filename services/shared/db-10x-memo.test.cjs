// Job #806: the two per-render reads Popty repeats are remembered for a minute.
import { describe, it, expect, beforeEach } from 'vitest'
import cev from './course-english-voice.cjs'
import hrr from './human-recorded-roles.cjs'

function fakeDb(rowsFor) {
  const calls = []
  const q = (table) => {
    const filters = {}
    const chain = {
      select: () => chain,
      eq: (k, v) => { filters[k] = v; return chain },
      order: () => chain,
      limit: () => { calls.push({ table, ...filters }); return Promise.resolve({ data: rowsFor(table, filters), error: null }) },
      then: (res, rej) => { calls.push({ table, ...filters }); return Promise.resolve({ data: rowsFor(table, filters), error: null }).then(res, rej) },
    }
    return chain
  }
  return { calls, from: q }
}

describe('db-10x memos (job #806)', () => {
  beforeEach(() => { cev.clearCourseEnglishVoiceMemo(); hrr.clearHumanRecordedRolesMemo() })

  it('courseEnglishVoice reads course_audio once for repeated asks about one course and role', async () => {
    const db = fakeDb(() => [{ voice_id: 'azure_en-GB-SoniaNeural' }])
    const a = await cev.courseEnglishVoice(db, 'spa_for_eng', 'known')
    const b = await cev.courseEnglishVoice(db, 'spa_for_eng', 'known')
    expect(b).toEqual(a)
    expect(db.calls.length).toBe(1)
    await cev.courseEnglishVoice(db, 'spa_for_eng', 'presentation')
    expect(db.calls.length).toBe(2)
  })

  it('loadHumanRecordedRoles reads the view once for repeated asks, and never remembers a failure', async () => {
    const db = fakeDb(() => [{ course_code: 'cym_n_for_eng', role: 'target1', clips: 3 }])
    expect(await hrr.loadHumanRecordedRoles(db)).toHaveLength(1)
    expect(await hrr.loadHumanRecordedRoles(db)).toHaveLength(1)
    expect(db.calls.length).toBe(1)
    const broken = { from: () => ({ select: () => Promise.resolve({ data: null, error: { message: 'no view' } }) }) }
    hrr.clearHumanRecordedRolesMemo()
    expect(await hrr.loadHumanRecordedRoles(broken)).toEqual([])
    const ok = fakeDb(() => [{ course_code: 'x', role: 'known' }])
    expect(await hrr.loadHumanRecordedRoles(ok)).toHaveLength(1)
  })
})
