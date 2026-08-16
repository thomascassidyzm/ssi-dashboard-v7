/**
 * recordist-clip-variant.test.cjs — the RAW vs PROCESSED half of route 3.
 *
 * Two things are worth testing here and nothing else is: that a raw original is
 * found ONLY through the mastered object's own S3 metadata (there is no
 * raw_key column anywhere), and that a take with no original says so in a way
 * the UI can act on — because every take made before 2026-08-14 has no
 * original, including all 111 of Aran's, and a silent failure there would read
 * to him as "compare is broken" rather than "there is nothing to compare".
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { resolveRawKey } = require('../s3-production-service.cjs')
const createRecordistRouter = require('./recordist-router.cjs')

// ── the helper ──────────────────────────────────────────────────────────────

/** An S3 client that answers one HEAD however the test wants it answered. */
function stubS3Client(answer) {
  return {
    send: async () => {
      if (answer instanceof Error) throw answer
      return answer
    },
  }
}
function notFoundError() {
  return Object.assign(new Error('NotFound'), { name: 'NotFound', $metadata: { httpStatusCode: 404 } })
}

test('a raw original is found through the mastered object’s metadata', async () => {
  const client = stubS3Client({ Metadata: { rawkey: 'raw/B35340E2-5FFA-4B31-9A2A-54D04E6D1265.webm' } })
  assert.deepEqual(await resolveRawKey('mastered/B35340E2.mp3', { client }), {
    rawKey: 'raw/B35340E2-5FFA-4B31-9A2A-54D04E6D1265.webm',
    notFound: false,
  })
})

test('the SDK’s lowercasing is not relied on — both spellings are read', async () => {
  const client = stubS3Client({ Metadata: { rawKey: 'raw/abc.webm' } })
  const { rawKey } = await resolveRawKey('mastered/abc.mp3', { client })
  assert.equal(rawKey, 'raw/abc.webm')
})

test('a take with no original resolves to null, distinguishable from a missing clip', async () => {
  // Recorded before 2026-08-14: the object is there, it just has no pointer.
  const preFix = await resolveRawKey('mastered/old.mp3', { client: stubS3Client({ Metadata: { courseCode: 'cym_n_for_eng' } }) })
  assert.deepEqual(preFix, { rawKey: null, notFound: false },
    'no rawKey on a live object means "no original was kept", not "clip missing"')

  // No mastered object at all is a different failure and must stay different.
  const gone = await resolveRawKey('mastered/gone.mp3', { client: stubS3Client(notFoundError()) })
  assert.deepEqual(gone, { rawKey: null, notFound: true })

  assert.deepEqual(await resolveRawKey(null), { rawKey: null, notFound: true })
})

test('malformed metadata is refused rather than signed', async () => {
  const cases = [
    [{ Metadata: {} }, 'no metadata at all'],
    [{ Metadata: { rawkey: '' } }, 'empty string'],
    [{ Metadata: { rawkey: '   ' } }, 'whitespace'],
    [{ Metadata: { rawkey: 'undefined' } }, 'the string "undefined"'],
    [{ Metadata: { rawkey: 'mastered/other.mp3' } }, 'a MASTERED key — signing this would serve the processed bytes as "raw"'],
    [{ Metadata: { rawkey: 42 } }, 'a non-string'],
    [{}, 'no Metadata key on the response'],
  ]
  for (const [head, why] of cases) {
    const { rawKey, notFound } = await resolveRawKey('mastered/x.mp3', { client: stubS3Client(head) })
    assert.equal(rawKey, null, `refused: ${why}`)
    assert.equal(notFound, false, 'the object itself was found — only the pointer is bad')
  }
})

test('a percent-encoded rawkey is decoded, because that is how it was written', async () => {
  // toS3Metadata percent-encodes any non-ASCII value on the way in.
  const client = stubS3Client({ Metadata: { rawkey: 'raw/B35340E2%2Dtake.webm' } })
  const { rawKey } = await resolveRawKey('mastered/x.mp3', { client })
  assert.equal(rawKey, 'raw/B35340E2-take.webm')
})

// ── the route ───────────────────────────────────────────────────────────────

const POLICY = [{
  language: 'cym',
  human_only: true,
  voices: { m: { name: 'Aran', email: 'aran@hey.com', voiceId: 'human_aran_cym_n' } },
}]

