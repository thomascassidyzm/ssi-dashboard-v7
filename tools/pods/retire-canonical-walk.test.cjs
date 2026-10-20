// retire-canonical-walk's restore file: the pure half (the DB half proves itself in its own
// transaction before it commits).   npx vitest run tools/pods/retire-canonical-walk.test.cjs
import { describe, it, expect } from 'vitest'
const { restoreSql, restoreInserts, TABLES } = require('./retire-canonical-walk.cjs')

const snapshot = {
  canonical_pod_scenarios: [{ id: 'x:SC01-S01', pod_slug: 'x', english_text: "it's a 'quote' and a $ sign", created_at: '2026-08-30 12:00:00.123456+00' }],
  canonical_pod_walk_steps: [{ id: 'x:Chapter1-W01', pod_slug: 'x', scenario_id: 'x:SC01-S01' }],
  canonical_pod_target_text: [],
}

describe('the restore file', () => {
  it('deletes in FK order and restores in the reverse', () => {
    expect(TABLES).toEqual(['canonical_pod_target_text', 'canonical_pod_walk_steps', 'canonical_pod_scenarios'])
    const ins = restoreInserts(restoreSql('x', snapshot, 'why'))
    expect(ins.map(l => l.split(' ')[2])).toEqual(['canonical_pod_scenarios', 'canonical_pod_walk_steps'])
  })

  it('carries every row verbatim, microseconds and quotes included, in one transaction', () => {
    const sql = restoreSql('x', snapshot, 'why')
    expect(sql).toMatch(/^BEGIN;$/m)
    expect(sql.trim().endsWith('COMMIT;')).toBe(true)
    const json = restoreInserts(sql)[0].match(/\$tbr\$(.*)\$tbr\$/)[1]
    expect(JSON.parse(json)).toEqual(snapshot.canonical_pod_scenarios)
  })

  it('refuses text that would close its dollar quote', () => {
    const bad = { ...snapshot, canonical_pod_scenarios: [{ id: 'y', pod_slug: 'x', english_text: 'a $tbr$ b' }] }
    expect(() => restoreSql('x', bad, 'why')).toThrow(/dollar-quote/)
  })
})
