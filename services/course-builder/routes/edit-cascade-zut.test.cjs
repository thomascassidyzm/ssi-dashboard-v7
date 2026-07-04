/**
 * Proves edit-cascade's existing (indirect) ZUT gate: the cascade re-inserts
 * every new breakdown through POST /api/seed/complete (postJson to SELF_URL),
 * which already runs checkLegoConflict + checkPhraseZUT (see seed-complete.cjs
 * lines ~432, ~1297) — edit-cascade never bypasses those checks, it delegates
 * to them. This test proves the PROPAGATION edit-cascade itself owns: a gate
 * rejection from /seed/complete must (a) roll the seed back to its prior
 * decomposition and (b) surface as a 422, and a gate pass must commit cleanly.
 * It does not re-prove checkLegoConflict/checkPhraseZUT's own logic — that's
 * covered by zut-gate.test.cjs and by seed-complete.cjs's existing reliance on them.
 *
 * Run: npx vitest run services/course-builder/routes/edit-cascade-zut
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

const { makeFakeSupabase } = require('../lib/testing/fake-supabase.cjs')

const COURSE = 'fra_for_eng'
const SEED = 42

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
    course_seeds: [
      { course_code: COURSE, seed_number: SEED, known_text: 'I want to leave', target_text: 'je veux partir', decomposed_at: '2026-01-01T00:00:00Z' },
    ],
    course_legos: [
      { id: 'L1', course_code: COURSE, seed_number: SEED, lego_index: 1, type: 'A', known_text: 'I want to leave', target_text: 'je veux partir' },
    ],
    course_practice_phrases: [
      { id: 'P1', course_code: COURSE, seed_number: SEED, lego_index: 1, known_text: 'I want to leave', target_text: 'je veux partir', phrase_role: 'build' },
    ],
  }
}

const originalFetch = global.fetch

afterEach(() => { global.fetch = originalFetch })

describe('POST /course/:courseCode/edit-cascade — ZUT gate propagation', () => {
  it('rejects and restores the original decomposition when /seed/complete reports a ZUT collision', async () => {
    const db = baseDb()
    const supabase = makeFakeSupabase(db)
    const ctx = { supabase }
    const router = require('./edit-cascade.cjs')(ctx)
    const handler = getHandler(router, 'post', '/course/:courseCode/edit-cascade')

    global.fetch = async (url) => {
      if (String(url).includes('/api/seed/complete')) {
        return {
          ok: false, status: 400,
          json: async () => ({
            error: 'ZUT violation: ambiguous prompt',
            known_text: 'to leave', new_target: 'quitter',
            existing: [{ target: 'sortir', legoId: 'S0003L01' }],
          }),
        }
      }
      throw new Error(`Unexpected fetch to ${url}`)
    }

    const req = {
      params: { courseCode: COURSE },
      body: {
        seed_number: SEED,
        target_text: 'je veux quitter',
        generateAudio: false,
        legos: [
          { idx: 1, type: 'A', known: 'I want to leave', target: 'je veux quitter', build: [{ known: 'to leave', target: 'quitter' }] },
        ],
      },
    }
    const res = makeRes()
    await handler(req, res)

    expect(res.statusCode).toBe(422)
    expect(res.body.error).toMatch(/original decomposition restored/)
    expect(res.body.gate_errors.error).toMatch(/ZUT violation/)

    // Original decomposition is back in place — never overwritten.
    expect(db.course_seeds[0].target_text).toBe('je veux partir')
    expect(db.course_legos.find(l => l.id === 'L1')).toBeTruthy()
    expect(db.course_practice_phrases.find(p => p.id === 'P1')).toBeTruthy()
  })

  it('golden path: commits the new breakdown when /seed/complete accepts it', async () => {
    const db = baseDb()
    const supabase = makeFakeSupabase(db)
    const ctx = { supabase }
    const router = require('./edit-cascade.cjs')(ctx)
    const handler = getHandler(router, 'post', '/course/:courseCode/edit-cascade')

    global.fetch = async (url, opts) => {
      if (String(url).includes('/api/seed/complete')) {
        const body = JSON.parse(opts.body)
        // Simulate seed-complete's insert (already gate-checked upstream — not re-tested here).
        body.legos.forEach((l, i) => {
          db.course_legos.push({
            id: `newL${i + 1}`, course_code: COURSE, seed_number: SEED, lego_index: i + 1,
            type: l.type, known_text: l.known_text || l.known, target_text: l.target_text || l.target,
          })
        })
        return { ok: true, status: 200, json: async () => ({ legos: body.legos.length }) }
      }
      if (String(url).includes('/api/v2/validate')) {
        return { ok: true, status: 200, json: async () => ({ failures: [] }) }
      }
      throw new Error(`Unexpected fetch to ${url}`)
    }

    const req = {
      params: { courseCode: COURSE },
      body: {
        seed_number: SEED,
        target_text: 'je veux sortir',
        generateAudio: false,
        legos: [
          { idx: 1, type: 'A', known: 'I want to leave', target: 'je veux sortir', build: [{ known: 'I want to leave', target: 'je veux sortir' }] },
        ],
      },
    }
    const res = makeRes()
    await handler(req, res)

    expect(res.body.ok).toBe(true)
    expect(res.body.mode).toBe('cascade')
    expect(db.course_seeds[0].target_text).toBe('je veux sortir')
    expect(db.course_legos.some(l => l.target_text === 'je veux sortir')).toBe(true)
  })
})
