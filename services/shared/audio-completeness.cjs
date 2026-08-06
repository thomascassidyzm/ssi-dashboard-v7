/**
 * LEGO COMPLETENESS + gap SEVERITY — the single authority for "is this playable"
 * and "how badly does this gap hurt".
 *
 * Tom's ruling, 2026-08-06, verbatim in substance:
 *
 *   "severity is per-ROLE. A LEGO missing any target voice is course-breaking
 *    (the live player requires all three voices and drops the whole round; SSi
 *    methodology makes everything downstream contingent on previously
 *    introduced LEGOs). A missing clip in a cycle/practice phrase is minor."
 *
 * and the precision that followed:
 *
 *   "the three required clips for a complete LEGO are INTRO (proper
 *    introduction/presentation of the LEGO) + target VOICE 1 + target VOICE 2 —
 *    not three target voices."
 *
 * So the triple is presentation + target1 + target2. Note what is NOT in it:
 * the KNOWN-side (prompt) clip. Gates of the form `known && target1` or
 * `known || target1` were the old shape and they FLATTER the course — they pass
 * a LEGO that has no intro and no second voice, i.e. one that cannot play at
 * all. Tom's instruction was explicit: "do not build that flattering metric in."
 *
 * WHY a LEGO gap is categorically worse than a phrase gap: the player drops a
 * LEGO it cannot fully play, which drops its whole round; and because the
 * methodology makes every later LEGO contingent on the ones already introduced,
 * the break propagates downstream. One missing intro can strand a long tail of
 * rounds. A practice-phrase gap leaves the round playing and is cosmetic beside
 * that — under the standing "always play what it has" doctrine the phrase is
 * simply skipped.
 *
 * Consequences encoded here, so callers cannot drift apart:
 *   - completeness is judged on the TRIPLE, never on the prompt;
 *   - a LEGO slot fights hardest for audio (it accepts the loose tier and an
 *     off-config voice, because silence there is course-breaking);
 *   - gap-fill and repair order LEGOs before cycles.
 *
 * PURE — no I/O. Mirrors the posture of audio-link-preference.cjs.
 */

/** The three clips a LEGO must have, mapped to Tom's names for them. */
const LEGO_TRIPLE = Object.freeze({
  presentation: 'intro',
  target1: 'voice1',
  target2: 'voice2'
})

/** Roles making up the triple, in the order a report should list them. */
const LEGO_REQUIRED_ROLES = Object.freeze(['presentation', 'target1', 'target2'])

const SEVERITY = Object.freeze({
  COURSE_BREAKING: 'course-breaking',
  MINOR: 'minor',
  NONE: 'none',
  // A caller that forgot to say what kind of slot this is must NOT be told
  // "minor" — that is the flattering answer, and a roll-up counting
  // course-breaking gaps would silently report zero. Unknown stays unknown.
  UNKNOWN: 'unknown'
})

/** Repair/gap-fill order. Lower sorts first: LEGOs before cycles, always. */
const SLOT_KIND_PRIORITY = Object.freeze({ lego: 0, seed: 1, phrase: 2 })

function truthyId(v) {
  return v !== null && v !== undefined && v !== '' && v !== false
}

/**
 * Which of the triple are missing for one LEGO.
 * @param {object} lego  any object carrying the three ids under either the
 *                       role names or the `*_audio_id` column names.
 * @returns {string[]} missing role names, in LEGO_REQUIRED_ROLES order.
 */
function missingLegoRoles(lego = {}) {
  const l = lego || {}
  const present = {
    presentation: truthyId(l.presentation) || truthyId(l.presentation_audio_id),
    target1: truthyId(l.target1) || truthyId(l.target1_audio_id),
    target2: truthyId(l.target2) || truthyId(l.target2_audio_id)
  }
  return LEGO_REQUIRED_ROLES.filter((r) => !present[r])
}

/**
 * Is this LEGO playable? True only when ALL THREE of intro + voice1 + voice2
 * exist. The prompt clip is deliberately not consulted.
 */
function isLegoComplete(lego) {
  return missingLegoRoles(lego).length === 0
}

/**
 * Verdict for one LEGO, for reports that must lead with severity.
 * @returns {{complete: boolean, missing: string[], severity: string,
 *            introOnly: boolean, label: string}}
 *   introOnly flags the cheapest rescue in a course: both voices are already
 *   rendered and ONE intro clip buys back the whole round.
 */
function legoVerdict(lego) {
  const missing = missingLegoRoles(lego)
  const complete = missing.length === 0
  const introOnly = missing.length === 1 && missing[0] === 'presentation'
  return {
    complete,
    missing,
    severity: complete ? SEVERITY.NONE : SEVERITY.COURSE_BREAKING,
    introOnly,
    label: complete
      ? 'complete'
      : `COURSE-BREAKING — missing ${missing.map((r) => LEGO_TRIPLE[r]).join(' + ')}`
  }
}

/**
 * Severity of ONE unresolved slot. A LEGO slot in the triple is course-breaking;
 * anything else (practice phrases, cycles, the known-side prompt) is minor.
 * @param {'lego'|'seed'|'phrase'} slotKind
 * @param {string} role
 */
function slotSeverity(slotKind, role) {
  if (slotKind === 'lego') {
    return LEGO_REQUIRED_ROLES.includes(role) ? SEVERITY.COURSE_BREAKING : SEVERITY.MINOR
  }
  if (slotKind === 'seed' || slotKind === 'phrase') return SEVERITY.MINOR
  // Deliberately not MINOR — see SEVERITY.UNKNOWN.
  return SEVERITY.UNKNOWN
}

/**
 * "Fight hardest for LEGOs." A LEGO slot in the triple accepts the resolver's
 * loose tier, because for it the alternative is a dropped round rather than a
 * skipped phrase. Callers pass the result as resolveAudio's allowLooseMatch.
 */
function shouldFightHardest(slotKind, role) {
  return slotSeverity(slotKind, role) === SEVERITY.COURSE_BREAKING
}

/**
 * Sort comparator for a repair/gap-fill queue: LEGOs before seeds before
 * phrases, and within LEGOs the intro-only rescues first (cheapest round
 * bought back per clip rendered).
 */
function repairOrder(a = {}, b = {}) {
  const ap = SLOT_KIND_PRIORITY[a.slotKind] ?? 99
  const bp = SLOT_KIND_PRIORITY[b.slotKind] ?? 99
  if (ap !== bp) return ap - bp
  const ai = a.introOnly ? 0 : 1
  const bi = b.introOnly ? 0 : 1
  return ai - bi
}

module.exports = {
  LEGO_TRIPLE,
  LEGO_REQUIRED_ROLES,
  SEVERITY,
  SLOT_KIND_PRIORITY,
  missingLegoRoles,
  isLegoComplete,
  legoVerdict,
  slotSeverity,
  shouldFightHardest,
  repairOrder
}
