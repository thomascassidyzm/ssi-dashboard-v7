// The two admin edit doors for agents (r-2026-10-14-kai-is-team-his-agents-get):
// recompute word-tile decompositions (content-keyed) and unapprove seeds. Pure
// planners + the edit engine's planning; the transaction itself is covered by
// course-edit-ops.test.cjs.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { planRecompute, staleBlocks } = require('./decomposition-refresh.cjs')
const { parseSeedList, planUnapprove } = require('./seed-approval.cjs')
const { planOps } = require('./course-edit-ops.cjs')
const { findSurface } = require('./content-write-surfaces.cjs')

const C = 'fra_for_eng'
const legos = [
  { seed_number: 1, lego_index: 1, target_text: 'je veux', known_text: 'I want' },
  { seed_number: 1, lego_index: 2, target_text: 'parler', known_text: 'to speak' },
]
const staleDecomp = [
  { legoId: 'S0001L01', target: 'je veux', known: 'I wish' }, // gloss drifted
  { legoId: 'S0001L02', target: ' parler', known: 'to speak' },
]

describe('recompute-decompositions planner', () => {
  it('flags a block by CONTENT (gloss vs the LEGO now), not by version stamp', () => {
    const byId = new Map(legos.map((l) => [`S000${l.seed_number}L0${l.lego_index}`, l]))
    expect(staleBlocks(staleDecomp, byId)).toEqual([{ legoId: 'S0001L01', storedKnown: 'I wish', currentKnown: 'I want', reason: 'gloss_drift' }])
  })
  it('turns a stale phrase into a phrase.update that sets only the decomposition columns, guarded by expect', () => {
    const phrases = [{ id: `${C}:S0001L02U01`, seed_number: 1, lego_index: 2, target_text: 'je veux parler', decomposition: staleDecomp }]
    const { ops, summary } = planRecompute({ courseCode: C, legos, phrases, courseVersion: 3 })
    expect(summary.rewrite).toBe(1)
    expect(ops).toHaveLength(1)
    expect(Object.keys(ops[0].set).sort()).toEqual(['decomposition', 'decomposition_course_version'])
    expect(ops[0].set.decomposition.map((b) => b.target).join('')).toBe('je veux parler')
    expect(ops[0].set.decomposition_course_version).toBe(3)
    expect(ops[0].expect.decomposition).toBe(staleDecomp)
    // and the edit engine accepts it as an op (this is what failed before the column was updatable)
    expect(() => planOps(ops, C)).not.toThrow()
  })
  it('leaves a fresh phrase alone, and a phrase that does not contain its own LEGO', () => {
    const fresh = [{ legoId: 'S0001L02', target: 'parler', known: 'to speak' }]
    const { ops, summary } = planRecompute({
      courseCode: C, legos,
      phrases: [
        { id: `${C}:a`, seed_number: 1, lego_index: 2, target_text: 'parler', decomposition: fresh },
        { id: `${C}:b`, seed_number: 1, lego_index: 2, target_text: 'je veux manger', decomposition: staleDecomp },
      ],
    })
    expect(ops).toHaveLength(0)
    expect(summary.fresh).toBe(1)
    expect(summary.skipped_parent_unlocatable).toBe(1)
  })
})

describe('unapprove-seeds planner', () => {
  it('parses, dedupes and sorts seed numbers; accepts S0042', () => {
    expect(parseSeedList([5, '3', 'S0042', 5])).toEqual([3, 5, 42])
  })
  it('refuses an empty or malformed list', () => {
    expect(() => parseSeedList([])).toThrow(/non-empty/)
    expect(() => parseSeedList(['x'])).toThrow(/positive integer/)
    expect(() => parseSeedList(undefined)).toThrow()
  })
  it('plans seed.update approved_at:null and nothing else', () => {
    const ops = planUnapprove([3, 5])
    expect(ops).toEqual([
      { op: 'seed.update', seed_number: 3, set: { approved_at: null } },
      { op: 'seed.update', seed_number: 5, set: { approved_at: null } },
    ])
    const plans = planOps(ops, C)
    expect(plans.every((p) => p.table === 'course_seeds' && Object.keys(p.set).join() === 'approved_at')).toBe(true)
  })
})

describe('both doors sit behind the editor-identity gate', () => {
  it('are registered write surfaces', () => {
    expect(findSurface('POST', '/api/admin/recompute-decompositions', 'production-api')?.surface.operation).toBe('decomposition-recompute')
    expect(findSurface('POST', '/api/admin/unapprove-seeds', 'production-api')?.surface.operation).toBe('unapprove')
  })
})
