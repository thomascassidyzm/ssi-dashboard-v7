/**
 * What a pod IS, declared — never inferred from what it is called.
 *
 * Tom's ruling, 2026-09-01: a pedagogical difficulty tier is a property of the
 * pod and must be DECLARED. The code this file replaces read the tier off the
 * pod's name — `podSlug === 'pod-0' ? 8 : 12` — so renaming the pod would have
 * silently changed how hard its content is. Carrying that string forward under a
 * new name would have carried the bug forward, which is why the rename did not
 * just swap the literal.
 *
 * The numbers name the COMPULSORY DEFAULT CHAIN (Tom, 2026-09-01). pod-1, pod-2,
 * pod-3 is the ladder a learner descends by NOT choosing: no choice means the
 * next numbered pod, automatically. Numbering was retired as a CONTENT label — a
 * walk is named by what it masks, and Health is Health, not pod-4 — but the chain
 * itself is numbered, and `rung` below is that position. It is declared per pod,
 * not read off the digit in the slug.
 *
 * The tier belongs to the CANONICAL SLATE the content is flexed from, not to the
 * per-course listening pod it is written into. Those are two different slugs that
 * happened to share a value; see services/pod-dialogue-generator.cjs.
 */

// Founder ruling (2026-07-16, docs/pods/pod-ladder-proposal.md §9a): the first
// rung's breathing ceiling is 8 syllables; every level after it is 12.
const POD_TIERS = {
  // Renamed from 'pod-0' on 2026-09-01. Same content, same rung, correct name.
  'pod-1': { rung: 1, syllableCeiling: 8 },
}

// A slate nobody has declared a tier for is not a beginner slate. 12 is the
// ceiling for every level after the first, so it is the honest default: an
// undeclared pod gets the general ceiling, never the easiest one by accident.
const UNDECLARED_TIER = { rung: null, syllableCeiling: 12 }

/** The declared tier for a canonical slate. Never guesses from the name. */
function tierFor(canonicalSlug) {
  return POD_TIERS[canonicalSlug] || UNDECLARED_TIER
}

/** Breathing ceiling C, in target syllables, for content flexed from this slate. */
function syllableCeilingFor(canonicalSlug) {
  return tierFor(canonicalSlug).syllableCeiling
}

module.exports = { POD_TIERS, UNDECLARED_TIER, tierFor, syllableCeilingFor }
