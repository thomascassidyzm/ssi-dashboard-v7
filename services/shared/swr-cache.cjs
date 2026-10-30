/**
 * swr-cache.cjs — one stale-while-revalidate slot with single-flight refresh.
 *
 * Built for GET /api/estate-map (job #981): estate_map() re-totals ~2.5M course_audio rows and
 * hit the DB's 8 s statement limit. Serve the last good value at once; once it is older than
 * ttlMs, refresh in the background (never two loads at once); if a refresh throws or times out,
 * keep serving the last good value and record the error. Only the very first load (nothing
 * cached yet) is awaited by a caller, and its failure propagates.
 */
'use strict'

function createSwrCache({ load, ttlMs, now = () => Date.now(), onError = () => {} }) {
  let value, cachedAt = null, inflight = null, lastError = null

  function refresh() {
    if (!inflight) {
      inflight = Promise.resolve().then(load).then(
        v => { value = v; cachedAt = now(); lastError = null },
        err => { lastError = err; onError(err); if (cachedAt === null) throw err },
      ).finally(() => { inflight = null })
    }
    return inflight
  }

  /** → { value, cachedAt (ms), ageMs, stale (served past ttl, refresh running), lastError } */
  async function get({ fresh = false } = {}) {
    if (cachedAt === null || fresh) {
      await refresh()
      // joined a refresh that failed while serving stale: a forced read tries once more
      if (fresh && lastError && cachedAt !== null) await refresh()
    }
    else if (now() - cachedAt >= ttlMs) refresh().catch(() => {})
    return { value, cachedAt, ageMs: now() - cachedAt, stale: now() - cachedAt >= ttlMs, lastError }
  }

  return { get, refresh, peek: () => ({ cachedAt, hasValue: cachedAt !== null, inflight: !!inflight }) }
}

module.exports = { createSwrCache }
