import { describe, it, expect } from 'vitest'
import indexMod from '../index.cjs'
import guardianMod from '../guardian.cjs'
import parallelMod from '../parallel-courses.cjs'
import { createFakeSupabase } from './fake-supabase.cjs'
import { buildSmallCourseDb } from './fixtures.cjs'

const { createCourseEditor } = indexMod
const { createGuardian } = guardianMod
const { parseCourseCode, findParallelCourses } = parallelMod

describe('parallel-course resolution', () => {
  it('parses codes with and without variants', () => {
    expect(parseCourseCode('spa_for_eng')).toMatchObject({ targetBase: 'spa', targetVariant: null, known: 'eng' })
    expect(parseCourseCode('fra_ca_for_eng')).toMatchObject({ targetBase: 'fra', targetVariant: 'ca', known: 'eng' })
    expect(parseCourseCode('cym_anthem_for_jpn')).toMatchObject({ targetBase: 'cym', targetVariant: 'anthem', known: 'jpn' })
  })

  it('finds siblings sharing the target base, classified by relation', () => {
    const all = ['fra_for_eng', 'fra_ca_for_eng', 'fra_for_spa', 'spa_for_eng', 'cym_for_eng']
    const sibs = findParallelCourses('fra_for_eng', all)
    const byCode = Object.fromEntries(sibs.map((s) => [s.course_code, s.relation]))
    expect(byCode).toEqual({ fra_ca_for_eng: 'dialect', fra_for_spa: 'known' })
    expect(sibs.some((s) => s.course_code === 'spa_for_eng')).toBe(false) // different target
  })
})

function setup() {
  const tables = buildSmallCourseDb('spa_for_eng')
  // add a sibling course that shares a deduped audio clip ('quiero')
  tables.course_audio.push({ id: 'aud-sib', course_code: 'spa_for_fra', text: 'quiero', s3_key: 'mastered/AAA.mp3', role: 'target1' })
  const db = createFakeSupabase({ tables })
  const { editor, ops } = createCourseEditor({ client: db })
  const guardian = createGuardian({
    editor, ops,
    allCourseCodes: ['spa_for_eng', 'spa_for_fra', 'spa_mx_for_eng', 'fra_for_eng'],
    llm: async () => JSON.stringify({ verdict: 'looks_good', confidence: 0.9, approveCascadeFixes: true, flags: [] }),
  })
  return { db, editor, ops, guardian, tables }
}

describe('guardian.reviewEdit — deterministic findings', () => {
  it('on a LEGO target change: plans cascade, finds shared audio + parallel courses', async () => {
    const { guardian, db } = setup()
    const before = db.rows('course_legos').find((l) => l.lego_id === 'S0001L01') // "I want (to)" / "quiero"
    const after = { ...before, target_text: 'deseo' }
    const review = await guardian.reviewEdit({ courseCode: 'spa_for_eng', table: 'course_legos', before, after })

    // cascade: phrase "quiero leer" contains old target "quiero" → propagate to "deseo leer"
    const fix = review.cascadeFixes.find((f) => f.pk === 'spa_for_eng:S0001L01U01')
    expect(fix.set.target_text).toBe('deseo leer')

    // cross-course shared audio: spa_for_fra uses the same 'quiero' clip
    expect(review.crossCourseAudio.some((h) => h.course_code === 'spa_for_fra')).toBe(true)

    // parallel courses: spa_* siblings, not fra_for_eng
    const codes = review.parallelCourses.map((p) => p.course_code)
    expect(codes).toContain('spa_for_fra')
    expect(codes).toContain('spa_mx_for_eng')
    expect(codes).not.toContain('fra_for_eng')
  })
})

describe('guardian.applyCascadeFixes — audited + undoable', () => {
  it('applies the propagation through the editor and audits it under one batch', async () => {
    const { guardian, db } = setup()
    const before = db.rows('course_legos').find((l) => l.lego_id === 'S0001L01')
    const after = { ...before, target_text: 'deseo' }
    const review = await guardian.reviewEdit({ courseCode: 'spa_for_eng', table: 'course_legos', before, after })

    const { applied, batchId } = await guardian.applyCascadeFixes('spa_for_eng', review.cascadeFixes, true)
    expect(applied.length).toBeGreaterThan(0)
    expect(batchId).toBeTruthy()
    // the downstream phrase now reads "deseo leer"
    expect(db.rows('course_practice_phrases').find((p) => p.id === 'spa_for_eng:S0001L01U01').target_text).toBe('deseo leer')
    // and the change is in the audit log (undoable)
    expect(db.audit.some((a) => a.table_name === 'course_practice_phrases' && a.change_type === 'UPDATE')).toBe(true)
  })

  it('never propagates across courses (cascade is course-scoped)', async () => {
    const { guardian, db } = setup()
    const before = db.rows('course_legos').find((l) => l.lego_id === 'S0001L01')
    const after = { ...before, target_text: 'deseo' }
    const review = await guardian.reviewEdit({ courseCode: 'spa_for_eng', table: 'course_legos', before, after })
    await guardian.applyCascadeFixes('spa_for_eng', review.cascadeFixes, true)
    // the sibling course's shared audio row is untouched (cross-course = flag, not fix)
    expect(db.rows('course_audio').find((a) => a.id === 'aud-sib').text).toBe('quiero')
  })
})

describe('guardian.judge — pluggable LLM', () => {
  it('builds a brief containing the playbook + findings and parses the verdict', async () => {
    const { guardian, db } = setup()
    const before = db.rows('course_legos').find((l) => l.lego_id === 'S0001L01')
    const after = { ...before, target_text: 'deseo' }
    let captured
    guardian.llm = async (args) => { captured = args; return '```json\n{"verdict":"looks_good","confidence":0.8,"approveCascadeFixes":true,"flags":[]}\n```' }
    const review = await guardian.reviewEdit({ courseCode: 'spa_for_eng', table: 'course_legos', before, after })
    const verdict = await guardian.judge({ courseCode: 'spa_for_eng', table: 'course_legos', before, after }, review)
    expect(verdict.verdict).toBe('looks_good')
    expect(captured.prompt).toContain('Fix playbook')
    expect(captured.prompt).toContain('proposedCascadeFixes')
  })
})
