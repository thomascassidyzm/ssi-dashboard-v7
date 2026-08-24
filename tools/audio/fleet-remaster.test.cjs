/**
 * Unit tests for the fleet re-master's safety decisions.
 *
 * This tool can move 2.48 million clips. The three decisions that keep it safe
 * are pure and they are all tested here: what gets touched at all, whether the
 * row moved under us between read and write, and whether a killed run resumes
 * where it stopped. Nothing here needs ffmpeg, S3 or a database — that is the
 * point, because these are the paths that must be right before the run starts,
 * not discovered wrong at clip 400,000.
 */

import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const { shouldRemaster, rowUnchanged, loadCheckpoint, mapLimit } = require('./fleet-remaster.cjs')

describe('shouldRemaster — every true costs a learner a re-download', () => {
  it('touches a clip that is measurably off target', () => {
    const d = shouldRemaster({ measured: true, lufs: -17.6 }, -15.5, 0.5)
    expect(d.remaster).toBe(true)
    expect(d.errorDb).toBe(2.1)
  })

  it('leaves a clip that is already in tolerance completely alone', () => {
    const d = shouldRemaster({ measured: true, lufs: -15.8 }, -15.5, 0.5)
    expect(d.remaster).toBe(false)
    expect(d.reason).toMatch(/already within/)
  })

  it('treats exactly-at-tolerance as in tolerance, on both sides', () => {
    expect(shouldRemaster({ measured: true, lufs: -16.0 }, -15.5, 0.5).remaster).toBe(false)
    expect(shouldRemaster({ measured: true, lufs: -15.0 }, -15.5, 0.5).remaster).toBe(false)
  })

  it('REFUSES to replace bytes it could not measure', () => {
    for (const m of [null, { measured: false, lufs: null }, { measured: true, lufs: null }]) {
      const d = shouldRemaster(m, -15.5, 0.5)
      expect(d.remaster).toBe(false)
      expect(d.reason).toMatch(/not measurable/)
    }
  })

  it('also fixes a clip that is too LOUD, not only a quiet one', () => {
    expect(shouldRemaster({ measured: true, lufs: -12.0 }, -15.5, 0.5).remaster).toBe(true)
  })
})

describe('rowUnchanged — do not land on top of another writer', () => {
  const before = { s3_key: 'mastered/A.mp3', audio_revision: 1 }

  it('passes when nothing moved', () => {
    expect(rowUnchanged(before, { s3_key: 'mastered/A.mp3', audio_revision: 1 }).ok).toBe(true)
  })

  it('aborts when someone re-rendered the clip', () => {
    const r = rowUnchanged(before, { s3_key: 'mastered/B.mp3', audio_revision: 2 })
    expect(r.ok).toBe(false)
    expect(r.why).toMatch(/s3_key moved/)
  })

  it('aborts when only the revision moved', () => {
    const r = rowUnchanged(before, { s3_key: 'mastered/A.mp3', audio_revision: 3 })
    expect(r.ok).toBe(false)
    expect(r.why).toMatch(/audio_revision moved/)
  })

  it('aborts when the row has gone', () => {
    expect(rowUnchanged(before, null).ok).toBe(false)
  })

  it('treats a null revision as 1 rather than as a change', () => {
    expect(rowUnchanged({ s3_key: 'k', audio_revision: null }, { s3_key: 'k', audio_revision: 1 }).ok).toBe(true)
  })
})

describe('loadCheckpoint — a killed run must resume, not restart', () => {
  it('reads back the ids it wrote', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ck-'))
    const f = join(dir, 'ck.jsonl')
    writeFileSync(f, '{"id":"a"}\n{"id":"b"}\n')
    expect([...loadCheckpoint(f)].sort()).toEqual(['a', 'b'])
    rmSync(dir, { recursive: true })
  })

  it('survives the torn final line a kill leaves behind', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ck-'))
    const f = join(dir, 'ck.jsonl')
    writeFileSync(f, '{"id":"a"}\n{"id":"b"}\n{"id":"c"')
    expect([...loadCheckpoint(f)].sort()).toEqual(['a', 'b'])
    rmSync(dir, { recursive: true })
  })

  it('returns an empty set for a missing or unnamed file rather than throwing', () => {
    expect(loadCheckpoint(undefined).size).toBe(0)
    expect(loadCheckpoint('/nonexistent/nope.jsonl').size).toBe(0)
  })
})

describe('mapLimit', () => {
  it('honours the concurrency cap so a fleet run cannot swamp the box', async () => {
    let inFlight = 0, peak = 0
    await mapLimit(Array.from({ length: 20 }, (_, i) => i), 4, async () => {
      inFlight++; peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 2))
      inFlight--
    })
    expect(peak).toBeLessThanOrEqual(4)
  })
})
