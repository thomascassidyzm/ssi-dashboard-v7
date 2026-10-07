/** A hidden course is named by its own display_name and flagged sandbox (job #818 follow-up). */
import { describe, it, expect } from 'vitest'
import { courseName, registerCourseRow, isSandboxCourse } from './languageNames'

describe('sandbox course naming', () => {
  it('uses display_name for a hidden course, derived name for a public one', () => {
    expect(isSandboxCourse('cym_nv2_for_eng')).toBe(false)
    registerCourseRow({ course_code: 'cym_nv2_for_eng', display_name: 'Welsh (North) v2 — sandbox', visibility: 'hidden' })
    registerCourseRow({ course_code: 'spa_for_eng', display_name: 'Spanish', visibility: 'public' })
    expect(courseName('cym_nv2_for_eng')).toBe('Welsh (North) v2 — sandbox')
    expect(isSandboxCourse('cym_nv2_for_eng')).toBe(true)
    expect(isSandboxCourse('spa_for_eng')).toBe(false)
    expect(courseName('spa_for_eng')).toMatch(/for English Speakers$/)
  })
})
