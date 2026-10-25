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

// P1 #8: a concurrent edit between snapshot and the delete was removed but absent from the restore file.
describe('retire: what the delete returns is compared with the snapshot', () => {
  const { retire } = require('./retire-canonical-walk.cjs')
  const os = require('os'), fs = require('fs'), path = require('path')
  const stubClient = (editAfterSnapshot) => {
    const log = []
    let deleted = false
    return {
      log,
      async query (sql) {
        log.push(sql.split(' ')[0])
        const t = (sql.match(/from (\w+)/) || [])[1]
        if (sql.startsWith('select * from')) return { rows: deleted ? [] : JSON.parse(JSON.stringify(snapshot[t])) }
        if (sql.startsWith('delete from')) {
          const rows = JSON.parse(JSON.stringify(snapshot[t]))
          if (editAfterSnapshot && t === 'canonical_pod_scenarios') rows[0].english_text = 'edited meanwhile'
          if (t === 'canonical_pod_scenarios') deleted = true
          return { rows, rowCount: rows.length }
        }
        return { rows: [], rowCount: 0 }
      },
    }
  }
  const out = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'retire-')), 'r.sql')
  it('rolls back and commits nothing when a returned row differs from the snapshot', async () => {
    const db = stubClient(true)
    await expect(retire(db, 'x', out(), true)).rejects.toThrow(/concurrent edit/)
    expect(db.log).toContain('rollback')
    expect(db.log).not.toContain('commit')
  })
  it('unchanged rows pass the comparison (the stub cannot replay the restore proof, so it stops there)', async () => {
    const db = stubClient(false)
    await expect(retire(db, 'x', out(), true)).rejects.toThrow(/restore proof/)
  })
})
