// Dan's course link said "230 left" (24 Pod 1 + 206 seeds) because ?course= opened the flat
// whole-queue screen; for a controlled-queue actor it must land on the pinned home (job #850).
import { describe, it, expect } from 'vitest'
import { courseLinkGoesHome } from './booth-home.js'

describe('courseLinkGoesHome', () => {
  const pinned = { pinStartedPod: true }
  it('a course-only link of a controlled-queue actor goes to the pinned home', () => {
    expect(courseLinkGoesHome({ course: 'cym_s_for_eng' }, pinned)).toBe(true)
  })
  it('a pod or step link stays on its own step', () => {
    expect(courseLinkGoesHome({ course: 'c', pod: 'pod-1' }, pinned)).toBe(false)
    expect(courseLinkGoesHome({ course: 'c', step: 'seeds' }, pinned)).toBe(false)
  })
  it('an ordinary voice keeps the flat course screen', () => {
    expect(courseLinkGoesHome({ course: 'c' }, { pinStartedPod: false })).toBe(false)
    expect(courseLinkGoesHome({ course: 'c' }, null)).toBe(false)
  })
})
