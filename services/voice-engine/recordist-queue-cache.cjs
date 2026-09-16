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

// The last db a language was invalidated or read against, so a bare
// `invalidateLanguageQueueCache(language)` call — from a writer that only
// knows the language, not which db client is live — reaches the right cache
// without every writer having to thread `db` through as well.
const LAST_DB_FOR_LANGUAGE = new Map() // language -> db

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
  const hit = forDb.get(key)
  if (hit && hit.expiresAt > now) return hit.promise
  const promise = read()
  forDb.set(key, { promise, expiresAt: now + LANGUAGE_LINES_TTL_MS })
  promise.catch(() => { if (forDb.get(key)?.promise === promise) forDb.delete(key) })
  return promise
}

module.exports = { invalidateLanguageQueueCache, cachedLanguageLines, LANGUAGE_LINES_TTL_MS }
