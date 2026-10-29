// North Pod 1's sentence-by-sentence English is cut from Aran's own whole-line take (Aran, 2026-10-29 14:59Z, job #570),
// make-before-break through link-clip; a cut the pauses do not answer plainly is left synthetic and named for him.
// SC01-S004's wrong "Goodbye." sentence clip is re-cut from the line's own whole clip.
//   npx vitest run services/voice-engine/pod-english-split-cuts.test.cjs
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const cuts = require('./pod-english-split-cuts.cjs')
const { cutPodEnglishSplitsNow } = require('./recordist-queue.cjs')

const ARAN = 'human_aran_eng'
const N = 'cym_n_for_eng:pod-1'
const QUIET = { log() {}, info() {}, warn() {}, error() {} }
const U = Object.fromEntries(['take-james', 'take-narr', 'take-sarah', 'tts-whole-s004', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 'human-old', 'take-551', 'w1', 'w2']
  .map((n, i) => [n, `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`]))
const clip = (id, voice_id, text, origin) => ({ id, voice_id, origin, text, s3_key: `mastered/${id}.mp3` })
const piece = (dur) => ({ dur })
const CAST = { cym_n_for_eng: { James: { gender: 'm' }, Narrator: { gender: 'm' }, Sarah: { gender: 'f' }, Neighbour: { gender: 'm' } } }
const castEntryFor = (podCast, speaker) => (podCast && podCast[String(speaker).replace(/\s*\(.*\)$/, '')]) || null

describe('judgeCut — refuse rather than guess', () => {
  const two = ["I'm James.", 'Pleased to meet you.']
  it('takes a cut whose one pause answers two sentences, pieces in proportion', () => {
    expect(cuts.judgeCut(two, { interior_gaps_ms: [420], cut_at_gaps_ms: [420], rejected_gaps_ms: [], margin: null, pieces: [piece(0.9), piece(1.3)] })).toEqual({ ok: true })
  })
  it('refuses fewer pauses than sentence breaks', () => {
    expect(cuts.judgeCut(two, { interior_gaps_ms: [], cut_at_gaps_ms: [], rejected_gaps_ms: [], margin: null, pieces: [piece(2.2)] }).why).toMatch(/0 pause\(s\) for 2 sentences/)
  })
  it('refuses when a pause inside a sentence is nearly as long as the one cut at', () => {
    expect(cuts.judgeCut(two, { interior_gaps_ms: [420, 380], cut_at_gaps_ms: [420], rejected_gaps_ms: [380], margin: 1.11, pieces: [piece(0.9), piece(1.3)] }).ok).toBe(false)
  })
  it('refuses a piece out of proportion to its words (the cut fell in the wrong pause)', () => {
    const v = cuts.judgeCut(['Hello.', 'Can you take me to the train station, please?'], { interior_gaps_ms: [300], cut_at_gaps_ms: [300], rejected_gaps_ms: [], margin: null, pieces: [piece(2.6), piece(0.9)] })
    expect(v.ok).toBe(false)
    expect(v.why).toMatch(/out of proportion/)
  })
  it('counts digits as the words they are read as', () => {
    expect(cuts.spokenSyllables('100,000.')).toBe(5)
    expect(cuts.spokenSyllables("12 o'clock.")).toBe(3)
  })
})

const row = (sc, speaker, known, whole, knownSplits, targetSplits = knownSplits.length) => ({
  id: `${N}:${sc}`, pod_id: N, speaker, known_text: known, known_audio_id: whole,
  sentence_known_audio_ids: knownSplits, sentence_audio_ids: Array.from({ length: targetSplits }, (_, i) => `t-${sc}-${i}`),
})

