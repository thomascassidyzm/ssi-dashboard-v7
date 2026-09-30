/**
 * v3 writes phrases only for a DEBUT LEGO (Tom, 2026-09-30; canon P25): a not-new LEGO's basket
 * is never played, so the generator refuses it before any model call.
 * Run: npx vitest run services/course-builder/lib/phrase-generation.not-new.test.cjs
 */
import { describe, it, expect } from 'vitest'
const path = require('path')

// The model is stubbed through the require cache: a call to it is the failure this test looks for.
const cliPath = require.resolve('../../shared/claude-cli.cjs')
const calls = []
require.cache[cliPath] = { id: cliPath, filename: cliPath, loaded: true, exports: { ...require(cliPath), claudeChat: async (...a) => { calls.push(a); return '{"build":[],"use":[]}' } } }
const { generateLegoPhrases } = require('./phrase-generation.cjs')

// A generic supabase-js stand-in: eq/lt/lte/in filter the table's rows, everything else chains.
function fakeSupabase(tables) {
  return {
    from(table) {
      let rows = [...(tables[table] || [])]
      const c = {
        select: () => c, order: () => c, not: () => c, limit: () => c, gt: () => c, contains: () => c,
        eq: (k, v) => { rows = rows.filter((r) => r[k] === undefined || r[k] === v); return c },
        lt: (k, v) => { rows = rows.filter((r) => r[k] === undefined || r[k] < v); return c },
        lte: (k, v) => { rows = rows.filter((r) => r[k] === undefined || r[k] <= v); return c },
        in: (k, vs) => { rows = rows.filter((r) => r[k] === undefined || vs.includes(r[k])); return c },
        range: async () => ({ data: rows, error: null }),
        single: async () => ({ data: rows[0] || null, error: rows[0] ? null : { message: 'none' } }),
        maybeSingle: async () => ({ data: rows[0] || null, error: null }),
        insert: () => c, update: () => c, upsert: () => c,
        then: (ok) => ok({ data: rows, error: null }),
      }
      return c
    },
  }
}

describe('generateLegoPhrases', () => {
  it('refuses a not-new LEGO with failingGates [notNew] and never calls the model', async () => {
    const legos = [
      { lego_id: 'S0005L01', seed_number: 5, lego_index: 1, type: 'A', is_new: true, known_text: 'to go', target_text: 'andare', components: null },
      { lego_id: 'S0009L02', seed_number: 9, lego_index: 2, type: 'A', is_new: false, known_text: 'to go', target_text: 'andare', components: null },
    ]
    const seeds = [{ seed_number: 9, known_text: 'I want to go', target_text: 'voglio andare' }]
    const r = await generateLegoPhrases(fakeSupabase({ course_legos: legos, course_seeds: seeds }), 'ita_for_eng', 9, 2)
    expect(r.blocked).toBe(true)
    expect(r.gate.failingGates).toEqual(['notNew'])
    expect(r.build).toEqual([]); expect(r.use).toEqual([])
    expect(calls).toHaveLength(0)
  })
})
