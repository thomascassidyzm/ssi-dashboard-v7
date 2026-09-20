'use strict'
/**
 * Which rows of a built pod are DRAFTS — the one decision the verifier's
 * selection and the promote gate both hang on. Pure, no side effects, so both
 * the builder and a test can hold it.
 *
 * `target_text_draft` is the flag verify-pod-text.cjs selects on
 * (WHERE target_text_draft AND target_text_approved_at IS NULL) and the flag
 * promote-pod.cjs refuses on. `draft_side` records WHICH side the draft words
 * are on, and is the second, independent record of the same fact.
 */
function draftFlagsFor ({
  draftSide = 'none',
  carryTargetDraft = false,
  targetRowIsDraft = false,
  machineKnown = false,
  machineTarget = false,
} = {}) {
  const carried = !!(carryTargetDraft && targetRowIsDraft)
  // JOB #309. `machineKnown` / `machineTarget` say a MODEL wrote words into this
  // row — the five language-name lines on the relabel path. That path passes no
  // --draft, so those rows used to be stored target_text_draft:false and the
  // verifier's WHERE clause could not see them. The fact that a machine wrote
  // the words is read off what happened to the row, never off a flag somebody
  // had to remember to pass.
  return {
    target_text_draft: draftSide === 'known' || carried || !!machineKnown || !!machineTarget,
    draft_side: draftSide === 'known' ? 'known'
      : (carried ? 'target' : (machineKnown ? 'known' : (machineTarget ? 'target' : null))),
  }
}

module.exports = { draftFlagsFor }