function fixture() {
  return {
    language_recording_policy: [{ language: 'eng', human_only: false, voices: {
      m: { name: 'Aran', gender: 'm', voiceId: ARAN, onlyCastOn: true, castOn: [{ courseCode: 'cym_n_for_eng', role: 'known', synthetic: 'queue' }] },
    } }],
    dashboard_users: [],
    courses: [{ course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: { podCast: CAST.cym_n_for_eng }, content_version: '1.0.0' }],
    listening_pods: [{ id: N, course_code: 'cym_n_for_eng', slug: 'pod-1' }],
    listening_pod_sentences: [
      // a man's line: his take holds the whole line, one sentence clip synthetic, one already human
      row('SC06-S003', 'James', "I'm James. Pleased to meet you.", U['take-james'], [U.s1, U['human-old']]),
      // a man's line whose take's pauses do not answer its five sentences: left synthetic
      row('SC06-S013', 'Narrator', '1. 2. 3. White. Black.', U['take-narr'], [U.s2, U.s3, U.s4, U.s5, U.s6]),
      // a woman's line carrying a take of his: never cut (job #562 moves it to Catrin)
      row('SC01-S002', 'Sarah', 'Good morning. How are you?', U['take-sarah'], [U.s7, U.s8]),
      // the wrong-words line: synthetic whole, synthetic splits, the third saying "Goodbye."
      row('SC01-S004', 'Sarah', "Yes, I've got a busy day today. I hope you have a good day. See you later.", U['tts-whole-s004'], [U.s9, U.s10, U.s11], 0),
      // job #551's line
      row('SC05-S001', 'Neighbour (6 pm)', 'Good evening, Sarah. … Did you have a long day?', U['take-551'], [U.w1, U.w2]),
    ],
    course_audio: [
      clip(U['take-james'], ARAN, "I'm James. Pleased to meet you.", 'human'),
      clip(U['take-narr'], ARAN, '1. 2. 3. White. Black.', 'human'),
      clip(U['take-sarah'], ARAN, 'Good morning. How are you?', 'human'),
      clip(U['take-551'], ARAN, 'Good evening, Sarah. … Did you have a long day?', 'human'),
      clip(U['tts-whole-s004'], 'xai_bedd6226', "Yes, I've got a busy day today. … I hope you have a good day. … See you later.", 'tts'),
      clip(U.s1, 'xai_bedd6226', "I'm James.", 'tts'), clip(U['human-old'], 'human_aran_cym_n', 'Pleased to meet you.', 'human'),
      ...['1.', '2.', '3.', 'White.', 'Black.'].map((t, i) => clip(U[`s${i + 2}`], 'xai_bedd6226', t, 'tts')),
      clip(U.s7, 'gfzdpspr5fdp', 'Good morning.', 'tts'), clip(U.s8, 'gfzdpspr5fdp', 'How are you?', 'tts'),
      clip(U.s9, 'xai_bedd6226', "Yes, I've got a busy day today.", 'tts'), clip(U.s10, 'bedd6226', 'I hope you have a good day.', 'tts'),
      clip(U.s11, 'bedd6226', 'Goodbye.', 'tts'),
      clip(U.w1, 'gfzdpspr5fdp', 'Good evening, Sarah.', 'tts'), clip(U.w2, 'xai_gfzdpspr5fdp', 'Did you have a long day?', 'tts'),
    ],
    content_edit_events: [],
  }
}

describe('planSplitCuts — which lines are cut from his take', () => {
  it('his man\'s line, synthetic clips only; never a woman\'s line, never #551\'s, never a line not heard in sentences', () => {
    const t = fixture()
    const clipById = new Map(t.course_audio.map((c) => [c.id, c]))
    const { cuts: planned, skipped } = cuts.planSplitCuts({ podIds: [N], sentences: t.listening_pod_sentences, clipById,
      podCastByCourse: CAST, castEntryFor, recordist: { voiceId: ARAN, spellings: [ARAN], gender: 'm' } })
    expect(planned.map((c) => [c.sentenceId.slice(-9), c.replace.map((r) => r.index)])).toEqual([['SC06-S003', [0]], ['SC06-S013', [0, 1, 2, 3, 4]]])
    expect(skipped).toMatchObject({ otherGender: 1, leftToOtherJob: 1, notSplit: 1 })
  })
  it('a speaker the cast does not name is nobody\'s', () => {
    const t = fixture()
    const s = { ...t.listening_pod_sentences[0], speaker: 'Stranger' }
    const { cuts: planned, skipped } = cuts.planSplitCuts({ podIds: [N], sentences: [s], clipById: new Map(t.course_audio.map((c) => [c.id, c])),
      podCastByCourse: CAST, castEntryFor, recordist: { voiceId: ARAN, spellings: [ARAN], gender: 'm' } })
    expect(planned).toEqual([])
    expect(skipped.uncast).toBe(1)
  })
})

/** pod-english-replace.test.cjs's stub, plus filter() for link-clip's conditional array write. */
function stubDb(tables) {
  return {
    tables,
    from(table) {
      const all = tables[table] || (tables[table] = [])
      const filters = []
      let patch = null, inserted = null
      const run = () => {
        if (inserted) { all.push(inserted); return { data: [{ ...inserted }], error: null } }
        const rows = all.filter((r) => filters.every((f) => f(r)))
        if (patch) for (const r of rows) Object.assign(r, patch)
        return { data: rows.map((r) => ({ ...r })), error: null }
      }
      const arr = (v) => `{${(v || []).map((x) => (x == null ? 'NULL' : x)).join(',')}}`
      const q = {
        select() { return q },
        insert(row) { inserted = { id: `ev${all.length + 1}`, ...row }; return q },
        update(p) { patch = p; return q },
        eq(col, val) { filters.push((r) => r[col] === val); return q },
        in(col, vals) { filters.push((r) => vals.includes(r[col])); return q },
        is(col, val) { filters.push((r) => (val === null ? r[col] == null : r[col] === val)); return q },
        filter(col, op, val) { filters.push((r) => arr(r[col]) === val); return q },
        order() { return q },
        range(from, to) { const out = run(); return Promise.resolve({ data: out.data.slice(from, to + 1), error: null }) },
        maybeSingle() { const out = run(); return Promise.resolve({ data: out.data[0] || null, error: null }) },
        single() { const out = run(); return Promise.resolve({ data: out.data[0] || null, error: out.data[0] ? null : { message: 'no row' } }) },
        then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject) },
      }
      return q
    },
  }
}

