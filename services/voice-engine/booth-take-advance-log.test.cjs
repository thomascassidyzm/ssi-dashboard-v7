// ADVANCE TELEMETRY ON THE [BoothTake] LINE (Aran, 2026-10-26, job #99). Jobs #36
// and #69 had to infer "tapped or stalled?" from raw-audio timing because the
// booth never said how a line moved on. The booth now sends advanceBy /
// advanceGapMs / thrSpeech / thrQuiet with each take, and the one log line per
// take carries them. Proved through the real take route (a policy voice filing
// its own pod line, the fixture shape of booth-take-routes-own-line-by-voice-id).
// Run: node services/voice-engine/booth-take-advance-log.test.cjs
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
process.env.CASTING_ACCESS_LEDGER = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'adv-log-')), 'casting-access.jsonl')

const test = require('node:test')
const assert = require('node:assert')
const createRecordistRouter = require('./recordist-router.cjs')

const BEA = 'human_bea_swa', LINE = 's_bea'
const tables = {
  language_recording_policy: [{ language: 'swa', human_only: true, voices: {
    f: { name: 'Bea', voiceId: BEA, gender: 'f', email: 'bea@example.com' },
  } }],
  dashboard_users: [],
  courses: [{ course_code: 'swa_for_eng', target_lang: 'swa', known_lang: 'eng', voice_config: { podCast: {
    Bea: { name: 'Bea', gender: 'f', voiceId: BEA },
  } } }],
  listening_pods: [{ id: 'p_eng', course_code: 'swa_for_eng', slug: 'pod-1', title: 'Pod 1' }],
  listening_pod_sentences: [{ id: LINE, pod_id: 'p_eng', global_order: 1, speaker: 'Bea', target_text: 'Habari.', known_text: 'Hello.' }],
  course_audio: [],
}

function stubDb() {
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      let op = 'read', patch = null
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        ilike(col, val) { const w = String(val).toLowerCase(); rows = rows.filter((r) => String(r[col] || '').toLowerCase() === w); return q },
        not(col, op2, val) { if (op2 === 'is' && val === null) rows = rows.filter((r) => r[col] != null); return q },
        order() { return q },
        limit(n) { return Promise.resolve({ data: rows.slice(0, n), error: null }) },
        range(from, to) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        single() { return Promise.resolve({ data: op === 'upsert' ? { id: 'new-1', ...patch } : rows[0] || null, error: null }) },
        update(p) { op = 'update'; patch = p; return q },
        upsert(p) { op = 'upsert'; patch = p; return q },
        insert(p) { op = 'upsert'; patch = p; return q },
        then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject) },
      }
      return q
    },
  }
}

async function takeLogLine(extraBody) {
  const lines = []
  const logger = { log(m) { lines.push(String(m)) }, info() {}, warn() {}, error() {} }
  const router = createRecordistRouter({
    getDb: () => stubDb(),
    logger,
    s3: {},
    handleRecordingUpload: async (_req, innerRes) => innerRes.json({ success: true, uuid: 'AUDIO-1', s3Key: 'mastered/x.mp3', rawKey: 'raw/x' }),
  })
  const layer = router.stack.find((l) => l.route && l.route.path === '/voice/:voiceId/take' && l.route.methods.post)
  let onFinish = null
  const res = {
    statusCode: 200,
    on(ev, fn) { if (ev === 'finish') onFinish = fn },
    setHeader() {}, set() { return res }, header() { return res },
    status(c) { res.statusCode = c; return res },
    json() { if (onFinish) onFinish(); return res },
  }
  await layer.route.stack[0].handle({
    params: { voiceId: BEA }, query: {}, headers: { 'content-type': 'application/json' }, socket: {},
    method: 'POST', originalUrl: `/voice/${BEA}/take`,
    body: { lineId: LINE, audioData: 'AAAA', mimeType: 'audio/webm', ...extraBody },
  }, res)
  return lines.find((l) => l.startsWith('[BoothTake] ')) || null
}

test('a take that says how its line moved on puts it on the [BoothTake] line', async () => {
  const line = await takeLogLine({ advanceBy: 'auto', advanceGapMs: '1253', thrSpeech: '-41.6', thrQuiet: '-45.2' })
  assert.ok(line, 'one [BoothTake] line is logged')
  assert.match(line, /status=200 /)
  assert.match(line, / advance=auto gapMs=1253 thrSpeech=-41\.6 thrQuiet=-45\.2$/)
})

test('a tap with no speech heard yet logs gapMs=?', async () => {
  const line = await takeLogLine({ advanceBy: 'tap', thrSpeech: '-40', thrQuiet: '-44' })
  assert.match(line, / advance=tap gapMs=\? thrSpeech=-40 thrQuiet=-44$/)
})

test('an older booth that sends nothing logs exactly the old line', async () => {
  const line = await takeLogLine({})
  assert.match(line, / inFlight=\d+$/)
  assert.doesNotMatch(line, /advance=/)
})

test('client words never reach the log raw', () => {
  const f = createRecordistRouter.boothAdvanceLogFields
  assert.equal(f({ advanceBy: 'auto\nFAKE' }), '')
  assert.equal(f({ advanceBy: 'auto', advanceGapMs: '12 status=500', thrSpeech: -38.5, thrQuiet: 'x' }), ' advance=auto gapMs=? thrSpeech=-38.5 thrQuiet=?')
})

// voicedMs (job #915): how much of the line the meter called speech rides on the same line.
test('a take that says how much of it was voiced logs voicedMs', async () => {
  const line = await takeLogLine({ advanceBy: 'auto', advanceGapMs: '1216', thrSpeech: '-34', thrQuiet: '-34', voicedMs: '2384' })
  assert.match(line, / advance=auto gapMs=1216 thrSpeech=-34 thrQuiet=-34 voicedMs=2384$/)
  assert.equal(createRecordistRouter.boothAdvanceLogFields({ advanceBy: 'tap', voicedMs: '32 x' }), ' advance=tap gapMs=? thrSpeech=? thrQuiet=? voicedMs=?')
})