function stubDb() {
  const tables = {
    language_recording_policy: POLICY,
    courses: [{ course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: {} }],
    listening_pod_sentences: [
      { id: 'L1', pod_id: 'p', target_text: 'Bore da.', target_audio_id: 'A1' },
      { id: 'L2', pod_id: 'p', target_text: 'Nos da.', target_audio_id: null },
    ],
    course_audio: [{ id: 'A1', s3_key: 'mastered/A1.mp3', voice_id: 'human_aran_cym_n', language: 'cym' }],
  }
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        not(col, op, val) { if (op === 'is' && val === null) rows = rows.filter((r) => r[col] != null); return q },
        order() { return q },
        limit(n) { return Promise.resolve({ data: rows.slice(0, n), error: null }) },
        range(from, to) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject) },
      }
      return q
    },
  }
}

/** Route 3's handler, with S3 stubbed at the service seam. */
function clipHandler(s3) {
  const router = createRecordistRouter({
    getDb: stubDb,
    logger: { log() {}, error() {} },
    s3,
  })
  const layer = router.stack.find((l) => l.route && l.route.path === '/voice/:voiceId/line/:lineId/clip')
  return layer.route.stack[0].handle
}

function mockRes() {
  const out = {}
  const res = {
    status(c) { out.status = c; return res },
    json(b) { out.body = b; out.resolve(out); return res },
    redirect(c, url) { out.status = c; out.location = url; out.resolve(out); return res },
  }
  out.settled = new Promise((r) => { out.resolve = r })
  return { res, out }
}

async function call(s3, query, lineId = 'L1') {
  const { res, out } = mockRes()
  await clipHandler(s3)({ params: { voiceId: 'human_aran_cym_n', lineId }, query }, res)
  return out
}

const S3_WITH_RAW = {
  getAudioSignedUrl: async (id, exp, opts) => `https://s3/signed/${opts.s3Key}`,
  getRawSignedUrl: async () => ({ url: 'https://s3/signed/raw/A1.webm', rawKey: 'raw/A1.webm', notFound: false }),
}
const S3_NO_RAW = {
  getAudioSignedUrl: async (id, exp, opts) => `https://s3/signed/${opts.s3Key}`,
  getRawSignedUrl: async () => ({ url: null, rawKey: null, notFound: false }),
}

test('no variant is the processed clip, exactly as before', async () => {
  const r = await call(S3_WITH_RAW, {})
  assert.equal(r.status, 302)
  assert.equal(r.location, 'https://s3/signed/mastered/A1.mp3')
})

test('?variant=raw serves the original, ?variant=processed serves the mastered clip', async () => {
  const raw = await call(S3_WITH_RAW, { variant: 'raw', json: '1' })
  assert.equal(raw.body.s3Key, 'raw/A1.webm')
  assert.equal(raw.body.variant, 'raw')

  const proc = await call(S3_WITH_RAW, { variant: 'processed', json: '1' })
  assert.equal(proc.body.s3Key, 'mastered/A1.mp3')
  assert.equal(proc.body.variant, 'processed')

  const redirected = await call(S3_WITH_RAW, { variant: 'raw' })
  assert.equal(redirected.status, 302)
  assert.equal(redirected.location, 'https://s3/signed/raw/A1.webm')
})

test('a pre-2026-08-14 take answers a machine-readable 404, not a dead player', async () => {
  const r = await call(S3_NO_RAW, { variant: 'raw', json: '1' })
  assert.equal(r.status, 404)
  assert.equal(r.body.reason, 'no_raw_retained')
  assert.match(r.body.error, /2026-08-14/, 'the recordist is told WHY, in a date they can act on')
  // The processed side of the same line is untouched by the absence.
  const proc = await call(S3_NO_RAW, { json: '1' })
  assert.equal(proc.body.s3Key, 'mastered/A1.mp3')
})

test('"no original kept" and "nothing recorded yet" are different answers', async () => {
  const noTake = await call(S3_WITH_RAW, { variant: 'raw', json: '1' }, 'L2')
  assert.equal(noTake.status, 404)
  assert.equal(noTake.body.reason, 'no_take', 'an unrecorded line must never read as "your original was lost"')
})

test('an unknown variant is refused rather than silently treated as processed', async () => {
  const r = await call(S3_WITH_RAW, { variant: 'sideways' })
  assert.equal(r.status, 400)
  assert.equal(r.body.reason, 'bad_variant')
})
