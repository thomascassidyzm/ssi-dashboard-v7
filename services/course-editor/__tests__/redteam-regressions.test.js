/**
 * Regression tests for every GENUINE defect the red-team agents found.
 * Each `it` name references the finding id so a future regression is traceable.
 */
import { describe, it, expect } from 'vitest'
import editorMod from '../editor.cjs'
import textOps from '../text-ops.cjs'
import { createFakeSupabase } from './fake-supabase.cjs'
import { buildIncidentDb, buildSmallCourseDb, lego } from './fixtures.cjs'
import { expectThrowsCode } from './helpers.js'

const { createEditor } = editorMod

function smallEditor(code = 'spa_for_eng', threshold) {
  const db = createFakeSupabase({ tables: buildSmallCourseDb(code) })
  return { db, editor: createEditor({ client: db, ...(threshold ? { confirmThreshold: threshold } : {}) }) }
}

describe('A1 — relinkAudio guards (single-row + blast-radius)', () => {
  it('refuses a "unique" scope that actually matches many rows', async () => {
    // 5 legos in one course all sharing seed_number/lego_index (1,1)
    const rows = Array.from({ length: 5 }, (_, i) => lego('big_for_eng', 1, 1, { known_text: `g${i}` }))
    const db = createFakeSupabase({ tables: { course_legos: rows } })
    const editor = createEditor({ client: db })
    await expectThrowsCode(
      () => editor.relinkAudio('course_legos', { course_code: 'big_for_eng', seed_number: 1, lego_index: 1 }, { known_audio_id: 'ZAP' }),
      'SCOPE_ERROR'
    )
    expect(db.rows('course_legos').every((r) => r.known_audio_id !== 'ZAP')).toBe(true)
  })

  it('refuses array filter value that explodes to many rows', async () => {
    const { db, editor } = smallEditor()
    const ids = db.rows('course_legos').map((l) => l.id)
    await expectThrowsCode(
      () => editor.relinkAudio('course_legos', { course_code: 'spa_for_eng', id: ids }, { known_audio_id: 'ZAP' }),
      'SCOPE_ERROR'
    )
  })

  it('relinkAudio writes are journalled (undo runway)', async () => {
    const { db, editor } = smallEditor()
    const l = db.rows('course_legos')[0]
    await editor.relinkAudio('course_legos', { course_code: 'spa_for_eng', id: l.id }, { known_audio_id: 'NEW' })
    expect(editor.journal.some((j) => j.op === 'relinkAudio' && j.pk === l.id)).toBe(true)
  })
})

describe('F1 — confirmThreshold must be a finite positive integer', () => {
  it('rejects NaN (would silently disable the gate)', () => {
    const db = createFakeSupabase({ tables: buildIncidentDb(3) })
    expect(() => createEditor({ client: db, confirmThreshold: NaN })).toThrow(/positive integer/)
  })
  it('rejects Infinity, 0, negatives, floats', () => {
    const db = createFakeSupabase({ tables: {} })
    for (const t of [Infinity, 0, -5, 2.5]) {
      expect(() => createEditor({ client: db, confirmThreshold: t })).toThrow(/positive integer/)
    }
  })
  it('NaN threshold can no longer push a 79-course write through', async () => {
    const db = createFakeSupabase({ tables: buildIncidentDb(79) })
    expect(() => createEditor({ client: db, confirmThreshold: NaN })).toThrow()
  })
})

describe('F3 — bulkUpdateByPk batchId matches the journal', () => {
  it('all journal rows + the returned id share one batchId', async () => {
    const { db, editor } = smallEditor()
    const updates = db.rows('course_legos').map((l) => ({ pk: l.id, set: { is_new: false } }))
    const r = await editor.bulkUpdateByPk('course_legos', 'spa_for_eng', updates, { confirm: true })
    const batchRows = editor.journal.filter((j) => j.op === 'update')
    expect(batchRows.length).toBe(3)
    expect(batchRows.every((j) => j.batchId === r.batchId)).toBe(true)
  })
})

describe('F5 — dry-run plan discloses audio-null side-effects', () => {
  it('a target_text change lists the audio columns that will be nulled', async () => {
    const { db, editor } = smallEditor()
    const l = db.rows('course_legos').find((x) => x.lego_id === 'S0003L01')
    const r = await editor.update('course_legos', { course_code: 'spa_for_eng', id: l.id }, { target_text: 'leerlo' }, { dryRun: true })
    expect(r.plan[0].sideEffects.nulledAudio).toEqual(expect.arrayContaining(['target1_audio_id', 'target2_audio_id']))
  })
})

