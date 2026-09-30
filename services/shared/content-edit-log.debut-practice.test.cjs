'use strict'
// node --test services/shared/content-edit-log.debut-practice.test.cjs
// A tools/ sweep that moves or deletes phrases and exits 0 is failed at exit when a debut LEGO in
// the seeds it named is left without practice (Tom, 2026-09-30). The scope below is job #887·I's
// own move event, which emptied ita_for_eng S0190L01's USE basket and exited 0. Runs the real
// content-edit-log.cjs in a child process with a stub supabase and a stub check script.
const test = require('node:test')
const assert = require('node:assert/strict')
const { spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

const LOG = path.join(__dirname, 'content-edit-log.cjs')
const MOVE_887 = { seed_numbers: [91, 180, 190, 202, 254, 256], phrase_ids: ['ita_for_eng:S0202L03U10', 'ita_for_eng:S0256L01U06'], rows: 7 }
function child({ checkExit, kind = 'service', operation = 'phrase-move', scope = MOVE_887, env = {}, fromRequest = false }) {
  const dir = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'debut-practice-'))
  const stub = path.join(dir, 'check.cjs')
  fs.writeFileSync(stub, `console.log('stub check saw', process.argv.slice(2).join(' ')); process.exit(${checkExit})`)
  const prog = `
    const { recordContentEdit } = require(${JSON.stringify(LOG)});
    const supabase = { from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'evt' }, error: null }) }) }) }) };
    recordContentEdit(supabase, { identity: { kind: ${JSON.stringify(kind)}, id: 'x', label: 'x', verified: true }, courseCode: 'ita_for_eng', surface: 't', operation: ${JSON.stringify(operation)}, scope: ${JSON.stringify(scope)}, fromRequest: ${fromRequest} })
      .then(() => process.exit(0));`
  const r = spawnSync(process.execPath, ['-e', prog], { encoding: 'utf8', env: { ...process.env, DEBUT_PRACTICE_CHECK_SCRIPT: stub, INTRO_MIRROR_AT_EXIT: '0', VITEST: '', ...env } })
  return { code: r.status, out: r.stdout + r.stderr }
}

test('the #887 move, which left S0190L01 without USE, now fails its sweep with exit code 2', () => {
  const r = child({ checkExit: 2 })
  assert.equal(r.code, 2, r.out)
  assert.match(r.out, /LEFT A DEBUT LEGO WITHOUT PRACTICE/)
  assert.match(r.out, /stub check saw ita_for_eng --seeds 91,180,190,202,254,256 --strict/)
})
test('a clean check leaves exit code 0', () => {
  const r = child({ checkExit: 0 })
  assert.equal(r.code, 0, r.out)
  assert.match(r.out, /every debut LEGO still has practice/)
})
test('seeds come from any phrase or LEGO id when no seed_numbers are given', () => {
  const r = child({ checkExit: 2, operation: 'phrase-delete', scope: { phrase_ids: ['ita_for_eng:S0126L01U03'], lego_ids: ['S0626L01'] } })
  assert.equal(r.code, 2); assert.match(r.out, /--seeds 126,626 --strict/)
})
test('any identity arms it outside an HTTP request (job #910: an agent-identity sweep was invisible); approval/audio events never do', () => {
  assert.equal(child({ checkExit: 2, kind: 'agent' }).code, 2)
  assert.equal(child({ checkExit: 2, kind: 'human' }).code, 2)
  assert.equal(child({ checkExit: 2, operation: 'unapprove' }).code, 0)
  assert.equal(child({ checkExit: 2, operation: 'audio-link' }).code, 0)
})
test('an HTTP-request edit never arms it: the server never exits (release gate + standing checker cover routes)', () => {
  assert.equal(child({ checkExit: 2, fromRequest: true }).code, 0)
})
test('a scope naming no seed checks the WHOLE course (job #910: it used to arm nothing)', () => {
  const r = child({ checkExit: 2, operation: 'phrase-delete', scope: { rows: 40 } })
  assert.equal(r.code, 2, r.out)
  assert.match(r.out, /stub check saw ita_for_eng --strict/)
})
