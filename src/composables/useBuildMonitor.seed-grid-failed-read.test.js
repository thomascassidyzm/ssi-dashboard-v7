// A FAILED READ MEANS "COULD NOT LOOK", NEVER "FOUND NOTHING".
//
// Job #686 proved the Seed Grid's defect: it re-reads seeds, LEGOs and phrases
// every 30 s and treats a failed phrases read as an empty list, so when the
// authenticated role's 8 s statement timeout cancelled that query the grid
// painted ~650 seeds orange with "650 need phrases" — silently, in front of
// the native-speaker reviewer of eng_for_hin. This test reproduces #686's
// exact scenario against the real composable: sound reads give 0 flagged
// seeds; a phrases read carrying a statement-timeout error must NOT repaint,
// and must say so somewhere a human can find it.
//
// Run: npx vitest run src/composables/useBuildMonitor.seed-grid-failed-read

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Fake supabase-js: chainable builder, one canned result per table ──
// (vi.hoisted because vi.mock's factory is hoisted above every import)
const { results, fakeSupabase } = vi.hoisted(() => {
  const results = {}
  function builder(table) {
    const b = {}
    const chain = () => b
    for (const m of ['select', 'eq', 'neq', 'not', 'lte', 'order', 'limit', 'single']) b[m] = chain
    b.then = (resolve, reject) => Promise.resolve(results[table] ?? { data: [], error: null }).then(resolve, reject)
    return b
  }
  return { results, fakeSupabase: { from: (table) => builder(table) } }
})

vi.mock('@/services/supabase', () => ({
  supabase: fakeSupabase,
  isConfigured: () => true,
  getCourseStats: async () => ({ seeds: 0, completeSeeds: 0, legos: 0, practicePhrases: 0, audio: 0 })
}))

import { useBuildMonitor } from './useBuildMonitor'

// ── A course shaped like eng_for_hin: 650 decomposed seeds, one new LEGO each
//    from seed 4 on, four USE phrases per new LEGO (i.e. nothing under threshold).
const SEED_COUNT = 650
const seeds = Array.from({ length: SEED_COUNT }, (_, i) => ({
  seed_number: i + 1, decomposed_at: '2026-09-01T00:00:00Z', approved_at: null, flagged_at: null
}))
const legos = seeds.map(s => ({ seed_number: s.seed_number, lego_index: 1, is_new: true }))
const phrases = legos.flatMap(l => [1, 2, 3, 4].map(() => ({ seed_number: l.seed_number, lego_index: 1, phrase_role: 'use' })))

// What supabase-js hands back when Postgres cancels the statement (#686's probe).
const STATEMENT_TIMEOUT = {
  data: null,
  error: { code: '57014', message: 'canceling statement due to statement timeout', details: null, hint: null }
}

const flaggedCount = (grid) => grid.filter(c => c.status === 'under-threshold').length

describe('Seed Grid: a failed phrases read must not become "need phrases"', () => {
  beforeEach(() => {
    results.course_seeds = { data: seeds, error: null }
    results.course_legos = { data: legos, error: null }
    results.course_practice_phrases = { data: phrases, error: null }
    results.courses = { data: { status: 'building', quality_rules: {} }, error: null }
    results.orchestrator_messages = { data: [], error: null }
  })

  it('sound reads: 650 seeds, none flagged', async () => {
    const monitor = useBuildMonitor('eng_for_hin')
    await monitor.refresh()
    expect(monitor.seedGrid.value).toHaveLength(SEED_COUNT)
    expect(flaggedCount(monitor.seedGrid.value)).toBe(0)
  })

  it('a cancelled phrases read keeps the previous grid and logs the failure', async () => {
    const monitor = useBuildMonitor('eng_for_hin')
    await monitor.refresh()
    const before = monitor.seedGrid.value
    expect(flaggedCount(before)).toBe(0)

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    results.course_practice_phrases = STATEMENT_TIMEOUT
    await monitor.refresh()

    // The whole point: 0 flagged, not 650 — and the same grid object, not a repaint.
    expect(flaggedCount(monitor.seedGrid.value)).toBe(0)
    expect(monitor.seedGrid.value).toBe(before)

    // Silent failure is the real defect: the cancellation must be visible.
    const logged = warn.mock.calls.map(args => args.join(' ')).join('\n')
    expect(logged).toMatch(/phrases/)
    expect(logged).toMatch(/statement timeout/)
    warn.mockRestore()
  })

  it('a phrases read with no data array at all is also "could not look"', async () => {
    const monitor = useBuildMonitor('eng_for_hin')
    await monitor.refresh()
    const before = monitor.seedGrid.value
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    results.course_practice_phrases = { data: null, error: null }
    await monitor.refresh()
    expect(monitor.seedGrid.value).toBe(before)
    vi.restoreAllMocks()
  })
})
