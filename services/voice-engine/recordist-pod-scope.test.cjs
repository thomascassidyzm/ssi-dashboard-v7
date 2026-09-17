/**
 * recordist-pod-scope.test.cjs — ?pod= narrows the booth's read, not just its
 * drawing.
 *
 * The "open Aran" door on a pod page hands the booth
 * /r/:voiceId?course=<code>&pod=<slug>, and the pod half of that was
 * decoration: GET /voice/:voiceId answered with the WHOLE course. For Aran that
 * was 1221 Welsh lines and 1.7MB to reach the 438-line health pod he was
 * standing in front of, 4-10s of it, through a Vercel edge rewrite that answers
 * 502 rather than slowly (2026-09-17).
 *
 * What these pin: the scope he asks for is the scope he gets, the counts are
 * the scope's own, and a link with NO pod on it is byte-for-byte what it was.
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const express = require('express')
const createRecordistRouter = require('./recordist-router.cjs')

function stubDb(tables) {
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        ilike(col, val) { const w = String(val).toLowerCase(); rows = rows.filter((r) => String(r[col] || '').toLowerCase() === w); return q },
        not(col, op, val) { if (op === 'is' && val === null) rows = rows.filter((r) => r[col] != null); return q },
        order() { return q },
        range(from, to) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject) },
      }
      return q
    },
  }
}

const ARAN = 'ana@example.com'
const VOICE = 'human_ana_spa'

/** One Welsh course, two pods: the health pod he opened, and another. */
function fixture() {
  return {
    language_recording_policy: [{
      language: 'spa', human_only: true,
      voices: { f: { name: 'Ana', email: ARAN, voiceId: VOICE, gender: 'f' } },
    }],
    courses: [{
      course_code: 'spa_for_eng', target_lang: 'spa', known_lang: 'eng',
      voice_config: { podCast: { Ana: { name: 'Ana', gender: 'f', voiceId: VOICE, email: ARAN } } },
    }],
    listening_pods: [
      { id: 'p-health', course_code: 'spa_for_eng', slug: 'health', title: 'Health' },
      { id: 'p-other', course_code: 'spa_for_eng', slug: 'senedd', title: 'Senedd' },
    ],
    listening_pod_sentences: [
      { id: 'h1', pod_id: 'p-health', global_order: 1, speaker: 'Ana', target_text: 'Sut wyt ti?', known_text: 'How are you?' },
      { id: 'h2', pod_id: 'p-health', global_order: 2, speaker: 'Ana', target_text: 'Dwi angen help.', known_text: 'I need help.' },
      { id: 'o1', pod_id: 'p-other', global_order: 1, speaker: 'Ana', target_text: 'Bore da.', known_text: 'Good morning.' },
    ],
    course_audio: [],
    dashboard_users: [],
  }
}

/** The router on a real express app, asked exactly as the booth asks. */
async function ask(query) {
  const app = express()
  app.use('/api/recording', createRecordistRouter({
    getDb: () => stubDb(fixture()),
    logger: { info() {}, warn() {}, error() {} },
    requireAdmin: (req, res, next) => next(),
    requireDashboardUser: (req, res, next) => next(),
    handleRecordingUpload: async () => ({}),
    s3: {},
  }))
  const server = app.listen(0)
  await new Promise((r) => server.once('listening', r))
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/recording/voice/${VOICE}?${query}`)
    return { status: res.status, body: await res.json() }
  } finally {
    server.close()
  }
}

test('?pod= returns that pod alone, and the counts are that pod\'s own', async () => {
  const { status, body } = await ask('includeRecorded=1&course=spa_for_eng&pod=health')
  assert.strictEqual(status, 200)
  assert.deepStrictEqual(body.lines.map((l) => l.text), ['Sut wyt ti?', 'Dwi angen help.'])
  assert.ok(body.lines.every((l) => l.podSlug === 'health'), 'no line from another pod came back')
  assert.strictEqual(body.total, 2, 'the tally is the pod he opened, not the course')
  assert.strictEqual(body.remaining, 2)
  assert.strictEqual(body.pod, 'health', 'the scope it GOT is echoed, never assumed')
})

test('the full pod id works too, so a link somebody already has keeps working', async () => {
  const { body } = await ask('includeRecorded=1&course=spa_for_eng&pod=p-health')
  assert.deepStrictEqual(body.lines.map((l) => l.text), ['Sut wyt ti?', 'Dwi angen help.'])
})

test('no ?pod= is exactly what it was: the whole course, every pod', async () => {
  const { body } = await ask('includeRecorded=1&course=spa_for_eng')
  assert.deepStrictEqual(body.lines.map((l) => l.text).sort(), ['Bore da.', 'Dwi angen help.', 'Sut wyt ti?'])
  assert.strictEqual(body.total, 3)
  assert.strictEqual(body.pod, null)
})
