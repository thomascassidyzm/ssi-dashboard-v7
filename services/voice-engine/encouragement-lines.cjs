/**
 * THE "ENCOURAGEMENTS" CARD — the learner app's spoken encouragements, read in Aran's own voice (Aran 2026-11-24).
 *
 * Aran, verbatim: "Any edits should then show in my recording booth under English on their own card - and in fact, once
 * we've built the editing function, we should start by having all the encouragements lined up for a fresh re-record as
 * a starting point." And: "The encouragement page should be the single source of truth for all the encouragements that
 * we use in courses for English speakers".
 *
 *   encouragement:<shared_audio.id>
 *
 * THE ONE SOURCE is the learner app's admin page /admin/encouragements, which writes `shared_audio` (the table every
 * player reads: audio_type 'instruction' = the fixed-order set by `sequence`, 'encouragement' = the random pool). This
 * card holds no list of its own: it reads those English rows (migration 20261124_encouragements_editor.sql in the
 * learning-app repo). Before it is applied no line can be owed (no drafts, no pending words, no take asked for), so the
 * card holds at most his own lines already recorded; if the read fails the card is simply absent, never a broken booth.
 *
 * WHICH LINES: every English line that is live or a draft (`<type>_draft`, no clip yet), never a hidden one
 * (`<type>_retired`). A line is OWED a take when it has no clip, has new words waiting (`pending_text`), or a fresh take
 * was asked for (`take_requested_at`). A line not owed counts as recorded when its clip is already in this voice
 * (slotFilledBy), so the card shows how far through the set he is. A line in another voice that nobody asked to
 * re-record is not on the card.
 *
 * THE WORDS read are the pending words if any, else the line's words. ORDER: the fixed-order set in the order learners
 * hear it, then the random pool alphabetically (its order means nothing to a learner).
 *
 * THE TAKE (recordist-router recordEncouragementTake) files as an English known clip of this voice through the same
 * upload seam as every known take (fileKnownWordsTake), then `planEncouragementSwap` decides how it reaches
 * shared_audio: a draft row is filled in place (its id was never served); a live row is REPLACED — a fresh row with a
 * new id carrying line_key and sequence, then the old row retired — so no phone can serve a cached old clip under new
 * words, and the old clip plays until the new row exists.
 *
 * Pure: no I/O.
 */
'use strict'

const { randomUUID } = require('crypto')

const ENCOURAGEMENT_PREFIX = 'encouragement:'
const ENCOURAGEMENT_KIND = 'encouragement'
/** The voices with an Encouragements card. Aran's English voice (Aran, 2026-11-24). */
const ENCOURAGEMENT_VOICES = Object.freeze(['human_aran_eng'])
/** A known take needs a course row to file under (the upload seam); this one is English-known and Aran's. */
const FILE_UNDER = 'cym_nv2_for_eng'
const MASTER_LANGUAGE = 'eng'
const KINDS = ['instruction', 'encouragement']
const READ_TYPES = [...KINDS, ...KINDS.map((k) => `${k}_draft`)]

function encouragementLineId(rowId) { return `${ENCOURAGEMENT_PREFIX}${rowId}` }

/** `encouragement:<uuid>` → {rowId}; null for anything else. */
function parseEncouragementLineId(lineId) {
  const raw = String(lineId || '')
  if (!raw.startsWith(ENCOURAGEMENT_PREFIX)) return null
  const rowId = raw.slice(ENCOURAGEMENT_PREFIX.length)
  return /^[0-9a-f-]{36}$/i.test(rowId) ? { rowId } : null
}

function spellingsOf(recordist) { return (recordist && (recordist.spellings || [recordist.voiceId])) || [] }

function hasCard(recordist) {
  return !!recordist && spellingsOf(recordist).some((v) => ENCOURAGEMENT_VOICES.includes(v))
}

const kindOf = (audioType) => (String(audioType).startsWith('instruction') ? 'instruction' : 'encouragement')
const isDraft = (row) => String(row.audio_type).endsWith('_draft') || !String(row.s3_key || '').trim()
const wordsOf = (row) => row.pending_text || row.text
const owed = (row) => isDraft(row) || !!row.pending_text || !!row.take_requested_at

