import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

// Evaluate only the guard: importing the CLI would read configuration and run it.
const source = readFileSync(new URL('./snapshot.mjs', import.meta.url), 'utf8')
const guard = source.match(/const blockedWrites = \[\][\s\S]*?(?=\nfunction findEsbuild\()/)?.[0]
assert.ok(guard, 'fetch guard source must remain identifiable')

function harness() {
  const calls = []
  const response = new Response('synthetic read')
  const context = vm.createContext({
    Response,
    fetch: (...args) => { calls.push(args); return Promise.resolve(response) },
  })
  const api = vm.runInContext(`${guard}\n;({ readOnlyFetch, blockedWrites })`, context)
  return { ...api, calls, response }
}

test('explicit write methods are blocked with synthetic success and no fetch', async () => {
  const h = harness()
  for (const method of ['POST', 'patch', 'PUT', 'DELETE', 'OPTIONS']) {
    const response = await h.readOnlyFetch('https://fixture.invalid/resource', { method })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'application/json')
    assert.equal(await response.text(), '[]')
  }
  assert.equal(h.calls.length, 0)
  assert.deepEqual(Array.from(h.blockedWrites), ['POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
    .map((method) => `${method} https://fixture.invalid/resource`))
})

test('default GET and explicit read methods forward input and init unchanged', async () => {
  const h = harness()
  const input = new URL('https://fixture.invalid/resource')
  for (const init of [{}, { method: 'get' }, { method: 'HEAD' }]) {
    assert.equal(await h.readOnlyFetch(input, init), h.response)
    assert.equal(h.calls.at(-1)[0], input)
    assert.equal(h.calls.at(-1)[1], init)
  }
  assert.equal(h.calls.length, 3)
  assert.equal(h.blockedWrites.length, 0)
})

test('characterization: a Request POST without init.method passes the guard', async () => {
  const h = harness()
  const request = new Request('https://fixture.invalid/resource', { method: 'POST', body: 'fixture' })
  assert.equal(await h.readOnlyFetch(request), h.response)
  assert.equal(h.calls.length, 1)
  assert.equal(h.calls[0][0].method, 'POST')
  assert.equal(h.blockedWrites.length, 0)
})

test('forwarded fetch rejection propagates without retry or blocked-write entry', async () => {
  const failure = new Error('synthetic transport failure')
  let calls = 0
  const context = vm.createContext({ Response, fetch: () => { calls++; return Promise.reject(failure) } })
  const h = vm.runInContext(`${guard}\n;({ readOnlyFetch, blockedWrites })`, context)
  await assert.rejects(h.readOnlyFetch('https://fixture.invalid/resource'), (error) => error === failure)
  assert.equal(calls, 1)
  assert.equal(h.blockedWrites.length, 0)
})
