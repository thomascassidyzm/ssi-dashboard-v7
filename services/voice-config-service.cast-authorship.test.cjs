/**
 * job #125: loadCast's voice_language_roles SELECT omitted notes + assigned_by, the authorship resolveVoice
 * judges a cast row by, so every target cast looked unauthored and was refused (a stored male target1
 * survived a Tom-approved female French cast). The fake client below PROJECTS rows to the selected columns,
 * exactly as PostgREST does, so a column missing from the SELECT is missing from the row.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

const ROW = { language: 'fra', gender: 'f', rank: 0, slot: 'phrase', voice_id: 'cartesia_fra-f', notes: null, assigned_by: 'thomas.cassidy+ssi@gmail.com' }

function fakeClient() {
  const table = (rows) => ({
    select(cols) {
      const want = String(cols).split(',').map((c) => c.trim())
      const data = rows.map((r) => Object.fromEntries(want.filter((c) => c in r).map((c) => [c, r[c]])))
      const q = { eq: () => q, single: async () => ({ data: data[0], error: null }), then: (res, rej) => Promise.resolve({ data, error: null }).then(res, rej) }
      return q
    },
  })
  const tables = { voice_language_roles: [ROW], voices: [], courses: [] }
  return { from: (t) => table(tables[t] || []) }
}

describe('loadCast keeps cast-row authorship', () => {
  let svc
  beforeAll(() => {
    process.env.SUPABASE_URL = 'http://fake.invalid'; process.env.SUPABASE_SERVICE_KEY = 'fake'
    const sdk = require('@supabase/supabase-js')
    sdk.createClient = () => fakeClient()
    delete require.cache[require.resolve('./voice-config-service.cjs')]
    svc = require('./voice-config-service.cjs')
  })
  it('hands resolveVoice cast rows with assigned_by and notes', async () => {
    svc._clearCastCache()
    const { roles } = await svc.loadCast()
    expect(roles).toHaveLength(1)
    expect(roles[0]).toHaveProperty('assigned_by', 'thomas.cassidy+ssi@gmail.com')
    expect(roles[0]).toHaveProperty('notes', null)
  })
})
