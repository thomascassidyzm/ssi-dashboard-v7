/**
 * Audio FALLBACK RESOLVER — what the player should play for one content slot.
 *
 * Doctrine (Tom, 2026-08-05):
 *   "it's probably better to have a system that plays Azure until better voices
 *    are available in lieu of nothing!!!!"
 *   "we don't want the player to screw up a course just because some audio is
 *    missing — it should ALWAYS PLAY WHAT IT HAS"
 *
 * So: a missing or dead link NEVER ends a round. It resolves to the best clip
 * that actually exists — even an old Azure voice, even a voice that is not the
 * course's currently-configured one — and only when nothing at all exists does
 * the caller SKIP THAT ONE ITEM. Never truncate, never fail the round.
 *
 * THE CHAIN (in order, first hit wins):
 *   1. 'linked'          — the currently-linked clip, if alive (has a real s3_key)
 *   2. 'preferred-match' — best course_audio row on the EXACT canonical key
 *                          (normalizeForAudio text | language | role), chosen by
 *                          pickPreferredAudioRow so human recordings win and the
 *                          answer is deterministic
 *   3. 'loose-match'     — best row on the LOOSE key (see below), the documented
 *                          escape hatch for the normaliser disagreement
 *   4. 'none'            — nothing exists; caller skips this item only
 *
 * WHY A LOOSE TIER — the normaliser disagreement (real, 154,257 rows affected):
 *   The DB trigger writes course_audio.text_normalized with
 *     normalize_text(t) = rtrim(lower(trim(t)), '.?!¿¡。？！')
 *   which STRIPS a trailing '?' and does NOT collapse internal whitespace.
 *   The JS canonical normaliser (text-normalize.cjs::normalizeForAudio)
 *     lower + trim + collapse internal whitespace + strip trailing [.!。！]
 *   deliberately KEEPS a trailing '?' (question intonation is significant).
 *   They disagree, so content text "are you sure?" can never exact-match a row
 *   whose stored text_normalized is "are you sure".
 *
 *   looseKey() is the both-normalisers-agree form: lower, collapse whitespace,
 *   strip ALL trailing whitespace/terminal punctuation. It is provably
 *   convergent — looseKey(x) === looseKey(dbNormalize(x)) === looseKey(jsNormalize(x))
 *   — so it can be applied to either side of the comparison and still agree.
 *
 *   The cost of the loose tier is honest and deliberate: a question prompt may
 *   get statement-intonation audio. That is why it is tier 3, BELOW the exact
 *   key — it is the last thing before silence, not a matching strategy. The
 *   phase8 LINK pass deliberately refuses this fallback (linking a question to
 *   flat audio would suppress regeneration forever); callers that want the same
 *   strictness pass { allowLooseMatch: false } — EXCEPT for LEGO slots, see next.
 *
 * SEVERITY IS PER-ROLE (Tom, 2026-08-06). A LEGO is complete only with all three
 * of INTRO + target VOICE 1 + target VOICE 2 (the prompt clip is NOT in the
 * triple). Missing any one drops the LEGO, drops its round, and breaks every
 * later LEGO contingent on it — course-breaking. A cycle/practice-phrase gap is
 * minor: that item is skipped and the round plays on. So pass `slotKind` and the
 * resolver will FIGHT HARDEST for LEGOs: the loose tier is forced on for them and
 * `allowLooseMatch: false` is ignored, because there the alternative to an
 * off-config Azure clip is a dropped round, not a slightly-wrong intonation.
 * Every result carries `severity` when it resolves to nothing, so callers can
 * order repair LEGOs-first. The rule itself lives in audio-completeness.cjs.
 *
 * PURE — no I/O, no DB, no network. Candidate rows are passed in, mirroring
 * audio-link-preference.cjs. Never throws on missing data: a hopeless slot
 * returns tier 'none' with a reason.
 */

const { normalizeForAudio } = require('./text-normalize.cjs')
const { tryCanonicalLanguage } = require('./clip-identity.cjs')
const { pickPreferredAudioRow } = require('./audio-link-preference.cjs')
const { slotSeverity, shouldFightHardest, SEVERITY } = require('./audio-completeness.cjs')

