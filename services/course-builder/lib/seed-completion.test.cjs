/**
 * The completion marker is the LAST write (Popty finding P1, 2026-09-05).
 *
 * The bug: /seed/complete upserted course_seeds with status:'released' and
 * decomposed_at BEFORE writing the seed's LEGOs and phrases, in a loop that
 * throws on the first failure. A partial failure therefore left a seed marked
 * complete with content missing — getBuildProgress counts decomposed_at as
 * completion, so nothing ever retried it, and phase8 renders audio for seeds
 * whose status is 'released'.
 *
 * These tests run against an in-memory fake of the Supabase surface these two
 * helpers use — no real course data is touched.
 *
 * Run: npx vitest run services/course-builder/lib/seed-completion
 */

import { describe, it, expect } from 'vitest'

const { writeSeedRow, markSeedDecomposed } = require('./seed-completion.cjs')

const COURSE = 'tst_for_eng'

// ── Minimal in-memory Supabase fake: upsert / select / update, .eq / .limit ──
function makeDb(initial = {}) {
  const tables = { course_seeds: [], course_legos: [], ...initial }
  const failures = {}   // table -> { op: 'message' }
  const opLog = []      // ordered mutating ops, for sequencing assertions

  function builder(table, op, payload, conflictCols) {
    const filters = []
    const state = { limit: null }

    const run = () => {
      const fail = failures[table] && failures[table][op]
      if (fail) return { data: null, error: { message: fail } }

      const match = rows => rows.filter(r => filters.every(([c, v]) => r[c] === v))

      if (op === 'select') {
        let rows = match(tables[table]).map(r => ({ ...r }))
        if (state.limit != null) rows = rows.slice(0, state.limit)
        return { data: rows, error: null }
      }
      if (op === 'upsert') {
        for (const row of (Array.isArray(payload) ? payload : [payload])) {
          const existing = tables[table].find(r => conflictCols.every(c => r[c] === row[c]))
          if (existing) Object.assign(existing, row)
          else tables[table].push({ ...row })
        }
        opLog.push({ op: 'upsert', table, payload })
        return { data: null, error: null }
      }
      if (op === 'update') {
        const hits = match(tables[table])
        for (const r of hits) Object.assign(r, payload)
        opLog.push({ op: 'update', table, payload })
        return { data: hits, error: null }
      }
      throw new Error(`unsupported op ${op}`)
    }

    const chain = {
      eq(col, val) { filters.push([col, val]); return chain },
      limit(n) { state.limit = n; return chain },
      select() { return chain },
      then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject) },
    }
    return chain
  }

  return {
    tables, failures, opLog,
    from(table) {
      if (!tables[table]) tables[table] = []
      return {
        select: cols => builder(table, 'select').select(cols),
        update: payload => builder(table, 'update', payload),
        upsert: (payload, opts = {}) =>
          builder(table, 'upsert', payload, (opts.onConflict || '').split(',').map(c => c.trim())),
      }
    },
  }
}

const seedRow = { course_code: COURSE, seed_number: 7, known_text: 'i want', target_text: 'je veux', version: 1 }
const aLego = { id: 'lego-1', course_code: COURSE, seed_number: 7, lego_index: 1 }

describe('writeSeedRow — the seed lands un-decomposed', () => {
  it('writes the text with no completion marker', async () => {
    const db = makeDb()
    await writeSeedRow(db, { ...seedRow }, 'event-1')

    const seed = db.tables.course_seeds[0]
    expect(seed.known_text).toBe('i want')
    expect(seed.status).toBeUndefined()
    expect(seed.decomposed_at).toBeUndefined()
    expect(seed.last_edit_event_id).toBe('event-1')
  })

  it('refuses a caller that smuggles the marker in with the content', async () => {
    const db = makeDb()
    await expect(writeSeedRow(db, { ...seedRow, status: 'released' })).rejects.toThrow(/completion marker/)
    await expect(writeSeedRow(db, { ...seedRow, decomposed_at: new Date().toISOString() })).rejects.toThrow(/completion marker/)
    expect(db.tables.course_seeds).toHaveLength(0)
  })

  it('never claims attribution it does not have', async () => {
    const db = makeDb({ course_seeds: [{ ...seedRow, last_edit_event_id: 'older-event' }] })
    await writeSeedRow(db, { ...seedRow })
    expect(db.tables.course_seeds[0].last_edit_event_id).toBe('older-event')
  })
})

describe('markSeedDecomposed — the last write, and only when content is there', () => {
  it('stamps released/decomposed_at once the LEGOs are in', async () => {
    const db = makeDb({ course_legos: [aLego] })
    await writeSeedRow(db, { ...seedRow }, 'event-1')
    await markSeedDecomposed(db, { course_code: COURSE, seed_number: 7, eventId: 'event-1' })

    const seed = db.tables.course_seeds[0]
    expect(seed.status).toBe('released')
    expect(seed.decomposed_at).toBeTruthy()

    // The marker is the LAST mutating write, never the first.
    const marks = db.opLog.filter(o => o.payload?.decomposed_at)
    expect(marks).toHaveLength(1)
    expect(db.opLog[db.opLog.length - 1]).toBe(marks[0])
  })

  it('refuses to mark a seed whose LEGOs were never written', async () => {
    const db = makeDb()
    await writeSeedRow(db, { ...seedRow })
    await expect(markSeedDecomposed(db, { course_code: COURSE, seed_number: 7 })).rejects.toThrow(/no LEGOs/)
    expect(db.tables.course_seeds[0].decomposed_at).toBeUndefined()
  })

  it('a seed whose LEGO write fails is NOT left with decomposed_at set', async () => {
    const db = makeDb()
    await writeSeedRow(db, { ...seedRow }, 'event-1')

    // The route writes LEGOs here and throws on the first failure.
    db.failures.course_legos = { upsert: 'boom' }
    const { error } = await db.from('course_legos').upsert(aLego, { onConflict: 'course_code,seed_number,lego_index' })
    expect(error.message).toBe('boom')
    // …so markSeedDecomposed is never reached.

    const seed = db.tables.course_seeds[0]
    expect(seed.decomposed_at).toBeUndefined()
    expect(seed.status).toBeUndefined()
  })
})
