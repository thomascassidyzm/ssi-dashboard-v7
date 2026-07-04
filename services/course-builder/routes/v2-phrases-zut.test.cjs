/**
 * End-to-end test of the ZUT gate wired into POST /v2/phrases/:courseCode
 * (services/course-builder/routes/v2.cjs). Drives the real Express handler
 * against an in-memory fake Supabase — proves a colliding phrase submission is
 * rejected and a clean one still succeeds.
 *
 * Run: npx vitest run services/course-builder/routes/v2-phrases-zut
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('../../phrase-decomposition-writer.cjs', () => ({
  decoratePhrasesWithDecomposition: vi.fn(async () => ({ decorated: 0, skipped: 0 })),
}))

const { makeFakeSupabase } = require('../lib/testing/fake-supabase.cjs')

const COURSE = 'fra_for_eng'

function getHandler(router, method, path) {
  const layer = router.stack.find(l => l.route && l.route.path === path && l.route.methods[method])
  if (!layer) throw new Error(`No ${method.toUpperCase()} route for ${path}`)
  return layer.route.stack[layer.route.stack.length - 1].handle
}

function makeRes() {
  const res = { statusCode: 200 }
  res.status = (code) => { res.statusCode = code; return res }
  res.json = (body) => { res.body = body; return res }
  return res
}

function baseDb() {
  return {
    // Seed 1 introduces the prior vocab (je, veux, sortir) as single-word chunks —
    // extractVocab keeps a whole target as ONE chunk, so DP-tiling needs each word
    // introduced by its own LEGO, not a multi-word seed sentence.
    course_legos: [
      { course_code: COURSE, seed_number: 1, lego_index: 1, known_text: 'myself', target_text: 'je', type: 'A', components: null, is_new: true },
      { course_code: COURSE, seed_number: 1, lego_index: 2, known_text: 'wishing', target_text: 'veux', type: 'A', components: null, is_new: true },
      { course_code: COURSE, seed_number: 1, lego_index: 3, known_text: 'to go out', target_text: 'sortir', type: 'A', components: null, is_new: true },
      { course_code: COURSE, seed_number: 2, lego_index: 1, known_text: 'to depart', target_text: 'partir', type: 'A', components: null, is_new: true },
    ],
    course_practice_phrases: [
      { id: 'p_existing', course_code: COURSE, seed_number: 1, lego_index: 3, known_text: 'I want to leave', target_text: 'je veux sortir', phrase_role: 'use' },
    ],
  }
}

function buildRouterWithDb(db) {
  const supabase = makeFakeSupabase(db)
  const ctx = { supabase, courseVocabCache: new Map() }
  const router = require('./v2.cjs')(ctx)
  return { router, db }
}

describe('POST /v2/phrases/:courseCode — ZUT gate', () => {
  it('rejects a USE phrase whose known text collides with an existing different target', async () => {
    const db = baseDb()
    const { router } = buildRouterWithDb(db)
    const handler = getHandler(router, 'post', '/v2/phrases/:courseCode')

    const req = {
      params: { courseCode: COURSE },
      body: {
        phrases: [{
          seed_number: 2,
          lego_index: 1,
          build: [{ known: 'to depart', target: 'partir' }],
          use: [{ known: 'I want to leave', target: 'je veux partir' }], // collides with existing "je veux sortir"
        }],
      },
    }
    const res = makeRes()
    await handler(req, res)

    expect(res.body.ok).toBe(true)
    expect(res.body.phrases_inserted).toBe(0)
    expect(res.body.errors).toHaveLength(1)
    expect(res.body.errors[0].error).toMatch(/ZUT violation/)
    expect(db.course_practice_phrases).toHaveLength(1) // nothing new written
  })

  it('golden path: a non-colliding phrase submission still inserts', async () => {
    const db = baseDb()
    const { router } = buildRouterWithDb(db)
    const handler = getHandler(router, 'post', '/v2/phrases/:courseCode')

    const req = {
      params: { courseCode: COURSE },
      body: {
        phrases: [{
          seed_number: 2,
          lego_index: 1,
          build: [{ known: 'to depart', target: 'partir' }],
          use: [{ known: 'I would like to leave', target: 'je veux partir' }], // same target as the rejected test, but no colliding known text
        }],
      },
    }
    const res = makeRes()
    await handler(req, res)

    expect(res.body.errors).toBeUndefined()
    expect(res.body.phrases_inserted).toBeGreaterThan(0)
    expect(db.course_practice_phrases.some(p => p.known_text === 'I would like to leave')).toBe(true)
  })
})
