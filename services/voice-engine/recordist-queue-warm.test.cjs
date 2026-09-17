/**
 * recordist-queue-warm.test.cjs — a recordist's ARRIVAL must not pay the cold
 * read.
 *
 * The 60s TTL in recordist-queue-cache.cjs only ever helped a burst. Nobody
 * asks for a language's queue once a minute, so every real arrival found the
 * entry expired and paid the full 2-10s `buildLanguageLines` read — which is
 * what 502'd Aran out of the Welsh health pod on 2026-09-17. These tests pin
 * the warmer that closes it, and its three bounds.
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const {
  cachedLanguageLines,
  stopAllWarming,
  invalidateLanguageQueueCache,
  LANGUAGE_LINES_TTL_MS,
  KEEP_WARM_LEAD_MS,
  KEEP_WARM_IDLE_MS,
} = require('./recordist-queue-cache.cjs')

/** A counted read thunk standing in for buildLanguageLines. */
function counter() {
  const state = { calls: 0 }
  return [state, () => { state.calls += 1; return Promise.resolve({ n: state.calls }) }]
}

test('the entry is refreshed before it expires, so an arrival after the TTL is warm', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  t.after(() => stopAllWarming())
  const db = {}
  const [state, read] = counter()

  cachedLanguageLines(db, 'cym', null, read)        // the first, honest cold read
  assert.strictEqual(state.calls, 1)

  // Just past the refresh point, still inside the TTL.
  t.mock.timers.tick(LANGUAGE_LINES_TTL_MS - KEEP_WARM_LEAD_MS + 1)
  assert.strictEqual(state.calls, 2, 'the warmer re-read it before it went cold')

  // Aran arrives well after the ORIGINAL entry would have expired. Pre-warmer
  // this was a cold read; now it is served from the refreshed entry.
  t.mock.timers.tick(KEEP_WARM_LEAD_MS + 1)
  cachedLanguageLines(db, 'cym', null, read)
  assert.strictEqual(state.calls, 2, 'his arrival paid no read at all')
})

test('a refresh is not a request, so the warmer stops on its own when nobody is asking', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  t.after(() => stopAllWarming())
  const db = {}
  const [state, read] = counter()

  cachedLanguageLines(db, 'cym', null, read)
  // Run well past the idle window with no further real request.
  t.mock.timers.tick(KEEP_WARM_IDLE_MS + LANGUAGE_LINES_TTL_MS * 2)
  const settled = state.calls
  t.mock.timers.tick(LANGUAGE_LINES_TTL_MS * 5)
  assert.strictEqual(state.calls, settled, 'the warmer gave up rather than reading forever')
  assert.ok(settled < 25, `it refreshed ${settled} times inside the idle window, not endlessly`)
})

test('an explicit invalidation still wins: the next read is fresh, not the warmed entry', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  t.after(() => stopAllWarming())
  const db = {}
  const [state, read] = counter()

  cachedLanguageLines(db, 'cym', null, read)
  t.mock.timers.tick(LANGUAGE_LINES_TTL_MS - KEEP_WARM_LEAD_MS + 1)   // warmed
  const before = state.calls
  invalidateLanguageQueueCache('cym')
  cachedLanguageLines(db, 'cym', null, read)
  assert.strictEqual(state.calls, before + 1, 'a write is never served stale by the warmer')
})
