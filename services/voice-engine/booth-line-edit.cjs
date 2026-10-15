/**
 * booth-line-edit.cjs — THE RULES behind "Edit this line" in the booth (Aran, 2026-10-15, job #709).
 *
 * Aran: "I need a way, just for me, to edit a sentence in the recording tool if I'm not happy with
 * it." The words of a seed, LEGO or practice phrase are COURSE content, so the booth never writes
 * them itself: booth-line-edit-router.cjs sends the edit to Popty's one course-edit door
 * (POST /api/production/:course/edit-batch — one transaction, a dry run unless "apply": true, a
 * derived undo). This file holds the decisions, pure, so a test can pin each one:
 *
 *   - WHICH COURSES. Only the Welsh relaunch sandboxes. A live course's seeds reach real learners,
 *     so its lines are shown read-only with "editing live courses: ask Tom".
 *   - WHICH LINES. A seed, a LEGO or a practice phrase: each is one row the door can update. A pod
 *     line has its own edit (the artist's own, recordist-router PATCH …/text); a minimal-set piece
 *     or a Take G read is a span of another row, with no text of its own.
 *   - ARAN'S RE-RECORD RULE. If the spoken WORDS change, every take of the line goes back on the
 *     queues. If only capitals or punctuation change, the takes are kept. The door's own trigger
 *     (null_*_audio_on_text_change) already keeps a take across a casing or TRAILING-punctuation
 *     change and unlinks it otherwise, which puts the line back on that voice's queue. It does NOT
 *     keep a take across an INSIDE-the-line punctuation change ("Bore da, Aran" → "Bore da Aran"),
 *     so for an edit that moves no word this file adds, in the SAME door transaction, an
 *     `audio.link` putting each linked take straight back (allow_text_mismatch — the take says the
 *     same words, only the commas moved).
 */

'use strict'

const { parseSeedLineId, parseLegoLineId } = require('./recordist-queue.cjs')
const { parsePhraseLineId } = require('./phrase-queue.cjs')

/**
 * The courses this editor writes to. Aran, 2026-10-15: "ONLY the new relaunch courses for now".
 * Its own list on purpose, not borrowed from the LEGO queue's: widening the booth's queue must
 * never quietly widen who can rewrite a course.
 */
const LINE_EDIT_COURSES = Object.freeze(['cym_nv2_for_eng', 'cym_sv2_for_eng'])
const LIVE_COURSE_NOTE = 'editing live courses: ask Tom'

const isEditableCourse = (courseCode) => LINE_EDIT_COURSES.includes(String(courseCode || ''))

/** Which row a booth line stands for: { kind, table, rowId, role } or null when it has no row. */
function lineTarget(lineId) {
  const seed = parseSeedLineId(lineId)
  if (seed) return { kind: 'seed', table: 'course_seeds', rowId: seed.seedId, role: seed.role }
  const lego = parseLegoLineId(lineId)
  if (lego) return { kind: 'lego', table: 'course_legos', rowId: lego.legoRowId, role: lego.role }
  const phrase = parsePhraseLineId(lineId)
  if (phrase) return { kind: 'phrase', table: 'course_practice_phrases', rowId: phrase.phraseId, role: phrase.role }
  return null
}

/** The spoken words of a line: case, punctuation and spacing are not words (Aran's rule). */
function spokenWords(text) {
  return String(text || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[\p{P}\p{S}]+/gu, (m) => (m.includes("'") ? "'" : ' '))
    .replace(/\s+/g, ' ')
    .trim()
}
const wordsChanged = (before, after) => spokenWords(before) !== spokenWords(after)

/** The audio slots each side of a row owns. */
const SIDE_SLOTS = { target: ['target1', 'target2'], known: ['known'] }

/**
 * The door ops for one edit. `row` is the row as read now; `next` = { targetText?, knownText? }.
 * Returns { ops, changes: [{ side, before, after, wordsChanged }] }. No change → ops is empty.
 */
function buildOps(kind, row, next) {
  const changes = []
  const set = {}
  const expect = {}
  for (const [side, col, val] of [['target', 'target_text', next.targetText], ['known', 'known_text', next.knownText]]) {
    if (typeof val !== 'string') continue
    const after = val.trim()
    const before = String(row[col] || '').trim()
    if (!after || after === before) continue
    set[col] = after
    expect[col] = row[col]
    changes.push({ side, before, after, wordsChanged: wordsChanged(before, after) })
  }
  if (!changes.length) return { ops: [], changes }

  const key = kind === 'seed' ? { seed_number: row.seed_number }
    : kind === 'lego' ? { id: row.id }
      : { phrase_id: row.id }
  const ops = [{ op: `${kind}.update`, ...key, set, expect }]

  // ARAN'S RULE, the half the trigger does not do: same words, so every take that is linked now
  // stays linked. A no-op when the trigger kept it anyway.
  for (const c of changes) {
    if (c.wordsChanged) continue
    for (const slot of SIDE_SLOTS[c.side]) {
      const audioId = row[`${slot}_audio_id`]
      if (!audioId) continue
      ops.push({ op: 'audio.link', target: kind, ...key, slot, audio_id: audioId, allow_text_mismatch: true })
    }
  }
  return { ops, changes }
}

/**
 * What the edit does to the recordings, read off the door's own dry run (its `before`/`after` for
 * the row include every audio slot, trigger effects and all). One entry per slot that held a take.
 * fate: 'kept' | 'requeued' (unlinked: back on that voice's queue) | 'repointed' (linked to an
 * existing take of the new words in the same voice).
 */
function recordingFates(doorResults) {
  // Every op of one line edit touches the same row: the text update, then any audio.link after it.
  const res = (doorResults || []).filter((r) => r && r.before && r.after)
  if (!res.length) return []
  // The row's final state is the LAST result touching it (an audio.link after the text update).
  const first = res[0].before
  const last = res[res.length - 1].after
  const out = []
  for (const slot of ['target1', 'target2', 'known']) {
    const col = `${slot}_audio_id`
    const was = first[col]
    if (!was) continue
    const now = last[col]
    out.push({ slot, audioId: was, fate: now === was ? 'kept' : (now ? 'repointed' : 'requeued'), nowAudioId: now || null })
  }
  return out
}

/** The words for one fate, the way the booth shows them. */
function fateWords(f) {
  const who = f.slot === 'known' ? 'the English take' : `the ${f.slot === 'target1' ? 'first' : 'second'} Welsh voice's take`
  if (f.fate === 'kept') return `${who} is kept`
  if (f.fate === 'repointed') return `${who} moves to a take that already says the new words`
  return `${who} goes back on the recording queue`
}

module.exports = {
  LINE_EDIT_COURSES,
  LIVE_COURSE_NOTE,
  isEditableCourse,
  lineTarget,
  spokenWords,
  wordsChanged,
  buildOps,
  recordingFates,
  fateWords,
}
