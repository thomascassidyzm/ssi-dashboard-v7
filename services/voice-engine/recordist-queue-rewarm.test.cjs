/**
 * Job #337 (Aran's slow booth): a take invalidates the language read, and the
 * next page load used to pay the whole cold read. With re-warm on, the read is
 * started again once the takes stop, so the next load joins a finished (or
 * running) read instead of starting one.
 */
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const cache = require('./recordist-queue-cache.cjs')

test('after a take invalidates the read, it is re-read in the background once, not per take', async () => {
  cache.enableRewarmAfterInvalidate()
  const db = {}
  let reads = 0
  const read = async () => { reads += 1; return { n: reads } }

  await cache.cachedLanguageLines(db, 'cym', undefined, read)
  assert.strictEqual(reads, 1)

  // A burst of three takes: three invalidations, ONE background re-read.
  cache.invalidateLanguageQueueCache('cym')
  cache.invalidateLanguageQueueCache('cym')
  cache.invalidateLanguageQueueCache('cym')
  await new Promise((r) => setTimeout(r, 2_400))
  assert.strictEqual(reads, 2, 'one re-warm read for the burst')

  // The reader's next load is a hit on that re-warmed read: no third read.
  const got = await cache.cachedLanguageLines(db, 'cym', undefined, read)
  assert.strictEqual(reads, 2)
  assert.strictEqual(got.n, 2)
  cache.stopAllWarming()
})
