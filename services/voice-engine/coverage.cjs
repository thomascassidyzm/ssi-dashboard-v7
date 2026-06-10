/**
 * voice-engine/coverage.cjs — HONEST coverage numbers per voice slot.
 *
 * Replaces RecordingOptimizer's fabricated stats (totalPhrases = legos × 10,
 * recordedCount/splicedCount TODO-stub zeros) with real counts derived from
 * course_audio + recording_provenance + the segment-store manifest, and
 * exposes the seed-auto-cover gap from audit 02: LEGOs the greedy planner
 * counts as "covered" via seed-auto-cover even though their text never
 * appears contiguously in any recordable candidate — alignment can never
 * extract those, so they are silent future audio gaps, reported here.
 */

const { buildUniverse, tokenize, getAllSubsequences } = require('./chunking.cjs')
const { normalizeForAudio } = require('../shared/text-normalize.cjs')
const segmentStore = require('./segment-store.cjs')

const SLOT_ROLES = ['known', 'target1', 'target2']

/**
 * The seed-auto-cover gap (pure): LEGOs whose normalized target text is not
 * a contiguous token run in ANY candidate text (seeds + phrases). The
 * planner's seed-auto-cover rule marks them covered anyway, so they never
 * reach directRecord — but slow-gap alignment can never cut them.
 */
function computeSeedAutoCoverGap(universe, candidateTexts) {
  const reachable = new Set()
  for (const text of candidateTexts) {
    if (!text) continue
    const words = tokenize(text)
    if (!words.length) continue
    for (const sub of getAllSubsequences(words)) {
      if (universe.has(sub)) reachable.add(sub)
    }
  }
  const gap = []
  for (const [key, info] of universe) {
    if (!reachable.has(key)) gap.push({ legoId: info.legoId, target: info.original })
  }
  return { reachableCount: reachable.size, gap }
}

/**
 * Compute coverage for every voice slot of a course.
 * deps: { supabase, storage, db, provenance, logger }
 */
async function computeCoverage(deps, courseCode) {
  const db = deps.db
  const course = await db.loadCourse(deps.supabase, courseCode)
  const [legos, phrases, seeds] = await Promise.all([
    db.loadNewLegos(deps.supabase, courseCode),
    db.loadPhrases(deps.supabase, courseCode),
    db.loadSeeds(deps.supabase, courseCode),
  ])
  const universe = buildUniverse(legos)

  // Honest seed-auto-cover gap (recordability, voice-independent).
  const candidateTexts = [...seeds.map(s => s.target_text), ...phrases.map(p => p.target_text)]
  const { gap } = computeSeedAutoCoverGap(universe, candidateTexts)

  const voices = course.voice_config?.voices || {}
  const slots = []

  for (const role of SLOT_ROLES) {
    const slotConfig = voices[role] || null
    const voiceId = slotConfig?.voiceId ?? null
    const textCol = role === 'known' ? 'known_text' : 'target_text'
    const language = role === 'known' ? course.known_lang : course.target_lang

    // Distinct texts this slot must cover (phrases + seeds, the FK-linked set).
    const needed = new Set()
    for (const p of phrases) if (p[textCol]) needed.add(normalizeForAudio(p[textCol]))
    for (const s of seeds) if (s[textCol]) needed.add(normalizeForAudio(s[textCol]))

    // What exists in course_audio for this role.
    const audioRows = await db.fetchAudioRowsForRole(deps.supabase, { courseCode, role })
    const slotVoiceTexts = new Set()
    const otherVoiceTexts = new Set()
    let humanRows = 0
    for (const r of audioRows) {
      if (!r.text_normalized) continue
      if (voiceId && r.voice_id === voiceId) {
        slotVoiceTexts.add(r.text_normalized)
        if (r.origin === 'human') humanRows++
      } else {
        otherVoiceTexts.add(r.text_normalized)
      }
    }

    // Method breakdown for the slot voice: takes (provenance) vs spliced
    // (manifest ledger) vs other (legacy / relabeled).
    let takeTexts = new Set()
    let splicedTexts = new Set()
    let alignmentFailures = 0
    let segmentCount = 0
    if (voiceId) {
      try {
        const { rows } = await deps.provenance.fetchProvenanceRows(deps.supabase, { courseCode, voiceId, role })
        for (const t of rows) {
          if (t.method === 'take' && t.phraseText) takeTexts.add(normalizeForAudio(t.phraseText))
        }
      } catch { /* provenance is an integration seam — absence is reported, not fatal */ }
      try {
        const manifest = await segmentStore.loadManifest(deps.storage, courseCode, voiceId)
        segmentCount = manifest.segments.length
        alignmentFailures = manifest.alignmentFailures.length
        // ledger texts are stored verbatim; normalize for the intersect below
        splicedTexts = new Set(manifest.spliced.map(s => normalizeForAudio(s.text ?? '')))
      } catch { /* no manifest yet */ }
    }

    const covered = [...needed].filter(t => slotVoiceTexts.has(t))
    const coveredSet = new Set(covered)
    const recordedTakes = covered.filter(t => takeTexts.has(t)).length
    const spliced = covered.filter(t => splicedTexts.has(t) && !takeTexts.has(t)).length
    const otherMethod = covered.length - recordedTakes - spliced
    const missing = [...needed].filter(t => !coveredSet.has(t)).length

    slots.push({
      role,
      provider: slotConfig?.provider ?? null,
      voiceId,
      isHuman: slotConfig?.provider === 'human',
      language,
      needed: needed.size,
      covered: covered.length,
      recordedTakes,
      spliced,
      otherMethod,
      missing,
      humanRows,
      segmentCount,
      alignmentFailures,
      coveredByOtherVoices: [...needed].filter(t => !coveredSet.has(t) && otherVoiceTexts.has(t)).length,
    })
  }

  return {
    courseCode,
    counts: {
      // The REAL numbers (not totalLegos × 10):
      phrases: phrases.length,
      seeds: seeds.length,
      newLegos: legos.length,
    },
    slots,
    seedAutoCoverGap: {
      count: gap.length,
      note: gap.length
        ? 'LEGOs the recording planner counts as covered (seed-auto-cover) but whose text never appears contiguously in any recordable phrase — alignment cannot extract them; they need direct recording.'
        : null,
      samples: gap.slice(0, 25),
    },
  }
}

module.exports = { computeCoverage, computeSeedAutoCoverGap, SLOT_ROLES }
