import { describe, it, expect } from 'vitest'
import {
  resolveDefaultEnv,
  HOSTED_DEFAULT_ENV,
  FALLBACK_DEFAULT_ENV,
} from '../default-environment.js'

// The regression these guard is Aran's, 2026-08-10: proofing Welsh pod scripts
// on popty.app, every save died as the browser's bare "Failed to fetch" with
// nothing in any server log, because the app had pinned itself to a personal
// dev tunnel that was asleep.
describe('resolveDefaultEnv', () => {
  it('pins popty.app to the always-on backend, not a personal dev tunnel', () => {
    expect(resolveDefaultEnv('popty.app', undefined)).toBe('watson')
  })

  it('never defaults a public host to someone else\'s machine', () => {
    for (const [host, env] of Object.entries(HOSTED_DEFAULT_ENV)) {
      expect(resolveDefaultEnv(host, undefined)).toBe(env)
      expect(['tom', 'kai']).not.toContain(env)
    }
  })

  it('leaves dev boxes on the existing fallback', () => {
    expect(resolveDefaultEnv('localhost', undefined)).toBe(FALLBACK_DEFAULT_ENV)
    expect(resolveDefaultEnv('some-box.local', undefined)).toBe(FALLBACK_DEFAULT_ENV)
  })

  it('an explicit VITE_DEFAULT_ENVIRONMENT still wins everywhere', () => {
    expect(resolveDefaultEnv('popty.app', 'api')).toBe('api')
    expect(resolveDefaultEnv('localhost', 'kai')).toBe('kai')
  })

  it('survives a missing hostname (SSR / no window)', () => {
    expect(resolveDefaultEnv('', undefined)).toBe(FALLBACK_DEFAULT_ENV)
    expect(resolveDefaultEnv(undefined, undefined)).toBe(FALLBACK_DEFAULT_ENV)
  })
})
