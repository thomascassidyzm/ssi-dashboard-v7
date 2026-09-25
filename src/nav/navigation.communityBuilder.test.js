// @vitest-environment jsdom
//
// A COMMUNITY BUILDER SEES NO PLATFORM ROOM AND NO COURSE OVERVIEW
// (Tom, 2026-09-25). Job #183 signed in as an ordinary `editor` and found the
// Admin tab, and /admin rendering cards for Insights, Users, SSi HQ and Labs.
// Tom: "fix both". And for the course: "we don't use course overview for
// community users … We go from course journey".
//
// The lock is read off the same declaration the Admin tab is drawn from
// (isAdminOnlyRoute), so these assertions are the proof that everything the
// tab owns is refused to an editor — including a page added to it tomorrow.
import { describe, it, expect } from 'vitest'
import router from '../router/index.js'
import { isAdminOnlyRoute, primaryTabs, sectionTabs } from './navigation.js'

const at = (path) => router.resolve(path)

describe('the Admin tab\'s territory is admin-only', () => {
  it.each(['/admin', '/admin/labs', '/admin/labs/voice', '/admin/recording', '/insights', '/users', '/hq', '/jobs', '/maintenance', '/stocktake'])(
    '%s is admin-only',
    (path) => { expect(isAdminOnlyRoute(at(path))).toBe(true) },
  )

  it.each(['/builds', '/production/cat_for_gle/journey', '/production/cat_for_gle/pods', '/courses', '/pedagogy', '/'])(
    '%s is open to a builder',
    (path) => { expect(isAdminOnlyRoute(at(path))).toBe(false) },
  )

  it('draws no Admin tab for an editor, and still draws it for an admin', () => {
    const route = at('/courses')
    expect(primaryTabs(route, { isAdmin: false }).map((t) => t.label)).not.toContain('Admin')
    expect(primaryTabs(route, { isAdmin: true }).map((t) => t.label)).toContain('Admin')
  })
})

describe('a builder\'s one course door is the journey, never the overview', () => {
  it('shows an editor Journey in the course row, and an admin Overview', () => {
    const route = at('/production/cat_for_gle/pods')
    expect(sectionTabs(route, {}, { isAdmin: false }).map((t) => t.to)).toEqual(['/production/cat_for_gle/journey'])
    expect(sectionTabs(route, {}, { isAdmin: true }).map((t) => t.to)).toEqual(['/production/cat_for_gle'])
  })
})
