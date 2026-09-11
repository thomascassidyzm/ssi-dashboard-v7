/**
 * take-selection.cjs — THE ONE RESOLVER for "is this line recorded", and for
 * "which stored take IS this line". Every recording surface asks here and
 * nowhere else:
 *
 *   1. IS THIS LINE RECORDED, FOR THIS RECORDIST?          → isLineRecorded()
 *                                                            (lineHasTake is the same answer, kept by name)
 *   2. WHICH TAKE OF A LINE IS THE CURRENT ONE?             → resolveCurrentClip()
 *                                                            (pickCurrentTake is its tie-break)
 *
 * THE RULE (Tom, 2026-09-11, binding): a line is RECORDED iff the server holds
 * a confirmed upload of it by the cast recordist — regardless of any review
 * flag, rejection, re-cast, ownership change or in-flight state. Anything else
 * is a MARK over a recorded line, never a reason to serve it again. A line with
 * NO confirmed upload is STILL TO READ. There is no third state that affects
 * the queue.
 *
 * WHY THE RULE IS THIS BLUNT. Between 5 and 11 September 2026 the estate
 * patched "is this line recorded" fifteen times, each patch fixing a count in
 * one of the several places that computed it — the booth queue, the recordist
 * roster, the studio plan, the coverage bar — and on 11 September Aran was
 * served ~150 Senedd lines he had already recorded. Tom: "it's unforgivable to
 * lose recordings or to make a voice artist re-record stuff they've already
 * recorded. That's a categoric fail." The previous predicate here,
 * countsAsRecorded = hasTake && !rerecordWanted, was the third state: a want
 * written by our own quality machinery re-opened a recorded line, and the
 * artist's wire then masked WHY, so he saw a line he knew he had read, offered
 * as never read. That predicate is gone. A want is now carried on the wire as a
 * mark (Tom's coverage page reads it; the artist's wire masks it) and moves
 * nothing in or out of the outstanding set. The deliberate second pass is the
 * booth's own "Re-read lines I've already recorded" switch.
 *
 * THE INVARIANT (Tom, 2026-09-02): "we should be able to know for sure that
 * what we record IS what is served to the learner." That is held by ONE
 * resolver every read path asks — the recordist's queue, the Listen button and
 * the learner's own playback — whose callers differ only in DECLARED parameters
 * (may I fall back past the slot? whose voices count as mine?) rather than in
 * code. tools/recording/verify-take-invariant.cjs counts any divergence for a
 * whole course.
 *
 * WHY A LINE HAS TWO WAYS OF HAVING A TAKE (2026-09-02 forensic count):
 *
 *   - BY TEXT. A clip is filed under (language, text_normalized, voice), so a
 *     clip of this text by this voice is a take of this line.
 *   - BY SLOT. The line's own FK (listening_pod_sentences.target_audio_id, a
 *     seed's target1/target2_audio_id, a LEGO's target1_audio_id) points at a
 *     clip in this voice. This is what the text test cannot see: when pod-0 was
 *     rebuilt on 2026-08-11 its sentences gained "…" PAUSE CUES, and Aran's June
 *     takes of those exact sentences are filed under the un-cued text. Six of
 *     his lines were already LINKED and already playing to learners while his
 *     own screen called them unrecorded and queued them for him to read again.
 *
 * EITHER IS ENOUGH. A slot filled by this voice on ANY copy of a collapsed line,
 * or a stored take of this text by this voice, is a confirmed upload — and a
 * confirmed upload is the whole of the rule. The old seed test demanded EVERY
 * copy's slot be filled by this voice; a copy held by another recordist's clip
 * (which linkSeedTake correctly refuses to move) therefore kept the seed in the
 * queue for ever, asking for a take the linker would then decline to place.
 * An unfilled duplicate is a LINKING gap to be closed by linking, never by
 * asking the artist to read the words again. Reads widen, writes narrow:
 * nothing here writes.
 */

'use strict'

const { audioKeyCandidates } = require('../shared/text-normalize.cjs')

/**
 * Is this line RECORDED for this recordist — does the server hold a confirmed
 * upload of it by them? This is the ONLY predicate any queue, count, roster,
 * plan or coverage bar may use, and it reads exactly two facts: the slots and
 * the stored takes. It never reads a want, a verdict, an owner change or an
 * upload the client still holds.
 *
 * @param {object} line a queue line from buildLanguageLines
 * @param {object} ctx
 * @param {Set<string>} ctx.recordedKeys normalised texts this voice has recorded
 * @param {string[]} ctx.spellings every spelling of this voice's id
 */
function isLineRecorded(line, { recordedKeys, spellings }) {
  if (!line) return false
  const mine = (v) => !!v && spellings.includes(v)
  // BY SLOT, on ANY copy this line stands for. A SEED line carries every copy's
  // FK in seedFilledBy; a POD line carries its own FK and every collapsed
  // copy's in filledBy.
  // A MINIMAL-SET LEGO is a GAPPED read of its own row, and that row's slot is
  // what the splicer will cut from: a natural-pace take of the same words on a
  // pod line is a different line, not this one. So a LEGO piece is scored by
  // its slot alone (null on a fallback WORD, which owns no row).
  if (Array.isArray(line.slotFilledBy)) return line.slotFilledBy.some(mine)
  const slots = [
    ...(Array.isArray(line.seedFilledBy) ? line.seedFilledBy : []),
    ...(Array.isArray(line.filledBy) ? line.filledBy : []),
  ]
  if (slots.some(mine)) return true
  // BY TEXT: a stored take of these words by this voice, in this language. Not
  // for a fixture's KNOWN-side line — that is filed under the course's known
  // language and the target-language key set cannot vouch for it.
  if (line.role === 'known') return false
  if (recordedKeys && audioKeyCandidates(line.text).some((k) => recordedKeys.has(k))) return true
  return false
}

/**
 * The same answer under the name the older call sites use. There is no longer
 * a difference between "a take exists" and "the line is recorded" — that gap
 * was the third state, and it is gone.
 */
function lineHasTake(line, ctx) {
  return isLineRecorded(line, ctx)
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

module.exports = { isLineRecorded, lineHasTake, pickCurrentTake, resolveCurrentClip }
