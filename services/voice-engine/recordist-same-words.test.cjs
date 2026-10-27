// ONE TAKE, EVERY SLOT OF THE SAME WORDS (Aran's standing rule; job #198).
//   npx vitest run services/voice-engine/recordist-same-words.test.cjs
//
// 27 Oct 2026, staging booth: Aran read the same words a second time 14 times in one session —
// seed sentence then the LEGO of exactly its words (10x), a practice phrase then the seed and LEGO,
// a seed then a phrase, and the North English seed then the South one. His rule: once said, a
// take serves every slot that needs those words (case and punctuation aside) and is never asked
// for again. These pin the server half; RecordistRoom.sameWords.test.js pins the booth's flow.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
import fs from 'fs'
import os from 'os'
import path from 'path'

const require = createRequire(import.meta.url)
process.env.CASTING_ACCESS_LEDGER = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'same-words-')), 'casting-access.jsonl')
const createRecordistRouter = require('./recordist-router.cjs')
const { buildQueue, resolveRecordist, legoClipSaysText, sameWordsGaps } = require('./recordist-queue.cjs')
const { isLineRecorded } = require('./take-selection.cjs')
const { spokenWordsKey } = require('../shared/spoken-words.cjs')
const phraseQueue = require('./phrase-queue.cjs')

const ARAN = 'human_aran_cym_n'
const NV2 = 'cym_nv2_for_eng'
const QUIET = { log() {}, info() {}, warn() {}, error() {} }

function lego(id, seed, idx, target, extra = {}) {
  return {
    id, course_code: NV2, seed_number: seed, lego_index: idx,
    lego_id: `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}`,
    is_new: true, target_text: target, known_text: `en ${target}`,
    target1_audio_id: null, target2_audio_id: null, presentation_audio_id: null, ...extra,
  }
}
function seed(id, n, target, extra = {}) {
  return { id, course_code: NV2, seed_number: n, status: 'draft', target_text: target, known_text: `en ${target}`, target1_audio_id: 'cat1', target2_audio_id: null, known_audio_id: null, ...extra }
}
function fixture() {
  return {
    language_recording_policy: [{ language: 'cym', human_only: true, voices: {
      'm:north': { name: 'Aran', gender: 'm', dialect: 'north', voiceId: ARAN },
      'f:north': { name: 'Catrin', gender: 'f', dialect: 'north', voiceId: 'human_catrin_cym_n' },
    } }],
    dashboard_users: [],
    courses: [{ course_code: NV2, target_lang: 'cym', known_lang: 'eng', dialect: 'north',
      voice_config: { voices: { target1: { provider: 'human', voiceId: 'human_catrin_cym_n' }, target2: { provider: 'human', voiceId: ARAN } } } }],
    listening_pods: [], listening_pod_sentences: [],
    course_running_order: [{ course_code: NV2, seed_number: 1639, position: 1 }, { course_code: NV2, seed_number: 1649, position: 2 }],
    course_seeds: [
      seed('s1639', 1639, 'esgusodwch fi, be’ ddudoch chi?'),
      seed('s1649', 1649, 'esgusodwch fi, dach chi’n barod?'),
    ],
    course_legos: [
      // The whole-seed LEGO — the 27 Oct case: exactly the seed's words.
      lego('l1649', 1649, 1, "esgusodwch fi, dach chi'n barod?"),
      // The same words, no '?': still the same recording (Aran: punctuation keeps the take).
      lego('l1639', 1639, 1, 'Esgusodwch fi, be’ ddudoch chi'),
      // A LEGO that is only PART of the sentence: a different recording (#818).
      lego('l1649b', 1649, 2, 'dach chi’n barod'),
    ],
    course_audio: [],
    course_practice_phrases: [],
    phrase_proof_flags: [],
  }
}

/** A stub supabase whose updates honour every filter (including `.is(col, null)`). */
function stubDb(tables) {
  return {
    tables,
    from(table) {
      const all = tables[table] || (tables[table] = [])
      const filters = []
      let patch = null
      const run = () => {
        const rows = all.filter((r) => filters.every((f) => f(r)))
        if (patch) for (const r of rows) Object.assign(r, patch)
        return { data: rows.map((r) => ({ ...r })), error: null }
      }
      const q = {
        select() { return q },
        update(p) { patch = p; return q },
        eq(col, val) { filters.push((r) => r[col] === val); return q },
        in(col, vals) { filters.push((r) => vals.includes(r[col])); return q },
        is(col, val) { filters.push((r) => (val === null ? r[col] == null : r[col] === val)); return q },
        not(col, op, val) { if (op === 'is' && val === null) filters.push((r) => r[col] != null); return q },
        gte() { return q }, lt() { return q }, ilike() { return q }, order() { return q },
        limit(n) { const out = run(); return Promise.resolve({ data: out.data.slice(0, n), error: null }) },
        range(from, to) { const out = run(); return Promise.resolve({ data: out.data.slice(from, to + 1), error: null }) },
        maybeSingle() { const out = run(); return Promise.resolve({ data: out.data[0] || null, error: null }) },
        then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject) },
      }
      return q
    },
  }
}
const take = (id, text, extra = {}) => ({ id, voice_id: ARAN, language: 'cym', course_code: NV2, role: 'target2', text, text_normalized: text.toLowerCase().replace(/[.!]+$/, ''), created_at: '2026-10-27T11:00:00Z', ...extra })

