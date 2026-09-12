/**
 * Does a Cartesia POD mint store word_timings on the course_audio row, and
 * does every other case store NULL? (Tom, 2026-09-12 — pod immersion display
 * keeps pace within a sentence.)
 *
 * Drives the SHIPPED generatePodAudio() out of phase8-audio-v13.cjs against
 * the in-memory PostgREST double, with TTS, ffmpeg (audio-processor) and
 * whisper (audio-veracity) cut at the module edge. Zero live DB, zero S3,
 * zero TTS spend.
 *
 * Run: npx vitest run services/phases/pod-word-timings-mint
 */

import { describe, it, expect } from 'vitest'

const fs = require('fs')
const { loadPhase8 } = require('./__fixtures__/phase8-sandbox.cjs')

const COURSE = { course_code: 'zzz_for_qqq', known_lang: 'qqq', target_lang: 'zzz' }
const TIMINGS = { source: 'cartesia', words: ['A', 'black', 'coffee'], starts: [0, 0.2, 0.5], ends: [0.15, 0.45, 0.9] }

/** A TTS double that answers like tts-service.generate and records its config. */
function ttsDouble (answer) {
  const tts = {
    calls: [],
    async generateWithRetry (text, provider, config) {
      tts.calls.push({ text, provider, config })
      return { audioBuffer: Buffer.alloc(9000, 1), wordBoundaries: null, ...answer(provider) }
    },
  }
  return tts
}

/** ffmpeg-free mastering: copy the bytes through, report a duration. */
const noFfmpeg = (real) => ({
  ...real,
  async trimToEndOfSpeech (inputPath) { return { refused: 'sandbox', path: inputPath } },
  async masterToHouseLoudness (inputPath, outputPath) {
    fs.copyFileSync(inputPath, outputPath)
    return { converged: true, inputLUFS: -16, outputLUFS: -16, passes: 1 }
  },
  async flagTailDefect () { return { defect: null } },
  async getAudioMetadata () { return { duration: 1.2 } },
})

/** whisper-free veracity: publish whatever the render produced. */
const noWhisper = (real) => ({
  ...real,
  async renderChecked ({ render }) {
    const rendered = await render()
    return { published: true, ...rendered, verdict: null, attempts: 1, verdicts: [] }
  },
  verdictColumns () { return {} },
})

function mint ({ voice, answer, beforeInsert, beforeUpdate }) {
  const tables = { course_audio: [], courses: [COURSE] }
  const tts = ttsDouble(answer)
  const { phase8, db } = loadPhase8({
    tables, tts,
    doubles: { '/audio-processor.cjs': noFfmpeg, '/audio-veracity.cjs': noWhisper },
  })
  if (beforeInsert) db.beforeInsert = beforeInsert
  if (beforeUpdate) db.beforeUpdate = beforeUpdate
  return phase8.generatePodAudio({
    courseCode: COURSE.course_code,
    text: 'A black coffee, please.',
    language: 'eng',
    role: 'target1',
    voice,
    track: 'target',
    sentenceId: 'zzz_for_qqq:pod-0-s1',
  }).then(result => ({ result, row: db.tables.course_audio[0], tts }))
}

describe('generatePodAudio stores word_timings', () => {
  const cartesia = { provider: 'cartesia', voice_id: '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2', locale: 'en-GB' }

  it('asks Cartesia for timings and stores what it returned, in the contract shape', async () => {
    const { result, row, tts } = await mint({ voice: cartesia, answer: () => ({ wordTimings: TIMINGS }) })
    expect(result.reused).toBe(false)
    expect(tts.calls).toHaveLength(1)
    expect(tts.calls[0].provider).toBe('cartesia')
    expect(tts.calls[0].config.wordTimings).toBe(true)   // timestamps REQUESTED
    expect(row.word_timings).toEqual(TIMINGS)             // and STORED
    expect(row.voice_id).toBe('cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2')
  })

  it('stores NULL when Cartesia answered with audio but no timings', async () => {
    const { row } = await mint({ voice: cartesia, answer: () => ({ wordTimings: null }) })
    expect(row.word_timings).toBeNull()
  })

  it('stores NULL when the provider is not Cartesia and never asks it for timings', async () => {
    const azure = { provider: 'azure', voice_id: 'en-GB-SoniaNeural' }
    const { row, tts } = await mint({ voice: azure, answer: () => ({}) })
    expect(tts.calls[0].config.wordTimings).toBeUndefined()
    expect(row.word_timings).toBeNull()
  })

  it('refuses a half-shape from the provider: ragged arrays are stored as NULL', async () => {
    const ragged = { source: 'cartesia', words: ['A', 'black'], starts: [0], ends: [0.15, 0.45] }
    const { row } = await mint({ voice: cartesia, answer: () => ({ wordTimings: ragged }) })
    expect(row.word_timings).toBeNull()
  })

  it('never writes timings when the inserted row came back holding a different s3_key', async () => {
    // Stand-in for a canonical-clip dedupe: the row is pointed at the estate's
    // canonical key for the line, not the bytes we just rendered. Timings are
    // written only AFTER insert and only if the key is ours, so the row must
    // never carry them — not even transiently.
    let everWritten = false
    const beforeInsert = (table, row) => {
      if (table === 'course_audio') {
        if (row.word_timings) everWritten = true
        row.s3_key = 'mastered/CANONICAL-ELSEWHERE.mp3'
      }
    }
    const beforeUpdate = (table, patch) => { if (table === 'course_audio' && patch.word_timings) everWritten = true }
    const { result, row } = await mint({ voice: cartesia, answer: () => ({ wordTimings: TIMINGS }), beforeInsert, beforeUpdate })
    expect(result.reused).toBe(false)
    expect(row.s3_key).toBe('mastered/CANONICAL-ELSEWHERE.mp3')
    expect(row.word_timings).toBeNull()
    expect(everWritten).toBe(false)
  })

  it('when the timings update fails the row exists with NULL timings and the mint still succeeds', async () => {
    const beforeUpdate = (table, patch) => (table === 'course_audio' && patch.word_timings) ? new Error('PostgREST 503') : null
    const { result, row } = await mint({ voice: cartesia, answer: () => ({ wordTimings: TIMINGS }), beforeUpdate })
    expect(result.reused).toBe(false)
    expect(result.id).toBe(row.id)
    expect(row.s3_key).toMatch(/^mastered\/.+\.mp3$/)
    expect(row.word_timings).toBeNull()
  })
})
