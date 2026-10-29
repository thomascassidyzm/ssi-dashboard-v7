// Pod text swaps, make-before-break (Aran, 2026-10-29, job #551): the Siân lines sit in the booth with their NEW words
// while the pod keeps its old words and audio; a take swaps words + audio in one conditional write per row.
// Run: npx vitest run services/voice-engine/pod-text-swaps.test.cjs
import { describe, it, expect } from 'vitest'
const sw = require('./pod-text-swaps.cjs')
const pe = require('./pod-english-lines.cjs')
const boothHome = require('./booth-home.cjs')
const rq = require('./recordist-queue.cjs')

const N1 = 'cym_n_for_eng:pod-1:SC01-S001', S1 = 'cym_s_for_eng:pod-1:SC01-S001'
const N5 = 'cym_n_for_eng:pod-1:SC05-S001', S5 = 'cym_s_for_eng:pod-1:SC05-S001'
const ARAN_CYM = { voiceId: 'human_aran_cym_n', spellings: ['human_aran_cym_n', 'human_aran_cym_s'] }
const ARAN_ENG = { voiceId: 'human_aran_eng', spellings: ['human_aran_eng'] }
const PODS = [
  { id: 'cym_n_for_eng:pod-1', course_code: 'cym_n_for_eng', slug: 'pod-1', title: 'North Pod 1' },
  { id: 'cym_s_for_eng:pod-1', course_code: 'cym_s_for_eng', slug: 'pod-1', title: 'South Pod 1' },
]

// The four rows exactly as live on 29 Oct (read through GET /api/pods/<course>/pod-1).
const liveRows = () => [
  { id: N1, pod_id: 'cym_n_for_eng:pod-1', global_order: 1, speaker: 'Neighbour (8 am)', target_text: 'Bore da, Sarah!', known_text: 'Good morning, Sarah!', target_audio_id: 'e9ec4804', known_audio_id: '2f38d062' },
  { id: N5, pod_id: 'cym_n_for_eng:pod-1', global_order: 23, speaker: 'Neighbour (10:30 pm)', target_text: 'Noswaith dda, Sarah. Gest ti ddiwrnod hir?', known_text: 'Good evening, Sarah. … Did you have a long day?', target_audio_id: '768af995', known_audio_id: 'd86bb20d' },
  { id: S1, pod_id: 'cym_s_for_eng:pod-1', global_order: 1, speaker: 'Neighbour (8 am)', target_text: 'Bore da, Sarah!', known_text: 'Good morning, Siân!', target_audio_id: '45d879be', known_audio_id: null },
  { id: S5, pod_id: 'cym_s_for_eng:pod-1', global_order: 23, speaker: 'Neighbour (10:30 pm)', target_text: 'Noswaith dda, Sarah. Gest ti ddiwrnod hir?', known_text: 'Good evening, Siân. Did you have a long day?', target_audio_id: 'eebfeb53', known_audio_id: null },
]

/** A tiny stand-in for the Supabase client: reads by id, and UPDATE … WHERE every .eq() matches, as Postgres would. */
function fakeDb(rows) {
  const writes = []
  const table = (name) => {
    const q = { filters: [], set: null }
    const run = () => {
      const src = name === 'listening_pods' ? PODS : name === 'listening_pod_sentences' ? rows : []
      const hit = src.filter((r) => q.filters.every(([c, v]) => (Array.isArray(v) ? v.includes(r[c]) : r[c] === v)))
      if (q.set) { writes.push({ table: name, set: q.set, filters: q.filters }); for (const r of hit) Object.assign(r, q.set) }
      return { data: hit.map((r) => ({ ...r })), error: null }
    }
    const chain = {
      select: () => chain, update: (set) => { q.set = set; return chain },
      eq: (c, v) => { q.filters.push([c, v]); return chain }, in: (c, v) => { q.filters.push([c, v]); return chain },
      order: () => chain, limit: () => chain,
      then: (ok, bad) => Promise.resolve(run()).then(ok, bad),
    }
    return chain
  }
  return { from: table, writes }
}
const quiet = { log() {}, warn() {}, error() {} }

describe('pod text swaps — pending', () => {
  it('pending while the row says the old words; the booth shows the new words, the pod keeps its own', () => {
    const rows = liveRows()
    const lines = sw.podSwapLinesFor(ARAN_CYM, { rows, pods: PODS })
    // One Welsh line per spoken words: North keeps its place, South rides along on the same take.
    expect(lines.map((l) => [l.id, l.text, l.role, l.kind])).toEqual([
      [`podswap:${N1}`, 'Bore da, Siân!', 'target1', 'podswap'],
      [`podswap:${N5}`, 'Noswaith dda, Siân. Gest ti ddiwrnod hir?', 'target1', 'podswap'],
    ])
    expect(lines[0].duplicateOf).toEqual([{ sentenceId: S1, courseCode: 'cym_s_for_eng' }])
    expect(lines[0].replacesText).toBe('Bore da, Sarah!')
    expect(lines[0].knownText).toBe('Good morning, Siân!')
    expect(boothHome.trackKeyOf(lines[0])).toBe('podswap.pod-1')
    // The rows themselves are untouched by building the queue.
    expect(rows).toEqual(liveRows())
  })

  it('is offered only to the swap voice: not to Catrin, not in the English booth', () => {
    expect(sw.podSwapLinesFor({ voiceId: 'human_catrinlliar_cym_n', spellings: ['human_catrinlliar_cym_n'] }, { rows: liveRows(), pods: PODS })).toEqual([])
    expect(sw.podSwapLinesFor(ARAN_ENG, { rows: liveRows(), pods: PODS })).toEqual([])
  })

  it('the Pod 1 English card reads North\'s pending English as Siân, so it collapses with South\'s line', () => {
    const lines = pe.podEnglishLinesFor(ARAN_ENG, { podIds: ['cym_n_for_eng:pod-1', 'cym_s_for_eng:pod-1'], pods: PODS, sentences: liveRows() })
    expect(lines.map((l) => l.text)).toEqual(['Good morning, Siân!', 'Good evening, Siân. … Did you have a long day?'])
    expect(lines.every((l) => l.duplicateOf.length === 1)).toBe(true)
    expect(lines.some((l) => /Sarah/.test(l.text))).toBe(false)
  })
})

