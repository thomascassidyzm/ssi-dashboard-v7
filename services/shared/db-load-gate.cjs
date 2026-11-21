'use strict'
/**
 * THE LIVE SSi DB LOAD GATE for Popty's own processes (cs job #835, 2026-11-18).
 *
 * Tom's ruling r-2026-11-18-no-watson-or-worker-any-owner: "No Watson or worker, any owner (Kai
 * included), ever hammers the live SSi database: bulk/background writes are throttled by a code-
 * enforced load governor that backs off when the DB is busy, so learners never feel it."
 *
 * Why Popty needs its own. Workers are governed by command-surface's db-worker-guard (loaded into every
 * worker node process). But Popty's services are NOT workers: they run as user popty in system.slice,
 * write with the service key (Supabase REST) and the owner login (pg), and are the path every course
 * job's edits and renders actually take (sister-prop, content jobs and cleanup all post to Popty
 * routes). On 18 Nov 19:54Z production stalled under exactly that load. So the gate sits HERE, in-process,
 * at the bottom: every live Supabase REST call (globalThis.fetch to <ref>.supabase.co/rest/v1/) and
 * every pg statement to a live host from this process goes through ONE adaptive governor, the same
 * module db-worker-guard uses (command-surface ops/db-load-governor.cjs; a vendored copy sits beside
 * this file, and the higher GOVERNOR_VERSION wins). Calm DB: no limit at all within a minute or so.
 * Busy DB (learner backends waiting, a learner statement slow, own latency climbing, or no signal):
 * rate and concurrency halve, down to one statement per 5 s. Learners' own traffic never comes near it.
 *
 * Use: the FIRST lines of every service entrypoint, before anything creates a Supabase or pg client:
 *   require('dotenv').config()
 *   require('./shared/db-load-gate.cjs').install('popty-production-api')
 * Pre-flight refusal: tools/check-service-syntax.cjs (each unit's ExecStartPre) refuses to start a
 * service entrypoint that does not install this gate — bypassing it is a failed start, not a habit.
 *
 * Seeing it: journalctl -u popty-production-api | grep db-load-governor (one line per level change,
 * a HELD BACK line when a minute was mostly waiting), ops_events source db-load-governor, and
 * GET /health → dbLoadGate.
 */

const path = require('path')
const os = require('os')
const { AsyncLocalStorage } = require('async_hooks')

// A PERSON WAITING IS NEVER THROTTLED (cs #965, 2026-11-19; decision under r-2026-11-18-no-watson-or-worker):
// the governor is for bulk/background writes. On 19 Nov it held Eleri's booth home summary for >200 s because a
// slow teacher-dashboard view kept it red. So a statement made while serving an interactive human HTTP request
// runs straight through. Positive marking only: a request is interactive only when its route is mounted behind
// interactiveHumans() AND it carries no agent/service identity header. Everything unmarked (batch endpoints,
// changeset apply, queue/worker loops, timers, any x-agent-id caller, /api/audio/render, edit-batch) stays governed.
const humanCtx = new AsyncLocalStorage()
const AGENT_HEADERS = ['x-agent-id', 'x-agent-role', 'x-service-name']
const bypass = { count: 0, lastPath: null, windowCount: 0 }
const inHumanRequest = () => humanCtx.getStore() === true
function noteBypass() {
  bypass.count++
  if (bypass.windowCount++ === 0) {
    const where = bypass.lastPath
    setTimeout(() => {
      try { process.stderr.write(`db-load-governor: ${state ? state.writer : 'popty'} let ${bypass.windowCount} statement(s) from interactive human requests bypass the gate in the last minute (e.g. ${where}); level stays ${state ? state.gov.status().level : '?'} for background work\n`) } catch {}
      bypass.windowCount = 0
    }, 60000).unref()
  }
}
/** Express middleware: mount in front of human-facing routes (the booth). Agent-identified callers stay governed. */
function interactiveHumans(req, res, next) {
  const h = req.headers || {}
  if (AGENT_HEADERS.some((k) => h[k])) return next()
  bypass.lastPath = `${req.method} ${String(req.originalUrl || req.url || '').split('?')[0].slice(0, 80)}`
  return humanCtx.run(true, next)
}

const MARK = Symbol.for('popty.dbLoadGate')
// The INSTANCE mark: a live, governed connection. Never read MARK off a client: MARK sits on Client.prototype
// (the patched-once flag), so every client inherited it and the governor's own probe re-entered acquire() —
// a deadlock (cold verifier #838).
const GOVERNED = Symbol.for('popty.dbLoadGate.governedClient')
const isLiveHost = (h) => /(^|\.)supabase\.(co|com)$/i.test(String(h || '').trim())
const isLiveRestUrl = (u) => /^https:\/\/[a-z0-9-]+\.supabase\.co\/rest\/v1\//i.test(String(u || ''))

/** The governor module: command-surface's when it is newer, else the vendored copy. */
function loadGovernorModule() {
  const files = [
    process.env.CS_HOME && path.join(process.env.CS_HOME, 'ops', 'db-load-governor.cjs'),
    path.join(os.homedir(), 'command-surface', 'ops', 'db-load-governor.cjs'),
    path.join(__dirname, 'db-load-governor.cjs'),
  ].filter(Boolean)
  let best = null
  for (const f of files) {
    try {
      const m = require(f)
      if (m && typeof m.createGovernor === 'function' && (!best || (m.GOVERNOR_VERSION || 0) > (best.m.GOVERNOR_VERSION || 0))) best = { m, f }
    } catch { /* next */ }
  }
  if (!best) throw new Error('db-load-gate: no load governor could be loaded (vendored services/shared/db-load-governor.cjs missing?) — refusing to run ungoverned')
  return best
}

