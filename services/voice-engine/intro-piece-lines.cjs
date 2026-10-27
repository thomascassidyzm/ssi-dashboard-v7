/**
 * THE "INTRO PIECES" CARD — the once-recorded fragments a human-spliced LEGO intro is built from
 * (Aran, 2026-10-27, job #210: cym_nv2/sv2 intros in his own English voice, spliced from "The Welsh for" + his English
 * LEGO take + "is" + the Welsh). Which voice reads which words is data (voicing-policy humanSplicedIntros, read through
 * services/shared/human-intro-splice.cjs); this file turns it into booth lines and files their takes.
 *
 *   intropiece:<courseCode>:<fragment|joiner>
 *
 * One line per distinct wording, filed under the first course that uses it: a take is a clip of THIS voice with these
 * English words, and the splice finds it by voice and words in any course, so North and South share one recording.
 * A take files as role 'known' (English, his language) through the ordinary booth upload; it fills no LEGO slot itself.
 * Recorded = this voice has any English take of these words (knownByText), the same test every known line uses.
 */
'use strict'

const humanIntro = require('../shared/human-intro-splice.cjs')

const INTRO_PIECE_PREFIX = 'intropiece:'
const PIECE_KEYS = ['fragment', 'joiner']

function introPieceLineId(courseCode, key) { return `${INTRO_PIECE_PREFIX}${courseCode}:${key}` }

/** `intropiece:<courseCode>:<key>` → {courseCode, key}; null for anything else. */
function parseIntroPieceLineId(lineId) {
  const raw = String(lineId || '')
  if (!raw.startsWith(INTRO_PIECE_PREFIX)) return null
  const rest = raw.slice(INTRO_PIECE_PREFIX.length)
  const at = rest.lastIndexOf(':')
  if (at <= 0) return null
  const courseCode = rest.slice(0, at)
  const key = rest.slice(at + 1)
  if (!PIECE_KEYS.includes(key)) return null
  return { courseCode, key }
}

/**
 * The words a parsed line stands for, if this recordist is the voice that course's intros are made from. Null = not
 * theirs (or not a configured course): the take route answers 404, never files.
 */
function resolveIntroPiece(parsed, recordist, table) {
  if (!parsed || !recordist) return null
  const cfg = humanIntro.humanIntroConfig(parsed.courseCode, table)
  if (!cfg || !(recordist.spellings || [recordist.voiceId]).includes(cfg.voiceId)) return null
  const text = cfg[parsed.key]
  return text ? { courseCode: cfg.courseCode, key: parsed.key, text } : null
}

/**
 * This recordist's intro-piece lines, queue-shaped (finishQueue scores them; they sit at the front of the queue). A
 * cast-only reader (castCourses) is offered them only for intro courses it is actually cast on.
 */
function introPieceLinesFor(recordist, table) {
  const cast = Array.isArray(recordist.castCourses) ? new Set(recordist.castCourses) : null
  return humanIntro.fixedPiecesFor(recordist.spellings || [recordist.voiceId], table)
    .map((p) => ({ ...p, courseCodes: cast ? p.courseCodes.filter((c) => cast.has(c)) : p.courseCodes }))
    .filter((p) => p.courseCodes.length)
    .map((p, i) => ({
      id: introPieceLineId(p.courseCodes[0], p.key),
      order: -1000 + i,
      text: p.text,
      knownText: null,
      speaker: null,
      courseCode: p.courseCodes[0],
      kind: 'intro',
      role: 'known',
      knownByText: true,
      voiceId: recordist.voiceId,
      duplicateOf: [],
      podId: null,
      podSlug: null,
      podTitle: null,
      readStyle: 'natural',
    }))
}

module.exports = { INTRO_PIECE_PREFIX, introPieceLineId, parseIntroPieceLineId, resolveIntroPiece, introPieceLinesFor }