/** The fixed-order set as a player orders it (sequence, nulls last, then id), then the pool alphabetically. */
function cardOrder(rows) {
  const fixed = rows.filter((r) => kindOf(r.audio_type) === 'instruction').sort((a, b) => {
    if (a.sequence == null && b.sequence != null) return 1
    if (b.sequence == null && a.sequence != null) return -1
    if (a.sequence != null && b.sequence != null && a.sequence !== b.sequence) return a.sequence - b.sequence
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
  const pool = rows.filter((r) => kindOf(r.audio_type) === 'encouragement').sort((a, b) => String(wordsOf(a)).localeCompare(String(wordsOf(b))))
  return [...fixed, ...pool]
}

/** A shared_audio row that is a line of this card, or null (wrong language, hidden, replaced). */
function isCardRow(row) {
  return !!row && row.language === MASTER_LANGUAGE && READ_TYPES.includes(row.audio_type) && !row.superseded_by
}

/**
 * This reader's Encouragements lines, queue-shaped.
 * @param {object} recordist {voiceId, spellings}
 * @param {object[]} rows shared_audio rows (English, live or draft)
 */
function encouragementLinesFor(recordist, rows = []) {
  if (!hasCard(recordist)) return []
  const spellings = spellingsOf(recordist)
  const mine = (r) => r.origin === 'human' && spellings.includes(r.voice_id)
  const onCard = rows.filter(isCardRow).filter((r) => owed(r) || mine(r))
  let fixedN = 0
  return cardOrder(onCard).map((r, i) => {
    const fixed = kindOf(r.audio_type) === 'instruction'
    if (fixed) fixedN += 1
    return {
      id: encouragementLineId(r.id),
      order: -800 + i,
      text: wordsOf(r),
      knownText: null,
      speaker: null,
      courseCode: FILE_UNDER,
      kind: ENCOURAGEMENT_KIND,
      role: 'known',
      voiceId: recordist.voiceId,
      duplicateOf: [],
      podId: null,
      podSlug: null,
      podTitle: 'Encouragements',
      readStyle: 'natural',
      // Recorded by slot alone: his clip already in the row and nothing asked of it. Never by words, so a fresh take of
      // unchanged words is still asked for.
      slotFilledBy: owed(r) ? [] : [r.voice_id],
      byWords: false,
      encouragement: {
        set: fixed ? 'In order' : 'Random',
        n: fixed ? fixedN : null,
        why: isDraft(r) ? 'new line' : (r.pending_text ? 'new words' : (r.take_requested_at ? 'fresh take' : null)),
        was: r.pending_text && !isDraft(r) ? r.text : null,
      },
    }
  })
}

/** The words a take must say for this line, if this reader has the card and the line is on it. */
function resolveEncouragementLine(row, recordist) {
  if (!hasCard(recordist) || !isCardRow(row)) return null
  return { courseCode: FILE_UNDER, rowId: row.id, text: wordsOf(row), role: 'known' }
}

const normalised = (t) => String(t).trim().toLowerCase()

/**
 * A TAKE OR A PLAYBACK OF A REPLACED LINE FOLLOWS IT. The card's line id is the row id it was read under; once a take
 * replaces that row, the id names a retired row whose `superseded_by` points at the live one. The booth may still hold
 * the old id (the take reply's clipUrl, a re-read straight after a take), so the router walks this chain before
 * resolving. Bounded: a loop in the data is never followed forever.
 */
const MAX_SUPERSEDE_HOPS = 8

/**
 * shared_audio's unique key is (text_normalized, language, audio_type) as of 2026-11-24. A replace inserts a live row
 * of the same type beside the one it retires, so a fresh take of UNCHANGED words collides with it (23505) until that
 * key leaves the encouragement types out. The router answers that plainly rather than as a bare database error.
 */
function isUniqueClash(error) {
  return !!error && (error.code === '23505' || /unique_shared_audio|duplicate key/i.test(String(error.message || '')))
}

/**
 * How a filed take reaches shared_audio. Returns the writes in the order they must run.
 * @param {object} row the shared_audio row the take is for (re-read at take time)
 * @param {{s3Key:string, durationMs:number|null}} clip the filed clip (course_audio row of the take)
 * @param {object} recordist
 */
function planEncouragementSwap(row, clip, recordist, now = new Date().toISOString()) {
  const kind = kindOf(row.audio_type)
  const words = wordsOf(row)
  const by = `booth:${recordist.voiceId}`
  const filled = {
    text: words, text_normalized: normalised(words), audio_type: kind, s3_key: clip.s3Key, duration_ms: clip.durationMs ?? null,
    voice_id: recordist.voiceId, origin: 'human', pending_text: null, take_requested_at: null, updated_at: now, updated_by: by,
  }
  if (isDraft(row)) {
    // Never served: filled in place, guarded on still being that draft.
    return { mode: 'fill-draft', update: { id: row.id, whereType: row.audio_type, set: filled } }
  }
  const newId = randomUUID()
  return {
    mode: 'replace',
    newId,
    // INSERT FIRST, RETIRE SECOND: the worst moment is one duplicate line, never a missing one.
    insert: { id: newId, line_key: row.line_key || row.id, language: MASTER_LANGUAGE, sequence: row.sequence ?? null, ...filled },
    retire: { id: row.id, whereType: row.audio_type, set: { audio_type: `${kind}_retired`, superseded_by: newId, updated_at: now, updated_by: by } },
  }
}

module.exports = {
  ENCOURAGEMENT_PREFIX, ENCOURAGEMENT_KIND, ENCOURAGEMENT_VOICES, FILE_UNDER, MASTER_LANGUAGE, READ_TYPES,
  MAX_SUPERSEDE_HOPS, encouragementLineId, parseEncouragementLineId, hasCard, isCardRow, isDraft, encouragementLinesFor,
  resolveEncouragementLine, planEncouragementSwap, isUniqueClash,
}
