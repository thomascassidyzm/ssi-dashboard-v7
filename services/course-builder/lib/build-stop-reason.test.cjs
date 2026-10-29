/**
 * Job #482: how a course build ended, and what the page says about it.
 * Run: npx vitest run services/course-builder/lib/build-stop-reason.test.cjs
 */
import { describe, it, expect } from 'vitest'

const { parseUsageLimit, classifyBuildExit, describeStop } = require('./build-stop-reason.cjs')

// The exact tail of the fry_for_eng run that stopped at 294/300 on 28 Oct (Build Team log).
const FRY_LIMIT_TAIL = `I restarted the monitor after its 10-minute window ran out. As of the last report, 291 of 300 seeds were done.

You've hit your 5-hour limit · resets 1:50am (UTC)

You've hit your 5-hour limit · resets 1:50am (UTC)
`
const FRY_BG_KILL = 'Background tasks still running 10m after the last turn (subagent "fry_for_eng Opus course builder"); stopping them. Set CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 to wait indefinitely.\nThe fry_for_eng build has started.'

describe('parseUsageLimit', () => {
  it('reads the 28 Oct notice as a reset at 01:50 UTC the next morning', () => {
    const r = parseUsageLimit(FRY_LIMIT_TAIL, new Date('2026-10-28T23:32:00Z'))
    expect(r.limit).toBe('5-hour')
    expect(r.resetAt.toISOString()).toBe('2026-10-29T01:50:00.000Z')
  })
  it('a reset later the same day stays on that day', () => {
    const r = parseUsageLimit("You've hit your 5-hour limit · resets 3pm (UTC)", new Date('2026-10-29T12:00:00Z'))
    expect(r.resetAt.toISOString()).toBe('2026-10-29T15:00:00.000Z')
  })
  it('reads a dated weekly reset in a named zone', () => {
    const r = parseUsageLimit("You've hit your weekly limit · resets Nov 2, 10am (Europe/London)", new Date('2026-10-29T12:00:00Z'))
    expect(r.limit).toBe('weekly')
    expect(r.resetAt.toISOString()).toBe('2026-11-02T10:00:00.000Z') // GMT after the clocks change
  })
  it('a notice with no reset time is still a usage limit', () => {
    const r = parseUsageLimit('Claude usage limit reached.', new Date())
    expect(r).not.toBeNull()
    expect(r.resetAt).toBeNull()
  })
  it('no notice → null', () => {
    expect(parseUsageLimit('Seed 291 is in.', new Date())).toBeNull()
  })
})

describe('classifyBuildExit', () => {
  const now = new Date('2026-10-28T23:32:00Z')
  it('294/300 on a usage limit is STOPPED, never complete (the silent-complete bug)', () => {
    const r = classifyBuildExit({ logText: FRY_LIMIT_TAIL, exitCode: 1, completed: 294, total: 300, now })
    expect(r.status).toBe('stopped')
    expect(r.stop_reason).toBe('usage_limit')
    expect(r.reset_at).toBe('2026-10-29T01:50:00.000Z')
  })
  it('300/300 is complete whatever the log says', () => {
    expect(classifyBuildExit({ logText: FRY_LIMIT_TAIL, exitCode: 0, completed: 300, total: 300, now }).status).toBe('complete')
  })
  it('the CLI background-task kill is named as such', () => {
    expect(classifyBuildExit({ logText: FRY_BG_KILL, exitCode: 0, completed: 4, total: 300, now }).stop_reason).toBe('background_kill')
  })
  it('a non-zero exit with an API error is a crash, with the error as detail', () => {
    const r = classifyBuildExit({ logText: 'working…\nAPI Error: 529 overloaded_error', exitCode: 1, completed: 40, total: 300, now })
    expect(r.status).toBe('failed')
    expect(r.stop_reason).toBe('crashed')
    expect(r.detail).toMatch(/529/)
  })
  it('a clean exit short of the target is ended_early, not complete', () => {
    const r = classifyBuildExit({ logText: 'All done for now.', exitCode: 0, completed: 120, total: 300, now })
    expect(r.status).toBe('stopped')
    expect(r.stop_reason).toBe('ended_early')
  })
  it('passes with no seed target (translate, final-pass) still complete on a clean exit', () => {
    expect(classifyBuildExit({ logText: 'ok', exitCode: 0, completed: 0, total: 300, pass: 'final-pass', now }).status).toBe('complete')
  })
})

describe('describeStop — the sentence on the Course Manager page', () => {
  const now = new Date('2026-10-28T23:33:00Z')
  const job = (metadata, extra = {}) => ({ status: 'stopped', total_seeds: 300, completed_at: '2026-10-28T23:32:00Z', metadata, ...extra })
  it('usage limit with a scheduled resume names the reset time', () => {
    const msg = describeStop(job({ stop_reason: 'usage_limit', reset_at: '2026-10-29T01:50:00.000Z', auto_resume: { state: 'scheduled', at: '2026-10-29T01:51:00.000Z' } }), { completed: 294, now })
    expect(msg).toBe('Paused: usage limit reached at seed 294 of 300 — resumes automatically at 01:50 UTC tomorrow.')
  })
  it('usage limit switching account says so', () => {
    const msg = describeStop(job({ stop_reason: 'usage_limit', auto_resume: { state: 'scheduled', at: '2026-10-28T23:34:00Z', switch_account: true } }), { completed: 294, now })
    expect(msg).toMatch(/^Paused: usage limit reached on one Claude account at seed 294 of 300 — restarting on another SSi account at 23:34 UTC\.$/)
  })
  it('a human stop names who', () => {
    expect(describeStop(job({ stop_reason: 'human', stopped_by: 'kai.claude@saysomethingin.com' }), { completed: 4, now }))
      .toBe('Stopped by kai.claude@saysomethingin.com at 23:32 UTC at seed 4 of 300.')
  })
  it('done', () => {
    expect(describeStop({ status: 'complete', total_seeds: 300, metadata: { stop_reason: 'done' } }, { now })).toBe('Finished: all 300 seeds built.')
  })
})
