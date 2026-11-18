// Characterisation test: run against the inline copy in production-api.cjs
// first, then against the module. Same wording, same punctuation.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { buildDeployMessage } = require('./deploy-audio-message.cjs')

test('clean deploy, verified', () => {
  assert.equal(
    buildDeployMessage({ deployed: 812, failed: 0 }, { missing: 0, durationMismatched: 0, durationErrors: 0 }, true),
    'Copied 812 files. All production audio verified.',
  )
})

test('every problem is listed, in order, and "verified" is withheld', () => {
  assert.equal(
    buildDeployMessage({ deployed: 10, failed: 2 }, { missing: 3, durationMismatched: 4, durationErrors: 5 }, false),
    'Copied 10 files. 2 copy failures. 3 missing from production. 4 duration mismatches. 5 verification errors.',
  )
})

test('verification fields absent read as zero', () => {
  assert.equal(buildDeployMessage({ deployed: 0 }, {}, false), 'Copied 0 files.')
})
