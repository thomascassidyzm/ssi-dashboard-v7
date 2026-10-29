// Pod 1 English is read by the SPEAKER's gender (Aran, 2026-10-29 14:46Z, job #562: "I can't do the female voices for the
// Pod1 English, those will need to be Catrin. Can you separate them out"). The course's own cast (voice_config.podCast
// [speaker].gender) decides; Aran reads the men's lines, Catrin's English voice (podEnglishOn) the women's. His takes never
// fill or replace a woman's line, and her take replaces a take of his that already sits on one (make-before-break).
//   npx vitest run services/voice-engine/pod-english-gender.test.cjs
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
import fs from 'fs'
import os from 'os'
import path from 'path'

const require = createRequire(import.meta.url)
process.env.CASTING_ACCESS_LEDGER = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pod-english-gender-')), 'casting-access.jsonl')
const createRecordistRouter = require('./recordist-router.cjs')
const pe = require('./pod-english-lines.cjs')
const boothHome = require('./booth-home.cjs')
const { normalizeForAudio } = require('../shared/text-normalize.cjs')

const ARAN = 'human_aran_eng', CATRIN = 'human_catrinlliar_eng'
const N = 'cym_n_for_eng:pod-1', S = 'cym_s_for_eng:pod-1'
const QUIET = { log() {}, info() {}, warn() {}, error() {} }
const U = Object.fromEntries(['tts-sarah', 'tts-neighbour', 'tts-learner', 'aran-sarah', 'aran-neighbour', 'aran-learner', 'filed1']
  .map((n, i) => [n, `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`]))
const clip = (id, voice_id, text, origin, created_at = '2026-10-29T14:45:00Z') => ({ id, voice_id, language: 'eng', origin, text, text_normalized: normalizeForAudio(text), created_at })

// The live casts' shape: Sarah a woman in both; the Neighbour a man in both; the Learner a man in North, a woman in South.
const NORTH_CAST = { Sarah: { gender: 'f' }, Neighbour: { gender: 'm' }, Learner: { gender: 'm' } }
const SOUTH_CAST = { Sarah: { gender: 'f' }, Neighbour: { gender: 'm' }, Learner: { gender: 'f' } }
const CAST = { cym_n_for_eng: NORTH_CAST, cym_s_for_eng: SOUTH_CAST }
const POLICY = [
  { voiceId: ARAN, gender: 'm', aliases: [], castOn: [{ courseCode: 'cym_n_for_eng', role: 'known' }, { courseCode: 'cym_s_for_eng', role: 'known' }] },
  { voiceId: CATRIN, gender: 'f', aliases: [], castOn: [], podEnglishOn: ['cym_n_for_eng', 'cym_s_for_eng'] },
]
const PODS = [
  { id: N, course_code: 'cym_n_for_eng', slug: 'pod-1', title: 'North Pod 1' },
  { id: S, course_code: 'cym_s_for_eng', slug: 'pod-1', title: 'South Pod 1' },
]
const sent = (pod, n, speaker, known, audio = null) => ({ id: `${pod}:SC09-S00${n}`, pod_id: pod, global_order: n, speaker, target_text: 'Bore da!', known_text: known, known_audio_id: audio })

