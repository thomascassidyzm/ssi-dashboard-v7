/**
 * Course editor — the PURE half (job #116·AK, Aran 2026-11-21). Turns one proposed change to a LEGO or a practice
 * phrase into the edit-door ops (services/shared/course-edit-ops.cjs) that make it real. No I/O: the router reads the
 * live row and its clips, this decides, the door runs it in one transaction.
 *
 * ARAN'S AUDIO RULE. If only capitals or punctuation change, the spoken words are the same, so the recording stays:
 *   RELABEL  the clip belongs to this course and no OTHER row links it: audio.update its text FIRST, then the row — the
 *            null_*_audio_on_text_change trigger then sees a clip that matches the new text and keeps the link;
 *   RELINK   the clip belongs to another course, or another row also plays it: its text is not ours to move, so the row
 *            is edited and audio.link puts the same clip straight back (allow_text_mismatch) in the same batch.
 *   A LEGO's presentation clip ("the Korean for … is …") can be dropped by the same trigger: re-linked the same way.
 * If the words change, nothing is relinked: the trigger empties the slot and the caller queues an audio pass (TTS
 * course) or the booth's Re-record card picks the orphan up (human-voice course). Reference for the shape:
 * tools/course-optimization/welsh-question-marks-apply.cjs.
 *
 * Every row op carries `expect` (old texts + audio ids), every relabel `expect`s the clip's old text: if the live course
 * moved since the change was proposed, the door aborts the whole transaction and the proposal is reported stale.
 */
'use strict'

const SIDE_SLOTS = { known: ['known'], target: ['target1', 'target2'] }
const AUDIO_COLS = ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id']

/**
 * The spoken words of a line, for deciding "same words?": lower case, every punctuation mark and symbol dropped,
 * whitespace collapsed. Deliberately looser than normalize_text() (shared/text-normalize.cjs), which keeps a trailing
 * '?' in a clip's KEY: adding a question mark changes the key but not the words, and Aran's ruling keeps the take
 * (welsh-question-marks, 2026-10). The relabel below moves the clip's key with the row, so the looser test is safe.
 */
/**
 * WORD-INTERNAL MARKS JOIN, THEY DO NOT SPLIT (Astra #120·AK, fix #121·AK). An apostrophe (straight ' or curly ’ ‘ ʼ)
 * or a hyphen (- ‐ ‑) with a letter or digit on BOTH sides is part of one spoken word, so it is dropped with no space:
 * "don't" = "dont", "well-known" = "wellknown". Without this, "don't" became "don t" and a good take was thrown on the
 * re-record list. Every other mark — and an apostrophe/hyphen at a word's edge — still separates words below.
 */
const WORD_INTERNAL_MARK = /(?<=[\p{L}\p{N}])['\u2018\u2019\u02BC\-\u2010\u2011]+(?=[\p{L}\p{N}])/gu
const joinWordInternalMarks = (s) => s.replace(WORD_INTERNAL_MARK, '')

function spokenForm(text) {
  return joinWordInternalMarks(String(text || '').toLowerCase()).replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim()
}
const sameWords = (a, b) => spokenForm(a) === spokenForm(b)

/** What a proposed edit changes, per side: null (untouched), 'text-only' or 'words'. */
function classify(before, after) {
  const out = {}
  for (const side of ['known', 'target']) {
    const b = before[side], a = after[side]
    out[side] = a == null || a === b ? null : sameWords(a, b) ? 'text-only' : 'words'
  }
  return out
}

/**
 * The ops for one proposal against the LIVE row.
 *   kind     'lego' | 'phrase'
 *   action   'edit' | 'remove'
 *   key      lego_id (S0001L02) or the full phrase id (kor_for_eng:S0001L02B01)
 *   live     the live row: { known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id }
 *   after    { known, target } for an edit
 *   clips    Map audio_id -> { course_code, text, otherLinks } for every clip the row links (otherLinks = rows other than
 *            this one that link the clip)
 * Returns { ops, change, plan: [{ slot, audio_id, how }] }.
 */
function buildOps({ courseCode, kind, action, key, live, after, clips }) {
  const target = kind === 'lego' ? { lego_id: key } : { phrase_id: key }
  const expect = { known_text: live.known_text, target_text: live.target_text }
  if (action === 'remove') {
    if (kind === 'lego') return { ops: [{ op: 'lego.delete', ...target, cascade_phrases: true, expect }], change: null, plan: [] }
    return { ops: [{ op: 'phrase.delete', ...target, expect }], change: null, plan: [] }
  }
  if (action !== 'edit') throw new Error(`unknown action ${action}`)
  const change = classify({ known: live.known_text, target: live.target_text }, after)
  if (!change.known && !change.target) throw new Error('nothing changes')
  const set = {}
  if (change.known) set.known_text = after.known
  if (change.target) set.target_text = after.target
  const rowExpect = { ...expect }
  for (const c of AUDIO_COLS) if (c in live) rowExpect[c] = live[c] ?? null

  const relabels = [], relinks = [], plan = []
  for (const side of ['known', 'target']) {
    if (change[side] !== 'text-only') continue
    const newText = side === 'known' ? after.known : after.target
    for (const slot of SIDE_SLOTS[side]) {
      const id = live[`${slot}_audio_id`]
      if (!id) continue
      const clip = clips.get(id)
      const ours = clip && clip.course_code === courseCode && !clip.otherLinks
      if (ours && !relabels.some((r) => r.audio_id === id)) {
        relabels.push({ op: 'audio.update', audio_id: id, set: { text: newText }, expect: { text: clip.text } })
        plan.push({ slot, audio_id: id, how: 'relabel' })
      } else if (ours) {
        plan.push({ slot, audio_id: id, how: 'relabel' })
      } else {
        relinks.push({ op: 'audio.link', target: kind, ...target, slot, audio_id: id, allow_text_mismatch: true })
        plan.push({ slot, audio_id: id, how: clip ? 'relink' : 'relink-unknown-clip' })
      }
    }
  }
  // The presentation clip speaks the LEGO's words inside a framing sentence; a text-only change keeps it.
  if (kind === 'lego' && change.target === 'text-only' && live.presentation_audio_id) {
    relinks.push({ op: 'audio.link', target: 'lego', ...target, slot: 'presentation', audio_id: live.presentation_audio_id })
    plan.push({ slot: 'presentation', audio_id: live.presentation_audio_id, how: 'relink' })
  }
  const rowOp = { op: kind === 'lego' ? 'lego.update' : 'phrase.update', ...target, set, expect: rowExpect }
  return { ops: [...relabels, rowOp, ...relinks], change, plan }
}

/** True when the change leaves a slot needing NEW audio (the spoken words of some side changed). */
const needsNewAudio = (change) => !!change && (change.known === 'words' || change.target === 'words')

/** The door's refusal codes that mean "the live course is not what was proposed against". */
const DRIFT_CODES = new Set(['DRIFT', 'NOT_FOUND'])
const isDrift = (body) => !!body && DRIFT_CODES.has(body.code)

module.exports = { spokenForm, sameWords, classify, buildOps, needsNewAudio, isDrift, AUDIO_COLS }
