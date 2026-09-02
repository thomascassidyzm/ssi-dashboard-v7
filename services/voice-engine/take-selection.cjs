/**
 * take-selection.cjs — the TWO questions every recording surface asks about a
 * line, answered in ONE place.
 *
 *   1. DOES A TAKE OF THIS LINE BY THIS VOICE EXIST?      → lineHasTake()
 *   2. DOES THAT TAKE COUNT AS A RECORDING?               → countsAsRecorded()
 *   3. WHICH TAKE OF A LINE IS THE CURRENT ONE?           → resolveCurrentClip()
 *                                                           (pickCurrentTake is its tie-break)
 *
 * THE INVARIANT (Tom, 2026-09-02): "we should be able to know for sure that
 * what we record IS what is served to the learner." That cannot be held by
 * three read paths that happen to agree — the recordist's queue, the Listen
 * button and the learner's own playback. It is held by ONE resolver they all
 * ask, whose two callers differ only in DECLARED parameters (may I fall back
 * past the slot? whose voices count as mine?) rather than in code. Anything
 * that resolver cannot make identical is a real divergence, and
 * tools/recording/verify-take-invariant.cjs counts them for a whole course.
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
 * THE RESOLVER. Which stored clip IS this line, right now.
 *
 * THE SLOT DECIDES. A pod line's own FK (`target_audio_id` / `known_audio_id`)
 * is what the learner's bundle plays — it reads that column and nothing else —
 * so any other read path that wants to agree with the learner must start from
 * the same column. It does not "usually" agree; it is the same row.
 *
 * The two callers differ only in what they are allowed to do, and both say so
 * out loud:
 *   - the LEARNER view: no voice restriction, NO fallback. If the slot is
 *     empty the learner hears nothing, and this returns null rather than
 *     inventing a clip the learner would never get.
 *   - the RECORDIST view: restricted to their own spellings (a slot filled by
 *     somebody else is not their take), and allowed to fall back to the clip's
 *     identity — because a recordist may legitimately have a take of a line
 *     whose slot was never linked, and hearing it is how they find that out.
 *
 * A divergence between the two is therefore never an accident of ordering. It
 * is one of exactly two facts: the slot is empty, or the slot holds somebody
 * else's voice.
 *
 * @returns {Promise<{audioId, s3Key, voiceId, source: 'slot'|'identity'}|null>}
 */
async function resolveCurrentClip(db, {
  sentence,
  track = 'target',
  language = null,
  restrictToVoices = null,
  allowIdentityFallback = false,
}) {
  if (!sentence) return null
  const slotId = sentence[`${track}_audio_id`]
  if (slotId) {
    const { data, error } = await db
      .from('course_audio').select('id, s3_key, voice_id, language, created_at')
      .eq('id', slotId).maybeSingle()
    if (error) throw new Error(`slot clip lookup failed: ${error.message}`)
    if (data && (!restrictToVoices || restrictToVoices.includes(data.voice_id))) {
      return { audioId: data.id, s3Key: data.s3_key, voiceId: data.voice_id, source: 'slot' }
    }
  }
  if (!allowIdentityFallback) return null
  const text = String(sentence[`${track}_text`] || '').trim()
  if (!text || !restrictToVoices || !language) return null
  const { data, error } = await db
    .from('course_audio')
    .select('id, s3_key, voice_id, language, created_at')
    .eq('language', language)
    .in('voice_id', restrictToVoices)
    .in('text_normalized', audioKeyCandidates(text))
    .order('created_at', { ascending: false })
    .limit(5)
  if (error) throw new Error(`identity clip lookup failed: ${error.message}`)
  const row = pickCurrentTake(data || [])
  return row ? { audioId: row.id, s3Key: row.s3_key, voiceId: row.voice_id, source: 'identity' } : null
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

module.exports = { lineHasTake, countsAsRecorded, pickCurrentTake, resolveCurrentClip }
