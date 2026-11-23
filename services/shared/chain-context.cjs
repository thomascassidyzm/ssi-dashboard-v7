/**
 * THE CHAIN MARKER — proof that a provider call was made inside the one Popty
 * audio chain, not by a script that imported the door and called it directly.
 *
 * Tom, 2026-09-29 00:45Z (ruling "one route for audio"): "Single route for audio
 * from now on. Always. Popty is the only way to do it. If Kai tells his Watson to
 * make audio, it has to use the standard Popty chain itself."
 *
 * The chain is: POST /api/audio/render (services/shared/audio-render-entry.cjs) or
 * one of Popty's own HTTP handlers (phase8 /generate, /regenerate-*, pods…). Both
 * run inside a Popty server process, and every request there is wrapped in
 * `run()` by `middleware`. door-ticket.issueTicket refuses to issue a ticket
 * outside it, and a provider call with no ticket is refused by the spend guard.
 * So a script that `require`s tts-service and calls speak() in its own process is
 * refused with NOT_IN_CHAIN before any character is sent — it has to call the
 * entry point instead (tools/audio/render.cjs is the one-line way).
 *
 * This is the same kind of proof as the door ticket: it says WHERE the call came
 * from, not that the caller is honest. A file that calls a provider with no guard
 * at all is still caught by tools/check-tts-door.cjs.
 */
const { AsyncLocalStorage } = require('async_hooks')

const als = new AsyncLocalStorage()

/**
 * Run fn inside the chain. `origin` names the entry (route, tool) for the ledger.
 * A JOB HOLD already on the flow is CARRIED into the new store (Fable review #756·AK, fix 1): the batch route runs each
 * line as withJobHold(hold, () => renderClip(...)), and renderClip opens its own run(); a fresh store here dropped the
 * hold, so every clip in a batch took the per-call reserve while the whole hold still counted. Nothing else is carried:
 * run() names a new origin, it does not inherit one. A request's flow starts from middleware with no store, so a hold
 * can only ever reach a render that the batch route itself started.
 */
function run(origin, fn) {
  const hold = als.getStore()?.jobHold
  return als.run(hold ? { origin: String(origin || 'unnamed'), jobHold: hold } : { origin: String(origin || 'unnamed') }, fn)
}

/** The origin string when the current async flow is inside the chain, else null. */
let testMode = false
function origin() { return als.getStore()?.origin || (testMode ? 'vitest' : null) }
function inChain() { return origin() !== null }

/**
 * THE JOB HOLD a render runs under (cs #502·AK, r-2026-11-22-once-an-audio-job-is-agreed). Popty's batch route
 * (phase8 POST /render-batch) reserves an agreed batch ONCE and runs each clip inside withJobHold. The spend guard
 * then draws that clip from the hold instead of taking the global reserve lock. It is carried here, not on the door
 * config, so renderClip and the door stay one shape. It is only ever set INSIDE the chain (a script outside the
 * chain cannot set it), and only Popty's own route sets it.
 */
function withJobHold(hold, fn) {
  const cur = als.getStore()
  if (!cur && !testMode) throw new Error('chain-context.withJobHold runs inside the Popty chain only')
  return als.run({ ...(cur || { origin: 'vitest' }), jobHold: hold }, fn)
}
/** The hold the current async flow renders under, or null (every per-call render). */
function jobHold() { return als.getStore()?.jobHold || null }

/** Express middleware for a Popty server: every request it handles is in the chain. */
function middleware(req, _res, next) { run(`${req.method} ${(req.originalUrl || req.url || '').split('?')[0]}`, next) }

/**
 * Vitest only (vite.config.js setupFiles): the suites that exercise the guard and
 * the door mint tickets directly, so they run inside the chain. Refused anywhere
 * else — a script cannot enter the chain this way.
 */
function enterForTests() {
  if (!process.env.VITEST) throw new Error('chain-context.enterForTests is for vitest only — a script gets into the chain by calling POST /api/audio/render')
  testMode = true
}

/** Run fn OUTSIDE the chain (tests of the refusal). */
function outside(fn) {
  const was = testMode
  testMode = false
  const restore = () => { testMode = was }
  return als.exit(() => { let out; try { out = fn() } catch (e) { restore(); throw e } return out && typeof out.then === 'function' ? out.finally(restore) : (restore(), out) })
}

module.exports = { run, origin, inChain, middleware, enterForTests, outside, withJobHold, jobHold }
