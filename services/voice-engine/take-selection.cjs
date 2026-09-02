/**
 * take-selection.cjs — the TWO questions every recording surface asks about a
 * line, answered in ONE place.
 *
 *   1. DOES A TAKE OF THIS LINE BY THIS VOICE EXIST?      → lineHasTake()
 *   2. DOES THAT TAKE COUNT AS A RECORDING?               → countsAsRecorded()
 *   3. WHICH TAKE OF A LINE IS THE CURRENT ONE?           → pickCurrentTake()
 *
 * They are separated because they are DIFFERENT QUESTIONS and Tom has a ruling
 * pending on the second one ("if they are NOT accepted, then we don't have the
 * recordings really", 2026-09-02). Whichever way that lands — hide the
 * unaccepted takes, or wipe them — it is a change to countsAsRecorded() and to
 * nothing else, rather than a hunt for `hasTake && !rerecordWanted` scattered
 * through a queue builder, a coverage builder and a Vue view.
 *
 * WHY A LINE HAS TWO WAYS OF HAVING A TAKE (2026-09-02 forensic count):
 *
 *   - BY TEXT. A clip is filed under (language, text_normalized, voice), so a
 *     clip of this text by this voice is a take of this line. That was the only
 *     test until now.
 *   - BY SLOT. The line's own FK (listening_pod_sentences.target_audio_id)
 *     points at a clip in this voice. This is what the text test cannot see:
 *     when pod-0 was rebuilt on 2026-08-11 its sentences gained "…" PAUSE CUES
 *     ("A be ydy… cyfrinair y wifi?"), and Aran's June takes of those exact
 *     sentences are filed under the un-cued text. Six of his lines were already
 *     LINKED and already playing to learners while his own screen called them
 *     unrecorded and queued them for him to read again.
 *
 * The slot test is the same one the seed queue already uses and the same one
 * the listen route tries first — the estate's own statement that this slot is
 * filled by this voice. Reads widen, writes narrow: nothing here writes.
 */

'use strict'

const { audioKeyCandidates } = require('../shared/text-normalize.cjs')

/**
 * Does a take of this line by this recordist exist — regardless of whether we
 * are asking for it to be read again?
 *
 * @param {object} line a queue line from buildLanguageLines
 * @param {object} ctx
 * @param {Set<string>} ctx.recordedKeys normalised texts this voice has recorded
 * @param {string[]} ctx.spellings every spelling of this voice's id
 */
function lineHasTake(line, { recordedKeys, spellings }) {
  if (!line) return false
  // A SEED line is scored by its own SLOT, never by "a clip of this text
  // exists": the known-side line is filed under the course's KNOWN language and
  // a seed's target1 and target2 are two slots holding the same words.
  if (line.kind === 'seed') {
    const filled = line.seedFilledBy || []
    return filled.length > 0 && filled.every((v) => v && spellings.includes(v))
  }
  if (audioKeyCandidates(line.text).some((k) => recordedKeys.has(k))) return true
  // ANY copy of a collapsed line being filled by this voice is enough: the
  // collapse promise is that one recording fills every course's copy, so a
  // single filled slot is that one recording.
  return (line.filledBy || []).some((v) => v && spellings.includes(v))
}

/**
 * Does an existing take COUNT as a recording — i.e. is this line done?
 *
 * A wanted line is outstanding even though a take exists. The take is not
 * touched: it stays linked and playable, and the recordist can A/B it on the
 * page — it simply stops counting as done.
 *
 * THIS IS THE PREDICATE TOM'S PENDING RULING CHANGES. Nothing else.
 */
function countsAsRecorded(line, hasTake) {
  return !!hasTake && !line.rerecordWanted
}

/**
 * Which of several stored rows for one line is the CURRENT take.
 *
 * Newest wins, by the server's own created_at — never a client-supplied
 * recorded_at, which comes off the recordist's phone. Measured 2026-09-02:
 * every one of Aran's 149 course_audio rows already points at its own latest
 * take (the pod upsert repoints s3_key in place and the raw + provenance rows
 * of every earlier take are kept), so this is the tie-break for the rarer case
 * of two ROWS holding the same line under two spellings of one voice.
 */
function pickCurrentTake(rows) {
  if (!Array.isArray(rows) || !rows.length) return null
  return rows.reduce((best, r) => {
    if (!best) return r
    return String(r.created_at || '') > String(best.created_at || '') ? r : best
  }, null)
}

module.exports = { lineHasTake, countsAsRecorded, pickCurrentTake }
