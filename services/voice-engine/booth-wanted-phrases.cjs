/**
 * booth-wanted-phrases.cjs — ONE NAMED LIVE PRACTICE-PHRASE SLOT, put on ONE voice's booth by hand.
 *
 * Kai, 2026-11-23 18:02Z (cs #907, after forum t/42492/183 and cs #903·AK): "Dan records it. He
 * does record practice phrases, there are a bunch in his queue." The phrase is cym_s_for_eng
 * S0114L01U16, "wnest ti wylio’r ffilm ’na?". Its male clip was a January legacy-import mislabel
 * (f78e7f05 says S0202L01B07's sentence) and was unlinked by #899·AK, so the slot is EMPTY and the
 * new app drops the phrase.
 *
 * WHY A LIST IN CODE, NOT THE PHRASE PLAN OR A RE-QUEUE GRANT:
 *   - Live cym_n / cym_s practice phrases are never in the booth's phrase plan (phrase-queue.cjs
 *     PHRASE_QUEUE_COURSES holds only the sandboxes and Frisian), and widening that would put
 *     thousands of live lines on booths. The phrases on Dan's booth are cym_sv2_for_eng's.
 *   - cym_sv2_for_eng's copy of this phrase carries the SAME legacy clips (target1 e549b9be, target2
 *     empty) and sv2 casts target2 to Eleri, so no sandbox line of these words ever reaches Dan.
 *   - A re-queue grant (rerecord_wanted.requeue_for, recordist-queue requeueGrant) hangs off a CLIP;
 *     this slot has none.
 * So the grant is this list: each entry names a phrase row, the slot, the voice, and the exact words.
 *
 * WHICH SLOT: in the legacy cym_s_for_eng phrase rows target1 is the FEMALE take and target2 the MALE
 * one (this row: target1 = e549b9be female legacy; the mislabelled male f78e7f05 sat in target2).
 * The booth's seed cast puts Dan on cym_s target1 (welsh-seed-queues-588), which is why the take
 * route's cast check is bypassed for exactly the slot named here, and nothing else.
 *
 * THE RULES, each enforced where it is used:
 *   - SERVED only while the row still says these words and the slot is EMPTY (not recorded) or holds
 *     this voice's own clip (recorded). A slot holding anybody else's clip is not served at all.
 *   - LINKED fill-only: recordPhraseTake → linkPhraseTake updates `<slot> IS NULL` only, so a slot
 *     that filled meanwhile is never overwritten, and nothing is deleted.
 *   - The grant lapses by itself if the row's words change (wantedFor compares spoken words).
 * Reversible: delete the entry. Its take stays a clip; the slot keeps it unless someone unlinks it.
 *
 * Pure: no I/O. recordist-queue.cjs reads the rows; recordist-router.cjs asks wantedFor.
 */
'use strict'

const { spokenWordsKey } = require('../shared/spoken-words.cjs')

const WANTED_KIND = 'wantedphrase'

const WANTED_PHRASE_SLOTS = Object.freeze([
  Object.freeze({
    phraseId: 'cym_s_for_eng:S0114L01U16',
    courseCode: 'cym_s_for_eng',
    role: 'target2',
    voiceId: 'human_dan_cym_s',
    text: 'wnest ti wylio’r ffilm ’na?',
    why: 'Kai 2026-11-23 18:02Z: Dan records it (forum t/42492/183; slot emptied by #899·AK; cs #907)',
  }),
])

function isWantedVoice(want, spellings) {
  return (spellings || []).includes(want.voiceId)
}

/** The entry granting this reader this phrase slot, while the row still says its words; else null. */
function wantedFor({ phraseId, role, spellings, rowText }, wants = WANTED_PHRASE_SLOTS) {
  const want = wants.find((w) => w.phraseId === phraseId && w.role === role && isWantedVoice(w, spellings))
  if (!want) return null
  if (rowText !== undefined && spokenWordsKey(rowText) !== spokenWordsKey(want.text)) return null
  return want
}

/** Every entry for this reader. */
function wantsForVoice(spellings, wants = WANTED_PHRASE_SLOTS) {
  return wants.filter((w) => isWantedVoice(w, spellings))
}

/**
 * The booth lines, in finishQueue's input shape. `rowsById` holds the phrase rows (id, seed_number,
 * known_text, target_text, <role>_audio_id); `voiceOfClip` maps a slot's clip id to its voice_id.
 * The line id is a phrase line id, so a take goes through recordPhraseTake.
 */
function wantedPhraseLinesFor(recordist, { rowsById = new Map(), voiceOfClip = new Map() } = {}, wants = WANTED_PHRASE_SLOTS) {
  const spellings = recordist.spellings || [recordist.voiceId]
  const out = []
  for (const w of wantsForVoice(spellings, wants)) {
    const row = rowsById.get(w.phraseId)
    if (!row || !wantedFor({ phraseId: w.phraseId, role: w.role, spellings, rowText: row.target_text }, wants)) continue
    const held = row[`${w.role}_audio_id`] || null
    const holder = held ? (voiceOfClip.get(held) || 'other') : null
    if (holder && !spellings.includes(holder)) continue
    out.push({
      id: `phrase:${w.phraseId}:${w.role}`,
      order: 0,
      seedOrder: 0,
      text: row.target_text,
      knownText: row.known_text || null,
      speaker: null,
      courseCode: w.courseCode,
      voiceId: recordist.voiceId,
      duplicateOf: [],
      kind: WANTED_KIND,
      role: w.role,
      seedNumber: row.seed_number || null,
      // Recorded by THIS SLOT only: a take of the words that never reached the slot is not done.
      slotFilledBy: holder ? [holder] : [],
      byWords: false,
      readStyle: 'natural',
      rerecordWanted: false,
    })
  }
  return out
}

module.exports = { WANTED_KIND, WANTED_PHRASE_SLOTS, wantedFor, wantsForVoice, wantedPhraseLinesFor }
