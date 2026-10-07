/**
 * Hidden (sandbox) courses reach the Course Library for people who may open them
 * — and only them (job #818).
 * Run: npx vitest run services/shared/library-courses.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { coursesVisibleTo } = require('./library-courses.cjs')

const rows = [
  { course_code: 'cym_n_for_eng', visibility: 'public' },
  { course_code: 'cym_nv2_for_eng', visibility: 'hidden', display_name: 'Welsh (North) v2 — sandbox' },
  { course_code: 'spa_for_eng', visibility: 'public' },
]

describe('coursesVisibleTo', () => {
  it('shows an admin every course, hidden ones flagged', () => {
    const out = coursesVisibleTo({ email: 'a@x', role: 'admin', courses: '*' }, rows)
    expect(out.map((c) => c.course_code)).toContain('cym_nv2_for_eng')
    expect(out.find((c) => c.course_code === 'cym_nv2_for_eng').is_hidden).toBe(true)
    expect(out.find((c) => c.course_code === 'cym_n_for_eng').is_hidden).toBe(false)
  })
  it("shows a '*' grant everything", () => {
    expect(coursesVisibleTo({ role: 'editor', courses: '*' }, rows)).toHaveLength(3)
  })
  it('shows an explicit grant only the granted courses, hidden included', () => {
    const out = coursesVisibleTo({ role: 'editor', courses: ['cym_nv2_for_eng'] }, rows)
    expect(out.map((c) => c.course_code)).toEqual(['cym_nv2_for_eng'])
  })
  it('shows a user with no grant nothing, and nobody nothing', () => {
    expect(coursesVisibleTo({ role: 'editor', courses: [] }, rows)).toEqual([])
    expect(coursesVisibleTo({ role: 'editor', courses: null }, rows)).toEqual([])
    expect(coursesVisibleTo(null, rows)).toEqual([])
  })
})
