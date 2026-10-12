// Lane review #874 (job #813): the combined daily cap raise must expire. hold.combinedDailyCapChars is the 1M baseline; the 3M figure lives in a signed, dated hold.raise.
import { describe, it, expect } from 'vitest'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { createRequire } from 'module'
const g = createRequire(import.meta.url)('./tts-spend-guard.cjs')
const __dirname = path.dirname(new URL(import.meta.url).pathname)
const budgetPath = path.join(__dirname, '../../ops/tts-spend-budgets.json')
const at = iso => g.loadLimits({ budgetPath, nowMs: Date.parse(iso) })
describe('combined daily cap raise (lane review #874)', () => {
  it('3,000,000 while the signed raise is in force, back to the 1,000,000 baseline from its until instant', () => {
    expect(at('2026-10-12T12:00:00Z').hold.combinedDailyCapChars).toBe(3000000)
    expect(at('2026-10-22T23:59:59Z').hold.combinedDailyCapChars).toBe(3000000)
    expect(at('2026-10-23T00:00:01Z').hold.combinedDailyCapChars).toBe(1000000)
  })
  it('an unsigned raise is ignored: the baseline holds', () => {
    const f = path.join(os.tmpdir(), `budgets-${process.pid}.json`)
    const d = JSON.parse(fs.readFileSync(budgetPath, 'utf8')); delete d.hold.raise.by; fs.writeFileSync(f, JSON.stringify(d))
    expect(g.loadLimits({ budgetPath: f, nowMs: Date.parse('2026-10-12T12:00:00Z') }).hold.combinedDailyCapChars).toBe(1000000)
    fs.unlinkSync(f)
  })
})
