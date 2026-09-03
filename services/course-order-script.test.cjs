/**
 * The course, read in course order (no DB, no audio, no spend).
 * Run: npx vitest run services/course-order-script
 *
 * Kai's sequence, 2026-08-21, is the claim under test: for each seed from seed
 * 1 — the seed sentence, then its first LEGO, then every practice phrase built
 * on that LEGO, then the second LEGO and its phrases, and so on to the end of
 * the course.
 */

import { describe, it, expect } from 'vitest'

const { buildCourseOrderItems, buildVolumeBreakdown } = require('./course-order-script.cjs')

// One small course: two seeds, two LEGOs each, phrases on each LEGO, plus the
// component rows a learner never hears.
const SEEDS = [
  { id: 's2', seed_number: 2, target_text: 'wos suachst?', known_text: 'what are you looking for?' },
  { id: 's1', seed_number: 1, target_text: 'i wüü lernen', known_text: 'i want to learn' },
]
const LEGOS = [
  { id: 'l1b', lego_id: 'S0001L02', seed_number: 1, lego_index: 2, target_text: 'lernen', known_text: 'to learn' },
  { id: 'l1a', lego_id: 'S0001L01', seed_number: 1, lego_index: 1, target_text: 'i wüü', known_text: 'i want' },
  { id: 'l2a', lego_id: 'S0002L01', seed_number: 2, lego_index: 1, target_text: 'wos suachst', known_text: 'what are you looking for' },
]
const PHRASES = [
  { id: 'p3', seed_number: 1, lego_index: 2, position: 1, phrase_role: 'use', target_text: 'i wüü deitsch lernen', known_text: 'i want to learn german' },
  { id: 'p1', seed_number: 1, lego_index: 1, position: 2, phrase_role: 'use', target_text: 'i wüü des', known_text: 'i want that' },
  { id: 'p2', seed_number: 1, lego_index: 1, position: 1, phrase_role: 'build', target_text: 'i wüü a bissl', known_text: 'i want a little' },
  { id: 'pc', seed_number: 1, lego_index: 1, position: 0, phrase_role: 'component', target_text: 'wüü', known_text: 'want' },
  { id: 'p4', seed_number: 2, lego_index: 1, position: 1, phrase_role: 'use', target_text: 'wos suachst denn?', known_text: 'what are you looking for then?' },
]

describe('buildCourseOrderItems', () => {
  const items = buildCourseOrderItems({ seeds: SEEDS, legos: LEGOS, phrases: PHRASES })

  it('reads seed sentence, then LEGO, then that LEGO’s phrases, seed by seed', () => {
    expect(items.map(i => i.target)).toEqual([
      // seed 1
      'i wüü lernen',
      'i wüü',
      'i wüü a bissl',
      'i wüü des',
      'lernen',
      'i wüü deitsch lernen',
      // seed 2
      'wos suachst?',
      'wos suachst',
      'wos suachst denn?',
    ])
  })

  it('starts at seed 1 — the first seed’s own sentence is line one', () => {
    expect(items[0]).toMatchObject({ kind: 'seed', seedNumber: 1, target: 'i wüü lernen' })
  })

  it('never reads a component row — they are never played to a learner', () => {
    expect(items.some(i => i.target === 'wüü')).toBe(false)
    expect(items.some(i => i.phraseRole === 'component')).toBe(false)
  })

  it('carries the identity of the row each line IS', () => {
    const lego = items.find(i => i.target === 'i wüü')
    expect(lego).toMatchObject({ kind: 'lego', itemId: 'S0001L01', legoId: 'S0001L01', seedNumber: 1, legoIndex: 1 })
    const phrase = items.find(i => i.target === 'i wüü des')
    expect(phrase).toMatchObject({ kind: 'phrase', itemId: 'p1', seedNumber: 1, legoIndex: 1, position: 2 })
  })

  it('reads a repeated line once — TTS renders such text once too', () => {
    const withDupe = buildCourseOrderItems({
      seeds: [{ id: 's1', seed_number: 1, target_text: 'i wüü lernen', known_text: 'i want to learn' }],
      legos: [],
      // The same sentence again as a USE phrase later in the same seed.
      phrases: [{ id: 'p9', seed_number: 1, lego_index: 1, position: 1, phrase_role: 'use', target_text: 'I wüü lernen.', known_text: 'i want to learn' }],
    })
    expect(withDupe).toHaveLength(1)
    // The FIRST occurrence keeps its identity: the earliest item that needs it.
    expect(withDupe[0]).toMatchObject({ kind: 'seed', itemId: 's1' })
  })

  it('keeps a phrase with no lego_index, after that seed’s LEGOs', () => {
    const out = buildCourseOrderItems({
      seeds: [{ id: 's1', seed_number: 1, target_text: 'seed one', known_text: '' }],
      legos: [{ id: 'l', lego_id: 'S0001L01', seed_number: 1, lego_index: 1, target_text: 'lego one', known_text: '' }],
      phrases: [{ id: 'p', seed_number: 1, lego_index: null, position: 1, phrase_role: 'use', target_text: 'stray phrase', known_text: '' }],
    })
    expect(out.map(i => i.target)).toEqual(['seed one', 'lego one', 'stray phrase'])
  })

  it('skips rows with no target text rather than emitting a blank line', () => {
    const out = buildCourseOrderItems({
      seeds: [{ id: 's1', seed_number: 1, target_text: '', known_text: 'nothing' }],
      legos: [{ id: 'l', lego_id: 'L', seed_number: 1, lego_index: 1, target_text: null, known_text: '' }],
      phrases: [{ id: 'p', seed_number: 1, lego_index: 1, position: 1, phrase_role: 'use', target_text: 'real', known_text: '' }],
    })
    expect(out.map(i => i.target)).toEqual(['real'])
  })

  it('is an empty list, not a crash, for an empty course', () => {
    expect(buildCourseOrderItems({})).toEqual([])
  })
})

