/**
 * Unit tests for the shared ZUT-gate wiring (checkNewPhrases / checkEditedPhrase).
 * These wrap checkPhraseZUT (validation.cjs) unmodified — the tests prove the
 * wiring rejects a real collision and lets a non-colliding (golden-path) edit through.
 *
 * Run: npx vitest run services/course-builder/lib/zut-gate
 */

import { describe, it, expect } from 'vitest'

const { makeFakeSupabase } = require('./testing/fake-supabase.cjs')
const { checkNewPhrases, checkEditedPhrase, zutErrorBody } = require('./zut-gate.cjs')

const COURSE = 'fra_for_eng'

describe('checkNewPhrases (pre-insert gate for new rows)', () => {
  it('rejects a new phrase whose known text already maps to a different target', async () => {
    const db = {
      course_practice_phrases: [
        { id: 'p1', course_code: COURSE, known_text: 'how are you', target_text: 'comment vas-tu', seed_number: 5 },
      ],
      course_legos: [],
    }
    const supabase = makeFakeSupabase(db)
    const collisions = await checkNewPhrases(supabase, COURSE, [
      { known: 'how are you', target: 'comment ça va' },
    ])
    expect(collisions).toHaveLength(1)
    expect(collisions[0]).toMatchObject({ existing_target: 'comment vas-tu', existing_seed: 5 })
  })

  it('golden path: a consistent known->target mapping is never flagged', async () => {
    const db = {
      course_practice_phrases: [
        { id: 'p1', course_code: COURSE, known_text: 'how are you', target_text: 'comment vas-tu', seed_number: 5 },
      ],
      course_legos: [],
    }
    const supabase = makeFakeSupabase(db)
    const collisions = await checkNewPhrases(supabase, COURSE, [
      { known: 'how are you', target: 'comment vas-tu' },
    ])
    expect(collisions).toHaveLength(0)
  })

  it('zutErrorBody surfaces the collision with a clear, non-500 shape', async () => {
    const db = { course_practice_phrases: [{ known_text: 'k', target_text: 'existing', seed_number: 1, course_code: COURSE }], course_legos: [] }
    const collisions = await checkNewPhrases(makeFakeSupabase(db), COURSE, [{ known: 'k', target: 'new' }])
    const body = zutErrorBody(collisions)
    expect(body.error).toMatch(/ZUT violation/)
    expect(body.collisions).toEqual(collisions)
  })
})

describe('checkNewPhrases — component-role exemption (Tom\'s ruling, 2026-07-04)', () => {
  it('ACCEPTS a component row whose known text collides with an existing different target', async () => {
    const db = {
      course_seeds: [
        { course_code: COURSE, seed_number: 10, target_text: 'il n\'aimait pas cet endroit' },
      ],
      course_practice_phrases: [
        { id: 'p1', course_code: COURSE, known_text: 'that', target_text: 'que', seed_number: 3 },
      ],
      course_legos: [],
    }
    const supabase = makeFakeSupabase(db)
    const collisions = await checkNewPhrases(supabase, COURSE, [
      { known: 'that', target: 'cet', role: 'component', seedNumber: 10 },
    ])
    expect(collisions).toHaveLength(0)
  })

  it('REJECTS a component row whose target_text is not part of its own seed\'s target sentence', async () => {
    const db = {
      course_seeds: [
        { course_code: COURSE, seed_number: 10, target_text: 'il n\'aimait pas cet endroit' },
      ],
      course_practice_phrases: [],
      course_legos: [],
    }
    const supabase = makeFakeSupabase(db)
    const collisions = await checkNewPhrases(supabase, COURSE, [
      { known: 'that', target: 'dire', role: 'component', seedNumber: 10 },
    ])
    expect(collisions).toHaveLength(1)
    expect(collisions[0]).toMatchObject({ type: 'target_membership', new_target: 'dire', existing_seed: 10 })
  })

  it('non-component rows are unaffected by the exemption (unchanged bidirectional check)', async () => {
    const db = {
      course_seeds: [],
      course_practice_phrases: [
        { id: 'p1', course_code: COURSE, known_text: 'that', target_text: 'que', seed_number: 3 },
      ],
      course_legos: [],
    }
    const supabase = makeFakeSupabase(db)
    const collisions = await checkNewPhrases(supabase, COURSE, [
      { known: 'that', target: 'cet' },
    ])
    expect(collisions).toHaveLength(1)
    expect(collisions[0]).toMatchObject({ type: 'known_side', existing_target: 'que' })
  })
})

describe('checkEditedPhrase (post-write gate for in-place edits)', () => {
  it('rolls back an edit that collides with a DIFFERENT existing row', async () => {
    const db = {
      course_practice_phrases: [
        // Row being edited — the caller already wrote target_text: 'salut' before calling us.
        { id: 'A', course_code: COURSE, known_text: 'thanks', target_text: 'salut', seed_number: 2 },
        // A different phrase, same known text, different (pre-existing) target — real collision partner.
        { id: 'B', course_code: COURSE, known_text: 'thanks', target_text: 'merci beaucoup', seed_number: 9 },
      ],
      course_legos: [],
    }
    const supabase = makeFakeSupabase(db)

    const result = await checkEditedPhrase(supabase, COURSE, {
      table: 'course_practice_phrases',
      id: 'A',
      known: 'thanks',
      target: 'salut',
      revertFields: { known_text: 'thanks', target_text: 'merci' },
    })

    expect(result.ok).toBe(false)
    expect(result.collisions.length).toBeGreaterThan(0)
    // Rolled back to the pre-edit value.
    expect(db.course_practice_phrases.find(r => r.id === 'A').target_text).toBe('merci')
  })

  it('golden path: an edit with no collision is left in place, not rolled back', async () => {
    const db = {
      course_practice_phrases: [
        { id: 'A', course_code: COURSE, known_text: 'thanks', target_text: 'grazie', seed_number: 2 },
      ],
      course_legos: [],
    }
    const supabase = makeFakeSupabase(db)

    const result = await checkEditedPhrase(supabase, COURSE, {
      table: 'course_practice_phrases',
      id: 'A',
      known: 'thanks',
      target: 'grazie',
      revertFields: { known_text: 'thanks', target_text: 'merci' },
    })

    expect(result.ok).toBe(true)
    expect(db.course_practice_phrases.find(r => r.id === 'A').target_text).toBe('grazie')
  })
})
