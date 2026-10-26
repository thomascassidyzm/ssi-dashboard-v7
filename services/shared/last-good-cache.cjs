/**
 * last-good-cache.cjs — ride out a short database read blip with the last value that read fine.
 *
 * Aran, 2026-10-23 (job #917): twice (2026-10-22 ~12:23Z, 2026-10-23 13:11-13:17Z) the staging
 * booth refused or half-filed takes because Supabase reads failed for a minute or two
 * ("TypeError: fetch failed", "Could not query the database for the schema cache"): the policy
 * read 500'd the take, and the course row re-read came back empty so the take was saved but filed
 * as 'no_course'. Those reads had all succeeded seconds earlier with the same answer.
 *
 * THE RULE: every read goes to the database as before (ttlMs 0 by default, so nothing a human edits
 * goes stale in normal running). Only when the read FAILS (throws) is the last successful answer
 * used, and only if it is younger than graceMs. A read that succeeds always replaces the cached
 * value — including with null/"not found" — so a revoked key, a retired voice or a deleted row is
 * refused the moment a fresh read gets through. Nothing here can grant what a fresh read would not
 * have granted within the last graceMs.
 */

'use strict'

const DEFAULT_GRACE_MS = 10 * 60 * 1000

function createLastGoodCache({ ttlMs = 0, graceMs = DEFAULT_GRACE_MS, now = () => Date.now(), logger = console, label = 'LastGood', maxEntries = 5000 } = {}) {
  const entries = new Map() // key → { at, value }

  /** `load()` resolves the fresh value or throws; a supabase {data, error} should be unwrapped by the caller. */
  async function read(key, load) {
    const hit = entries.get(key)
    if (hit && ttlMs > 0 && now() - hit.at < ttlMs) return hit.value
    try {
      const value = await load()
      remember(key, value)
      return value
    } catch (err) {
      if (hit && now() - hit.at < graceMs) {
        logger.warn(`[${label}] read failed for ${key} (${err && err.message}); using the value read ${Math.round((now() - hit.at) / 1000)}s ago`)
        return hit.value
      }
      throw err
    }
  }

  /** Put a value read elsewhere (e.g. a write that just landed) so it is the last good one. */
  function set(key, value) { remember(key, value) }

  // Bounded: a link with a made-up id is a key too. Oldest first out (Map keeps insertion order).
  function remember(key, value) {
    entries.delete(key)
    entries.set(key, { at: now(), value })
    if (entries.size > maxEntries) entries.delete(entries.keys().next().value)
  }

  return { read, set, entries }
}

/** Unwrap a supabase {data, error}: throw on error so the cache treats it as a failed read. */
async function rowOrThrow(query, what) {
  const { data, error } = await query
  if (error) throw new Error(`${what} failed: ${error.message}`)
  return data == null ? null : data
}

module.exports = { DEFAULT_GRACE_MS, createLastGoodCache, rowOrThrow }
