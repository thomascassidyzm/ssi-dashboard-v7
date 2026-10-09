const test = require('node:test')
const assert = require('node:assert')
const http = require('http')
const { isPhase8TransportError } = require('./phase8-transport-error.cjs')

test('a real refused connection is classified as a transport error (503-worthy)', async () => {
  const srv = http.createServer().listen(0)
  const port = srv.address().port
  await new Promise(r => srv.close(r))
  const err = await new Promise(resolve => http.request({ hostname: '127.0.0.1', port, path: '/' }).on('error', resolve).end())
  assert.equal(isPhase8TransportError(err), true)
})

test('ordinary errors are not transport errors', () => {
  assert.equal(isPhase8TransportError(new Error('bad json')), false)
  assert.equal(isPhase8TransportError(null), false)
  assert.equal(isPhase8TransportError({ message: 'connect ECONNREFUSED 127.0.0.1:3465' }), true)
})
