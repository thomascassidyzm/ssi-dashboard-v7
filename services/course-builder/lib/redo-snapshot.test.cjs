/**
 * Unit tests for redo snapshots (redo-seed destructive-delete fix, 2026-08-11).
 *
 * The bug: POST /api/build/redo deleted a seed's LEGOs and phrases with nothing
 * capturing them first, so a bad redo was unrecoverable and the rebuild agent
 * never saw what it was replacing.
 *
 * These tests run against an in-memory fake of the Supabase client — no real
 * course data is touched. They pin the three things that matter:
 *   1. the snapshot captures everything BEFORE any delete (and throws, so the
 *      caller aborts, if it can't);
 *   2. restore is a true round trip — same rows, same ids, same audio pointers;
 *   3. the brief renders the previous decomposition the agent needs.
 *
 * Run: npx vitest run services/course-builder/lib/redo-snapshot
 */

import { describe, it, expect } from 'vitest'

const {
  snapshotSeeds, latestSnapshots, listSnapshots, restoreSnapshot, formatSnapshotForBrief, stripGenerated,
} = require('./redo-snapshot.cjs')

// ── Minimal in-memory Supabase fake ────────────────────────────────────────
// Supports the exact surface this module uses: select/insert/update/delete with
// .eq/.order/.limit/.maybeSingle, and { count, head } on select.
function makeDb(initial = {}) {
  const tables = {
    course_seeds: [], course_legos: [], course_practice_phrases: [], seed_redo_snapshots: [],
    ...initial,
  }
  const failures = {}    // table -> { op: 'message' }
  const opLog = []       // ordered record of every mutating op, for sequencing assertions

  function match(rows, filters) {
    return rows.filter(r => filters.every(([col, val]) => r[col] === val))
  }

  function builder(table, op, payload) {
    const filters = []
    const state = { orders: [], limit: null, head: false, count: null }

    const run = () => {
      const fail = failures[table] && failures[table][op]
      if (fail) return { data: null, error: { message: fail }, count: null }

      if (op === 'select') {
        let rows = match(tables[table], filters).map(r => ({ ...r }))
        for (const { col, asc } of state.orders) {
          rows.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1))
        }
        const count = rows.length
        if (state.limit != null) rows = rows.slice(0, state.limit)
        return { data: state.head ? null : rows, error: null, count }
      }
      if (op === 'insert') {
        const rows = (Array.isArray(payload) ? payload : [payload]).map((r, i) => ({
          id: r.id ?? `gen-${table}-${tables[table].length + i}`,
          created_at: r.created_at ?? new Date(2026, 7, 11, 12, 0, tables[table].length).toISOString(),
          ...r,
        }))
        for (const r of rows) tables[table].push({ ...r })
        opLog.push({ op: 'insert', table, n: rows.length })
        return { data: rows, error: null, count: rows.length }
      }
      if (op === 'update') {
        const hits = match(tables[table], filters)
        for (const r of hits) Object.assign(r, payload)
        opLog.push({ op: 'update', table, n: hits.length })
        return { data: hits, error: null, count: hits.length }
      }
      if (op === 'delete') {
        const hits = match(tables[table], filters)
        tables[table] = tables[table].filter(r => !hits.includes(r))
        opLog.push({ op: 'delete', table, n: hits.length })
        return { data: hits, error: null, count: hits.length }
      }
      throw new Error(`unsupported op ${op}`)
    }

    const chain = {
      eq(col, val) { filters.push([col, val]); return chain },
      order(col, opts = {}) { state.orders.push({ col, asc: opts.ascending !== false }); return chain },
      limit(n) { state.limit = n; return chain },
      select(_cols, opts = {}) {
        if (opts.count) state.count = opts.count
        if (opts.head) state.head = true
        return chain
      },
      maybeSingle() { const r = run(); return Promise.resolve({ ...r, data: (r.data || [])[0] || null }) },
      single() { return chain.maybeSingle() },
      then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject) },
    }
    return chain
  }

  return {
    tables, failures, opLog,
    from(table) {
      if (!tables[table]) tables[table] = []
      return {
        select: (cols, opts = {}) => builder(table, 'select').select(cols, opts),
        insert: (payload) => builder(table, 'insert', payload),
        update: (payload) => builder(table, 'update', payload),
        delete: () => builder(table, 'delete'),
      }
    },
  }
}

