/**
 * audio-preview-missing.cjs — the pure half of the missing-audio scan.
 *
 * `listening_pod_sentences` holds audio ids with NO foreign key to
 * `course_audio`: three uuid ARRAY columns and four uuid SCALAR columns.
 * Because there is no FK and no cascade, deleting a clip anywhere in the estate
 * strands its uuid in those columns silently — no error, no null, no signal.
 * The learner meets it as a dialogue line the pod simply cannot play
 * (packages/player-vue/src/composables/podSentenceSplit.ts reads both sentence
 * arrays directly; usePodLapScheduler.ts schedules from them).
 *
 * Kept free of the database on purpose: the caller does the I/O, this decides.
 *
 * ── Why the column lists are constants, and why they are load-bearing ────────
 * An earlier sweep of this same defect counted TWO array columns and missed
 * `takeg_audio_ids`, so it under-reported the damage and nobody could tell.
 * The lists below are the whole accounting: every column is reported EVEN WHEN
 * ITS COUNT IS ZERO, so a zero is a measured zero rather than an omission.
 * Verified against the live schema on 2026-08-05 — that pass also turned up
 * `note_audio_id`, a fourth scalar the audit doc did not mention.
 *
 * ── NULL is not dangling ─────────────────────────────────────────────────────
 * "No clip assigned" (NULL scalar / empty array / a hole inside a populated
 * array) and "points at a clip that does not exist" are different facts about a
 * slot and are never merged here. The first may well be by design; the second
 * is always damage. The unassigned side is itself split two ways —
 * `unassignedSentences` for a line with nothing at all in that column,
 * `unassignedSlots` for a gap inside a line that does have clips — because
 * summing them into one number named for either one would be a quiet lie.
 */

'use strict'

// uuid[] columns. Each element is one slot the pod plays in order, so the
// ARRAY INDEX is part of the address of the damage — a backfill has to put a
// replacement clip back at that exact index.
const POD_ARRAY_AUDIO_COLUMNS = [
  'sentence_known_audio_ids',
  'sentence_audio_ids',
  'takeg_audio_ids',
]

// uuid columns holding a single clip. explainer_audio_id is deliberately NOT
// here: explainers were deprecated on 2026-08-24 and a dangling explainer clip
// is no longer damage anyone should be asked to fix. The column and its rows
// are untouched — they are simply not reported on.
const POD_SCALAR_AUDIO_COLUMNS = [
  'target_audio_id',
  'known_audio_id',
  'note_audio_id',
]

/**
 * What we can HONESTLY say about a dangling id. Deliberately not "deleted":
 * nothing in the schema distinguishes "the clip was deleted after this row was
 * written" from "this id was never a valid clip id". Both look identical from
 * here, so the payload says what it checked, not what it guesses.
 */
const MISSING_NOTE = 'The id in this slot does not match any live course_audio row. '
  + 'Nothing recorded distinguishes a clip that was deleted from an id that was never valid, '
  + 'so this is reported as "no live clip", not as "deleted".'

function isPresent (id) {
  return typeof id === 'string' && id.length > 0
}

/**
 * Every audio id referenced by a set of pod sentences, deduplicated. The caller
 * uses this to ask the database which of them still exist.
 * @param {object[]} sentences rows from listening_pod_sentences
 * @returns {string[]}
 */
function collectReferencedAudioIds (sentences) {
  const ids = new Set()
  for (const s of sentences || []) {
    for (const col of POD_ARRAY_AUDIO_COLUMNS) {
      for (const id of s[col] || []) if (isPresent(id)) ids.add(id)
    }
    for (const col of POD_SCALAR_AUDIO_COLUMNS) {
      if (isPresent(s[col])) ids.add(s[col])
    }
  }
  return [...ids]
}

/**
 * Enough of a sentence for a human to ACT on the flag: which course, which pod,
 * where in the pod, and the dialogue line itself so they can see what is dead.
 */
function sentenceAddress (sentence, pod) {
  return {
    courseCode: pod?.course_code || null,
    podId: sentence.pod_id,
    podTitle: pod?.title || null,
    podOrder: pod?.pod_order ?? null,
    sentenceId: sentence.id,
    globalOrder: sentence.global_order ?? null,
    sceneNumber: sentence.scene_number ?? null,
    sentenceNumber: sentence.sentence_number ?? null,
    speaker: sentence.speaker || null,
    targetText: sentence.target_text || null,
    knownText: sentence.known_text || null,
  }
}

