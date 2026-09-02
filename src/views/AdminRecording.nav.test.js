// THE PAGE HAS TO BE REACHABLE. /admin/recording existed for weeks and appeared
// in neither of the two places the admin section lists its destinations, so the
// only way to it was remembering the URL. This asserts the link exists in both
// — a source-text check on purpose: mounting the navbar would test Vue, and the
// failure being guarded against is a link quietly dropped in a future edit.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')

describe('Human Recording is reachable from the admin nav', () => {
  it('is a card on the admin hub', () => {
    const hub = read('./Admin.vue')
    expect(hub).toContain("to: '/admin/recording'")
    expect(hub).toContain("title: 'Human Recording'")
  })

  it('is a tab in the admin section row', () => {
    const navbar = read('../components/AppNavbar.vue')
    expect(navbar).toContain("to: '/admin/recording'")
    // Active only on its own page — the hub tab must not light up here, and
    // this page must not leave the row unhighlighted.
    expect(navbar).toContain("route.path.startsWith('/admin/recording')")
  })

  it('is registered as a route', () => {
    expect(read('../router/index.js')).toContain("'/admin/recording'")
  })
})
