/**
 * Unit tests for the tail-truncation scan job store (no DB, no S3, no ffmpeg,
 * no spend — the repair core is injected as a double).
 * Run: npx vitest run services/audio-tail-scan
 *
 * These hold the claims the design is sold on, none of which are observable
 * from the happy path:
 *   - the scan NEVER writes: the injected core is asked for `queue` and
 *     `seedScopedAudioIds` and for nothing else;
 *   - a run is a job — start returns before the work finishes, and progress is
 *     readable while it runs;
 *   - the two detectors are counted separately and never merged;
 *   - a truncated report SAYS it is truncated;
 *   - a lost job (restart) is a distinguishable 404, not a failure;
 *   - the gate seam produces audio_clip_flags-shaped rows and inserts nothing.
 */

import { describe, it, expect } from 'vitest'

const { createTailScanStore, categoriesOf } = require('./audio-tail-scan.cjs')
const { TAIL_DETECTOR } = require('./audio-repair-core.cjs')

/** A clip as `repair.queue` returns it. */
function item (audioId, { tail = false, duration = false, voiceId = 'eve', fallRate = 0.9 } = {}) {
  return {
    audioId,
    text: `clip ${audioId}`,
    role: 'target1',
    voiceId,
    language: 'deu',
    durationMs: 1176,
    revision: 1,
    legoId: 'deu_for_eng:S0001L01',
    pendingCandidateId: null,
    detector: { flagged: duration, reason: duration ? 'shorter than its text implies' : null, score: duration ? 0.6 : 1.1 },
    tail: tail
      ? {
          flagged: true, score: -fallRate, category: 'tail-truncation',
          reason: 'the shape of a trim, not an ending',
          steep: true, padded: true,
          shape: { fallRate, zeroPadPct: 99.4, fallMs: 21, durMs: 1176, speechMs: 936 },
        }
      : undefined,
  }
}

function makeCore ({ items = [], onQueue = null, seedIds = ['a1', 'a2'] } = {}) {
  const calls = []
  return {
    calls,
    seedScopedAudioIds: async (args) => { calls.push({ name: 'seedScopedAudioIds', args }); return seedIds },
    queue: async (args) => {
      calls.push({ name: 'queue', args })
      if (onQueue) await onQueue(args)
      const tail = items.filter(i => i.tail && i.tail.flagged)
      return {
        courseCode: args.courseCode,
        detector: { name: 'duration-vs-expected', precision: null },
        tailDetector: TAIL_DETECTOR,
        total: items.length,
        flaggedByDuration: items.filter(i => i.detector.flagged).length,
        flaggedByTail: tail.length,
        measured: 120,
        tailMeasureFailures: 2,
        excludedUnrendered: 7,
        tailByVoice: { eve: { measured: 100, flagged: tail.length, failed: 2, flagRate: 0.02 } },
        items: items.slice(0, args.limit),
      }
    },
  }
}

const store = (core, opts = {}) => createTailScanStore({
  core, logger: { log () {}, warn () {}, error () {} }, ...opts,
})

