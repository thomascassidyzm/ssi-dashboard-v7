/**
 * THE "ENGLISH LEGOs" CARDS — the English (known) side of every new LEGO whose intro is spliced from the reader's own
 * voice (Aran, 2026-10-27, job #255; follow-on from job #210). An intro of cym_nv2_for_eng / cym_sv2_for_eng is
 * "The Welsh for" + HIS English take of the LEGO + "is" + the Welsh (services/shared/human-intro-splice.cjs), so every
 * new LEGO still waiting on its intro needs one English take of its words — and on 27 Oct about 685 North and 963
 * South of them were in no card at all.
 *
 *   englego:<course_legos.id>
 *
 * WHICH LEGOs: of a humanSplicedIntros course whose voice is this reader, `is_new`, with known words, and whose intro is
 * not yet made by anyone else (presentation_audio_id empty, or held by an intro of THIS voice — so a LEGO stays on its
 * card, counted recorded, once its intro is built, rather than shrinking the card).
 *
 * NEVER ASKED TWICE (job #198's spoken-words key, shared/spoken-words.cjs): a LEGO whose English is the same spoken
 * words as a seed or practice phrase of these courses is already on that card and is left off this one; North and
 * South LEGOs of the same words are ONE line, filed on the first course's card (config order: North), whose take
 * serves both. Recorded = this voice has any English take of the words (knownByText) — so anything he has already
 * read, on any card, counts here too.
 *
 * Wire kind 'lego', role 'known': the booth's LEGO card (booth-home trackKeyOf `lego.<courseCode>`, batches of 100,
 * ticks, Up next) is the card, one per course, exactly as Dan's and Eleri's Welsh LEGO cards. The take files as an
 * English known take of this voice and fills no LEGO slot itself: the intro splice finds it by voice and words.
 *
 * Pure: no I/O. The reads are recordist-queue fetchEnglishLegoInputs.
 *
 * SPLICE-ONLY, SO OFF WITH THE SPLICE (Aran, 2026-10-29, job #587): these takes exist only to be spliced into an intro.
 * He now reads each intro whole (intro-sentence-lines.cjs), so a course with `splice: false` lists no English LEGO lines.
 * The take route still RESOLVES them (englishLegoCoursesFor with { listing: false }), so a take already on his phone's
 * shelf for one of these lines files rather than being refused 404.
 */
'use strict'

const humanIntro = require('../shared/human-intro-splice.cjs')
const { spokenWordsKey } = require('../shared/spoken-words.cjs')

const ENGLISH_LEGO_PREFIX = 'englego:'

function englishLegoLineId(legoRowId) { return `${ENGLISH_LEGO_PREFIX}${legoRowId}` }

/** `englego:<rowId>` → {legoRowId}; null for anything else. */
function parseEnglishLegoLineId(lineId) {
  const raw = String(lineId || '')
  if (!raw.startsWith(ENGLISH_LEGO_PREFIX)) return null
  const legoRowId = raw.slice(ENGLISH_LEGO_PREFIX.length)
  return legoRowId && !legoRowId.includes(':') ? { legoRowId } : null
}

/**
 * The intro courses this reader's English LEGOs are for, in config order (North first), cast-filtered. Listing (the
 * card) needs the splice on; resolving a take does not.
 */
function englishLegoCoursesFor(recordist, table, { listing = true } = {}) {
  const cast = Array.isArray(recordist.castCourses) ? new Set(recordist.castCourses) : null
  return humanIntro.humanIntroCoursesFor(recordist.spellings || [recordist.voiceId], table)
    .filter((c) => !listing || c.splice)
    .map((c) => c.courseCode)
    .filter((c) => !cast || cast.has(c))
}

/**
 * This reader's English LEGO lines, queue-shaped.
 *
 * @param {object} recordist {voiceId, spellings, castCourses?}
 * @param {object} input
 * @param {object[]} input.legos       course_legos rows {id, course_code, seed_number, lego_index, lego_id, known_text, is_new, presentation_audio_id}
 * @param {Iterable<string>} input.otherKnownTexts  English of the seeds and practice phrases of these courses (their own cards)
 * @param {Set<string>} [input.ownIntroIds]  presentation clip ids voiced by this reader (an intro already built from his takes)
 * @param {object} [table] humanSplicedIntros (tests)
 */
function englishLegoLinesFor(recordist, { legos = [], otherKnownTexts = [], ownIntroIds = new Set() } = {}, table) {
  const courses = englishLegoCoursesFor(recordist, table)
  if (!courses.length) return []
  const rank = new Map(courses.map((c, i) => [c, i]))
  const elsewhere = new Set()
  for (const t of otherKnownTexts) { const k = spokenWordsKey(t); if (k) elsewhere.add(k) }
  // The intro pieces are their own card.
  for (const c of courses) {
    const cfg = humanIntro.humanIntroConfig(c, table)
    for (const t of [cfg && cfg.fragment, cfg && cfg.joiner]) { const k = spokenWordsKey(t); if (k) elsewhere.add(k) }
  }
  const wanted = legos
    .filter((l) => rank.has(l.course_code) && l.is_new)
    .filter((l) => !l.presentation_audio_id || ownIntroIds.has(String(l.presentation_audio_id)))
    .sort((a, b) => (rank.get(a.course_code) - rank.get(b.course_code)) || (a.seed_number - b.seed_number) || (a.lego_index - b.lego_index))
  const seen = new Map()
  const out = []
  for (const l of wanted) {
    const text = String(l.known_text || '').trim()
    const key = spokenWordsKey(text)
    if (!key || elsewhere.has(key)) continue
    if (seen.has(key)) { seen.get(key).duplicateOf.push({ legoRowId: l.id, courseCode: l.course_code, legoId: l.lego_id || null }); continue }
    const line = {
      id: englishLegoLineId(l.id),
      podId: null,
      order: Number.MAX_SAFE_INTEGER,
      seedOrder: rank.get(l.course_code) * 1e7 + l.seed_number * 100 + l.lego_index,
      text,
      knownText: null,
      speaker: null,
      courseCode: l.course_code,
      voiceId: recordist.voiceId,
      duplicateOf: [],
      kind: 'lego',
      role: 'known',
      knownByText: true,
      legoRowId: l.id,
      legoId: l.lego_id || null,
      seedNumber: l.seed_number,
      readStyle: 'natural',
      rerecordWanted: false,
    }
    seen.set(key, line)
    out.push(line)
  }
  return out
}

/**
 * The words a parsed line stands for, if this reader is the voice of that LEGO's course intros. Null = not theirs:
 * the take route answers 404, never files.
 */
function resolveEnglishLego(lego, recordist, table) {
  if (!lego || !recordist) return null
  if (!englishLegoCoursesFor(recordist, table, { listing: false }).includes(lego.course_code)) return null
  const text = String(lego.known_text || '').trim()
  return text ? { courseCode: lego.course_code, legoId: lego.lego_id || null, text } : null
}

module.exports = { ENGLISH_LEGO_PREFIX, englishLegoLineId, parseEnglishLegoLineId, englishLegoCoursesFor, englishLegoLinesFor, resolveEnglishLego }
