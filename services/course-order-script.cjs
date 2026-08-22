// services/course-order-script.cjs
//
// THE COURSE, READ IN COURSE ORDER, ONE ITEM AT A TIME.
//
// Kai's ruling, 2026-08-21: a take recorded in this mode is filed and attached
// AS-IS as the audio for one item — no chunk extraction, no splicing, no
// alignment. That single decision is what makes this module exist rather than
// the coverage optimiser.
//
// The optimiser (tools/recording-optimizer/generate-recording-script.cjs) picks
// the FEWEST lines whose LEGO chunks can be spliced into everything else. Its
// 480 lines are only worth recording if the splicer then assembles the other
// ~11,400 items out of them. Take the splicing away and those 480 lines buy
// audio for 480 items and nothing more — the remaining items would stay
// TTS-voiced forever, and no amount of recording in that mode would ever reach
// them. So in this mode the reading list is the COURSE ITSELF:
//
//   for each seed, from seed 1 to the end:
//     the seed sentence
//     then, for each of its LEGOs in order:
//       the LEGO
//       then every practice phrase built on that LEGO, in position order
//
// That is Kai's sequence verbatim. Component rows are excluded: they are the
// per-sentence tiling glosses and are never played to a learner.
//
// Repeated text is read ONCE. The same target sentence can appear as a seed and
// again as a USE phrase; TTS renders such text once and links the one clip to
// every item that shares it (phase8 link_all_audio_ids), so reading it twice
// would ask the recordist for a second take that the same unique key
// (course_code, text_normalized, language, role, voice_id) would immediately
// collapse onto the first. First occurrence in course order wins.
//
// No I/O in buildCourseOrderItems — the ordering rules are testable without a
// database.

const { normalizeForAudio } = require('./shared/text-normalize.cjs')

// Component rows are tiling glosses, not learner-facing lines. Everything else
// a course carries (build, use, and any role added later) is read.
const SKIPPED_PHRASE_ROLES = new Set(['component'])

// Sort key for a seed's contents. The seed sentence is the sentence its LEGOs
// were cut from, so it reads first; then each LEGO, then the phrases built on
// it. Phrases with no lego_index sort after every LEGO of their seed rather
// than silently vanishing.
const NO_LEGO_INDEX = Number.MAX_SAFE_INTEGER

/**
 * Order rows into Kai's reading sequence.
 *
 * @param {object} args
 * @param {Array} args.seeds   - course_seeds rows (id, seed_number, target_text, known_text)
 * @param {Array} args.legos   - course_legos rows (id, lego_id, seed_number, lego_index, target_text, known_text, type)
 * @param {Array} args.phrases - course_practice_phrases rows (id, seed_number, lego_index, position, phrase_role, target_text, known_text)
 * @returns {Array} items: { kind, itemId, seedNumber, legoIndex, position, target, known, legoId }
 */
function buildCourseOrderItems({ seeds = [], legos = [], phrases = [] } = {}) {
  const rows = []

  for (const s of seeds) {
    if (!s?.target_text) continue
    rows.push({
      kind: 'seed', itemId: s.id, seedNumber: s.seed_number ?? null,
      legoIndex: -1, position: -1,
      target: s.target_text, known: s.known_text || '', legoId: '',
    })
  }

  for (const l of legos) {
    if (!l?.target_text) continue
    rows.push({
      kind: 'lego', itemId: l.lego_id || l.id, seedNumber: l.seed_number ?? null,
      legoIndex: l.lego_index ?? NO_LEGO_INDEX, position: -1,
      target: l.target_text, known: l.known_text || '', legoId: l.lego_id || '',
    })
  }

  for (const p of phrases) {
    if (!p?.target_text) continue
    if (SKIPPED_PHRASE_ROLES.has(p.phrase_role)) continue
    rows.push({
      kind: 'phrase', itemId: p.id, seedNumber: p.seed_number ?? null,
      legoIndex: p.lego_index ?? NO_LEGO_INDEX, position: p.position ?? 0,
      target: p.target_text, known: p.known_text || '', legoId: p.lego_id || '',
      phraseRole: p.phrase_role || '',
    })
  }

  // seed → lego → (the LEGO itself before its phrases) → position.
  // A seed with no seed_number sorts last rather than jumping to the front,
  // which is what a null would do numerically.
  const seedKey = (r) => (r.seedNumber == null ? NO_LEGO_INDEX : r.seedNumber)
  rows.sort((a, b) =>
    seedKey(a) - seedKey(b) ||
    a.legoIndex - b.legoIndex ||
    a.position - b.position ||
    String(a.target).localeCompare(String(b.target))
  )

  // Read each distinct line once — see the header. The FIRST occurrence keeps
  // its own identity, which is the earliest item in the course that needs it.
  const seen = new Set()
  const items = []
  for (const r of rows) {
    const key = normalizeForAudio(r.target)
    if (!key || seen.has(key)) continue
    seen.add(key)
    items.push(r)
  }
  return items
}

/**
 * Load the course and order it. Read-only.
 *
 * @param {object} supabase - an initialised supabase client
 * @param {string} courseCode
 * @param {object} opts
 * @param {number|null} opts.maxSeed - cap to seeds 1..N (null = whole course)
 * @param {string|null} opts.role - voice slot; with excludeRecorded, prunes
 *   lines this slot has already recorded. Slots are different PEOPLE and never
 *   interchangeable, so the pool must be per-slot.
 * @param {boolean} opts.excludeRecorded - drop lines already recorded by that slot
 */
async function loadCourseOrderScript(supabase, courseCode, opts = {}) {
  const { maxSeed = null, role = 'target1', excludeRecorded = true } = opts
  const cap = (q) => (maxSeed ? q.lte('seed_number', maxSeed) : q)

  const [seeds, legos, phrases] = await Promise.all([
    fetchAll(() => cap(supabase.from('course_seeds')
      .select('id, seed_number, target_text, known_text')
      .eq('course_code', courseCode))),
    fetchAll(() => cap(supabase.from('course_legos')
      .select('id, lego_id, seed_number, lego_index, type, target_text, known_text')
      .eq('course_code', courseCode))),
    fetchAll(() => cap(supabase.from('course_practice_phrases')
      .select('id, seed_number, lego_index, position, phrase_role, lego_id, target_text, known_text')
      .eq('course_code', courseCode))),
  ])

  let items = buildCourseOrderItems({ seeds, legos, phrases })
  const totalInCourse = items.length

  let alreadyRecorded = 0
  if (excludeRecorded) {
    const recorded = await fetchRecordedKeys(supabase, courseCode, role)
    const before = items.length
    items = items.filter(i => !recorded.has(normalizeForAudio(i.target)))
    alreadyRecorded = before - items.length
  }

  return { items, totalInCourse, alreadyRecorded }
}

/**
 * Lines this voice slot has already recorded, as normalized keys. Human origin
 * only: a TTS clip is exactly what this session exists to replace.
 */
async function fetchRecordedKeys(supabase, courseCode, role) {
  const rows = await fetchAll(() => supabase.from('course_audio')
    .select('text')
    .eq('course_code', courseCode)
    .eq('role', role)
    .eq('origin', 'human'))
  const keys = new Set()
  for (const r of rows) {
    const k = normalizeForAudio(r.text)
    if (k) keys.add(k)
  }
  return keys
}

/** Page through a supabase query — courses run to five figures of rows. */
async function fetchAll(makeQuery, pageSize = 1000) {
  const out = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    out.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return out
}

module.exports = { buildCourseOrderItems, loadCourseOrderScript, SKIPPED_PHRASE_ROLES }
