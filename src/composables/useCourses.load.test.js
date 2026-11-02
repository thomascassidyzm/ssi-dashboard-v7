// loadCourses() shapes a Supabase `courses` row into the course list Popty
// shows. This pins that shape and the shared-in-flight load.
//
// Run: npx vitest run src/composables/useCourses.load.test.js

import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

const { rows } = vi.hoisted(() => ({ rows: [] }))

vi.mock('../services/supabase', () => ({
  isConfigured: () => true,
  getAllCourses: vi.fn(async () => rows),
}))
vi.mock('../services/api', () => ({ default: {}, getApiUrl: () => 'http://machine.invalid' }))
vi.mock('./useAuth', () => ({ useAuth: () => ({ canAccessCourse: () => true }) }))
vi.mock('../utils/languageNames', () => ({
  courseName: (code) => `name:${code}`,
  languageName: (code) => code,
  loadLanguageNames: async () => {},
  nameVersion: ref(0),
}))

import { useCourses } from './useCourses'
import { getAllCourses } from '../services/supabase'

describe('loadCourses from Supabase', () => {
  it('shapes each row, defaulting pricing_tier, export_ready and stats', async () => {
    rows.push(
      { course_code: 'cym_for_eng', new_app_status: 'live', legacy_app_status: null, content_status: 'complete',
        pricing_tier: null, seed_count: 668, created_at: '2026-01-01', updated_at: '2026-02-02' },
      { course_code: 'pdc_for_eng', pricing_tier: 'free', seed_count: 10 },
    )
    const { courses, loadCourses, loading } = useCourses()
    const p1 = loadCourses()
    const p2 = loadCourses()
    expect(p2).toBe(p1) // one in-flight load, shared
    await p1
    expect(loading.value).toBe(false)
    expect(getAllCourses).toHaveBeenCalledTimes(1)
    expect(courses.value).toEqual([
      { code: 'cym_for_eng', name: 'name:cym_for_eng', new_app_status: 'live', legacy_app_status: null,
        new_app_beta_days: undefined, legacy_app_beta_days: undefined, content_status: 'complete',
        pricing_tier: 'premium', export_ready: false, seed_count: 668, created_at: '2026-01-01', updated_at: '2026-02-02',
        stats: { seeds: 0, completedSeeds: 0, legos: 0, phrases: 0, audio: 0 } },
      { code: 'pdc_for_eng', name: 'name:pdc_for_eng', new_app_status: undefined, legacy_app_status: undefined,
        new_app_beta_days: undefined, legacy_app_beta_days: undefined, content_status: undefined,
        pricing_tier: 'free', export_ready: false, seed_count: 10, created_at: null, updated_at: null,
        stats: { seeds: 0, completedSeeds: 0, legos: 0, phrases: 0, audio: 0 } },
    ])
    // Loaded once; a second call without force does not refetch.
    await loadCourses()
    expect(getAllCourses).toHaveBeenCalledTimes(1)
  })
})
