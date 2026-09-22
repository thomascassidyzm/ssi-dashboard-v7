/**
 * The builder API's copy of the Seed Grid check (GET /build/seed-grid) must
 * refuse to compute state from a failed read — the same rule as
 * src/services/seed-grid-state.js, proven for the server side (job #693).
 *
 * Run: npx vitest run services/course-builder/routes/build.seed-grid-failed-read
 */
import { describe, it, expect } from 'vitest'

const { seedGridReadFailure } = require('./build.cjs')

const ok = (rows) => ({ data: rows, error: null })
const timeout = { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } }

describe('seedGridReadFailure', () => {
  it('passes when every read carries a data array', () => {
    expect(seedGridReadFailure({ seeds: ok([]), legos: ok([]), phrases: ok([]), usePhrases: ok([]), newLegos: ok([]) })).toBeNull()
  })
  it('names the cancelled phrases read instead of treating it as empty', () => {
    const f = seedGridReadFailure({ seeds: ok([]), legos: ok([]), phrases: ok([]), usePhrases: timeout, newLegos: ok([]) })
    expect(f.read).toBe('usePhrases')
    expect(f.error.message).toMatch(/statement timeout/)
  })
  it('treats a missing data array as a failure too', () => {
    expect(seedGridReadFailure({ seeds: ok([]), legos: { data: null, error: null } }).read).toBe('legos')
  })
})
