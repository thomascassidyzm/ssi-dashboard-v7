import { describe, it, expect, beforeEach } from 'vitest'
import editorMod from '../editor.cjs'
import { createFakeSupabase } from './fake-supabase.cjs'
import { buildIncidentDb, buildSmallCourseDb } from './fixtures.cjs'
import { expectThrowsCode } from './helpers.js'

const { createEditor } = editorMod

describe('editor — incident reproduction', () => {
  let db, editor
  beforeEach(() => {
    db = createFakeSupabase({ tables: buildIncidentDb(79) })
    editor = createEditor({ client: db })
  })

  it('the raw incident write is impossible: lego_id without course_code is refused before any write', async () => {
    await expectThrowsCode(
      () => editor.update('course_legos', { lego_id: 'S0524L01' }, { known_text: 'three' }),
      'SCOPE_ERROR'
    )
    // Nothing changed in any course.
    const rows = db.rows('course_legos').filter((r) => r.lego_id === 'S0524L01')
    expect(rows.every((r) => r.known_text.startsWith('gloss-'))).toBe(true)
    expect(db.audit.length).toBe(0)
  })

  it('a properly scoped edit changes exactly ONE course', async () => {
    const r = await editor.update(
      'course_legos',
      { course_code: 'course_03_for_eng', lego_id: 'S0524L01' },
      { known_text: 'three' }
    )
    expect(r.applied).toBe(true)
    expect(r.plan).toHaveLength(1)
    // every other course untouched
    const others = db.rows('course_legos').filter((r) => r.lego_id === 'S0524L01' && r.course_code !== 'course_03_for_eng')
    expect(others.every((r) => r.known_text.startsWith('gloss-'))).toBe(true)
    const mine = db.rows('course_legos').find((r) => r.course_code === 'course_03_for_eng' && r.lego_id === 'S0524L01')
    expect(mine.known_text).toBe('three')
  })
})

describe('editor — single-row primitives', () => {
  let db, editor
  beforeEach(() => {
    db = createFakeSupabase({ tables: buildSmallCourseDb('spa_for_eng') })
    editor = createEditor({ client: db })
  })

  it('dry-run returns a plan and writes nothing', async () => {
    const before = db.rows('course_legos')
    const r = await editor.update(
      'course_legos',
      { course_code: 'spa_for_eng', seed_number: 3, lego_index: 1 },
      { known_text: 'read' },
      { dryRun: true }
    )
    expect(r.applied).toBe(false)
    expect(r.plan[0]).toMatchObject({ before: { known_text: 'to read' }, after: { known_text: 'read' } })
    expect(db.rows('course_legos')).toEqual(before)
    expect(db.audit.length).toBe(0)
  })

  it('rejects non-editable fields', async () => {
    await expectThrowsCode(
      () => editor.update('course_legos', { course_code: 'spa_for_eng', id: db.rows('course_legos')[0].id }, { known_audio_id: 'x' }),
      'SCOPE_ERROR'
    )
  })

  it('NotFound when scope matches nothing', async () => {
    await expectThrowsCode(
      () => editor.update('course_legos', { course_code: 'spa_for_eng', id: 'nope' }, { known_text: 'x' }),
      'NOT_FOUND'
    )
  })

  it('text edit fires the audio-nulling trigger (defence: stale audio cleared)', async () => {
    const lego = db.rows('course_legos').find((l) => l.lego_index === 1 && l.seed_number === 3)
    expect(lego.target1_audio_id).toBeTruthy()
    await editor.update('course_legos', { course_code: 'spa_for_eng', id: lego.id }, { target_text: 'leerlo' })
    const after = db.rows('course_legos').find((l) => l.id === lego.id)
    expect(after.target_text).toBe('leerlo')
    expect(after.target1_audio_id).toBeNull()
    expect(after.target2_audio_id).toBeNull()
    // known audio untouched (known_text unchanged)
    expect(after.known_audio_id).toBeTruthy()
  })

  it('every write is captured in content_audit_log (undo runway)', async () => {
    const lego = db.rows('course_legos')[0]
    await editor.update('course_legos', { course_code: 'spa_for_eng', id: lego.id }, { known_text: 'changed' })
    expect(db.audit).toHaveLength(1)
    expect(db.audit[0]).toMatchObject({ table_name: 'course_legos', change_type: 'UPDATE' })
    expect(db.audit[0].old_row.known_text).toBe(lego.known_text)
  })

  it('delete is scoped + audited', async () => {
    const p = db.rows('course_practice_phrases')[0]
    const r = await editor.remove('course_practice_phrases', { course_code: 'spa_for_eng', id: p.id })
    expect(r.applied).toBe(true)
    expect(db.rows('course_practice_phrases').find((x) => x.id === p.id)).toBeUndefined()
    expect(db.audit.some((a) => a.change_type === 'DELETE' && a.primary_key === p.id)).toBe(true)
  })

  it('insert must carry course_code', async () => {
    await expectThrowsCode(
      () => editor.insert('course_practice_phrases', { id: 'x:Y', known_text: 'hi' }),
      'SCOPE_ERROR'
    )
  })
})

