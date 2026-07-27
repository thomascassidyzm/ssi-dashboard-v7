// Authority-order tests for resolvePoptyIdentity — dashboard_users governs,
// learners ssi_admin is the no-row fallback, demotion sticks.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { resolvePoptyIdentity } = require('./popty-identity.cjs')

const ADMIN_LEARNER = { id: 'L1', display_name: 'Deborah', platform_role: 'ssi_admin', educational_role: 'god', dashboard_courses: null }

describe('resolvePoptyIdentity authority order', () => {
  it('dashboard_users row governs even when learners says ssi_admin (demotion sticks)', () => {
    const id = resolvePoptyIdentity({
      email: 'deborah@saysomethingin.com',
      dashboardRow: { name: 'Deborah', email: 'deborah@saysomethingin.com', role: 'editor', courses: ['afr_for_eng'], voice_id: null },
      learnerRow: ADMIN_LEARNER,
    })
    expect(id.authority).toBe('dashboard_users')
    expect(id.role).toBe('editor')
    expect(id.courses).toEqual(['afr_for_eng'])
    expect(id.learner_id).toBe('L1') // identity still linked for app features
  })

  it('dashboard_users admin keeps full access regardless of course list shape', () => {
    const id = resolvePoptyIdentity({
      email: 'a@b.c',
      dashboardRow: { name: 'A', email: 'a@b.c', role: 'admin', courses: ['one_for_two'], voice_id: null },
    })
    expect(id.role).toBe('admin') // gate's admin bypass fires before courses
  })

  it('ssi_admin/god learner WITHOUT a dashboard row → admin * (single-account convenience)', () => {
    const id = resolvePoptyIdentity({ email: 'tom@ssi.com', learnerRow: ADMIN_LEARNER })
    expect(id).toMatchObject({ role: 'admin', courses: '*', authority: 'learners' })
  })

  it('recorder row governs a recorder who is also a learner', () => {
    const id = resolvePoptyIdentity({
      email: 'maria@x.mk',
      dashboardRow: { name: 'Maria', email: 'maria@x.mk', role: 'recorder', courses: ['mkd_for_fra'], voice_id: 'human_maria_mkd' },
      learnerRow: { id: 'L9', display_name: 'maria', platform_role: 'learner', educational_role: null, dashboard_courses: null },
    })
    expect(id.role).toBe('recorder')
    expect(id.voice_id).toBe('human_maria_mkd')
  })

  it('legacy popty_user learner: courses from dashboard_courses; wildcard honoured', () => {
    expect(resolvePoptyIdentity({
      email: 'p@x.y',
      learnerRow: { id: 'L2', display_name: 'p', platform_role: 'popty_user', educational_role: null, dashboard_courses: ['cym_n_for_eng'] },
    })).toMatchObject({ role: 'user', courses: ['cym_n_for_eng'] })
    expect(resolvePoptyIdentity({
      email: 'p@x.y',
      learnerRow: { id: 'L2', display_name: 'p', platform_role: 'popty_user', educational_role: null, dashboard_courses: ['*'] },
    }).courses).toBe('*')
  })

  it('plain learner with no dashboard row → no Popty access', () => {
    expect(resolvePoptyIdentity({
      email: 'kid@school.ie',
      learnerRow: { id: 'L3', display_name: 'kid', platform_role: 'learner', educational_role: 'student', dashboard_courses: null },
    })).toBe(null)
  })

  it('no email → null; no rows at all → null', () => {
    expect(resolvePoptyIdentity({ email: null })).toBe(null)
    expect(resolvePoptyIdentity({ email: 'x@y.z' })).toBe(null)
  })
})

describe('hasAdminRole — the one admin gate', () => {
  const { hasAdminRole } = require('./popty-identity.cjs')

  it('admits only role admin, from either authority', () => {
    expect(hasAdminRole(resolvePoptyIdentity({
      email: 'a@b.c',
      dashboardRow: { name: 'A', email: 'a@b.c', role: 'admin', courses: '*', voice_id: null },
    }))).toBe(true)
    expect(hasAdminRole(resolvePoptyIdentity({ email: 'tom@ssi.com', learnerRow: ADMIN_LEARNER }))).toBe(true)
  })

  it('refuses every non-admin identity a JWT can resolve', () => {
    for (const role of ['editor', 'checker', 'recorder', 'user']) {
      expect(hasAdminRole(resolvePoptyIdentity({
        email: 'x@y.z',
        dashboardRow: { name: 'X', email: 'x@y.z', role, courses: '*', voice_id: null },
      }))).toBe(false)
    }
    // learners popty_user fallback resolves to role 'user' — refused
    expect(hasAdminRole(resolvePoptyIdentity({
      email: 'p@x.y',
      learnerRow: { id: 'L2', display_name: 'p', platform_role: 'popty_user', educational_role: null, dashboard_courses: ['*'] },
    }))).toBe(false)
  })

  it('refuses null / undefined / roleless identities', () => {
    expect(hasAdminRole(null)).toBe(false)
    expect(hasAdminRole(undefined)).toBe(false)
    expect(hasAdminRole({})).toBe(false)
  })
})

describe('requireAdmin wiring (drift gate on production-api source)', () => {
  // The 2026-07 hole: the Supabase-JWT branch returned its resolved user with
  // no role check, so every requireAdmin endpoint admitted any dashboard user.
  // Assert the middleware funnels through hasAdminRole and has no ungated
  // early return of a resolved identity.
  const fs = require('fs')
  const path = require('path')
  const src = fs.readFileSync(path.join(__dirname, '..', 'production-api.cjs'), 'utf8')
  const fnMatch = src.match(/async function requireAdmin\(req, res\) \{([\s\S]*?)\n\}/)

  it('requireAdmin exists and applies hasAdminRole', () => {
    expect(fnMatch).not.toBe(null)
    expect(fnMatch[1]).toContain('hasAdminRole(user)')
  })

  it('requireAdmin never returns a JWT-resolved user without the gate', () => {
    expect(fnMatch[1]).not.toMatch(/if \(supabaseUser\) return supabaseUser/)
  })
})