let state = null

/** The probe login: the owner URL Popty services already hold (sees every backend's state). */
function probeConfig() {
  try {
    const url = require('./round-index-refresh.cjs').databaseUrl()
    return url ? { connectionString: url } : null
  } catch { return null }
}

function patchPg(gm, gov, writer) {
  let pg
  try { pg = require('pg') } catch { return null }
  const Client = pg.Client
  if (!Client || !Client.prototype || Client.prototype[MARK]) return Client
  const proto = Client.prototype
  proto[MARK] = true
  const origConnect = proto.connect
  proto.connect = function (...args) {
    try {
      if (isLiveHost(this.host) && !this[gm.PROBE]) {
        this[GOVERNED] = true
        const p = this.connectionParameters
        if (p) p.application_name = gm.governedAppName(writer, p.application_name)
      }
    } catch { /* stamping only */ }
    return origConnect.apply(this, args)
  }
  const origQuery = proto.query
  proto.query = function (...args) {
    if (!Object.prototype.hasOwnProperty.call(this, GOVERNED) || this[gm.PROBE]) return origQuery.apply(this, args)
    if (inHumanRequest()) { noteBypass(); return origQuery.apply(this, args) }
    const last = args[args.length - 1]
    if (args[0] && typeof args[0].submit === 'function') {
      const sub = args[0]
      gov.acquire().then((release) => {
        if (typeof sub.on === 'function') { sub.once('end', () => release()); sub.once('error', (e) => release(e)); setTimeout(() => release(), 60000).unref() } else release()
        origQuery.apply(this, args)
      })
      return sub
    }
    if (typeof last === 'function') {
      gov.acquire().then((release) => {
        args[args.length - 1] = (err, res) => { release(err); last(err, res) }
        origQuery.apply(this, args)
      })
      return undefined
    }
    return gov.acquire().then((release) => {
      let p
      try { p = origQuery.apply(this, args) } catch (e) { release(e); throw e }
      return Promise.resolve(p).then((r) => { release(); return r }, (e) => { release(e); throw e })
    })
  }
  return Client
}

function patchFetch(gov) {
  const g = globalThis
  if (typeof g.fetch !== 'function' || g.fetch[MARK]) return
  const orig = g.fetch
  const wrapped = function (input, init) {
    let url
    try { url = typeof input === 'string' ? input : (input && input.url) || String(input) } catch { return orig.call(this, input, init) }
    if (!isLiveRestUrl(url)) return orig.call(this, input, init)
    if (inHumanRequest()) { noteBypass(); return orig.call(this, input, init) }
    return gov.run(() => orig.call(this, input, init))
  }
  wrapped[MARK] = true
  g.fetch = wrapped
}

/**
 * Install the gate in this process. Idempotent. Throws if no governor loads: a Popty service never
 * reaches the live DB ungoverned. startRate: statements/s the gate opens at (it grows from there).
 */
function install(writer = path.basename(process.argv[1] || 'popty'), { startRate = 20 } = {}) {
  if (state) return state.gov
  const { m: gm, f } = loadGovernorModule()
  const gov = gm.createGovernor({ writer, startRate })
  const Client = patchPg(gm, gov, writer)
  const probe = probeConfig()
  if (Client && probe) gov.configure({ Client, probe })
  patchFetch(gov)
  state = { gov, writer, from: f, version: gm.GOVERNOR_VERSION }
  // Keep a real reading on hand even with no traffic, so /health's "governed" is earned, not assumed (#838).
  // One recorder-file read every 10 s (or, with no fresh sample, the probe's one light count).
  if (typeof gov.refresh === 'function') { gov.refresh().catch(() => {}); setInterval(() => { gov.refresh().catch(() => {}) }, 10000).unref() }
  globalThis[MARK] = true
  try { process.stderr.write(`db-load-gate: ${writer} governed (governor v${gm.GOVERNOR_VERSION} from ${f}; probe ${probe ? 'owner login' : 'none — freeze recorder only'})\n`) } catch {}
  return gov
}

/** For /health: is this process governed, and how is the governor reading the database right now. */
function status() {
  if (!state) return { installed: false, governed: false }
  const st = state.gov.status()
  // governed = installed AND holding a real load reading < 30 s old. An installed gate with no reading is
  // running slow (red) and says so, rather than claiming to see the database (#838).
  const measured = typeof state.gov.measured === 'function' ? state.gov.measured() : false
  return { installed: true, governed: measured, governor: `v${state.version}`, ...st, humanBypassed: bypass.count, ...(measured ? {} : { why: 'no real load reading yet (or none in 30 s): running slow until one arrives' }) }
}

/** Throws when this process reaches for the live DB without the gate installed (call where a client is built). */
function assertGoverned(where = 'this process') {
  if (!globalThis[MARK]) throw new Error(`db-load-gate: ${where} is about to reach the live SSi DB without the load gate — install it first (require('./shared/db-load-gate.cjs').install(...)) — cs #835, Tom's ruling r-2026-11-18-no-watson-or-worker-any-owner`)
}

module.exports = { install, status, interactiveHumans, inHumanRequest, assertGoverned, isLiveRestUrl, isLiveHost, loadGovernorModule }