async function postTake(tables, lineId, text) {
  const router = createRecordistRouter({
    getDb: () => stubDb(tables), logger: QUIET, s3: {},
    handleRecordingUpload: async (innerReq, innerRes) => {
      tables.course_audio.push(take('filed1', innerReq.body.metadata.text))
      innerRes.json({ success: true, s3Key: 'mastered/x.mp3', rawKey: 'raw/x', filing: { courseAudioId: 'filed1' } })
    },
  })
  const layer = router.stack.find((l) => l.route && l.route.path === '/voice/:voiceId/take' && l.route.methods.post)
  const out = {}
  const settled = new Promise((resolve) => { out.res = { status(c) { out.status = c; return out.res }, json(b) { out.body = b; resolve(); return out.res } } })
  await layer.route.stack[0].handle({
    params: { voiceId: ARAN }, query: {}, headers: { 'content-type': 'application/json' }, socket: {},
    method: 'POST', originalUrl: `/voice/${ARAN}/take`, body: { lineId, audioData: 'AAAA', mimeType: 'audio/webm', text },
  }, out.res)
  await settled
  return out
}

describe('the spoken-words key (Aran: case and punctuation never re-ask; different words always do)', () => {
  it('folds case, ? ! . , — …, curly and straight apostrophes, and elision marks at a word edge', () => {
    expect(spokenWordsKey('Esgusodwch fi, dach chi’n barod?')).toBe(spokenWordsKey("esgusodwch fi dach chi'n barod"))
    expect(spokenWordsKey('be’ ddudoch chi?')).toBe(spokenWordsKey('be ddudoch chi'))
    expect(spokenWordsKey('os dw i’n deud … rhywbeth')).toBe('os dw i\'n deud rhywbeth')
    expect(spokenWordsKey('<tgt>Iawn.</tgt>')).toBe('iawn')
  })
  it('keeps different words different: mutation, contraction, an apostrophe inside a word', () => {
    expect(spokenWordsKey('blasus')).not.toBe(spokenWordsKey('flasus'))
    expect(spokenWordsKey("'n barod")).not.toBe(spokenWordsKey('yn barod'))
    expect(spokenWordsKey("a'i frawd")).not.toBe(spokenWordsKey('ai frawd'))
  })
})

describe('recorded means "these words have a take", whichever line asked for them', () => {
  it('a LEGO of exactly a seed\'s words is RECORDED once the seed is read (it was asked for again, 10 times on 27 Oct)', async () => {
    const tables = fixture()
    tables.course_audio.push(take('seedtake', 'esgusodwch fi, dach chi’n barod?'))
    const q = await buildQueue(stubDb(tables), await resolveRecordist(stubDb(tables), ARAN), { includeRecorded: true })
    const byId = Object.fromEntries(q.lines.map((l) => [l.id, l]))
    expect(byId['lego:l1649:target2'].recorded).toBe(true)
    // ...and a LEGO that is only part of that sentence is still owed (#818's line, unmoved).
    expect(byId['lego:l1649b:target2'].recorded).toBe(false)
  })

  it('a take without the "?" records a line with it, and the other way round', () => {
    const keys = new Set(['esgusodwch fi, be’ ddudoch chi'])
    for (const k of [...keys]) keys.add(spokenWordsKey(k))
    const line = { role: 'target2', text: 'Esgusodwch fi, be’ ddudoch chi?', filledBy: [] }
    expect(isLineRecorded(line, { recordedKeys: keys, spellings: [ARAN] })).toBe(true)
  })

  it('a LEGO slot holding his take of the same words with different punctuation is green', () => {
    expect(legoClipSaysText('esgusodwch fi, dach chi’n barod?', "Esgusodwch fi dach chi'n barod")).toBe(true)
    expect(legoClipSaysText('esgusodwch fi, dach chi’n barod?', 'dach chi’n barod')).toBe(false)
  })

  it('phrases that differ only by punctuation are ONE line, and one take fills both copies', () => {
    const units = [
      { phrase: { id: `${NV2}:p1`, target_text: 'Dach chi’n barod rŵan?', known_text: 'a', phrase_role: 'build', seed_number: 1 }, pass: 1, position: 1, legoIndex: 1 },
      { phrase: { id: `${NV2}:p2`, target_text: "dach chi'n barod rŵan", known_text: 'b', phrase_role: 'use', seed_number: 2 }, pass: 1, position: 2, legoIndex: 1 },
    ]
    const lines = phraseQueue.courseRoleLines(NV2, units, 'target2', { holderOf: () => '', isMine: () => true })
    expect(lines.length).toBe(1)
    expect(lines[0].copies.map((c) => c.phraseId)).toEqual([`${NV2}:p1`, `${NV2}:p2`])
  })
})

