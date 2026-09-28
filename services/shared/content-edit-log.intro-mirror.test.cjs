'use strict'
// node --test services/shared/content-edit-log.intro-mirror.test.cjs
// A tools/ sweep that records a LEGO edit and exits 0 is failed at exit when the intro mirror
// check it armed reports a mismatch — and left alone when the check is clean. Runs the real
// content-edit-log.cjs in a child process with a stub supabase and a stub check script.
const test = require('node:test')
const assert = require('node:assert/strict')
const { spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

const LOG = path.join(__dirname, 'content-edit-log.cjs')
function child({ checkExit, kind = 'service', operation = 'lego-edit', scope = { seed_numbers: [599], lego_ids: ['S0599L01'] }, env = {} }) {
  const dir = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'intro-mirror-'))
  const stub = path.join(dir, 'check.cjs')
  fs.writeFileSync(stub, `console.log('stub check saw', process.argv.slice(2).join(' ')); process.exit(${checkExit})`)
  const prog = `
    const { recordContentEdit } = require(${JSON.stringify(LOG)});
    const supabase = { from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'evt' }, error: null }) }) }) }) };
    recordContentEdit(supabase, { identity: { kind: ${JSON.stringify(kind)}, id: 'x', label: 'x', verified: true }, courseCode: 'ita_for_eng', surface: 't', operation: ${JSON.stringify(operation)}, scope: ${JSON.stringify(scope)} })
      .then(() => process.exit(0));`
  const r = spawnSync(process.execPath, ['-e', prog], { encoding: 'utf8', env: { ...process.env, INTRO_MIRROR_CHECK_SCRIPT: stub, VITEST: '', ...env } })
  return { code: r.status, out: r.stdout + r.stderr }
}

test('a service edit whose intro check fails forces exit code 2 even after process.exit(0)', () => {
  const r = child({ checkExit: 1 })
  assert.equal(r.code, 2, r.out)
  assert.match(r.out, /DOES NOT MIRROR/)
  assert.match(r.out, /stub check saw ita_for_eng --seeds 599 --strict/)
})
test('a clean check leaves exit code 0', () => {
  const r = child({ checkExit: 0 })
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /every intro mirrors/)
})
test('human/agent identities (HTTP routes) never arm it; unapprove events never arm it; opt-out honoured', () => {
  assert.equal(child({ checkExit: 1, kind: 'agent' }).code, 0)
  assert.equal(child({ checkExit: 1, operation: 'unapprove' }).code, 0)
  assert.equal(child({ checkExit: 1, env: { INTRO_MIRROR_AT_EXIT: '0' } }).code, 0)
})
test('seeds are read from lego ids and component phrase ids when no seed_numbers are given', () => {
  const r = child({ checkExit: 1, scope: { lego_ids: ['S0061L02'], phrase_ids: ['ita_for_eng:S0599L01C01'] } })
  assert.equal(r.code, 2); assert.match(r.out, /--seeds 61,599 --strict/)
})
