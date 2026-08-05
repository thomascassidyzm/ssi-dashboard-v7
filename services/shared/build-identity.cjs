/**
 * Build identity — which commit is THIS PROCESS actually running?
 *
 * 2026-08-05: a route landed on main, deployed, and 404'd for hours because
 * nothing restarted the backend. The live server kept serving old code and
 * there was no way to see that from outside the box: /health said "ok" the
 * whole time. This module is what makes that visible.
 *
 * The sha is resolved ONCE, at require time, and frozen. That is the entire
 * point and it is not an optimisation: a process that re-read git per request
 * would report the code ON DISK, not the code it LOADED. Those two are
 * identical except in exactly the situation this exists to catch, and a
 * disk-reading health check would lie in the reassuring direction — reporting
 * "up to date" for a process running hours-old code. Read it once, at start,
 * or don't bother.
 *
 * Callers: spread `identity()` into a /health payload.
 */

const { execFileSync } = require('child_process')
const path = require('path')

const REPO_ROOT = path.join(__dirname, '..', '..')

function git (args) {
  try {
    return execFileSync('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim() || null
  } catch {
    return null
  }
}

// Env overrides exist for machines/containers with no git in PATH; when set,
// they are authoritative because whoever set them knows what was deployed.
const commit = process.env.POPTY_BUILD_SHA || git(['rev-parse', 'HEAD'])
const branch = process.env.POPTY_BUILD_BRANCH || git(['rev-parse', '--abbrev-ref', 'HEAD'])

// Dirty at START matters: it says the running process may contain code that
// exists on no commit anywhere, so a sha comparison alone can't vouch for it.
const dirtyAtStart = process.env.POPTY_BUILD_SHA
  ? null
  : (git(['status', '--porcelain']) ? true : false)

const startedAt = new Date().toISOString()

const IDENTITY = Object.freeze({
  commit,
  commitShort: commit ? commit.slice(0, 8) : null,
  branch,
  dirtyAtStart,
  startedAt,
  pid: process.pid
})

/** Frozen identity of the code this process started from. */
function identity () {
  return IDENTITY
}

module.exports = { identity, IDENTITY, REPO_ROOT }
