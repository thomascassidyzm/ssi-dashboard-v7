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

import { undoPlan, ledgerPairs, makeLog } from './tom006-ledger.cjs'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
const S = (...k) => k.map(x => ({ tbl: 'course_legos', key: x }))
const R = (kind, oldId, newId, slots) => ({ kind, oldId, newId, lego_id: 'L', slots })
describe('undo coverage (lane reviews #811, #812)', () => {
  it('a retry after a partial swap records only the remaining slot, yet undo covers the slot moved earlier (union, de-duplicated by tbl:key)', () => {
    const rows = [R('render', 'A', 'N', S('k1', 'k2')), R('partial', 'A', 'N', S('k1', 'k2')), R('swap', 'A', 'N', S('k2'))]
    const [p] = undoPlan(rows)
    expect(p.slots.map(s => s.key).sort()).toEqual(['k1', 'k2'])
    expect(ledgerPairs(rows)[0].applied).toBe(true)
  })
  it('a crash mid-swap leaves only a render row (k1 already moved, no completion row): undo still covers it', () => {
    const [p] = undoPlan([R('render', 'A', 'N', S('k1', 'k2'))])
    expect(p).toMatchObject({ oldId: 'A', newId: 'N' }); expect(p.slots.length).toBe(2)
  })
  it('an undone pair is not planned again; a later render of the same pair is', () => {
    expect(undoPlan([R('swap', 'A', 'N', S('k1')), { kind: 'undo', oldId: 'A', newId: 'N' }])).toEqual([])
    expect(undoPlan([R('swap', 'A', 'N', S('k1')), { kind: 'undo', oldId: 'A', newId: 'N' }, R('swap', 'A', 'N', S('k1'))]).length).toBe(1)
  })
  it('--dry-run writes no ledger row', () => {
    const f = path.join(os.tmpdir(), `t006-${process.pid}.jsonl`)
    makeLog(f, true)({ kind: 'skip' }); expect(fs.existsSync(f)).toBe(false)
    makeLog(f, false)({ kind: 'skip' }); expect(fs.readFileSync(f, 'utf8')).toContain('skip'); fs.unlinkSync(f)
  })
})

import { fadePending, undoRecordable } from './tom006-ledger.cjs'
describe('undo order and 0-move undos (lane review #815)', () => {
  it('intros undo is blocked while the fade ledger has applied pairs; free once they are undone', () => {
    const fade = [R('swap', 'U', 'F', S('k1'))]
    expect(fadePending(fade)).toBe(1)
    expect(fadePending([...fade, { kind: 'undo', oldId: 'U', newId: 'F' }])).toBe(0)
    expect(fadePending([])).toBe(0)
  })
  it('a pair that moved 0 slots is never recorded as undone, so it stays in later undo plans', () => {
    expect(undoRecordable(0)).toBe(false); expect(undoRecordable(2)).toBe(true)
  })
})

// lane reviews #840/#841 (job #836)
describe('job #836 ledger rules', () => {
  const L = require('./tom006-ledger.cjs')
  it('rawId equal to newId is an unfaded take: only rawId !== newId counts as faded at render time', () => {
    expect(L.fadedAtRender({ rawId: 'r', newId: 'f' })).toBe(true)
    expect(L.fadedAtRender({ rawId: 'x', newId: 'x' })).toBe(false)
    expect(L.fadedAtRender({ newId: 'x' })).toBe(false)
  })
  it('first-run intent/swap rows expand into per-old-clip pairs that --undo can replay, newest first', () => {
    const rows = L.expandLegacyRows([
      { kind: 'intent', text: 't', newId: 'N', slots: [{ tbl: 'course_legos', key: '1', from: 'A' }, { tbl: 'course_legos', key: '2', from: 'B' }] },
      { kind: 'swap', text: 't', newId: 'N', wanted: 2, slots: [{ tbl: 'course_legos', key: '1', from: 'A' }] }])
    expect(rows.map(r => [r.kind, r.oldId])).toEqual([['render', 'A'], ['render', 'B'], ['partial', 'A']])
    expect(L.undoPlan(rows).map(p => p.oldId)).toEqual(['B', 'A'])
  })
})

describe('job #836 undo targets the slots that actually moved (lane review #847)', () => {
  const L = require('./tom006-ledger.cjs')
  it('a refused slot on the render row is not part of the undo, so one partial swap does not wedge --undo', () => {
    const a = { tbl: 'course_legos', key: '1' }, b = { tbl: 'course_legos', key: '2' }
    const rows = [{ kind: 'render', oldId: 'A', newId: 'N', slots: [a, b] }, { kind: 'partial', oldId: 'A', newId: 'N', slots: [a], wanted: 2 }]
    expect(L.undoPlan(rows)[0].slots).toHaveLength(2)
    expect(L.undoPlanMoved(rows)[0].slots).toEqual([a])
    expect(L.undoPlanMoved([...rows, { kind: 'undo', oldId: 'A', newId: 'N' }])).toEqual([])
  })
})

describe('job #836 intent-only pairs stay undoable (lane review #851)', () => {
  const L = require('./tom006-ledger.cjs')
  it('a crash after the journal but before any move leaves the intent slots as undo candidates', () => {
    const a = { tbl: 'course_legos', key: '1', from: 'A' }
    const plan = L.undoPlanMoved([{ kind: 'render', oldId: 'A', newId: 'N', slots: [a] }])
    expect(plan).toHaveLength(1); expect(plan[0]).toMatchObject({ intentOnly: true, slots: [{ tbl: 'course_legos', key: '1' }] })
  })
})
