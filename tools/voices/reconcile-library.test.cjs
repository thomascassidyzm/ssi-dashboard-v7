// Job #806: the full walk reads a snapshot; its writes must only touch clips still as seen.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import lib from './reconcile-library.cjs'

const row = (id, o = {}) => ({ id, course_code: 'spa_for_eng', text: 'hola', language: 'spa', role: 'target1', voice_id: 'v1', s3_key: `k/${id}`, origin: 'tts', veracity_pass: true, ...o })

// Job #204: the full walk reads the nightly QA copy when QA_COPY_ENV names it; writes and the as-seen check stay live.
describe('the walk reads the QA copy, the writes stay live', () => {
  it('readUrl takes the copy from the env file, and falls back to live without one', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rcl-'))
    const f = path.join(dir, 'qa-copy.env')
    fs.writeFileSync(f, 'DATABASE_URL="postgres://ssi_copy@/ssi_copy_x?host=/sock&port=5433"\nQA_COPY_DB=ssi_copy_x\n')
    process.env.DATABASE_URL = 'postgres://agent@live/db'
    expect(lib.readUrl(f)).toEqual({ url: 'postgres://ssi_copy@/ssi_copy_x?host=/sock&port=5433', side: 'qa-copy' })
    expect(lib.readUrl(path.join(dir, 'absent.env'))).toEqual({ url: 'postgres://agent@live/db', side: 'live' })
  })
  it('scans course_audio and clip_index on the read connection only', async () => {
    const said = { rd: [], live: [] }
    const rd = { query: async (q) => { said.rd.push(q); return { rows: [] } }, end: async () => {} }
    const live = { query: async (q) => { said.live.push(q); return { rows: [] } } }
    const t = await lib.reconcile(live, { read: { url: 'x', side: 'qa-copy' }, openRead: async () => rd })
    expect(t.walkReads).toBe('qa-copy')
    expect(said.rd.some(q => /DECLARE ca .* FROM course_audio/.test(q))).toBe(true)
    expect(said.rd.some(q => /DECLARE ci .* FROM clip_index/.test(q))).toBe(true)
    expect(said.live.some(q => /FROM course_audio|FROM clip_index/.test(q))).toBe(false)
  })
})

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
