/**
 * THE CAST GATE — the last check before the one TTS door pays a provider.
 *
 * A language renders NEW audio only in a voice its language cast lists
 * (voice_language_roles — the casting Tom does in the Voice Lab). Read from that
 * table, never hard-coded here: changing who speaks English is a row, not a
 * commit.
 *
 *   - A language with NO cast rows is not gated. That is language-voice-cast's
 *     leg-3 invariant ("with no cast rows, resolution is the stored config,
 *     unchanged") carried to the render path: courses not yet cast keep working.
 *   - Only RENDERS are gated. An existing clip in ANY voice, cast or not,
 *     answers first — a recast applies to new content only (Tom, 2026-09-26,
 *     r-2026-09-26-a-recast-applies-to-new-content; a voice change never
 *     re-renders existing audio, 2026-09-20), so the old clips stay as they are.
 *   - An audition (door.audition) is exempt: hearing a candidate voice is how a
 *     voice gets cast in the first place.
 *   - A failed read of the cast refuses the render. Not knowing the cast is not
 *     permission.
 */

const { tryCanonicalLanguage, tryCanonicalVoiceId } = require('./clip-identity.cjs')

/** 'cym_n' / 'eng' / 'en-GB' → canonical language; dialect keys reduce to their language. */
function castRowLanguage(raw) {
  return tryCanonicalLanguage(raw) || tryCanonicalLanguage(String(raw || '').split('_')[0])
}

/**
 * Pure. May a NEW render of `language` use `voiceId`?
 * @returns {{ allowed: boolean, cast: string[] }}  cast = the voices the language lists
 */
function castAllowsVoice(language, voiceId, rows) {
  const mine = (rows || []).filter(r => castRowLanguage(r.language) === language)
  // A cast id that cannot be canonicalised is kept as spelt, so a language
  // with rows is ALWAYS gated — never silently opened by an odd spelling.
  const cast = [...new Set(mine.map(r => tryCanonicalVoiceId(r.voice_id) || String(r.voice_id)))]
  if (!mine.length) return { allowed: true, cast }
  return { allowed: cast.includes(voiceId), cast }
}

const TTL_MS = 60_000
let injected = null
let cache = null

/** Tests (and dry runs) inject the rows; null restores the live read. */
function useCastRows(rows) { injected = rows; cache = null }

async function castRows() {
  if (injected) return injected
  // A test never reads live config; an un-injected test sees no cast (ungated).
  if (process.env.VITEST) return []
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows
  const { createClient } = require('@supabase/supabase-js')
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('TTS door: cannot read the language cast (SUPABASE_URL / SUPABASE_SERVICE_KEY not set) — refusing to render')
  }
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const { data, error } = await db.from('voice_language_roles').select('language, voice_id')
  if (error) throw new Error(`TTS door: cannot read the language cast (${error.message}) — refusing to render`)
  cache = { at: Date.now(), rows: data || [] }
  return cache.rows
}

/** Throws (403) when a new render would use a voice the language's cast does not list. */
async function assertCastVoice(language, voiceId, { audition = false } = {}) {
  if (audition) return
  const { allowed, cast } = castAllowsVoice(language, voiceId, await castRows())
  if (!allowed) {
    throw new Error(`Voice not cast for ${language} (403): ${voiceId} may not render new ${language} audio; the cast is ${cast.join(', ')}. Cast it in the Voice Lab, or audition it (door.audition).`)
  }
}

module.exports = { castAllowsVoice, castRowLanguage, assertCastVoice, useCastRows }
