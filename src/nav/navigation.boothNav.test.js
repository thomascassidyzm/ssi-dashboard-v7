// @vitest-environment jsdom
//
// THE BOOTH CARRIES POPTY'S TOP BAR (job #411, Aran 2026-10-14) — cut to whoever is looking,
// and gone while the mic is live. A private-link artist must never be shown a door they cannot
// open, and nothing tappable may sit on screen mid-take.
import { describe, it, expect } from 'vitest'
import router from '../router/index.js'
import { navbarMode } from './navigation.js'

const booth = router.resolve('/r/human_aran_cym_n')
const mine = router.resolve('/my-recording')
const signedOut = { isAuthenticated: false, isAdmin: false, isRecorder: false }
const admin = { isAuthenticated: true, isAdmin: true, isRecorder: false }
const editor = { isAuthenticated: true, isAdmin: false, isRecorder: false }
const recorder = { isAuthenticated: true, isAdmin: false, isRecorder: true }

describe('the booth pages show the main navbar', () => {
  it('the booth and the login door onto it declare the booth bar', () => {
    expect(booth.meta.boothNav).toBe(true)
    expect(mine.meta.boothNav).toBe(true)
  })

  it('an admin or an editor sees the full bar, as main Popty filters it for them', () => {
    expect(navbarMode(booth, admin)).toBe('full')
    expect(navbarMode(booth, editor)).toBe('full')
  })

  it('a signed-out private-link artist and a recorder get the cut-down bar, never the console', () => {
    expect(navbarMode(booth, signedOut)).toBe('minimal')
    expect(navbarMode(booth, recorder)).toBe('minimal')
    expect(navbarMode(mine, recorder)).toBe('minimal')
  })

  it('the bar goes while the mic is live, whoever is recording', () => {
    for (const v of [admin, editor, recorder, signedOut]) {
      expect(navbarMode(booth, { ...v, micLive: true })).toBe('hidden')
    }
  })

  it('everywhere else is unchanged: public pages and recorders off the booth have no bar', () => {
    expect(navbarMode(router.resolve('/login'), signedOut)).toBe('hidden')
    expect(navbarMode(router.resolve('/courses'), recorder)).toBe('hidden')
    expect(navbarMode(router.resolve('/courses'), admin)).toBe('full')
  })
})
