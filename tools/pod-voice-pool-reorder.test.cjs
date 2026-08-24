const test = require('node:test')
const assert = require('node:assert')
const { promote } = require('./pod-voice-pool-reorder.cjs')

const POOL = [
  { name: 'Maria', provider: 'xai', voice_id: 'f2f41225' },
  { name: 'Lucia', provider: 'xai', voice_id: '46a802e3' },
  { name: 'Elvira', provider: 'azure', voice_id: 'es-ES-ElviraNeural' },
]

test('the named voice moves to the front', () => {
  assert.deepStrictEqual(promote(POOL, 'es-ES-ElviraNeural').map(v => v.name), ['Elvira', 'Maria', 'Lucia'])
})

test('the parked depth keeps its relative order and every member', () => {
  const after = promote(POOL, 'es-ES-ElviraNeural')
  assert.strictEqual(after.length, POOL.length, 'nothing dropped')
  assert.deepStrictEqual([...after].sort((a, b) => a.voice_id.localeCompare(b.voice_id)),
    [...POOL].sort((a, b) => a.voice_id.localeCompare(b.voice_id)), 'nothing added or altered')
  assert.deepStrictEqual(after.slice(1).map(v => v.name), ['Maria', 'Lucia'])
})

test('promoting the front voice is a no-op', () => {
  assert.deepStrictEqual(promote(POOL, 'f2f41225'), POOL)
})

test('a voice the pool never held is refused, never added', () => {
  assert.throws(() => promote(POOL, 'es-MX-CarlotaNeural'), /not in this pool/)
  assert.throws(() => promote([], 'anything'), /not in this pool/)
})