describe('tail scan — it is a job, and it only reads', () => {
  it('start returns immediately and the job finishes afterwards', async () => {
    let release
    const gate = new Promise(r => { release = r })
    const core = makeCore({ items: [item('a1', { tail: true })], onQueue: () => gate })
    const s = store(core)

    const job = s.start({ courseCode: 'deu_for_eng', actor: 'tom@saysomethingin.com' })
    expect(s.get(job.id).status).toBe('running')
    // No report exists yet, and asking for one says so rather than returning empty.
    expect(() => s.report(job.id)).toThrow(/no report yet/)

    release()
    await job.promise
    expect(s.get(job.id).status).toBe('done')
  })

  it('asks the core for exactly two things — a read and a read', async () => {
    const core = makeCore({ items: [item('a1', { tail: true })] })
    const s = store(core)
    const job = s.start({ courseCode: 'deu_for_eng', maxSeedNumber: 2 })
    await job.promise
    expect(core.calls.map(c => c.name)).toEqual(['seedScopedAudioIds', 'queue'])
    const q = core.calls.find(c => c.name === 'queue').args
    expect(q.tails).toBe(true)
    expect(q.audioIds).toEqual(['a1', 'a2'])
  })

  it('a whole-course scan passes no audioIds — seed scoping is opt-in', async () => {
    const core = makeCore({ items: [] })
    const s = store(core)
    await s.start({ courseCode: 'deu_for_eng' }).promise
    expect(core.calls.find(c => c.name === 'seedScopedAudioIds')).toBeUndefined()
    expect(core.calls.find(c => c.name === 'queue').args.audioIds).toBeNull()
  })

  it('refuses a second concurrent scan of the same course', async () => {
    let release
    const gate = new Promise(r => { release = r })
    const s = store(makeCore({ onQueue: () => gate }))
    const job = s.start({ courseCode: 'deu_for_eng' })
    expect(() => s.start({ courseCode: 'deu_for_eng' })).toThrow(/already running/)
    // A different course is unaffected.
    expect(() => s.start({ courseCode: 'fra_for_eng' })).not.toThrow()
    release()
    await job.promise
  })

  it('reports progress while it runs, and total is null until it is known', async () => {
    let seen = null
    let release
    const gate = new Promise(r => { release = r })
    const core = makeCore({
      onQueue: async (args) => {
        args.onProgress(250, 4000)
        seen = 'reported'
        await gate
      },
    })
    const s = store(core)
    const job = s.start({ courseCode: 'deu_for_eng' })
    await new Promise(r => setImmediate(r))
    expect(seen).toBe('reported')
    expect(s.get(job.id).progress).toEqual({ phase: 'measuring', done: 250, total: 4000 })
    release()
    await job.promise
  })

  it('a core failure fails the job rather than throwing into the caller', async () => {
    const core = makeCore({})
    core.queue = async () => { throw new Error('S3 said no') }
    const s = store(core)
    const job = s.start({ courseCode: 'deu_for_eng' })
    await job.promise
    expect(s.get(job.id).status).toBe('failed')
    expect(s.get(job.id).error).toBe('S3 said no')
  })
})

describe('tail scan — what the report says', () => {
  const items = [
    item('a1', { tail: true, fallRate: 1.4 }),
    item('a2', { tail: true, duration: true, voiceId: 'ara', fallRate: 0.8 }),
    item('a3', { duration: true }),
  ]

  it('counts the two detectors separately and never adds them together', async () => {
    const s = store(makeCore({ items }))
    const job = s.start({ courseCode: 'deu_for_eng' })
    await job.promise
    const { totals } = s.get(job.id)
    expect(totals.flaggedByTail).toBe(2)
    expect(totals.flaggedByDuration).toBe(2)
    expect(totals.flagged).toBe(3)
    expect(totals.flagged).not.toBe(totals.flaggedByTail + totals.flaggedByDuration)
  })

  it('carries the per-voice flag rate — the calibration read-out — on every payload', async () => {
    const s = store(makeCore({ items }))
    const job = s.start({ courseCode: 'deu_for_eng' })
    await job.promise
    expect(s.get(job.id).tailByVoice.eve.flagRate).toBe(0.02)
    expect(s.list('deu_for_eng').jobs[0].tailByVoice).toBeTruthy()
  })

  it('every payload states what a flag means — a trim, 4 in 20 harmless, never a verdict', async () => {
    const s = store(makeCore({ items }))
    const job = s.start({ courseCode: 'deu_for_eng' })
    await job.promise
    for (const payload of [s.get(job.id), s.report(job.id), s.list('deu_for_eng')]) {
      expect(payload.flagMeaning.headline).toMatch(/TRIMMED/)
      expect(payload.flagMeaning.precision).toMatch(/4 were trimmed/)
      expect(payload.flagMeaning.authority).toMatch(/never|Nothing here passes/)
    }
    expect(s.get(job.id).detector.precision).toBe(0.8)
  })

  it('filters by category and by voice, and never merges the two categories', async () => {
    const s = store(makeCore({ items }))
    const job = s.start({ courseCode: 'deu_for_eng' })
    await job.promise
    expect(s.report(job.id, { category: 'tail-truncation' }).matched).toBe(2)
    expect(s.report(job.id, { category: 'duration' }).matched).toBe(2)
    expect(s.report(job.id, { category: 'all' }).matched).toBe(3)
    expect(s.report(job.id, { voiceId: 'ara' }).matched).toBe(1)
    expect(categoriesOf(items[1])).toEqual(['tail-truncation', 'duration'])
  })

  it('says when the report is truncated rather than stopping silently', async () => {
    const core = makeCore({ items })
    // The queue kept far more than it returned — exactly the shape of a
    // whole-course sweep, where a silent cap reads as "that is all of them".
    const inner = core.queue
    core.queue = async (args) => ({ ...(await inner(args)), total: 9000 })
    const s = store(core)
    const job = s.start({ courseCode: 'deu_for_eng' })
    await job.promise
    const { totals } = s.get(job.id)
    expect(totals.reported).toBe(3)
    expect(totals.truncated).toBe(8997)
  })

  it('names the clips it could not measure and the slots that were never rendered', async () => {
    const s = store(makeCore({ items }))
    const job = s.start({ courseCode: 'deu_for_eng' })
    await job.promise
    const { totals } = s.get(job.id)
    expect(totals.measureFailures).toBe(2)
    expect(totals.excludedUnrendered).toBe(7)
  })
})

