/**
 * clone-source.test.cjs — the pack path on the recordist surface.
 *
 * The tests that matter here are the ISOLATION ones. A clone source that leaked
 * into a course would put Tom reading an OpenAI consent form in front of a
 * learner, and the defence against that is not a tag someone must remember to
 * check — it is that this path calls no database and no upload seam at all. So
 * the router is constructed with a getDb and a handleRecordingUpload that THROW
 * if they are ever touched, and the pack routes are exercised through them.
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const createRecordistRouter = require('./recordist-router.cjs')
const { resolvePack, findItem, TOM_CLONE_PACK } = require('./clone-source-pack.cjs')
const { takeKey, indexTakes, extForMime, buildPackQueue } = require('./clone-source-store.cjs')

// ── harness ─────────────────────────────────────────────────────────────────

/** Find a route handler on the built router by method and path. */
function handlerFor(router, method, path) {
  const layer = router.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method]
  )
  assert.ok(layer, `no ${method.toUpperCase()} ${path} on the router`)
  return layer.route.stack[layer.route.stack.length - 1].handle
}

function fakeRes() {
  const out = { status: 200, body: null, redirected: null }
  const res = {
    status(c) { out.status = c; return res },
    json(b) { out.body = b; return res },
    send(b) { out.body = b; return res },
    redirect(code, url) { out.status = code; out.redirected = url; return res },
  }
  return { res, out }
}

/** An s3 double that records every write and answers listings from memory. */
function fakeS3(objects = []) {
  const uploads = []
  return {
    uploads,
    objects,
    async listObjects(prefix) { return objects.filter((o) => o.key.startsWith(prefix)) },
    async uploadRawTake(args) {
      uploads.push(args)
      objects.push({ key: args.key, size: args.buffer.length, lastModified: new Date() })
      return { key: args.key, bytes: args.buffer.length, uploaded: true }
    },
    async getAudioSignedUrl(_uuid, _exp, opts) { return `https://signed.example/${opts.s3Key}` },
    async getRawSignedUrl() { throw new Error('a pack has no mastered/raw pair') },
  }
}

/**
 * A router whose database and upload seam are landmines. Any pack request that
 * touches either fails the test loudly rather than quietly writing a row.
 */
function packRouter(s3) {
  return createRecordistRouter({
    getDb: () => { throw new Error('ISOLATION BREACH: a pack route touched the database') },
    handleRecordingUpload: async () => { throw new Error('ISOLATION BREACH: a pack take reached the course upload seam') },
    logger: { log() {}, error() {} },
    s3,
  })
}

// ── the pack itself ─────────────────────────────────────────────────────────

test('the pack resolves by voice id and nothing else does', () => {
  assert.equal(resolvePack('pack-tom-clone'), TOM_CLONE_PACK)
  assert.equal(resolvePack('human_aran_cym'), null)
  assert.equal(resolvePack('pack-not-a-real-pack'), null)
  assert.equal(resolvePack(''), null)
  assert.equal(resolvePack(null), null)
})

test("OpenAI's consent line is its own item, verbatim, and capped", () => {
  const item = findItem(TOM_CLONE_PACK, 'b2-openai-consent')
  // Their rule: "The consent audio recording must only include one of the
  // following phrases. Any divergence from the script will lead to a failure."
  assert.equal(
    item.text,
    'I am the owner of this voice and I consent to OpenAI using this voice to create a synthetic voice model.'
  )
  assert.equal(item.isolated, true)
  // Nothing else may share the clip — so nothing else may share the item.
  assert.equal(TOM_CLONE_PACK.items.filter((i) => i.text.includes('OpenAI using this voice')).length, 1)
})

test("the cloning sample carries OpenAI's 30-second ceiling", () => {
  assert.equal(findItem(TOM_CLONE_PACK, 'b4-cloning-sample').maxSeconds, 30)
})

test('every item is separately recordable and ordered', () => {
  const orders = TOM_CLONE_PACK.items.map((i) => i.order)
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b))
  assert.equal(new Set(TOM_CLONE_PACK.items.map((i) => i.id)).size, TOM_CLONE_PACK.items.length)
})

// ── the store ───────────────────────────────────────────────────────────────

test('take keys sort newest-last and never collide', () => {
  const a = takeKey({ packId: 'tom-clone', itemId: 'b1-slate', mimeType: 'audio/webm', now: 1756000000000 })
  const b = takeKey({ packId: 'tom-clone', itemId: 'b1-slate', mimeType: 'audio/webm', now: 1756000009999 })
  assert.ok(a < b, 'a later take must sort after an earlier one')
  assert.ok(a.startsWith('clone-source/tom-clone/b1-slate/'))
  assert.notEqual(a, takeKey({ packId: 'tom-clone', itemId: 'b1-slate', mimeType: 'audio/webm', now: 1756000000000 }))
})

test('a rejected take is filed apart and never counts as recorded', () => {
  const key = takeKey({ packId: 'tom-clone', itemId: 'b4-cloning-sample', mimeType: 'audio/webm', rejected: true })
  assert.ok(key.startsWith('clone-source/tom-clone/_rejected/'))
  const index = indexTakes([{ key }], 'tom-clone')
  assert.equal(index.size, 0)
})

