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

test('--help / -h / unknown flags print usage and never touch git or push', () => {
  const { spawnSync } = require('node:child_process')
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path')
  // a fake `git` first on PATH that records every call: any call at all fails the test
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'promote-help-'))
  const log = path.join(dir, 'git-calls')
  fs.writeFileSync(path.join(dir, 'git'), `#!/bin/sh\necho "$@" >> ${log}\nexit 0\n`, { mode: 0o755 })
  for (const args of [['--help'], ['-h'], ['--bogus'], ['--dry-run', '--hepl']]) {
    const r = spawnSync(process.execPath, [path.join(__dirname, 'promote-staging.cjs'), ...args], { env: { ...process.env, PATH: `${dir}:${process.env.PATH}` }, encoding: 'utf8' })
    assert.match(r.stdout, /usage:/, args.join(' '))
    assert.strictEqual(r.status, args[0].startsWith('--h') || args[0] === '-h' ? 0 : 2, args.join(' '))
  }
  assert.strictEqual(fs.existsSync(log), false, 'git was called')
})
