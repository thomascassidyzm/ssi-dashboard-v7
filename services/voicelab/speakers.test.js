/**
 * The clone-source planner's pure decision: which of the ticked clips actually
 * go in, and why the rest do not.
 *
 * Tested because silently using less audio than the operator ticked is the kind
 * of failure nobody notices until the clone is disappointing and nobody can say
 * why. Every dropped clip carries its own reason so the screen can say it.
 */
import { describe, it, expect } from 'vitest'
import speakers from './speakers.cjs'

const clip = (s3Key, seconds) => ({ s3Key, durationMs: seconds * 1000, seconds })

describe('planSource', () => {
  it('keeps the operator’s order — it is the order the passage is spoken in', () => {
    const { take } = speakers.planSource([clip('b', 5), clip('a', 20)])
    expect(take.map((c) => c.s3Key)).toEqual(['b', 'a'])
  })

  it('stops at the seconds ceiling and says which clip crossed it', () => {
    const { take, skipped, seconds } = speakers.planSource(
      [clip('a', 40), clip('b', 40), clip('c', 40)], { maxSeconds: 90 },
    )
    expect(take.map((c) => c.s3Key)).toEqual(['a', 'b'])
    expect(seconds).toBe(80)
    expect(skipped[0].why).toMatch(/90s ceiling/)
  })

  it('stops at the clip ceiling', () => {
    const { take, skipped } = speakers.planSource(
      [clip('a', 1), clip('b', 1), clip('c', 1)], { maxClips: 2 },
    )
    expect(take).toHaveLength(2)
    expect(skipped[0].why).toMatch(/2-clip ceiling/)
  })

  it('drops a row with no audio file rather than sending a hole to a vendor', () => {
    const { take, skipped } = speakers.planSource([{ durationMs: 9000 }, clip('a', 9)])
    expect(take.map((c) => c.s3Key)).toEqual(['a'])
    expect(skipped[0].why).toBe('no audio file')
  })

  it('takes everything when nothing bites', () => {
    const { take, seconds } = speakers.planSource([clip('a', 19), clip('b', 11)])
    expect(take).toHaveLength(2)
    expect(seconds).toBe(30)
  })
})

describe('the sample guidance the screen shows', () => {
  it('states ten seconds as the FLOOR, not a cap', () => {
    // An older note in this estate (phase2-clone-source-from-clone, 2026-08-27)
    // quotes Cartesia as capping an instant clone at ten seconds. It is wrong,
    // and the 19-second clone Tom judged good is the estate's own refutation.
    expect(speakers.SAMPLE_GUIDANCE.minSeconds).toBe(10)
    expect(speakers.SAMPLE_GUIDANCE.bestTo).toBe(60)
    expect(speakers.MAX_SOURCE_SECONDS).toBeGreaterThanOrEqual(60)
  })

  it('says a continuous take beats a stitch', () => {
    expect(speakers.SAMPLE_GUIDANCE.headline).toMatch(/continuous/i)
  })
})

describe('clipUrl', () => {
  it('points at the estate’s own mastered bucket and nothing is copied to hear it', () => {
    expect(speakers.clipUrl('mastered/X.mp3')).toContain(`${speakers.S3_BUCKET}.s3.`)
    expect(speakers.clipUrl('mastered/X.mp3')).toMatch(/mastered\/X\.mp3$/)
  })
})
