// Job #482: the Course Manager must not offer Start (or Stop) before it knows the build state.
// Run: npx vitest run src/services/build-status-view.test.js
import { describe, it, expect } from 'vitest'
import { nextJobStatus, buildControls, statusBadgeText } from './build-status-view.js'

describe('before the first status answer', () => {
  it('Start and Stop are both disabled, and the badge says it is checking', () => {
    const c = buildControls('checking')
    expect(c.start.disabled).toBe(true)
    expect(c.stop.disabled).toBe(true)
    expect(statusBadgeText('checking')).toBe('Checking build status…')
  })
  it('a failed poll keeps the page checking rather than guessing idle', () => {
    expect(nextJobStatus('checking', null)).toBe('checking')
  })
})

describe('after the status answer', () => {
  it('a running build shows Stop, not Start', () => {
    const s = nextJobStatus('checking', { active: true, build: { status: 'running' } })
    expect(s).toBe('running')
    const c = buildControls(s)
    expect(c.start.show).toBe(false)
    expect(c.stop.show && !c.stop.disabled).toBe(true)
  })
  it('a stalled build is stuck and still stoppable', () => {
    const s = nextJobStatus('checking', { active: true, build: { status: 'stalled' } })
    expect(s).toBe('stuck')
    expect(buildControls(s).stop.show).toBe(true)
  })
  it('nothing running → idle with Start enabled', () => {
    const s = nextJobStatus('checking', { active: false })
    expect(s).toBe('idle')
    expect(buildControls(s).start).toMatchObject({ show: true, disabled: false })
  })
  it('a build that ended while the page was open drops back from running', () => {
    expect(nextJobStatus('running', { active: false })).toBe('idle')
  })
  it('a usage-limit pause offers Resume now and Cancel auto-resume', () => {
    const s = nextJobStatus('checking', { active: false, paused: true })
    expect(s).toBe('paused')
    const c = buildControls(s)
    expect(c.start.label).toBe('Resume now')
    expect(c.stop.label).toBe('Cancel auto-resume')
  })
  it('Start is disabled while a start request is in flight (no double press)', () => {
    expect(buildControls('idle', { starting: true }).start.disabled).toBe(true)
  })
})
