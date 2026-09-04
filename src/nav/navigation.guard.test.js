// @vitest-environment jsdom
//
// THE GUARD THAT KEEPS THE NAVIGATION DERIVED RATHER THAN MAINTAINED.
//
// Popty's nav bugs are all one shape: two things that must agree, with nothing
// comparing them. On 2026-09-03 three of them landed in an hour — the admin
// sub-tab row and the admin hub cards listing different pages, and /builds
// being a tab that `isAdminSection` had never heard of, so landing there
// un-highlighted Admin and dropped the whole row.
//
// So this file is the comparison. It reads the REAL router and the ONE nav
// declaration, and fails if:
//   * a route exists that the declaration neither owns nor deliberately
//     excludes (with a reason);
//   * a nav destination points at a route that does not exist;
//   * following a nav destination would leave its own section — the exact
//     /builds defect;
//   * the sub-tab row and the hub cards could list different pages;
//   * either rendered surface goes back to hard-coding its own list.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import router from '../router/index.js'
import {
  SECTIONS,
  ownsOf,
  OUTSIDE_NAV,
  PRIMARY_TABS,
  matchesAny,
  sectionFor,
  sectionTabs,
  primaryTabs,
  hubCards
} from './navigation.js'

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')

// Destinations only: a redirect is not a place, and the navbar is hidden on
// public routes (login, the recordist's room, shared links).
const destinations = router
  .getRoutes()
  .filter((r) => !r.redirect)
  .filter((r) => r.components && Object.keys(r.components).length > 0)
  .filter((r) => r.meta?.public !== true)

const OWNED = SECTIONS.flatMap(ownsOf)
const EXCLUDED = new Set(OUTSIDE_NAV.map((e) => e.path))

describe('every route is accounted for by the nav declaration', () => {
  it('has no route the navigation has never heard of', () => {
    const orphans = destinations
      .filter((r) => !matchesAny(OWNED, { path: r.path, name: r.name }))
      .filter((r) => !EXCLUDED.has(r.path))
      .map((r) => `${r.path} (${String(r.name)})`)
    // Adding a page? Put it in a section's `items` in src/nav/navigation.js,
    // or, if it is genuinely reached from inside another page, add it to
    // OUTSIDE_NAV with the reason.
    expect(orphans).toEqual([])
  })

  it('lists nothing in OUTSIDE_NAV that is no longer a route', () => {
    const live = new Set(router.getRoutes().map((r) => r.path))
    expect(OUTSIDE_NAV.filter((e) => !live.has(e.path)).map((e) => e.path)).toEqual([])
  })

  it('gives every OUTSIDE_NAV entry a reason', () => {
    expect(OUTSIDE_NAV.filter((e) => !e.why || e.why.length < 10)).toEqual([])
  })
})

const declaredItems = SECTIONS.flatMap((section) =>
  (typeof section.items === 'function' ? [] : section.items).map((item) => ({ section, item }))
)

describe('every nav destination is real and stays in its own section', () => {
  it.each([...PRIMARY_TABS, ...declaredItems.map(({ item }) => item)])(
    'resolves $to',
    (entry) => {
      const resolved = router.resolve(entry.to)
      expect(resolved.matched.length, `${entry.to} matches no route`).toBeGreaterThan(0)
      expect(resolved.name, `${entry.to} falls through to the 404 catch-all`).not.toBe(undefined)
    }
  )

  it.each(declaredItems)('keeps the row up on $item.to', ({ section, item }) => {
    const resolved = router.resolve(item.to)
    const owner = sectionFor(resolved)
    // The row may hand over to a sibling section (Stock-take does), but the
    // primary tab must not change — that is what "the row vanished underneath
    // you" looked like.
    expect(owner, `${item.to} belongs to no section`).not.toBeNull()
    expect(owner.primary).toBe(section.primary)
    // And you must be able to see where you are: normally the destination
    // lights itself up in whichever row you land in, but a solo section
    // renders no row at all and its PRIMARY tab is the highlight.
    if (section.soloTab) {
      expect(
        primaryTabs(resolved).some((t) => t.active),
        `${item.to} is a solo section but its primary tab is not lit`
      ).toBe(true)
    } else {
      const tabs = sectionTabs(resolved)
      expect(tabs.some((t) => t.active), `nothing is highlighted on ${item.to}`).toBe(true)
    }
  })

  // soloTab suppresses the sub-tab row. It may only ever do that for a section
  // that has nothing to show — otherwise it would hide real destinations, which
  // is the /builds defect wearing a flag.
  it.each(SECTIONS.filter((s) => s.soloTab))('$id declares soloTab and has one destination', (section) => {
    expect(section.items).toHaveLength(1)
    expect(sectionTabs(router.resolve(section.items[0].to))).toEqual([])
  })
})

describe('the two admin surfaces cannot disagree', () => {
  const adminSection = SECTIONS.find((s) => s.id === 'admin')

  it('lists the same destinations as tabs and as cards, bar the hub itself', () => {
    const tabDestinations = adminSection.items
      .filter((i) => !i.isHubSelf)
      .map((i) => i.to)
      .sort()
    const cardDestinations = hubCards('admin')
      .map((c) => c.to)
      .sort()
    expect(cardDestinations).toEqual(tabDestinations)
  })

  it('derives the navbar from the declaration instead of its own list', () => {
    const navbar = read('../components/AppNavbar.vue')
    expect(navbar).toContain("from '../nav/navigation'")
    // No hand-rolled tab list, and no hand-rolled section predicates.
    expect(navbar).not.toMatch(/\{\s*label:\s*'[^']+',\s*to:/)
    expect(navbar).not.toContain('isAdminSection')
  })

  it('derives the admin hub cards from the declaration instead of its own list', () => {
    const hub = read('../views/Admin.vue')
    expect(hub).toContain("from '../nav/navigation'")
    expect(hub).not.toMatch(/title:\s*'/)
  })
})
