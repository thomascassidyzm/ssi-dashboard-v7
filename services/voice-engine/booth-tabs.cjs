/**
 * booth-tabs.cjs — ONE booth page for a person with several voices (Aran, 2026-10-14, job #392).
 *
 * Aran: "one suboptimal thing is having to go to different pages for Welsh and English recording.
 * I would rather have them on a single page, where I can switch tabs to change languages." He reads
 * Welsh North as human_aran_cym_n and the English known side as human_aran_eng; Catrin and others
 * can hold several voices the same way.
 *
 * WHO IS THE PERSON BEHIND A VOICE. The estate has exactly one person key, and it is the EMAIL:
 * a language_recording_policy slot's `email`, a course cast's podCast entry `email`, and the
 * dashboard_users row whose voice_id is this voice. Those are the three places voicesForEmail
 * (the /my-recording sign-in) already reads, so a voice's siblings are simply voicesForEmail of
 * every email that names it — the login door and the tabs cannot disagree about who someone is.
 * A voice that no email names is a person of one voice: no tabs, and nothing is guessed from a
 * display name (two artists may share one).
 *
 * WHICH SIBLINGS THE CALLER MAY SEE (job #380's private links). A sibling becomes a tab only if
 * the caller could open it on its own: they present that voice's own key, or they are signed in as
 * a God admin or as the artist who owns it. Holding one voice's key never reveals another voice,
 * and grace mode is NOT a right — a grace pass lets an old id-only link keep working, it does not
 * add tabs. A sibling the caller has no right to is left out entirely, never listed as locked.
 */

'use strict'

const { voicesForEmail, resolveRecordist, loadPolicies } = require('./recordist-queue.cjs')
const { keyMatches, boothKeyId } = require('./booth-link-keys.cjs')

const normEmail = (e) => String(e || '').trim().toLowerCase()

/** Every email that names this voice as its own: policy slot, course cast, users-page row. */
async function personEmailsForVoice(db, voiceId) {
  const emails = new Set()
  const add = (e) => { const n = normEmail(e); if (n) emails.add(n) }
  for (const policy of await loadPolicies(db)) {
    for (const entry of Object.values(policy.voices || {})) {
      if (entry && entry.voiceId === voiceId) add(entry.email)
    }
  }
  const { data: courses, error: cErr } = await db.from('courses').select('course_code, voice_config')
  if (cErr) throw new Error(`course list failed: ${cErr.message}`)
  for (const c of courses || []) {
    for (const entry of Object.values((c.voice_config && c.voice_config.podCast) || {})) {
      if (entry && typeof entry === 'object' && entry.voiceId === voiceId) add(entry.email)
    }
  }
  const { data: users, error: uErr } = await db.from('dashboard_users').select('email, voice_id').eq('voice_id', voiceId)
  if (uErr) throw new Error(`dashboard_users read failed: ${uErr.message}`)
  for (const u of users || []) add(u.email)
  return [...emails]
}

/**
 * `x-booth-keys: <voiceId>:<key>,<voiceId>:<key>` — the other voices' keys this device holds.
 * A header, never the query string, so no key reaches an access log.
 */
function parseHeldKeys(header) {
  const out = new Map()
  for (const part of String(header || '').split(',')) {
    const i = part.indexOf(':')
    if (i <= 0) continue
    const voiceId = boothKeyId(decodeURIComponent(part.slice(0, i).trim()))
    const key = part.slice(i + 1).trim()
    if (voiceId && key) out.set(voiceId, key)
  }
  return out
}

/** Target-language voices before known-side readers (a castOn-only reader), then by language. */
function tabOrder(a, b) {
  const known = (v) => (/(^|:)known$/.test(String(v.slot || '')) ? 1 : 0)
  return known(a) - known(b) || String(a.languageName || '').localeCompare(String(b.languageName || '')) ||
    String(a.voiceId).localeCompare(String(b.voiceId))
}

/**
 * The tabs this caller sees on the booth of `voiceId`.
 *
 * @param {object} a
 * @param {object} a.db
 * @param {string} a.voiceId           the voice the page is open on (always a tab: the key gate already admitted it)
 * @param {object|null} a.user         the signed-in caller, or null
 * @param {Map<string,string>} a.heldKeys  voiceId → key this device presents for other voices
 * @param {{row: Function, keyFor: Function}} a.store  the booth key store
 * @param {Function} a.isGodAdmin
 * @returns {Promise<null | {tabs: object[]}>} null for a voice that does not resolve
 */
async function boothTabs({ db, voiceId, user = null, heldKeys = new Map(), store, isGodAdmin }) {
  const current = await resolveRecordist(db, voiceId)
  if (!current) return null

  const siblings = new Map()
  for (const email of await personEmailsForVoice(db, current.voiceId)) {
    for (const v of await voicesForEmail(db, email)) {
      if (v.voiceId !== current.voiceId && !siblings.has(v.voiceId)) siblings.set(v.voiceId, v)
    }
  }

  const god = !!(user && isGodAdmin && isGodAdmin(user))
  const own = new Set(user && user.email ? (await voicesForEmail(db, user.email)).map((v) => v.voiceId) : [])
  const tabs = [{ ...current, boothKey: own.has(current.voiceId) ? await store.keyFor(current.voiceId).catch(() => null) : null }]
  for (const v of siblings.values()) {
    const held = heldKeys.get(v.voiceId)
    const row = held ? await store.row(v.voiceId).catch(() => null) : null
    const byKey = !!(held && row && keyMatches(held, row.key_hash))
    if (!byKey && !god && !own.has(v.voiceId)) continue
    // The artist signed in to their own voice gets its key back, as /mine gives it, so the tab
    // keeps working on this device after they sign out. A God admin opens it by sign-in alone.
    tabs.push({ ...v, boothKey: own.has(v.voiceId) ? await store.keyFor(v.voiceId).catch(() => null) : null })
  }
  tabs.sort(tabOrder)
  return {
    tabs: tabs.map((v) => ({
      voiceId: v.voiceId,
      displayName: v.displayName,
      language: v.language,
      languageName: v.languageName,
      dialect: v.dialect || null,
      boothKey: v.boothKey || null,
    })),
  }
}

module.exports = { boothTabs, personEmailsForVoice, parseHeldKeys }
