/**
 * Which sox binary Popty runs.
 *
 * Export durations MUST be measured by sox (Kai, 2026-10-27, job #176): the
 * legacy app's stored durations are sox's `stat` Length, which counts every
 * decoded MP3 frame, and ffprobe's format duration reads 1-2 frames short
 * (24-36 ms at 48 kHz). Stage 2 compares at zero tolerance and Stage 3 writes
 * S3's measure back to course_audio.duration_ms, so a different tool would
 * silently rewrite durations. Never substitute ffprobe here.
 *
 * sox is not a system package on watson-1, and installing one needs root. So a
 * user-space build lives at <repo>/vendor/sox/bin/sox (built by
 * tools/deploy/build-user-sox.sh, gitignored), which Popty finds without any
 * unit or env change. Order: SOX_PATH env > vendored build > `sox` on PATH
 * (a Mac with Homebrew sox needs nothing).
 */

const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '..', '..')
const VENDORED_SOX = path.join(REPO_ROOT, 'vendor', 'sox', 'bin', 'sox')

function resolveSoxBinary ({ env = process.env, exists = fs.existsSync, vendored = VENDORED_SOX } = {}) {
  if (env.SOX_PATH) return env.SOX_PATH
  if (exists(vendored)) return vendored
  return 'sox'
}

module.exports = { resolveSoxBinary, VENDORED_SOX }