const COURSE = 'tst_for_eng'

function seededDb() {
  return makeDb({
    course_seeds: [{
      id: 'seed-uuid', course_code: COURSE, seed_number: 7,
      known_text: 'i want to speak', target_text: 'je veux parler',
      decomposed_at: '2026-08-01T10:00:00Z', approved_at: null, flagged_at: '2026-08-10T09:00:00Z',
    }],
    course_legos: [
      { id: 'lego-1', course_code: COURSE, seed_number: 7, lego_index: 1, lego_id: 'S0007L01',
        type: 'M', is_new: true, known_text: 'i want', target_text: 'je veux',
        components: [{ known: 'i', target: 'je' }], target1_audio_id: 'audio-a' },
      { id: 'lego-2', course_code: COURSE, seed_number: 7, lego_index: 2, lego_id: 'S0007L02',
        type: 'A', is_new: true, known_text: 'to speak', target_text: 'parler',
        components: null, target1_audio_id: 'audio-b' },
    ],
    course_practice_phrases: [
      { id: `${COURSE}:S0007L01B01`, course_code: COURSE, seed_number: 7, lego_index: 1, position: 1,
        known_text: 'i want to speak', target_text: 'je veux parler', phrase_role: 'build' },
      { id: `${COURSE}:S0007L01U01`, course_code: COURSE, seed_number: 7, lego_index: 1, position: 2,
        known_text: 'i want to speak french', target_text: 'je veux parler français', phrase_role: 'use' },
      { id: `${COURSE}:S0007L02U01`, course_code: COURSE, seed_number: 7, lego_index: 2, position: 1,
        known_text: 'i can speak', target_text: 'je peux parler', phrase_role: 'use' },
    ],
  })
}

describe('snapshotSeeds — capture before delete', () => {
  it('captures the seed stamps, every LEGO and every phrase', async () => {
    const db = seededDb()
    const { batchId, snapshots } = await snapshotSeeds(db, COURSE, [7], { reason: 'redo', notes: 'make this less formal' })

    expect(batchId).toBeTruthy()
    expect(snapshots).toHaveLength(1)

    const stored = db.tables.seed_redo_snapshots[0]
    expect(stored.course_code).toBe(COURSE)
    expect(stored.seed_number).toBe(7)
    expect(stored.notes).toBe('make this less formal')
    expect(stored.lego_count).toBe(2)
    expect(stored.phrase_count).toBe(3)
    expect(stored.seed_row.target_text).toBe('je veux parler')
    expect(stored.seed_row.flagged_at).toBe('2026-08-10T09:00:00Z')
    // audio pointers travel with the snapshot — an undo restores the old links
    expect(stored.legos[0].target1_audio_id).toBe('audio-a')
  })

  it('throws — so the caller aborts before deleting — when the snapshot cannot be written', async () => {
    const db = seededDb()
    db.failures.seed_redo_snapshots = { insert: 'permission denied' }

    await expect(snapshotSeeds(db, COURSE, [7])).rejects.toThrow(/nothing deleted/)
    // and the content is untouched
    expect(db.tables.course_legos).toHaveLength(2)
    expect(db.tables.course_practice_phrases).toHaveLength(3)
  })

  it('throws if the LEGOs cannot be read, rather than snapshotting an empty seed', async () => {
    const db = seededDb()
    db.failures.course_legos = { select: 'statement timeout' }
    await expect(snapshotSeeds(db, COURSE, [7])).rejects.toThrow(/Snapshot failed reading LEGOs/)
    expect(db.tables.seed_redo_snapshots).toHaveLength(0)
  })

  it('snapshots a seed with no decomposition without error (nothing to lose)', async () => {
    const db = seededDb()
    db.tables.course_legos = []
    db.tables.course_practice_phrases = []
    const { snapshots } = await snapshotSeeds(db, COURSE, [7])
    expect(snapshots).toHaveLength(1)
    expect(db.tables.seed_redo_snapshots[0].lego_count).toBe(0)
  })
})