describe('Pod 1 English by speaker gender — the card', () => {
  const sentences = [
    sent(N, 1, 'Neighbour (8 am)', 'Good morning!'), sent(S, 1, 'Neighbour (8 am)', 'Good morning!'),
    sent(N, 2, 'Sarah', 'How are you?'), sent(S, 2, 'Sarah', 'How are you?'),
    sent(N, 3, 'Learner', 'Can we pay?'), sent(S, 3, 'Learner', 'Can we pay?'),
    sent(N, 4, 'Stranger', 'Who knows?'),
  ]
  const lines = (who) => pe.podEnglishLinesFor(who, { podIds: [N, S], pods: PODS, sentences, podCastByCourse: CAST })
  const aran = { voiceId: ARAN, spellings: [ARAN], gender: 'm' }
  const catrin = { voiceId: CATRIN, spellings: [CATRIN], gender: 'f' }

  it('Catrin is cast on the card alone by podEnglishOn', () => {
    expect(pe.podEnglishPodsFor(catrin, POLICY)).toEqual([N, S])
  })

  it('Aran gets the men\'s lines; Catrin the women\'s; a line cast differently in the two courses is on both, one copy each', () => {
    const a = lines(aran), c = lines(catrin)
    expect(a.map((l) => [l.text, l.courseCode, l.duplicateOf.length])).toEqual([['Good morning!', 'cym_n_for_eng', 1], ['Can we pay?', 'cym_n_for_eng', 0]])
    expect(c.map((l) => [l.text, l.courseCode, l.duplicateOf.length])).toEqual([['How are you?', 'cym_n_for_eng', 1], ['Can we pay?', 'cym_s_for_eng', 0]])
    // a speaker the cast does not name is nobody's: never guessed
    expect([...a, ...c].some((l) => l.text === 'Who knows?')).toBe(false)
    expect(c.every((l) => l.speakerGender === 'f') && a.every((l) => l.speakerGender === 'm')).toBe(true)
    expect(boothHome.buildHomeTracks(c.map((l) => ({ ...l, recorded: false })))[0]).toMatchObject({ key: 'podknown.pod-1', speakerGender: 'f' })
  })

  it('a take on the other gender\'s line resolves to nothing (the route answers 404)', () => {
    const sarah = sentences[2]
    expect(pe.resolvePodEnglish(sarah, aran, POLICY, CAST)).toBeNull()
    expect(pe.resolvePodEnglish(sarah, catrin, POLICY, CAST)).toMatchObject({ text: 'How are you?' })
    expect(pe.resolvePodEnglish(sentences[5], aran, POLICY, CAST)).toBeNull()   // South's Learner is a woman
    expect(pe.resolvePodEnglish(sentences[4], aran, POLICY, CAST)).not.toBeNull() // North's is a man
  })
})

function fixture() {
  return {
    language_recording_policy: [{ language: 'eng', human_only: false, voices: {
      'm:known': { name: 'Aran', gender: 'm', voiceId: ARAN, onlyCastOn: true, email: 'aran@hey.com',
        castOn: [{ courseCode: 'cym_n_for_eng', role: 'known', synthetic: 'queue' }, { courseCode: 'cym_s_for_eng', role: 'known' }] },
      'f:known': { name: 'Catrin', gender: 'f', voiceId: CATRIN, onlyCastOn: true, podEnglishOn: ['cym_n_for_eng', 'cym_s_for_eng'] },
    } }],
    dashboard_users: [],
    courses: [
      { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'north', voice_config: { podCast: NORTH_CAST }, content_version: '1.0.0' },
      { course_code: 'cym_s_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'south', voice_config: { podCast: SOUTH_CAST }, content_version: '1.0.0' },
    ],
    listening_pods: PODS.map((p) => ({ ...p })),
    listening_pod_sentences: [
      sent(N, 1, 'Neighbour', 'Good morning!', U['tts-neighbour']),
      sent(N, 2, 'Sarah', 'How are you?', U['tts-sarah']),      // a woman's line, still synthetic in North
      sent(S, 2, 'Sarah', 'How are you?', U['aran-sarah']),     // ...and in South already holding Aran's take (filled before 14:46Z)
      sent(N, 3, 'Learner', 'Can we pay?', U['tts-learner']),   // North's Learner: a man
      sent(S, 3, 'Learner', 'Can we pay?'),                     // South's Learner: a woman, empty
    ],
    course_audio: [
      clip(U['tts-neighbour'], 'xai_bedd6226', 'Good morning!', 'tts'),
      clip(U['tts-sarah'], 'xai_gfzdpspr5fdp', 'How are you?', 'tts'),
      clip(U['tts-learner'], 'xai_bedd6226', 'Can we pay?', 'tts'),
      clip(U['aran-sarah'], ARAN, 'How are you?', 'human'),
    ],
    content_edit_events: [],
    course_seeds: [], course_legos: [], course_practice_phrases: [], course_running_order: [], phrase_proof_flags: [],
  }
}

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
      const q = {
        select() { return q },
        insert(row) { inserted = { id: `ev${all.length + 1}`, ...row }; return q },
        update(p) { patch = p; return q },
        eq(col, val) { filters.push((r) => r[col] === val); return q },
        in(col, vals) { filters.push((r) => vals.includes(r[col])); return q },
        is(col, val) { filters.push((r) => (val === null ? r[col] == null : r[col] === val)); return q },
        not(col, op, val) { if (op === 'is' && val === null) filters.push((r) => r[col] != null); return q },
        gte() { return q }, lt() { return q }, ilike() { return q }, order() { return q },
        limit(n) { const out = run(); return Promise.resolve({ data: out.data.slice(0, n), error: null }) },
        range(from, to) { const out = run(); return Promise.resolve({ data: out.data.slice(from, to + 1), error: null }) },
        maybeSingle() { const out = run(); return Promise.resolve({ data: out.data[0] || null, error: null }) },
        single() { const out = run(); return Promise.resolve({ data: out.data[0] || null, error: out.data[0] ? null : { message: 'no row' } }) },
        then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject) },
      }
      return q
    },
  }
}

