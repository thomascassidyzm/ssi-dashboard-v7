/**
 * phrase-queue.cjs — PRACTICE PHRASES IN THE RECORDING BOOTH, two passes, in batches.
 *
 * Aran, 2026-10-13 (methodology lead for Welsh; job #619, plan d/7b56477c): the Welsh relaunch
 * sandboxes cym_nv2_for_eng (Catrin target1, Aran target2) and cym_sv2_for_eng (Dan target1,
 * Eleri target2) have ~20k new practice phrases and no way to record them. They are queued here:
 *
 *   PASS 1 — per NEW LEGO, the first FIRST_PASS.build build phrases and FIRST_PASS.use use phrases
 *            the PLAYER plays first (see passOneIds — the player's own order, mirrored).
 *   PASS 2 — every other build/use phrase of a new LEGO. Served only once a voice has finished
 *            pass 1, and the booth says so in words, so nobody thinks the first pass is all of it.
 *
 * Each pass is cut into BATCHES of about BATCH_LINES lines, in course running order. A batch is a
 * run of SEEDS, never a run of lines, and every voice of a course shares the cut — Catrin's North
 * batch 7 and Aran's North batch 7 are the same seeds (the plan's "one cut every voice shares"),
 * which is what lets a batch be published once both have read it.
 *
 * THE RULES, each a decision rather than an accident:
 *   - Component phrases are never played (cycles.ts), so they are never queued.
 *   - A phrase whose text is the LEGO's own (the debut) is never played as a phrase either — the
 *     player claims the debut first — so it is never queued.
 *   - DEDUPED BY SPOKEN WORDS (shared/spoken-words.cjs, job #198; was normalizeForDb): one take fills every copy.
 *     Welsh dedupes within its course (one dialect, one voice); the English known side dedupes
 *     across both courses, because Aran reads it once for North and South. A text needed in
 *     pass 1 anywhere is a pass-1 line; it belongs to the batch of the first seed that needs it.
 *   - FILL-EMPTY ONLY. A copy whose slot already holds a clip that is not this voice's own take
 *     is not work and is never replaced — an existing human take stays exactly where it is. A copy
 *     the cast voice has already filled stays on the list as RECORDED, so a batch never shrinks
 *     under a reader as they work through it.
 *   - The cut is computed over every line, recorded or not, so batch numbers do not move while
 *     anybody records. A phrase flagged on the proof page (phrase_proof_flags) still counts toward
 *     its batch but is HELD — not served — until the flag is cleared.
 *   - Only the two sandboxes. Live cym_n_for_eng / cym_s_for_eng phrases are never queued here.
 *
 * Pure: no I/O. recordist-queue.cjs reads the rows and serves the lines.
 */
'use strict'

const { normalizeForDb } = require('../shared/text-normalize.cjs')
const { spokenWordsKey } = require('../shared/spoken-words.cjs')

/** The courses whose practice phrases are recorded in the booth, with the word the reader sees. */
const PHRASE_QUEUE_COURSES = Object.freeze({
  cym_nv2_for_eng: Object.freeze({ label: 'North' }),
  cym_sv2_for_eng: Object.freeze({ label: 'South' }),
})

/** Pass 1, per new LEGO (Aran, 2026-10-13: "4 build + 3 use", the plan's option B). */
const FIRST_PASS = Object.freeze({ build: 4, use: 3 })
const PASSES = 2
/** A batch closes before any Welsh voice of the course would pass this many lines. */
const BATCH_LINES = 200

const PHRASE_LINE_PREFIX = 'phrase:'
const PHRASE_ROLES = Object.freeze(['target1', 'target2', 'known'])
const PLAYED_ROLES = Object.freeze(['build', 'use'])

function phraseLineId(phraseId, role) { return `${PHRASE_LINE_PREFIX}${phraseId}:${role}` }

/** `phrase:<phraseId>:<role>` → {phraseId, role}; null for anything else. Phrase ids contain ':'. */
function parsePhraseLineId(lineId) {
  const raw = String(lineId || '')
  if (!raw.startsWith(PHRASE_LINE_PREFIX)) return null
  const rest = raw.slice(PHRASE_LINE_PREFIX.length)
  const at = rest.lastIndexOf(':')
  if (at <= 0) return null
  const phraseId = rest.slice(0, at)
  const role = rest.slice(at + 1)
  if (!phraseId || !PHRASE_ROLES.includes(role)) return null
  return { phraseId, role }
}

