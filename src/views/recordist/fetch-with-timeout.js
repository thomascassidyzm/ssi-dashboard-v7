// The booth's lines fetch must never leave a reader on "Getting your lines…"
// forever (job #676 saw a 134s load while the prod API restarted after a
// deploy). Each attempt is aborted after `timeoutMs`; a timed-out attempt is
// retried once, and a second timeout throws a LoadTimeoutError so the page can
// say "This is taking longer than usual" with a Try again button. Only a
// TIMEOUT is retried — an HTTP answer (404, 403, 500) is returned as-is.
export const LOAD_TIMEOUT_MS = 20000
export const SLOW_LOAD_MESSAGE = 'This is taking longer than usual'

export class LoadTimeoutError extends Error {
  constructor() { super(SLOW_LOAD_MESSAGE); this.name = 'LoadTimeoutError' }
}

// `read(res)` runs inside the timed window so a hung body is cut off too.
export async function fetchWithTimeoutRetry(url, init, read, { timeoutMs = LOAD_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetchImpl(url, { ...init, signal: ctrl.signal })
      return { res, data: await read(res) }
    } catch (err) {
      if (!ctrl.signal.aborted) throw err
    } finally {
      clearTimeout(timer)
    }
  }
  throw new LoadTimeoutError()
}