async function postTake(tables, voiceId, lineId, text) {
  const router = createRecordistRouter({
    getDb: () => stubDb(tables), logger: QUIET, s3: {},
    handleRecordingUpload: async (innerReq, innerRes) => {
      tables.course_audio.push({ ...clip(U['filed1'], voiceId, innerReq.body.metadata.text, 'human', '2026-10-29T15:00:00Z'), role: 'known' })
      innerRes.json({ success: true, s3Key: 'mastered/x.mp3', rawKey: 'raw/x', filing: { courseAudioId: U['filed1'] } })
    },
  })
  const layer = router.stack.find((l) => l.route && l.route.path === '/voice/:voiceId/take' && l.route.methods.post)
  const out = {}
  const settled = new Promise((resolve) => { out.res = { status(c) { out.status = c; return out.res }, json(b) { out.body = b; resolve(); return out.res } } })
  await layer.route.stack[0].handle({
    params: { voiceId }, query: {}, headers: { 'content-type': 'application/json' }, socket: {},
    method: 'POST', originalUrl: `/voice/${voiceId}/take`, body: { lineId, audioData: 'AAAA', mimeType: 'audio/webm', text },
  }, out.res)
  await settled
  return out
}

const slot = (tables, id) => tables.listening_pod_sentences.find((s) => s.id === id).known_audio_id

describe('Pod 1 English by speaker gender — the take', () => {
  it('Aran cannot file a take on a woman\'s line', async () => {
    const tables = fixture()
    const out = await postTake(tables, ARAN, `podeng:${N}:SC09-S002`, 'How are you?')
    expect(out.status).toBe(404)
    expect(tables.course_audio.some((c) => c.id === U['filed1'])).toBe(false)
  })

  it('his take of words a woman also speaks fills and replaces only the men\'s copies', async () => {
    const tables = fixture()
    const out = await postTake(tables, ARAN, `podeng:${N}:SC09-S003`, 'Can we pay?')
    expect(out.status || 200).toBe(200)
    expect(slot(tables, `${N}:SC09-S003`)).toBe(U['filed1'])  // North's Learner (a man): synthetic replaced (#555)
    expect(slot(tables, `${S}:SC09-S003`)).toBe(null)         // South's Learner (a woman): left empty for Catrin
    expect(slot(tables, `${N}:SC09-S002`)).toBe(U['tts-sarah']) // a woman's synthetic line is not his to replace
  })

  it('Catrin\'s take replaces his take on a woman\'s line and North\'s synthetic, his clip kept unattached', async () => {
    const tables = fixture()
    const out = await postTake(tables, CATRIN, `podeng:${N}:SC09-S002`, 'How are you?')
    expect(out.status || 200).toBe(200)
    expect(slot(tables, `${S}:SC09-S002`)).toBe(U['filed1'])
    expect(slot(tables, `${N}:SC09-S002`)).toBe(U['filed1'])
    expect(slot(tables, `${N}:SC09-S001`)).toBe(U['tts-neighbour']) // a man's line is not hers
    expect(tables.course_audio.map((c) => c.id)).toEqual(expect.arrayContaining([U['aran-sarah'], U['tts-sarah']]))
  })
})
