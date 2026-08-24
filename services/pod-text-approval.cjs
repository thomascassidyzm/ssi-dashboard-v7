/**
 * Pod TEXT approval — the words-are-settled gate.
 *
 * Tom's ruling, 2026-08-16 (A-109), verbatim:
 *   "we're not going to manually read all text for all courses - that's lunacy -
 *    we state an acceptable risk policy: maybe we ask a verifier agent to check
 *    all translations for reasonableness - as distinct from the agent that did
 *    the translating - and then we mark text as approved to generate audio"
 *
 * Why this exists: services/pod-voice-approvals.cjs already refuses a bulk render
 * whose VOICES are unverified. Nothing refused a bulk render whose WORDS are
 * unverified. 4,852 machine-written draft lines sit across 42 pods today; 128 of
 * them are in spa_for_eng:pod-0-unrecorded, the one course whose voices ARE
 * approved — so hand-scoping every run was the only thing standing between those
 * drafts and audio a learner would hear. This module is that condition, in one
 * place, so it cannot happen again by accident in any course.
 *
 * The rule in one line: a pod line's TARGET track is renderable only when the
 * words are settled — the line is not a draft, or the draft has been approved.
 *
 *   renderable  ⟺  target_text_draft !== true  ∨  target_text_approved_at != null
 *
 * Three things this gate deliberately does NOT do:
 *   - It never touches the KNOWN (English) track. The draft marker is about
 *     target text only; known_text is canonical English that was never drafted.
 *     Gating it would block the English side of 4,852 lines for no reason.
 *   - It does not distinguish BULK from SAMPLE. A sample that renders
 *     unproofread words is exactly as wrong as a bulk run that does; the sample
 *     gate protects Tom's money and his ear, not content rules.
 *   - It never fails a run. A blocked line simply never enters the work queue,
 *     and is COUNTED and REPORTED. Silence is the disease this item exists to
 *     cure — a render that quietly skips 112 lines is the same bug in a new coat.
 *
 * Pure: no DB, no network, no spend. Tests in pod-text-approval.test.cjs.
 */

/**
 * Are this sentence's target words settled enough to spend money rendering?
 *
 * @param {object} sentence a listening_pod_sentences row (needs target_text_draft,
 *                          target_text_approved_at)
 * @returns {boolean}
 */
function targetTextRenderable(sentence) {
  if (!sentence || typeof sentence !== 'object') return false
  // Not a draft → settled words, renderable, and the approval columns are moot.
  // `!== true` and not `=== false`: a row loaded from a projection that omitted
  // the column must not be blocked by its absence — the column is NOT NULL with
  // DEFAULT false in the schema, so undefined means "not a draft" everywhere the
  // value is genuinely unknown.
  if (sentence.target_text_draft !== true) return true
  // A draft is renderable only once approved. Any non-null timestamp counts;
  // there is no separate boolean to disagree with it.
  return sentence.target_text_approved_at != null
}

/**
 * Why a line was withheld, in words a human can read in a log line.
 * Returns null when the line is renderable.
 */
function blockReason(sentence) {
  if (targetTextRenderable(sentence)) return null
  return 'unapproved_draft_target_text'
}

/**
 * Split a built work queue into the items that may run and the target items
 * withheld because their words are not settled.
 *
 * Takes the queue AFTER it is built rather than filtering at push time, so the
 * caller's queue-building logic stays in one piece and the withheld set is a
 * real list it can count, log and return — not a subtraction nobody can see.
 *
 * Items are matched to their sentence rows by `sentence_id`. An item whose row
 * is not in the map is PASSED THROUGH: this gate refuses drafts, it is not a
 * referential-integrity check, and blocking on a lookup miss would turn a
 * bookkeeping gap into silent missing audio.
 *
 * @param {Array<object>} workQueue items with { kind, sentence_id, ... }
 * @param {Map<string, object>|object} sentencesById sentence rows by id
 * @returns {{ allowed: Array<object>, blocked: Array<object> }}
 *          blocked items are the original queue items, annotated with `reason`
 */
function partitionWorkQueue(workQueue, sentencesById) {
  const get = sentencesById instanceof Map
    ? (id) => sentencesById.get(id)
    : (id) => (sentencesById || {})[id]

  const allowed = []
  const blocked = []
  for (const item of workQueue || []) {
    // Known-track items are never gated — see the header.
    if (!item || item.kind !== 'target') { allowed.push(item); continue }
    const sentence = get(item.sentence_id)
    if (!sentence) { allowed.push(item); continue }
    if (targetTextRenderable(sentence)) allowed.push(item)
    else blocked.push({ ...item, reason: blockReason(sentence) })
  }
  return { allowed, blocked }
}

/** Index an array of sentence rows by id, for partitionWorkQueue. */
function indexSentences(sentences) {
  const map = new Map()
  for (const s of sentences || []) if (s && s.id) map.set(s.id, s)
  return map
}

module.exports = {
  targetTextRenderable,
  blockReason,
  partitionWorkQueue,
  indexSentences,
}