describe('editor — blast-radius + cross-course', () => {
  it('cross-course UPDATE is refused unless crossCourse:true', async () => {
    const db = createFakeSupabase({ tables: buildIncidentDb(5) })
    const editor = createEditor({ client: db })
    // Force a multi-course match by using crossCourse scoping on a shared lego_id
    // but WITHOUT opting in — the defence-in-depth check must fire.
    await expectThrowsCode(
      () => editor.update('course_legos', { lego_id: 'S0524L01' }, { known_text: 'x' }, { crossCourse: false }),
      'SCOPE_ERROR'
    )
  })

  it('crossCourse:true still shows the full blast radius and respects the threshold', async () => {
    const db = createFakeSupabase({ tables: buildIncidentDb(50) })
    const editor = createEditor({ client: db, confirmThreshold: 25 })
    // 50 courses share the lego_id → over threshold → must require confirm
    await expectThrowsCode(
      () => editor.update('course_legos', { lego_id: 'S0524L01' }, { is_new: false }, { crossCourse: true }),
      'BLAST_RADIUS'
    )
    // dry-run is always allowed and reveals the scope
    const plan = await editor.update('course_legos', { lego_id: 'S0524L01' }, { is_new: false }, { crossCourse: true, dryRun: true })
    expect(plan.plan).toHaveLength(50)
  })

  it('bulkUpdateByPk trips the threshold without confirm', async () => {
    const db = createFakeSupabase({ tables: buildSmallCourseDb('spa_for_eng') })
    const editor = createEditor({ client: db, confirmThreshold: 2 })
    const updates = db.rows('course_legos').map((l) => ({ pk: l.id, set: { is_new: false } }))
    await expectThrowsCode(
      () => editor.bulkUpdateByPk('course_legos', 'spa_for_eng', updates),
      'BLAST_RADIUS'
    )
    const r = await editor.bulkUpdateByPk('course_legos', 'spa_for_eng', updates, { confirm: true })
    expect(r.plan).toHaveLength(3)
    expect(db.rows('course_legos').every((l) => l.is_new === false)).toBe(true)
  })

  it('bulkUpdateByPk can never leak across courses (always course_code + pk scoped)', async () => {
    // build a db with two courses, try to sneak another course's pk into the batch
    const a = buildSmallCourseDb('spa_for_eng')
    const b = buildSmallCourseDb('ita_for_eng')
    const db = createFakeSupabase({ tables: {
      course_legos: [...a.course_legos, ...b.course_legos],
    } })
    const editor = createEditor({ client: db })
    const foreignPk = b.course_legos[0].id
    // ask to update spa course but pass ita's pk → scope is {course_code:spa, id:ita-pk} → matches nothing → NotFound
    await expectThrowsCode(
      () => editor.bulkUpdateByPk('course_legos', 'spa_for_eng', [{ pk: foreignPk, set: { is_new: false } }]),
      'NOT_FOUND'
    )
    // ita's row is untouched
    expect(db.rows('course_legos').find((l) => l.id === foreignPk).is_new).toBe(true)
  })
})