describe('English known side across North and South (job #218)', () => {
  const line = (course, text, phraseId) => ({
    role: 'known', pass: 1, batch: 1, courseCode: course, text, readingOrder: 1,
    copies: [{ phraseId, courseCode: course, holder: null, flagged: false }],
  })
  it('a curly-vs-straight apostrophe or a comma is ONE English line asked once, crediting both courses', () => {
    const merged = phraseQueue.mergeAcrossCourses([
      [line('cym_nv2_for_eng', 'I don’t know, really', 'n1'), line('cym_nv2_for_eng', 'Where’s he gone?', 'n2')],
      [line('cym_sv2_for_eng', "I don't know really", 's1'), line('cym_sv2_for_eng', "Where's he gone?", 's2')],
    ])
    expect(merged.length).toBe(2)
    expect(merged.map((l) => l.copies.map((c) => c.phraseId).sort())).toEqual([['n1', 's1'], ['n2', 's2']])
  })
})

describe('the take route fills every empty slot of the same words', () => {
  it('a seed take fills the empty LEGO slot of exactly its words, and only that one', async () => {
    const tables = fixture()
    const out = await postTake(tables, 'seed:s1649:target2', 'esgusodwch fi, dach chi’n barod?')
    expect(out.status).toBeUndefined()
    const byId = Object.fromEntries(tables.course_legos.map((l) => [l.id, l]))
    expect(tables.course_seeds.find((s) => s.id === 's1649').target2_audio_id).toBe('filed1')
    expect(byId.l1649.target2_audio_id).toBe('filed1')
    expect(byId.l1649b.target2_audio_id).toBeNull()
    expect(byId.l1649.target1_audio_id).toBeNull() // Catrin's slot is hers
  })

  it('a LEGO take fills the empty seed slot of the same words; a slot that holds a clip is never moved', async () => {
    const tables = fixture()
    tables.course_seeds.push(seed('s1700', 1700, 'esgusodwch fi be ddudoch chi', { target2_audio_id: 'already' }))
    const out = await postTake(tables, 'lego:l1639:target2', 'Esgusodwch fi, be’ ddudoch chi')
    expect(out.status).toBeUndefined()
    expect(tables.course_seeds.find((s) => s.id === 's1639').target2_audio_id).toBe('filed1')
    expect(tables.course_seeds.find((s) => s.id === 's1700').target2_audio_id).toBe('already')
  })
})

describe('the back-fill plan (tools/recording/fill-same-words-gaps.cjs)', () => {
  it('lists each empty slot whose words he has recorded, fill-only, flagging punctuation-only differences', async () => {
    const tables = fixture()
    tables.course_audio.push(take('t1649', 'esgusodwch fi, dach chi’n barod?'))
    const plan = await sameWordsGaps({ db: stubDb(tables), recordist: await resolveRecordist(stubDb(tables), ARAN) })
    const ops = (plan.byCourse[NV2] || []).map((o) => o.op)
    expect(ops).toEqual([
      { op: 'audio.link', target: 'seed', seed_number: 1649, slot: 'target2', audio_id: 't1649', expect: { target2_audio_id: null } },
      { op: 'audio.link', target: 'lego', lego_id: 'S1649L01', slot: 'target2', audio_id: 't1649', expect: { target2_audio_id: null }, allow_text_mismatch: true },
    ])
  })
})

describe('the English known side, read once for North and South', () => {
  const ARAN_ENG = 'human_aran_eng'
  const SV2 = 'cym_sv2_for_eng'
  function engFixture() {
    const t = fixture()
    t.language_recording_policy.push({ language: 'eng', human_only: false, voices: {
      'm:known': { name: 'Aran', gender: 'm', voiceId: ARAN_ENG, onlyCastOn: true, castOn: [
        { courseCode: NV2, role: 'known' }, { courseCode: SV2, role: 'known' }] },
    } })
    t.courses.push({ course_code: SV2, target_lang: 'cym', known_lang: 'eng', dialect: 'south', voice_config: null })
    t.course_running_order.push({ course_code: SV2, seed_number: 5, position: 1 })
    t.course_seeds = [
      seed('n1', 1639, 'x', { known_text: 'she’s gone to look for work', known_audio_id: 'north_take' }),
      { ...seed('s5', 5, 'y', { known_text: "she's gone to look for work" }), course_code: SV2 },
    ]
    t.course_audio.push({ id: 'north_take', voice_id: ARAN_ENG, language: 'eng', course_code: NV2, role: 'known', origin: 'human', text: 'she’s gone to look for work', text_normalized: 'she’s gone to look for work', created_at: '2026-10-27T11:00:00Z' })
    return t
  }
  it('a South line whose English he has already read for North is recorded, not asked for again', async () => {
    const t = engFixture()
    const q = await buildQueue(stubDb(t), await resolveRecordist(stubDb(t), ARAN_ENG), { includeRecorded: true })
    const known = q.lines.filter((l) => l.kind === 'seed' && l.role === 'known')
    expect(known.map((l) => [l.courseCode, l.recorded])).toEqual([[SV2, true]])
  })
})