/** ffmpeg and S3 stand-ins: each source clip's measured cut, and a store that files the piece as a new clip. */
function fakeAudio(tables) {
  const SPLICE = {
    [U['take-james']]: { interior_gaps_ms: [450], cut_at_gaps_ms: [450], rejected_gaps_ms: [], margin: null, pieces: [piece(0.95), piece(1.25)] },
    // five sentences, and a comma-length pause the judge cannot tell from a sentence end
    [U['take-narr']]: { interior_gaps_ms: [390, 300, 280, 370, 262], cut_at_gaps_ms: [390, 300, 280, 370], rejected_gaps_ms: [262], margin: 1.07, pieces: [1, 1, 1, 1, 1].map(piece) },
    [U['tts-whole-s004']]: { interior_gaps_ms: [600, 610], cut_at_gaps_ms: [600, 610], rejected_gaps_ms: [], margin: null, pieces: [piece(2.1), piece(1.7), piece(1.17)] },
  }
  let n = 0
  const stored = []
  return {
    stored,
    fetch: async (c) => Buffer.from(c.id),
    cut: async (buf, count) => { const s = SPLICE[buf.toString()]; return { splice: s, buffers: s.pieces.map((_, i) => Buffer.from(`${buf}-${i}`)) } },
    store: async (p) => {
      const id = `cccccccc-cccc-4ccc-8ccc-${String(++n).padStart(12, '0')}`
      tables.course_audio.push({ id, voice_id: p.voiceId, origin: p.origin, text: p.text, role: 'pod_fine_known', s3_key: `mastered/${id}.mp3` })
      stored.push({ id, ...p })
      return { audioId: id, reused: false }
    },
  }
}

describe('cutPodEnglishSplitsNow — the sweep', () => {
  it('cuts his take into its sentences, repairs "Goodbye.", leaves the ambiguous line for him, deletes nothing', async () => {
    const tables = fixture()
    const db = stubDb(tables)
    const audio = fakeAudio(tables)
    const before = tables.course_audio.map((c) => c.id)
    const out = await cutPodEnglishSplitsNow({ db, recordist: { voiceId: ARAN, spellings: [ARAN], language: 'eng', gender: 'm' }, logger: QUIET, audio })
    const arr = (sc) => tables.listening_pod_sentences.find((s) => s.id === `${N}:${sc}`).sentence_known_audio_ids
    const said = (id) => tables.course_audio.find((c) => c.id === id)

    // James: the synthetic first sentence is now a piece of his take; the human second clip is untouched
    expect(said(arr('SC06-S003')[0])).toMatchObject({ voice_id: ARAN, origin: 'human', text: "I'm James.", role: 'pod_fine_known' })
    expect(arr('SC06-S003')[1]).toBe(U['human-old'])
    // the Narrator's numbers: the pauses do not answer plainly, so the line stays synthetic and is named
    expect(arr('SC06-S013')).toEqual([U.s2, U.s3, U.s4, U.s5, U.s6])
    expect(out.leftSynthetic.map((x) => x.sentenceId)).toEqual([`${N}:SC06-S013`])
    // SC01-S004: only the wrong clip moves, to a cut of the line's own whole clip in its own voice
    expect(arr('SC01-S004').slice(0, 2)).toEqual([U.s9, U.s10])
    expect(said(arr('SC01-S004')[2])).toMatchObject({ text: 'See you later.', voice_id: 'xai_bedd6226', origin: 'tts' })
    // never a woman's line, never #551's
    expect(arr('SC01-S002')).toEqual([U.s7, U.s8])
    expect(arr('SC05-S001')).toEqual([U.w1, U.w2])
    // make-before-break: every old clip is still in course_audio
    expect(tables.course_audio.map((c) => c.id)).toEqual(expect.arrayContaining(before))
    // one content-edit event and one version bump
    expect(tables.content_edit_events).toHaveLength(1)
    expect(tables.courses[0].content_version).toBe('1.0.1')

    // a second sweep re-cuts nothing: the done lines are human now, the refused cut is remembered
    const again = await cutPodEnglishSplitsNow({ db, recordist: { voiceId: ARAN, spellings: [ARAN], language: 'eng', gender: 'm' }, logger: QUIET, audio })
    expect(again.linked).toEqual([])
    expect(audio.stored).toHaveLength(2)
  })
})
