// Phrase v4 through Popty's doors (job #517). The planner is pure, the gates are
// injected, the reads run over a fake client: no database, no network, no TTS.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
const require = createRequire(import.meta.url)
const door = require('./phrase-v4-door.cjs')
const { planOps } = require('./course-edit-ops.cjs')
const { findSurface } = require('./content-write-surfaces.cjs')

const C = 'fra_for_eng'
const row = (role, k, t, over = {}) => ({ seed_number: 351, lego_index: 2, phrase_role: role, known_text: k, target_text: t, lego_known: 'am', lego_target: 'suis', window: '351-360', frames: [], ...over })

describe('planned rows are valid course-edit inserts (the door lands them through the engine)', () => {
  it('every planned row is accepted by planOps as a phrase.insert, and ids continue past the live ones', () => {
    const live = [{ id: `${C}:S0351L02U07`, seed_number: 351, lego_index: 2, position: 10, known_text: 'x', target_text: 'y' }]
    const { rows } = door.planInsert(C, [row('use', 'I am new', 'je suis nouveau')], live)
    expect(rows[0].id).toBe(`${C}:S0351L02U08`)
    const plans = planOps(door.toInsertOps(rows), C)
    expect(plans).toHaveLength(1)
    expect(plans[0]).toMatchObject({ table: 'course_practice_phrases', kind: 'insert' })
  })
  it('is additive: a pair already on the LEGO is skipped, so a second apply plans nothing', () => {
    const live = [{ id: `${C}:S0351L02U01`, seed_number: 351, lego_index: 2, position: 1, known_text: 'I am here', target_text: 'je suis ici' }]
    const { rows, skipped } = door.planInsert(C, [row('use', 'I am here', 'je suis ici')], live)
    expect(rows).toHaveLength(0)
    expect(skipped).toHaveLength(1)
  })
})

describe('precheck: refusals that need no database', () => {
  const ok = { courseCode: C, rows: [row('use', 'a', 'b')], course: { status: 'draft' }, apply: false }
  it('passes a clean preview', () => expect(door.precheck(ok)).toBeNull())
  it('refuses Welsh, before anything else is read', () => {
    expect(door.precheck({ ...ok, courseCode: 'cym_for_eng' })).toMatchObject({ code: 'WELSH_EXCLUDED' })
  })
  it('refuses a missing course, empty rows and a malformed row', () => {
    expect(door.precheck({ ...ok, course: null })).toMatchObject({ code: 'NOT_FOUND' })
    expect(door.precheck({ ...ok, rows: [] })).toMatchObject({ code: 'BAD_REQUEST' })
    expect(door.precheck({ ...ok, rows: [row('use', 'a', 'b', { lego_target: '' })] })).toMatchObject({ code: 'BAD_ROW' })
    expect(door.precheck({ ...ok, rows: [row('component', 'a', 'b')] })).toMatchObject({ code: 'BAD_ROW' })
  })
  it('a live (beta/released) course previews freely but an APPLY needs Tom\'s words', () => {
    for (const status of ['beta', 'released']) {
      expect(door.precheck({ ...ok, course: { status } })).toBeNull()
      expect(door.precheck({ ...ok, course: { status }, apply: true })).toMatchObject({ code: 'TOM_GO_REQUIRED' })
      expect(door.precheck({ ...ok, course: { status }, apply: true, tomGo: '  ' })).toMatchObject({ code: 'TOM_GO_REQUIRED' })
      expect(door.precheck({ ...ok, course: { status }, apply: true, tomGo: 'go ahead' })).toBeNull()
      expect(door.precheck({ ...ok, course: { status }, apply: true, kaiGo: 'kai-watson' })).toBeNull()
      expect(door.precheck({ ...ok, course: { status }, apply: true, kaiGo: ' ' })).toMatchObject({ code: 'TOM_GO_REQUIRED' })
    }
    expect(door.precheck({ ...ok, apply: true })).toBeNull()
  })
})

