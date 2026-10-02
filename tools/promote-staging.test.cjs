const test = require('node:test')
const assert = require('node:assert')
const { decide } = require('./promote-staging.cjs')

const now = Date.parse('2026-10-03T06:00:00Z')
const base = {
  mainSha: 'a'.repeat(40), stagingSha: 'b'.repeat(40), mainIsAncestor: true, changedFiles: ['tools/x.cjs'],
  verdict: { sha: 'b'.repeat(40), rc: 0, at: '2026-10-03T02:10:00Z' }, approvedSha: null, now,
}

test('green + internal-only promotes', () => assert.strictEqual(decide(base).action, 'promote'))
test('same commit is a no-op', () => assert.strictEqual(decide({ ...base, stagingSha: base.mainSha }).action, 'noop'))
test('red holds', () => assert.strictEqual(decide({ ...base, verdict: { ...base.verdict, rc: 1 } }).kind, 'red'))
test('a green for a DIFFERENT sha is no verdict (never promote an unchecked commit)', () =>
  assert.strictEqual(decide({ ...base, verdict: { ...base.verdict, sha: 'c'.repeat(40) } }).kind, 'no-verdict'))
test('stale green holds', () =>
  assert.strictEqual(decide({ ...base, verdict: { ...base.verdict, at: '2026-10-01T02:10:00Z' } }).kind, 'stale'))
test('diverged holds', () => assert.strictEqual(decide({ ...base, mainIsAncestor: false }).kind, 'diverged'))
test('journey file holds even when green, and names the file', () => {
  const d = decide({ ...base, changedFiles: ['tools/x.cjs', 'src/views/RecordistRoom.vue'] })
  assert.strictEqual(d.kind, 'journey'); assert.deepStrictEqual(d.journey, ['src/views/RecordistRoom.vue'])
})
test("Tom's approval of exactly this sha releases a journey hold, another sha does not", () => {
  const files = { ...base, changedFiles: ['src/router/index.js'] }
  assert.strictEqual(decide({ ...files, approvedSha: base.stagingSha }).action, 'promote')
  assert.strictEqual(decide({ ...files, approvedSha: 'c'.repeat(40) }).action, 'hold')
})
