// job #748: the committed read-only lookups. Every statement is lint-clean on the live door's own
// rules, keyed, bounded, and refuses bad input before anything connects.
import { describe, it, expect } from 'vitest'
import lookup from './ssi-lookup.cjs'
import agentDb from '../../services/shared/agent-db.cjs'
const { buildQueries, main, UsageError } = lookup

const U = '9bff9541-474d-4bda-b62a-824b44dc3cf7'
const DAYMS = 86400e3
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

  describe('learner --email (job #889)', () => {
    const EM = 'Louise240501@AOL.com'
    it('lower-cases the VALUE, is lint-clean, read-only, bounded and returns no email column', () => {
      const plan = buildQueries('learner', ['--email', ` ${EM} `], NOW)
      expect(plan.steps[0].values).toEqual(['louise240501@aol.com'])
      for (const s of [...plan.steps, ...plan.names]) {
        expect(agentDb.lintSql(s.text, { executable: true }).filter((f) => f.rule === 'key-cast')).toEqual([])
        expect(s.text).toMatch(/\bLIMIT \d+$/)
        expect(s.text).toMatch(/^SELECT /)
        expect(s.text).not.toMatch(/\b(insert|update|delete)\b|SELECT \*|metadata|payload|display_name|password|phone/i)
        expect(s.text).not.toMatch(/SELECT [^;]*\b(verified_emails|email|email_normalized)\b[^;]*FROM/i)
      }
      expect(plan.steps[0].text).toMatch(/verified_emails @> ARRAY/)
      expect(() => buildQueries('learner', ['--email', 'nope'], NOW)).toThrow(UsageError)
    })
    const mk = (rows) => ({ seen: [], query: async function (text) { this.seen.push(text); const k = Object.keys(rows).find((n) => text.includes(n)); return { rows: rows[k] || [] } }, end: async () => {} })
    it('no account is a clear answer, not an error', async () => {
      const pg = mk({})
      let out
      await main(['learner', '--email', EM], { connect: async () => pg, print: (s) => { out = JSON.parse(s) } })
      expect(out).toMatchObject({ account: false, query: 'louise240501@aol.com', summary: 'No account for that email.' })
      expect(pg.seen).toHaveLength(2)
    })
    it('summarises an existing account: subscription as the app computes it, trial lease, names only', async () => {
      const future = new Date(Date.now() + 5 * DAYMS).toISOString()
      const pg = mk({
        'FROM learners': [{ id: U, user_id: U, created_at: '2026-01-01T00:00:00Z', educational_role: null, platform_role: null }],
        'FROM subscriptions': [{ status: 'active', plan_name: 'SSi Premium', current_period_end: '2020-01-01T00:00:00Z' }],
        'FROM offline_leases': [{ course_code: 'spa_for_eng', is_trial: true, expires_at: future, revoked_at: null }],
        'FROM user_tags': [{ tag_type: 'class', tag_value: `CLASS:${U}`, role_in_context: 'student' }],
        'FROM classes': [{ id: U, class_name: 'Y9 Spanish', course_code: 'spa_for_eng', school_name: 'Ysgol X' }],
        'FROM player_events WHERE user_id = $1::uuid ORDER': [{ occurred_at: '2026-10-29T10:00:00Z', event_type: 'x', course_code: 'spa_for_eng' }],
      })
      let out
      await main(['learner', '--email', EM], { connect: async () => pg, print: (s) => { out = JSON.parse(s) } })
      expect(out.account).toBe(true)
      expect(out.subscription.active).toBe(false) // period ended in 2020: active status alone is not access
      expect(out.status).toBe('free trial (offline-lease taste)')
      expect(out.memberships).toEqual([{ type: 'class', name: 'Y9 Spanish', school: 'Ysgol X', course_code: 'spa_for_eng', role: 'student' }])
      expect(out.activity.last.course_code).toBe('spa_for_eng')
      expect(JSON.stringify(out)).not.toMatch(/aol\.com.*aol\.com/)
    })
  })
})
