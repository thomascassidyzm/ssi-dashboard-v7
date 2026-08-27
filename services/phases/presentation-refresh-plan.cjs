// =============================================================================
// presentation-refresh-plan.cjs — what /regenerate-presentations does when a
// LEGO's introduction text changes, decided as data rather than as side effects.
//
// MAKE-BEFORE-BREAK (Kai's C0 ruling, 2026-08-27; canon clash C23).
//
// This module exists because the route used to answer "the template text
// changed" by DELETING the LEGO's presentation row — in batches of 200 — and
// nulling course_legos.presentation_audio_id, and only THEN re-rendering. A run
// that died in that gap left every slot it had already deleted silent, with its
// revision history, flags and sign-offs deleted along with the row, so there was
// no way back. That is the fra_for_eng 2026-08-03 shape
// (docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b).
//
// The rule now: a changed intro is an ADDITION. We insert a new pending row
// carrying the same lego_id ALONGSIDE the old one and leave the old row and the
// FK exactly where they are. The learner keeps hearing the old introduction —
// stale words, but audible — until /generate has rendered the replacement,
// passed it through the veracity gate and uploaded it, at which point that same
// run rebinds the FK to the new row. Die at any point and every slot still has
// playable audio. The superseded row is left unlinked for a separate cleanup
// pass, exactly as the flag-and-regenerate path leaves its predecessors.
// =============================================================================

/**
 * Decide, per LEGO, what the presentation refresh should do.
 *
 * @param {Array<{lego_id: string, presentation_text: string}>} presentations
 *        the freshly authored intros, one per LEGO.
 * @param {Map<string, {id: string, lego_id: string, text_normalized: string, origin: string}>} existingByLegoId
 *        the presentation rows already in course_audio, keyed by lego_id.
 * @param {(t: string) => string} normalize  normalizeForAudio.
 * @returns {{
 *   unchangedLegoIds: Set<string>,   // text identical, or human-origin — keep as is, insert nothing
 *   supersededLegoIds: string[],     // text changed — a new pending row is added beside the old one
 *   supersededAudioIds: string[],    // the old rows, now destined to become unlinked leftovers
 *   humanPreserved: number           // human recordings whose template text moved on
 * }}
 */
function planPresentationRefresh(presentations, existingByLegoId, normalize) {
  const unchangedLegoIds = new Set()
  const supersededLegoIds = []
  const supersededAudioIds = []
  let humanPreserved = 0

  for (const pres of presentations) {
    const existing = existingByLegoId.get(pres.lego_id)
    if (!existing) continue  // nothing there yet — a plain insert
    const newNorm = normalize(pres.presentation_text)

    // PRECIOUS-AUDIO GUARD, unchanged and undiluted: a human-origin
    // presentation is never deleted, never superseded, never re-rendered over.
    // It stays the presentation for that LEGO even when the template moves.
    if (existing.origin === 'human') {
      unchangedLegoIds.add(pres.lego_id)
      if (existing.text_normalized !== newNorm) humanPreserved++
      continue
    }

    if (existing.text_normalized === newNorm) {
      unchangedLegoIds.add(pres.lego_id)  // same words — the existing clip is correct
      continue
    }

    // Text changed. Add, do not remove.
    supersededLegoIds.push(pres.lego_id)
    supersededAudioIds.push(existing.id)
  }

  return { unchangedLegoIds, supersededLegoIds, supersededAudioIds, humanPreserved }
}

/**
 * Choose which of several presentation rows sharing one lego_id owns the slot.
 *
 * Addition-only refresh means a LEGO can carry two rendered rows: the superseded
 * one and its replacement. Every relink path has to pick the same one, and it
 * has to be the NEWEST — otherwise the belt-and-braces linker walks the FK back
 * to the superseded clip the moment the replacement lands, and the learner hears
 * the old introduction forever. Before the replacement renders there is only one
 * rendered candidate (the old one), which is precisely the make-before-break
 * behaviour we want.
 *
 * Pending rows are never candidates: they name a clip that does not exist yet.
 *
 * @param {Array<{id: string, s3_key?: string, created_at?: string}>} candidates
 * @returns {object|null} the winning row
 */
function newestRenderedPresentation(candidates) {
  let best = null
  for (const c of candidates || []) {
    if (c.s3_key && c.s3_key.startsWith('pending/')) continue
    if (!best) { best = c; continue }
    const a = c.created_at ? Date.parse(c.created_at) : 0
    const b = best.created_at ? Date.parse(best.created_at) : 0
    if (a > b) best = c
  }
  return best
}

module.exports = { planPresentationRefresh, newestRenderedPresentation }
