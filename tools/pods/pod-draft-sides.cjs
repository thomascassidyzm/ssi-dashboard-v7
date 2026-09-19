'use strict'
/**
 * pod-draft-sides.cjs — which of a pod sentence's two text columns is the machine draft,
 * and which is the settled line it should be judged against.
 *
 * THE BUG THIS EXISTS TO STOP. verify-pod-text.cjs was written for `*_for_eng` courses,
 * where English is the KNOWN side and the machine draft is the TARGET, and it hardcoded
 * that. On an `eng_for_*` course the direction reverses: English is the settled TARGET
 * and the learner's own language — the draft — is the KNOWN side. Run the old way round,
 * the verifier is handed a Bengali line labelled "the English" and an English line
 * labelled "the draft", and it approves or flags on nothing at all. Silently: every
 * output shape stays valid.
 *
 * The approval columns do NOT reverse. There is no `known_text_approved_at`;
 * `target_text_draft` / `_approved_at` / `_review` stay the row's one verdict whichever
 * side is being judged, and the review records `draft_side` so the row says which.
 */

/** { draftCol, referenceCol } for a draft on `draftSide`. */
function sidesFor (draftSide) {
  if (draftSide === 'known') return { draftCol: 'known_text', referenceCol: 'target_text' }
  if (draftSide === 'target') return { draftCol: 'target_text', referenceCol: 'known_text' }
  throw new Error(`unknown draft side "${draftSide}"; known or target`)
}

/** { draftLang, referenceLang } from the course row, for the verifier's brief. */
function langsFor (draftSide, course = {}, overrides = {}) {
  const { draftCol } = sidesFor(draftSide)
  const draft = draftCol === 'known_text' ? course.known_lang : course.target_lang
  const reference = draftCol === 'known_text' ? course.target_lang : course.known_lang
  return {
    draftLang: overrides.draftLang || draft || 'the target language',
    referenceLang: overrides.referenceLang || reference || 'English',
  }
}

module.exports = { sidesFor, langsFor }
