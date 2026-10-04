import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const req = createRequire(import.meta.url)
const { parseSeedScope, inSeedScope, voiceGender, FEMALE_XAI } = req('./charlotte-backfill.cjs')
const { buildQueue, SEED_SCOPE } = req('./charlotte-backfill-daily.cjs')

describe('seed scope', () => {
  it('parses 1-100 / 100 / none, rejects junk', () => {
    expect(parseSeedScope('1-100')).toBe(100)
    expect(parseSeedScope('100')).toBe(100)
    expect(parseSeedScope(undefined)).toBeUndefined()
    expect(() => parseSeedScope('5-9')).toThrow()
  })
  it('keeps only clips first heard within the scope', () => {
    const w = [{ pos: 1 }, { pos: 100 }, { pos: 101 }, { pos: null }]
    expect(inSeedScope(w, 100).map(x => x.pos)).toEqual([1, 100])
    expect(inSeedScope(w, undefined)).toHaveLength(4)
  })
})
describe('bedd6226 (Olivia) is female', () => {
  it('classified f, bare or xai_-prefixed, and in the xAI-female SQL', () => {
    expect(voiceGender('bedd6226')).toBe('f')
    expect(voiceGender('xai_bedd6226')).toBe('f')
    expect(FEMALE_XAI).toContain('bedd6226')
  })
})
describe('daily queue order', () => {
  const codes = ['eng_for_spa', 'fra_for_eng', 'ita_for_eng']
  const q = buildQueue(codes, true)
  const scoped = e => e[2].includes('--seeds')
  it('all seed-scoped calls come before any unscoped call', () => {
    const first = q.findIndex(e => !scoped(e))
    expect(q.slice(0, first).every(scoped)).toBe(true)
    expect(q.slice(first).every(e => !scoped(e))).toBe(true)
    expect(q[0][2]).toContain(`1-${SEED_SCOPE}`)
  })
  it('xAI precedes Azure/general within scope, ita_for_eng first, male only when enabled', () => {
    expect(q[0].slice(0, 3)).toEqual(['ita_for_eng', 'known,presentation', ['--voices', 'xai-female', '--seeds', '1-100']])
    const scopedQ = q.filter(scoped), v = e => e[2][1]
    expect(scopedQ.findIndex(e => v(e) === 'general')).toBeGreaterThan(scopedQ.map(v).lastIndexOf('xai-male'))
    expect(buildQueue(codes, false).some(e => /male$/.test(e[2][1]) && e[2][1] !== 'xai-female')).toBe(false)
  })
})
