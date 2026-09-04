// ONE COPY OF THE COLLAPSE, AND THE TWO RULES IT KEEPS.
//
// The lists it drives are Aran's: the already-recorded list in RecordistRoom
// and the "See every line" list in RecordistRoster. What goes quietly wrong is
// that a section reads as open when he never opened it (the flat list again), or
// that a filter's forced opening eats the taps he had made, so clearing the
// search leaves the panel shut underneath him.
import { describe, it, expect } from 'vitest'
import { useSectionCollapse } from './section-collapse'

describe('useSectionCollapse', () => {
  it('starts with everything shut', () => {
    const c = useSectionCollapse()
    expect(c.isOpen({ key: 'pod:senedd-s4c-steve' })).toBe(false)
    expect(c.openKeys.value.size).toBe(0)
  })

  it('opens one section on a tap and shuts it on the next, leaving the others alone', () => {
    const c = useSectionCollapse()
    c.toggle('a')
    expect(c.isOpen({ key: 'a' })).toBe(true)
    expect(c.isOpen({ key: 'b' })).toBe(false)
    c.toggle('b')
    expect(c.isOpen({ key: 'a' })).toBe(true)
    c.toggle('a')
    expect(c.isOpen({ key: 'a' })).toBe(false)
    expect(c.isOpen({ key: 'b' })).toBe(true)
  })

  it('reads a forceOpen section as open without eating his taps', () => {
    const c = useSectionCollapse()
    c.toggle('a')
    // While a filter runs, every matching section arrives forceOpen.
    expect(c.isOpen({ key: 'b', forceOpen: true })).toBe(true)
    // And when it clears, only what he actually opened is still open.
    expect(c.isOpen({ key: 'b' })).toBe(false)
    expect(c.isOpen({ key: 'a' })).toBe(true)
  })

  it('openFor opens a section without closing the one he was reading', () => {
    const c = useSectionCollapse()
    c.toggle('a')
    c.openFor('b')
    expect(c.isOpen({ key: 'a' })).toBe(true)
    expect(c.isOpen({ key: 'b' })).toBe(true)
    c.openFor('b') // idempotent
    expect(c.openKeys.value.size).toBe(2)
  })

  it('replaces the set rather than mutating it, so the heading repaints', () => {
    const c = useSectionCollapse()
    const before = c.openKeys.value
    c.toggle('a')
    expect(c.openKeys.value).not.toBe(before)
  })

  it('survives a missing section', () => {
    const c = useSectionCollapse()
    expect(c.isOpen(null)).toBe(false)
    expect(c.isOpen(undefined)).toBe(false)
  })
})