// Terminal punctuation the two normalisers disagree about, plus whitespace.
// Matches the DB rtrim set: . ? ! ¿ ¡ 。 ？ ！
const LOOSE_TRAILING = /[\s.?!¿¡。！？]+$/

/**
 * The both-normalisers-agree key. Convergent: applying it to raw text, to a
 * DB-normalised value, or to a JS-normalised value yields the same string.
 */
function looseKey(text) {
  if (!text) return ''
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim().replace(LOOSE_TRAILING, '')
}

/**
 * A clip is ALIVE if it has a real object in S3. `pending/…` keys are
 * placeholders written before generation (phase8 filters them the same way),
 * so they are not playable and must not win the 'linked' tier.
 */
function isAlive(row) {
  if (!row) return false
  const key = row.s3_key
  if (typeof key !== 'string') return false
  const k = key.trim()
  if (!k) return false
  if (k.startsWith('pending/')) return false
  return true
}

/**
 * The exact canonical key for a candidate row.
 * Prefers the row's RAW text through the JS canonical normaliser (what phase8
 * links on). Falls back to the stored text_normalized when raw text is absent —
 * which is exactly the ?-stripped value, hence the loose tier below.
 */
function candidateExactText(row) {
  if (row && row.text != null && String(row.text).trim() !== '') return normalizeForAudio(row.text)
  if (row && row.text_normalized != null) return normalizeForAudio(row.text_normalized)
  return ''
}

function candidateLooseText(row) {
  if (!row) return ''
  if (row.text != null && String(row.text).trim() !== '') return looseKey(row.text)
  if (row.text_normalized != null) return looseKey(row.text_normalized)
  return ''
}

/**
 * Compare two language values as IDENTITIES, not as strings.
 *
 * A strict `row.language !== language` made this resolver refuse the very rows
 * it exists to rescue: a row stored 'en-GB' or 'en' is the same English clip as
 * a slot asking for 'eng', and dropping it means the player gets silence while
 * a perfectly good take sits in the table — the exact opposite of "always play
 * what it has".
 *
 * Uncanonicalisable values (the 'auto' rows) fall back to raw string equality.
 * That is not a silent guess: two values that canonicalise to nothing are only
 * treated as the same slot when they are literally the same string, which is
 * strictly the old behaviour and never matches two DIFFERENT languages.
 */
function sameLanguage(rowLanguage, language) {
  if (rowLanguage === language) return true
  const a = tryCanonicalLanguage(rowLanguage)
  const b = tryCanonicalLanguage(language)
  return a != null && b != null && a === b
}

function sameSlot(row, language, role, courseCode) {
  if (!row) return false
  if (language != null && row.language != null && !sameLanguage(row.language, language)) return false
  if (role != null && row.role != null && row.role !== role) return false
  // course_code is normally pre-filtered by the caller's query; enforce it only
  // when both sides actually carry it.
  if (courseCode != null && row.course_code != null && row.course_code !== courseCode) return false
  return true
}

function result(tier, row, reason) {
  return {
    audioId: row ? (row.id != null ? row.id : null) : null,
    s3Key: row ? (row.s3_key != null ? row.s3_key : null) : null,
    row: row || null,
    tier,
    reason
  }
}

/**
 * Resolve ONE content slot to the clip that should play.
 *
 * @param {object} opts
 * @param {object|null} opts.linkedRow   the currently-linked course_audio row (or null).
 *                                       Needs { id, s3_key }; other fields optional.
 * @param {Array<object>} opts.candidates course_audio rows for this course to match
 *                                       against. Each needs { id, s3_key } and either
 *                                       { text } or { text_normalized }; { language, role,
 *                                       origin, created_at, course_code } used when present.
 * @param {string} opts.text             the content text for this slot (raw, un-normalised)
 * @param {string} [opts.language]       expected clip language (skips the check if omitted)
 * @param {string} [opts.role]           'known' | 'target1' | 'target2' | 'presentation'
 * @param {string} [opts.courseCode]     optional extra guard
 * @param {'lego'|'seed'|'phrase'} [opts.slotKind]  what this slot belongs to. Drives
 *                                       severity and, for LEGOs, makes the resolver
 *                                       FIGHT HARDEST (see below).
 * @param {boolean} [opts.allowLooseMatch]  set false for link-pass strictness.
 *                                       Defaults true; for a LEGO slot in the triple
 *                                       it is FORCED true — see below.
 * @returns {{audioId: string|null, s3Key: string|null, row: object|null,
 *            tier: 'linked'|'preferred-match'|'loose-match'|'none', reason: string,
 *            severity: 'course-breaking'|'minor'|'none'}}
 *          Never throws. tier 'none' means: SKIP THIS ITEM, play the rest.
 *
 * FIGHT HARDEST FOR LEGOs (Tom, 2026-08-06). Severity is per-ROLE. A LEGO needs
 * all three of intro + voice1 + voice2; missing any one drops the LEGO, drops its
 * round, and breaks every later LEGO contingent on it. A practice-phrase gap just
 * skips a phrase. So for a LEGO slot in the triple the loose tier is always
 * allowed — an off-config or older Azure voice beats a dropped round — and a
 * caller cannot switch it off by passing allowLooseMatch:false. Link-pass
 * strictness still applies everywhere else, which is where it was earning its keep.
 */
