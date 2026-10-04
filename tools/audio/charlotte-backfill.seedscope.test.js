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
describe('no unscoped pass while scoped work remains (#621)', () => {
  const { runQueue } = req('./charlotte-backfill-daily.cjs')
  it('budget 250: seed 1 = 300 chars skipped, seed 101 = 100 chars is NOT rendered', () => {
    const calls = []
    // fake tool: scoped call sees only seed 1 (300 > 250, skipped); an unscoped call would see seed 101 and spend 100
    const run = (course, roles, budget, extra) => {
      const scoped = extra.includes('--seeds'); calls.push({ course, scoped })
      return scoped ? { out: 'x: 1 old clips linked\ndone 0 clips (0 from library), 0 slots repointed, 0 chars spent; 1 remain.\nOUTSTANDING 1\n', status: 0 }
                    : { out: '100 chars spent\nOUTSTANDING 0\n', status: 0 }
    }
    const left = runQueue(buildQueue(['ita_for_eng'], false), 250, run, () => {}, () => {})
    expect(calls.some(c => !c.scoped)).toBe(false)
    expect(left).toBe(250)
  })
  it('still runs unscoped passes once every scoped call reports OUTSTANDING 0', () => {
    const calls = []
    const run = (c, r, b, extra) => { calls.push(extra.includes('--seeds')); return { out: 'OUTSTANDING 0\n', status: 0 } }
    runQueue(buildQueue(['ita_for_eng'], false), 250, run, () => {}, () => {})
    expect(calls.includes(false)).toBe(true)
  })
  it('unreadable scoped output counts as outstanding', () => {
    const calls = []
    runQueue(buildQueue(['ita_for_eng'], false), 250, (c, r, b, e) => { calls.push(e.includes('--seeds')); return { out: '', status: 0 } }, () => {}, () => {})
    expect(calls.includes(false)).toBe(false)
  })
})
