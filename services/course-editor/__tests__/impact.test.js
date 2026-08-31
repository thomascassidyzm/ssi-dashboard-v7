import { describe, it, expect, beforeEach } from 'vitest'
import indexMod from '../index.cjs'
import { createFakeSupabase } from './fake-supabase.cjs'
import { buildSmallCourseDb } from './fixtures.cjs'
import { expectThrowsCode } from './helpers.js'

const { createCourseEditor } = indexMod

function setup(code = 'spa_for_eng') {
  const db = createFakeSupabase({ tables: buildSmallCourseDb(code) })
  const { ops } = createCourseEditor({ client: db })
  return { db, ops }
}

describe('LEGO edit — responsible-editing gate', () => {
  it('a known_text change is REFUSED until impacts are acknowledged', async () => {
    const { ops, db } = setup()
    const err = await expectThrowsCode(
      () => ops.editLego('spa_for_eng', 'S0003L01', { known_text: 'read' }),
      'IMPACT_REVIEW'
    )
    const report = err.details.report
    // It surfaces the stale presentation + the phrase quoting the old text.
    const types = report.impacts.map((i) => i.type)
    expect(types).toContain('presentation_regen')
    expect(types).toContain('downstream_phrases')
    // "I want to read" contains the old known "to read"
    const dp = report.impacts.find((i) => i.type === 'downstream_phrases')
    expect(dp.items.some((x) => x.id === 'spa_for_eng:S0001L01U01')).toBe(true)
    // and nothing was written
    expect(db.rows('course_legos').find((l) => l.lego_id === 'S0003L01').known_text).toBe('to read')
  })

  it('proceeds once the exact ackToken is supplied', async () => {
    const { ops, db } = setup()
    const report = await ops.analyzeLegoEdit('spa_for_eng', 'S0003L01', { known_text: 'read' })
    const r = await ops.editLego('spa_for_eng', 'S0003L01', { known_text: 'read' }, { acknowledgeImpacts: report.ackToken })
    expect(r.applied).toBe(true)
    expect(db.rows('course_legos').find((l) => l.lego_id === 'S0003L01').known_text).toBe('read')
  })

  it('a WRONG ackToken is rejected (no blind-confirm)', async () => {
    const { ops } = setup()
    await expectThrowsCode(
      () => ops.editLego('spa_for_eng', 'S0003L01', { known_text: 'read' }, { acknowledgeImpacts: 'deadbeef' }),
      'IMPACT_REVIEW'
    )
  })

  it('analyze is read-only', async () => {
    const { ops, db } = setup()
    const before = JSON.stringify(db.rows('course_legos'))
    await ops.analyzeLegoEdit('spa_for_eng', 'S0003L01', { known_text: 'read' })
    expect(JSON.stringify(db.rows('course_legos'))).toBe(before)
  })
})

describe('LEGO edit — ZUT clash is BLOCK severity', () => {
  beforeEach(() => {})
  it('renaming a LEGO onto an existing known→different-target is blocked even with ack', async () => {
    const { ops, db } = setup()
    // S0002L01 known "he/she" → "él/ella". Rename S0003L01 known to "he/she" (target stays "leer").
    const report = await ops.analyzeLegoEdit('spa_for_eng', 'S0003L01', { known_text: 'he/she' })
    expect(report.maxSeverity).toBe('block')
    expect(report.impacts.some((i) => i.type === 'zut_clash')).toBe(true)
    // ack alone is not enough for a block
    await expectThrowsCode(
      () => ops.editLego('spa_for_eng', 'S0003L01', { known_text: 'he/she' }, { acknowledgeImpacts: report.ackToken }),
      'IMPACT_REVIEW'
    )
    expect(db.rows('course_legos').find((l) => l.lego_id === 'S0003L01').known_text).toBe('to read')
  })

  it('overrideBlock + ack lets a deliberate clash through (e.g. gender pair)', async () => {
    const { ops, db } = setup()
    const report = await ops.analyzeLegoEdit('spa_for_eng', 'S0003L01', { known_text: 'he/she' })
    const r = await ops.editLego('spa_for_eng', 'S0003L01', { known_text: 'he/she' }, { acknowledgeImpacts: report.ackToken, overrideBlock: true })
    expect(r.applied).toBe(true)
  })
})

