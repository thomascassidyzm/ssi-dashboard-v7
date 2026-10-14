/**
 * link-clip: the Popty door for "point this slot at that existing clip" (job #388).
 * Run: npx vitest run services/shared/link-clip.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { linkClips } = require('./link-clip.cjs')

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'

// Just enough supabase-js: from().select().eq()/.is().maybeSingle(), from().update().eq()/.is().select().
function fakeDb(tables, { raceOn = null } = {}) {
  const writes = []
  const db = {
    writes,
    from(table) {
      const filters = []
      let patch = null
      const rows = () => (tables[table] || []).filter((r) => filters.every(([k, v]) => (v === null ? r[k] == null : String(r[k]) === String(v))))
      const b = {
        select() { if (patch) return Promise.resolve(apply()); return b },
        eq(k, v) { filters.push([k, v]); return b },
        is(k, v) { filters.push([k, v]); return b },
        update(p) { patch = p; return b },
        maybeSingle() { return Promise.resolve({ data: rows()[0] || null, error: null }) },
      }
      function apply() {
        if (raceOn && patch[raceOn]) return { data: [], error: null }
        const hit = rows()
        hit.forEach((r) => Object.assign(r, patch))
        writes.push({ table, patch, n: hit.length })
        return { data: hit.map((r) => ({ id: r.id })), error: null }
      }
      return b
    },
  }
  return db
}

const world = () => ({
  course_seeds: [{ id: 's1', course_code: 'cym_nv2_for_eng', seed_number: 12, known_text: 'I want to speak Welsh', target_text: 'Dw i isio siarad Cymraeg', known_audio_id: null, target1_audio_id: B }],
  course_legos: [{ id: 'l1', course_code: 'cym_nv2_for_eng', seed_number: 12, lego_index: 2, known_text: 'to speak', target_text: 'siarad', target1_audio_id: null, presentation_audio_id: null }],
  course_practice_phrases: [],
  course_audio: [
    { id: A, text: 'I want to speak Welsh.', voice_id: 'human_aran_eng' },
    { id: C, text: 'Dw i isio siarad Cymraeg', voice_id: 'human_aran_cym_n' },
    { id: B, text: 'Dw i isio siarad Cymraeg', voice_id: 'old' },
  ],
})
const bumps = []
const bump = async (db, course, level) => { bumps.push([course, level]); return '1.0.1' }

describe('linkClips', () => {
  it('fills an empty seed slot, records one event, bumps content_version once', async () => {
    const t = world(); const db = fakeDb(t); bumps.length = 0
    const events = []
    const out = await linkClips({ db, courseCode: 'cym_nv2_for_eng', links: [{ seedNumber: 12, role: 'known', audioId: A }], recordEdit: async (e) => { events.push(e); return 'ev1' }, bump })
    expect(out.ok).toBe(true)
    expect(out.linked).toBe(1)
    expect(t.course_seeds[0].known_audio_id).toBe(A)
    expect(t.course_seeds[0].last_edit_event_id).toBe('ev1')
    expect(events).toHaveLength(1)
    expect(bumps).toEqual([['cym_nv2_for_eng', 'patch']])
  })

  it('refuses a clip whose words are not the slot\'s words', async () => {
    const t = world(); const db = fakeDb(t)
    const out = await linkClips({ db, courseCode: 'cym_nv2_for_eng', links: [{ legoId: 'S0012L02', role: 'target1', audioId: C }], bump })
    expect(out.results[0].code).toBe('TEXT_MISMATCH')
    expect(db.writes).toHaveLength(0)
  })

  it('never overwrites a filled slot unless told what it holds now', async () => {
    const t = world(); const db = fakeDb(t)
    const blind = await linkClips({ db, courseCode: 'cym_nv2_for_eng', links: [{ seedNumber: 12, role: 'target1', audioId: C, replace: true }], bump })
    expect(blind.results[0].code).toBe('SLOT_FILLED')
    expect(t.course_seeds[0].target1_audio_id).toBe(B)
    const seen = await linkClips({ db, courseCode: 'cym_nv2_for_eng', links: [{ seedNumber: 12, role: 'target1', audioId: C, replace: true, expectCurrent: B }], bump })
    expect(seen.ok).toBe(true)
    expect(t.course_seeds[0].target1_audio_id).toBe(C)
    expect(t.course_audio.map((r) => r.id)).toContain(B) // the old clip is never deleted
  })

  it('a slot that changed under the write is reported as RACE and not counted', async () => {
    const t = world(); const db = fakeDb(t, { raceOn: 'known_audio_id' })
    const out = await linkClips({ db, courseCode: 'cym_nv2_for_eng', links: [{ seedNumber: 12, role: 'known', audioId: A }], bump })
    expect(out.ok).toBe(false)
    expect(out.results[0].code).toBe('RACE')
    expect(out.linked).toBe(0)
  })

  it('dryRun reports what it would do and writes nothing', async () => {
    const t = world(); const db = fakeDb(t); bumps.length = 0
    const out = await linkClips({ db, courseCode: 'cym_nv2_for_eng', dryRun: true, links: [{ seedNumber: 12, role: 'known', audioId: A }], bump })
    expect(out.results[0]).toMatchObject({ ok: true, changed: true, dryRun: true })
    expect(db.writes).toHaveLength(0)
    expect(bumps).toHaveLength(0)
  })

  it('presentation is exempt from the text check and seeds have no presentation slot', async () => {
    const t = world(); const db = fakeDb(t)
    const lego = await linkClips({ db, courseCode: 'cym_nv2_for_eng', links: [{ legoId: 'S0012L02', role: 'presentation', audioId: C }], bump })
    expect(lego.ok).toBe(true)
    const seed = await linkClips({ db, courseCode: 'cym_nv2_for_eng', links: [{ seedNumber: 12, role: 'presentation', audioId: C }], bump })
    expect(seed.results[0].code).toBe('BAD_ROLE')
  })
})
