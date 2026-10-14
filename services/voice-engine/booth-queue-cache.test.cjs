// THE BOOTH'S PER-VOICE QUEUE CACHE (job #378, Aran 2026-10-14: the booth reloaded slowly after
// every tab return). Run with: node services/voice-engine/booth-queue-cache.test.cjs
//
//   - A repeat read inside the fresh window does not rebuild.
//   - Past it, the home screen (allowStale) is answered at once, marked not fresh, and a rebuild
//     starts behind it; a batch read (no allowStale) waits for a fresh build.
//   - A write for the voice, under any spelling it resolved to, drops the entry; so does an
//     invalidation of its language.
'use strict'
const assert = require('assert')
const { createBoothQueueCache } = require('./booth-queue-cache.cjs')

;(async () => {
  let t = 0
  let builds = 0
  const cache = createBoothQueueCache({ freshMs: 1000, staleMs: 10_000, now: () => t })
  const build = async () => { builds += 1; return { n: builds, recordist: { voiceId: 'human_aran_cym_n', spellings: ['aran_cym_n'], language: 'cym' } } }

  let r = await cache.get('human_aran_cym_n', build)
  assert.deepStrictEqual([r.value.n, r.fresh, builds], [1, true, 1])
  t = 500
  r = await cache.get('human_aran_cym_n', build, { allowStale: true })
  assert.deepStrictEqual([r.value.n, r.fresh, builds], [1, true, 1], 'fresh window: no rebuild')

  t = 2000
  r = await cache.get('human_aran_cym_n', build, { allowStale: true })
  assert.deepStrictEqual([r.value.n, r.fresh], [1, false], 'stale is served at once to the home screen')
  await new Promise((ok) => setImmediate(ok))
  assert.strictEqual(builds, 2, 'and a rebuild starts behind it')
  r = await cache.get('human_aran_cym_n', build)
  assert.deepStrictEqual([r.value.n, r.fresh], [2, true])

  t = 4000
  r = await cache.get('human_aran_cym_n', build)
  assert.deepStrictEqual([r.value.n, r.fresh, builds], [3, true, 3], 'a batch read never takes stale')

  cache.invalidateVoice('aran_cym_n') // a take filed under another spelling of the same voice
  r = await cache.get('human_aran_cym_n', build, { allowStale: true })
  assert.deepStrictEqual([r.value.n, r.fresh], [4, true], 'a write drops the entry, even for the home screen')

  cache.invalidateLanguage('eng')
  r = await cache.get('human_aran_cym_n', build)
  assert.strictEqual(r.value.n, 4, 'another language leaves it alone')
  cache.invalidateLanguage('cym')
  r = await cache.get('human_aran_cym_n', build)
  assert.strictEqual(r.value.n, 5, 'its own language drops it')

  // An invalidation landing mid-build: the caller gets its value, but it is not kept.
  let release
  const slow = () => new Promise((ok) => { release = () => ok({ n: 'slow', recordist: { voiceId: 'v', language: 'cym' } }) })
  const pending = cache.get('v', slow)
  await new Promise((ok) => setImmediate(ok))
  cache.invalidateVoice('v')
  release()
  assert.strictEqual((await pending).value.n, 'slow')
  r = await cache.get('v', async () => ({ n: 'after', recordist: { voiceId: 'v', language: 'cym' } }))
  assert.strictEqual(r.value.n, 'after', 'a build overtaken by a write is not cached')

  console.log('booth-queue-cache: all assertions passed')
})().catch((e) => { console.error(e); process.exit(1) })
