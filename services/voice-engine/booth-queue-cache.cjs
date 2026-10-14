/**
 * booth-queue-cache.cjs — ONE VOICE'S BUILT QUEUE, held briefly, so the booth's home screen and
 * the batch a card opens do not rebuild the whole queue on every arrival.
 *
 * Aran, 2026-10-14 (job #378): "still takes a LONG time to load even if I just go to another tab
 * and then come back." A phone that comes back to a tab often RELOADS it (the app reloads itself
 * when a new build has landed, and a phone discards background tabs), and every reload rebuilt his
 * whole queue server-side — resolve, recorded keys, 2060 lines, the phrase plan — about a second
 * warm and 4-5 s cold, before the public hop added its own one to eight.
 *
 * WHAT IS CACHED: buildQueue's own result for (voice, includeRecorded=true, default ceiling),
 * plus the resolved recordist. Nothing here decides which lines are in a queue, their order or
 * whether a line is recorded — it only remembers the answer buildQueue gave.
 *
 * FRESHNESS, three rules:
 *   1. FRESH_MS: younger than this, the entry is served as it is.
 *   2. Up to STALE_MS, a caller that says `allowStale` (the home screen's counts) is served the
 *      old entry at once, marked `fresh: false`, and a rebuild starts behind it; a caller that
 *      does not (the batch a reader is about to record from) waits for a fresh one.
 *   3. ANY write this process makes for the voice — a take, a text edit, a re-record reset —
 *      drops the entry outright (`invalidateVoice`), and so does any invalidation of the voice's
 *      language queue (`invalidateLanguage`, wired to recordist-queue-cache), so a reader never
 *      comes home from recording to counts that do not include what they just read.
 * A take made through ANOTHER process (production and staging share one database) is caught by
 * rule 1's age limit, and on the home screen by the client asking again when told `fresh: false`.
 *
 * Pure apart from the clock, which is injectable for the test.
 */
'use strict'

const FRESH_MS = 60_000
const STALE_MS = 15 * 60_000
const MAX_ENTRIES = 64

function createBoothQueueCache({ freshMs = FRESH_MS, staleMs = STALE_MS, maxEntries = MAX_ENTRIES, now = () => Date.now() } = {}) {
  const entries = new Map() // key -> { promise, value, at, language, voiceIds, generation }
  let generation = 0

  function start(key, build) {
    const gen = ++generation
    const entry = { promise: null, value: null, at: 0, language: null, voiceIds: [key], generation: gen, building: true }
    const prev = entries.get(key)
    // Keep serving the previous value (if any) to allowStale callers while this one builds.
    if (prev && prev.value) { entry.value = prev.value; entry.at = prev.at; entry.language = prev.language; entry.voiceIds = prev.voiceIds }
    entry.promise = Promise.resolve().then(build).then((value) => {
      // An invalidation that landed mid-build replaced or removed this entry: the value is
      // handed to its own caller, never stored.
      if (entries.get(key) === entry) {
        entry.value = value
        entry.at = now()
        entry.building = false
        entry.language = (value && value.recordist && value.recordist.language) || null
        entry.voiceIds = [key, ...((value && value.recordist && value.recordist.spellings) || []), value && value.recordist && value.recordist.voiceId].filter(Boolean)
      }
      return value
    }, (err) => {
      if (entries.get(key) === entry) {
        if (entry.value) entry.building = false // a failed refresh keeps the last good value
        else entries.delete(key)
      }
      throw err
    })
    entries.delete(key) // re-insert = most recently used last
    entries.set(key, entry)
    while (entries.size > maxEntries) entries.delete(entries.keys().next().value)
    return entry
  }

  /**
   * @returns {Promise<{value, fresh: boolean, ageMs: number}>}
   */
  async function get(key, build, { allowStale = false } = {}) {
    const hit = entries.get(key)
    const t = now()
    if (hit && hit.value && !hit.building && t - hit.at < freshMs) return { value: hit.value, fresh: true, ageMs: t - hit.at }
    if (hit && hit.value && allowStale && t - hit.at < staleMs) {
      if (!hit.building) start(key, build).promise.catch(() => {})
      return { value: hit.value, fresh: false, ageMs: t - hit.at }
    }
    const entry = hit && hit.building ? hit : start(key, build)
    const value = await entry.promise
    return { value, fresh: true, ageMs: 0 }
  }

  /** Drop every entry for this voice id (any spelling it was asked or resolved under). */
  function invalidateVoice(voiceId) {
    for (const [key, e] of [...entries]) if (key === voiceId || e.voiceIds.includes(voiceId)) entries.delete(key)
  }

  /** Drop every entry of a language, or everything when no language is named. */
  function invalidateLanguage(language) {
    for (const [key, e] of [...entries]) if (!language || !e.language || e.language === language) entries.delete(key)
  }

  return { get, invalidateVoice, invalidateLanguage, size: () => entries.size }
}

module.exports = { createBoothQueueCache, FRESH_MS, STALE_MS }