function resolveAudio(opts = {}) {
  const {
    linkedRow = null,
    candidates = [],
    text = '',
    language = null,
    role = null,
    courseCode = null,
    slotKind = null
  } = opts || {}

  const severity = slotSeverity(slotKind, role)
  const fightHardest = shouldFightHardest(slotKind, role)
  // A LEGO gap is course-breaking, so it never declines a usable clip.
  const allowLooseMatch = fightHardest
    ? true
    : (opts.allowLooseMatch === undefined ? true : opts.allowLooseMatch)
  const tag = (r) => ({ ...r, severity: r.tier === 'none' ? severity : SEVERITY.NONE })

  // TIER 1 — the link, if it is actually playable.
  if (isAlive(linkedRow)) {
    return tag(result('linked', linkedRow, 'linked clip is alive'))
  }
  const linkedNote = linkedRow ? 'linked clip has no live s3_key' : 'no linked clip'

  const rows = Array.isArray(candidates) ? candidates : []
  const wantExact = normalizeForAudio(text)
  const wantLoose = looseKey(text)

  if (!wantExact && !wantLoose) {
    return tag(result('none', null, `${linkedNote}; slot has no text to match on`))
  }

  // TIER 2 / 3 — scan once, collect both buckets. Ties broken by
  // pickPreferredAudioRow (human > newest > larger id), so this is deterministic
  // and independent of candidate order.
  let exactWinner = null
  let looseWinner = null
  for (const row of rows) {
    if (!isAlive(row)) continue
    if (!sameSlot(row, language, role, courseCode)) continue
    if (wantExact && candidateExactText(row) === wantExact) {
      exactWinner = pickPreferredAudioRow(exactWinner, row)
      continue // an exact match is already the better bucket
    }
    if (allowLooseMatch && wantLoose && candidateLooseText(row) === wantLoose) {
      looseWinner = pickPreferredAudioRow(looseWinner, row)
    }
  }

  if (exactWinner) {
    return tag(result('preferred-match', exactWinner,
      `${linkedNote}; matched exact key on ${JSON.stringify(wantExact)}`))
  }
  if (looseWinner) {
    return tag(result('loose-match', looseWinner,
      `${linkedNote}; matched loose key on ${JSON.stringify(wantLoose)} (normaliser disagreement tier)`))
  }

  return tag(result('none', null,
    `${linkedNote}; no live candidate for ${JSON.stringify(wantExact || wantLoose)} — skip this item only`))
}

/**
 * Resolve a BATCH of slots. Returns one result per input item, in order, ALWAYS
 * the same length as `items` — a tier-'none' item never removes, reorders or
 * truncates its neighbours. Callers drop the 'none' entries at playback time.
 *
 * @param {Array<object>} items  each item is a resolveAudio() opts object; `shared`
 *                               supplies defaults (typically `candidates`).
 * @param {object} [shared]      defaults merged under each item
 */
function resolveAudioBatch(items, shared = {}) {
  const list = Array.isArray(items) ? items : []
  return list.map((item) => resolveAudio({ ...shared, ...(item || {}) }))
}

module.exports = { resolveAudio, resolveAudioBatch, looseKey, isAlive }
