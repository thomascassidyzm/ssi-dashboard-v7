/**
 * The "Neath video" card on Aran's English booth (job #572): the NPTC walkthrough's voiceover, one timed line per
 * caption step, read in his own voice and linked to no learner slot.
 * Run: npx vitest run services/voice-engine/video-voiceover-lines.test.cjs
 */
import { describe, it, expect } from 'vitest'
const vo = require('./video-voiceover-lines.cjs')
const boothHome = require('./booth-home.cjs')
const { isLineRecorded } = require('./take-selection.cjs')
const createRecordistRouter = require('./recordist-router.cjs')

const ARAN = { voiceId: 'human_aran_eng', spellings: ['human_aran_eng'] }
const DAN = { voiceId: 'human_dan_cym_n', spellings: ['human_dan_cym_n'] }

describe('video voiceover lines', () => {
  it('Aran gets one Neath video card, one line per step, each with its timing', () => {
    const lines = vo.voiceoverLinesFor(ARAN)
    expect(lines).toHaveLength(18)
    expect(lines[0].id).toBe('voiceover:neath-video:title')
    expect(lines.every((l) => l.kind === 'voiceover' && l.role === 'known' && l.knownByText && l.readStyle === 'natural')).toBe(true)
    for (const l of lines) expect(l.voiceover.fitSec).toBeGreaterThanOrEqual(l.voiceover.aimSec)
    const tracks = boothHome.buildHomeTracks(lines)
    expect(tracks.map((t) => [t.key, t.total, t.podTitle])).toEqual([['voiceover.cym_nv2_for_eng', 18, 'Neath video']])
  })

  it('the script matches the labels on screen as filmed (#542) and carries #543\'s tips', () => {
    const all = vo.voiceoverLinesFor(ARAN).map((l) => l.text).join(' ')
    for (const label of ['Optional', 'Start learning', 'Welsh (South)', 'Too many tries', 'mobile data', 'college email', "device you'll learn on"]) {
      expect(all).toContain(label)
    }
    const segments = vo.SCRIPTS.videos[0].lines.map((l) => l.segment)
    expect(new Set(segments).size).toBe(segments.length)
  })

  it('nobody else gets them, and nobody else can file one', () => {
    expect(vo.voiceoverLinesFor(DAN)).toEqual([])
    const parsed = vo.parseVoiceoverLineId('voiceover:neath-video:staff-1')
    expect(parsed).toEqual({ slug: 'neath-video', key: 'staff-1' })
    expect(vo.resolveVoiceoverLine(parsed, ARAN)).toMatchObject({ courseCode: 'cym_nv2_for_eng', key: 'staff-1' })
    expect(vo.resolveVoiceoverLine(parsed, DAN)).toBeNull()
    for (const bad of ['voiceover:neath-video:nope', 'voiceover:other:title', 'voiceover:neath-video', 'intropiece:cym_nv2_for_eng:joiner']) {
      expect(vo.resolveVoiceoverLine(vo.parseVoiceoverLineId(bad), ARAN)).toBeNull()
    }
  })

  it('a line is recorded once he has any English take of the words', () => {
    const [title] = vo.voiceoverLinesFor(ARAN)
    expect(isLineRecorded(title, { recordedKeys: new Set(), spellings: ARAN.spellings })).toBe(false)
    expect(isLineRecorded(title, { recordedKeys: new Set(["here's how to get started with saysomethingin"]), spellings: ARAN.spellings })).toBe(true)
  })
})

// THE TAKE ROUTE: files his take as his English clip and links nothing.
function stubDb(tables, writes) {
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      let op = 'read'
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        ilike() { return q },
        not() { return q },
        order() { return q },
        limit(n) { return Promise.resolve({ data: rows.slice(0, n), error: null }) },
        range(from, to) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        single() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        update(p) { op = 'update'; writes.push({ table, op, p }); return q },
        upsert(p) { writes.push({ table, op: 'upsert', p }); return q },
        insert(p) { writes.push({ table, op: 'insert', p }); return q },
        then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject) },
      }
      void op
      return q
    },
  }
}

async function take(voiceId, lineId, text) {
  const tables = {
    language_recording_policy: [{ language: 'eng', human_only: false, voices: {
      m: { name: 'Aran', voiceId: 'human_aran_eng', gender: 'm', email: 'aran@example.com' },
    } }],
    dashboard_users: [], courses: [], listening_pods: [], listening_pod_sentences: [], course_audio: [],
  }
  const writes = []
  const uploads = []
  const quiet = { log() {}, info() {}, warn() {}, error() {} }
  const router = createRecordistRouter({
    getDb: () => stubDb(tables, writes), logger: quiet, s3: {},
    boothKeyGate: (req, res, next) => next(),
    handleRecordingUpload: async (innerReq, innerRes) => {
      uploads.push({ courseCode: innerReq.params.courseCode, artist: innerReq.libraryArtistVoiceId || null, metadata: innerReq.body.metadata })
      innerRes.json({ success: true, uuid: 'AUDIO-1', rawKey: 'raw/x', filing: { filed: true, courseAudioId: 'AUDIO-1' } })
    },
  })
  const layer = router.stack.find((l) => l.route && l.route.path === '/voice/:voiceId/take' && l.route.methods.post)
  const out = {}
  const settled = new Promise((resolve) => {
    out.res = { status(c) { out.status = c; return out.res }, json(b) { out.body = b; resolve(); return out.res }, setHeader() {}, set() {} }
  })
  await layer.route.stack[0].handle({
    params: { voiceId }, query: {}, headers: { 'content-type': 'application/json' }, socket: {},
    method: 'POST', originalUrl: `/voice/${voiceId}/take`,
    body: { lineId, text, audioData: 'AAAA', mimeType: 'audio/webm' },
  }, out.res)
  await settled
  return { status: out.status, body: out.body, uploads, writes }
}

describe('voiceover take route', () => {
  const line = vo.voiceoverLinesFor(ARAN).find((l) => l.id === 'voiceover:neath-video:staff-1')

  it('files an English take credited to his voice, with no item identity, and writes to no slot', async () => {
    const r = await take('human_aran_eng', line.id, line.text)
    expect(r.status).toBeUndefined()
    expect(r.body).toMatchObject({ ok: true, audioId: 'AUDIO-1', kind: 'voiceover', role: 'known' })
    expect(r.uploads).toHaveLength(1)
    const [u] = r.uploads
    expect(u.courseCode).toBe('cym_nv2_for_eng')
    expect(u.artist).toBe('human_aran_eng')
    expect(u.metadata).toMatchObject({ mode: 'script', role: 'known', kind: 'known', text: line.text, voiceId: 'human_aran_eng' })
    for (const id of ['seedId', 'legoId', 'phraseId', 'sentenceId', 'podId']) expect(u.metadata[id]).toBeUndefined()
    expect(r.writes.filter((w) => ['course_seeds', 'course_legos', 'course_practice_phrases', 'listening_pod_sentences'].includes(w.table))).toEqual([])
  })

  it('refuses a stale text and an unknown line, before the upload', async () => {
    expect((await take('human_aran_eng', line.id, 'Something else.')).status).toBe(409)
    const r = await take('human_aran_eng', 'voiceover:neath-video:nope', 'x')
    expect(r.status).toBe(404)
    expect(r.uploads).toEqual([])
  })
})
