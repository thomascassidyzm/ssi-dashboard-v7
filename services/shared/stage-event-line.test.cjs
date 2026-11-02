// Characterisation test for the __SD__ event-line parser, run against the
// inline copy from production-api.cjs first, then against the module.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { isStageEventLine, parseStageEventLine } = require('./stage-event-line.cjs')

test('event with a JSON payload', () => {
  assert.equal(isStageEventLine('__SD__:start {"cmd": "restart.sh", "timeoutSeconds": 90}'), true)
  assert.deepEqual(parseStageEventLine('__SD__:start {"cmd": "restart.sh", "timeoutSeconds": 90}'),
    { event: 'start', payload: { cmd: 'restart.sh', timeoutSeconds: 90 } })
})

test('bare event, and an event whose payload is not JSON, both fire with an empty payload', () => {
  assert.deepEqual(parseStageEventLine('__SD__:restartSucceeded'), { event: 'restartSucceeded', payload: {} })
  assert.deepEqual(parseStageEventLine('__SD__:failed not json'), { event: 'failed', payload: {} })
})

test('log noise is not an event line; a prefixed line without an event name is null', () => {
  assert.equal(isStageEventLine('Warning: Permanently added host'), false)
  assert.equal(isStageEventLine(''), false)
  assert.equal(parseStageEventLine('__SD__:'), null)
  assert.equal(parseStageEventLine('__SD__: {"x":1}'), null)
})
