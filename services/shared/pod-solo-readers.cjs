/**
 * pod-solo-readers.cjs — A POD READ SOLO BY EACH VOICE, NOT CAST TO CHARACTERS.
 *
 * Tom's ruling for the health-seed ladder set, 2026-09-16, after Aran opened
 * https://popty.app/production/cym_n_for_eng/pods/health-ladder-pilot and found
 * every seed twice: "in the drafts requiring proofreading for the health seeds,
 * they seem to be doubled up — two versions of each translation, one for Nurse
 * Sian and one for Wil Hughes."
 *
 * They were doubled because the set was staged as a POD, and a pod line belongs
 * to a CHARACTER: `tools/recording/health-seed-ladders/stage-pilot-pod.cjs`
 * wrote one sentence per (seed × character) so each character could own an audio
 * slot. Five seeds became ten rows, ten translations, two of everything on the
 * proofreading list — a data shape asserting something untrue about the content,
 * which is that Nurse Siân and Wil Hughes say different things.
 *
 * THE RULING: these are SEEDS, not dialogue. ONE line per seed, no character at
 * all, read SOLO by each of the course's human target voices — Aran and Catrin
 * reading the same sentence, twice over, as target1 and target2 of a seed are
 * read. Two recordists on ONE line, never two characters with two lines.
 *
 * A pod says so by naming its readers:
 *
 *     listening_pods.metadata.solo_readers = ['human_aran_cym_n', 'human_catrinlliar_cym_n']
 *
 * and that declaration is the whole switch. Wherever a pod line is cast by its
 * speaker — the queue (recordist-queue.cjs), the take route and the Take G route
 * (recordist-router.cjs) — a solo-reader pod is cast by this list instead, and
 * the sentence's `speaker` is not read at all. Every other pod on the estate is
 * untouched: no list, no change.
 *
 * WHAT EACH READER GETS, AND WHY IT DOES NOT COLLIDE:
 *   - the natural line: one queue line per reader, of the one sentence. Both
 *     takes exist as their own course_audio rows (the unique key carries
 *     voice_id), and the line is scored RECORDED for a reader by their own take
 *     of the text — so whichever reader's clip happens to sit in the sentence's
 *     single `target_audio_id` slot, neither is ever asked to read it again.
 *   - the Take G line: one per reader, and the pointer is per reader —
 *     `takeg_audio_ids[i]` is the Take G of `solo_readers[i]`. A second reader
 *     recording never overwrites the first reader's pointer, which is exactly
 *     what a positional single-entry array would have done.
 *
 * That last point is a DEPARTURE from takeg-clip-contract.cjs's positional
 * meaning (index = chunk group), and it is confined to a solo-reader pod:
 * `soloReaderTakeGIds` is the only writer of that shape and `soloReaderTakeGId`
 * the only reader.
 */

'use strict'

/**
 * The voices this pod is read solo by, in declaration order. Empty for every
 * ordinary pod, which is what keeps this invisible to the other 128 pods.
 * @param {{metadata?: object}|null} pod a listening_pods row
 * @returns {string[]}
 */
function soloReaders(pod) {
  const declared = pod && pod.metadata && pod.metadata.solo_readers
  if (!Array.isArray(declared)) return []
  return declared.map((v) => String(v || '').trim()).filter(Boolean)
}

/** Is this pod read solo by a named list of voices rather than cast to characters? */
function isSoloReaderPod(pod) {
  return soloReaders(pod).length > 0
}

/**
 * Which reader is this? Matched against every spelling of a voice id the
 * recordist answers to, because a link may be opened under an alias.
 * @returns {number} index into soloReaders(pod), or -1
 */
function soloReaderIndex(pod, spellings) {
  const readers = soloReaders(pod)
  const mine = Array.isArray(spellings) ? spellings : [spellings]
  return readers.findIndex((v) => mine.includes(v))
}

/** This reader's Take G clip id, by their own slot. Null when they have none. */
function soloReaderTakeGId(pod, existing, spellings) {
  const i = soloReaderIndex(pod, spellings)
  if (i < 0 || !Array.isArray(existing)) return null
  return existing[i] || null
}

/**
 * The array to write when THIS reader files a Take G: their own slot set, every
 * other reader's left exactly as it was. Never shortens the array.
 */
function soloReaderTakeGIds(pod, existing, spellings, audioId) {
  const i = soloReaderIndex(pod, spellings)
  if (i < 0) return null
  const readers = soloReaders(pod)
  const next = new Array(readers.length).fill(null)
  const had = Array.isArray(existing) ? existing : []
  for (let k = 0; k < readers.length; k += 1) next[k] = had[k] || null
  next[i] = audioId
  return next
}

/**
 * THE GUARD. A seed set is read solo; it has no characters, and attaching one
 * is what doubled Aran's proofreading list. Any writer staging a solo-reader pod
 * calls this before it writes, and it throws rather than warns: the cost of the
 * wrong shape is a recordist reading everything twice.
 *
 * @param {{speakers?: object, metadata?: object}} pod the row about to be written
 * @param {Array<{id?: string, speaker?: string}>} sentences the rows about to be written
 */
function assertNoCharacters(pod, sentences) {
  if (!isSoloReaderPod(pod)) {
    throw new Error(
      `A seed-set staging must declare metadata.solo_readers — ${(pod && pod.id) || 'this pod'} declares none. ` +
      `Without it there is no reader to cast the lines to at all.`)
  }
  const speakers = Object.keys((pod && pod.speakers) || {}).filter((k) => k !== '_default')
  if (speakers.length) {
    throw new Error(
      `A solo-reader pod may not attach characters — ${pod.id || 'this pod'} declares ${speakers.length}: ` +
      `${speakers.join(', ')}. One line per seed, read solo by ${soloReaders(pod).join(' and ')}.`)
  }
  const withSpeaker = (sentences || []).filter((s) => String(s && s.speaker || '').trim())
  if (withSpeaker.length) {
    throw new Error(
      `A solo-reader pod's lines may not name a character — ${withSpeaker.length} do, ` +
      `starting with ${withSpeaker[0].id || withSpeaker[0].speaker}.`)
  }
  const byId = new Map()
  for (const s of sentences || []) {
    const key = String((s && s.id) || '').trim()
    if (!key) continue
    if (byId.has(key)) {
      throw new Error(
        `A solo-reader pod holds ONE line per seed — ${key} is staged twice. ` +
        `Two readers of one line are two takes, never two rows.`)
    }
    byId.set(key, s)
  }
}

module.exports = {
  soloReaders, isSoloReaderPod, soloReaderIndex, soloReaderTakeGId, soloReaderTakeGIds, assertNoCharacters,
}
