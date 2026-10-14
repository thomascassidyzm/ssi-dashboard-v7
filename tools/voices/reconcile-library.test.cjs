// Job #806: the full walk reads a snapshot; its writes must only touch clips still as seen.
import { describe, it, expect } from 'vitest'
import lib from './reconcile-library.cjs'

const row = (id, o = {}) => ({ id, course_code: 'spa_for_eng', text: 'hola', language: 'spa', role: 'target1', voice_id: 'v1', s3_key: `k/${id}`, origin: 'tts', veracity_pass: true, ...o })

describe('stillAsSeen', () => {
  it('keeps unchanged clips, drops a clip whose words changed and one that was deleted', async () => {
    const seen = [row('a'), row('b'), row('c')]
    const live = [row('a'), row('b', { text: 'adiós' })] // c deleted
    const client = { query: async () => ({ rows: live }) }
    const ok = await lib.stillAsSeen(client, ['a', 'b', 'c'], seen)
    expect([...ok]).toEqual(['a'])
  })
  it('asks nothing when there is nothing to write', async () => {
    let asked = false
    const ok = await lib.stillAsSeen({ query: async () => { asked = true; return { rows: [] } } }, [], [])
    expect(ok.size).toBe(0)
    expect(asked).toBe(false)
  })
  it('inside the write transaction it locks what it passes (FOR SHARE, fixed order), so nothing changes before the write', async () => {
    let sql = ''
    const client = { query: async (q) => { sql = q; return { rows: [row('a')] } } }
    const ok = await lib.stillAsSeen(client, ['a'], [row('a')], { lock: true })
    expect([...ok]).toEqual(['a'])
    expect(sql).toMatch(/ORDER BY id FOR SHARE$/)
  })
})
