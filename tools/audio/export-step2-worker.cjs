#!/usr/bin/env node
'use strict'
/**
 * Export Step 2 worker (job #27). Started DETACHED by production-api's POST .../verify-s3 so a
 * deploy-restart of the API does not kill a 30-40 min run. Does the whole of Step 2 (existence, sox
 * length + MP3 format check, auto-fix, re-verify, course_export_states write) and keeps its position
 * in <stateDir>/<course>_step2_run.json for the API to relay. Environment (Supabase, S3) is inherited
 * from the API that started it.
 *
 *   node tools/audio/export-step2-worker.cjs <courseCode> <stateDir>
 */
const path = require('path')
const { runStep2 } = require('../../services/shared/export-step2-run.cjs')
const { writeRun, readRun } = require('../../services/shared/export-step2-state.cjs')

async function main () {
  const [courseCode, stateDir] = process.argv.slice(2)
  if (!courseCode || !stateDir) { console.error('usage: export-step2-worker.cjs <courseCode> <stateDir>'); process.exit(64) }
  const manifestPath = path.join(stateDir, `${courseCode}_pending_manifest.json`)
  const startedAt = readRun(stateDir, courseCode)?.startedAt || Date.now()
  const base = { courseCode, pid: process.pid, startedAt }
  const ac = new AbortController()
  process.on('SIGTERM', () => ac.abort()) // the API's Cancel button
  let last = { phase: 'existence', checked: 0, total: 0 }
  let lastWrite = 0
  const progress = (event) => {
    last = event
    if (Date.now() - lastWrite < 1000 && event.checked !== event.total) return
    lastWrite = Date.now()
    writeRun(stateDir, courseCode, { ...base, status: 'running', progress: event })
  }
  writeRun(stateDir, courseCode, { ...base, status: 'running', progress: last })
  // heartbeat, so a long silent phase (a slow download) is not mistaken for a dead worker
  const beat = setInterval(() => writeRun(stateDir, courseCode, { ...base, status: 'running', progress: last }), 30000)
  try {
    const supabaseClient = require('../../services/supabase-client.cjs')
    const s3DeployService = require('../../services/s3-deploy-service.cjs')
    const logger = require('../../services/shared/logger.cjs')('ExportStep2')
    const out = await runStep2({ courseCode, manifestPath, onProgress: progress, signal: ac.signal, supabase: supabaseClient.getClient(), s3DeployService, log: logger })
    clearInterval(beat)
    if (out.cancelled) writeRun(stateDir, courseCode, { ...base, status: 'cancelled' })
    else writeRun(stateDir, courseCode, { ...base, status: 'completed', s3Verified: out.s3Verified, results: out.results })
  } catch (err) {
    clearInterval(beat)
    console.error(err)
    writeRun(stateDir, courseCode, { ...base, status: 'error', error: err.message })
    process.exitCode = 1
  }
}
main()
