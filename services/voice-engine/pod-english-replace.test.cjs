// North's SYNTHETIC Pod 1 English is replaced by Aran's takes (Aran, 2026-10-29 14:39Z, job #555), make-before-break through
// link-clip: every take of his sweeps North Pod 1, so a line he had already recorded moves too. Never a human clip, never
// South (fill-only), never the two lines job #551 owns, never a clip of another voice.
//   npx vitest run services/voice-engine/pod-english-replace.test.cjs
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
import fs from 'fs'
import os from 'os'
import path from 'path'

const require = createRequire(import.meta.url)
process.env.CASTING_ACCESS_LEDGER = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pod-english-replace-')), 'casting-access.jsonl')
const createRecordistRouter = require('./recordist-router.cjs')
const { planPodEnglishReplacements } = require('./pod-english-lines.cjs')
const { normalizeForAudio } = require('../shared/text-normalize.cjs')

const ARAN = 'human_aran_eng'
// link-clip takes course_audio uuids only; readable names map to fixed ones.
const U = Object.fromEntries(['tts-held', 'tts-olivia', 'tts-tom', 'human-old', 'tts-cartesia', 'earlier-take', 'his-good-day', 'someone-else', 'held-take', 'filed1']
  .map((n, i) => [n, `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`]))
const N = 'cym_n_for_eng:pod-1', S = 'cym_s_for_eng:pod-1'
const QUIET = { log() {}, info() {}, warn() {}, error() {} }
const clip = (id, voice_id, text, origin, created_at = '2026-10-29T10:00:00Z') => ({ id, voice_id, language: 'eng', origin, text, text_normalized: normalizeForAudio(text), created_at })

function fixture() {
  const sent = (pod, n, known, audio = null) => ({ id: `${pod}:SC0${n}`, pod_id: pod, global_order: n, speaker: 'Neighbour', target_text: 'Bore da!', known_text: known, known_audio_id: audio })
  return {
    language_recording_policy: [{ language: 'eng', human_only: false, voices: {
      m: { name: 'Aran', gender: 'm', voiceId: ARAN, onlyCastOn: true, email: 'aran@hey.com',
        castOn: [{ courseCode: 'cym_n_for_eng', role: 'known', synthetic: 'queue' }, { courseCode: 'cym_s_for_eng', role: 'known' }] },
    } }],
    dashboard_users: [],
    courses: [
      { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'north', voice_config: {}, content_version: '1.0.0' },
      { course_code: 'cym_s_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'south', voice_config: {}, content_version: '1.0.0' },
    ],
    listening_pods: [
      { id: N, course_code: 'cym_n_for_eng', slug: 'pod-1', title: 'North Pod 1' },
      { id: S, course_code: 'cym_s_for_eng', slug: 'pod-1', title: 'South Pod 1' },
    ],
    listening_pod_sentences: [
      sent(N, '1-S001', 'Good morning, Sarah!', U['tts-held']),     // job #551's line
      sent(N, '1-S002', 'Fine, thanks.', U['tts-olivia']),          // synthetic, his take arrives now
      sent(N, '1-S003', 'See you later.', U['tts-tom']),            // synthetic, his take was given BEFORE this shipped
      sent(N, '1-S004', 'Have a good day.', U['human-old']),        // a human take: never replaced
      sent(N, '1-S005', 'Two coffees, please.', U['tts-cartesia']), // synthetic, only someone else's take exists
      sent(S, '1-S002', 'Fine, thanks.'),
    ],
    course_audio: [
      clip(U['tts-held'], 'xai_gfzdpspr5fdp', 'Good morning, Sarah!', 'tts'),
      clip(U['tts-olivia'], 'xai_gfzdpspr5fdp', 'Fine, thanks.', 'tts'),
      clip(U['tts-tom'], 'xai_bedd6226', 'See you later.', 'tts'),
      clip(U['human-old'], 'human_aran_cym_n', 'Have a good day.', 'legacy_import'),
      clip(U['tts-cartesia'], 'cartesia_8fef4d59', 'Two coffees, please.', 'tts'),
      clip(U['earlier-take'], ARAN, 'See you later.', 'human', '2026-10-20T10:00:00Z'),
      clip(U['his-good-day'], ARAN, 'Have a good day.', 'human'),
      clip(U['someone-else'], 'human_dan_eng', 'Two coffees, please.', 'human'),
      clip(U['held-take'], ARAN, 'Good morning, Sarah!', 'human'),
    ],
    content_edit_events: [],
    course_seeds: [], course_legos: [], course_practice_phrases: [], course_running_order: [], phrase_proof_flags: [],
  }
}

/** pod-english-take.test.cjs's stub, plus insert/single for the content-edit event and the version bump. */
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

async function postTake(tables, lineId, text) {
  const router = createRecordistRouter({
    getDb: () => stubDb(tables), logger: QUIET, s3: {},
    handleRecordingUpload: async (innerReq, innerRes) => {
      tables.course_audio.push({ ...clip(U['filed1'], ARAN, innerReq.body.metadata.text, 'human', '2026-10-29T15:00:00Z'), role: 'known' })
      innerRes.json({ success: true, s3Key: 'mastered/x.mp3', rawKey: 'raw/x', filing: { courseAudioId: U['filed1'] } })
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

const slot = (tables, id) => tables.listening_pod_sentences.find((s) => s.id === id).known_audio_id

describe('a Pod 1 English take replaces North\'s synthetic English (job #555)', () => {
  it('moves every synthetic North line he has a take for, his earlier takes included, and nothing else', async () => {
    const tables = fixture()
    const out = await postTake(tables, `podeng:${N}:SC01-S002`, 'Fine, thanks.')
    expect(out.status || 200).toBe(200)
    expect(slot(tables, `${N}:SC01-S002`)).toBe(U['filed1'])       // this take
    expect(slot(tables, `${N}:SC01-S003`)).toBe(U['earlier-take']) // back-filled from a take given before
    expect(slot(tables, `${N}:SC01-S001`)).toBe(U['tts-held'])     // left to job #551
    expect(slot(tables, `${N}:SC01-S004`)).toBe(U['human-old'])    // a human take is never replaced
    expect(slot(tables, `${N}:SC01-S005`)).toBe(U['tts-cartesia']) // another voice's take is not his
    expect(slot(tables, `${S}:SC01-S002`)).toBe(U['filed1'])       // South still fills
    // make-before-break: the synthetic clips stay in course_audio, unattached
    expect(tables.course_audio.map((c) => c.id)).toEqual(expect.arrayContaining([U['tts-olivia'], U['tts-tom']]))
    // one content-edit event and one version bump for North
    const ev = tables.content_edit_events.filter((e) => e.course_code === 'cym_n_for_eng')
    expect(ev).toHaveLength(1)
    expect(ev[0].scope.pod_sentence_ids.sort()).toEqual([`${N}:SC01-S002`, `${N}:SC01-S003`])
    expect(tables.courses.find((c) => c.course_code === 'cym_n_for_eng').content_version).toBe('1.0.1')
  })

  it('plans no replacement for an unreadable current clip (not knowing is not permission)', () => {
    const { links, skipped } = planPodEnglishReplacements({
      podIds: [N],
      sentences: [{ id: `${N}:SC09-S001`, pod_id: N, known_text: 'Hello.', known_audio_id: 'gone' }],
      currentById: new Map(),
      takes: [clip('t', ARAN, 'Hello.', 'human')],
    })
    expect(links).toEqual([])
    expect(skipped.unreadable).toBe(1)
  })
})
