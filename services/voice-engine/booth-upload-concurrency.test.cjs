// The server half of Phase 1 (job #221): the no-deploy switch and the line lock.
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { createConcurrencySetting, createKeyedLock, lineLockKey, RELOAD_MS } = require('./booth-upload-concurrency.cjs')

describe('the ceiling the server advertises', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'booth-upload-'))
  const file = path.join(dir, 'knob')

  it('defaults to 2 with no file, and BOOTH_UPLOAD_CONCURRENCY sets the default', () => {
    expect(createConcurrencySetting({ file, env: {} }).current()).toBe(2)
    expect(createConcurrencySetting({ file, env: { BOOTH_UPLOAD_CONCURRENCY: '1' } }).current()).toBe(1)
  })

  it('the file sets it back to 1 without a restart, re-read within RELOAD_MS', () => {
    let t = 0
    const s = createConcurrencySetting({ file, env: {}, now: () => t })
    expect(s.current()).toBe(2)
    fs.writeFileSync(file, '1\n')
    expect(s.current()).toBe(2)          // cached
    t += RELOAD_MS
    expect(s.current()).toBe(1)          // picked up, no restart
    fs.unlinkSync(file)
    t += RELOAD_MS
    expect(s.current()).toBe(2)
  })

  it('clamps nonsense: 0 → 1, 9 → 2, garbage → default', () => {
    for (const [v, want] of [['0', 1], ['9', 2], ['two', 2], ['', 2]]) {
      fs.writeFileSync(file, v)
      expect(createConcurrencySetting({ file, env: {} }).current()).toBe(want)
    }
    fs.unlinkSync(file)
  })

  it('advertise never throws, even once headers are sent', () => {
    const s = createConcurrencySetting({ file, env: {} })
    const seen = {}
    s.advertise({ set: (k, v) => { seen[k] = v } })
    expect(seen['X-Booth-Upload-Concurrency']).toBe('2')
    expect(() => s.advertise({ set: () => { throw new Error('sent') } })).not.toThrow()
  })
})

describe('the line lock', () => {
  it('same key: FIFO, one at a time; different keys: together', async () => {
    const lock = createKeyedLock()
    const order = []
    const r1 = await lock.acquire('a')
    let got2 = false
    const p2 = lock.acquire('a').then((r) => { got2 = true; order.push('a2'); return r })
    const r3 = await lock.acquire('b') // not blocked by 'a'
    order.push('b')
    await new Promise((r) => setTimeout(r, 10))
    expect(got2).toBe(false)
    order.push('a1 done'); r1()
    const r2 = await p2
    expect(order).toEqual(['b', 'a1 done', 'a2'])
    r2(); r3()
    expect(lock.size).toBe(0)
  })

  it('a wait never passes the cap: past it the take proceeds', async () => {
    let timedOut = null
    const lock = createKeyedLock({ waitCapMs: 20, onTimeout: (k) => { timedOut = k } })
    await lock.acquire('a') // never released
    const t0 = Date.now()
    const r = await lock.acquire('a')
    expect(Date.now() - t0).toBeGreaterThanOrEqual(15)
    expect(timedOut).toBe('a')
    r()
  })

  it('same words are one key whatever the line or the punctuation; different voices are not', () => {
    const a = lineLockKey({ voiceId: 'v', lineId: 'seed:1:target1', text: 'Dw i’n hoffi coffi.' })
    const b = lineLockKey({ voiceId: 'v', lineId: 'lego:2:target1', text: 'dw in hoffi  coffi' })
    expect(a).toBe(b)
    expect(lineLockKey({ voiceId: 'w', lineId: 'x', text: 'dw in hoffi coffi' })).not.toBe(a)
    expect(lineLockKey({ voiceId: 'v', lineId: 'p1' })).toBe('v|line:p1')
  })
})
