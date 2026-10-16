#!/usr/bin/env node
/**
 * booth-upload-load.cjs — CAN THE SERVER TAKE TWO BOOTH UPLOADS AT ONCE? (job #221)
 *
 * Aran's first condition for Phase 1 (two takes on the wire per booth): prove the server is OK
 * with it, on synthetic takes, never against live recording. This runs the take's CPU work with
 * the server's OWN modules, unchanged — retainAndProcessTake (services/recording-upload-helpers.cjs)
 * driving audio-processor's processRecordingBuffer (ffmpeg trim + master), then the three refusal
 * gates in services/recording-speech-gate.cjs — behind a local HTTP server, and posts real raw
 * takes at it at 1 and 2 in flight per booth.
 *
 * TOUCHES NOTHING SHARED. No database, no S3: the raw-archive PUT, the line resolve, the mastered
 * PUT and the course_audio filing are SLEEPS of the measured/estimated length (--io, defaults
 * from plan #715's timings), which cost no CPU — exactly what they cost the API box. The booth's
 * whisper check is off on the server (BOOTH_WHISPER_CHECK unset, Tom 2026-10-16) and is not run.
 *
 * Usage:
 *   node tools/booth-upload-load.cjs --dir <folder of raw .webm takes> [--takes 30]
 *        [--scenarios 1x1,1x2,2x1,2x2]   booths x in-flight-per-booth
 *        [--io raw=300,resolve=400,mastered=300,filing=1500]   ms
 *        [--client-gap 0]   ms each booth waits between a reply and its next post
 *
 * Prints one JSON line per scenario and a table: takes/min, server ms p50/p90/max, peak ffmpeg
 * processes, peak RSS (API process + ffmpeg), CPU seconds per take, errors.
 */
'use strict'

const fs = require('fs')
const path = require('path')
const http = require('http')
const { execFileSync } = require('child_process')

const { retainAndProcessTake } = require('../services/recording-upload-helpers.cjs')
const audioProcessor = require('../services/audio-processor.cjs')
const speechGate = require('../services/recording-speech-gate.cjs')
const { createKeyedLock, lineLockKey } = require('../services/voice-engine/booth-upload-concurrency.cjs')

function args () {
  const a = process.argv.slice(2)
  const o = { takes: 30, scenarios: '1x1,1x2,2x1,2x2', io: '', clientGap: 0, dir: null }
  for (let i = 0; i < a.length; i++) {
    const k = a[i]
    const v = a[i + 1]
    if (k === '--dir') { o.dir = v; i++ } else if (k === '--takes') { o.takes = Number(v); i++ } else if (k === '--scenarios') { o.scenarios = v; i++ } else if (k === '--io') { o.io = v; i++ } else if (k === '--client-gap') { o.clientGap = Number(v); i++ }
  }
  if (!o.dir) { console.error('need --dir <folder of raw .webm takes>'); process.exit(2) }
  const io = { raw: 300, resolve: 400, mastered: 300, filing: 1500 }
  for (const kv of String(o.io).split(',').filter(Boolean)) { const [k, v] = kv.split('='); io[k] = Number(v) }
  o.io = io
  return o
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const QUIET = { log () {}, warn () {}, error () {}, info () {} }

function quantile (xs, q) {
  if (!xs.length) return null
  const s = xs.slice().sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]
}

/** CPU seconds used by this process and its reaped children (ffmpeg), from /proc. */
function cpuSeconds () {
  const f = fs.readFileSync('/proc/self/stat', 'utf8').split(') ')[1].split(' ')
  // fields after "(comm) ": state=0 ... utime=11 stime=12 cutime=13 cstime=14
  const tick = 100
  return (Number(f[11]) + Number(f[12]) + Number(f[13]) + Number(f[14])) / tick
}

/** Live ffmpeg children of this process and their RSS in MB. */
function ffmpegKids () {
  try {
    const out = execFileSync('ps', ['-o', 'rss=,comm=', '--ppid', String(process.pid)], { encoding: 'utf8' })
    const rows = out.trim().split('\n').filter((l) => /ffmpeg|ffprobe/.test(l))
    return { n: rows.length, rssMb: rows.reduce((s, l) => s + Number(l.trim().split(/\s+/)[0]) / 1024, 0) }
  } catch { return { n: 0, rssMb: 0 } }
}

