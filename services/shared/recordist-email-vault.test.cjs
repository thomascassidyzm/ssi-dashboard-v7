/**
 * Recordist emails live in a vault the public key cannot read (Tom,
 * 2026-09-25: "fix that"); Popty's service-role client puts them back where
 * they were, so the booth and casting still match recordists by email.
 *
 * Run: npx vitest run services/shared/recordist-email-vault
 */
import { describe, it, expect } from 'vitest'
const { vaultFetch, hydrateRows, VAULTED } = require('./recordist-email-vault.cjs')

const VAULT = [
  { row_key: 'cym_x', path: ['podCast', 'Anna', 'email'], email: 'anna@example.test' },
  { row_key: 'cym_x', path: ['voices', 'target1', 'assignedEmail'], email: 'rec@example.test' },
  { row_key: 'cym_x', path: ['podCast', 'Gone', 'email'], email: 'gone@example.test' },
]
const scrubbed = () => ({
  course_code: 'cym_x',
  voice_config: { voices: { target1: { voiceId: 'human_a' } }, podCast: { Anna: { voiceId: 'human_b', name: 'Anna' } } },
})

describe('hydrateRows', () => {
  it('puts each email back at its path, and nowhere the holder has gone', () => {
    const row = scrubbed()
    expect(hydrateRows([row], VAULTED.courses, VAULT)).toBe(2)
    expect(row.voice_config.podCast.Anna.email).toBe('anna@example.test')
    expect(row.voice_config.voices.target1.assignedEmail).toBe('rec@example.test')
    expect(row.voice_config.podCast.Gone).toBeUndefined()
  })
  it('uses the eq filter when the row carries no key column', () => {
    const row = { voice_config: scrubbed().voice_config }
    expect(hydrateRows([row], VAULTED.courses, VAULT, 'cym_x')).toBe(2)
    expect(hydrateRows([{ voice_config: scrubbed().voice_config }], VAULTED.courses, VAULT, 'other')).toBe(0)
  })
})

describe('vaultFetch', () => {
  function fakePostgrest(calls) {
    return async (input, init = {}) => {
      const url = new URL(input)
      calls.push({ path: url.pathname, apikey: new Headers(init.headers).get('apikey') })
      if (url.pathname.endsWith('/recordist_emails')) return Response.json(VAULT)
      if (url.pathname.endsWith('/courses')) return Response.json([scrubbed()], { headers: { 'content-type': 'application/json; charset=utf-8' } })
      return Response.json([{ id: 1 }])
    }
  }
  it('hydrates a service-role read of courses, with the caller\'s own key', async () => {
    const calls = []
    const f = vaultFetch(fakePostgrest(calls), { logger: { warn() {} } })
    const res = await f('https://db.test/rest/v1/courses?select=course_code,voice_config', { headers: { apikey: 'service' } })
    const [row] = await res.json()
    expect(row.voice_config.podCast.Anna.email).toBe('anna@example.test')
    expect(calls.find((c) => c.path.endsWith('/recordist_emails')).apikey).toBe('service')
  })
  it('leaves every other table alone', async () => {
    const calls = []
    const f = vaultFetch(fakePostgrest(calls))
    await f('https://db.test/rest/v1/course_legos?select=*', { headers: { apikey: 'service' } })
    expect(calls.map((c) => c.path)).toEqual(['/rest/v1/course_legos'])
  })
})
