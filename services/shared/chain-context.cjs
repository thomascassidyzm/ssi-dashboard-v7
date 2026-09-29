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

/** Run fn inside the chain. `origin` names the entry (route, tool) for the ledger. */
function run(origin, fn) { return als.run({ origin: String(origin || 'unnamed') }, fn) }

/** The origin string when the current async flow is inside the chain, else null. */
let testMode = false
function origin() { return als.getStore()?.origin || (testMode ? 'vitest' : null) }
function inChain() { return origin() !== null }

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

module.exports = { run, origin, inChain, middleware, enterForTests, outside }
