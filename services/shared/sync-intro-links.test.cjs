/**
 * sync-intro-links: lego_introductions re-synced from the LEGO's own link (job #143).
 * Run: npx vitest run services/shared/sync-intro-links.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { syncIntroLinks } = require('./sync-intro-links.cjs')

const OLD = 'a639e2a4-0000-4000-8000-000000000001'
const NEW = 'b5b5b5b5-0000-4000-8000-000000000002'
const OK = 'c0c0c0c0-0000-4000-8000-000000000003'

function fakeDb(tables) {
  const writes = []
  return {
    writes,
    from(table) {
      let rows = [...tables[table]]
      let patch = null
      const b = {
        select() { if (patch) { const hit = rows; hit.forEach((r) => Object.assign(r, patch)); writes.push({ table, patch, n: hit.length }); return Promise.resolve({ data: hit.map((r) => ({ id: r.id })), error: null }) } return b },
        order() { return b },
        eq(k, v) { rows = rows.filter((r) => r[k] === v); return b },
        not(k) { rows = rows.filter((r) => r[k] != null); return b },
        update(p) { patch = p; return b },
        range(a, z) { return Promise.resolve({ data: rows.slice(a, z + 1), error: null }) },
      }
      return b
    },
  }
}
const world = () => ({
  lego_introductions: [
    { id: 'i2', course_code: 'eng_for_hin', lego_id: 'S0117L02', presentation_audio_id: OLD },
    { id: 'i3', course_code: 'eng_for_hin', lego_id: 'S0117L03', presentation_audio_id: OLD },
    { id: 'i4', course_code: 'eng_for_hin', lego_id: 'S0117L04', presentation_audio_id: OK },   // in sync
    { id: 'i5', course_code: 'eng_for_hin', lego_id: 'S0117L05', presentation_audio_id: OLD },  // LEGO has no link
    { id: 'i6', course_code: 'eng_for_hin', lego_id: 'S0117L06', presentation_audio_id: null }, // legacy audio_uuid row
    { id: 'j1', course_code: 'other', lego_id: 'S0001L01', presentation_audio_id: OLD },
  ],
  course_legos: [
    { id: 'l2', course_code: 'eng_for_hin', lego_id: 'S0117L02', presentation_audio_id: NEW },
    { id: 'l3', course_code: 'eng_for_hin', lego_id: 'S0117L03', presentation_audio_id: NEW },
    { id: 'l4', course_code: 'eng_for_hin', lego_id: 'S0117L04', presentation_audio_id: OK },
    { id: 'l5', course_code: 'eng_for_hin', lego_id: 'S0117L05', presentation_audio_id: null },
    { id: 'l6', course_code: 'eng_for_hin', lego_id: 'S0117L06', presentation_audio_id: NEW },
    { id: 'm1', course_code: 'other', lego_id: 'S0001L01', presentation_audio_id: NEW },
  ],
})

describe('syncIntroLinks', () => {
  it('dry run lists only drifted rows and writes nothing', async () => {
    const db = fakeDb(world())
    const out = await syncIntroLinks({ db, courseCode: 'eng_for_hin' })
    expect(out.dryRun).toBe(true)
    expect(out.rows.map((r) => [r.legoId, r.oldClipId, r.newClipId])).toEqual([['S0117L02', OLD, NEW], ['S0117L03', OLD, NEW]])
    expect(out.skippedNullRows).toBe(1)
    expect(db.writes).toEqual([])
  })
  it('apply moves only those rows: never an unlinked LEGO, a null row, another course', async () => {
    const t = world()
    const out = await syncIntroLinks({ db: fakeDb(t), courseCode: 'eng_for_hin', apply: true, bump: async () => '1.0.1' })
    expect(out.synced).toBe(2)
    const by = Object.fromEntries(t.lego_introductions.map((r) => [r.id, r.presentation_audio_id]))
    expect(by).toEqual({ i2: NEW, i3: NEW, i4: OK, i5: OLD, i6: null, j1: OLD })
    expect((await syncIntroLinks({ db: fakeDb(t), courseCode: 'eng_for_hin' })).count).toBe(0)
  })
  it("'all' counts per course but refuses apply", async () => {
    const out = await syncIntroLinks({ db: fakeDb(world()), courseCode: 'all' })
    expect(out.perCourse).toEqual({ eng_for_hin: 2, other: 1 })
    expect((await syncIntroLinks({ db: fakeDb(world()), courseCode: 'all', apply: true })).code).toBe('ALL_IS_DRY_RUN_ONLY')
  })
})
