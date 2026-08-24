/**
 * split-audio-inheritance.cjs — the one rule about a pod row's three NON-whole-turn
 * split-array audio slots, and the two functions that enforce it.
 *
 * THE RULE (2026-08-24, from the ita_for_eng pod-1 scene-15 incident):
 *
 *   Split audio belongs to a row's TEXT, never to its SLOT. It may be carried
 *   forward only where the text it was rendered against is byte-identical. Where
 *   it cannot be carried, the correct value is NULL — the player then falls back
 *   to the whole-turn clip, which is verified.
 *
 * WHY. A `listening_pod_sentences` row has five audio slots this module covers:
 *
 *   target_audio_id  known_audio_id                 <- the whole turn
 *   sentence_audio_ids  sentence_known_audio_ids    <- per-sentence split clips
 *   takeg_audio_ids                                 <- take-G groups
 *
 * (A sixth column, explainer_audio_id, was covered here until the pod-sentence
 * explainer narration track was deprecated 2026-08-24 — Tom: "Explainers do not
 * exist anymore." It is no longer measured, carried or repaired by this module;
 * the column and its clips are untouched, simply unvisited.)
 *
 * When pod-1 was staged for the 22-course fleet, the whole-turn columns were
 * re-derived at each slot but the split arrays were left standing — so a slot
 * whose conversation had been replaced kept the RETIRED pod's clips. The scene
 * running order had changed (pod-0 scene 15 became pod-1 scene 22), so 91 of 141
 * ita rows played, and — because `podSentenceSplit` takes the on-screen text from
 * the clip's own `course_audio.text` — DISPLAYED a different conversation, in the
 * retired pod's cast. Full account:
 * docs/pods/ita-pod1-scene15-two-female-voices-rootcause-2026-08-24.md.
 *
 * Nothing here touches a database. It is deliberately pure so the rule can be
 * unit-tested without a pod, and so the same definition is shared by the tool that
 * clones a pod, the tool that re-aligns one to a new canon, and the gate that
 * refuses to promote one.
 */
'use strict'

/** The three split-array slots, and which TEXT each one is rendered against. */
const SPLIT_AUDIO_SLOTS = [
  { field: 'sentence_audio_ids', side: 'target', scalar: false },
  { field: 'sentence_known_audio_ids', side: 'known', scalar: false },
  { field: 'takeg_audio_ids', side: 'target', scalar: false },
]

const SPLIT_AUDIO_FIELDS = SPLIT_AUDIO_SLOTS.map(s => s.field)

/** Byte-identical, with null/undefined and '' treated as the same "no text" value. */
const sameText = (a, b) => String(a == null ? '' : a) === String(b == null ? '' : b)

/** uuid[] equality. Two empty/absent arrays are equal; order is significant. */
function sameArray (a, b) {
  const A = Array.isArray(a) ? a : []
  const B = Array.isArray(b) ? b : []
  if (A.length !== B.length) return false
  return A.every((v, i) => String(v) === String(B[i]))
}

/** True when the slot on `row` actually holds something. */
function slotOccupied (row, slot) {
  const v = row ? row[slot.field] : null
  return slot.scalar ? v != null : Array.isArray(v) && v.filter(Boolean).length > 0
}

/**
 * The three slot values a row should end up with, given the row it is derived FROM.
 *
 * @param {object|null} source  the row the split clips were rendered against (null = none)
 * @param {object} desired      the row as it will be written: `target_text` / `known_text`
 * @param {object} [carry]      `{target, known}` — an authoritative decision from a
 *                              caller that has already diffed the two canons, used
 *                              INSTEAD of comparing text here. A caller that knows
 *                              the side is not carried must say so rather than rely
 *                              on a text comparison, because two blank texts compare
 *                              equal and would carry an array onto an empty slot.
 * @returns {object}            `{sentence_audio_ids, sentence_known_audio_ids,
 *                                takeg_audio_ids}` — carried or null
 *
 * A slot is carried only when the text on the side it belongs to is byte-identical
 * between `source` and `desired`. Everything else is NULL, on purpose: null is a
 * verified fallback, a stale array is a different conversation.
 */
function carrySplitAudio (source, desired, carry) {
  const targetSame = !!source && (carry
    ? !!carry.target
    : sameText(source.target_text, desired.target_text))
  const knownSame = !!source && (carry
    ? !!carry.known
    : sameText(source.known_text, desired.known_text))
  const out = {}
  for (const slot of SPLIT_AUDIO_SLOTS) {
    const ok = slot.side === 'target' ? targetSame
      : slot.side === 'known' ? knownSame
        : targetSame && knownSame
    out[slot.field] = ok && source[slot.field] != null ? source[slot.field] : null
  }
  return out
}

/**
 * THE GATE. Find rows on `newRows` whose split audio is byte-identical to the row
 * occupying the SAME (scene_number, sentence_number) slot on `oldRows`, while the
 * text at that slot has changed. That is the exact signature of the ita defect and
 * it needs no text heuristics — so it is script-safe, which a substring test is not
 * (the first blast-radius pass read 0% for jpn/zho purely because it stripped
 * non-Latin script).
 *
 * @returns {Array<{id, scene_number, sentence_number, field, side, changed}>}
 *          one finding per offending slot; `changed` names which side's text moved.
 */
function findInheritedSplitAudio (oldRows, newRows) {
  const key = (r) => `${r.scene_number}|${r.sentence_number}`
  const old = new Map((oldRows || []).map(r => [key(r), r]))
  const findings = []
  for (const r of newRows || []) {
    const prev = old.get(key(r))
    if (!prev) continue
    const targetMoved = !sameText(prev.target_text, r.target_text)
    const knownMoved = !sameText(prev.known_text, r.known_text)
    if (!targetMoved && !knownMoved) continue
    for (const slot of SPLIT_AUDIO_SLOTS) {
      if (!slotOccupied(r, slot)) continue
      const identical = slot.scalar
        ? String(r[slot.field]) === String(prev[slot.field])
        : sameArray(r[slot.field], prev[slot.field])
      if (!identical) continue
      const moved = slot.side === 'target' ? targetMoved
        : slot.side === 'known' ? knownMoved
          : targetMoved || knownMoved
      if (!moved) continue
      findings.push({
        id: r.id,
        scene_number: r.scene_number,
        sentence_number: r.sentence_number,
        field: slot.field,
        side: slot.side,
        changed: [targetMoved && 'target_text', knownMoved && 'known_text'].filter(Boolean).join('+'),
      })
    }
  }
  return findings
}

module.exports = {
  SPLIT_AUDIO_SLOTS,
  SPLIT_AUDIO_FIELDS,
  carrySplitAudio,
  findInheritedSplitAudio,
  sameText,
  sameArray,
}
