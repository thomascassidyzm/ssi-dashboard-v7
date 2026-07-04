/**
 * End-to-end test of the ZUT gate wired into POST /build/backfill-submit/:courseCode
 * (services/course-builder/routes/build.cjs). Drives the real Express handler
 * (extracted from the router) against an in-memory fake Supabase — proves a
 * colliding backfill is rejected and a clean one still succeeds.
 *
 * Run: npx vitest run services/course-builder/routes/build-backfill-zut
 */

import { describe, it, expect } from 'vitest'

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

function buildRouterWithDb(db) {
  const supabase = makeFakeSupabase(db)
  const ctx = { supabase, config: {} }
  const router = require('./build.cjs')(ctx)
  return { router, db }
}

describe('POST /build/backfill-submit/:courseCode — ZUT gate', () => {
  it('rejects a USE phrase whose known text collides with an existing different target', async () => {
    const db = {
      course_legos: [
        { course_code: COURSE, seed_number: 10, lego_index: 1, known_text: 'want to', target_text: 'vouloir', type: 'A', is_new: true },
      ],
      course_practice_phrases: [
        { id: 'p_existing', course_code: COURSE, seed_number: 3, lego_index: 1, known_text: 'I am happy', target_text: 'je suis content', phrase_role: 'use', position: 1 },
      ],
    }
    const { router } = buildRouterWithDb(db)
    const handler = getHandler(router, 'post', '/build/backfill-submit/:courseCode')

    const req = {
      params: { courseCode: COURSE },
      body: {
        phrases: [{
          seed_number: 10,
          lego_index: 1,
          use: [{ known: 'I am happy', target: 'je suis vouloir heureux' }], // contains LEGO target "vouloir"; collides with existing "je suis content"
        }],
      },
    }
    const res = makeRes()
    await handler(req, res)

    expect(res.body.ok).toBe(true)
    expect(res.body.phrases_inserted).toBe(0)
    expect(res.body.errors).toHaveLength(1)
    expect(res.body.errors[0].error).toMatch(/ZUT violation/)
    // Nothing new was written.
    expect(db.course_practice_phrases).toHaveLength(1)
  })

  it('golden path: a non-colliding USE phrase still inserts', async () => {
    const db = {
      course_legos: [
        { course_code: COURSE, seed_number: 10, lego_index: 1, known_text: 'want to', target_text: 'vouloir', type: 'A', is_new: true },
      ],
      course_practice_phrases: [],
    }
    const { router } = buildRouterWithDb(db)
    const handler = getHandler(router, 'post', '/build/backfill-submit/:courseCode')

    const req = {
      params: { courseCode: COURSE },
      body: {
        phrases: [{
          seed_number: 10,
          lego_index: 1,
          use: [{ known: 'I want to leave', target: 'je veux vouloir partir' }],
        }],
      },
    }
    const res = makeRes()
    await handler(req, res)

    expect(res.body.ok).toBe(true)
    expect(res.body.phrases_inserted).toBe(1)
    expect(res.body.errors).toBeUndefined()
    expect(db.course_practice_phrases).toHaveLength(1)
    expect(db.course_practice_phrases[0].known_text).toBe('I want to leave')
  })
})
