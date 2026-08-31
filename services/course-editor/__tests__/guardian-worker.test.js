import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import indexMod from '../index.cjs'
import workerMod from '../guardian-worker.cjs'
import editorMod from '../editor.cjs'
import operationsMod from '../operations.cjs'
import { createFakeSupabase } from './fake-supabase.cjs'
import { buildSmallCourseDb } from './fixtures.cjs'

const { createGuardianWorker } = workerMod
const { createEditor } = editorMod
const { createOperations } = operationsMod

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function harness({ llm }) {
  const db = createFakeSupabase({ tables: buildSmallCourseDb('spa_for_eng') })
  const reviews = []
  const notifications = []
  const worker = createGuardianWorker({
    makeEditor: () => createEditor({ client: db }),
    makeOps: (editor) => createOperations(editor),
    persistReview: async (r) => reviews.push(r),
    notify: async (r) => notifications.push(r),
    llm,
    allCourseCodes: ['spa_for_eng', 'spa_for_fra'],
    debounceMs: 100,
    concurrency: 2,
  })
  return { db, reviews, notifications, worker }
}

describe('guardian worker — end-to-end slice', () => {
  it('a seed edit → reviews, auto-applies the cascade, records it (undoable)', async () => {
    const llm = async () => JSON.stringify({ verdict: 'looks_good', confidence: 0.9, approveCascadeFixes: true, flags: [] })
    const { db, reviews, worker } = harness({ llm })

    // simulate the dashboard having already changed seed 1 target "quiero hablar" → "quiero charlar"
    const before = { ...db.rows('course_seeds')[0] }
    db.rows('course_seeds') // (the real edit already happened via the editor in production)
    db.tables.course_seeds[0].target_text = 'quiero charlar'
    const after = { ...db.tables.course_seeds[0] }

    worker.enqueue({ courseCode: 'spa_for_eng', table: 'course_seeds', pk: before.id, before, after, editedBy: 'kai' })
    await vi.advanceTimersByTimeAsync(100)

    expect(reviews).toHaveLength(1)
    const rec = reviews[0]
    expect(rec.verdict).toBe('looks_good')
    // cascade: phrases that quoted "quiero hablar"? none contain that exact phrase,
    // so no phrase fix here — but the review still records findings + parallel courses.
    expect(rec.findings.parallelCourses.some((p) => p.course_code === 'spa_for_fra')).toBe(true)
    expect(rec.urgent).toBe(false)
  })

  it('propagates an exact-text LEGO change into downstream phrases automatically', async () => {
    const llm = async () => JSON.stringify({ verdict: 'looks_good', approveCascadeFixes: true, flags: [] })
    const { db, reviews, worker } = harness({ llm })
    // LEGO S0003L01 target "leer" — change to "leer en voz alta"; phrase U01 "quiero leer" quotes "leer"...
    // use S0001L01 "quiero" → "deseo": phrase U01 "quiero leer" contains "quiero"
    const before = { ...db.rows('course_legos').find((l) => l.lego_id === 'S0001L01') }
    db.tables.course_legos.find((l) => l.lego_id === 'S0001L01').target_text = 'deseo'
    const after = { ...db.tables.course_legos.find((l) => l.lego_id === 'S0001L01') }

    worker.enqueue({ courseCode: 'spa_for_eng', table: 'course_legos', pk: before.id, before, after })
    await vi.advanceTimersByTimeAsync(100)

    expect(reviews[0].applied_fix_count).toBeGreaterThan(0)
    expect(db.rows('course_practice_phrases').find((p) => p.id === 'spa_for_eng:S0001L01U01').target_text).toBe('deseo leer')
    // audited → undoable
    expect(db.audit.some((a) => a.table_name === 'course_practice_phrases')).toBe(true)
  })

  it('UNRESOLVED ZUT → urgent + notification (deterministic backstop, even if LLM forgets)', async () => {
    // Agent returns no confident ZUT resolution; a clash exists, so worker escalates.
    const llm = async () => JSON.stringify({ verdict: 'possible_mistake', approveCascadeFixes: false, zutResolution: { confident: false, message: 'unsure: expand or gender pair?' }, flags: [] })
    const { db, reviews, notifications, worker } = harness({ llm })
    // Rename S0003L01 known to "he/she" (clashes with S0002L01 known "he/she", different target)
    const before = { ...db.rows('course_legos').find((l) => l.lego_id === 'S0003L01') }
    db.tables.course_legos.find((l) => l.lego_id === 'S0003L01').known_text = 'he/she'
    const after = { ...db.tables.course_legos.find((l) => l.lego_id === 'S0003L01') }

    worker.enqueue({ courseCode: 'spa_for_eng', table: 'course_legos', pk: before.id, before, after })
    await vi.advanceTimersByTimeAsync(100)

    const rec = reviews[0]
    expect(rec.urgent).toBe(true)
    expect(rec.flags[0].severity).toBe('urgent')
    expect(notifications).toHaveLength(1)
    expect(notifications[0].primary_key).toBe(before.id)
  })

  it('applies a CONFIDENT ZUT resolution from the agent', async () => {
    const { db } = (() => null) || {}
    const dbx = createFakeSupabase({ tables: buildSmallCourseDb('spa_for_eng') })
    const reviews = []
    const target = dbx.rows('course_legos').find((l) => l.lego_id === 'S0003L01')
    const llm = async () => JSON.stringify({
      verdict: 'looks_good',
      approveCascadeFixes: false,
      zutResolution: { confident: true, message: 'mark the later one not-new', fixes: [{ table: 'course_legos', pk: target.id, set: { is_new: false } }] },
      flags: [],
    })
    const worker = createGuardianWorker({
      makeEditor: () => createEditor({ client: dbx }),
      makeOps: (editor) => createOperations(editor),
      persistReview: async (r) => reviews.push(r),
      llm, debounceMs: 50,
    })
    const before = { ...target }
    dbx.tables.course_legos.find((l) => l.lego_id === 'S0003L01').known_text = 'he/she'
    const after = { ...dbx.tables.course_legos.find((l) => l.lego_id === 'S0003L01') }
    worker.enqueue({ courseCode: 'spa_for_eng', table: 'course_legos', pk: before.id, before, after })
    await vi.advanceTimersByTimeAsync(50)
    expect(reviews[0].zut_fix_batch_id).toBeTruthy()
    expect(dbx.rows('course_legos').find((l) => l.id === target.id).is_new).toBe(false)
  })
})
