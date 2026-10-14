// Job #416: the team cards' answer is served from memory, shared by concurrent callers, and a
// write drops it and re-warms it in the background.
'use strict'
const test = require('node:test')
const assert = require('node:assert')
const { createSummaryCache } = require('./booth-artists-summary-cache.cjs')

function rig() {
  let t = 0, builds = 0
  const timers = []
  const cache = createSummaryCache({ now: () => t, setTimer: (fn) => { timers.push(fn); return null }, logger: { warn() {} } })
  const build = async () => { builds += 1; await new Promise((r) => setImmediate(r)); return { n: builds } }
  return { cache, build, advance: (ms) => { t += ms }, builds: () => builds, fireTimers: () => timers.splice(0).forEach((f) => f()) }
}

test('a second caller is served from memory; concurrent first callers share one build', async () => {
  const r = rig()
  const [a, b] = await Promise.all([r.cache.get(r.build), r.cache.get(r.build)])
  assert.strictEqual(r.builds(), 1)
  assert.strictEqual(a.value, b.value)
  assert.strictEqual((await r.cache.get(r.build)).fresh, true)
  assert.strictEqual(r.builds(), 1)
})

test('past fresh it is served stale at once and rebuilt behind', async () => {
  const r = rig()
  await r.cache.get(r.build)
  r.advance(120_000)
  const got = await r.cache.get(r.build)
  assert.strictEqual(got.fresh, false)
  assert.strictEqual(got.value.n, 1)
  await new Promise((x) => setImmediate(x)); await new Promise((x) => setImmediate(x))
  assert.strictEqual(r.builds(), 2)
  assert.strictEqual((await r.cache.get(r.build)).value.n, 2)
})

test('a write drops it (never stale numbers after a take) and re-warms once for a burst', async () => {
  const r = rig()
  await r.cache.get(r.build)
  r.cache.invalidate(); r.cache.invalidate(); r.cache.invalidate()
  assert.strictEqual(r.cache.peek(), null)
  r.fireTimers()
  await new Promise((x) => setImmediate(x)); await new Promise((x) => setImmediate(x))
  assert.strictEqual(r.builds(), 2) // one re-warm, not three
  const got = await r.cache.get(r.build)
  assert.strictEqual(got.value.n, 2)
  assert.strictEqual(r.builds(), 2)
})

test('a build that an invalidation overtook is not stored', async () => {
  const r = rig()
  const p = r.cache.get(r.build)
  r.cache.invalidate()
  await p
  assert.strictEqual(r.cache.peek(), null)
})
