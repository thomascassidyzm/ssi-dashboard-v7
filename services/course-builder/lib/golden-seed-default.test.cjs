/**
 * golden-seed-default.test.cjs — the golden-seed default (10) lives in ONE
 * place: lib/language-config.cjs getGoldenSeedCount. Every other module that
 * needs it calls that function. Commit 10c2f3906 pulled the course-builder
 * routes onto it; this test keeps the number from being restated again in
 * the agent spawner, the calibration route or the briefs module.
 *
 * Run: npx vitest run services/course-builder/lib/golden-seed-default
 */
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const path = require('path')

const { getGoldenSeedCount } = require('./language-config.cjs')
const briefsShared = require('../../briefs/shared.cjs')

describe('golden-seed default', () => {
  it('is 10 when the course row says nothing, from the one lib function', () => {
    expect(getGoldenSeedCount(undefined)).toBe(10)
    expect(getGoldenSeedCount({})).toBe(10)
    expect(getGoldenSeedCount({ quality_rules: { golden_seed_count: 25 } })).toBe(25)
  })

  it('briefs/shared re-exports the lib function rather than its own copy', () => {
    expect(briefsShared.getGoldenSeedCount).toBe(getGoldenSeedCount)
  })

  it('no other live file restates golden_seed_count || <number>', () => {
    const roots = [
      path.join(__dirname, '..'),           // services/course-builder
      path.join(__dirname, '..', '..', 'briefs'),
    ]
    const offenders = []
    const walk = (dir) => {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name)
        if (name === 'deprecated' || name === 'node_modules') continue
        if (fs.statSync(full).isDirectory()) { walk(full); continue }
        if (!name.endsWith('.cjs') || name.endsWith('.test.cjs')) continue
        if (full === require.resolve('./language-config.cjs')) continue
        const src = fs.readFileSync(full, 'utf8')
        if (/golden_seed_count\s*\|\|\s*\d+/.test(src)) offenders.push(path.relative(process.cwd(), full))
      }
    }
    roots.forEach(walk)
    expect(offenders).toEqual([])
  })
})
