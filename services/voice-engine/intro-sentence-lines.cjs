/**
 * THE "INTRODUCTIONS" CARD — every LEGO intro of the new Welsh courses, read WHOLE by the reader whose voice they are in.
 *
 * Aran, 2026-10-29 (job #587; he leads the Welsh method), verbatim: "I'd like to change how we do intro pieces for the
 * new Welsh courses - I would like to have an introduction item card in my English recording booth, and I would like to
 * record the full sentence for each introduction in there - we don't need to break up into English bits and Welsh bits,
 * because I can do both in one sentence. This will sound much more natural to the learners."
 *
 *   introsentence:<course_legos.id>
 *
 * WHICH LEGOs: of a humanSplicedIntros course (voicing-policy) whose voice is this reader, `is_new`, with both English
 * and Welsh words, and whose intro is not made by anybody else: presentation_audio_id empty, or held by a clip of THIS
 * voice (a spliced intro of his, which his whole-sentence take replaces; or his own take, so a LEGO stays on the card,
 * counted recorded, rather than shrinking it). An intro in another voice is never displaced from here.
 *
 * THE WORDS are humanIntroText — "The Welsh for <src>X</src> is <tgt>Y</tgt>." — the very text the spliced intros were
 * stored under, so the take is the same clip identity a splice would have been (and swaps a spliced row in place,
 * versioned, when one exists). The booth renders the markup (RecordistRoom segmentsFor); he reads the words.
 *
 * ORDER: course running order, earliest first — seed, then LEGO, North before South at the same place — so he can
 * record the start of the course first. ONE CARD for both courses (booth-home trackKeyOf 'introsentence.all'), in
 * batches of 100.
 *
 * FOLDED: an intro whose words are identical in North and South (or twice in one course) is ONE line, on the earliest
 * LEGO; its take fills every copy (duplicateOf → alsoFills on the wire).
 *
 * RECORDED = any copy's presentation slot holds a whole-sentence take of this voice (slotFilledBy, scored
 * by slot alone). A spliced intro (spliced_from set) is NOT a recording of the sentence, so a LEGO with only a spliced
 * intro still asks for its take.
 *
 * Pure: no I/O. The reads are recordist-queue fetchIntroSentenceInputs; the take route is recordist-router
 * recordIntroSentenceTake, which links slots through services/shared/link-clip.cjs using planIntroSentenceLinks below.
 */
'use strict'

const humanIntro = require('../shared/human-intro-splice.cjs')
const { normalizeForAudio } = require('../shared/text-normalize.cjs')

const INTRO_SENTENCE_PREFIX = 'introsentence:'
const INTRO_SENTENCE_KIND = 'introsentence'

function introSentenceLineId(legoRowId) { return `${INTRO_SENTENCE_PREFIX}${legoRowId}` }

/** `introsentence:<rowId>` → {legoRowId}; null for anything else. */
function parseIntroSentenceLineId(lineId) {
  const raw = String(lineId || '')
  if (!raw.startsWith(INTRO_SENTENCE_PREFIX)) return null
  const legoRowId = raw.slice(INTRO_SENTENCE_PREFIX.length)
  return legoRowId && !legoRowId.includes(':') ? { legoRowId } : null
}

/** The intro courses this reader reads, in config order (North first), cast-filtered. */
function introSentenceCoursesFor(recordist, table) {
  const cast = Array.isArray(recordist.castCourses) ? new Set(recordist.castCourses) : null
  return humanIntro.humanIntroCoursesFor(recordist.spellings || [recordist.voiceId], table).filter((c) => !cast || cast.has(c.courseCode))
}

/** The intro a LEGO gets, or null when it has no words to introduce. */
function introTextOf(cfg, lego) {
  if (!cfg || !String(lego.known_text || '').trim() || !String(lego.target_text || '').trim()) return null
  return humanIntro.humanIntroText(cfg, lego)
}

/**
 * This reader's Introductions lines, queue-shaped.
 *
 * @param {object} recordist {voiceId, spellings, castCourses?}
 * @param {object} input
 * @param {object[]} input.legos  course_legos rows {id, course_code, seed_number, lego_index, lego_id, known_text, target_text, is_new, presentation_audio_id}
 * @param {Map<string,{voice:string, spliced:boolean}>} input.introClips  the clips in those presentation slots, by id
 * @param {object} [table] humanSplicedIntros (tests)
 */
