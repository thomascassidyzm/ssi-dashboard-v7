import { describe, it, expect } from 'vitest'
import g from './db-test-guard.cjs'
import fs from 'fs'

describe('db test guard (#270)', () => {
  it('refuses the live Supabase host unless a human opts in', () => {
    const live = 'postgresql://postgres:x@db.abcd.supabase.co:5432/postgres'
    expect(g.refusesLiveHost(live, {})).toBe(true)
    expect(g.refusesLiveHost(live, { ALLOW_WRITING_DB_TESTS_ON_LIVE: 'yes' })).toBe(false)
    expect(g.refusesLiveHost('postgresql://u:p@localhost:5432/scratch', {})).toBe(false)
  })
  it('never picks a code that already has rows', () => {
    const taken = new Set(['zaa', 'zab'])
    const seq = [[0, 0], [0, 1], [0, 2]]
    const code = g.pickScratchLanguage((c) => taken.has(c), { rand: () => seq.shift() })
    expect(code).toBe('zac')
  })
  it('gives up rather than reuse a held code', () => {
    expect(() => g.pickScratchLanguage(() => true)).toThrow(/refusing/)
  })
  it('the writing db test no longer hard-codes a code to delete', () => {
    const src = fs.readFileSync(new URL('./cast-voice-role.db.test.cjs', import.meta.url), 'utf8')
    expect(src).not.toMatch(/language='zzc'/)
    expect(src).toMatch(/refusesLiveHost/)
  })
})
