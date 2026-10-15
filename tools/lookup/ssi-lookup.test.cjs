// job #748: the committed read-only lookups. Every statement is lint-clean on the live door's own
// rules, keyed, bounded, and refuses bad input before anything connects.
import { describe, it, expect } from 'vitest'
import lookup from './ssi-lookup.cjs'
import agentDb from '../../services/shared/agent-db.cjs'
const { buildQueries, main, UsageError } = lookup

const U = '9bff9541-474d-4bda-b62a-824b44dc3cf7'
const NOW = new Date('2026-10-15T12:00:00Z')
const plans = [
  ['invite', ['TRK-172']],
  ['invite', ['--school', U]],
  ['events', ['--learner', U]],
  ['events', ['--user', U, '--type', 'cold_start', '--limit', '9999']],
  ['events', ['--session', U, '--since', '2026-10-15T08:00:00Z', '--until', '2026-10-15T09:00:00Z']],
  ['support', ['--thread', U]],
  ['support', ['--learner', 'abc123']],
  ['support', ['--unanswered']],
]

describe('ssi-lookup plans', () => {
  it.each(plans)('%s %j is lint-clean, keyed and bounded', (cmd, argv) => {
    const plan = buildQueries(cmd, argv, NOW)
    for (const s of plan.steps) {
      expect(agentDb.lintSql(s.text, { executable: true }).filter((f) => f.rule === 'key-cast')).toEqual([])
      expect(s.text).toMatch(/\bLIMIT \d+$/)
      expect(s.text).not.toMatch(/\bmetadata\b|\bemail\b|SELECT \*/i)
    }
  })
  it('caps the events limit and defaults the window to 24 h', () => {
    const [s] = buildQueries('events', ['--user', U, '--limit', '9999'], NOW).steps
    expect(s.text).toMatch(/LIMIT 500$/)
    expect(s.values.slice(1)).toEqual(['2026-10-14T12:00:00.000Z', '2026-10-15T12:00:00.000Z'])
  })
  it.each([
    ['events', ['--learner', 'not-a-uuid']],
    ['events', ['--learner', U, '--since', '2026-01-01T00:00:00Z']],
    ['invite', []],
    ['support', []],
    ['drop', ['table']],
  ])('%s %j is refused before connecting', async (cmd, argv) => {
    let connected = false
    await expect(main([cmd, ...argv], { connect: async () => { connected = true } })).rejects.toBeInstanceOf(UsageError)
    expect(connected).toBe(false)
  })
  it('support fetches each thread\'s messages by thread id', async () => {
    const seen = []
    const pg = { query: async (text, values) => { seen.push([text, values]); return { rows: /FROM support_threads/.test(text) ? [{ id: U }] : [{ id: 'm1' }] } }, end: async () => {} }
    let printed
    await main(['support', '--school', U], { connect: async () => pg, print: (s) => { printed = JSON.parse(s) } })
    expect(printed.messages[U]).toEqual([{ id: 'm1' }])
    expect(seen[1][1]).toEqual([U])
  })
})
