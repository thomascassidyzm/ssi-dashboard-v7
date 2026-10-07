// Review #854: a take uploading after Submit must not reset the check to open.
'use strict'
const test = require('node:test')
const assert = require('node:assert')
const setup = require('./recordist-setup-check.cjs')

test('a late take keeps a submitted check submitted', () => {
  assert.strictEqual(setup.statusAfterTake('submitted'), 'submitted')
})
test('a take on a check sent back for changes reopens it; open and approved are unchanged', () => {
  assert.strictEqual(setup.statusAfterTake('changes'), 'open')
  assert.strictEqual(setup.statusAfterTake('open'), 'open')
  assert.strictEqual(setup.statusAfterTake('approved'), 'approved')
})