describe('related_forms (info) — catches conjugations exact-match misses', () => {
  it('flags "quieres" when LEGO target "quiero" changes, at info level', async () => {
    const { ops } = setup()
    const report = await ops.analyzeLegoEdit('spa_for_eng', 'S0001L01', { target_text: 'deseo' })
    const rf = report.impacts.find((i) => i.type === 'related_forms')
    expect(rf).toBeTruthy()
    expect(rf.severity).toBe('info')
    expect(rf.items.some((x) => x.id === 'spa_for_eng:S0001L01B01')).toBe(true)
  })
})

describe('SEED edit — cascade + tiling', () => {
  it('surfaces the LEGOs/phrases to review and refuses until acknowledged', async () => {
    const { ops } = setup()
    const err = await expectThrowsCode(
      () => ops.editSeed('spa_for_eng', 1, { target_text: 'deseo charlar' }),
      'IMPACT_REVIEW'
    )
    const types = err.details.report.impacts.map((i) => i.type)
    expect(types).toContain('seed_cascade')
    expect(types).toContain('tiling_break') // "quiero" not in "deseo charlar"
  })

  it('applies with ack', async () => {
    const { ops, db } = setup()
    const report = await ops.analyzeSeedEdit('spa_for_eng', 1, { target_text: 'deseo charlar' })
    await ops.editSeed('spa_for_eng', 1, { target_text: 'deseo charlar' }, { acknowledgeImpacts: report.ackToken })
    expect(db.rows('course_seeds').find((s) => s.seed_number === 1).target_text).toBe('deseo charlar')
  })
})

describe('phrase edits stay fluid (impacts are info-level, non-gating)', () => {
  it('does NOT cry wolf on a conjugation that never contained the LEGO target', async () => {
    // B01 target "quieres" never contained the LEGO target "quiero" → no drift.
    const { ops, db } = setup()
    const r = await ops.editPhrase('spa_for_eng', 'spa_for_eng:S0001L01B01', { target_text: 'deseas' })
    expect(r.applied).toBe(true)
    expect(r.impact.requiresAck).toBe(false)
    expect(r.impact.impacts.some((i) => i.type === 'lego_drift')).toBe(false)
    expect(db.rows('course_practice_phrases').find((p) => p.id === 'spa_for_eng:S0001L01B01').target_text).toBe('deseas')
  })

  it('DOES flag (info) when the edit removes the LEGO target the phrase had', async () => {
    // U01 target "quiero leer" contains "quiero"; editing to "deseo leer" removes it.
    const { ops } = setup()
    const r = await ops.editPhrase('spa_for_eng', 'spa_for_eng:S0001L01U01', { target_text: 'deseo leer' })
    expect(r.applied).toBe(true)
    expect(r.impact.requiresAck).toBe(false)
    expect(r.impact.impacts.some((i) => i.type === 'lego_drift' && i.severity === 'info')).toBe(true)
  })
})

describe('ackToken stability', () => {
  it('same impacts → same token; changed course → different token', async () => {
    const { ops, db } = setup()
    const a = await ops.analyzeLegoEdit('spa_for_eng', 'S0003L01', { known_text: 'read' })
    const b = await ops.analyzeLegoEdit('spa_for_eng', 'S0003L01', { known_text: 'read' })
    expect(a.ackToken).toBe(b.ackToken)
    // delete the downstream phrase → impacts change → token changes
    await ops.deletePhrase('spa_for_eng', 'spa_for_eng:S0001L01U01')
    const c = await ops.analyzeLegoEdit('spa_for_eng', 'S0003L01', { known_text: 'read' })
    expect(c.ackToken).not.toBe(a.ackToken)
  })
})