// ── The already-recorded count ───────────────────────────────────────────────
// NO SCREEN MAY EVER TELL A RECORDIST THEY HAVE RECORDED NOTHING WHEN CLIPS
// EXIST. loadRecordedProgress is what lets every reading mode — not just
// course order — put that number on screen, so what matters here is that it
// reports the same figure the script builder prunes by.

const { loadCourseOrderScript, loadRecordedProgress } = require('./course-order-script.cjs')

// Minimal stand-in for the supabase client: enough chaining for the three
// content reads, the course_audio read and the one-row cast read.
function fakeSupabase({ seeds, legos, phrases, audio, courses = [] }) {
  const tables = {
    course_seeds: seeds,
    course_legos: legos,
    course_practice_phrases: phrases,
    course_audio: audio,
    courses,
  }
  return {
    from(table) {
      let rows = tables[table] || []
      const q = {
        select: () => q,
        eq: (col, val) => {
          if (col !== 'course_code') rows = rows.filter(r => r[col] === val)
          return q
        },
        in: (col, vals) => { rows = rows.filter(r => vals.includes(r[col])); return q },
        lte: (col, val) => { rows = rows.filter(r => r[col] != null && r[col] <= val); return q },
        maybeSingle: () => Promise.resolve({ data: rows[0] || null, error: null }),
        range: (from, to) => Promise.resolve({ data: rows.slice(from, to + 1), error: null }),
      }
      return q
    }
  }
}

// Two of the nine lines above are in the can for THIS voice — one recorded with
// different casing, which normalizeForAudio is meant to see through. The rest
// of the fixture is everything that must NOT count: an import in the same slot,
// another dialect's artist in the same slot, this voice in another slot, and a
// synthetic render.
const VOICE = 'human_sasha_wanasky_deu_at'
const AUDIO = [
  { text: 'I wüü', role: 'target2', origin: 'human', voice_id: VOICE },
  { text: 'wos suachst denn?', role: 'target2', origin: 'human', voice_id: VOICE },
  { text: 'lernen', role: 'target2', origin: 'human', voice_id: 'legacy_import' },
  { text: 'wos suachst', role: 'target2', origin: 'human', voice_id: 'human_other_deu_de' },
  { text: 'i wüü des', role: 'target1', origin: 'human', voice_id: VOICE },
  { text: 'wos suachst?', role: 'target2', origin: 'tts', voice_id: VOICE },
]
const COURSES = [{
  course_code: 'deu_at_for_eng',
  voice_config: { voices: {
    target1: { voiceId: 'de-AT-JonasNeural', provider: 'azure' },
    target2: { voiceId: VOICE, provider: 'human' },
  } },
}]

describe('loadRecordedProgress', () => {
  const supabase = () => fakeSupabase({ seeds: SEEDS, legos: LEGOS, phrases: PHRASES, audio: AUDIO, courses: COURSES })

  it('counts this voice’s own human takes, and nobody else’s', async () => {
    const out = await loadRecordedProgress(supabase(), 'deu_at_for_eng', { role: 'target2' })
    expect(out).toEqual({ totalInCourse: 9, alreadyRecorded: 2, voiceId: VOICE })
  })

  it('reports the same figure the course-order script prunes by', async () => {
    const script = await loadCourseOrderScript(supabase(), 'deu_at_for_eng', { role: 'target2', excludeRecorded: true })
    const progress = await loadRecordedProgress(supabase(), 'deu_at_for_eng', { role: 'target2' })
    expect(progress.alreadyRecorded).toBe(script.alreadyRecorded)
    expect(script.items.length).toBe(progress.totalInCourse - progress.alreadyRecorded)
  })

  it('is zero only when this voice really has nothing — not when another voice has takes', async () => {
    const out = await loadRecordedProgress(supabase(), 'deu_at_for_eng', { role: 'known' })
    expect(out.alreadyRecorded).toBe(0)
  })
})

