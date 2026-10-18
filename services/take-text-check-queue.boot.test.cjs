/**
 * Boot recovery reaps orphaned decoders even when the text check is switched off, and one step
 * failing never skips the other.
 *
 * Run: node services/take-text-check-queue.boot.test.cjs
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const { recoverAtBoot } = require('./take-text-check-queue.cjs')

const quiet = { log () {}, warn () {}, error () {} }

test('reaps orphans even though the check is disabled', () => {
  let reaped = 0, recovered = 0
  recoverAtBoot({ enabled: false, recover: () => { recovered++ } }, { logger: quiet, reap: () => { reaped++ } })
  assert.equal(reaped, 1)
  assert.equal(recovered, 1)
})

test('a failing reap does not skip recovery', () => {
  let recovered = 0
  recoverAtBoot({ enabled: true, recover: () => { recovered++ } }, { logger: quiet, reap: () => { throw new Error('boom') } })
  assert.equal(recovered, 1)
})
