#!/usr/bin/env node
// BOOTH TAKES AS METER FRAMES (job #915, Aran 2026-10-28). Turns a session's raw
// booth takes back into what the booth's meter saw: one peak per ~16 ms frame,
// the max |sample| over the last 1024 samples at 48 kHz (useTapRecorder's
// analyser.fftSize), so the auto-advance logic can be replayed over a real room.
//
// Reads only: the API log (which raw/ keys were retained, and which takes the
// server refused) and the raw objects in S3. Writes one JSON file to --out.
//
//   node tools/recording/booth-take-meter-frames.cjs \
//     --log ~/wt-staging/staging-api.log --since 2026-10-28T00:00:00Z \
//     --out ~/ssi-evidence/ssi-dashboard-v7/booth/frames-2026-10-28.json
//
// Replay: BOOTH_REPLAY_FRAMES=<out> npx vitest run src/composables/useTapRecorder.replay.test.js
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const s3 = require('../../services/s3-production-service.cjs')

const FRAME_SAMPLES = 768   // 16 ms at 48 kHz: one requestAnimationFrame
const WINDOW = 1024         // analyser.fftSize in useTapRecorder.js

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : dflt
}

// The log's [Upload] lines are written by one process in order; a take is the
// "Raw take retained at raw/<id>.webm" line, refused if a later "REFUSED ... <id>"
// line names it. Timestamps come from the nearest [BoothTake] line after it.
function takesFromLog(text, since) {
  const takes = []
  const byId = new Map()
  let lastIso = null
  for (const line of text.split('\n')) {
    const bt = /\[BoothTake\] (\S+Z) voice=(\S+) line=(\S+) status=(\d+).*?(?: advance=(\w+) gapMs=(\S+))?$/.exec(line)
    if (bt) { lastIso = bt[1]; continue }
    const kept = /Raw take retained at (raw\/([0-9A-F-]{36})\.webm)/i.exec(line)
    if (kept) {
      if (lastIso && lastIso < since) continue
      const t = { id: kept[2], rawKey: kept[1], after: lastIso, refused: null }
      takes.push(t); byId.set(t.id, t)
      continue
    }
    const ref = /REFUSED (?:[\w-]+ )?take ([0-9A-F-]{36}): (\S+)/i.exec(line)
    if (ref && byId.has(ref[1])) byId.get(ref[1]).refused = ref[2]
  }
  return takes
}

function framesFromPcm(buf) {
  const pcm = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4))
  const out = []
  for (let end = FRAME_SAMPLES; end <= pcm.length; end += FRAME_SAMPLES) {
    let p = 0
    for (let i = Math.max(0, end - WINDOW); i < end; i++) { const a = Math.abs(pcm[i]); if (a > p) p = a }
    out.push(Math.round(p * 10000))
  }
  return out
}

async function main() {
  const log = arg('log', path.join(process.env.HOME, 'wt-staging/staging-api.log'))
  const since = arg('since', new Date(Date.now() - 864e5).toISOString())
  const out = arg('out')
  if (!out) throw new Error('--out <file.json> is required')
  const takes = takesFromLog(fs.readFileSync(log, 'utf8'), since)
  const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'booth-frames-'))
  const result = []
  for (const t of takes) {
    try {
      const url = await s3.getAudioSignedUrl(null, 600, { s3Key: t.rawKey })
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const file = path.join(tmp, `${t.id}.webm`)
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
      const pcm = execFileSync('ffmpeg', ['-v', 'fatal', '-i', file, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 })
      fs.rmSync(file)
      result.push({ ...t, peaks: framesFromPcm(pcm) })
    } catch (e) {
      result.push({ ...t, error: e.message })
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify({ since, frameMs: 16, scale: 10000, takes: result }))
  const bad = result.filter(r => r.error).length
  console.log(`${result.length} takes (${result.filter(r => r.refused).length} refused, ${bad} unreadable) -> ${out}`)
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1) })
module.exports = { takesFromLog, framesFromPcm }
