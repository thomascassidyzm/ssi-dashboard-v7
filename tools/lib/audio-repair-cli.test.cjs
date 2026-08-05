/**
 * Tests for the CLI's own decisions — target parsing, worklist planning,
 * before-state drift assertions, log paths. The repair logic itself is tested
 * in services/audio-repair-core.test.cjs and is not re-tested here.
 *
 *   npx vitest run tools/lib/audio-repair-cli
 */
import { describe, it, expect } from 'vitest'
const {
  parseTargets, planTargets, expectationFrom, driftBetween, assertNoDrift,
  costEstimate, logPath, parseArgv, DriftError,
} = require('./audio-repair-cli.cjs')

describe('parseTargets', () => {
  it('reads a bare id list', () => {
    expect(parseTargets(['a', 'b'])).toEqual([
      { id: 'a', role: null, text: null, durationMs: null, verdict: null },
      { id: 'b', role: null, text: null, durationMs: null, verdict: null },
    ])
  })

  it('reads the audio-batch-gate --out shape', () => {
    const out = parseTargets([{ id: 'x', role: 'presentation', text: 'hi', duration_ms: 900, verdict: 'confirmed' }])
    expect(out[0]).toEqual({ id: 'x', role: 'presentation', text: 'hi', durationMs: 900, verdict: 'confirmed' })
  })

  it('reads a queue dump, whose key is audioId not id', () => {
    const out = parseTargets({ items: [{ audioId: 'q1', role: 'lego', text: 'yo', durationMs: 120 }] })
    expect(out[0].id).toBe('q1')
    expect(out[0].durationMs).toBe(120)
  })

  it('reads { ids: [...] }', () => {
    expect(parseTargets({ ids: ['z'] })[0].id).toBe('z')
  })

  it('refuses an object with no recognised array rather than guessing', () => {
    expect(() => parseTargets({ nope: 1 })).toThrow(/no items\[\]/)
  })

  it('refuses an entry with no id', () => {
    expect(() => parseTargets([{ role: 'lego' }])).toThrow(/no id/)
  })
})

describe('planTargets', () => {
  const targets = parseTargets([
    { id: 'p1', role: 'presentation', verdict: 'confirmed', text: 'aaa' },
    { id: 'l1', role: 'lego', verdict: 'suspect', text: 'bb' },
    { id: 'p2', role: 'presentation', verdict: 'suspect', text: 'c' },
  ])

  it('does NOT refuse presentation clips — same-id swap deletes nothing', () => {
    const { jobs, skipped } = planTargets(targets)
    expect(jobs.map(j => j.id)).toEqual(['p1', 'l1', 'p2'])
    expect(skipped).toEqual([])
  })

  it('filters by role', () => {
    const { jobs, skipped } = planTargets(targets, { role: 'presentation' })
    expect(jobs.map(j => j.id)).toEqual(['p1', 'p2'])
    expect(skipped).toEqual([{ id: 'l1', why: 'role=lego, not presentation' }])
  })

  it('filters by verdict', () => {
    const { jobs } = planTargets(targets, { only: 'confirmed' })
    expect(jobs.map(j => j.id)).toEqual(['p1'])
  })

  it('reports what --limit dropped instead of truncating silently', () => {
    const { jobs, skipped } = planTargets(targets, { limit: 1 })
    expect(jobs.map(j => j.id)).toEqual(['p1'])
    expect(skipped.map(s => s.why)).toEqual(['beyond --limit 1', 'beyond --limit 1'])
  })

  it('drops duplicates once, loudly', () => {
    const { jobs, skipped } = planTargets(parseTargets(['a', 'a']))
    expect(jobs).toHaveLength(1)
    expect(skipped[0].why).toMatch(/duplicate/)
  })

  it('honours --skip', () => {
    const { jobs, skipped } = planTargets(targets, { skipIds: ['p1'] })
    expect(jobs.map(j => j.id)).toEqual(['l1', 'p2'])
    expect(skipped[0].why).toMatch(/--skip/)
  })
})

describe('before-state drift', () => {
  const current = {
    id: 'A', s3Key: 'mastered/OLD.mp3', revision: 1, durationMs: 3000,
    text: 'the german for', role: 'presentation',
  }

  it('passes when nothing moved', () => {
    expect(assertNoDrift(expectationFrom(current), current)).toBe(true)
  })

  it('catches a revision bump — someone else already repaired it', () => {
    const moved = driftBetween(expectationFrom(current), { ...current, revision: 2, s3Key: 'mastered/NEW.mp3' })
    expect(moved.map(m => m.field).sort()).toEqual(['revision', 's3Key'])
  })

  it('throws a DriftError naming the clip and every field that moved', () => {
    try {
      assertNoDrift(expectationFrom(current), { ...current, durationMs: 4000 })
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(DriftError)
      expect(e.audioId).toBe('A')
      expect(e.moved).toEqual([{ field: 'durationMs', expected: 3000, actual: 4000 }])
      expect(e.message).toMatch(/durationMs 3000 -> 4000/)
    }
  })

  it('catches a text change, which under same-id swap should be impossible', () => {
    const moved = driftBetween(expectationFrom(current), { ...current, text: 'something else' })
    expect(moved).toHaveLength(1)
    expect(moved[0].field).toBe('text')
  })

  it('treats a missing revision as 1 on both sides, not as drift', () => {
    const exp = expectationFrom({ ...current, revision: undefined })
    expect(driftBetween(exp, { ...current, revision: null })).toEqual([])
  })

  it('does not check fields the expectation never recorded', () => {
    expect(driftBetween({ id: 'A' }, current)).toEqual([])
  })

  it('refuses to record an expectation from nothing', () => {
    expect(() => expectationFrom(null)).toThrow(/expectation from nothing/)
  })
})

describe('costEstimate', () => {
  it('counts characters when the target file carries text', () => {
    expect(costEstimate([{ text: 'abc' }, { text: 'de' }])).toEqual({ clips: 2, characters: 5, charactersKnown: true })
  })

  it('says so when it cannot know the character count', () => {
    expect(costEstimate([{ text: null }]).charactersKnown).toBe(false)
  })
})

describe('logPath', () => {
  it('keeps dry-run and applied logs at distinct filenames', () => {
    const dry = logPath({ course: 'deu_for_eng', verb: 'propose', dryRun: true, count: 6 })
    const live = logPath({ course: 'deu_for_eng', verb: 'propose', dryRun: false, count: 6 })
    expect(dry).toMatch(/-dryrun-log\.json$/)
    expect(live).toMatch(/-applied-log\.json$/)
    expect(dry).not.toBe(live)
  })
})

describe('parseArgv', () => {
  it('splits positionals, valued flags and boolean flags', () => {
    const { flags, positional } = parseArgv(['propose', 'deu_for_eng', '--targets', '/tmp/q.json', '--spend', '--limit', '3'])
    expect(positional).toEqual(['propose', 'deu_for_eng'])
    expect(flags).toEqual({ targets: '/tmp/q.json', spend: true, limit: '3' })
  })

  it('treats a flag followed by another flag as boolean', () => {
    expect(parseArgv(['--dry', '--actor', 'tom']).flags).toEqual({ dry: true, actor: 'tom' })
  })
})
