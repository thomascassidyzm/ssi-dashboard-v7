import { describe, it, expect } from 'vitest'
import { ledgerState } from './tom006-ledger.cjs'
const row = (kind, oldId, newId = 'N') => ({ kind, oldId, newId, slots: [{ tbl: 'course_legos', key: 'k' }] })
describe('tom006 ledger state (lane reviews #804, #805)', () => {
  it('a complete swap is applied; an undo cancels it so a rerun is not a silent no-op', () => {
    expect(ledgerState([row('swap', 'A')]).get('A').applied).toBe(true)
    expect(ledgerState([row('swap', 'A'), row('undo', 'A')]).get('A')).toMatchObject({ applied: false, newId: 'N' })
  })
  it('a partial swap or a rendered-but-unpointed clip is NOT done, and keeps its recorded newId for a no-render re-point', () => {
    expect(ledgerState([row('render', 'B', 'X'), row('partial', 'B', 'X')]).get('B')).toMatchObject({ applied: false, newId: 'X' })
    expect(ledgerState([row('render', 'C', 'Y')]).get('C')).toMatchObject({ applied: false, newId: 'Y' })
  })
  it('re-applied after undo is applied again', () => {
    expect(ledgerState([row('swap', 'A'), row('undo', 'A'), row('swap', 'A')]).get('A').applied).toBe(true)
  })
})