describe('pod text swaps — applied by a take', () => {
  it('one Welsh take swaps North AND South: words and audio in ONE conditional write per row', async () => {
    const rows = liveRows()
    const db = fakeDb(rows)
    const r = await rq.applyPodTextSwaps({ db, recordist: ARAN_CYM, role: 'target1', text: 'Bore da, Siân!', audioId: 'NEW-CY', logger: quiet })
    expect(r.linked.map((l) => l.sentenceId).sort()).toEqual([N1, S1].sort())
    const upd = db.writes.filter((w) => w.table === 'listening_pod_sentences')
    expect(upd).toHaveLength(2)
    for (const w of upd) {
      // Never a text write without its audio, never a write that is not conditional on the old words.
      expect(w.set).toEqual({ target_text: 'Bore da, Siân!', target_audio_id: 'NEW-CY' })
      expect(w.filters).toContainEqual(['target_text', 'Bore da, Sarah!'])
    }
    const n1 = rows.find((x) => x.id === N1)
    expect([n1.target_text, n1.target_audio_id, n1.known_text, n1.known_audio_id]).toEqual(['Bore da, Siân!', 'NEW-CY', 'Good morning, Sarah!', '2f38d062'])
    // The other line is untouched until its own take lands.
    expect(rows.find((x) => x.id === N5).target_audio_id).toBe('768af995')
  })

  it('an English take swaps only North\'s English (South already says Siân and is filled by the card)', async () => {
    const rows = liveRows()
    const db = fakeDb(rows)
    const r = await rq.applyPodTextSwaps({ db, recordist: ARAN_ENG, role: 'known', text: 'Good evening, Siân. … Did you have a long day?', audioId: 'NEW-EN', logger: quiet })
    expect(r.linked.map((l) => [l.sentenceId, l.replacedAudioId])).toEqual([[N5, 'd86bb20d']])
    expect(rows.find((x) => x.id === N5)).toMatchObject({ known_text: 'Good evening, Siân. … Did you have a long day?', known_audio_id: 'NEW-EN' })
    expect(rows.find((x) => x.id === S5).known_audio_id).toBe(null)
  })

  it('nothing moves without a filed take, for another voice, or for other words', async () => {
    for (const args of [
      { recordist: ARAN_CYM, role: 'target1', text: 'Bore da, Siân!', audioId: null },
      { recordist: { voiceId: 'human_catrinlliar_cym_n', spellings: ['human_catrinlliar_cym_n'] }, role: 'target1', text: 'Bore da, Siân!', audioId: 'X' },
      { recordist: ARAN_CYM, role: 'target1', text: 'Bore da, Sarah!', audioId: 'X' },
      { recordist: ARAN_CYM, role: 'known', text: 'Bore da, Siân!', audioId: 'X' },
    ]) {
      const rows = liveRows()
      const db = fakeDb(rows)
      const r = await rq.applyPodTextSwaps({ db, ...args, logger: quiet })
      expect(r.linked).toEqual([])
      expect(db.writes).toEqual([])
      expect(rows).toEqual(liveRows())
    }
  })

  it('a row that already moved on is left alone (applied or drifted), never forced', async () => {
    const rows = liveRows()
    rows.find((x) => x.id === N1).target_text = 'Bore da, Siân!'
    rows.find((x) => x.id === S1).target_text = 'Bore da, Sian!' // someone else's spelling: drifted
    expect(sw.swapState(sw.POD_TEXT_SWAPS[0], rows.find((x) => x.id === N1))).toBe('applied')
    expect(sw.swapState(sw.POD_TEXT_SWAPS[1], rows.find((x) => x.id === S1))).toBe('drifted')
    const db = fakeDb(rows)
    const r = await rq.applyPodTextSwaps({ db, recordist: ARAN_CYM, role: 'target1', text: 'Bore da, Siân!', audioId: 'NEW', logger: quiet })
    expect(r.linked).toEqual([])
    expect(db.writes).toEqual([])
    expect(sw.podSwapLinesFor(ARAN_CYM, { rows, pods: PODS }).map((l) => l.id)).toEqual([`podswap:${N5}`])
  })
})
