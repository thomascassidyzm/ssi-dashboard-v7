/**
 * takeg-clip-contract.cjs — what listening_pod_sentences.takeg_audio_ids MEANS.
 *
 * ONE PLACE, because two tools have to agree about it or the slicer carves the
 * wrong clip: tools/render-take-g.cjs writes `listening_pod_sentences.
 * takeg_audio_ids` with one entry per group, and tools/slice-take-g.cjs reads
 * `takeg_audio_ids[gi]` back by that same index. They each held their own copy
 * of this code until 2026-09-16.
 *
 * THE CONTRACT, stated once: `takeg_audio_ids[i]` is the Take G clip of group
 * `i` of this turn's units — EXCEPT that a turn holding exactly one clip and
 * more than one group is ONE WHOLE-TURN READ, and all of its units are that
 * clip's. That exception is the human booth: a recordist is shown the whole
 * gapped sentence and reads it once, seams and sentence breaks alike, so there
 * is one take covering everything. TTS renders per group and is unaffected.
 */
const SENTENCE_PUNCT = /[.!?…。！？؟]/

/** Units split at a sentence break that falls BETWEEN two of them. */
function atomGroups(targetText, atoms) {
  const text = targetText || ''
  const lower = text.toLowerCase()
  const groups = [[]]
  let cursor = 0
  for (let i = 0; i < atoms.length; i++) {
    const idx = lower.indexOf(String(atoms[i].target_surface || '').toLowerCase(), cursor)
    if (i > 0 && idx !== -1 && SENTENCE_PUNCT.test(text.slice(cursor, idx))) groups.push([])
    groups[groups.length - 1].push(atoms[i])
    if (idx !== -1) cursor = idx + String(atoms[i].target_surface || '').length
  }
  return groups.filter((g) => g.length)
}

function glueGroups(rawGroups) {
  const groups = []
  let carry = []
  rawGroups.forEach((g, i) => {
    // Only TURN-INITIAL one-unit groups (leading "Ciao!" interjections) glue
    // forward; a mid-turn one-unit group is a real sentence ("Impresioniran
    // sam.") and must stand alone — gluing it swallowed its known take.
    if (groups.length === 0 && g.length === 1 && i < rawGroups.length - 1) { carry.push(...g); return }
    groups.push([...carry, ...g])
    carry = []
  })
  if (carry.length) groups.push(carry)
  return groups
}

/**
 * The groups as the CLIPS ON THIS TURN divide it — the contract above. Pass the
 * turn's `takeg_audio_ids`; a single clip against several groups is one
 * whole-turn read and comes back as one group.
 */
function groupsForTakes(targetText, atoms, clipIds) {
  const groups = glueGroups(atomGroups(targetText, atoms))
  const ids = (Array.isArray(clipIds) ? clipIds : []).filter(Boolean)
  if (ids.length === 1 && groups.length > 1) return [groups.flat()]
  return groups
}

/**
 * The array to write when a HUMAN has just recorded a whole-turn gapped read.
 *
 * One entry, this clip: a booth take covers the entire turn, and the contract
 * above says a single clip is read as covering every group. Appending instead
 * (what the router did until 2026-09-16) silently claimed the new take was
 * GROUP 1's — the slicer would have carved the back half of the sentence out of
 * a take of all of it and left the front half pointed at the older clip.
 *
 * Nothing is deleted: the clip that was linked stays in course_audio, unlinked.
 */
function nextTakeGIds(existing, audioId) {
  const had = Array.isArray(existing) ? existing.filter(Boolean) : []
  if (had.length === 1 && had[0] === audioId) return had
  return [audioId]
}

module.exports = { SENTENCE_PUNCT, atomGroups, glueGroups, groupsForTakes, nextTakeGIds }
