// A RENDER REQUEST THAT CANNOT FREEZE THE SCREEN (job #804, Kai 15 Oct).
//
// Popty auto-deploys ~20 times a day, and every deploy restarts the API. A reviewer who pressed
// Save on a phrase edit at that moment got a fetch that either errored or never answered, and the
// phrase-edit path never cleared its audition spinners: a permanent "regenerating" on the screen.
//
// So every regenerate call goes through here:
//  - it is cut off after REGEN_TIMEOUT_MS (a render takes seconds; 90 s is a dead request);
//  - a SERVER ANSWER (any HTTP status, a refusal included) is returned as-is and never retried —
//    a 402 from the spend guard is the answer, not a glitch;
//  - a NETWORK ERROR (the API restarting under us) waits a moment, then RE-READS THE ROW first
//    (`checkLanded`): the render may have finished before the connection dropped, and rendering it
//    again would pay twice. Only when the row shows it did not land is the request sent once more;
//  - a TIMEOUT is never re-sent (the server may still be rendering it), only re-read;
//  - when all that fails, it throws RegenInterruptedError with the plain words below, and the
//    caller clears every spinner and says them.
export const REGEN_TIMEOUT_MS = 90000
export const REGEN_RETRY_WAIT_MS = 4000
export const INTERRUPTED_MESSAGE = 'Interrupted — please try again'

export class RegenInterruptedError extends Error {
  constructor() { super(INTERRUPTED_MESSAGE); this.name = 'RegenInterruptedError' }
}

const wait = (ms) => new Promise(r => setTimeout(r, ms))

async function attempt(send, timeoutMs) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return { res: await send(ctrl.signal) }
  } catch (err) {
    return { failed: ctrl.signal.aborted ? 'timeout' : 'network', err }
  } finally {
    clearTimeout(timer)
  }
}

async function safeCheck(checkLanded) {
  if (!checkLanded) return null
  try { return (await checkLanded()) || null } catch { return null }
}

/**
 * @param {(signal: AbortSignal) => Promise<Response>} send  one render request
 * @param {{ checkLanded?: () => Promise<object|null>, timeoutMs?: number, retryWaitMs?: number }} [opts]
 *   checkLanded re-reads the row and returns the render's result if it is already there, else null.
 *   Without it nothing is ever re-sent: a render we cannot check is never risked twice.
 * @returns {Promise<{ res: Response } | { landed: object }>}
 */
export async function regenRequest(send, { checkLanded, timeoutMs = REGEN_TIMEOUT_MS, retryWaitMs = REGEN_RETRY_WAIT_MS } = {}) {
  const first = await attempt(send, timeoutMs)
  if (first.res) return first
  if (retryWaitMs) await wait(retryWaitMs)
  const landed = await safeCheck(checkLanded)
  if (landed) return { landed }
  if (first.failed === 'network' && checkLanded) {
    const second = await attempt(send, timeoutMs)
    if (second.res) return second
    const late = await safeCheck(checkLanded)
    if (late) return { landed: late }
  }
  throw new RegenInterruptedError()
}
