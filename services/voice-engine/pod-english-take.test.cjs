// A Pod 1 English take (job #537) fills every EMPTY known slot of its words in North and South Pod 1, and never
// displaces a filled one by the fill itself. North's synthetic English is replaced by a separate sweep (job #555,
// pod-english-replace.test.cjs); this fixture's North line is SC01-S001, which that sweep leaves to job #551.
//   npx vitest run services/voice-engine/pod-english-take.test.cjs
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
import fs from 'fs'
import os from 'os'
import path from 'path'

const require = createRequire(import.meta.url)
process.env.CASTING_ACCESS_LEDGER = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pod-english-')), 'casting-access.jsonl')
const createRecordistRouter = require('./recordist-router.cjs')

const ARAN = 'human_aran_eng'
const N = 'cym_n_for_eng:pod-1', S = 'cym_s_for_eng:pod-1'
const QUIET = { log() {}, info() {}, warn() {}, error() {} }

function fixture() {
  // Scene 9, not scene 1: scene 1/5 rows of these pods carry a pending Siân swap (pod-text-swaps.cjs, job #551).
  const sent = (pod, n, known, audio = null) => ({ id: `${pod}:SC09-S00${n}`, pod_id: pod, global_order: n, speaker: 'Neighbour', target_text: 'Bore da!', known_text: known, known_audio_id: audio })
  return {
    language_recording_policy: [{ language: 'eng', human_only: false, voices: {
      m: { name: 'Aran', gender: 'm', voiceId: ARAN, onlyCastOn: true, email: 'aran@hey.com',
        castOn: [{ courseCode: 'cym_n_for_eng', role: 'known', synthetic: 'queue' }, { courseCode: 'cym_s_for_eng', role: 'known' }] },
    } }],
    dashboard_users: [],
    courses: [
      { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'north', voice_config: { podCast: { Neighbour: { gender: 'm' } } } },
      { course_code: 'cym_s_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'south', voice_config: { podCast: { Neighbour: { gender: 'm' } } } },
    ],
    listening_pods: [
      { id: N, course_code: 'cym_n_for_eng', slug: 'pod-1', title: 'North Pod 1' },
      { id: S, course_code: 'cym_s_for_eng', slug: 'pod-1', title: 'South Pod 1' },
      { id: 'cym_s_for_eng:health', course_code: 'cym_s_for_eng', slug: 'health', title: 'Health' },
    ],
    listening_pod_sentences: [
      sent(N, 1, 'Good morning, Sarah!', 'tts-olivia'),
      sent(S, 1, 'Good morning Sarah'),
      sent(S, 2, 'Fine, thanks.'),
      sent('cym_s_for_eng:health', 1, 'Good morning, Sarah!'),
    ],
    course_audio: [{ id: 'tts-olivia', voice_id: 'xai_bedd6226', language: 'eng', origin: 'tts', text: 'Good morning, Sarah!' }],
    course_seeds: [], course_legos: [], course_practice_phrases: [], course_running_order: [], phrase_proof_flags: [],
  }
}

/** A stub supabase whose updates honour every filter (including `.is(col, null)`); recordist-same-words.test.cjs's shape. */
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

async function postTake(tables, lineId, text) {
  let filedMeta = null
  const router = createRecordistRouter({
    getDb: () => stubDb(tables), logger: QUIET, s3: {},
    handleRecordingUpload: async (innerReq, innerRes) => {
      filedMeta = innerReq.body.metadata
      tables.course_audio.push({ id: 'filed1', voice_id: ARAN, language: 'eng', role: 'known', origin: 'human', text: filedMeta.text })
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
  return { ...out, filedMeta }
}

const slot = (tables, id) => tables.listening_pod_sentences.find((s) => s.id === id).known_audio_id

describe('a Pod 1 English take', () => {
  it('files as his English known take and fills South\'s empty slot of the same words; North\'s synthetic clip stays', async () => {
    const tables = fixture()
    const out = await postTake(tables, `podeng:${N}:SC09-S001`, 'Good morning, Sarah!')
    expect(out.status || 200).toBe(200)
    expect(out.body).toMatchObject({ ok: true, audioId: 'filed1', role: 'known' })
    expect(out.filedMeta).toMatchObject({ role: 'known', kind: 'pod-english', text: 'Good morning, Sarah!', voiceId: ARAN })
    expect(slot(tables, `${S}:SC09-S001`)).toBe('filed1')
    expect(slot(tables, `${N}:SC09-S001`)).toBe('tts-olivia')
    expect(slot(tables, `${S}:SC09-S002`)).toBeNull()
    // Not a card pod: the health pod's line of the same words is left alone.
    expect(slot(tables, 'cym_s_for_eng:health:SC09-S001')).toBeNull()
  })

  it('is refused on a pod that is not on the card, and on changed words', async () => {
    const tables = fixture()
    expect((await postTake(tables, 'podeng:cym_s_for_eng:health:SC09-S001', 'Good morning, Sarah!')).status).toBe(404)
    expect((await postTake(tables, `podeng:${S}:SC09-S002`, 'Fine thanks, you?')).status).toBe(409)
    expect(slot(tables, `${S}:SC09-S002`)).toBeNull()
  })
})
