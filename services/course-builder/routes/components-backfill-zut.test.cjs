/**
 * End-to-end test of the ZUT gate wired into POST /course/:courseCode/components/backfill
 * (services/course-builder/routes/components.cjs). Drives the real Express handler
 * against an in-memory fake Supabase — proves a colliding component write is rejected
 * and a clean one still succeeds.
 *
 * Run: npx vitest run services/course-builder/routes/components-backfill-zut
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
  const router = require('./components.cjs')(ctx)
  return { router, db }
}

describe('POST /course/:courseCode/components/backfill — ZUT gate', () => {
  it('rejects a component whose known text collides with an existing different target', async () => {
    const db = {
      course_legos: [
        {
          course_code: COURSE, seed_number: 20, lego_index: 1,
          known_text: 'want to leave', target_text: 'vouloir partir',
          type: 'M', components: null,
        },
      ],
      course_practice_phrases: [
        { id: 'p_existing', course_code: COURSE, seed_number: 4, lego_index: 1, known_text: 'to leave', target_text: 'sortir', phrase_role: 'use', position: 1 },
      ],
    }
    const { router } = buildRouterWithDb(db)
    const handler = getHandler(router, 'post', '/course/:courseCode/components/backfill')

    const req = {
      params: { courseCode: COURSE },
      query: {},
      body: {
        legos: [{
          seed_number: 20,
          lego_index: 1,
          components: [
            { known: 'want', target: 'vouloir' },
            { known: 'to leave', target: 'partir' }, // collides: "to leave" already -> "sortir"
          ],
        }],
      },
    }
    const res = makeRes()
    await handler(req, res)

    expect(res.body.processed).toBe(0)
    expect(res.body.failed).toBe(1)
    expect(res.body.errors[0].error).toMatch(/ZUT violation/)
    // Components JSONB was written (step 1 precedes the gate) but no new phrase rows were inserted.
    expect(db.course_practice_phrases).toHaveLength(1)
  })

  it('golden path: non-colliding components still insert', async () => {
    const db = {
      course_legos: [
        {
          course_code: COURSE, seed_number: 20, lego_index: 1,
          known_text: 'want to leave', target_text: 'vouloir partir',
          type: 'M', components: null,
        },
      ],
      course_practice_phrases: [],
    }
    const { router } = buildRouterWithDb(db)
    const handler = getHandler(router, 'post', '/course/:courseCode/components/backfill')

    const req = {
      params: { courseCode: COURSE },
      query: {},
      body: {
        legos: [{
          seed_number: 20,
          lego_index: 1,
          components: [
            { known: 'want', target: 'vouloir' },
            { known: 'to leave', target: 'partir' },
          ],
        }],
      },
    }
    const res = makeRes()
    await handler(req, res)

    expect(res.body.processed).toBe(1)
    expect(res.body.failed).toBe(0)
    const componentRows = db.course_practice_phrases.filter(p => p.phrase_role === 'component')
    expect(componentRows.length).toBeGreaterThan(0)
  })
})