describe('tail scan — losing a job is not the same as failing one', () => {
  it('an unknown job id says the state was in-process and nothing was written', async () => {
    const s = store(makeCore({}))
    let err
    try { s.get('gone') } catch (e) { err = e }
    expect(err.status).toBe(404)
    expect(err.code).toBe('unknown_job')
    expect(err.message).toMatch(/restart loses it/)
    expect(err.message).toMatch(/Nothing was written/)
  })

  it('drops the oldest job when the in-memory ring is full, keeping the newest', async () => {
    const s = store(makeCore({}), { maxJobs: 2 })
    const a = s.start({ courseCode: 'c1' }); await a.promise
    const b = s.start({ courseCode: 'c2' }); await b.promise
    const c = s.start({ courseCode: 'c3' }); await c.promise
    expect(() => s.get(a.id)).toThrow(/no scan job/)
    expect(s.get(c.id).status).toBe('done')
  })

  it('refuses a nonsense scope before starting any work', () => {
    const s = store(makeCore({}))
    expect(() => s.start({ courseCode: 'deu_for_eng', maxSeedNumber: 0 })).toThrow(/positive integer/)
    expect(() => s.start({ courseCode: '' })).toThrow(/courseCode is required/)
  })
})

describe('tail scan — the seams, which write nothing', () => {
  it('produces audio_clip_flags-shaped rows for tail flags only, at severity suspect', async () => {
    const s = store(makeCore({ items: [item('a1', { tail: true }), item('a3', { duration: true })] }))
    const job = s.start({ courseCode: 'deu_for_eng' })
    await job.promise
    const rows = s.flagRowsFromScan(s.raw(job.id), 'tom@saysomethingin.com')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      audio_id: 'a1',
      course_code: 'deu_for_eng',
      source: 'detector',
      detector: TAIL_DETECTOR.name,
      // 'suspect', not 'bad' — 4 of the 20 listened-to flags were harmless.
      severity: 'suspect',
      detector_precision: 0.8,
      raised_by: 'tom@saysomethingin.com',
      audio_revision: 1,
    })
    expect(rows[0].metrics.fallRate).toBe(0.9)
    expect(rows[0].metrics.scanJobId).toBe(job.id)
  })

  it('the duration detector never becomes a machine flag — different unit, different meaning', async () => {
    const s = store(makeCore({ items: [item('a3', { duration: true })] }))
    const job = s.start({ courseCode: 'deu_for_eng' })
    await job.promise
    expect(s.flagRowsFromScan(s.raw(job.id))).toHaveLength(0)
  })

  it('verdictsByAudioId keys the sampler-facing annotation by clip', async () => {
    const s = store(makeCore({ items: [item('a1', { tail: true }), item('a3', { duration: true })] }))
    const job = s.start({ courseCode: 'deu_for_eng' })
    await job.promise
    const v = s.verdictsByAudioId(s.raw(job.id))
    expect(v.a1.categories).toEqual(['tail-truncation'])
    expect(v.a3.categories).toEqual(['duration'])
    expect(v.a1.tail.shape.zeroPadPct).toBe(99.4)
  })

  it('latestFinished ignores a run still in flight', async () => {
    let release
    const gate = new Promise(r => { release = r })
    const done = store(makeCore({ items: [] }))
    await done.start({ courseCode: 'deu_for_eng' }).promise
    expect(done.latestFinished('deu_for_eng')).toBeTruthy()

    const running = store(makeCore({ onQueue: () => gate }))
    const job = running.start({ courseCode: 'deu_for_eng' })
    expect(running.latestFinished('deu_for_eng')).toBeNull()
    release()
    await job.promise
  })
})
