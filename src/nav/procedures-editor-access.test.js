// @vitest-environment jsdom
// job #125: course editors (granted a course) are allowed on /admin/procedures by the server; the client guard
// bounced them to Home because the route was requiresAdmin AND filed under the admin-only Admin section.
import { describe, it, expect } from 'vitest'
import { isAdminOnlyRoute } from './navigation.js'
import router from '../router/index.js'

describe('Procedures is reachable by granted editors', () => {
  it('is not admin-only territory', () => expect(isAdminOnlyRoute({ path: '/admin/procedures' })).toBe(false))
  it('is not requiresAdmin, but still requires a course grant', () => {
    const r = router.getRoutes().find((x) => x.path === '/admin/procedures')
    expect(r.meta.requiresAdmin).toBeFalsy()
    expect(r.meta.requiresCourseGrant).toBe(true)
  })
  it('other admin pages stay admin-only', () => expect(isAdminOnlyRoute({ path: '/admin/labs' })).toBe(true))
})
