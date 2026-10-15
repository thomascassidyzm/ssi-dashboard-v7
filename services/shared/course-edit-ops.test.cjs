// The course-edit door's engine (job #391). A fake pg client interprets the
// handful of statement shapes course-edit-ops.cjs generates, so the transaction
// discipline, the undo derivation and the refusals are asserted without a database.

import { describe, it, expect } from 'vitest'

const { planOps, runPlans, EditOpError, structuralGate } = require('./course-edit-ops.cjs')
const { findSurface, LEGO_WRITING_SURFACES } = require('./content-write-surfaces.cjs')

const C = 'cym_nv2_for_eng'
const A1 = '11111111-1111-4111-8111-111111111111'
const A2 = '22222222-2222-4222-8222-222222222222'

function fakeDb(seed) {
  const tables = JSON.parse(JSON.stringify(seed))
  let snapshot = null
  const log = []
  const cols = {
    course_seeds: ['id', 'course_code', 'seed_number', 'known_text', 'target_text', 'status', 'known_audio_id', 'target1_audio_id', 'target2_audio_id', 'last_edit_event_id', 'version'],
    course_legos: ['id', 'course_code', 'seed_number', 'lego_index', 'lego_id', 'type', 'known_text', 'target_text', 'components', 'known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id', 'last_edit_event_id'],
    course_practice_phrases: ['id', 'course_code', 'seed_number', 'lego_index', 'known_text', 'target_text', 'phrase_role', 'position', 'known_audio_id', 'target1_audio_id', 'target2_audio_id', 'last_edit_event_id'],
    course_audio: ['id', 'course_code', 'text', 'role', 'voice_id'],
    course_gender_expansions: ['id', 'course_code', 'original_text', 'expanded_f', 'expanded_m'],
    course_qa_flags: ['phrase_id'],
  }
  const norm = (t) => String(t || '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').trim()
  const parseWhere = (w, params) => w.split(' AND ').map(p => { const m = /"(\w+)" = \$(\d+)/.exec(p); return [m[1], params[+m[2] - 1]] })
  const match = (row, conds) => conds.every(([c, v]) => String(row[c]) === String(v))

  const client = {
    tables, log,
    async connect() {},
    async end() {},
    async query(sql, params = []) {
      log.push(sql.split(' ')[0])
      if (sql === 'BEGIN') { snapshot = JSON.parse(JSON.stringify(tables)); return { rows: [] } }
      if (sql === 'ROLLBACK') { for (const k of Object.keys(tables)) tables[k] = snapshot[k]; return { rows: [] } }
      if (sql === 'COMMIT' || sql.startsWith('SET LOCAL')) return { rows: [] }
      if (sql.includes('information_schema')) {
        return { rows: cols[params[0]].map(c => ({ column_name: c, data_type: c === 'components' ? 'jsonb' : 'text' })) }
      }
      if (sql.startsWith('SELECT normalize_text')) return { rows: [{ ok: norm(params[0]) === norm(params[1]) }] }
      if (sql.startsWith('SELECT id, course_code, text')) return { rows: tables.course_audio.filter(r => r.id === params[0]) }
      let m
      if ((m = /^SELECT \* FROM "(\w+)" WHERE (.*?)( FOR UPDATE)?$/.exec(sql))) {
        return { rows: tables[m[1]].filter(r => match(r, parseWhere(m[2], params))).map(r => ({ ...r })) }
      }
      if ((m = /^UPDATE "(\w+)" SET (.*) WHERE (.*)$/.exec(sql))) {
        const sets = m[2].split(', ').map(p => { const k = /"(\w+)" = \$(\d+)/.exec(p); return [k[1], params[+k[2] - 1]] })
        for (const r of tables[m[1]].filter(r => match(r, parseWhere(m[3], params)))) {
          const textChanged = sets.some(([c, v]) => (c === 'target_text') && v !== r.target_text)
          for (const [c, v] of sets) r[c] = typeof v === 'string' && c === 'components' ? JSON.parse(v) : v
          // the text-change trigger: a target edit drops the target clips
          if (textChanged && m[1] !== 'course_audio') { r.target1_audio_id = null; r.target2_audio_id = null }
        }
        return { rows: [] }
      }
      if ((m = /^INSERT INTO "(\w+)" \((.*)\) VALUES/.exec(sql))) {
        const cs = m[2].split(', ').map(c => c.replace(/"/g, ''))
        const row = Object.fromEntries(cs.map((c, i) => [c, params[i]]))
        if (m[1] === 'course_legos' && !row.id) row.id = '44444444-4444-4444-8444-' + String(tables.course_legos.length).padStart(12, '0') // the column default
        tables[m[1]].push(row)
        return { rows: [{ ...row }] }
      }
      if ((m = /^DELETE FROM "?(\w+)"? WHERE (\w+) = \$1$/.exec(sql))) {
        tables[m[1]] = tables[m[1]].filter(r => String(r[m[2]]) !== String(params[0]))
        return { rows: [] }
      }
      throw new Error('fake db: unhandled ' + sql)
    },
  }
  return client
}

function seedDb() {
  return fakeDb({
    course_seeds: [{ id: 's1', course_code: C, seed_number: 1, known_text: 'I want', target_text: 'dw i isio', status: 'released', known_audio_id: null, target1_audio_id: A1, target2_audio_id: null, last_edit_event_id: null }],
    course_legos: [{ id: '33333333-3333-4333-8333-333333333333', course_code: C, seed_number: 1, lego_index: 1, lego_id: 'S0001L01', known_text: 'some of the', target_text: 'rhan o’r', components: [], known_audio_id: null, target1_audio_id: A1, target2_audio_id: null, presentation_audio_id: null, last_edit_event_id: null }],
    course_practice_phrases: [{ id: `${C}:S0001L01U01`, course_code: C, seed_number: 1, lego_index: 1, known_text: 'some of the areas', target_text: 'rhai o’r ardaloedd', phrase_role: 'use', position: 1, known_audio_id: null, target1_audio_id: null, target2_audio_id: null, last_edit_event_id: null }],
    course_audio: [{ id: A1, course_code: C, text: 'dw i isio', role: 'target1', voice_id: 'v' }, { id: A2, course_code: C, text: 'rhai o’r ardaloedd', role: 'target1', voice_id: 'v' }],
    course_gender_expansions: [],
    course_qa_flags: [{ phrase_id: `${C}:S0001L01U01` }],
  })
}

const run = (db, ops, apply = true) => runPlans({ connect: async () => db, courseCode: C, plans: planOps(ops, C), apply, eventId: async () => 'ev-1' })

describe('course-edit door: routes exist and are gated (job #391)', () => {
  it('lists the edit, batch, lego and seed-delete routes on the editor-identity manifest', () => {
    for (const [m, p] of [['POST', `/api/production/${C}/edit`], ['POST', `/api/production/${C}/edit-batch`],
      ['PATCH', `/api/production/${C}/lego/S0001L01`], ['DELETE', `/api/production/${C}/seed/3`]]) {
      expect(findSurface(m, p, 'production-api'), `${m} ${p}`).not.toBeNull()
    }
    const lego = LEGO_WRITING_SURFACES.map(s => s.path)
    expect(lego).toContain('/api/production/:courseCode/edit-batch')
  })
})

describe('course-edit-ops', () => {
  it('refuses bad ops before touching the database', () => {
    expect(() => planOps([{ op: 'lego.update', lego_id: 'S0001L01', set: { course_code: 'x' } }], C)).toThrow(/cannot set course_code/)
    expect(() => planOps([{ op: 'phrase.delete', phrase_id: 'spa_for_eng:S0001L01U01' }], C)).toThrow(EditOpError)
    expect(() => planOps([{ op: 'seed.update', seed_number: 1, set: { target_text: 'a (note)' } }], C)).toThrow(/speakable/)
    expect(() => planOps([{ op: 'audio.link', target: 'seed', seed_number: 1, slot: 'presentation', audio_id: A1 }], C)).toThrow(/no presentation/)
  })

  it('a dry run runs the real statements and rolls every one back', async () => {
    const db = seedDb()
    const out = await run(db, [{ op: 'lego.update', lego_id: 'S0001L01', set: { target_text: 'rhai o’r' } }], false)
    expect(out.applied).toBe(false)
    expect(out.results[0].after.target_text).toBe('rhai o’r')
    expect(db.tables.course_legos[0].target_text).toBe('rhan o’r')
    expect(db.log).toContain('ROLLBACK')
  })

  it('the undo of a text edit restores the text AND the clip the trigger dropped', async () => {
    const db = seedDb()
    const out = await run(db, [{ op: 'lego.update', lego_id: 'S0001L01', set: { target_text: 'rhai o’r' } }])
    expect(db.tables.course_legos[0].target1_audio_id).toBeNull()
    expect(db.tables.course_legos[0].last_edit_event_id).toBe('ev-1')
    expect(out.undo_ops).toEqual([{ op: 'lego.update', id: '33333333-3333-4333-8333-333333333333', set: { target_text: 'rhan o’r', target1_audio_id: A1 } }])
    await run(db, out.undo_ops)
    // text first, clip second: the trigger cannot undo the restore
    expect(db.tables.course_legos[0].target_text).toBe('rhan o’r')
    expect(db.tables.course_legos[0].target1_audio_id).toBe(A1)
  })

  it('audio.link refuses a clip that says different words, links one that matches', async () => {
    const db = seedDb()
    await expect(run(db, [{ op: 'audio.link', target: 'phrase', phrase_id: `${C}:S0001L01U01`, slot: 'target1', audio_id: A1 }]))
      .rejects.toMatchObject({ code: 'TEXT_MISMATCH' })
    const out = await run(db, [{ op: 'audio.link', target: 'phrase', phrase_id: `${C}:S0001L01U01`, slot: 'target1', audio_id: A2 }])
    expect(db.tables.course_practice_phrases[0].target1_audio_id).toBe(A2)
    expect(out.undo_ops[0]).toEqual({ op: 'phrase.update', phrase_id: `${C}:S0001L01U01`, set: { target1_audio_id: null } })
  })

  it('one failing op rolls back the whole batch; before-state drift is a failure', async () => {
    const db = seedDb()
    await expect(run(db, [
      { op: 'seed.update', seed_number: 1, set: { known_text: 'I would like' } },
      { op: 'lego.update', lego_id: 'S0001L01', expect: { target_text: 'something else' }, set: { known_text: 'x' } },
    ])).rejects.toMatchObject({ code: 'DRIFT', index: 1 })
    expect(db.tables.course_seeds[0].known_text).toBe('I want')
  })

  it('phrase delete takes its QA flags and undoes by re-inserting the whole row', async () => {
    const db = seedDb()
    const out = await run(db, [{ op: 'phrase.delete', phrase_id: `${C}:S0001L01U01` }])
    expect(db.tables.course_practice_phrases).toHaveLength(0)
    expect(db.tables.course_qa_flags).toHaveLength(0)
    expect(out.undo_ops[0].op).toBe('phrase.insert')
    await run(db, out.undo_ops)
    expect(db.tables.course_practice_phrases[0].target_text).toBe('rhai o’r ardaloedd')
  })

  it('phrase.insert refuses an id that already exists', async () => {
    const db = seedDb()
    const row = { id: `${C}:S0001L01U01`, seed_number: 1, lego_index: 1, known_text: 'a', target_text: 'b', phrase_role: 'use' }
    await expect(run(db, [{ op: 'phrase.insert', row }])).rejects.toMatchObject({ code: 'EXISTS' })
  })
})

// lego.insert / lego.delete (job #544, Kai's ask)
describe('lego.insert / lego.delete', () => {
  const newLego = { seed_number: 1, lego_index: 2, known_text: 'to go', target_text: 'mynd', type: 'A' }

  it('lego.insert lands a LEGO whose lego_id is derived, and its undo is a delete', async () => {
    const db = seedDb()
    const out = await run(db, [{ op: 'lego.insert', row: newLego }])
    const row = db.tables.course_legos.find(r => r.lego_index === 2)
    expect(row.target_text).toBe('mynd')
    expect(row.lego_id).toBeUndefined() // generated column: never written
    expect(out.undo_ops).toHaveLength(1)
    expect(out.undo_ops[0].op).toBe('lego.delete')
    await run(db, out.undo_ops)
    expect(db.tables.course_legos).toHaveLength(1)
  })

  it('refuses: unknown seed, taken slot, bad type, M without components, typed lego_id, parentheses', async () => {
    const db = seedDb()
    await expect(run(db, [{ op: 'lego.insert', row: { ...newLego, seed_number: 9 } }])).rejects.toMatchObject({ code: 'NO_SUCH_SEED' })
    await expect(run(db, [{ op: 'lego.insert', row: { ...newLego, lego_index: 1 } }])).rejects.toMatchObject({ code: 'EXISTS' })
    expect(() => planOps([{ op: 'lego.insert', row: { ...newLego, type: 'word' } }], C)).toThrow(/type must be/)
    expect(() => planOps([{ op: 'lego.insert', row: { ...newLego, type: 'M' } }], C)).toThrow(/components/)
    expect(() => planOps([{ op: 'lego.insert', row: { ...newLego, lego_id: 'S0001L09' } }], C)).toThrow(/derived/)
    expect(() => planOps([{ op: 'lego.insert', row: { ...newLego, known_text: 'to go (away)' } }], C)).toThrow(/speakable/)
  })

  it('lego.delete is refused while phrases remain; cascade_phrases takes them and the undo restores LEGO first, phrases after', async () => {
    const db = seedDb()
    await expect(run(db, [{ op: 'lego.delete', lego_id: 'S0001L01' }])).rejects.toMatchObject({ code: 'LEGO_HAS_PHRASES' })
    expect(db.tables.course_legos).toHaveLength(1)
    const out = await run(db, [{ op: 'lego.delete', lego_id: 'S0001L01', cascade_phrases: true }])
    expect(db.tables.course_legos).toHaveLength(0)
    expect(db.tables.course_practice_phrases).toHaveLength(0)
    expect(db.tables.course_qa_flags).toHaveLength(0)
    expect(out.undo_ops.map(o => o.op)).toEqual(['lego.insert', 'phrase.insert'])
    await run(db, out.undo_ops)
    expect(db.tables.course_legos[0].target_text).toBe('rhan o’r')
    expect(db.tables.course_practice_phrases).toHaveLength(1)
  })

  it('deleting the phrases in the same batch first also clears the refusal; a dry run changes nothing', async () => {
    const db = seedDb()
    const out = await run(db, [{ op: 'phrase.delete', phrase_id: `${C}:S0001L01U01` }, { op: 'lego.delete', lego_id: 'S0001L01' }], false)
    expect(out.applied).toBe(false)
    expect(db.tables.course_legos).toHaveLength(1)
    expect(db.tables.course_practice_phrases).toHaveLength(1)
  })

  it('on a beta/released course an apply needs tom_go; a preview never does', () => {
    const plans = planOps([{ op: 'lego.insert', row: newLego }], C)
    expect(structuralGate({ plans, courseStatus: 'released', apply: true, tomGo: '' })).toMatchObject({ status: 409, code: 'TOM_GO_REQUIRED' })
    expect(structuralGate({ plans, courseStatus: 'released', apply: false, tomGo: '' })).toBeNull()
    expect(structuralGate({ plans, courseStatus: 'draft', apply: true, tomGo: '' })).toBeNull()
    expect(structuralGate({ plans, courseStatus: 'beta', apply: true, tomGo: 'go' })).toBeNull()
    const plain = planOps([{ op: 'phrase.delete', phrase_id: `${C}:S0001L01U01` }], C)
    expect(structuralGate({ plans: plain, courseStatus: 'released', apply: true, tomGo: '' })).toBeNull()
  })

  it('the signed-agent route is on the content-edit manifest and is a lego writer', () => {
    expect(findSurface('POST', `/api/admin/course-edit/${C}/edit-batch`, 'production-api')?.surface).toMatchObject({ operation: 'course-edit', legos: true })
  })
})
