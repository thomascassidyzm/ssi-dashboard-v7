/**
 * End-to-end test of the ZUT gate wired into PATCH /phrases/:id (the Fixer
 * agent's direct phrase-edit endpoint, services/course-builder/routes/qa.cjs).
 * Drives the real Express handler against an in-memory fake Supabase — proves
 * an in-place edit that introduces a ZUT collision is rejected AND rolled back,
 * and a clean edit still applies.
 *
 * Run: npx vitest run services/course-builder/routes/qa-phrase-patch-zut
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
  const ctx = { supabase }
  const router = require('./qa.cjs')(ctx)
  return { router, db }
}

describe('PATCH /phrases/:id — ZUT gate', () => {
  it('rejects and rolls back an edit that collides with a different existing phrase', async () => {
    const db = {
      course_practice_phrases: [
        { id: 'A', course_code: COURSE, seed_number: 2, known_text: 'thanks', target_text: 'merci', phrase_role: 'use' },
        { id: 'B', course_code: COURSE, seed_number: 9, known_text: 'thanks', target_text: 'merci beaucoup', phrase_role: 'use' },
      ],
    }
    const { router } = buildRouterWithDb(db)
    const handler = getHandler(router, 'patch', '/phrases/:id')

    const req = { params: { id: 'A' }, body: { target_text: 'merci bien' } } // collides with B's "merci beaucoup"
    const res = makeRes()
    await handler(req, res)

    expect(res.statusCode).toBe(409)
    expect(res.body.error).toMatch(/ZUT violation/)
    // Rolled back to the pre-edit value.
    expect(db.course_practice_phrases.find(r => r.id === 'A').target_text).toBe('merci')
  })

  it('golden path: a non-colliding edit is applied', async () => {
    const db = {
      course_practice_phrases: [
        { id: 'A', course_code: COURSE, seed_number: 2, known_text: 'thanks', target_text: 'merci', phrase_role: 'use' },
      ],
    }
    const { router } = buildRouterWithDb(db)
    const handler = getHandler(router, 'patch', '/phrases/:id')

    const req = { params: { id: 'A' }, body: { target_text: 'merci beaucoup' } }
    const res = makeRes()
    await handler(req, res)

    expect(res.body.success).toBe(true)
    expect(db.course_practice_phrases.find(r => r.id === 'A').target_text).toBe('merci beaucoup')
  })
})
