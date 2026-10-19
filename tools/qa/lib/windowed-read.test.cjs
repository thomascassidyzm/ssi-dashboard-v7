/*
 * A scope too big for the 5 s cap must still be counted COMPLETELY, in smaller statements, never by
 * lifting the cap. Run: npx vitest run tools/qa/lib/windowed-read.test.cjs
 */
import { describe, it, expect } from 'vitest'

const { windowedRead } = require('./windowed-read.cjs')
const timeout = () => Object.assign(new Error('canceling statement due to statement timeout'), { code: '57014' })

// A fake table of seed_numbers; a statement "times out" when it would touch more than `cap` rows.
function fake(seeds, cap) {
  const calls = []
  const run = async (pred) => {
    calls.push(pred)
    let rows = seeds
    if (pred) {
      const m = pred.match(/>= (-?\d+) and seed_number < (-?\d+)/)
      rows = pred.includes('is null') ? seeds.filter((s) => s === null) : seeds.filter((s) => s !== null && s >= +m[1] && s < +m[2])
    }
    if (rows.length > cap) throw timeout()
    return rows.length
  }
  return { run, calls }
}

describe('windowedRead', () => {
  it('runs one statement when the scope fits', async () => {
    const { run, calls } = fake([1, 2, 3], 10)
    expect(await windowedRead(run, { column: 'seed_number' })).toEqual([3])
    expect(calls).toEqual([null])
  })
  it('windows a scope that times out whole and loses no row (null seeds included)', async () => {
    const seeds = [null, null, ...Array.from({ length: 900 }, (_, i) => 1 + (i % 600))]
    const { run, calls } = fake(seeds, 60)
    const parts = await windowedRead(run, { column: 'seed_number' })
    expect(parts.reduce((a, b) => a + b, 0)).toBe(seeds.length)
    expect(calls[0]).toBe(null)
    expect(calls.length).toBeGreaterThan(5)
  })
  it('bisects a window that is still too big, and fails loudly when one seed alone is too big', async () => {
    const seeds = Array.from({ length: 40 }, () => 7)
    const ok = fake(seeds, 40)
    expect((await windowedRead(ok.run, { column: 'seed_number' })).reduce((a, b) => a + b, 0)).toBe(40)
    const tooSmall = fake(seeds, 10)
    await expect(windowedRead(tooSmall.run, { column: 'seed_number' })).rejects.toMatchObject({ code: '57014' })
  })
  it('remembers a scope that timed out whole and skips the doomed first try', async () => {
    const memo = new Set()
    const seeds = Array.from({ length: 200 }, (_, i) => 1 + i)
    const a = fake(seeds, 30); await windowedRead(a.run, { column: 'seed_number', memo, key: 'c' })
    const b = fake(seeds, 30); await windowedRead(b.run, { column: 'seed_number', memo, key: 'c' })
    expect(a.calls[0]).toBe(null)
    expect(b.calls[0]).not.toBe(null)
  })
  it('does not window when the shape has no window column', async () => {
    await expect(windowedRead(async () => { throw timeout() }, { column: null })).rejects.toMatchObject({ code: '57014' })
  })
  it('re-throws anything that is not a timeout untouched', async () => {
    await expect(windowedRead(async () => { throw Object.assign(new Error('boom'), { code: '42P01' }) }, { column: 'seed_number' })).rejects.toThrow('boom')
  })
})

describe('batchedRead', () => {
  const { batchedRead } = require('./windowed-read.cjs')
  it('pays one statement per batch, halves a cancelled batch, and hands a lone scope to the fallback', async () => {
    const items = Array.from({ length: 20 }, (_, i) => i)
    const calls = []
    const run = async (batch) => { calls.push(batch.length); if (batch.includes(3)) throw timeout(); return batch.length }
    const single = async (i) => [`single:${i}`]
    const out = await batchedRead(items, run, single, { size: 16 })
    expect(out).toContain('single:3')
    expect(out).toContain('single:2')
    const counted = out.filter((x) => typeof x === 'number').reduce((a, b) => a + b, 0)
    expect(counted + out.filter((x) => typeof x === 'string').length).toBe(20) // every item exactly once: in a batch result or handed to the fallback
    expect(calls[0]).toBe(16)
  })
  it('re-throws a non-timeout error', async () => {
    await expect(batchedRead([1, 2], async () => { throw new Error('boom') }, async () => [])).rejects.toThrow('boom')
  })
})

describe('batchedRead learns its batch size', () => {
  const { batchedRead } = require('./windowed-read.cjs')
  it('does not repeat a cancelled batch size, and shares what it learned through `state`', async () => {
    const items = Array.from({ length: 64 }, (_, i) => i)
    const state = { size: 16 }
    const calls = []
    // any batch over 4 items is "too big for the cap"
    const run = async (batch) => { calls.push(batch.length); if (batch.length > 4) throw timeout(); return batch.length }
    await batchedRead(items, run, async () => ['s'], { state })
    const cancelled = calls.filter((n) => n > 4).length
    expect(cancelled).toBeLessThanOrEqual(6) // 16 -> 8 -> 4, probing upward only below sizes that already cost a cancel
    expect(state.size).toBeLessThanOrEqual(4)
    const second = []
    await batchedRead(items, async (b) => { second.push(b.length); return 1 }, async () => ['s'], { state })
    expect(second[0]).toBeLessThanOrEqual(4) // the next branch starts at the learned size, not at 16
  })
})

describe('windowedRead with a max-seed hint', () => {
  const { baseWindows } = require('./windowed-read.cjs')
  it('stops its fixed windows at the hint but still covers everything above it', () => {
    const w = baseWindows(120)
    expect(w.length).toBeLessThan(baseWindows().length)
    const spans = w.filter((x) => !x.nulls)
    expect(spans[0].lo).toBe(-1e9)
    for (let i = 1; i < spans.length; i++) expect(spans[i].lo).toBe(spans[i - 1].hi) // contiguous: no seed can fall between windows
    expect(spans.at(-1).hi).toBe(1e9)
  })
})