describe('gateStagedRows: the existing gates are re-run at the door, not trusted from the staged file', () => {
  const data = {
    seeds: [{ seed_number: 351, known_text: 'I am here', target_text: 'je suis ici' }],
    legos: [{ seed_number: 351, lego_index: 2, known_text: 'am', target_text: 'suis' }],
    phrases: [{ phrase_role: 'component', seed_number: 351, lego_index: 1, known_text: 'I' }],
  }
  const passing = { overallPass: true, gates: { bareLego: { pass: true }, containment: { pass: true }, vocab: { pass: true }, zut: { pass: true }, knownSide: { pass: true } } }
  const deps = (over = {}) => ({
    makeCourseCtx: () => ({}),
    checkPhraseSet: async () => passing,
    checkPhraseZUT: async () => [],
    ...over,
  })
  const run = (rows, d) => door.gateStagedRows({ sb: {}, courseCode: C, rows, data, deps: d })

  it('passes rows that clear every gate', async () => {
    expect((await run([row('use', 'I am here', 'je suis ici')], deps())).refused).toEqual([])
  })
  it('vocab-only-from-earlier-seeds: a vocab failure refuses the row with the gate named', async () => {
    const bad = { ...passing, gates: { ...passing.gates, vocab: { pass: false, unknown: ['demain'] } } }
    const { refused } = await run([row('use', 'tomorrow I am', 'demain je suis')], deps({ checkPhraseSet: async () => bad }))
    expect(refused).toHaveLength(1)
    expect(refused[0].reasons[0]).toMatch(/^popty:vocab /)
  })
  it('refuses a ZUT clash against the WHOLE course, later seeds included', async () => {
    const { refused } = await run([row('use', 'I am here', 'je suis la')], deps({ checkPhraseZUT: async () => [{ known: 'I am here', existing_target: 'je suis ici', existing_seed: 900 }] }))
    expect(refused[0].reasons[0]).toMatch(/ZUT whole course.*seed 900/)
  })
  it('no pair-contract: the heard-words fallback cuts a known word the course never taught', async () => {
    const nullKnown = { ...passing, gates: { ...passing.gates, knownSide: { pass: null } } }
    const d = deps({ checkPhraseSet: async () => nullKnown })
    expect((await run([row('use', 'I am here', 'je suis ici')], d)).refused).toEqual([])
    const { refused } = await run([row('use', 'I am unheard here', 'je suis ici')], d)
    expect(refused[0].reasons[0]).toMatch(/unheard unheard/)
  })
  it('refuses a row whose LEGO changed since generation, and parentheses, without running the heavy gates', async () => {
    let called = 0
    const d = deps({ checkPhraseSet: async () => { called++; return passing } })
    const { refused } = await run([row('use', 'a', 'b', { lego_target: 'est' }), row('use', 'a (b)', 'c')], d)
    expect(refused.map(r => r.reasons[0])).toEqual(['LEGO changed or gone since generation', 'parentheses'])
    expect(called).toBe(0)
  })
})

describe('readCourse over a fake client', () => {
  const tables = {
    courses: [{ course_code: C, status: 'released', visibility: 'public', new_app_status: 'live' }],
    course_seeds: [{ seed_number: 1, known_text: 'k', target_text: 't' }],
    course_legos: [{ id: 'l1', seed_number: 1, lego_index: 1, known_text: 'k', target_text: 't', type: 'A', is_new: true }],
    course_practice_phrases: [
      { id: 'p1', seed_number: 1, lego_index: 1, position: 1, phrase_role: 'use', known_text: 'k', target_text: 't', metadata: { pipeline: 'v4-gap', big: 'x' } },
      { id: 'p2', seed_number: 1, lego_index: 1, position: 2, phrase_role: 'component', known_text: 'k', target_text: 't', metadata: null },
    ],
  }
  const fake = {
    from(t) {
      let rows = tables[t]
      const q = {
        select: () => q, eq: () => q, lte: () => q, order: () => q, in: () => q,
        range: (a, b) => Promise.resolve({ data: rows.slice(a, b + 1), error: null }),
        maybeSingle: () => Promise.resolve({ data: rows[0] || null, error: null }),
      }
      return q
    },
  }
  it('flattens metadata to the pipeline tag, as psql did, and returns the course row', async () => {
    const d = await door.readCourse(fake, C)
    expect(d.course.status).toBe('released')
    expect(d.phrases.map(p => [p.id, p.pipeline])).toEqual([['p1', 'v4-gap'], ['p2', null]])
    expect(d.phrases[0].metadata).toBeUndefined()
  })
})

describe('registered and psql-free', () => {
  it('the gap-fill door is a registered content-write surface behind the identity gate', () => {
    expect(findSurface('POST', '/api/admin/phrase-v4/gap-fill', 'production-api')?.surface.operation).toBe('phrase-v4-gap-fill')
  })
  it('no v4 tool shells out to psql or holds a database URL any more (#384)', () => {
    const dir = path.join(__dirname, '..', '..', 'tools', 'frame-layer', 'v4')
    const offenders = fs.readdirSync(dir)
      .filter(f => f.endsWith('.cjs') && !f.endsWith('.test.cjs'))
      .filter(f => /\bpsql\b|DATABASE_URL|\.env\.psql/.test(fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')))
    expect(offenders).toEqual([])
  })
})