describe('restoreSnapshot — the undo', () => {
  // Reproduces the real sequence: snapshot → redo deletes → agent writes a
  // different decomposition → human says "that was worse" → undo.
  async function redoThenReplace(db) {
    const { batchId } = await snapshotSeeds(db, COURSE, [7], { notes: 'make this less formal' })
    await db.from('course_practice_phrases').delete().eq('course_code', COURSE).eq('seed_number', 7)
    await db.from('course_legos').delete().eq('course_code', COURSE).eq('seed_number', 7)
    await db.from('course_seeds').update({ decomposed_at: null, approved_at: null, flagged_at: null })
      .eq('course_code', COURSE).eq('seed_number', 7)
    // the rebuild agent's (worse) version
    await db.from('course_legos').insert([{ id: 'new-lego', course_code: COURSE, seed_number: 7,
      lego_index: 1, type: 'A', is_new: true, known_text: 'i want', target_text: 'je souhaite' }])
    await db.from('course_practice_phrases').insert([{ id: `${COURSE}:S0007L01U01`, course_code: COURSE,
      seed_number: 7, lego_index: 1, position: 1, known_text: 'i want', target_text: 'je souhaite', phrase_role: 'use' }])
    await db.from('course_seeds').update({ decomposed_at: '2026-08-11T12:00:00Z' })
      .eq('course_code', COURSE).eq('seed_number', 7)
    return batchId
  }

  it('round-trips the old decomposition exactly, including ids and audio links', async () => {
    const db = seededDb()
    const before = JSON.parse(JSON.stringify({
      legos: db.tables.course_legos, phrases: db.tables.course_practice_phrases,
    }))
    await redoThenReplace(db)

    const result = await restoreSnapshot(db, { courseCode: COURSE, seedNumber: 7 })

    expect(result.ok).toBe(true)
    expect(result.deleted).toEqual({ legos: 1, phrases: 1 })
    expect(result.restored).toEqual({ legos: 2, phrases: 3 })

    // rows are back, byte-for-byte apart from the generated lego_id column
    const legos = db.tables.course_legos.sort((a, b) => a.lego_index - b.lego_index)
    expect(legos.map(l => l.id)).toEqual(['lego-1', 'lego-2'])
    expect(legos.map(l => l.target_text)).toEqual(['je veux', 'parler'])
    expect(legos.map(l => l.target1_audio_id)).toEqual(['audio-a', 'audio-b'])
    expect(db.tables.course_practice_phrases.map(p => p.id).sort())
      .toEqual(before.phrases.map(p => p.id).sort())

    // and the seed's stamps are back — including the flag that prompted the redo
    const seed = db.tables.course_seeds[0]
    expect(seed.decomposed_at).toBe('2026-08-01T10:00:00Z')
    expect(seed.flagged_at).toBe('2026-08-10T09:00:00Z')
  })

  it('never sends the generated lego_id column back to Postgres', async () => {
    const db = seededDb()
    await redoThenReplace(db)
    await restoreSnapshot(db, { courseCode: COURSE, seedNumber: 7 })
    for (const l of db.tables.course_legos) expect(l.lego_id).toBeUndefined()
    expect(stripGenerated({ id: 'x', lego_id: 'S0007L01' })).toEqual({ id: 'x' })
  })

  it('deletes phrases before LEGOs and restores LEGOs before phrases (FK order)', async () => {
    const db = seededDb()
    await redoThenReplace(db)
    db.opLog.length = 0
    await restoreSnapshot(db, { courseCode: COURSE, seedNumber: 7 })

    const seq = db.opLog
      .filter(o => ['course_legos', 'course_practice_phrases'].includes(o.table))
      .map(o => `${o.op}:${o.table}`)
    expect(seq).toEqual([
      'delete:course_practice_phrases',
      'delete:course_legos',
      'insert:course_legos',
      'insert:course_practice_phrases',
    ])
  })

  it('dry run changes nothing and reports both sides', async () => {
    const db = seededDb()
    await redoThenReplace(db)
    const result = await restoreSnapshot(db, { courseCode: COURSE, seedNumber: 7, dryRun: true })

    expect(result.dry_run).toBe(true)
    expect(result.would_delete).toEqual({ legos: 1, phrases: 1 })
    expect(result.would_restore).toEqual({ legos: 2, phrases: 3 })
    expect(db.tables.course_legos.map(l => l.id)).toEqual(['new-lego'])
  })

  it('marks the snapshot restored, so a second undo is visibly a re-run', async () => {
    const db = seededDb()
    await redoThenReplace(db)
    await restoreSnapshot(db, { courseCode: COURSE, seedNumber: 7 })
    expect(db.tables.seed_redo_snapshots[0].restored_at).toBeTruthy()
  })

  it('refuses clearly when a seed has no snapshot (redone before the fix)', async () => {
    const db = seededDb()
    await expect(restoreSnapshot(db, { courseCode: COURSE, seedNumber: 99 }))
      .rejects.toThrow(/No redo snapshot found/)
  })

  it('refuses a snapshot belonging to another course', async () => {
    const db = seededDb()
    await snapshotSeeds(db, COURSE, [7])
    const id = db.tables.seed_redo_snapshots[0].id
    await expect(restoreSnapshot(db, { courseCode: 'other_for_eng', snapshotId: id }))
      .rejects.toThrow(/belongs to/)
  })

  it('picks the newest snapshot when a seed has been redone twice', async () => {
    const db = seededDb()
    await snapshotSeeds(db, COURSE, [7], { notes: 'first redo' })
    db.tables.course_legos[0].target_text = 'je souhaite'
    await snapshotSeeds(db, COURSE, [7], { notes: 'second redo' })

    const result = await restoreSnapshot(db, { courseCode: COURSE, seedNumber: 7, dryRun: true })
    const chosen = db.tables.seed_redo_snapshots.find(s => s.id === result.snapshot_id)
    expect(chosen.notes).toBe('second redo')
  })
})

