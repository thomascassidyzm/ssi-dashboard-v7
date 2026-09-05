/**
 * Phase 8's progress state (`currentWork`) is one PROCESS-GLOBAL object. A restart —
 * deploy, crash, OOM — starts clean, and the render that was half way through 4,000 clips
 * leaves no record that anything was lost. The dashboard simply shows "idle".
 *
 * This does NOT make the work durable, and deliberately so: it is a breadcrumb, not a queue.
 * Its only job is to make the loss AUDIBLE — one file written when work starts, removed when
 * work ends cleanly, and read once at boot. A breadcrumb still present at startup means the
 * previous process died mid-render, and the boot log says exactly what it was doing.
 */

const path = require('path')

const DEFAULT_BREADCRUMB = path.join(__dirname, '../../temp/phase8/in-flight.json')

function markWorkInFlight(work, deps = {}) {
  const { fs = require('fs-extra'), breadcrumbPath = DEFAULT_BREADCRUMB, logger = console } = deps
  try {
    fs.ensureDirSync(path.dirname(breadcrumbPath))
    fs.writeJsonSync(breadcrumbPath, {
      pid: process.pid,
      operation: work.operation,
      courseCode: work.courseCode,
      role: work.role || null,
      current: work.current,
      total: work.total,
      startedAt: work.startedAt,
      updatedAt: new Date().toISOString()
    }, { spaces: 2 })
  } catch (err) {
    logger.warn(`[IN-FLIGHT] Could not write breadcrumb to ${breadcrumbPath}: ${err.message}`)
  }
}

function clearWorkInFlight(deps = {}) {
  const { fs = require('fs-extra'), breadcrumbPath = DEFAULT_BREADCRUMB, logger = console } = deps
  try {
    if (fs.existsSync(breadcrumbPath)) fs.removeSync(breadcrumbPath)
  } catch (err) {
    logger.warn(`[IN-FLIGHT] Could not clear breadcrumb at ${breadcrumbPath}: ${err.message}`)
  }
}

/**
 * Called once at boot. Returns the lost work (or null) so a caller can assert on it;
 * the log line is the deliverable — a restart that ate a render must never look like
 * a clean start.
 */
function reportWorkLostOnRestart(deps = {}) {
  const { fs = require('fs-extra'), breadcrumbPath = DEFAULT_BREADCRUMB, logger = console } = deps
  let lost = null
  try {
    if (!fs.existsSync(breadcrumbPath)) return null
    lost = fs.readJsonSync(breadcrumbPath)
  } catch (err) {
    logger.error(`[IN-FLIGHT] A breadcrumb exists at ${breadcrumbPath} but could not be read (${err.message}) — ` +
      'phase 8 work was in flight when the previous process ended, and its details are unreadable.')
    return null
  }

  const done = lost.current ?? '?'
  const total = lost.total ?? '?'
  logger.error(
    `[IN-FLIGHT] LOST WORK: phase 8 restarted while '${lost.operation}' was running on ${lost.courseCode}` +
    `${lost.role ? ` (${lost.role})` : ''} — ${done}/${total} items done, started ${lost.startedAt}, ` +
    `previous pid ${lost.pid}. Progress state is process-global and is NOT resumed: this run starts clean and ` +
    `the remaining items were never rendered. Re-run the operation for ${lost.courseCode} to finish it.`
  )

  clearWorkInFlight(deps)
  return lost
}

module.exports = { DEFAULT_BREADCRUMB, markWorkInFlight, clearWorkInFlight, reportWorkLostOnRestart }
