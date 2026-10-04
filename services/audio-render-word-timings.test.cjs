/**
 * #643: /api/audio/render must carry Cartesia word timings from the render to the stored row.
 * Fails on the pre-fix code (timings were dropped between speak() and store()/replace()).
 * Run: npx vitest run services/audio-render-word-timings.test.cjs
 */
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const path = require('path')
const { renderClip } = require('./shared/audio-render-entry.cjs')

const WT = { source: 'cartesia', words: ['Ciao'], starts: [0], ends: [0.3] }
const base = { courseCode: 'ita_for_eng', role: 'known', text: 'hello', purpose: 'test', requestedBy: 'test', language: 'eng', voiceId: 'v' }
const deps = (seen) => ({
  resolve: async () => ({ language: 'eng', voiceId: 'v', provider: 'cartesia', providerConfig: {} }),
  link: async () => null,
  speak: async () => ({ audioBuffer: Buffer.alloc(1), wordBoundaries: null, wordTimings: WT, existingClip: null, charsSpent: 5 }),
  store: async (a) => { seen.store = a; return { audioId: 'x', s3Key: 'k', durationMs: 1 } },
  loadClip: async () => ({ id: 'a', course_code: 'ita_for_eng', role: 'known', language: 'eng', voice_id: 'v', s3_key: 's', origin: 'tts' }),
  replace: async (a) => { seen.replace = a; return { audioId: 'a', s3Key: 'k', durationMs: 1, revision: 2 } },
})

describe('render route keeps word timings', () => {
  it('hands the render timings to store()', async () => {
    const seen = {}
    await renderClip(base, deps(seen))
    expect(seen.store.wordTimings).toEqual(WT)
  })
  it('hands them to replace() on a re-record', async () => {
    const seen = {}
    await renderClip({ ...base, replaceAudioId: 'a' }, deps(seen))
    expect(seen.replace.wordTimings).toEqual(WT)
  })
  it('the route asks Cartesia for timestamps and writes the column', () => {
    const src = fs.readFileSync(path.join(__dirname, 'phases/phase8-audio-v13.cjs'), 'utf8')
    const route = src.slice(src.indexOf("app.post('/render'"), src.indexOf("app.post('/regenerate-single"))
    expect(route).toMatch(/provider === 'cartesia' \? \{[^}]*wordTimings: true/)
    expect(route).toMatch(/word_timings: toWordTimingsColumn\(wordTimings\)/)
    expect(route).toMatch(/rerecordPatch\(\{ voiceId, wordBoundaries, wordTimings \}\)/)
  })
})
