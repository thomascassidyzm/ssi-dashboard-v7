// Job #570 (Kai 2026-11-03): PUT /api/recording/languages/:language takes the same
// admin-or-agent gate (scope voice-slot:write) as GET /languages and the per-slot routes,
// so a signed agent key can create a language's recording policy. A refused gate writes nothing.
'use strict'
const test = require('node:test')
const assert = require('node:assert')
const express = require('express')
const createRecordistRouter = require('./recordist-router.cjs')

function stubDb(writes) {
  return {
    from() {
      const q = {
        select() { return q }, eq() { return q },
        maybeSingle() { return Promise.resolve({ data: null, error: null }) },
        upsert(row) { writes.push(row); return { select: () => ({ single: () => Promise.resolve({ data: { ...row, updated_at: 'now' }, error: null }) }) } },
      }
      return q
    },
  }
}

async function put(gate) {
  const writes = []
  const scopes = []
  const app = express()
  app.use(express.json())
  app.use('/api/recording', createRecordistRouter({
    getDb: () => stubDb(writes),
    logger: { log() {}, warn() {}, error() {} },
    requireAdmin: async (req, res) => { res.status(401).json({ error: 'Authentication required' }); return null },
    requireAdminOrAgent: async (req, res, scope) => { scopes.push(scope); return gate(req, res) },
  }))
  const server = app.listen(0)
  try {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/api/recording/languages/fry`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ humanOnly: true, voices: {} }),
    })
    return { status: r.status, json: await r.json(), writes, scopes }
  } finally { server.close() }
}

test('a signed agent holding voice-slot:write can write the policy', async () => {
  const r = await put(async () => ({ email: 'agent:kai-x' }))
  assert.strictEqual(r.status, 200)
  assert.deepStrictEqual(r.scopes, ['voice-slot:write'])
  assert.strictEqual(r.writes.length, 1)
  assert.strictEqual(r.writes[0].language, 'fry')
})

test('a refused gate writes nothing', async () => {
  const r = await put(async (req, res) => { res.status(401).json({ error: 'nope' }); return null })
  assert.strictEqual(r.status, 401)
  assert.strictEqual(r.writes.length, 0)
})
