import { describe, it, expect } from 'vitest'
const { buildProofList, flagRow } = require('./lego-proof-router.cjs')

const L = (seed, idx, isNew, cy) => ({ lego_id: `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}`, seed_number: seed, lego_index: idx, is_new: isNew, target_text: cy, known_text: cy + '-en' })

describe('buildProofList', () => {
  // The block plays in RUNNING ORDER, not id order, and a dropped seed (absent from course_running_order) is not listed.
  const order = [
    { seed_number: 1003, position: 140, in_block: true },
    { seed_number: 1001, position: 141, in_block: true },
    { seed_number: 12, position: 12, in_block: false },
  ]
  const legos = [L(1001, 2, true, 'b'), L(1001, 1, false, 'a'), L(1003, 1, true, 'c'), L(1002, 1, true, 'dropped'), L(12, 1, true, 'old')]

  it('orders by running position then lego index, numbers only the new LEGOs, skips dropped and pre-block seeds', () => {
    const rows = buildProofList(legos, order, [])
    expect(rows.map((r) => [r.id, r.n])).toEqual([['S1003L01', 1], ['S1001L01', null], ['S1001L02', 2]])
  })

  it('carries a saved flag and its note onto its LEGO', () => {
    const rows = buildProofList(legos, order, [{ lego_id: 'S1001L02', flagged: true, note: 'mutation', flagged_by: 'aran@hey.com' }])
    expect(rows.find((r) => r.id === 'S1001L02')).toMatchObject({ flagged: true, note: 'mutation', by: 'aran@hey.com' })
    expect(rows.find((r) => r.id === 'S1003L01')).toMatchObject({ flagged: false, note: '' })
  })
})

describe('flagRow', () => {
  it('refuses a malformed id, a non-boolean flag and an anonymous caller', () => {
    expect(flagRow('c', { legoId: '1087.2', flagged: true }, 'a').error).toMatch(/S1087L02/)
    expect(flagRow('c', { legoId: 'S1087L02', flagged: 'yes' }, 'a').error).toMatch(/true or false/)
    expect(flagRow('c', { legoId: 'S1087L02', flagged: true }, null).status).toBe(401)
  })
  it('stores an empty note as null and records who flagged', () => {
    expect(flagRow('c', { legoId: 'S1087L02', flagged: true, note: '  ' }, 'aran@hey.com').row)
      .toMatchObject({ course_code: 'c', lego_id: 'S1087L02', flagged: true, note: null, flagged_by: 'aran@hey.com' })
  })
})