// ── THE VOICE IS PART OF THE KEY ─────────────────────────────────────────────
// A take from one voice must never satisfy another's slot. Before this, the
// match was (course, role, origin=human) and so a Northern artist's clips, and
// 6,375 legacy imports, counted as the cast recordist's own work — a line that
// reads as recorded is a line nobody is ever asked to record.
describe('recorded pruning is keyed on the voice, not just the slot', () => {
  const withAudio = (audio, courses = COURSES) =>
    fakeSupabase({ seeds: SEEDS, legos: LEGOS, phrases: PHRASES, audio, courses })

  it('does not count an import filed in the same slot', async () => {
    const out = await loadRecordedProgress(
      withAudio([{ text: 'I wüü', role: 'target2', origin: 'human', voice_id: 'legacy_import' }]),
      'deu_at_for_eng', { role: 'target2' })
    expect(out.alreadyRecorded).toBe(0)
  })

  it('does not count another artist’s take of the same line in the same slot', async () => {
    const out = await loadRecordedProgress(
      withAudio([{ text: 'I wüü', role: 'target2', origin: 'human', voice_id: 'human_aran_cym_n' }]),
      'deu_at_for_eng', { role: 'target2' })
    expect(out.alreadyRecorded).toBe(0)
  })

  it('prunes nothing at all when the course casts no human in the slot', async () => {
    const uncast = [{ course_code: 'deu_at_for_eng', voice_config: { voices: {} } }]
    const script = await loadCourseOrderScript(
      withAudio(AUDIO, uncast), 'deu_at_for_eng', { role: 'target2', excludeRecorded: true })
    expect(script.voiceId).toBe(null)
    expect(script.alreadyRecorded).toBe(0)
    expect(script.items.length).toBe(script.totalInCourse)
  })

  it('prunes nothing when the slot is cast to a synthetic voice', async () => {
    const out = await loadRecordedProgress(withAudio(AUDIO), 'deu_at_for_eng', { role: 'target1' })
    expect(out.voiceId).toBe(null)
    expect(out.alreadyRecorded).toBe(0)
  })

  it('still finds the voice’s takes under a different spelling of its id', async () => {
    const courses = [{ course_code: 'deu_at_for_eng', voice_config: { voices: {
      target2: { voiceId: 'azure_de-AT-IngridNeural', provider: 'human' } } } }]
    const out = await loadRecordedProgress(
      withAudio([{ text: 'I wüü', role: 'target2', origin: 'human', voice_id: 'de-AT-IngridNeural' }], courses),
      'deu_at_for_eng', { role: 'target2' })
    expect(out.alreadyRecorded).toBe(1)
  })

  it('an explicit voiceId overrides the cast', async () => {
    const out = await loadRecordedProgress(
      withAudio(AUDIO), 'deu_at_for_eng', { role: 'target2', voiceId: 'human_other_deu_de' })
    expect(out.alreadyRecorded).toBe(1)
  })
})

// The volume picker's whole claim: what it shows for "first N seeds" is what
// the recording script actually hands the recordist under ?maxSeed=N.
describe('buildVolumeBreakdown', () => {
  const rows = { seeds: SEEDS, legos: LEGOS, phrases: PHRASES }

  it('counts the same lines a capped script would return', () => {
    const [first, all] = buildVolumeBreakdown(rows, [1, null])
    expect(first.lines).toBe(buildCourseOrderItems({
      seeds: SEEDS.filter(s => s.seed_number <= 1),
      legos: LEGOS.filter(l => l.seed_number <= 1),
      phrases: PHRASES.filter(p => p.seed_number <= 1),
    }).length)
    expect(all.lines).toBe(buildCourseOrderItems(rows).length)
  })

  it('reports LEGOs and phrases per volume, never counting component rows', () => {
    const [first] = buildVolumeBreakdown(rows, [1])
    expect(first).toMatchObject({ maxSeed: 1, seeds: 1, legos: 2, phrases: 3 })
  })

  it('quotes minutes at the booth’s stated 6 seconds a line', () => {
    const [all] = buildVolumeBreakdown(rows, [null])
    expect(all.maxSeed).toBeNull()
    expect(all.estimatedMinutes).toBe(Math.round((all.lines * 6) / 60))
  })
})