describe('brief context — the agent can see what it is replacing', () => {
  it('latestSnapshots returns the pre-delete decomposition after the rows are gone', async () => {
    const db = seededDb()
    await snapshotSeeds(db, COURSE, [7], { notes: 'make this less formal' })
    await db.from('course_practice_phrases').delete().eq('course_code', COURSE).eq('seed_number', 7)
    await db.from('course_legos').delete().eq('course_code', COURSE).eq('seed_number', 7)

    const snaps = await latestSnapshots(db, COURSE, [7])
    expect(snaps.get(7).lego_count).toBe(2)
    expect(snaps.get(7).legos[0].target_text).toBe('je veux')
  })

  it('formatSnapshotForBrief renders LEGOs, components, BUILD and USE', async () => {
    const db = seededDb()
    await snapshotSeeds(db, COURSE, [7])
    const md = formatSnapshotForBrief(db.tables.seed_redo_snapshots[0])

    expect(md).toContain('### Seed 7: "i want to speak" → "je veux parler"')
    expect(md).toContain('**L1 (M)**: "i want" → "je veux"')
    expect(md).toContain('Components: "i" → "je"')
    expect(md).toContain('BUILD (1): "i want to speak" → "je veux parler"')
    expect(md).toContain('USE (1): "i want to speak french" → "je veux parler français"')
    expect(md).toContain('**L2 (A)**: "to speak" → "parler"')
  })

  it('formatSnapshotForBrief returns null when there is no snapshot', () => {
    expect(formatSnapshotForBrief(null)).toBeNull()
  })
})

describe('listSnapshots — what the dashboard offers as undoable', () => {
  it('lists newest first and scopes to a seed', async () => {
    const db = seededDb()
    await snapshotSeeds(db, COURSE, [7], { notes: 'older' })
    await snapshotSeeds(db, COURSE, [7], { notes: 'newer' })
    db.tables.course_seeds.push({ course_code: COURSE, seed_number: 8, known_text: 'x', target_text: 'y' })
    await snapshotSeeds(db, COURSE, [8], { notes: 'other seed' })

    const all = await listSnapshots(db, COURSE)
    expect(all).toHaveLength(3)
    expect(all[0].notes).toBe('other seed')

    const scoped = await listSnapshots(db, COURSE, { seed: 7 })
    expect(scoped.map(s => s.notes)).toEqual(['newer', 'older'])
  })
})
