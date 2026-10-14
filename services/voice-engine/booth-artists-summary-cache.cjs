/**
 * booth-artists-summary-cache.cjs — THE TEAM CARDS' ANSWER (GET /api/recording/admin/artists),
 * held so a card load is not a ~15s rebuild of every reader's queue (Aran, 2026-10-14, job #416).
 *
 * Same shape as booth-queue-cache.cjs (job #378):
 *   - younger than FRESH_MS: served as it is;
 *   - up to STALE_MS: served at once, marked stale, with ONE rebuild started behind it;
 *   - concurrent callers during a build share that build (no pile-up of 15s reads);
 *   - `invalidate()` — called on any write this process makes for a voice (a take upload, a
 *     solo-readers change, a text edit, a language queue invalidation) — drops the entry and
 *     re-builds in the background after REWARM_DELAY_MS (one rebuild for a burst of takes), so the
 *     next card load finds the new numbers already there rather than waiting for them.
 * A take made through ANOTHER process (production and staging share one database) is caught by
 * FRESH_MS. Pure apart from the clock and timers, which are injectable for the test.
 */
'use strict'

const FRESH_MS = 60_000
const STALE_MS = 10 * 60_000
const REWARM_DELAY_MS = 4_000

function createSummaryCache({ freshMs = FRESH_MS, staleMs = STALE_MS, rewarmMs = REWARM_DELAY_MS, now = () => Date.now(), setTimer = setTimeout, logger = console } = {}) {
  let entry = null // { value, at }
  let building = null // { promise, generation }
  let generation = 0
  let build = null // the last builder seen, for the background re-warm
  let timer = null

  function start(fn) {
    const gen = generation
    const b = { generation: gen, promise: null }
    b.promise = Promise.resolve().then(fn).then((value) => {
      // An invalidation that landed mid-build: the value goes to its own callers, never stored.
      if (gen === generation) entry = { value, at: now() }
      return value
    }).finally(() => { if (building === b) building = null })
    building = b
    return b.promise
  }

  /** @returns {Promise<{value, fresh: boolean, ageMs: number}>} */
  async function get(fn, { fresh = false } = {}) {
    build = fn
    const t = now()
    if (!fresh && entry && t - entry.at < freshMs) return { value: entry.value, fresh: true, ageMs: t - entry.at }
    if (!fresh && entry && t - entry.at < staleMs) {
      if (!building) start(fn).catch((err) => logger.warn(`[BoothArtists] background refresh: ${err.message}`))
      return { value: entry.value, fresh: false, ageMs: t - entry.at }
    }
    const value = await (building ? building.promise : start(fn))
    return { value, fresh: true, ageMs: 0 }
  }

  function invalidate() {
    if (!entry && !building) return
    entry = null
    generation += 1
    building = null
    if (timer || !build) return
    timer = setTimer(() => {
      timer = null
      if (!entry && !building && build) start(build).catch((err) => logger.warn(`[BoothArtists] re-warm: ${err.message}`))
    }, rewarmMs)
    if (timer && timer.unref) timer.unref()
  }

  return { get, invalidate, peek: () => entry }
}

/** One per process: the recordist router invalidates it, the artists router reads it. */
const shared = createSummaryCache()
const invalidateArtistSummaries = () => shared.invalidate()

module.exports = { createSummaryCache, shared, invalidateArtistSummaries, FRESH_MS, STALE_MS }