/**
 * The scan.
 *
 * @param {object} input
 * @param {object[]} input.sentences  listening_pod_sentences rows
 * @param {Map|object} input.podsById listening_pods rows keyed by id
 * @param {Set<string>} input.liveAudioIds ids that resolve to a live course_audio row
 * @returns {{ slots: object[], byColumn: object[], totals: object, note: string }}
 */
function computeMissingSlots ({ sentences = [], podsById = new Map(), liveAudioIds = new Set() }) {
  const pods = podsById instanceof Map ? podsById : new Map(Object.entries(podsById))
  const slots = []

  // Every column gets a bucket up front, so a column with nothing wrong still
  // reports — a missing line and a zero line must never look the same.
  const buckets = new Map()
  for (const column of POD_ARRAY_AUDIO_COLUMNS) {
    buckets.set(column, { column, kind: 'array', referenced: 0, missing: 0, sentencesAffected: new Set(), unassignedSentences: 0, unassignedSlots: 0 })
  }
  for (const column of POD_SCALAR_AUDIO_COLUMNS) {
    buckets.set(column, { column, kind: 'scalar', referenced: 0, missing: 0, sentencesAffected: new Set(), unassignedSentences: 0, unassignedSlots: 0 })
  }

  for (const sentence of sentences) {
    const pod = pods.get(sentence.pod_id) || null
    const address = sentenceAddress(sentence, pod)

    for (const column of POD_ARRAY_AUDIO_COLUMNS) {
      const arr = sentence[column]
      const bucket = buckets.get(column)
      if (!Array.isArray(arr) || arr.length === 0) {
        bucket.unassignedSentences++
        continue
      }
      arr.forEach((audioId, index) => {
        if (!isPresent(audioId)) {
          // A hole INSIDE a populated array is its own fact: this line has some
          // clips but not this one. Counted apart from "the line has nothing in
          // this column at all", and apart from damage — a gap points at
          // nothing, it does not point at something that is gone.
          bucket.unassignedSlots++
          return
        }
        bucket.referenced++
        if (liveAudioIds.has(audioId)) return
        bucket.missing++
        bucket.sentencesAffected.add(sentence.id)
        slots.push({ ...address, column, kind: 'array', index, audioId })
      })
    }

    for (const column of POD_SCALAR_AUDIO_COLUMNS) {
      const audioId = sentence[column]
      const bucket = buckets.get(column)
      if (!isPresent(audioId)) {
        bucket.unassignedSentences++
        continue
      }
      bucket.referenced++
      if (liveAudioIds.has(audioId)) continue
      bucket.missing++
      bucket.sentencesAffected.add(sentence.id)
      slots.push({ ...address, column, kind: 'scalar', index: null, audioId })
    }
  }

  // Pod order, then position in the pod: the order a human would work through
  // them, and the order the learner would have hit them.
  slots.sort((a, b) =>
    (a.podOrder ?? 0) - (b.podOrder ?? 0)
    || String(a.podId).localeCompare(String(b.podId))
    || (a.globalOrder ?? 0) - (b.globalOrder ?? 0)
    || a.column.localeCompare(b.column)
    || (a.index ?? 0) - (b.index ?? 0))

  const byColumn = [...buckets.values()].map(b => ({
    column: b.column,
    kind: b.kind,
    referenced: b.referenced,
    missing: b.missing,
    sentencesAffected: b.sentencesAffected.size,
    unassignedSentences: b.unassignedSentences,
    unassignedSlots: b.unassignedSlots,
  }))

  return {
    slots,
    byColumn,
    totals: {
      sentencesScanned: sentences.length,
      slotsReferenced: byColumn.reduce((n, b) => n + b.referenced, 0),
      missing: slots.length,
      sentencesAffected: new Set(slots.map(s => s.sentenceId)).size,
      columnsScanned: byColumn.length,
    },
    note: MISSING_NOTE,
  }
}

module.exports = {
  POD_ARRAY_AUDIO_COLUMNS,
  POD_SCALAR_AUDIO_COLUMNS,
  MISSING_NOTE,
  collectReferencedAudioIds,
  computeMissingSlots,
}
