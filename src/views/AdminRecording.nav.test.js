// @vitest-environment jsdom
//
// THE PAGE HAS TO BE REACHABLE. /admin/recording existed for weeks and appeared
// in neither of the two places the admin section lists its destinations, so the
// only way to it was remembering the URL.
//
// Since 2026-09-04 both places are derived from one declaration, so this is now
// an assertion about that declaration: the page is an admin destination, and it
// highlights itself when you are on it. (The structural guarantee that the tab
// row and the hub cards agree lives in src/nav/navigation.guard.test.js.)
import { describe, it, expect } from 'vitest'
import router from '../router/index.js'
import { SECTIONS, sectionFor, sectionTabs, hubCards } from '../nav/navigation.js'

const admin = SECTIONS.find((s) => s.id === 'admin')

describe('Human Recording is reachable from the admin nav', () => {
  it('is a declared admin destination', () => {
    expect(admin.items.map((i) => i.to)).toContain('/admin/recording')
  })

  it('is both a tab and a card, because they are one list', () => {
    expect(hubCards('admin').map((c) => c.to)).toContain('/admin/recording')
    const tabs = sectionTabs(router.resolve('/admin/recording'))
    expect(tabs.map((t) => t.to)).toContain('/admin/recording')
  })

  it('lights up its own tab and keeps the Admin section', () => {
    const route = router.resolve('/admin/recording')
    expect(sectionFor(route).id).toBe('admin')
    const active = sectionTabs(route).filter((t) => t.active)
    expect(active.map((t) => t.to)).toEqual(['/admin/recording'])
  })

  it('is registered as a route', () => {
    expect(router.resolve('/admin/recording').name).toBe('AdminRecording')
  })
})
