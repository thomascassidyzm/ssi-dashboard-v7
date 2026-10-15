// job #748: the live door can prove itself (selftest), and a committed tool run from a checkout with
// no .env.psql of its own still finds the agent login.
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import pkg from './agent-db.cjs'
const { selftest, agentUrl, lintSql } = pkg

// A stand-in client that applies the SAME lint the real connect() applies, and answers anything else.
function fakeOpen() {
  const sent = []
  return {
    sent,
    open: async () => ({
      query: async (sql) => {
        if (lintSql(sql, { executable: true }).some((f) => f.rule === 'key-cast')) throw Object.assign(new Error('refused'), { code: 'AGENT_DB_LINT' })
        sent.push(sql)
        return { rows: [{ login: 'agent_script', statement_timeout: '5s' }] }
      },
      end: async () => {},
    }),
  }
}

describe('agent-db selftest', () => {
  it('reports the incident shape refused and the read answered', async () => {
    const f = fakeOpen()
    const out = await selftest({ open: f.open })
    expect(out.ok).toBe(true)
    expect(out.refuse).toMatch(/refused before sending/)
    expect(out.allow.login).toBe('agent_script')
    expect(f.sent.join('\n')).not.toMatch(/CAST/i)   // the refused statement never reached the wire
  })
})

describe('agentUrl', () => {
  it('falls back to the shared login when the running checkout has none', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentdb-'))
    const shared = path.join(dir, 'shared.env')
    fs.writeFileSync(shared, 'DATABASE_URL="postgres://agent_script@h/db"\n')
    const saved = { d: process.env.DATABASE_URL, a: process.env.AGENT_DB_ENV }
    delete process.env.DATABASE_URL; delete process.env.AGENT_DB_ENV
    try {
      expect(agentUrl(path.join(dir, 'missing.env'), { fallback: shared })).toBe('postgres://agent_script@h/db')
    } finally {
      if (saved.d !== undefined) process.env.DATABASE_URL = saved.d
      if (saved.a !== undefined) process.env.AGENT_DB_ENV = saved.a
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
