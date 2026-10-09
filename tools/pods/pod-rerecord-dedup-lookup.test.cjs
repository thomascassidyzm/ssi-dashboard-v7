import { test, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { findExistingClip } = require('./pod-rerecord.cjs')
const plain = (x) => String(x || '').replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim()

// Fake PostgREST: ignores filters (the test pre-filters), honours .range paging at 1000 rows like the real server cap.
const fake = (rows) => { const q = { select: () => q, eq: () => q, order: () => q, range: (a, b) => Promise.resolve({ data: rows.slice(a, b + 1), error: null }) }; return { from: () => q } }

test('dedup finds a clip past the first 1000 rows (old ilike lookup truncated there)', async () => {
  const rows = Array.from({ length: 2500 }, (_, i) => ({ id: `id${i}`, text_normalized: `phrase ${i}` }))
  rows[2400] = { id: 'target', text_normalized: 'et vous ' }
  expect(await findExistingClip(fake(rows), 'fra_for_eng', 'fra', 'et vous ?', 'v', plain)).toMatchObject({ id: 'target' })
})

test('dedup finds a row whose text starts with a non-letter (old prefix was empty)', async () => {
  const rows = [{ id: 'q', text_normalized: 'qué tal' }]
  expect(await findExistingClip(fake(rows), 'spa_for_eng', 'spa', '¿qué tal?', 'v', plain)).toMatchObject({ id: 'q' })
  expect(await findExistingClip(fake([]), 'spa_for_eng', 'spa', '¿qué tal?', 'v', plain)).toBeNull()
})