function startServer (io) {
  const lock = createKeyedLock()
  let inFlight = 0
  let peakInFlight = 0
  const server = http.createServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', async () => {
      const t0 = Date.now()
      inFlight += 1
      peakInFlight = Math.max(peakInFlight, inFlight)
      const line = req.headers['x-line'] || 'L'
      let release = null
      let status = 200
      try {
        release = await lock.acquire(lineLockKey({ voiceId: req.headers['x-voice'] || 'v', lineId: line, text: line }))
        await sleep(io.resolve)
        const take = await retainAndProcessTake({
          rawBuffer: Buffer.concat(chunks),
          mimeType: 'audio/webm',
          s3KeyUuid: `LOAD-${line}`,
          retainRaw: () => sleep(io.raw),
          processRecording: (b, o) => audioProcessor.processRecordingBuffer(b, o),
          logger: QUIET,
        })
        if (take.refused) status = take.refused.status
        else {
          const buf = take.processedBuffer
          const speech = await speechGate.checkTakeHasSpeech({ buffer: buf, expectedText: null, language: 'cym', durationMs: take.audioMeta.durationMs })
          const noise = await speechGate.checkTakeIsNotSteadyNoise({ buffer: buf })
          const bounds = await speechGate.checkTakeBoundaries({ buffer: buf })
          if (speech.pass === false || noise.pass === false || bounds.pass === false) status = 422
          // A refused fixture still pays the store-and-file time, so the drain rate is the rate
          // of a booth whose takes pass — the gates' own cost has been paid either way.
          await sleep(io.mastered); await sleep(io.filing)
        }
      } catch (e) {
        status = 500
      } finally {
        if (release) release()
        inFlight -= 1
      }
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ms: Date.now() - t0 }))
    })
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, peak: () => peakInFlight, resetPeak: () => { peakInFlight = 0 } })))
}

function post (port, voice, line, body) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    const req = http.request({ host: '127.0.0.1', port, method: 'POST', path: '/take', headers: { 'x-voice': voice, 'x-line': line, 'content-length': body.length } }, (res) => {
      let d = ''
      res.on('data', (c) => { d += c })
      res.on('end', () => { let server = null; try { server = JSON.parse(d).ms } catch {} resolve({ status: res.statusCode, ms: Date.now() - t0, server }) })
    })
    req.on('error', () => resolve({ status: 0, ms: Date.now() - t0, server: null }))
    req.end(body)
  })
}

async function scenario ({ port, srv, files, takes, booths, perBooth, clientGap }) {
  srv.resetPeak()
  let ffPeak = 0
  let rssPeak = 0
  const mon = setInterval(() => {
    const k = ffmpegKids()
    ffPeak = Math.max(ffPeak, k.n)
    rssPeak = Math.max(rssPeak, process.memoryUsage().rss / 1048576 + k.rssMb)
  }, 100)
  const cpu0 = cpuSeconds()
  const t0 = Date.now()
  const results = []
  // Each booth has its own shelf of `takes` and keeps `perBooth` posts on the wire.
  await Promise.all(Array.from({ length: booths }, async (_, b) => {
    let next = 0
    await Promise.all(Array.from({ length: perBooth }, async () => {
      for (;;) {
        const i = next++
        if (i >= takes) return
        const r = await post(port, `booth${b}`, `b${b}-L${i}`, files[(i + b * 7) % files.length])
        results.push(r)
        if (clientGap) await sleep(clientGap)
      }
    }))
  }))
  const wall = (Date.now() - t0) / 1000
  clearInterval(mon)
  const cpu = cpuSeconds() - cpu0
  const ok = results.filter((r) => r.status === 200)
  const server = results.map((r) => r.server).filter((x) => x != null)
  return {
    scenario: `${booths} booth(s) x ${perBooth} in flight`,
    takes: results.length,
    ok: ok.length,
    refused422: results.filter((r) => r.status === 422).length,
    errors: results.filter((r) => r.status !== 200 && r.status !== 422).length,
    takesPerMinPerBooth: +(takes / wall * 60).toFixed(1),
    takesPerMinTotal: +(results.length / wall * 60).toFixed(1),
    serverMsP50: quantile(server, 0.5),
    serverMsP90: quantile(server, 0.9),
    serverMsMax: Math.max(...server),
    peakInFlight: srv.peak(),
    peakFfmpeg: ffPeak,
    peakRssMb: Math.round(rssPeak),
    cpuSecPerTake: +(cpu / results.length).toFixed(2),
    loadavg1: +require('os').loadavg()[0].toFixed(1),
  }
}

async function main () {
  const o = args()
  const files = fs.readdirSync(o.dir).filter((f) => /\.webm$/i.test(f)).sort().map((f) => fs.readFileSync(path.join(o.dir, f)))
  if (!files.length) { console.error(`no .webm takes in ${o.dir}`); process.exit(2) }
  const srv = await startServer(o.io)
  const out = []
  console.error(`# ${files.length} raw takes, io ${JSON.stringify(o.io)}, ${o.takes} takes per booth per scenario`)
  for (const sc of o.scenarios.split(',')) {
    const [booths, perBooth] = sc.split('x').map(Number)
    const r = await scenario({ port: srv.port, srv, files, takes: o.takes, booths, perBooth, clientGap: o.clientGap })
    console.log(JSON.stringify(r))
    out.push(r)
  }
  srv.server.close()
  console.error('\n| scenario | takes/min per booth | total/min | server ms p50 / p90 / max | peak ffmpeg | peak RSS MB | CPU s/take | errors | 422 | load |')
  console.error('|---|---|---|---|---|---|---|---|---|---|')
  for (const r of out) console.error(`| ${r.scenario} | ${r.takesPerMinPerBooth} | ${r.takesPerMinTotal} | ${r.serverMsP50} / ${r.serverMsP90} / ${r.serverMsMax} | ${r.peakFfmpeg} | ${r.peakRssMb} | ${r.cpuSecPerTake} | ${r.errors} | ${r.refused422} | ${r.loadavg1} |`)
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1) })
