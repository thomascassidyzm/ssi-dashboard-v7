import { describe, it, expect } from 'vitest'
const { classifyLearnerRows, MACHINE_SPEED_EXPOSURE_THRESHOLD } = require('./learner-counts.cjs')

describe('honest human count — the Romanian case that started this (2026-08-23)', () => {
  it('91 rows across 2 non-auth/burst learner ids reports as 0 real humans, not 2', () => {
    // Fixture in the SHAPE of the ron_for_eng defect the cutover record carried as
    // "109 rows — the largest progress base": two learner ids, no auth.users match,
    // one clocking a machine-speed exposure count, all created the same day.
    const romania = [
      { learner_id: 'a', rows: 73, exposures: MACHINE_SPEED_EXPOSURE_THRESHOLD + 1000, has_auth_user: false, is_demo: false, is_internal: false, educational_role: null },
      { learner_id: 'b', rows: 18, exposures: 257, has_auth_user: false, is_demo: false, is_internal: false, educational_role: null },
    ]
    const result = classifyLearnerRows(romania)
    expect(result.rows).toBe(91)
    expect(result.humans).toBe(0)
    expect(result.excluded.no_auth_user).toBe(2)
  })

  it('the OLD behaviour this replaces — new Set(learner_id).size — would have said 2 "learners"', () => {
    const romania = [
      { learner_id: 'a', rows: 73, exposures: 2787, has_auth_user: false, is_demo: false, is_internal: false, educational_role: null },
      { learner_id: 'b', rows: 18, exposures: 257, has_auth_user: false, is_demo: false, is_internal: false, educational_role: null },
    ]
    const oldWayLearnerCount = new Set(romania.map(r => r.learner_id)).size
    const honest = classifyLearnerRows(romania)
    expect(oldWayLearnerCount).toBe(2)
    expect(honest.humans).toBe(0)
    expect(honest.humans).not.toBe(oldWayLearnerCount)
  })
})

describe('exclusion buckets are independently visible, never silently merged', () => {
  const base = { rows: 1, exposures: 5, has_auth_user: true, is_demo: false, is_internal: false, educational_role: null }
  it('a real, unflagged auth learner counts as a human', () => {
    const r = classifyLearnerRows([{ ...base, learner_id: 'real' }])
    expect(r.humans).toBe(1)
    expect(r.excluded).toEqual({ no_auth_user: 0, rehearsal_or_clone: 0, machine_speed: 0, school_demo: 0, internal_staff: 0 })
  })
  it('school-demo students are excluded and counted, not deleted from the picture', () => {
    const r = classifyLearnerRows([{ ...base, learner_id: 'kid', educational_role: 'student' }])
    expect(r.humans).toBe(0)
    expect(r.excluded.school_demo).toBe(1)
  })
  it('is_demo flag alone also lands in school_demo', () => {
    const r = classifyLearnerRows([{ ...base, learner_id: 'demo', is_demo: true }])
    expect(r.humans).toBe(0)
    expect(r.excluded.school_demo).toBe(1)
  })
  it('internal staff accounts are excluded and counted separately from school-demo', () => {
    const r = classifyLearnerRows([{ ...base, learner_id: 'staff', is_internal: true }])
    expect(r.humans).toBe(0)
    expect(r.excluded.internal_staff).toBe(1)
  })
  it('a machine-speed exposure count excludes even a real auth learner', () => {
    const r = classifyLearnerRows([{ ...base, learner_id: 'bot', exposures: MACHINE_SPEED_EXPOSURE_THRESHOLD }])
    expect(r.humans).toBe(0)
    expect(r.excluded.machine_speed).toBe(1)
  })
  it('rows and exposures totals always include excluded learners — the demoted parenthetical', () => {
    const r = classifyLearnerRows([
      { ...base, learner_id: 'real' },
      { ...base, learner_id: 'kid', educational_role: 'student', rows: 3, exposures: 9 },
    ])
    expect(r.humans).toBe(1)
    expect(r.rows).toBe(4)
    expect(r.exposures).toBe(14)
  })
})
