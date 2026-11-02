// After identity is proven (password or OTP), the dashboard_users row decides
// access, and a cached row rescues an outage. Both sign-in paths must resolve
// access the same way — this pins that shared behaviour.
//
// Run: npx vitest run src/composables/useAuth.access-after-identity.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { fake, rowResult } = vi.hoisted(() => {
  const rowResult = { data: null, error: null }
  const identity = { user: { email: 'kai@example.com', user_metadata: {} }, session: { access_token: null } }
  const fake = {
    auth: {
      signInWithPassword: async () => ({ data: identity, error: null }),
      verifyOtp: async () => ({ data: identity, error: null }),
      getSession: async () => ({ data: { session: null } }),
      signOut: async () => ({ error: null }),
    },
    from: () => {
      const b = {}
      for (const m of ['select', 'eq']) b[m] = () => b
      b.single = async () => rowResult
      return b
    },
  }
  return { fake, rowResult }
})

vi.mock('../services/supabase', () => ({ supabase: fake }))
vi.mock('../services/api.js', () => ({ getApiUrl: () => 'http://machine.invalid' }))

import { useAuth } from './useAuth'

beforeEach(() => {
  // The production machine is unreachable; only the direct row read answers.
  globalThis.fetch = vi.fn(async () => { throw new Error('ECONNREFUSED') })
  rowResult.data = null
})

for (const [name, signIn] of [
  ['password', (a) => a.signInWithPassword('kai@example.com', 'pw')],
  ['OTP', (a) => a.verifyOTP('kai@example.com', '123456')],
]) {
  describe(`${name} sign-in`, () => {
    it('adopts the dashboard_users row as the learner', async () => {
      rowResult.data = { email: 'kai@example.com', role: 'editor', courses: ['cym_for_eng'] }
      const auth = useAuth()
      await signIn(auth)
      expect(auth.learner.value).toEqual(rowResult.data)
      expect(auth.error.value).toBeNull()
      expect(auth.canAccessCourse('cym_for_eng')).toBe(true)
    })

    it('with no row and no reachable machine, says the machine is unreachable, not "no access"', async () => {
      const auth = useAuth()
      await auth.logout()
      await signIn(auth)
      expect(auth.learner.value).toBeNull()
      expect(auth.error.value).toMatch(/Could not reach/)
      expect(auth.accessLookupWasAuthoritative()).toBe(false)
    })
  })
}
