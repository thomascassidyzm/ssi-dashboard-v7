/**
 * End-to-end test of the ZUT gate wired into POST /course/:courseCode/components/backfill
 * (services/course-builder/routes/components.cjs). Drives the real Express handler
 * against an in-memory fake Supabase.
 *
 * Per Tom's ruling (2026-07-04, docs/course-optimization/zut-violation-sweep-pilot-fra-40.md):
 * component rows are per-sentence literal tiling glosses, not atomized intentions — they
 * are EXEMPT from the known-side ZUT check (a component's known_text colliding with another
 * row's known->target mapping is no longer rejected), but NOT exempt on the target side: a
 * component's target_text must still be a genuine constituent of its own seed's target
 * sentence (target-membership check).
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
  it('ACCEPTS a component whose known text collides with an existing different target (known-side exemption)', async () => {
    const db = {
      course_seeds: [
        { course_code: COURSE, seed_number: 20, known_text: 'he is going to want to leave', target_text: 'il va vouloir partir' },
      ],
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
            // "to leave" already -> "sortir" elsewhere — a real LEGO/BUILD/USE row would
            // be rejected for this, but a component's known label is exempt: "partir" IS
            // a genuine constituent of seed 20's target sentence, so it must be accepted.
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
    expect(componentRows.map(r => r.target_text)).toContain('partir')
  })

  it('REJECTS a component whose target_text is not a constituent of its own seed target sentence (target-membership)', async () => {
    const db = {
      course_seeds: [
        { course_code: COURSE, seed_number: 20, known_text: 'he is going to want to leave', target_text: 'il va vouloir partir' },
      ],
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
            // "sortir" never appears in seed 20's target sentence ("il veut partir") — orphan.
            { known: 'to leave', target: 'sortir' },
          ],
        }],
      },
    }
    const res = makeRes()
    await handler(req, res)

    expect(res.body.processed).toBe(0)
    expect(res.body.failed).toBe(1)
    expect(res.body.errors[0].error).toMatch(/ZUT violation/)
    expect(db.course_practice_phrases.some(p => p.target_text === 'sortir')).toBe(false)
  })

  it('golden path: non-colliding, sentence-member components still insert', async () => {
    const db = {
      course_seeds: [
        { course_code: COURSE, seed_number: 20, known_text: 'he is going to want to leave', target_text: 'il va vouloir partir' },
      ],
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
