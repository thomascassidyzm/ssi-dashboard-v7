// A PREVIEW IS NOT THE BOOTH (job #290·I, 2026-09-26): a preview Production API
// (POPTY_PREVIEW=1) must never write the casting-access ledger the nightly
// booth-artists-access check judges main by. A worker's deliberate negative probe
// on its preview turned main red on 2026-09-26.
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

function ledgerFor(env) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'casting-ledger-'))
  const r = spawnSync(process.execPath, ['-e', "process.stdout.write(require('./casting-rights.cjs').accessLedger())"], {
    cwd: __dirname,
    env: { ...process.env, CASTING_ACCESS_LEDGER: '', POPTY_PREVIEW: '', SSI_EVIDENCE_ROOT: root, ...env },
    encoding: 'utf8',
  })
  assert.strictEqual(r.status, 0, r.stderr)
  return path.relative(root, r.stdout.trim().split('\n').pop())
}

test('production writes the ledger the nightly reads', () => {
  assert.strictEqual(ledgerFor({}), path.join('ops', 'casting-access.jsonl'))
})

test('a preview writes its own ledger, never the one the nightly reads', () => {
  assert.strictEqual(ledgerFor({ POPTY_PREVIEW: '1' }), path.join('ops', 'casting-access.preview.jsonl'))
})