function introSentenceLinesFor(recordist, { legos = [], introClips = new Map() } = {}, table) {
  const courses = introSentenceCoursesFor(recordist, table)
  if (!courses.length) return []
  const spellings = recordist.spellings || [recordist.voiceId]
  const cfgOf = new Map(courses.map((c) => [c.courseCode, c]))
  const rank = new Map(courses.map((c, i) => [c.courseCode, i]))
  const held = (id) => (id ? introClips.get(String(id)) || null : null)
  const wanted = legos
    .filter((l) => cfgOf.has(l.course_code) && l.is_new)
    .filter((l) => { if (!l.presentation_audio_id) return true; const c = held(l.presentation_audio_id); return !!c && spellings.includes(c.voice) })
    .sort((a, b) => (a.seed_number - b.seed_number) || (a.lego_index - b.lego_index) || (rank.get(a.course_code) - rank.get(b.course_code)))
  const byKey = new Map()
  const out = []
  for (const l of wanted) {
    const text = introTextOf(cfgOf.get(l.course_code), l)
    if (!text) continue
    const key = normalizeForAudio(text)
    // A whole-sentence take of this voice in the slot; a splice is not one.
    const c = held(l.presentation_audio_id)
    const filledBy = c && !c.spliced ? c.voice : null
    const copy = { legoRowId: l.id, courseCode: l.course_code, legoId: l.lego_id || null, presentationAudioId: l.presentation_audio_id || null }
    const have = byKey.get(key)
    if (have) { have.duplicateOf.push(copy); have.slotFilledBy.push(filledBy); continue }
    const line = {
      id: introSentenceLineId(l.id),
      podId: null,
      order: Number.MAX_SAFE_INTEGER,
      text,
      knownText: null,
      speaker: null,
      courseCode: l.course_code,
      voiceId: recordist.voiceId,
      duplicateOf: [],
      kind: INTRO_SENTENCE_KIND,
      role: 'presentation',
      slotFilledBy: [filledBy],
      byWords: false,
      legoRowId: l.id,
      legoId: l.lego_id || null,
      seedNumber: l.seed_number,
      presentationAudioId: l.presentation_audio_id || null,
      readStyle: 'natural',
      rerecordWanted: false,
    }
    byKey.set(key, line)
    out.push(line)
  }
  return out
}

/**
 * The words a LEGO row's line stands for, if this reader is the voice of its course's intros. Null = not theirs, or
 * nothing to introduce: the take route answers 404, never files.
 */
function resolveIntroSentence(lego, recordist, table) {
  if (!lego || !recordist) return null
  const cfg = introSentenceCoursesFor(recordist, table).find((c) => c.courseCode === lego.course_code)
  const text = introTextOf(cfg, lego)
  return text ? { courseCode: lego.course_code, legoId: lego.lego_id || null, text } : null
}

/**
 * WHERE ONE WHOLE-SENTENCE TAKE GOES: the presentation slot of every copy the line stands for. Pure.
 *   empty slot                         → fill
 *   already this clip                  → nothing
 *   held by a clip of THIS voice       → replace (expectCurrent = what it holds; the old clip is left in place, never deleted)
 *   held by anybody else's clip        → left alone (reported)
 * @param {object[]} copies [{courseCode, legoId, presentationAudioId}]  as read NOW (link-clip re-checks at write time)
 * @param {string} audioId the filed take
 * @param {Map<string,string>} heldVoice clip id → voice_id of what the slots hold
 * @param {string[]} spellings this reader's voice spellings
 * @returns {{links: Map<courseCode, object[]>, leftAlone: object[]}}  links in link-clip's shape
 */
function planIntroSentenceLinks(copies, audioId, heldVoice, spellings) {
  const links = new Map()
  const leftAlone = []
  for (const c of copies) {
    if (!c || !c.legoId) continue
    const cur = c.presentationAudioId ? String(c.presentationAudioId) : null
    if (cur === String(audioId)) continue
    let link
    if (!cur) link = { legoId: c.legoId, role: 'presentation', audioId }
    else if (spellings.includes(heldVoice.get(cur))) link = { legoId: c.legoId, role: 'presentation', audioId, replace: true, expectCurrent: cur }
    else { leftAlone.push({ ...c, heldBy: heldVoice.get(cur) || null }); continue }
    if (!links.has(c.courseCode)) links.set(c.courseCode, [])
    links.get(c.courseCode).push(link)
  }
  return { links, leftAlone }
}

module.exports = {
  INTRO_SENTENCE_PREFIX, INTRO_SENTENCE_KIND, introSentenceLineId, parseIntroSentenceLineId, introSentenceCoursesFor,
  introSentenceLinesFor, resolveIntroSentence, planIntroSentenceLinks,
}
