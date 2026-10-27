/**
 * verify-export-stage: the Step 2 set and verdict, outside the API (job #427).
 * Run: npx vitest run tools/audio/verify-export-stage.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { summarise } = require('./verify-export-stage.cjs')
const { collectManifestUuids } = require('../../services/s3-deploy-service.cjs')

describe('verify-export-stage', () => {
  it('collects every id Step 2 verifies, duplicates kept (the 13:30 ita run counted 26 bad for 24 files)', () => {
    const m = { introduction: { id: 'I' }, slices: [{ pooledEncouragements: [{ id: 'E' }], samples: { a: [{ id: 'A' }, { id: 'B' }], b: [{ id: 'E' }] } }] }
    expect(collectManifestUuids(m)).toEqual(['I', 'E', 'A', 'B', 'E'])
  })

  it('missing or badly encoded blocks; duration mismatches alone do not', () => {
    expect(summarise({ total: 3, existing: 3, missing: 0, formatFailed: 0, durationMismatched: 9 }).wouldPass).toBe(true)
    expect(summarise({ total: 3, existing: 2, missing: 1, formatFailed: 0 }).wouldPass).toBe(false)
    const s = summarise({ total: 3, existing: 3, missing: 0, formatFailed: 2, formatFailDetails: [{ uuid: 'x' }, { uuid: 'X' }] })
    expect(s.wouldPass).toBe(false)
    expect(s.formatBadUuids).toEqual(['X'])
  })
})
