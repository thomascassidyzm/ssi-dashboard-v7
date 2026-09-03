// The rules that keep a recorded take alive. Every one of these is a way the
// booth lost audio on 2026-09-03, or a way it could have.
import { describe, it, expect } from 'vitest'
import {
  createTakeStore, createMemoryBackend, backoffFor, BACKOFF_MS, PENDING, REFUSED,
} from './takeStore.js'

const blob = n => ({ size: n, type: 'audio/webm' })
function storeAt(clock) {
  return createTakeStore(createMemoryBackend(), { now: () => clock.t })
}

describe('takeStore — persistence rules', () => {
  it('persists a take as pending the moment it is put, before any upload', async () => {
    const clock = { t: 1000 }
    const s = storeAt(clock)
    await s.put({ voiceId: 'v1', lineId: 'L1', text: 'bore da', blob: blob(9000) })
    const pending = await s.pending('v1')
    expect(pending).toHaveLength(1)
    expect(pending[0].status).toBe(PENDING)
    expect(pending[0].attempts).toBe(0)
    expect(pending[0].blob.size).toBe(9000)
  })

  it('keeps takes for other voices out of this voice\'s queue', async () => {
    const clock = { t: 1 }
    const s = storeAt(clock)
    await s.put({ voiceId: 'human_aran_cym_n', lineId: 'L1', blob: blob(1) })
    await s.put({ voiceId: 'human_catrin_cym_n', lineId: 'L2', blob: blob(1) })
    expect(await s.pending('human_aran_cym_n')).toHaveLength(1)
    expect(await s.all(null)).toHaveLength(2)
  })

  it('supersedes an unsent take of the same line when the artist re-reads it', async () => {
    const clock = { t: 1 }
    const s = storeAt(clock)
    await s.put({ voiceId: 'v1', lineId: 'L1', blob: blob(100) })
    clock.t = 2
    await s.put({ voiceId: 'v1', lineId: 'L1', blob: blob(200) })
    const pending = await s.pending('v1')
    expect(pending).toHaveLength(1)
    expect(pending[0].blob.size).toBe(200)
  })

  it('supersedes a REFUSED take of the same line — the re-read answers the refusal', async () => {
    const clock = { t: 1 }
    const s = storeAt(clock)
    const rec = await s.put({ voiceId: 'v1', lineId: 'L1', blob: blob(100) })
    await s.markRefused(rec.id, 'That take came out silent')
    expect(await s.refused('v1')).toHaveLength(1)
    clock.t = 2
    await s.put({ voiceId: 'v1', lineId: 'L1', blob: blob(200) })
    expect(await s.refused('v1')).toHaveLength(0)
    expect(await s.pending('v1')).toHaveLength(1)
  })

  it('does not supersede a different line', async () => {
    const clock = { t: 1 }
    const s = storeAt(clock)
    await s.put({ voiceId: 'v1', lineId: 'L1', blob: blob(1) })
    await s.put({ voiceId: 'v1', lineId: 'L2', blob: blob(1) })
    expect(await s.pending('v1')).toHaveLength(2)
  })
})

describe('takeStore — there is no give-up point', () => {
  it('a transient failure keeps the bytes and never changes status', async () => {
    const clock = { t: 1000 }
    const s = storeAt(clock)
    const rec = await s.put({ voiceId: 'v1', lineId: 'L1', blob: blob(500) })
    for (let i = 0; i < 50; i++) {
      clock.t += 100000
      await s.recordFailure(rec.id, 'That take did not save (502).', () => 0.5)
    }
    const pending = await s.pending('v1')
    expect(pending).toHaveLength(1)
    expect(pending[0].status).toBe(PENDING)
    expect(pending[0].attempts).toBe(50)
    expect(pending[0].blob.size).toBe(500)
    expect(pending[0].lastError).toContain('502')
  })

  it('backs off up to a minute and then stays there for ever', async () => {
    const noJitter = () => 0.5
    expect(backoffFor(0, noJitter)).toBe(BACKOFF_MS[0])
    expect(backoffFor(3, noJitter)).toBe(BACKOFF_MS[3])
    expect(backoffFor(4, noJitter)).toBe(60000)
    expect(backoffFor(999, noJitter)).toBe(60000)
  })

  it('jitters within +/-20% and never goes below a quarter second', () => {
    expect(backoffFor(0, () => 0)).toBeGreaterThanOrEqual(250)
    expect(backoffFor(4, () => 0)).toBe(48000)
    expect(backoffFor(4, () => 1)).toBe(72000)
  })

  it('holds a failed take back until its backoff has elapsed, then offers it again', async () => {
    const clock = { t: 1000 }
    const s = storeAt(clock)
    const rec = await s.put({ voiceId: 'v1', lineId: 'L1', blob: blob(1) })
    expect((await s.nextDue('v1')).id).toBe(rec.id)
    await s.recordFailure(rec.id, 'nope', () => 0.5)
    expect(await s.nextDue('v1')).toBeNull()
    clock.t += 2000
    expect((await s.nextDue('v1')).id).toBe(rec.id)
  })

  it('drains oldest first so the session comes back in the order it was read', async () => {
    const clock = { t: 1 }
    const s = storeAt(clock)
    await s.put({ voiceId: 'v1', lineId: 'L1', blob: blob(1) }); clock.t = 2
    await s.put({ voiceId: 'v1', lineId: 'L2', blob: blob(1) }); clock.t = 3
    await s.put({ voiceId: 'v1', lineId: 'L3', blob: blob(1) }); clock.t = 4
    expect((await s.nextDue('v1')).lineId).toBe('L1')
  })
})

describe('takeStore — audio is deleted on confirmation or refusal, never otherwise', () => {
  it('confirm is the only thing that removes a pending take', async () => {
    const clock = { t: 1 }
    const s = storeAt(clock)
    const rec = await s.put({ voiceId: 'v1', lineId: 'L1', blob: blob(1) })
    await s.confirm(rec.id)
    expect(await s.all('v1')).toHaveLength(0)
  })

  it('a 4xx refusal KEEPS the take, with the server\'s own words attached', async () => {
    const clock = { t: 1 }
    const s = storeAt(clock)
    const rec = await s.put({ voiceId: 'v1', lineId: 'L1', blob: blob(1) })
    await s.markRefused(rec.id, 'We do not know that line.')
    const [kept] = await s.refused('v1')
    expect(kept.status).toBe(REFUSED)
    expect(kept.lastError).toBe('We do not know that line.')
    expect(kept.blob).toBeTruthy()
    expect(await s.nextDue('v1')).toBeNull()   // and it is never retried
  })

  it('reports old unsent takes rather than sweeping them — audio that never reached the server is not ours to delete', async () => {
    const clock = { t: 0 }
    const s = storeAt(clock)
    await s.put({ voiceId: 'v1', lineId: 'L1', blob: blob(1) })
    clock.t = 40 * 24 * 60 * 60 * 1000
    await s.put({ voiceId: 'v1', lineId: 'L2', blob: blob(1) })
    const stale = await s.stale('v1')
    expect(stale.map(r => r.lineId)).toEqual(['L1'])
    expect(await s.pending('v1')).toHaveLength(2)   // still there, both of them
  })
})

describe('takeStore — degrading honestly', () => {
  it('reports available:false when the backend is not durable', async () => {
    const mem = createMemoryBackend()
    mem.available = false
    const s = createTakeStore(mem)
    expect(s.available).toBe(false)
    // and still accepts the take — never fail the capture itself
    await s.put({ voiceId: 'v1', lineId: 'L1', blob: blob(1) })
    expect(await s.pending('v1')).toHaveLength(1)
  })
})
