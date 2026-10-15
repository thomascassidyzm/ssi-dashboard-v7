// job #384: the incident SQL is refused before it reaches the shared DB; the keyed forms pass.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
import pkg from './agent-db.cjs'
const { lintSql, connect, clipsById } = pkg
const require = createRequire(import.meta.url)

const keyCasts = (sql) => lintSql(sql).filter((f) => f.rule === 'key-cast')

describe('agent-db lintSql', () => {
  it('refuses the 2026-10-14 incident query and its write twin', () => {
    expect(keyCasts('SELECT id::text, voice_id, text, s3_key FROM course_audio WHERE id::text = ANY($1)')).toHaveLength(1)
    expect(keyCasts('UPDATE course_audio SET lego_id=NULL WHERE id::text=$1 AND lego_id=$2')).toHaveLength(1)
  })
  it('refuses a cast key on either side of a join, and CAST() spelling', () => {
    expect(keyCasts('join course_audio a on a.id::text = l.presentation_audio_id')).toHaveLength(1)
    expect(keyCasts('join course_audio a on l.presentation_audio_id = a.id::text')).toHaveLength(1)
    expect(keyCasts('where CAST(id AS text) IN (select x from t)')).toHaveLength(1)
  })
  it('passes the keyed forms and a cast in the select list', () => {
    expect(keyCasts('SELECT id::text, voice_id FROM course_audio WHERE id = ANY($1::uuid[])')).toHaveLength(0)
    expect(keyCasts('join course_audio a on a.id = l.presentation_audio_id::uuid')).toHaveLength(0)
    expect(keyCasts('select x.id::text as k from t x where x.course_code = $1')).toHaveLength(0)
  })
  it('only warns on lifting the timeout', () => {
    const f = lintSql("set statement_timeout = '60s'")
    expect(f.map((x) => x.rule)).toEqual(['lift-timeout'])
  })
})

describe('agent-db clipsById', () => {
  it('sends a uuid[] on the key and drops empty / malformed ids', async () => {
    const calls = []
    const pg = { query: async (sql, params) => { calls.push({ sql, params }); return { rows: params[0].map((id) => ({ id })) } } }
    const good = '0b7f3c8e-1d2a-4c5b-9e6f-7a8b9c0d1e2f'
    const rows = await clipsById(pg, [good, '', null, 'not-a-uuid', good])
    expect(rows).toEqual([{ id: good }])
    expect(calls).toHaveLength(1)
    expect(calls[0].sql).toMatch(/WHERE id = ANY\(\$1::uuid\[\]\)/)
    expect(keyCasts(calls[0].sql)).toHaveLength(0)
  })
})

describe('agent-db connect', () => {
  it('refuses a key-cast query without sending it', async () => {
    let sent = 0
    const pg = require('pg')
    const orig = pg.Client
    pg.Client = class { constructor() {} async connect() {} query() { sent++; return Promise.resolve({ rows: [] }) } }
    try {
      const c = await connect({ url: 'postgresql://x@localhost/x' })
      await expect(c.query('select 1 from course_audio where id::text = any($1)', [[]])).rejects.toMatchObject({ code: 'AGENT_DB_LINT' })
      expect(sent).toBe(0)
      await c.query('select 1 from course_audio where id = any($1::uuid[])', [[]])
      expect(sent).toBe(1)
    } finally { pg.Client = orig }
  })
})