function isPhraseQueueCourse(courseCode) {
  return Object.prototype.hasOwnProperty.call(PHRASE_QUEUE_COURSES, String(courseCode || ''))
}

/**
 * Target-side syllable estimate — the player's shortest-first SORT key. Verbatim from
 * @ssi/core packages/core/src/script/phraseSelection.ts countTargetSyllables, which cycles.ts
 * imports; a copy because Popty cannot import the learning app. If the player's rule changes,
 * which phrases are "played first" changes with it, and this must follow.
 */
function countTargetSyllables(targetText) {
  if (!targetText) return 0
  const cjk = targetText.match(/[一-鿿㐀-䶿぀-ゟ゠-ヿ가-힯]/g)
  if (cjk && cjk.length > 0) return cjk.length
  const vowelClusters = targetText.toLowerCase().match(/[aeiouyáéíóúàèìòùâêîôûäëïöü]+/gi)
  return vowelClusters ? vowelClusters.length : 1
}

/** cycles.ts phraseKey — the key the player claims a phrase by, so a repeat never plays twice. */
function playKey(knownText, targetText) {
  const norm = (t) => (t ? String(t).toLowerCase().trim().replace(/[.,!?;:¡¿'"　-〿＀-／：-＠［-｀｛-･]+/g, '') : '')
  return `${norm(knownText)}|${norm(targetText)}`
}

/**
 * One new LEGO's phrases, split into the passes. Mirrors the player's debut round
 * (ssi-learning-app api/courses/[code]/cycles.ts): each pool is sorted shortest-first by target
 * syllables, STABLE over DB position; the debut (the LEGO's own text) is claimed first; a phrase
 * whose key is already claimed is skipped and costs no slot.
 *
 * @returns {{ pass1: object[], pass2: object[], unplayed: object[] }} phrases in reading order
 */
function splitLegoPhrases(lego, phrases, firstPass = FIRST_PASS) {
  const byPosition = [...phrases].sort((a, b) => (a.position - b.position) || String(a.id).localeCompare(String(b.id)))
  const shortestFirst = (list) => [...list].sort((a, b) => countTargetSyllables(a.target_text) - countTargetSyllables(b.target_text))
  const builds = shortestFirst(byPosition.filter((p) => p.phrase_role === 'build' || p.phrase_role === 'practice'))
  const uses = shortestFirst(byPosition.filter((p) => p.phrase_role === 'use'))
  const claimed = new Set([playKey(lego && lego.known_text, lego && lego.target_text)])
  const pass1 = []
  const pass2 = []
  const unplayed = []
  for (const [pool, cap] of [[builds, firstPass.build], [uses, firstPass.use]]) {
    let taken = 0
    for (const p of pool) {
      const key = playKey(p.known_text, p.target_text)
      if (claimed.has(key)) { unplayed.push(p); continue }
      claimed.add(key)
      if (taken < cap) { pass1.push(p); taken += 1 } else pass2.push(p)
    }
  }
  return { pass1, pass2, unplayed }
}

/** The text a role reads off a phrase row. */
function roleText(phrase, role) {
  return String((role === 'known' ? phrase.known_text : phrase.target_text) || '').trim()
}

/**
 * One course's phrases in READING ORDER, each tagged with its pass: running-order position, then
 * LEGO, then pass-1 before pass-2, then the player's own order inside the LEGO.
 *
 * @param {object} a
 * @param {Map<number, number>} a.positions seed_number → running-order position (served seeds only)
 * @param {object[]} a.legos course_legos rows {seed_number, lego_index, is_new, known_text, target_text}
 * @param {object[]} a.phrases course_practice_phrases rows
 * @returns {{ units: Array<{phrase, pass, position, legoIndex}>, unplayed: number, notNewLego: number }}
 */
function orderCoursePhrases({ positions, legos, phrases }) {
  const legoOf = new Map(legos.map((l) => [`${l.seed_number}:${l.lego_index}`, l]))
  const groups = new Map()
  let notNewLego = 0
  for (const p of phrases) {
    if (!PLAYED_ROLES.includes(p.phrase_role) && p.phrase_role !== 'practice') continue
    if (!positions.has(p.seed_number)) continue
    const key = `${p.seed_number}:${p.lego_index}`
    const lego = legoOf.get(key)
    if (!lego || !lego.is_new) { notNewLego += 1; continue }
    if (!groups.has(key)) groups.set(key, { lego, phrases: [] })
    groups.get(key).phrases.push(p)
  }
  const ordered = [...groups.values()].sort((a, b) =>
    (positions.get(a.lego.seed_number) - positions.get(b.lego.seed_number)) || (a.lego.lego_index - b.lego.lego_index))
  const units = []
  let unplayed = 0
  for (const g of ordered) {
    const split = splitLegoPhrases(g.lego, g.phrases)
    unplayed += split.unplayed.length
    const position = positions.get(g.lego.seed_number)
    for (const p of split.pass1) units.push({ phrase: p, pass: 1, position, legoIndex: g.lego.lego_index })
    for (const p of split.pass2) units.push({ phrase: p, pass: 2, position, legoIndex: g.lego.lego_index })
  }
  return { units, unplayed, notNewLego }
}

/**
 * One course's lines for one role, deduped by exact text. A copy is WORK when its slot is empty
 * or already holds this role's cast voice (`isMine(holderVoiceId)`); a slot held by anything else
 * is left alone and is not a line. Pass 1 wins: a text a pass-1 phrase needs is a pass-1 line
 * even if an earlier seed needs it in pass 2.
 *
 * @param {object[]} units from orderCoursePhrases
 * @param {string} role target1 | target2 | known
 * @param {(phrase) => string|null} holderOf the voice id holding this copy's slot, '' when empty
 * @param {(voiceId) => boolean} isMine
 * @param {(phrase, role) => string|null} [standInOf] the clip id when this copy's slot holds a STAND-IN a take
 *   replaces (Aran's clone on the nv2/sv2 English known side, job #557): such a copy is work exactly like an
 *   empty one — holder null, so it is not "recorded" by its slot — and carries `standIn` so the linker swaps
 *   that clip, and only that clip, for the take.
 */
function courseRoleLines(courseCode, units, role, { holderOf, isMine, flagged = new Set(), standInOf = () => null }) {
  const lines = new Map()
  for (const pass of [1, 2]) {
    units.forEach((u, i) => {
      if (u.pass !== pass) return
      const text = roleText(u.phrase, role)
      if (!text) return
      const standIn = standInOf(u.phrase, role) || null
      const holder = standIn ? '' : holderOf(u.phrase, role)
      if (holder && !isMine(holder)) return
      // Deduped by SPOKEN WORDS (job #198): a '?' or a curly apostrophe is not a second recording.
      const key = spokenWordsKey(text)
      const copy = { phraseId: u.phrase.id, courseCode, text, holder: holder || null, flagged: flagged.has(u.phrase.id), ...(standIn ? { standIn } : {}) }
      const have = lines.get(key)
      if (have) { have.copies.push(copy); return }
      lines.set(key, {
        id: phraseLineId(u.phrase.id, role),
        role,
        pass,
        courseCode,
        text,
        // The crib: the other side of the same phrase.
        knownText: role === 'known' ? (u.phrase.target_text || null) : (u.phrase.known_text || null),
        textNormalized: normalizeForDb(text),
        wordsKey: key,
        phraseId: u.phrase.id,
        phraseRole: u.phrase.phrase_role === 'use' ? 'use' : 'build',
        seedNumber: u.phrase.seed_number,
        legoIndex: u.legoIndex,
        position: u.position,
        readingOrder: i,
        copies: [copy],
      })
    })
  }
  return [...lines.values()]
}

/**
 * THE CUT. Walk the course's served seeds in running order and close a batch just before any of
 * `cutRoles`' new lines would pass `size`. Returns Map<position, batch> for one pass. A single
 * seed bigger than `size` is a batch of its own rather than a batch that never closes.
 */
function cutBatches(linesByRole, cutRoles, pass, size = BATCH_LINES) {
  const perPosition = new Map()
  for (const role of cutRoles) {
    for (const line of linesByRole[role] || []) {
      if (line.pass !== pass) continue
      if (!perPosition.has(line.position)) perPosition.set(line.position, {})
      const c = perPosition.get(line.position)
      c[role] = (c[role] || 0) + 1
    }
  }
  const batchOf = new Map()
  let batch = 0
  let tally = null
  for (const position of [...perPosition.keys()].sort((a, b) => a - b)) {
    const add = perPosition.get(position)
    const over = tally && cutRoles.some((r) => (tally[r] || 0) + (add[r] || 0) > size)
    if (!tally || over) { batch += 1; tally = {} }
    for (const r of cutRoles) tally[r] = (tally[r] || 0) + (add[r] || 0)
    batchOf.set(position, batch)
  }
  return { batchOf, batches: batch }
}

/**
 * One course's whole plan: every role's lines with pass and batch set, and the batch counts.
 * The cut is made on the TARGET roles that have a cast voice (the Welsh readers); the known side
 * follows the same cut, so "North batch 7" is the same seeds for all three readers.
 */
function planCourse({ courseCode, positions, legos, phrases, roles, flagged }) {
  const { units, unplayed, notNewLego } = orderCoursePhrases({ positions, legos, phrases })
  const linesByRole = {}
  for (const [role, cast] of Object.entries(roles)) {
    linesByRole[role] = courseRoleLines(courseCode, units, role, { holderOf: cast.holderOf, isMine: cast.isMine, flagged, standInOf: cast.standInOf })
  }
  const cutRoles = ['target1', 'target2'].filter((r) => roles[r])
  const cutOn = cutRoles.length ? cutRoles : Object.keys(roles)
  const batches = {}
  for (const pass of [1, 2]) {
    const { batchOf, batches: n } = cutBatches(linesByRole, cutOn, pass)
    batches[pass] = n
    for (const lines of Object.values(linesByRole)) {
      for (const line of lines) if (line.pass === pass) line.batch = batchOf.get(line.position) || n || 1
    }
  }
  return { courseCode, linesByRole, batches, stats: { units: units.length, unplayed, notNewLego } }
}

/**
 * The known side across courses: ONE line per English text, read once for North and South. Lines
 * are walked pass, batch, course (in PHRASE_QUEUE_COURSES order), reading order; the first keeps
 * the line and every later copy joins it.
 */
function mergeAcrossCourses(lineLists) {
  const courseIndex = new Map(Object.keys(PHRASE_QUEUE_COURSES).map((c, i) => [c, i]))
  const all = lineLists.flat().sort((a, b) =>
    (a.pass - b.pass) || (a.batch - b.batch) ||
    ((courseIndex.get(a.courseCode) ?? 99) - (courseIndex.get(b.courseCode) ?? 99)) ||
    (a.readingOrder - b.readingOrder))
  const byText = new Map()
  for (const line of all) {
    const k = line.wordsKey || spokenWordsKey(line.text)
    const have = byText.get(k)
    if (have) { have.copies.push(...line.copies); continue }
    byText.set(k, { ...line, copies: [...line.copies] })
  }
  return [...byText.values()]
}

/** Sort key for serving: pass, batch, course, reading order. */
function compareServed(a, b) {
  const courseIndex = (c) => Object.keys(PHRASE_QUEUE_COURSES).indexOf(c)
  return (a.pass - b.pass) || (a.batch - b.batch) || (courseIndex(a.courseCode) - courseIndex(b.courseCode)) || (a.readingOrder - b.readingOrder)
}

/**
 * WHAT ONE READER IS SERVED NOW: the first batch (pass 1 first) holding a line they have not
 * read. Its every line comes back — read ones marked recorded — so "143 of 198" is honest; a held
 * (flagged) line is counted but not served. Pass 2 opens only when pass 1 is finished.
 *
 * @param {object[]} lines this reader's phrase lines (any course), batch and pass set
 * @param {(line) => boolean} isRecorded
 * @param {Object<string, {1:number, 2:number}>} batchCounts per course
 * @param {{pass:number, batch:number, courseCode:string}} [want] OPEN THIS BATCH INSTEAD (booth
 *   home, job #697: any batch can be opened on request). Pure: it picks which group is described and
 *   nothing else, so reading a batch never moves what the queue is serving. Unknown batch → empty.
 * @returns {{ lines: object[], summary: object|null }}
 */
/** A reader's phrase lines in the order the batches walk them. */
function servedOrder(lines) {
  return [...lines].sort(compareServed)
}

function servePhraseBatch(lines, isRecorded, batchCounts, want = null) {
  if (!lines.length) return { lines: [], summary: null }
  const sorted = [...lines].sort(compareServed)
  const isHeld = (l) => l.copies.every((c) => c.flagged)
  const recorded = new Map(sorted.map((l) => [l.id, isRecorded(l)]))
  const outstanding = (l) => !recorded.get(l.id) && !isHeld(l)
  const groupKey = (l) => `${l.pass}\u0000${l.batch}\u0000${l.courseCode}`
  const first = want
    ? sorted.find((l) => l.pass === want.pass && l.batch === want.batch && l.courseCode === want.courseCode)
    : sorted.find(outstanding)
  const passTotals = { 1: 0, 2: 0 }
  const passRecorded = { 1: 0, 2: 0 }
  for (const l of sorted) {
    passTotals[l.pass] += 1
    if (recorded.get(l.id)) passRecorded[l.pass] += 1
  }
  if (want && !first) return { lines: [], summary: null }
  if (!first) {
    return {
      lines: [],
      summary: { pass: null, passes: PASSES, finished: true, passTotals, passRecorded },
    }
  }
  const key = groupKey(first)
  const inBatch = sorted.filter((l) => groupKey(l) === key)
  const served = inBatch.filter((l) => !isHeld(l)).map((l) => ({ ...l, recorded: recorded.get(l.id) }))
  const counts = batchCounts[first.courseCode] || {}
  return {
    lines: served,
    summary: {
      pass: first.pass,
      passes: PASSES,
      batch: first.batch,
      batches: counts[first.pass] || first.batch,
      courseCode: first.courseCode,
      courseLabel: (PHRASE_QUEUE_COURSES[first.courseCode] || {}).label || first.courseCode,
      batchLines: inBatch.length,
      batchRecorded: inBatch.filter((l) => recorded.get(l.id)).length,
      batchHeld: inBatch.filter(isHeld).length,
      firstSeed: Math.min(...inBatch.map((l) => l.seedNumber)),
      lastSeed: Math.max(...inBatch.map((l) => l.seedNumber)),
      passTotals,
      passRecorded,
      // What the reader is told is still to come after this pass: the second pass's lines.
      laterPassLines: first.pass === 1 ? passTotals[2] : 0,
      firstPass: { ...FIRST_PASS },
    },
  }
}

/**
 * EVERY BATCH OF ONE READER, counted — for the booth's home screen (job #347), which shows the
 * batches still to come rather than only the one being served. Same sort, same grouping and the
 * same recorded/held tests as servePhraseBatch, so its counts agree with the served batch's; it
 * serves nothing and decides nothing.
 *
 * @returns {{pass, batch, courseCode, courseLabel, firstSeed, lastSeed, total, recorded, held}[]}
 */
function phraseBatchList(lines, isRecorded) {
  const groups = new Map()
  for (const l of [...lines].sort(compareServed)) {
    const key = `${l.pass}\u0000${l.batch}\u0000${l.courseCode}`
    if (!groups.has(key)) {
      groups.set(key, {
        pass: l.pass, batch: l.batch, courseCode: l.courseCode,
        courseLabel: (PHRASE_QUEUE_COURSES[l.courseCode] || {}).label || l.courseCode,
        firstSeed: l.seedNumber, lastSeed: l.seedNumber, total: 0, recorded: 0, held: 0,
      })
    }
    const g = groups.get(key)
    g.total += 1
    if (isRecorded(l)) g.recorded += 1
    if (l.copies.every((c) => c.flagged)) g.held += 1
    g.firstSeed = Math.min(g.firstSeed, l.seedNumber)
    g.lastSeed = Math.max(g.lastSeed, l.seedNumber)
  }
  return [...groups.values()]
}

module.exports = {
  PHRASE_QUEUE_COURSES,
  FIRST_PASS,
  PASSES,
  BATCH_LINES,
  PHRASE_LINE_PREFIX,
  PHRASE_ROLES,
  phraseLineId,
  parsePhraseLineId,
  isPhraseQueueCourse,
  countTargetSyllables,
  playKey,
  splitLegoPhrases,
  roleText,
  orderCoursePhrases,
  courseRoleLines,
  cutBatches,
  planCourse,
  mergeAcrossCourses,
  servePhraseBatch,
  servedOrder,
  phraseBatchList,
}