describe('F7 — update with only undefined values is refused', () => {
  it('does not report a false applied', async () => {
    const { editor, db } = smallEditor()
    const l = db.rows('course_legos')[0]
    await expectThrowsCode(
      () => editor.update('course_legos', { course_code: 'spa_for_eng', id: l.id }, { known_text: undefined }),
      'COURSE_EDITOR_ERROR'
    )
  })
})

describe('BUG 1/2/4 — insert is locked down', () => {
  it('refuses forbidden columns on insert (audio ids, made-up cols)', async () => {
    const { editor } = smallEditor()
    await expectThrowsCode(
      () => editor.insert('course_legos', { course_code: 'spa_for_eng', known_text: 'x', known_audio_id: 'POISON' }),
      'SCOPE_ERROR'
    )
    await expectThrowsCode(
      () => editor.insert('course_practice_phrases', { course_code: 'spa_for_eng', known_text: 'x', evil: 'yes' }),
      'SCOPE_ERROR'
    )
  })
  it('refuses insert into course_audio entirely (phase8 owns audio rows)', async () => {
    const { editor } = smallEditor()
    await expectThrowsCode(
      () => editor.insert('course_audio', { course_code: 'spa_for_eng', text: 'x', s3_key: 'mastered/X.mp3' }),
      'SCOPE_ERROR'
    )
  })
  it('refuses a colliding client-set pk (no duplicate rows)', async () => {
    const { db, editor } = smallEditor()
    const existing = db.rows('course_practice_phrases')[0]
    await expectThrowsCode(
      () => editor.insert('course_practice_phrases', { id: existing.id, course_code: 'spa_for_eng', known_text: 'dup', target_text: 'dup', seed_number: 1, lego_index: 1, position: 9, word_count: 1, lego_count: 1 }),
      'VALIDATION_ERROR'
    )
  })
  it('allows a clean, well-formed insert', async () => {
    const { db, editor } = smallEditor()
    const r = await editor.insert('course_practice_phrases', { id: 'spa_for_eng:S0001L01U09', course_code: 'spa_for_eng', known_text: 'new one', target_text: 'nuevo', seed_number: 1, lego_index: 1, phrase_role: 'use', position: 9, word_count: 2, lego_count: 1 })
    expect(r.applied).toBe(true)
    expect(db.rows('course_practice_phrases').some((p) => p.id === 'spa_for_eng:S0001L01U09')).toBe(true)
  })
})

describe('BUG 2 — value-type / control-char validation on every write path', () => {
  it('refuses non-string text values', async () => {
    const { db, editor } = smallEditor()
    const l = db.rows('course_legos')[0]
    for (const bad of [{ a: 1 }, [1, 2, 3], 42, true]) {
      await expectThrowsCode(
        () => editor.update('course_legos', { course_code: 'spa_for_eng', id: l.id }, { known_text: bad }),
        'VALIDATION_ERROR'
      )
    }
  })
  it('refuses control chars, bidi overrides, and over-length strings', async () => {
    const { db, editor } = smallEditor()
    const l = db.rows('course_legos')[0]
    await expectThrowsCode(() => editor.update('course_legos', { course_code: 'spa_for_eng', id: l.id }, { known_text: 'a\u0007b' }), 'VALIDATION_ERROR')
    await expectThrowsCode(() => editor.update('course_legos', { course_code: 'spa_for_eng', id: l.id }, { known_text: 'a\u202Eb' }), 'VALIDATION_ERROR')
    await expectThrowsCode(() => editor.update('course_legos', { course_code: 'spa_for_eng', id: l.id }, { known_text: 'x'.repeat(2001) }), 'VALIDATION_ERROR')
  })
})

describe('BUG 5/6 — text-ops hardening', () => {
  it('affectsAudio treats CJK period as cosmetic (no needless regen)', () => {
    expect(textOps.affectsAudio('你好', '你好。')).toBe(false)
    expect(textOps.affectsAudio('你好', '你好?')).toBe(true) // ? still affects TTS
  })
  it('stripParens is bounded on pathological input (no ReDoS)', () => {
    const start = Date.now()
    textOps.stripParens('('.repeat(100000))
    expect(Date.now() - start).toBeLessThan(200)
  })
})
