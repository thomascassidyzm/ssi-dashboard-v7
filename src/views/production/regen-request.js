// A RENDER REQUEST THAT CANNOT FREEZE THE SCREEN (job #804, Kai 15 Oct; bounded and made
// pay-once-safe by job #812).
//
// Popty auto-deploys ~20 times a day, and every deploy restarts the API. A reviewer who pressed
// Save on a phrase edit at that moment got a fetch that either errored or never answered, and the
// phrase-edit path never cleared its audition spinners: a permanent "regenerating" on the screen.
//
// So every regenerate call goes through here:
//  - the WHOLE operation — request, response body, the re-read, any re-send — is cut off at
//    REGEN_TOTAL_MS, and each single request at REGEN_TIMEOUT_MS. The body is read here, under
//    the same clock, and handed back as `body`: a server that sends headers and then stalls can
//    no longer hang the caller after the timer has been cleared;
//  - a SERVER ANSWER (any HTTP status, a refusal included) is returned as-is and never retried —
//    a 402 from the spend guard is the answer, not a glitch;
//  - a NETWORK ERROR before any answer (the API restarting under us) waits a moment, then
//    RE-READS THE ROW first (`checkLanded`): the render may have finished before the connection
//    dropped, and rendering it again would pay twice. The request is sent once more ONLY when that
//    re-read SUCCEEDS and shows the render did not land. A re-read that fails is "we don't know",
//    never "not landed": checkLanded THROWS when it cannot read the row, and then nothing is re-sent;
//  - a TIMEOUT, or a connection lost after the server answered, is never re-sent (the server may
//    have rendered it), only re-read;
//  - when all that fails, it throws RegenInterruptedError with the plain words below, and the
//    caller clears every spinner and says them.
export const REGEN_TIMEOUT_MS = 90000
export const REGEN_TOTAL_MS = 150000
export const REGEN_RETRY_WAIT_MS = 4000
export const INTERRUPTED_MESSAGE = 'Interrupted — please try again'

export class RegenInterruptedError extends Error {
  constructor() { super(INTERRUPTED_MESSAGE); this.name = 'RegenInterruptedError' }
}

const OUT_OF_TIME = Symbol('out-of-time')

// Settles with `p`, or with OUT_OF_TIME once `ms` has passed (calling onTimeout first).
function within(p, ms, onTimeout) {
  let timer
  const clock = new Promise(resolve => {
    timer = setTimeout(() => { onTimeout?.(); resolve(OUT_OF_TIME) }, Math.max(0, ms))
  })
  return Promise.race([p, clock]).finally(() => clearTimeout(timer))
}

async function attempt(send, ms) {
  const ctrl = new AbortController()
  let answered = false
  const run = (async () => {
    const res = await send(ctrl.signal)
    answered = true
    let body
    try { body = await res.json() } catch (err) {
      // A refusal's body is allowed to be unreadable; a success's is not — without it we do not
      // know what was rendered, so it goes to the re-read like any other lost answer.
      if (res.ok) throw err
      body = {}
    }
    return { res, body }
  })()
  try {
    const out = await within(run, ms, () => ctrl.abort())
    if (out === OUT_OF_TIME) { run.catch(() => {}); return { failed: 'unanswered' } }
    return out
  } catch (err) {
    return { failed: answered || ctrl.signal.aborted ? 'unanswered' : 'network', err }
  }
}

// 'landed' (with the result), 'absent' (read OK, render not there), or 'unknown' (could not read).
async function check(checkLanded, ms) {
  if (!checkLanded) return { state: 'unknown' }
  try {
    const run = Promise.resolve().then(checkLanded)
    const out = await within(run, ms)
    if (out === OUT_OF_TIME) { run.catch(() => {}); return { state: 'unknown' } }
    return out ? { state: 'landed', landed: out } : { state: 'absent' }
  } catch {
    return { state: 'unknown' }
  }
}

/**
 * @param {(signal: AbortSignal) => Promise<Response>} send  one render request
 * @param {{ checkLanded?: () => Promise<object|null>, timeoutMs?: number, totalMs?: number, retryWaitMs?: number }} [opts]
 *   checkLanded re-reads the row: returns the render's result if it is already there, null if the
 *   row was read and it is not, and THROWS if the row could not be read.
 *   Without it nothing is ever re-sent: a render we cannot check is never risked twice.
 * @returns {Promise<{ res: Response, body: any } | { landed: object }>}
 */
export async function regenRequest(send, { checkLanded, timeoutMs = REGEN_TIMEOUT_MS, totalMs = REGEN_TOTAL_MS, retryWaitMs = REGEN_RETRY_WAIT_MS } = {}) {
  const deadline = Date.now() + totalMs
  const left = () => deadline - Date.now()
  const slot = () => Math.min(timeoutMs, left())

  const first = await attempt(send, slot())
  if (first.res) return first
  if (retryWaitMs) await within(new Promise(r => setTimeout(r, Math.min(retryWaitMs, left()))), left())
  if (left() <= 0) throw new RegenInterruptedError()
  const seen = await check(checkLanded, left())
  if (seen.state === 'landed') return { landed: seen.landed }
  if (first.failed === 'network' && seen.state === 'absent' && left() > 0) {
    const second = await attempt(send, slot())
    if (second.res) return second
    if (left() > 0) {
      const late = await check(checkLanded, left())
      if (late.state === 'landed') return { landed: late.landed }
    }
  }
  throw new RegenInterruptedError()
}
