// Review #857: a take uploading after Submit must not overwrite 'submitted' with 'open'.
// The reopen has to be a conditional UPDATE ... WHERE status = <what was read>.
'use strict'
const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const src = fs.readFileSync(path.join(__dirname, 'recordist-router.cjs'), 'utf8')
const fn = src.slice(src.indexOf('async function noteSetupTake'), src.indexOf('async function packQueueResponse'))

test('the metrics update never carries a status', () => {
  assert.match(fn, /update\(\{ metrics: /)
  assert.doesNotMatch(fn, /patch\.status/)
})
test('the reopen is guarded by .eq(status, the status that was read)', () => {
  assert.match(fn, /update\(\{ status: next \}\)[^\n]*\.eq\('status', row\.status\)/)
})
