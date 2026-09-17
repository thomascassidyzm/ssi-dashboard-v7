/**
 * recordist-queue-cache.cjs — the recordist queue's language-lines cache,
 * split out on its own so a writer module (pods-registration.cjs, which
 * recordist-queue.cjs itself requires for canonicalSpeakerName) can invalidate
 * it without a require cycle back through recordist-queue.cjs.
 *
 * See the header comment at its use in recordist-queue.cjs for why this cache
 * exists and what guarantee it keeps: no in-process write is ever served
 * stale, and a write from another process is caught within the TTL.
 */

'use strict'

// KEYED BY THE `db` CLIENT INSTANCE, not just language. Production holds one
// Supabase client per process (recordist-router.cjs's `db()` memoizes it), so
// this collapses to "one cache for the process" there — but a stub db built
// fresh per test case (as every test in this file's suite does) gets its own
// cache automatically, with no cross-test pollution and no test-only reset
// hook required. A WeakMap also means a discarded db client's cache entries
// are collected with it rather than held forever.
const BY_DB = new WeakMap() // db -> Map<`${language}::${quarryMaxSeed}`, { promise, expiresAt }>
const LANGUAGE_LINES_TTL_MS = 60_000

// ── THE COLD READ IS THE 502 ───────────────────────────────────────────────
//
// The TTL above made a BURST of requests share one read. It never made a
// RECORDIST'S ARRIVAL warm, and the arrival is the whole failure: nobody asks
// for this language's queue once a minute, so by the time Aran opens the booth
// the entry has been expired for hours and he pays the full 2-10s cold read —
// the exact 502 this cache was added to close (Aran, cym_n_for_eng, the health
// pod, 2026-09-17 13:26 UTC; measured 10.8s on the first call of the day
// against a 0.95s warm one, through a Vercel edge rewrite that adds its own
// 1.4-18.8s on top and gives up with a 502 rather than a slow answer).
//
// So the entry is REFRESHED just before it expires, for as long as somebody is
// actually using that language, and not one moment longer. Bounded three ways,
// because a timer that reads a whole language forever is a worse bug than the
// one it closes:
//
//   1. Only a language a REAL request asked for is kept warm — a refresh is
//      not itself a request, so the warmer can never keep itself alive.
//   2. It stops on its own KEEP_WARM_IDLE_MS after the last real request.
//   3. It is unref'd, so it never holds the process open.
//
// Freshness is unchanged or better: the refresh replaces the entry with a
// newer read than the one it displaces, and explicit invalidation still wins
// outright — an invalidated key is deleted, and the next refresh re-reads it.
const KEEP_WARM_LEAD_MS = 10_000          // refresh this long before expiry
const KEEP_WARM_IDLE_MS = 20 * 60_000     // stop after this long with no real request

// The last db a language was invalidated or read against, so a bare
// `invalidateLanguageQueueCache(language)` call — from a writer that only
// knows the language, not which db client is live — reaches the right cache
// without every writer having to thread `db` through as well.
const LAST_DB_FOR_LANGUAGE = new Map() // language -> db

// Warm-keeping state, per (db-keyed cache) key: the thunk that re-reads it, the
// timer doing so, and when a REAL request last wanted it.
const WARM = new Map() // `${language}::${quarryMaxSeed}` -> { db, timer, read, lastAskedAt }

function stopWarming(key) {
  const w = WARM.get(key)
  if (!w) return
  clearTimeout(w.timer)
  WARM.delete(key)
}

/** Stop every warmer. Tests and shutdown; never a request path. */
function stopAllWarming() {
  for (const key of [...WARM.keys()]) stopWarming(key)
}

function scheduleWarm(key) {
  const w = WARM.get(key)
  if (!w) return
  clearTimeout(w.timer)
  w.timer = setTimeout(() => {
    const live = WARM.get(key)
    if (!live) return
    if (Date.now() - live.lastAskedAt > KEEP_WARM_IDLE_MS) { stopWarming(key); return }
    const forDb = BY_DB.get(live.db)
    if (!forDb) { stopWarming(key); return }
    // A REFRESH IS NOT A REQUEST: it writes the entry directly rather than
    // going through cachedLanguageLines, so it can never renew lastAskedAt.
    let promise
    try { promise = live.read() } catch { stopWarming(key); return }
    forDb.set(key, { promise, expiresAt: Date.now() + LANGUAGE_LINES_TTL_MS })
    // A refresh that FAILS leaves nothing behind pretending to be fresh: the
    // entry is dropped and the next real request pays an honest cold read.
    promise.catch(() => { if (forDb.get(key)?.promise === promise) forDb.delete(key) })
    scheduleWarm(key)
  }, Math.max(1000, LANGUAGE_LINES_TTL_MS - KEEP_WARM_LEAD_MS))
  if (typeof w.timer.unref === 'function') w.timer.unref()
}

function languageLinesCacheKey(language, quarryMaxSeed) {
  return `${language}::${quarryMaxSeed == null ? 'default' : quarryMaxSeed}`
}

/**
 * Drop the cached read for one language (or, with no argument, every
 * language) on the db client it was last read against. Call this from any
 * write path that can change what a language's queue looks like.
 */
function invalidateLanguageQueueCache(language) {
  if (!language) {
    for (const db of LAST_DB_FOR_LANGUAGE.values()) BY_DB.delete(db)
    LAST_DB_FOR_LANGUAGE.clear()
    return
  }
  const db = LAST_DB_FOR_LANGUAGE.get(language)
  if (!db) return
  const forDb = BY_DB.get(db)
  if (!forDb) return
  for (const key of forDb.keys()) {
    if (key.startsWith(`${language}::`)) forDb.delete(key)
  }
}

/**
 * `read()` (a thunk producing `buildLanguageLines`'s own promise), cached per
 * (db, language, quarryMaxSeed). The PROMISE is what is stored: two requests
 * landing in the same window join one read rather than racing two, and a read
 * that throws is evicted immediately rather than cached as a failure.
 */
function cachedLanguageLines(db, language, quarryMaxSeed, read) {
  LAST_DB_FOR_LANGUAGE.set(language, db)
  let forDb = BY_DB.get(db)
  if (!forDb) { forDb = new Map(); BY_DB.set(db, forDb) }
  const key = languageLinesCacheKey(language, quarryMaxSeed)
  const now = Date.now()
  // A REAL request: this, and only this, keeps the language warm.
  const warm = WARM.get(key)
  if (warm) { warm.db = db; warm.read = read; warm.lastAskedAt = now }
  else { WARM.set(key, { db, read, lastAskedAt: now, timer: null }); scheduleWarm(key) }
  const hit = forDb.get(key)
  if (hit && hit.expiresAt > now) return hit.promise
  const promise = read()
  forDb.set(key, { promise, expiresAt: now + LANGUAGE_LINES_TTL_MS })
  promise.catch(() => { if (forDb.get(key)?.promise === promise) forDb.delete(key) })
  return promise
}

module.exports = { invalidateLanguageQueueCache, cachedLanguageLines, stopAllWarming, LANGUAGE_LINES_TTL_MS, KEEP_WARM_LEAD_MS, KEEP_WARM_IDLE_MS }
