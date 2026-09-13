const { test } = require('node:test')
const assert = require('node:assert')
const { stripDeletedIds, EXCLUDED, IN_PLACE } = require('./cym-n-pod1-retire-june-takes-2026-09-13.cjs')

test('a retired id is dropped; an emptied array is NULL, never []', () => {
  const gone = new Set(['a', 'b'])
  assert.deepStrictEqual(stripDeletedIds(['a', 'b'], gone), null)       // whole array retired → whole-turn fallback
  assert.deepStrictEqual(stripDeletedIds(['a', 'x'], gone), ['x'])      // partial → keep the survivor
  assert.deepStrictEqual(stripDeletedIds(['x', 'y'], gone), ['x', 'y']) // untouched stays identical
  assert.strictEqual(stripDeletedIds(null, gone), null)
})

test('rows 43/52/70/71 are excluded and never among the four in-place re-registrations', () => {
  assert.strictEqual(EXCLUDED.size, 4)
  for (const id of Object.keys(IN_PLACE)) assert.ok(!EXCLUDED.has(id))
})
