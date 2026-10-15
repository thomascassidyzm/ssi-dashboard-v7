import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
import db from './agent-db.cjs'

const require = createRequire(import.meta.url)

async function withClient(run) {
  const pg = require('pg')
  const original = pg.Client
  const sent = []
  pg.Client = class {
    async connect() {}
    query(q) { sent.push(q); return Promise.resolve({ rows: [] }) }
  }
  try {
    await run(await db.connect({ url: 'postgresql://unused@localhost/unused' }), sent)
  } finally { pg.Client = original }
}

describe('lane review: agent-db query contracts', () => {
  it('refuses the incident cast when the SQL expression is parenthesised', async () => {
    await withClient(async (client, sent) => {
      await expect(client.query('SELECT id FROM course_audio WHERE (id::text) = ANY($1)', [[]]))
        .rejects.toMatchObject({ code: 'AGENT_DB_LINT' })
      expect(sent).toHaveLength(0)
    })
  })

  it('allows a primary-key lookup with a diagnostic SQL comment', async () => {
    await withClient(async (client, sent) => {
      await expect(client.query('SELECT id FROM course_audio WHERE id = $1::uuid /* replaces id::text = $1 */', ['0b7f3c8e-1d2a-4c5b-9e6f-7a8b9c0d1e2f']))
        .resolves.toEqual({ rows: [] })
      expect(sent).toHaveLength(1)
    })
  })

  it('reports a refused query to a pg query-config callback', async () => {
    await withClient(async (client, sent) => {
      let callbackError
      const result = client.query({
        text: 'SELECT id FROM course_audio WHERE id::text = ANY($1)',
        values: [[]],
        callback: (error) => { callbackError = error },
      })
      // Consume the erroneous rejected promise so this regression stays local.
      if (result?.then) await result.catch(() => {})
      expect(callbackError).toMatchObject({ code: 'AGENT_DB_LINT' })
      expect(sent).toHaveLength(0)
    })
  })
})
