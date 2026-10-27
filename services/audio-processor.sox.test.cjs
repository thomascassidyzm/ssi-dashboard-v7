/**
 * Export durations are measured by sox, and Popty must find a sox that is not
 * on PATH.
 *
 * sox is not a system package on watson-1. The export's Stage 2 shelled out to
 * bare `sox` and every file errored: 0 matched, 0 mismatched, 5,100 errors on
 * ita_for_eng, 2026-10-27 (job #176). Kai ruled that it must stay sox (the
 * legacy durations are sox's, and ffprobe's differ), so Popty now runs the sox
 * named by SOX_PATH, else the user-space build at vendor/sox/bin/sox, else PATH.
 * These tests use a stand-in sox so they need no real one.
 *
 * Run: npx vitest run services/audio-processor.sox
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { getAudioDuration } = require('./audio-processor.cjs')

let dir
let fakeSox
const savedSoxPath = process.env.SOX_PATH

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sox-test-'))
  fakeSox = path.join(dir, 'sox-stand-in')
  // sox `stat` writes its report to stderr; echo the file it was given so the test sees argv.
  fs.writeFileSync(fakeSox, '#!/bin/sh\necho "Samples read: 97920" >&2\necho "Length (seconds):      2.040000" >&2\necho "$1" > "$0.arg"\n')
  fs.chmodSync(fakeSox, 0o755)
})

afterEach(() => {
  if (savedSoxPath === undefined) delete process.env.SOX_PATH
  else process.env.SOX_PATH = savedSoxPath
})

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

describe('getAudioDuration runs sox from SOX_PATH', () => {
  it('reads sox stat Length from a sox that is not on PATH', async () => {
    process.env.SOX_PATH = fakeSox
    const clip = path.join(dir, 'a clip with spaces.mp3')
    expect(await getAudioDuration(clip)).toBe(2.04)
    expect(fs.readFileSync(fakeSox + '.arg', 'utf8').trim()).toBe(clip)
  })
})

describe('resolveSoxBinary', () => {
  const { resolveSoxBinary } = require('./shared/sox-binary.cjs')
  it('prefers SOX_PATH, then the vendored build, then PATH', () => {
    expect(resolveSoxBinary({ env: { SOX_PATH: '/x/sox' }, exists: () => true, vendored: '/v/sox' })).toBe('/x/sox')
    expect(resolveSoxBinary({ env: {}, exists: (p) => p === '/v/sox', vendored: '/v/sox' })).toBe('/v/sox')
    expect(resolveSoxBinary({ env: {}, exists: () => false, vendored: '/v/sox' })).toBe('sox')
  })
})
