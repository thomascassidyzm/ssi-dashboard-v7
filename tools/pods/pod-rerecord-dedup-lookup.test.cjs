import { test, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { findExistingClip } = require('./pod-rerecord.cjs')

// Fake PostgREST: ignores filters (the test pre-filters), honours .range paging at 1000 rows like the real server cap.
const fake = (rows) => { const q = { select: () => q, eq: () => q, order: () => q, range: (a, b) => Promise.resolve({ data: rows.slice(a, b + 1), error: null }) }; return { from: () => q } }

test('dedup finds a clip past the first 1000 rows (old ilike lookup truncated there)', async () => {
  const rows = Array.from({ length: 2500 }, (_, i) => ({ id: `id${i}`, text_normalized: `phrase ${i}` }))
  rows[2400] = { id: 'target', text_normalized: 'et vous ' }
  expect(await findExistingClip(fake(rows), 'fra_for_eng', 'fra', 'et vous ?', 'v')).toMatchObject({ id: 'target' })
})

test('dedup finds a row whose text starts with a non-letter, stored as the DB trigger stores it (leading ¿ kept)', async () => {
  const rows = [{ id: 'q', text_normalized: '¿qué tal' }]
  expect(await findExistingClip(fake(rows), 'spa_for_eng', 'spa', '¿qué tal?', 'v')).toMatchObject({ id: 'q' })
  expect(await findExistingClip(fake([]), 'spa_for_eng', 'spa', '¿qué tal?', 'v')).toBeNull()
})

test('dedup keeps internal punctuation: "1,5 euros" never reuses a "15 euros" clip', async () => {
  const rows = [{ id: 'fifteen', text_normalized: '15 euros' }]
  expect(await findExistingClip(fake(rows), 'fra_for_eng', 'fra', '1,5 euros', 'v')).toBeNull()
  expect(await findExistingClip(fake([{ id: 'x', text_normalized: '1,5 euros' }]), 'fra_for_eng', 'fra', '1,5 euros.', 'v')).toMatchObject({ id: 'x' })
})
