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
function fakeDb(tables, { raceOn = null, beforeWrite = null } = {}) {
  const writes = []
  const db = {
    writes,
    from(table) {
      const filters = []
      let patch = null
      const rows = () => (tables[table] || []).filter((r) => filters.every(([k, v]) => (v === null ? r[k] == null : Array.isArray(r[k]) ? `{${r[k].map((x) => (x == null ? 'NULL' : x)).join(',')}}` === v : String(r[k]) === String(v))))
      const b = {
        select() { if (patch) return Promise.resolve(apply()); return b },
        eq(k, v) { filters.push([k, v]); return b },
        is(k, v) { filters.push([k, v]); return b },
        filter(k, op, v) { filters.push([k, v]); return b },
        update(p) { patch = p; return b },
        maybeSingle() { return Promise.resolve({ data: rows()[0] || null, error: null }) },
      }
      function apply() {
        if (beforeWrite) beforeWrite(table, tables)
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
  it('refuses linking after the slot text changes while its audio pointer remains null', async () => {
    const t = world()
    const db = fakeDb(t, { beforeWrite(table, tables) {
      if (table === 'course_seeds') tables.course_seeds[0].known_text = 'I want to learn Welsh'
    } })
    const out = await linkClips({ db, courseCode: 'cym_nv2_for_eng',
      links: [{ seedNumber: 12, role: 'known', audioId: A }], bump })
    expect(out.linked).toBe(0)
    expect(t.course_seeds[0].known_audio_id).toBeNull()
  })
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

// Job #391: a pod sentence is a slot too, and a pod's solo readers can be set through Popty.
describe('pod sentences and solo readers (job #391)', () => {
  const D = '44444444-4444-4444-8444-444444444444'
  const podWorld = () => ({
    listening_pods: [
      { id: 'cym_s_for_eng:guess-i-love-you', course_code: 'cym_s_for_eng', metadata: { job: '867', solo_readers: ['human_dan_cym_s'] }, updated_at: 't0' },
      { id: 'cym_n_for_eng:guess-i-love-you', course_code: 'cym_n_for_eng', metadata: {}, updated_at: 't0' },
    ],
    listening_pod_sentences: [
      { id: 'cym_s_for_eng:guess-i-love-you:1', pod_id: 'cym_s_for_eng:guess-i-love-you', known_text: 'I love you', target_text: "Rwy'n dy garu di", target_text_draft: false, target_audio_id: null, known_audio_id: null },
      { id: 'cym_n_for_eng:guess-i-love-you:1', pod_id: 'cym_n_for_eng:guess-i-love-you', known_text: 'I love you', target_text: "Dw i'n dy garu di", target_text_draft: true, target_audio_id: null, known_audio_id: null },
    ],
    course_audio: [{ id: D, text: "Rwy'n dy garu di", voice_id: 'human_dan_cym_s' }, { id: A, text: "Dw i'n dy garu di", voice_id: 'human_aran_cym_n' }],
  })
  const { setSoloReaders } = require('./pod-solo-readers-edit.cjs')

  it('links a clip to a pod sentence target slot, only within its own course', async () => {
    const t = podWorld(); const db = fakeDb(t)
    const wrong = await linkClips({ db, courseCode: 'cym_n_for_eng', links: [{ podSentenceId: 'cym_s_for_eng:guess-i-love-you:1', role: 'target', audioId: D }], bump })
    expect(wrong.results[0].code).toBe('NO_SLOT')
    const out = await linkClips({ db, courseCode: 'cym_s_for_eng', links: [{ podSentenceId: 'cym_s_for_eng:guess-i-love-you:1', role: 'target', audioId: D }], bump })
    expect(out.ok).toBe(true)
    expect(t.listening_pod_sentences[0].target_audio_id).toBe(D)
    const bad = await linkClips({ db, courseCode: 'cym_s_for_eng', links: [{ podSentenceId: 'cym_s_for_eng:guess-i-love-you:1', role: 'target1', audioId: D }], bump })
    expect(bad.results[0].code).toBe('BAD_ROLE')
  })

  it('refuses a target clip on a draft line unless allowDraft', async () => {
    const t = podWorld(); const db = fakeDb(t)
    const link = { podSentenceId: 'cym_n_for_eng:guess-i-love-you:1', role: 'target', audioId: A }
    expect((await linkClips({ db, courseCode: 'cym_n_for_eng', links: [link], bump })).results[0].code).toBe('DRAFT_TEXT')
    expect((await linkClips({ db, courseCode: 'cym_n_for_eng', links: [{ ...link, allowDraft: true }], bump })).ok).toBe(true)
  })

  it('sets solo_readers to [] keeping every other metadata key, by slug or full id', async () => {
    const t = podWorld(); const db = fakeDb(t)
    const dry = await setSoloReaders({ db, courseCode: 'cym_s_for_eng', podId: 'guess-i-love-you', soloReaders: [], dryRun: true })
    expect(dry).toMatchObject({ ok: true, changed: true, before: ['human_dan_cym_s'], after: [] })
    expect(t.listening_pods[0].metadata.solo_readers).toEqual(['human_dan_cym_s'])
    const out = await setSoloReaders({ db, courseCode: 'cym_s_for_eng', podId: 'cym_s_for_eng:guess-i-love-you', soloReaders: [] })
    expect(out.ok).toBe(true)
    expect(t.listening_pods[0].metadata).toEqual({ job: '867', solo_readers: [] })
    expect((await setSoloReaders({ db, courseCode: 'cym_n_for_eng', podId: 'cym_s_for_eng:guess-i-love-you', soloReaders: [] })).code).toBe('NO_POD')
    expect((await setSoloReaders({ db, courseCode: 'cym_s_for_eng', podId: 'guess-i-love-you', soloReaders: 'x' })).code).toBe('BAD_READERS')
  })
})

// Job #864 (por_for_eng Pod 1 re-voice): a pod line's per-sentence clips (sentence_audio_ids, takeg_audio_ids) are
// arrays the player plays; a re-voice replaces an element, keeps every position, and the new clip says the old clip's words.
describe('pod sentence segment arrays (job #864)', () => {
  const O1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', O2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  const N1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', N2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  const T0 = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', T1 = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
  const podWorld = () => ({
    listening_pods: [{ id: 'por_for_eng:pod-1', course_code: 'por_for_eng' }],
    listening_pod_sentences: [{ id: 'por_for_eng:pod-1:7', pod_id: 'por_for_eng:pod-1', target_text: 'Bom dia, Sarah! Tudo bem?', target_text_draft: false,
      target_audio_id: T0, sentence_audio_ids: [O1, O2], takeg_audio_ids: [O1, null] }],
    course_audio: [
      { id: O1, text: 'Bom dia, Sarah!', voice_id: 'rex' }, { id: O2, text: 'Tudo bem?', voice_id: 'rex' },
      { id: N1, text: 'Bom dia, Sarah!', voice_id: 'cartesia_m' }, { id: N2, text: 'Tudo bem?', voice_id: 'cartesia_m' },
      // the line's own clip is rendered from a paced form of its words
      { id: T0, text: 'Bom dia, Sarah! … Tudo bem?', voice_id: 'rex' }, { id: T1, text: 'Bom dia, Sarah! … Tudo bem?', voice_id: 'cartesia_m' },
    ],
  })
  const id = 'por_for_eng:pod-1:7'
  it('replaces two segments of one line in one request, positions kept, one bump', async () => {
    const t = podWorld(); const db = fakeDb(t); bumps.length = 0
    const out = await linkClips({ db, courseCode: 'por_for_eng', bump, links: [
      { podSentenceId: id, role: 'segment', audioId: N1, replace: true, expectCurrent: O1 },
      { podSentenceId: id, role: 'segment', audioId: N2, replace: true, expectCurrent: O2 },
      { podSentenceId: id, role: 'takeg', audioId: N1, replace: true, expectCurrent: O1 },
      { podSentenceId: id, role: 'target', audioId: T1, replace: true, expectCurrent: T0 },
    ] })
    expect(out.linked).toBe(4)
    expect(t.listening_pod_sentences[0].sentence_audio_ids).toEqual([N1, N2])
    expect(t.listening_pod_sentences[0].takeg_audio_ids).toEqual([N1, null])
    expect(t.listening_pod_sentences[0].target_audio_id).toBe(T1)
    expect(bumps).toEqual([['por_for_eng', 'patch']])
  })
  it('refuses other words, a fill, and an element the line does not hold', async () => {
    const t = podWorld(); const db = fakeDb(t)
    const out = await linkClips({ db, courseCode: 'por_for_eng', bump, links: [
      { podSentenceId: id, role: 'segment', audioId: N2, replace: true, expectCurrent: O1 },
      { podSentenceId: id, role: 'segment', audioId: N1 },
      { podSentenceId: id, role: 'takeg', audioId: N2, replace: true, expectCurrent: O2 },
    ] })
    expect(out.results.map((r) => r.code)).toEqual(['TEXT_MISMATCH', 'REPLACE_ONLY', 'NOT_HELD'])
    expect(t.listening_pod_sentences[0].sentence_audio_ids).toEqual([O1, O2])
  })
})
