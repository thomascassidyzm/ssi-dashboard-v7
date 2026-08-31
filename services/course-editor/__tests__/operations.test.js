import { describe, it, expect, beforeEach } from 'vitest'
import indexMod from '../index.cjs'
import { createFakeSupabase } from './fake-supabase.cjs'
import { buildSmallCourseDb } from './fixtures.cjs'
import { expectThrowsCode } from './helpers.js'

const { createCourseEditor } = indexMod

function setup(code = 'spa_for_eng') {
  const db = createFakeSupabase({ tables: buildSmallCourseDb(code) })
  const { ops, editor } = createCourseEditor({ client: db })
  return { db, ops, editor }
}

// helper: run an edit through the analyze → acknowledge flow
async function ackEdit(ops, fn, analyzeArgs) {
  const report = await analyzeArgs()
  return fn(report.ackToken)
}

describe('editLego / resolveZutDuplicate', () => {
  it('edits by lego_id within one course (after acknowledging impacts)', async () => {
    const { db, ops } = setup()
    const report = await ops.analyzeLegoEdit('spa_for_eng', 'S0003L01', { known_text: 'read' })
    await ops.editLego('spa_for_eng', 'S0003L01', { known_text: 'read' }, { acknowledgeImpacts: report.ackToken })
    expect(db.rows('course_legos').find((l) => l.lego_id === 'S0003L01').known_text).toBe('read')
  })

  it('edits by seedNumber+legoIndex', async () => {
    const { db, ops } = setup()
    const report = await ops.analyzeLegoEdit('spa_for_eng', { seedNumber: 1, legoIndex: 1 }, { target_text: 'deseo' })
    await ops.editLego('spa_for_eng', { seedNumber: 1, legoIndex: 1 }, { target_text: 'deseo' }, { acknowledgeImpacts: report.ackToken })
    expect(db.rows('course_legos').find((l) => l.seed_number === 1 && l.lego_index === 1).target_text).toBe('deseo')
  })

  it('resolveZutDuplicate sets is_new=false and renames', async () => {
    const { db, ops } = setup()
    const report = await ops.analyzeLegoEdit('spa_for_eng', 'S0001L01', { known_text: 'I want (verb)', is_new: false })
    await ops.resolveZutDuplicate('spa_for_eng', 'S0001L01', { known_text: 'I want (verb)' }, { acknowledgeImpacts: report.ackToken })
    const lego = db.rows('course_legos').find((l) => l.lego_id === 'S0001L01')
    expect(lego.is_new).toBe(false)
    expect(lego.known_text).toBe('I want (verb)')
  })

  it('rejects an empty zut resolution', async () => {
    const { ops } = setup()
    await expectThrowsCode(() => ops.resolveZutDuplicate('spa_for_eng', 'S0001L01', { markNotNew: false }), 'VALIDATION_ERROR')
  })
})

describe('editPhrase — audio side-effect ownership', () => {
  it('a real word change NULLS audio for regen', async () => {
    const { db, ops } = setup()
    const pid = 'S0001L01B01'
    const before = db.rows('course_practice_phrases').find((p) => p.id === `spa_for_eng:${pid}`)
    const r = await ops.editPhrase('spa_for_eng', `spa_for_eng:${pid}`, { target_text: 'deseas' })
    expect(r.audioPolicy.target).toBe('nulled-for-regen')
    const after = db.rows('course_practice_phrases').find((p) => p.id === `spa_for_eng:${pid}`)
    expect(after.target1_audio_id).toBeNull()
    expect(after.target2_audio_id).toBeNull()
    expect(before.target1_audio_id).toBeTruthy()
  })

  it('a COSMETIC change (trailing period) PRESERVES audio', async () => {
    const { db, ops } = setup()
    const pid = 'spa_for_eng:S0001L01U01'
    const before = db.rows('course_practice_phrases').find((p) => p.id === pid)
    const r = await ops.editPhrase('spa_for_eng', pid, { target_text: 'quiero leer.' })
    expect(r.audioPolicy.target).toBe('preserved')
    const after = db.rows('course_practice_phrases').find((p) => p.id === pid)
    expect(after.target_text).toBe('quiero leer.')
    // pointer restored to the original audio (no needless regen)
    expect(after.target1_audio_id).toBe(before.target1_audio_id)
    expect(after.target2_audio_id).toBe(before.target2_audio_id)
  })

  it('applyQuestionMark adds ? and that NULLS audio (? affects TTS)', async () => {
    const { db, ops } = setup()
    const pid = 'spa_for_eng:S0001L01B01' // target "quieres"
    const r = await ops.applyQuestionMark('spa_for_eng', pid, 'spa')
    const after = db.rows('course_practice_phrases').find((p) => p.id === pid)
    expect(after.target_text).toBe('¿quieres?')
    expect(r.audioPolicy.target).toBe('nulled-for-regen')
    expect(after.target1_audio_id).toBeNull()
  })
})

describe('stripParensFromCourse — both sides, all tables', () => {
  it('dry-run reports changes without writing', async () => {
    const { db, ops } = setup()
    const before = JSON.stringify(db.rows('course_legos'))
    const report = await ops.stripParensFromCourse('spa_for_eng', { dryRun: true })
    expect(report.totalChanged).toBeGreaterThan(0)
    expect(report.byTable.course_legos.changed).toBe(1) // "I want (to)"
    expect(JSON.stringify(db.rows('course_legos'))).toBe(before)
  })

  it('applies and strips parens on the known side of the lego', async () => {
    const { db, ops } = setup()
    await ops.stripParensFromCourse('spa_for_eng')
    expect(db.rows('course_legos').find((l) => l.lego_id === 'S0001L01').known_text).toBe('I want')
  })

  it('never touches another course', async () => {
    const a = buildSmallCourseDb('spa_for_eng')
    const b = buildSmallCourseDb('ita_for_eng')
    const db = createFakeSupabase({ tables: { course_legos: [...a.course_legos, ...b.course_legos], course_practice_phrases: [], course_seeds: [] } })
    const { ops } = createCourseEditor({ client: db })
    await ops.stripParensFromCourse('spa_for_eng')
    // ita's "I want (to)" is untouched
    expect(db.rows('course_legos').find((l) => l.course_code === 'ita_for_eng' && l.lego_id === 'S0001L01').known_text).toBe('I want (to)')
  })
})

describe('findSlashesInCourse — surfaces, never auto-fixes', () => {
  it('finds the he/she slash on both sides and returns options', async () => {
    const { ops } = setup()
    const { hits } = await ops.findSlashesInCourse('spa_for_eng')
    const known = hits.find((h) => h.value === 'he/she')
    const target = hits.find((h) => h.value === 'él/ella')
    expect(known.options).toEqual(['he', 'she'])
    expect(target.options).toEqual(['él', 'ella'])
  })
})
