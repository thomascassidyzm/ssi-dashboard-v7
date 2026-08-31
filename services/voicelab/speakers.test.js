/**
 * The clone-source planner's pure decision: which of the ticked clips actually
 * go in, and why the rest do not.
 *
 * Tested because silently using less audio than the operator ticked is the kind
 * of failure nobody notices until the clone is disappointing and nobody can say
 * why. Every dropped clip carries its own reason so the screen can say it.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
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

describe('buildSource — one clip goes through untouched', () => {
  // The live-demo path. A single chosen clip must reach Cartesia byte for byte:
  // it is the fastest route (no ffmpeg process, ~8x smaller upload) and the
  // highest-fidelity one (no decode/re-encode generation lost), and it is what
  // was done to the clone Tom judged good on 2026-08-27.
  const bytes = Buffer.from('not really audio, but these exact bytes')
  const fakeFetch = async () => ({ ok: true, arrayBuffer: async () => bytes })
  const noFfmpeg = () => { throw new Error('ffmpeg must not run for a single clip') }

  it('returns the original bytes and never shells out', async () => {
    const out = await speakers.buildSource(
      [clip('mastered/A.mp3', 44)],
      { fetchImpl: fakeFetch, run: noFfmpeg },
    )
    expect(out.passthrough).toBe(true)
    expect(out.buffer.equals(bytes)).toBe(true)
    expect(out.filename).toMatch(/\.mp3$/)
    expect(out.seconds).toBe(44)
    expect(out.stitched).toBeNull()
  })

  it('still reports a source under the ten-second floor', async () => {
    const out = await speakers.buildSource([clip('mastered/A.mp3', 6)], { fetchImpl: fakeFetch, run: noFfmpeg })
    expect(out.short).toMatch(/under the 10s/)
  })

  it('refuses to invent audio when the file is not where the database says', async () => {
    const missing = async () => ({ ok: false, status: 404 })
    await expect(speakers.buildSource([clip('mastered/A.mp3', 44)], { fetchImpl: missing, run: noFfmpeg }))
      .rejects.toThrow(/not where the database says it is/)
  })

  it('joins — and says so — as soon as there are two', async () => {
    let ran = 0
    // Stands in for ffmpeg: writes the output file the real one would write, so
    // the branch is exercised without a 40 MB decode in a unit test.
    const run = async (cmd, args) => {
      ran += 1
      if (cmd === 'ffmpeg') fs.writeFileSync(args[args.length - 1], 'joined')
      return { stdout: cmd === 'ffprobe' ? '30.0' : '' }
    }
    // The join path writes real files, so it is exercised for its BRANCH here
    // and end to end elsewhere; what matters is that two clips stop being a
    // passthrough and are labelled as joined.
    const out = await speakers.buildSource(
      [clip('mastered/A.mp3', 15), clip('mastered/B.mp3', 15)],
      { fetchImpl: fakeFetch, run, tmpRoot: process.env.CS_SCRATCH || undefined },
    ).catch((e) => e)
    if (out instanceof Error) throw out
    expect(out.passthrough).toBeFalsy()
    expect(out.stitched).toMatch(/One continuous take clones better/)
    expect(ran).toBeGreaterThan(0)
  })
})
