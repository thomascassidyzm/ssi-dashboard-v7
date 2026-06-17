import { describe, it, expect } from 'vitest'
import scoping from '../scoping.cjs'
import { expectThrowsCode } from './helpers.js'

const { assertScope, assertEditableFields, hasUniqueKey } = scoping

describe('assertScope — the incident guard', () => {
  it('REFUSES the exact incident write (lego_id, no course_code)', async () => {
    await expectThrowsCode(() => assertScope('course_legos', { lego_id: 'S0524L01' }), 'SCOPE_ERROR')
  })

  it('refuses any scope missing course_code', () => {
    expect(() => assertScope('course_legos', { id: 'id-1' })).toThrow(/course_code/)
    expect(() => assertScope('course_practice_phrases', { id: 'x:Y' })).toThrow(/course_code/)
  })

  it('refuses a course_code with no within-course unique key', () => {
    expect(() => assertScope('course_legos', { course_code: 'spa_for_eng' })).toThrow(/unique key/)
  })

  it('accepts course_code + id', () => {
    expect(() => assertScope('course_legos', { course_code: 'spa_for_eng', id: 'id-1' })).not.toThrow()
  })

  it('accepts course_code + seed_number + lego_index', () => {
    expect(() => assertScope('course_legos', { course_code: 'spa_for_eng', seed_number: 1, lego_index: 2 })).not.toThrow()
  })

  it('accepts course_code + lego_id (unique WITHIN a course)', () => {
    expect(() => assertScope('course_legos', { course_code: 'spa_for_eng', lego_id: 'S0001L02' })).not.toThrow()
  })

  it('rejects partial composite key (seed_number without lego_index)', async () => {
    await expectThrowsCode(() => assertScope('course_legos', { course_code: 'spa_for_eng', seed_number: 1 }), 'SCOPE_ERROR')
  })

  it('rejects unknown tables', async () => {
    await expectThrowsCode(() => assertScope('users', { id: 1, course_code: 'x' }), 'TABLE_NOT_ALLOWED')
    await expectThrowsCode(() => assertScope('audio_samples', { id: 1, course_code: 'x' }), 'TABLE_NOT_ALLOWED')
  })

  it('phrases require id (lego_id is meaningless there)', async () => {
    await expectThrowsCode(() => assertScope('course_practice_phrases', { course_code: 'x', lego_id: 'S0001L01' }), 'SCOPE_ERROR')
    expect(() => assertScope('course_practice_phrases', { course_code: 'x', id: 'x:S0001L01B01' })).not.toThrow()
  })

  it('crossCourse:true allows omitting course_code only when explicit', () => {
    expect(() => assertScope('course_audio', { id: 'aud-1' }, { crossCourse: true })).not.toThrow()
    expect(() => assertScope('course_audio', {}, { crossCourse: true })).toThrow(/unique key/)
  })

  it('treats empty-string course_code as missing', () => {
    expect(() => assertScope('course_legos', { course_code: '', id: 'id-1' })).toThrow(/course_code/)
  })
})

describe('assertEditableFields', () => {
  it('allows whitelisted fields', () => {
    expect(() => assertEditableFields('course_legos', { known_text: 'x', is_new: false })).not.toThrow()
  })
  it('blocks writing audio-id columns through content edits', async () => {
    await expectThrowsCode(() => assertEditableFields('course_legos', { known_audio_id: 'forged' }), 'SCOPE_ERROR')
  })
  it('blocks writing the primary key or course_code', async () => {
    await expectThrowsCode(() => assertEditableFields('course_legos', { id: 'new', course_code: 'other' }), 'SCOPE_ERROR')
  })
})

describe('hasUniqueKey', () => {
  it('treats null/undefined/empty as absent; 0 is present', () => {
    expect(hasUniqueKey('course_legos', { id: null })).toBe(false)
    expect(hasUniqueKey('course_legos', { id: undefined })).toBe(false)
    expect(hasUniqueKey('course_legos', { seed_number: 1, lego_index: 0 })).toBe(true)
  })
})
