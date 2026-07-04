/**
 * End-to-end test of the ZUT gate wired into POST /course/:code/finalize
 * (services/course-builder/routes/drafts.cjs). Drives the real Express handler
 * against an in-memory fake Supabase — proves a colliding draft phrase is
 * rejected (whole finalize aborts, matching the existing LEGO-collision style)
 * and a clean draft still finalizes.
 *
 * Run: npx vitest run services/course-builder/routes/drafts-finalize-zut
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
  const ctx = { supabase, courseVocabCache: new Map() }
  const router = require('./drafts.cjs')(ctx)
  return { router, db }
}

function draftRow(useKnown) {
  return {
    id: 'd1', course_code: COURSE, seed_number: 2,
    known_text: 'I want to depart', target_text: 'je veux partir',
    validation_status: 'valid',
    submission_data: {
      legos: [{
        idx: 1, type: 'A', known: 'to depart', target: 'partir',
        build: [{ known: 'to depart', target: 'partir' }],
        use: [{ known: useKnown, target: 'je veux partir' }],
      }],
    },
  }
}

describe('POST /course/:code/finalize — ZUT gate', () => {
  it('aborts finalize when a draft USE phrase collides with an existing different target', async () => {
    const db = {
      course_legos: [],
      course_practice_phrases: [
        { id: 'p_existing', course_code: COURSE, seed_number: 1, lego_index: 1, known_text: 'I want to leave', target_text: 'je veux sortir', phrase_role: 'use' },
      ],
      course_seed_drafts: [draftRow('I want to leave')], // collides with the existing phrase above
    }
    const { router } = buildRouterWithDb(db)
    const handler = getHandler(router, 'post', '/course/:code/finalize')

    const req = { params: { code: COURSE } }
    const res = makeRes()
    await handler(req, res)

    expect(res.statusCode).toBe(409)
    expect(res.body.error).toMatch(/ZUT violation/)
    expect(res.body.collisions[0]).toMatchObject({ existing_target: 'je veux sortir', existing_seed: 1 })
    // Nothing was written or cleaned up.
    expect(db.course_legos).toHaveLength(0)
    expect(db.course_practice_phrases).toHaveLength(1)
    expect(db.course_seed_drafts).toHaveLength(1)
  })

  it('golden path: a non-colliding draft still finalizes', async () => {
    const db = {
      course_legos: [],
      course_practice_phrases: [
        { id: 'p_existing', course_code: COURSE, seed_number: 1, lego_index: 1, known_text: 'I want to leave', target_text: 'je veux sortir', phrase_role: 'use' },
      ],
      course_seed_drafts: [draftRow('I would like to leave')], // no collision
    }
    const { router } = buildRouterWithDb(db)
    const handler = getHandler(router, 'post', '/course/:code/finalize')

    const req = { params: { code: COURSE } }
    const res = makeRes()
    await handler(req, res)

    expect(res.body.ok).toBe(true)
    expect(res.body.status).toBe('FINALIZED')
    expect(res.body.legos_introduced).toBe(1)
    expect(db.course_legos.some(l => l.known_text === 'to depart')).toBe(true)
    expect(db.course_practice_phrases.some(p => p.known_text === 'I would like to leave')).toBe(true)
    expect(db.course_seed_drafts).toHaveLength(0) // cleaned up on success
  })
})
