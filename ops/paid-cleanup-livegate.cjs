'use strict'
/**
 * paid-cleanup-livegate.cjs (cs #968·AI) — the Node twin of ops/paid_cleanup_livegate.py; same rule, same flag.
 *
 * Anything a paid-cleanup kit sends to LIVE — Popty on :3470/:3471/:3472 (edit-batch, render, script-view, baskets,
 * /v2/validate, /api/resume, /health, the signed admin door) — is REFUSED unless the command carries
 * --live-ok '<why>' (non-empty, logged to stderr) AND it is 22:00-07:00 Europe/London (Intl, never a fixed UTC offset).
 * Why: 19 Nov INCIDENT 3 — stale planners kept firing live dry runs and validator sweeps during a learner-DB
 * slowdown, and a correction message cannot reach a worker mid-tool. Reads belong on the nightly copy.
 *
 * Requiring this file takes the flag OUT of process.argv, so a tool's positional parsing is unchanged (put it last).
 * Refusal exits 77 (75 means "busy, try later" to the night runners; this is not that).
 *
 *   const G = require('<rel>/paid-cleanup-livegate.cjs')
 *   G.install()            every fetch() to a Popty port goes through G.requireLive first
 *   G.requireLive(what)    refuse now unless flag + UK night
 *   G.clampChunk(n)        edit-batch dry-run chunk size, clamped to MAX_CHUNK (10), and says so
 * CLI for shell kits:  node paid-cleanup-livegate.cjs '<what>' [--live-ok '<why>']   exit 0 allowed / 77 refused
 */
const path = require('path')

const FLAG = '--live-ok'
const REFUSED = 77
const MAX_CHUNK = 10
const LIVE_PORT = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|watson-1[^/:]*):347\d(\/|$)/

function takeFlag(argv = process.argv) {
  let why = null
  for (let i = 2; i < argv.length;) {
    const a = argv[i]
    if (a === FLAG) {
      let nxt = argv[i + 1] === undefined ? '' : argv[i + 1]
      if (nxt.startsWith('--')) { nxt = ''; argv.splice(i, 1) } else argv.splice(i, 2)
      why = nxt.trim(); continue
    }
    if (a.startsWith(FLAG + '=')) { why = a.slice(FLAG.length + 1).trim(); argv.splice(i, 1); continue }
    i++
  }
  return why
}

const WHY = takeFlag()
let allowed = null

function ukParts(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value]))
  return { hour: Number(p.hour), text: `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}` }
}
const ukNight = (d) => { const h = ukParts(d).hour; return h >= 22 || h < 7 }

function refuse(what, reason) {
  process.stderr.write(`REFUSED (live gate, cs #968·AI): ${what} would reach LIVE. ${reason}\n` +
    `  Live work needs  ${FLAG} '<why>'  AND 22:00-07:00 Europe/London (now ${ukParts().text.slice(11)} UK).\n` +
    `  Planning reads go to the nightly copy (ops/paid-cleanup-scan-447/copy-read.cjs). Nothing was sent.\n`)
  process.exit(REFUSED)
}

function requireLive(what) {
  if (allowed !== null) return allowed
  if (WHY === null) refuse(what, `No ${FLAG} flag was given.`)
  if (!WHY) refuse(what, `${FLAG} needs a reason: ${FLAG} '<why>'.`)
  if (!ukNight()) refuse(what, `${FLAG} was given ("${WHY}") but it is daytime in the UK.`)
  process.stderr.write(`LIVE-OK (cs #968·AI) ${what} at ${ukParts().text} UK: ${WHY}\n`)
  allowed = WHY
  return WHY
}

const isLiveUrl = (u) => LIVE_PORT.test(String(u))

function install() {
  const real = globalThis.fetch
  if (!real || real._livegate) return
  const f = function fetch(input, init) {
    const u = typeof input === 'string' ? input : (input && (input.url || input.href)) || String(input)
    if (isLiveUrl(u)) requireLive(`${path.basename(process.argv[1] || 'node')} -> ${String(u).split('?')[0]}`)
    return real.call(this, input, init)
  }
  f._livegate = true
  globalThis.fetch = f
}

function clampChunk(n, label = '--chunk') {
  n = Number(n)
  if (!(n >= 1)) { process.stderr.write(`${label} must be 1..${MAX_CHUNK}\n`); process.exit(2) }
  if (n > MAX_CHUNK) {
    process.stderr.write(`${label} ${n} clamped to ${MAX_CHUNK}: edit-batch dry runs go in chunks of ${MAX_CHUNK} or fewer (cs #968·AI)\n`)
    return MAX_CHUNK
  }
  return Math.floor(n)
}

module.exports = { FLAG, REFUSED, MAX_CHUNK, WHY, takeFlag, ukNight, requireLive, isLiveUrl, install, clampChunk }

if (require.main === module) requireLive(process.argv[2] || 'a shell step')
