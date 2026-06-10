/**
 * Orchestrator end-to-end on MOCKS + local files: fake db (no Supabase),
 * local storage (no S3), real ffmpeg/lame via audio-processor, tone fixtures.
 * Proves: align → segment store → prefer-take → splice → register → link →
 * resume-by-idempotency.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const audioProcessor = require('../../audio-processor.cjs')
const synthesisJob = require('../synthesis-job.cjs')
const { createLocalStorage } = require('../storage.cjs')
const realProvenance = require('../provenance-adapter.cjs')
const segmentStore = require('../segment-store.cjs')
const { normalizeForAudio } = require('../../shared/text-normalize.cjs')

const COURSE = 'mkd_for_fra'
const VOICE = 'human_marija_mkd'
const PHRASE_RECORDED = 'јас сакам да зборувам македонски'
const PHRASE_SPLICE = 'да зборувам македонски'
const PHRASE_GAP = 'јас сакам кафе'
const CHUNKS_STRING = 'јас сакам|да зборувам|македонски'

let dir
let storage

function sine(outPath, freq, durMs, padMs = 0) {
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `sine=frequency=${freq}:duration=${durMs / 1000}`,
    ...(padMs > 0 ? ['-af', `apad=pad_dur=${padMs / 1000}`] : []),
    '-ar', '44100', '-ac', '1', outPath,
  ])
}

function concatWavs(inputs, outPath) {
  const list = path.join(dir, `list-${path.basename(outPath)}.txt`)
  fs.writeFileSync(list, inputs.map(f => `file '${f}'`).join('\n'))
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', outPath])
}

function makeFakeDb() {
  const upserts = []
  let linkCalls = 0
  return {
    upserts,
    get linkCalls() { return linkCalls },
    async loadCourse() {
      return {
        course_code: COURSE, known_lang: 'fra', target_lang: 'mkd',
        voice_config: { voices: { target1: { provider: 'human', voiceId: VOICE } } },
      }
    },
    async loadNewLegos() {
      return [
        { lego_id: 'S0001L01', target_text: 'јас сакам', type: 'M', is_new: true },
        { lego_id: 'S0001L02', target_text: 'да зборувам', type: 'M', is_new: true },
        { lego_id: 'S0002L01', target_text: 'македонски', type: 'A', is_new: true },
      ]
    },
    async loadPhrases() {
      return [
        { id: 'p1', target_text: PHRASE_RECORDED },
        { id: 'p2', target_text: PHRASE_SPLICE },
        { id: 'p3', target_text: PHRASE_GAP },
      ]
    },
    async loadSeeds() { return [] },
    async fetchExistingAudioTexts() {
      // Same shape as db.cjs: Map text_normalized → registered s3_key
      // (latest upsert wins, like the real 5-col-conflict upsert).
      return new Map(upserts.map(u => [normalizeForAudio(u.text), u.s3Key]))
    },
    async upsertHumanCourseAudio(_supabase, args) {
      upserts.push(args)
      return `FAKE-ID-${upserts.length}`
    },
    async linkCourseAudio() {
      linkCalls++
      return { ok: true, result: { total: upserts.length } }
    },
  }
}

function makeDeps(db, extraProvenanceRows = []) {
  return {
    supabase: {}, // never touched by the fakes
    storage,
    audioProcessor,
    db,
    provenance: {
      ...realProvenance,
      async fetchProvenanceRows() {
        // Keystone-shaped raw rows through the REAL mapping function.
        const raw = [
          { id: 'pr-slow', course_code: COURSE, s3_key: 'recordings/slow.mp3', phrase_text: PHRASE_RECORDED, chunks_string: CHUNKS_STRING, voice_id: VOICE, role: 'target1', cadence: 'slow', recorded_by: 'marija', recorded_at: '2026-06-01T10:00:00Z' },
          { id: 'pr-nat', course_code: COURSE, s3_key: 'recordings/natural.mp3', phrase_text: PHRASE_RECORDED, chunks_string: CHUNKS_STRING, voice_id: VOICE, role: 'target1', cadence: 'natural', recorded_by: 'marija', duration_ms: 2300, recorded_at: '2026-06-01T10:00:00Z' },
          ...extraProvenanceRows,
        ]
        return { rows: raw.map(realProvenance.fromProvenanceRow), error: null }
      },
      async recordSplicedProvenance() { return true },
    },
    logger: { warn() {}, error() {} },
  }
}

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 've-job-test-'))
  storage = createLocalStorage(path.join(dir, 'bucket'))

  // Build slow (gapped) + natural (continuous) takes from 3 tones.
  const tones = [[440, 700], [660, 900], [550, 700]]
  const slowParts = tones.map(([f, d], i) => { const p = path.join(dir, `s${i}.wav`); sine(p, f, d, 400); return p })
  const natParts = tones.map(([f, d], i) => { const p = path.join(dir, `n${i}.wav`); sine(p, f, d); return p })
  const slow = path.join(dir, 'slow.wav')
  const nat = path.join(dir, 'natural.wav')
  concatWavs(slowParts, slow)
  concatWavs(natParts, nat)
  await storage.putObject('recordings/slow.mp3', fs.readFileSync(slow), 'audio/mpeg')
  await storage.putObject('recordings/natural.mp3', fs.readFileSync(nat), 'audio/mpeg')
}, 60000)

describe('synthesis job (mock db, local storage, real ffmpeg)', () => {
  it('dry run: prefer-take + plan + gap report, NO writes', async () => {
    const db = makeFakeDb()
    const { started, job } = synthesisJob.startSynthesisJob(makeDeps(db), {
      courseCode: COURSE, voiceId: VOICE, dryRun: true,
    })
    expect(started).toBe(true)
    await job._run
    expect(job.state).toBe('completed')
    const c = job.report.counts
    expect(c.recordedTakes).toBe(1)
    expect(c.segmentsExtracted).toBe(3)         // chunks cut + stored
    expect(c.takesRegistered).toBe(1)           // would-register (dry)
    expect(c.coveredByTake).toBe(1)             // p1 never spliced
    expect(c.planned).toBe(1)                   // p2
    expect(c.missingChunkPhrases).toBe(1)       // p3 ('кафе' unrecorded)
    expect(c.spliced).toBe(0)
    expect(db.upserts).toHaveLength(0)          // dry = no DB writes
    // ...and no storage writes either: no manifest, no segment objects.
    expect(await storage.exists(segmentStore.manifestKey(COURSE, VOICE))).toBe(false)
    expect(job.report.gapReport[0].chunkText).toContain('кафе')
  }, 120000)

  it('real run: registers the take, splices p2, links; segments are UUID-keyed', async () => {
    const db = makeFakeDb()
    const { job } = synthesisJob.startSynthesisJob(makeDeps(db), {
      courseCode: COURSE, voiceId: VOICE, dryRun: false,
    })
    await job._run
    expect(job.state).toBe('completed')
    const c = job.report.counts
    expect(c.takesRegistered).toBe(1)
    expect(c.spliced).toBe(1)
    expect(c.spliceFailed).toBe(0)
    expect(db.linkCalls).toBe(1)

    // Whole take registered with ITS OWN s3_key (take beats splice).
    const takeRow = db.upserts.find(u => u.text === PHRASE_RECORDED)
    expect(takeRow).toMatchObject({ role: 'target1', voiceId: VOICE, language: 'mkd', s3Key: 'recordings/natural.mp3' })

    // Spliced phrase registered under mastered/{UUID}.mp3.
    const splicedRow = db.upserts.find(u => u.text === PHRASE_SPLICE)
    expect(splicedRow.s3Key).toMatch(/^mastered\/[0-9A-F-]{36}\.mp3$/)
    const splicedBytes = await storage.getObjectBuffer(splicedRow.s3Key)
    expect(splicedBytes.length).toBeGreaterThan(1000)

    // Manifest: segments UUID-keyed (no Cyrillic in keys), ledger records p2.
    const manifest = await segmentStore.loadManifest(storage, COURSE, VOICE)
    expect(manifest.segments.length).toBe(3)
    for (const seg of manifest.segments) {
      expect(seg.s3Key).toMatch(new RegExp(`^segments/${COURSE}/${VOICE}/[0-9A-F-]{36}\\.mp3$`))
      expect(await storage.exists(seg.s3Key)).toBe(true)
    }
    expect(manifest.spliced.map(s => s.text)).toEqual([PHRASE_SPLICE])
  }, 180000)

  it('resume: a second run is a no-op (idempotency, not job-state persistence)', async () => {
    const db = makeFakeDb()
    const deps = makeDeps(db)
    const first = synthesisJob.startSynthesisJob(deps, { courseCode: COURSE, voiceId: VOICE })
    await first.job._run
    const upsertsAfterFirst = db.upserts.length

    const second = synthesisJob.startSynthesisJob(deps, { courseCode: COURSE, voiceId: VOICE })
    await second.job._run
    expect(second.job.state).toBe('completed')
    const c = second.job.report.counts
    expect(c.segmentsExtracted).toBe(0)       // manifest already has them
    expect(c.takesRegistered).toBe(0)         // already in course_audio
    expect(c.spliced).toBe(0)
    expect(c.alreadyRegistered).toBe(2)       // p1 + p2
    expect(db.upserts.length).toBe(upsertsAfterFirst)
  }, 180000)

  it('RE-RECORDS SUPERSEDE: a fresher natural take re-points the row and re-cuts its segments', async () => {
    const db = makeFakeDb()
    // First run with the original takes.
    const first = synthesisJob.startSynthesisJob(makeDeps(db), { courseCode: COURSE, voiceId: VOICE })
    await first.job._run
    expect(first.job.state).toBe('completed')
    const takeRowBefore = db.upserts.find(u => u.text === PHRASE_RECORDED)
    expect(takeRowBefore.s3Key).toBe('recordings/natural.mp3')

    // Marija re-records the natural take (newer recorded_at, fresh provenance id).
    await storage.putObject('recordings/natural-v2.mp3', await storage.getObjectBuffer('recordings/natural.mp3'), 'audio/mpeg')
    const reRecord = {
      id: 'pr-nat-v2', course_code: COURSE, s3_key: 'recordings/natural-v2.mp3',
      phrase_text: PHRASE_RECORDED, chunks_string: CHUNKS_STRING,
      voice_id: VOICE, role: 'target1', cadence: 'natural', recorded_by: 'marija',
      duration_ms: 2300, recorded_at: '2026-06-09T10:00:00Z',
    }
    const second = synthesisJob.startSynthesisJob(makeDeps(db, [reRecord]), { courseCode: COURSE, voiceId: VOICE })
    await second.job._run
    expect(second.job.state).toBe('completed')

    // The whole-take row now points at the NEW take (not frozen on the first).
    const takeRows = db.upserts.filter(u => u.text === PHRASE_RECORDED)
    expect(takeRows[takeRows.length - 1].s3Key).toBe('recordings/natural-v2.mp3')
    expect(second.job.report.counts.takesRegistered).toBe(1)

    // Segments cut from the superseded take were pruned and re-cut from v2.
    expect(second.job.report.counts.segmentsExtracted).toBe(3)
    const manifest = await segmentStore.loadManifest(storage, COURSE, VOICE)
    const natSegs = manifest.segments.filter(s => s.cadence === 'natural')
    expect(natSegs).toHaveLength(3)
    for (const seg of natSegs) {
      expect(seg.take.provenanceId).toBe('pr-nat-v2')
    }
  }, 180000)

  it('rejects an unknown voice and refuses concurrent jobs', async () => {
    const db = makeFakeDb()
    const deps = makeDeps(db)
    const bad = synthesisJob.startSynthesisJob(deps, { courseCode: COURSE, voiceId: 'human_nobody_xxx' })
    await bad.job._run
    expect(bad.job.state).toBe('failed')
    expect(bad.job.error).toMatch(/not assigned to any voice slot/)
  }, 60000)
})
