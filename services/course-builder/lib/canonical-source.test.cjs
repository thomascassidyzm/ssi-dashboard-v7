/**
 * canonical-source: a course reads its assigned canonical list, every other course
 * reads canonical_seeds exactly as before (Aran's ruling, 2026-10-07).
 *
 * Run: npx vitest run services/course-builder/lib/canonical-source
 */
import { describe, it, expect } from 'vitest'

const { fetchCanonicalSeeds } = require('./canonical-source.cjs')

// Minimal Supabase fake: select/eq/in/order/maybeSingle over in-memory tables.
function makeDb(tables, { failAssignments = false } = {}) {
  const reads = []
  return {
    reads,
    from(table) {
      reads.push(table)
      let rows = (tables[table] || []).slice()
      const q = {
        select() { return q },
        eq(col, v) { rows = rows.filter(r => r[col] === v); return q },
        in(col, vs) { rows = rows.filter(r => vs.includes(r[col])); return q },
        order(col) { rows.sort((a, b) => a[col] - b[col]); return q },
        async maybeSingle() {
          if (table === 'canonical_list_assignments' && failAssignments) return { data: null, error: { message: 'relation does not exist' } }
          return { data: rows[0] || null, error: null }
        },
        then(res, rej) { return Promise.resolve({ data: rows.map(({ seed_number, source_text }) => ({ seed_number, source_text })), error: null }).then(res, rej) },
      }
      return q
    },
  }
}

const shared = [
  { seed_number: 305, source_text: 'Shared 305.' },
  { seed_number: 306, source_text: 'Shared 306.' },
  { seed_number: 307, source_text: 'Shared 307.' },
]
const tables = {
  canonical_seeds: shared,
  canonical_list_assignments: [{ course_code: 'cym_nv2_for_eng', list_id: 'L1' }],
  canonical_list_seeds: [
    { list_id: 'L1', seed_number: 305, source_text: 'Shared 305.' },
    { list_id: 'L1', seed_number: 306, source_text: '' },
    { list_id: 'L1', seed_number: 317, source_text: 'Shared 306.' },
    { list_id: 'L2', seed_number: 306, source_text: 'Other list.' },
  ],
}

describe('fetchCanonicalSeeds', () => {
  it('unassigned course reads canonical_seeds unchanged', async () => {
    const db = makeDb(tables)
    const { data, listId } = await fetchCanonicalSeeds(db, 'cym_n_for_eng', [306])
    expect(listId).toBe(null)
    expect(data).toEqual([{ seed_number: 306, source_text: 'Shared 306.' }])
    expect(db.reads).not.toContain('canonical_list_seeds')
  })

  it('assigned course reads only its own list, empty slots stay empty', async () => {
    const db = makeDb(tables)
    const { data, listId } = await fetchCanonicalSeeds(db, 'cym_nv2_for_eng', [306, 307, 317])
    expect(listId).toBe('L1')
    expect(data).toEqual([
      { seed_number: 306, source_text: '' },
      { seed_number: 317, source_text: 'Shared 306.' },
    ])
    expect(db.reads).not.toContain('canonical_seeds') // 307 does NOT fall back
  })

  it('whole-list read is ordered', async () => {
    const { data } = await fetchCanonicalSeeds(makeDb(tables), 'cym_nv2_for_eng')
    expect(data.map(r => r.seed_number)).toEqual([305, 306, 317])
  })

  it('assignment lookup failure falls back to canonical_seeds', async () => {
    const { data, listId } = await fetchCanonicalSeeds(makeDb(tables, { failAssignments: true }), 'cym_nv2_for_eng')
    expect(listId).toBe(null)
    expect(data).toEqual(shared)
  })
})
