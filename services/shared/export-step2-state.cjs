/**
 * The progress file of a detached export Step 2 run (job #27): the worker writes it, the API reads it
 * (to emit socket progress and to answer after its own restart). One file per course, next to the
 * pending manifest. Pure file I/O so it is testable without S3 or the database.
 */
const fs = require('fs')
const path = require('path')

const STALE_MS = 10 * 60 * 1000 // a running file nobody has touched for this long is a dead run

function runFile (dir, courseCode) { return path.join(dir, `${courseCode}_step2_run.json`) }

function pidAlive (pid) {
  try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' }
}

/** Atomic write (rename), so a reader never sees half a file. */
function writeRun (dir, courseCode, run) {
  const file = runFile(dir, courseCode)
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify({ ...run, updatedAt: Date.now() }))
  fs.renameSync(tmp, file)
}

/**
 * The run as it stands NOW: a 'running' file whose process is gone, or which has gone silent, is
 * reported as 'error' (the worker died — reboot, OOM, kill) instead of running forever.
 * Returns null when there is no run file.
 */
function readRun (dir, courseCode, now = Date.now()) {
  let run
  try { run = JSON.parse(fs.readFileSync(runFile(dir, courseCode), 'utf8')) } catch { return null }
  if (run.status === 'running') {
    if (!run.pid || !pidAlive(run.pid)) return { ...run, status: 'error', error: 'verification worker is no longer running (it was killed or the machine restarted) — run Step 2 again' }
    if (now - (run.updatedAt || 0) > STALE_MS) return { ...run, status: 'error', error: 'verification worker went silent — run Step 2 again' }
  }
  return run
}

module.exports = { runFile, writeRun, readRun, STALE_MS }