test('the newest take of an item is the one offered back', () => {
  const index = indexTakes([
    { key: 'clone-source/tom-clone/b1-slate/0001756000000000-a.webm' },
    { key: 'clone-source/tom-clone/b1-slate/0001756000099999-b.webm' },
  ], 'tom-clone')
  assert.ok(index.get('b1-slate').key.endsWith('-b.webm'))
})

test('an iPhone voice memo keeps its container', () => {
  assert.equal(extForMime('audio/mp4'), 'm4a')
  assert.equal(extForMime('audio/webm;codecs=opus'), 'webm')
})

test('the queue shape carries no course anywhere', () => {
  const q = buildPackQueue(TOM_CLONE_PACK, new Map(), { includeRecorded: true })
  assert.equal(q.lines.length, TOM_CLONE_PACK.items.length)
  assert.ok(q.lines.every((l) => l.courseCode === null))
  assert.ok(q.lines.every((l) => l.kind === 'pack'))
})

test('the block title reaches a slot the page actually renders', () => {
  // `speaker` is in the contract and rendered nowhere, so a title parked there
  // would be invisible — and knowing that block 2 is the word-perfect one is
  // the single most important thing on that screen.
  const q = buildPackQueue(TOM_CLONE_PACK, new Map(), { includeRecorded: true })
  const consent = q.lines.find((l) => l.id === 'b2-openai-consent')
  assert.match(consent.knownText, /Block 2/)
  assert.match(consent.knownText, /Word-perfect/)
  assert.ok(q.lines.every((l) => l.knownText && l.knownText.startsWith('Block ')))
})

// ── the routes, with the database wired as a landmine ───────────────────────

test('the queue loads without touching the database', async () => {
  const s3 = fakeS3([{ key: 'clone-source/tom-clone/b1-slate/0001756000000000-a.webm' }])
  const { res, out } = fakeRes()
  await handlerFor(packRouter(s3), 'get', '/voice/:voiceId')(
    { params: { voiceId: 'pack-tom-clone' }, query: {} }, res
  )
  assert.equal(out.status, 200)
  assert.equal(out.body.displayName, 'Tom')
  assert.equal(out.body.recorded, 1)
  assert.equal(out.body.autoAdvance, false, 'paragraphs must not auto-advance on a sentence pause')
  assert.equal(out.body.total, TOM_CLONE_PACK.items.length)
})

test('a take is stored as raw bytes and reaches no course table', async () => {
  const s3 = fakeS3()
  const { res, out } = fakeRes()
  await handlerFor(packRouter(s3), 'post', '/voice/:voiceId/take')({
    params: { voiceId: 'pack-tom-clone' },
    headers: {},
    body: { lineId: 'b1-slate', audioData: Buffer.from('fake audio bytes').toString('base64'), mimeType: 'audio/webm' },
  }, res)
  assert.equal(out.status, 200)
  assert.equal(out.body.ok, true)
  assert.equal(s3.uploads.length, 1)
  const up = s3.uploads[0]
  assert.ok(up.key.startsWith('clone-source/tom-clone/b1-slate/'))
  assert.equal(up.metadata.purpose, 'tts-bakeoff-clone-source')
  assert.equal(up.metadata.notCourseAudio, 'true')
  // The bytes are the bytes. No mastering, no trim, no gain.
  assert.equal(up.buffer.toString(), 'fake audio bytes')
})

test('an unknown pack item is a 404, not a stray object in the bucket', async () => {
  const s3 = fakeS3()
  const { res, out } = fakeRes()
  await handlerFor(packRouter(s3), 'post', '/voice/:voiceId/take')({
    params: { voiceId: 'pack-tom-clone' },
    headers: {},
    body: { lineId: 'made-up', audioData: Buffer.from('x').toString('base64'), mimeType: 'audio/webm' },
  }, res)
  assert.equal(out.status, 404)
  assert.equal(s3.uploads.length, 0)
})

test('playback signs the stored object; an unrecorded item says so', async () => {
  const s3 = fakeS3([{ key: 'clone-source/tom-clone/b2-openai-consent/0001756000000000-a.webm' }])
  const router = packRouter(s3)

  const hit = fakeRes()
  await handlerFor(router, 'get', '/voice/:voiceId/line/:lineId/clip')(
    { params: { voiceId: 'pack-tom-clone', lineId: 'b2-openai-consent' }, query: {} }, hit.res
  )
  assert.equal(hit.out.status, 302)
  assert.ok(hit.out.redirected.includes('clone-source/tom-clone/b2-openai-consent/'))

  const miss = fakeRes()
  await handlerFor(router, 'get', '/voice/:voiceId/line/:lineId/clip')(
    { params: { voiceId: 'pack-tom-clone', lineId: 'b4-cloning-sample' }, query: {} }, miss.res
  )
  assert.equal(miss.out.status, 404)
  assert.equal(miss.out.body.reason, 'no_take')
})

test('a real voice id still goes down the real path', async () => {
  // The landmine getDb is what proves it: a policy voice must reach the db.
  const { res, out } = fakeRes()
  await handlerFor(packRouter(fakeS3()), 'get', '/voice/:voiceId')(
    { params: { voiceId: 'human_aran_cym' }, query: {} }, res
  )
  assert.equal(out.status, 500)
  assert.match(out.body.error, /ISOLATION BREACH: a pack route touched the database/)
})
